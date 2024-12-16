import type { ServerWebSocket } from "bun";
import * as utils from "./utils.js";
import * as globals from "./globals.js";
import {Simulator} from "./simulator.ts";
import {Room} from "./room.ts";

export class Player {
    session: string;
    ws: ServerWebSocket<globals.SocketData>
    score: number;
    pacman: Pacman;
    timeStamp: number;
    room: Room;

    constructor(session: string, ws: ServerWebSocket<globals.SocketData>, color: globals.Colors, room: Room) {
        this.session = session;
        this.ws = ws;
        this.score = 0;
        this.timeStamp = performance.now();
        this.room = room;

        this.pacman = new Pacman(color, this);
    }

    public log(...data: any[]) {
        console.log(`[${this.session} (${this.pacman.color})]`, ...data);
    }

    public sendLocalPlayerState() {
        this.ws.send(
            utils.makeMessage(
                "local-player-info",
                {
                    color: this.pacman.color,
                    loc: this.pacman.lastKnownLocation,
                    moveSpeed: this.pacman.movementSpeed,
                    session: this.session
                }
            )
        );
    }

    public publishLocation() {
        const posData = utils.makeMessage("position", this.pacman.lastKnownLocation, false);
        posData["from-session"] = this.session;
        this.ws.publish(this.room.topics.event, JSON.stringify(posData));
    }

    public isTimestampAllowed(timestamp: number) {
        const timeDifference = ((performance.now() - this.timeStamp) - (timestamp));
        // console.log(timeDifference);
        return timeDifference < 1000 && timeDifference > 0;
    }

    public resetTimestamp() {
        this.ws.send(utils.makeMessage("server-time-reset", undefined));
        this.timeStamp = performance.now();
    }
}

export class Pacman {
    color: globals.Colors;
    movementSpeed: number;
    // lastKnownLocationTime: number;
    lastKnownLocation: globals.PositionData;
    lastClientTimestamp: number;
    player: Player;
    nextCollisions: {[sessionHash: number]: string};

    constructor(color: globals.Colors, player: Player) {
        this.color = color;
        this.movementSpeed = 6;
        // this.lastKnownLocationTime = Date.now();
        this.lastKnownLocation = {x: 60, y: 100, facingDirection: 1, queuedDirection: 0, shouldMove: true, packetIndex: -1};
        this.lastClientTimestamp = 0;
        this.player = player;
        this.nextCollisions = {};
    }

    public getNextCollidingWall(): globals.PacmanNextWallCollision|null {
        let collidingWalls = this.player.room.simulator.getPacmanWallCollisions(this, this.player.room.gameBoard.blockPositions);

        if (collidingWalls == null) return null;

        let distanceDirectionCheck = this.lastKnownLocation.facingDirection % 2 == 0 ? "x" : "y" as "x"|"y";

        let minDistance = null;
        let minDistanceObj = null;

        for (let i = 0; i < collidingWalls.length; i++) {
            let thisCollision = collidingWalls[i];
            let distance = Math.abs(this.lastKnownLocation[distanceDirectionCheck] - thisCollision.pos[distanceDirectionCheck]);

            if (minDistance == null || distance < minDistance) {
                minDistance = distance;
                minDistanceObj = thisCollision;
            }
        }

        if (minDistance == null || minDistanceObj == null) return null;

        return {wallObject: minDistanceObj.block, distance: minDistance, position: minDistanceObj.pos};
    }

    public getDirectionDelta() {
        switch (this.lastKnownLocation.facingDirection) {
            case 0: return {dx: 1, dy: 0}
            case 1: return {dx: 0, dy: 1}
            case 2: return {dx: -1, dy: 0}
            case 3: return {dx: 0, dy: -1}
        }

        console.error("Invalid pacman direction");
        return {dx: 0, dy: 0}
    }
}