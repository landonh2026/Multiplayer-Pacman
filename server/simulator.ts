import {Pacman} from "./player.ts";
import {Block} from "./gameBoard.ts";
import * as utils from "./utils.ts";
import * as globals from "./globals.ts";

export class Simulator {
    /** The tolerance to the distance that players are allowed to move */
    distanceChangeTolerance: number;

    /** Collision wall functions that turn a wall into a line that can be intersected with */
    wallCollisionFunctions: Array<(wall: Block) => { pos: { x: number; y: number; }; dir: { dx: number; dy: number; }; dist: number; }>;
    
    constructor() {
        this.distanceChangeTolerance = 1.5;

        this.wallCollisionFunctions = [
            // left of wall check
            (wall: Block) => { return { pos: {x: wall.x, y: wall.y}, dir: {dx: 0, dy: 1}, dist: wall.height }; },
            
            // up of wall check
            (wall: Block) => { return { pos: {x: wall.x, y: wall.y}, dir: {dx: 1, dy: 0}, dist: wall.width }; },
            
            // right of wall check
            (wall: Block) => { return { pos: {x: (wall.x)+(wall.width), y: wall.y}, dir: {dx: 0, dy: 1}, dist: wall.height }; },

            // bottom of wall check
            (wall: Block) => { return { pos: {x: wall.x, y: wall.y+(wall.height)}, dir: {dx: 1, dy: 0}, dist: wall.width }; },
        ]
    }

    /**
     * Get the maximum distance change that we will allow form the pacman client
     * @param timeChange The time change since the last packet sent
     * @param movementSpeed The movement speed of this client
     * @param tolerance The tolerance we are allowing for errors/ping
     * @returns The maximum distance we are allowing the client to move
     */
    public getMaxDistanceChange(timeChange: number, movementSpeed: number, tolerance: number|null = null) {
        if (tolerance === null) tolerance = this.distanceChangeTolerance;

        return globals.target_client_fps * (movementSpeed) * (timeChange/1000) * tolerance;
    }

    /**
     * Get a pacman's next wall collisions with the gameboard
     * @param pacman The pacman to check for
     * @param walls The walls of the gameboard
     * @returns A list of object containing the position and wall data that this pacman could potentially run into
     */
    public getPacmanWallCollisions(pacman: Pacman, walls: Array<Block>) {
        const pacmanPosition = {x: pacman.lastLocation.x, y: pacman.lastLocation.y};
        let pacmanDirection = pacman.getDirectionDelta();
        let directionCheck = this.wallCollisionFunctions[pacman.lastLocation.facingDirection];

        if (directionCheck == undefined) {
            console.error("Direction was invalid!");
            return null;
        }

        let intersections: Array<{pos: {x: number, y: number}, block: Block}> = [];
        for (let i = 0; i < walls.length; i++) {
            const thisWall = walls[i];

            const directionData = directionCheck(thisWall);

            const intersection =  utils.lineIntersection(
                pacmanPosition, pacmanDirection,
                directionData.pos, directionData.dir,
                Infinity, directionData.dist
            );

            if (intersection == null) continue;

            intersections.push({pos: directionData.pos, block: thisWall});
        }

        return intersections;
    }
}