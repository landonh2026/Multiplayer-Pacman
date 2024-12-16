import * as utils from "./utils.js";
import * as globals from "./globals.js";

export class GameBoard {
    rawBlockPositions: Array<[number, number, number, number]>; // more clear name?
    blockPositions: Array<[number, number, number, number]>;
    pellets: Array<[number, number, number]>; // probably should have explicit index property instead of just an array
    bottomRight: [number, number];
    pathIntersections: Array<PathIntersection>;

    constructor(blockPositions: Array<[number, number, number, number]>) {
        this.rawBlockPositions = [...blockPositions.map(innerArray => [...innerArray])] as Array<[number, number, number, number]>;
        this.blockPositions = blockPositions;
        this.bottomRight = [0, 0];

        for (let i = 0; i < this.blockPositions.length; i++) {
            let block = this.blockPositions[i];
            this.bottomRight = [Math.max(this.bottomRight[0], block[0]+block[2]), Math.max(block[1]+block[3])];

            for (let t = 0; t < 4; t++) {
                block[t] *= 40;
            }
        }

        // this.pellets = [...this.makePellets().map(innerArray => [...innerArray])] as Array<[number, number, number]>;
        this.pellets = this.makePellets();
        this.pathIntersections = this.findPathIntersections();
        
        // let i = 0;
        // this.pellets = [...this.findPathIntersections().map(innerArray => [innerArray[0], innerArray[1], i++])] as Array<[number, number, number]>;
        // this.pathIntersections = [];
    }

    /**
     * Finds that path intersections that are used in multiple scenarios
     * @returns The path intersections points as [x, y]
     */
    public findPathIntersections() {
        const pathIntersections: Array<PathIntersection> = [];
        // check to see if the spaces around the pellet are open. If both axis (horizontal and vertical) are available, it is valid.
        // let pellet of this.pellets
        for (let i = 0; i < this.pellets.length; i++) {
            const pellet = this.pellets[i];
            let passedDirections = [false, false, false, false] as [boolean, boolean, boolean, boolean];

            // loop through all other pellets
            for (let otherPellet of this.pellets) {

                // skip if pellet ids match
                if (pellet[2] == otherPellet[2]) continue;

                if (Math.abs(pellet[1]-otherPellet[1]) == 0) {
                    if (pellet[0]-otherPellet[0] == 1) {
                        passedDirections[2] = true;
                    } else if (pellet[0]-otherPellet[0] == -1) {
                        passedDirections[0] = true;
                    }
                }

                if (Math.abs(pellet[0]-otherPellet[0]) == 0) {
                    if (pellet[1]-otherPellet[1] == 1) {
                        passedDirections[3] = true;
                    } else if (pellet[1]-otherPellet[1] == -1) {
                        passedDirections[1] = true;
                    }
                }

                `
                // check if the pellet is horizontally 1 unit away and vertically 0 units away
                if (Math.abs(pellet[0]-otherPellet[0]) == 1 && Math.abs(pellet[1]-otherPellet[1]) == 0) {
                    console.log("x", pellet[0], otherPellet[0]);
                    horizontalCheck = true;
                }

                // check if the pellet is vertically 1 unit away and horizontally 0 units away
                if (Math.abs(pellet[1]-otherPellet[1]) == 1 && Math.abs(pellet[0]-otherPellet[0]) == 0) {
                    console.log("y", pellet[1], otherPellet[1]);
                    verticalCheck = true;
                }
                `;

                // if ((passedDirections[0] || passedDirections[2]) && (passedDirections[1] || passedDirections[3])) break;
            }


            if (!((passedDirections[0] || passedDirections[2]) && (passedDirections[1] || passedDirections[3]))) continue;
            // pathIntersections.push([pellet[0], pellet[1]]);
            pathIntersections.push(
                new PathIntersection(pellet[0], pellet[1], i, passedDirections)
            );
        }

        return pathIntersections;
    }

    public makePellets(): Array<[number, number, number]> {
        const pellets: Array<[number, number, number]> = [];

        let id = 0;
        for (let x = 0; x < this.bottomRight[0]; x++) {
            for (let y = 0; y < this.bottomRight[1]+2; y++) {
                let isAllowed = true;
                
                for (let i = 0; i < this.rawBlockPositions.length; i++) {
                    if (utils.pointIntersectsRect([x+0.5, y+0.5], this.rawBlockPositions[i])) {
                        isAllowed = false;
                        break;
                    }
                }

                if (isAllowed) {
                    pellets.push([x+0.5, y+0.5, id]);
                    id++;
                }
            }
        }

        return pellets;
    }

    public duplicate(): GameBoard {
        return new GameBoard([...this.rawBlockPositions.map(innerArray => [...innerArray])] as Array<[number, number, number, number]>);
    }
}

export class PathIntersection {
    x: number;
    y: number;
    id: number;
    directions: [boolean, boolean, boolean, boolean];
    
    constructor(x: number, y: number, id: number, directions: [boolean, boolean, boolean, boolean]) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.directions = directions;
    }
}

export class Pellet {
    x: number;
    y: number;
    id: number;

    constructor(x: number, y: number, id: number) {
        this.x = x;
        this.y = y;
        this.id = id;
    }
}

let gameBoards: any = {
    default: new GameBoard([
        [0, 0, 17, 1], // top wall
        [0, 1, 1, 18], // left wall
        [16, 1, 1, 18], // right wall
        [1, 18, 15, 1], // bottom wall
        
        [8, 1, 1, 2], // top middle "knob"
        
        [2, 2, 2, 1], // top left block
        [5, 2, 2, 1], // +right block
        [2, 4, 2, 1], // down of top left block
        [5, 4, 1, 4], // +right block

        [10, 2, 2, 1], // right of top middle knob
        [13, 2, 2, 1], // +right block
        [13, 4, 2, 1], // +down

        [7, 4, 3, 1], // just below knob

        [11, 4, 1, 4], // +right

        [8, 5, 1, 2],

        [1, 6, 3, 2],
        [6, 6, 1, 1],
        [10, 6, 1, 1],

        [13, 6, 3, 2],

        [1, 9, 3, 2],
        [5, 9, 1, 2],
        [11, 9, 1, 2],
        [13, 9, 2, 2],
        [7, 10, 3, 1],
        [8, 11, 1, 2],
        [2, 12, 2, 1],
        [5, 12, 2, 1],
        [10, 12, 5, 1],
        [3, 13, 1, 2],
        [13, 13, 1, 2],
        [1, 14, 1, 1],
        [5, 14, 1, 3],
        [7, 14, 3, 1],
        [11, 14, 1, 3],
        [15, 14, 1, 1],
        [8, 15, 1, 2],
        [2, 16, 3, 1],
        [6, 16, 1, 1],
        [10, 16, 1, 1],
        [12, 16, 3, 1],
    ])
};

export {gameBoards};