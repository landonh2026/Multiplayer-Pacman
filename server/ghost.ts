import { Player } from "./player.ts";
import { Path } from "./pathfinding.ts";
import { Room } from "./room.ts";
import * as globals from "./globals.ts";
import * as utils from "./utils.ts";

export class Ghost {
    x: number;
    y: number;
    movementSpeed: number;
    facingDirection: 0|1|2|3|null;
    currentTarget: Player|null;
    path: Path|null;
    room: Room;
    nextTurnTimeout: Timer|null;

    constructor(x: number, y: number, room: Room) {
        this.x = x;
        this.y = y;
        this.movementSpeed = 4;

        this.facingDirection = null;
        this.currentTarget = null;
        this.path = null;
        this.room = room;
        this.nextTurnTimeout = null;

        this.sendLocation();
    }

    public sendLocation() {
        // this.room.server.publish(
        //     this.room.topics.event,
        //     utils.makeMessage("ghost-position",
        //     {
        //         position: [this.x, this.y]
        //     }
        // ));
    }

    public determineTarget(players: Array<Player>) {
        const heuristic = (x1: number, y1: number, x2: number, y2: number) => { return Math.abs(x1-x2) + Math.abs(y1-y2) };
        players.sort((a, b) => heuristic(a.pacman.lastKnownLocation.x, a.pacman.lastKnownLocation.y, b.pacman.lastKnownLocation.x, b.pacman.lastKnownLocation.y));

        return players[0];
    }

    public findPathToNextTarget() {
        this.currentTarget = this.determineTarget(Object.values(this.room.players));

        const estimatedPos = this.currentTarget.pacman.getEstimatedPosition(performance.now()-this.currentTarget.pacman.lastPosPacketTime);
        
        console.log(
            {x: this.x, y: this.y},
            {x: this.currentTarget.pacman.lastKnownLocation.x, y: this.currentTarget.pacman.lastKnownLocation.y},
            {x: estimatedPos.x, y: estimatedPos.y},
        );

        this.room.server.publish(
            this.room.topics.event,
            utils.makeMessage("ghost-position",
            {
                position: [estimatedPos.x, estimatedPos.y]
            }
        ));

        // this.path = this.room.gameBoard.pathfinder.findPathWithCoordinates({x: this.x, y: this.y}, {x: this.currentTarget.pacman.lastKnownLocation.x, y: this.currentTarget.pacman.lastKnownLocation.y})
        this.path = this.room.gameBoard.pathfinder.findPathWithCoordinates({x: this.x, y: this.y}, {x: Math.round(estimatedPos.x), y: Math.round(estimatedPos.y)});
    }

    public getTimeToTurn() {
        if (this.path == null) throw new Error("Path property is null");
        
        const nextNode = this.path.nodes[0];
        const distance = Math.abs(this.x - nextNode.x) + Math.abs(this.y - nextNode.y);

        return (distance * 1000) / (this.movementSpeed * globals.target_client_fps);
    }

    public onTurn() {
        this.findPathToNextTarget();

        if (this.path == null) throw new Error("Path property is null");

        console.log("We turned incredible");
        console.log(this.path.nodes.length);

        [this.x, this.y] = [this.path.nodes[0].x, this.path.nodes[0].y];
        this.sendLocation();
        
        this.path.nodes.shift();
        if (this.path.nodes.length === 0) {
            // we reached the end of this path
            // get a new path
            this.findPathToNextTarget();
            console.log("got new path");

            // @ts-ignore
            if (this.path.nodes.length == 1) {
                // we are on top of the target node
                return;
            }
        }

        // change the direction of this ghost
        this.room.gameBoard.pathfinder.getTurnDirection({x: this.x, y: this.y}, this.path.nodes[0]);
                
        // set a new timeout for when the ghost passes the next turn
        this.setTurnTimeout();
    }

    public setTurnTimeout() {
        setTimeout(this.onTurn.bind(this), this.getTimeToTurn());
    }
}