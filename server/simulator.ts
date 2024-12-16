import {Pacman} from "./player.ts";
import * as utils from "./utils.js";
import * as globals from "./globals.js";

export class Simulator {
    distanceChangeTolerance: number;
    wallCollisionFunctions: Array<(wall: [number, number, number, number]) => { pos: { x: number; y: number; }; dir: { dx: number; dy: number; }; dist: number; }>;
    
    constructor() {
        this.distanceChangeTolerance = 1.5;

        this.wallCollisionFunctions = [
            // left of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: wall[0], y: wall[1]}, dir: {dx: 0, dy: 1}, dist: wall[3] }; },
            
            // up of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: wall[0], y: wall[1]}, dir: {dx: 1, dy: 0}, dist: wall[2] }; },
            
            // right of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: (wall[0])+(wall[2]), y: wall[1]}, dir: {dx: 0, dy: 1}, dist: wall[3] }; },

            // bottom of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: wall[0], y: wall[1]+(wall[3])}, dir: {dx: 1, dy: 0}, dist: wall[2] }; },
        ]
    }

    public getMaxDistanceChange(timeChange: number, movementSpeed: number, tolerance: number|null = null) {
        if (tolerance === null) tolerance = this.distanceChangeTolerance;
       
        // console.log(timeChange, timeChange/1000);

        return globals.target_client_fps * (movementSpeed) * (timeChange/1000) * tolerance;
    }

    /**
     * This function needs to consider many things:
     * [X] If both players are still
     * [ ] If one player is faster than the other and they are heading in same dir
     * [ ] If one player is still
     * [ ] If one if traveling vertically and other is traveling horizontally
     * [ ] If a wall is blocking their collision
     * [ ] Check if one moving player if they are moving towards the other player
     * @param pacman 
     * @param otherPacman 
     * @returns 
     */
    public getPacmanCollision(pacman: Pacman, otherPacman: Pacman) {
        const onePlayerMoving = pacman.lastKnownLocation.shouldMove != otherPacman.lastKnownLocation.shouldMove;

        if ((!pacman.lastKnownLocation.shouldMove) && (!otherPacman.lastKnownLocation.shouldMove)) {
            // neither pacman is moving
            return null;
        }

        if ((pacman.lastKnownLocation.facingDirection + 2) % 4 == otherPacman.lastKnownLocation.facingDirection) {
            // facing opposite directions
            // NEED TO CHECK IF THEY ARE FACING OPPOSITE DIRECTIONS BUT HEADED TOWARDS EACH OTHER VIA X AND Y POS
            return null;
        }

        facingDir: if (pacman.lastKnownLocation.facingDirection == otherPacman.lastKnownLocation.facingDirection) {
            if (onePlayerMoving) {
                break facingDir;
            }

            // if (pacman.lastKnownLocation.shouldMove && otherPacman.lastKnownLocation.shouldMove) {
                // TODO: check if pacman that is behind other pacman has higher speed
                return null;
            // }
        }

        if ((pacman.lastKnownLocation.facingDirection % 2 == 1 && otherPacman.lastKnownLocation.facingDirection % 2 == 0) && !onePlayerMoving) {
            // one is traveling vertically and other horizontally. Check to see if lines of their movement intersect
            // need to check if one player is still
            console.log("traveling vertically");

            const collision = utils.lineIntersection(
                {x: pacman.lastKnownLocation.x, y: pacman.lastKnownLocation.y}, pacman.getDirectionDelta(),
                {x: otherPacman.lastKnownLocation.x, y: otherPacman.lastKnownLocation.y}, pacman.getDirectionDelta(),
                pacman.getNextCollidingWall()?.distance, otherPacman.getNextCollidingWall()?.distance
            );

            console.log(collision);

            return null;
        }

        let directionCheckPacman = pacman.lastKnownLocation.shouldMove ? pacman : otherPacman;

        const pacmanRadiusCheckAxis = directionCheckPacman.lastKnownLocation.facingDirection % 2 == 1 ? "x" : "y" as "x"|"y";
        const pacmanDistanceCheckAxis = directionCheckPacman.lastKnownLocation.facingDirection % 2 == 0 ? "x" : "y" as "x"|"y";
        const distance = {x: Math.abs(pacman.lastKnownLocation.x-otherPacman.lastKnownLocation.x), y: Math.abs(pacman.lastKnownLocation.y-otherPacman.lastKnownLocation.y)};

        console.log(distance, pacmanRadiusCheckAxis, directionCheckPacman.color);
        if (distance[pacmanRadiusCheckAxis] > 40) {
            // console.log("too far radius");
            // too far apart
            return null;
        }
        
        const movingSpeed = onePlayerMoving ? directionCheckPacman.movementSpeed : pacman.movementSpeed + otherPacman.movementSpeed;
        const timeToImpact = (distance[pacmanDistanceCheckAxis]-40) * 1000 / (movingSpeed * 24);
        
        console.log("bump time: " + timeToImpact);

        // setTimeout(() => {
        //     console.log("BUMP");
        // }, timeToImpact);

        return timeToImpact;
        // if (pacman.getNextCollidingWall().distance)
    }

    public getPacmanWallCollisions(pacman: Pacman, walls: Array<[number, number, number, number]>) {
        const pacmanPosition = {x: pacman.lastKnownLocation.x, y: pacman.lastKnownLocation.y};
        let pacmanDirection = pacman.getDirectionDelta();
        let directionCheck = this.wallCollisionFunctions[pacman.lastKnownLocation.facingDirection];

        if (directionCheck == undefined) {
            console.error("Direction was invalid!");
            return null;
        }

        let intersections: Array<{pos: {x: number, y: number}, block: [number, number, number, number]}> = [];
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