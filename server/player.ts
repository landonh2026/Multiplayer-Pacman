import type { ServerWebSocket } from "bun";
import * as utils from "./utils.ts";
import * as globals from "./globals.ts";
import {Room} from "./room.ts";
// import {Simulator} from "./simulator.ts";

export class Player {
    /** The session id for this player */
    session: string;

    /** The ws context for this player */
    ws: ServerWebSocket<globals.SocketData>
    
    /** The active score of this player */
    score: number;

    /** The pacman for this player */
    pacman: Pacman;
    
    timeStamp: number;
    
    /** The room that this player is in */
    room: Room;
    
    /** The last time this player was bumped */
    lastBump: number;

    constructor(session: string, ws: ServerWebSocket<globals.SocketData>, color: globals.Colors, room: Room) {
        this.session = session;
        this.ws = ws;
        this.score = 0;
        this.timeStamp = performance.now();
        this.room = room;
        this.lastBump = 0;

        this.pacman = new Pacman(color, this);
    }

    public log(...data: any[]) {
        console.log(`[${this.session} (${this.pacman.color})]`, ...data);
    }

    /**
     * Sends this player's player state to the client
     */
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

    /**
     * Publish this player's location to other players
     */
    public publishLocation() {
        const posData = utils.makeMessage("position", this.pacman.lastKnownLocation, false);
        posData["from-session"] = this.session;
        this.ws.publish(this.room.topics.event, JSON.stringify(posData));
    }

    /**
     * Determines if this client's timestamp is allowed
     * @param timestamp The timestamp given by the client
     * @returns Is this timestamp allowed?
     */
    public isTimestampAllowed(timestamp: number) {
        const timeDifference = ((performance.now() - this.timeStamp) - (timestamp));
        // console.log(timeDifference);
        return timeDifference < 1000 && timeDifference > 0;
    }

    /**
     * Tell the client to reset their server time
     */
    public resetTimestamp() {
        this.ws.send(utils.makeMessage("server-time-reset", undefined));
        this.timeStamp = performance.now();
    }
}

export class Pacman {
    color: globals.Colors;
    movementSpeed: number;
    lastKnownLocation: globals.PositionData;
    lastClientTimestamp: number;
    player: Player;

    lastPosPacketTime: number;

    constructor(color: globals.Colors, player: Player) {
        this.color = color;
        this.movementSpeed = 6;
        this.lastKnownLocation = {x: 60, y: 100, facingDirection: 1, queuedDirection: 0, shouldMove: true, packetIndex: -1};
        this.lastClientTimestamp = 0;
        this.player = player;
        this.lastPosPacketTime = 0;
    }

    /**
     * Get the next wall that this pacman will run into
     * @returns 
     */
    public getNextCollidingWall(): globals.PacmanNextWallCollision|null {
        // get the wall collisions that this pacman will run into
        let collidingWalls = this.player.room.simulator.getPacmanWallCollisions(this, this.player.room.gameBoard.blockPositions);

        if (collidingWalls == null) return null;

        // get the axis that we should check the distance on
        let distanceDirectionCheck = this.lastKnownLocation.facingDirection % 2 == 0 ? "x" : "y" as "x"|"y";

        let minDistance = null;
        let minDistanceObj = null;

        // go through each colliding wall and decide which one is closest
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

    /**
     * Get the estimated position of this client given their last packet
     * @param deltaTime The time change since the client's last packet
     * @returns The estimated x and y position of the client
     */
    public getEstimatedPosition(deltaTime: number): {x: number, y: number} {
        if (!this.lastKnownLocation.shouldMove) return {x: this.lastKnownLocation.x, y: this.lastKnownLocation.y};

        const nextWall = this.getNextCollidingWall();

        // get the direction delta and predicated distance for this pacman
        // console.log(deltaTime, globals.target_client_fps, this.movementSpeed);
        let delta = this.getDirectionDelta();
        let distance =  globals.target_client_fps * this.movementSpeed * (deltaTime/1000);
        // console.log("Distance moved: " + distance);

        // we made it to the next wall
        if (nextWall != null && nextWall.distance < distance) {
            const negativeMultiplier = this.lastKnownLocation.facingDirection > 1 ? 1 : -1;
            // console.log(nextWall.distance);

            if (this.lastKnownLocation.facingDirection % 2 == 0) {
                // console.log("horizontal stuff", this.lastKnownLocation.x, nextWall.distance, nextWall.wallObject[(this.lastKnownLocation.facingDirection + 2) % 4])
                return {x: this.lastKnownLocation.x + (nextWall.distance*-negativeMultiplier) + (20*negativeMultiplier), y: this.lastKnownLocation.y};
            }
            
            // console.log("vertical stuff", this.lastKnownLocation.y, nextWall.distance, nextWall.wallObject[(this.lastKnownLocation.facingDirection + 2) % 4])
            return {x: this.lastKnownLocation.x, y: this.lastKnownLocation.y + (nextWall.distance*-negativeMultiplier) + (20*negativeMultiplier)};
        }

        delta.dx *= distance;
        delta.dy *= distance;

        return {x: this.lastKnownLocation.x + delta.dx, y: this.lastKnownLocation.y + delta.dy};
    }

    /**
     * Get the direction delta given a direction
     * @returns 
     */
    public getDirectionDelta() {
        return utils.getDirectionDelta(this.lastKnownLocation.facingDirection);
    }
}