import * as utils from "./utils.ts";
import * as globals from "./globals.ts";
import { Pathfinder } from "./pathfinding.ts";

export class GameBoard {
    /** The raw block positions as tile positions */
    blockPositions: Array<[number, number, number, number]>;

    /** The block positions as pixels */
    pixelBlockPositions: Array<[number, number, number, number]>;

    forcedPathIntersections: Array<PathIntersection>;

    /** The pellet positions as tile positions */
    // pellets: Array<[number, number, number]>;
    pellets: Array<Pellet>;

    /** Represents the bottom right position of this game board */
    bottomRight: [number, number];

    /** Represents the path intersections of this game board where pacman and ghosts can turn */
    pathIntersections: Array<PathIntersection>;

    /** A list of wall collision functions that turn a wall into a single line given a direction */
    wallCollisionFunctions: Array<
        (wall: [number, number, number, number]) => {
            pos: { x: number; y: number };
            dir: { dx: number; dy: number };
            dist: number;
        }
    >;

    pathfinder: Pathfinder;

    ghostHome: [number, number];

    constructor(
        blockPositions: Array<[number, number, number, number]>,
        forcedPathIntersections: Array<PathIntersection>
    ) {
        this.blockPositions = [
            ...blockPositions.map((innerArray) => [...innerArray]),
        ] as Array<[number, number, number, number]>;
        this.pixelBlockPositions = blockPositions;
        this.forcedPathIntersections = forcedPathIntersections;
        this.bottomRight = [0, 0];
        this.ghostHome = [8.5, 7.5];

        for (let i = 0; i < this.pixelBlockPositions.length; i++) {
            let block = this.pixelBlockPositions[i];
            this.bottomRight = [
                Math.max(this.bottomRight[0], block[0] + block[2]),
                Math.max(block[1] + block[3]),
            ];

            for (let t = 0; t < 4; t++) {
                block[t] *= 40;
            }
        }

        this.pellets = this.makePellets();
        this.pathIntersections = [
            ...forcedPathIntersections,
            ...this.findPathIntersections(),
        ];

        this.wallCollisionFunctions = [
            // left of wall check
            (wall: [number, number, number, number]) => {
                return {
                    pos: { x: wall[0], y: wall[1] },
                    dir: { dx: 0, dy: 1 },
                    dist: wall[3],
                };
            },
            // up of wall check
            (wall: [number, number, number, number]) => {
                return {
                    pos: { x: wall[0], y: wall[1] },
                    dir: { dx: 1, dy: 0 },
                    dist: wall[2],
                };
            },
            // right of wall check
            (wall: [number, number, number, number]) => {
                return {
                    pos: { x: wall[0] + wall[2], y: wall[1] },
                    dir: { dx: 0, dy: 1 },
                    dist: wall[3],
                };
            },
            // bottom of wall check
            (wall: [number, number, number, number]) => {
                return {
                    pos: { x: wall[0], y: wall[1] + wall[3] },
                    dir: { dx: 1, dy: 0 },
                    dist: wall[2],
                };
            },
        ];

        this.pathfinder = new Pathfinder(this);
    }

    /**
     * Find the intersections between paths from the pellet positions
     * @returns An array of path intersections
     */
    public findPathIntersections() {
        const pathIntersections: Array<PathIntersection> = [];

        // check to see if the spaces around the pellet are open. If both axis (horizontal and vertical) are available, it is valid
        for (let i = 0; i < this.pellets.length; i++) {
            const pellet = this.pellets[i];
            let passedDirections = [false, false, false, false] as [
                boolean,
                boolean,
                boolean,
                boolean
            ];

            // loop through all other pellets
            for (let otherPellet of this.pellets) {
                // skip if pellet ids match
                if (pellet.id == otherPellet.id) continue;

                // do the y positions match?
                if (Math.abs(pellet.y - otherPellet.y) == 0) {
                    // are the pellets 1 tile away from each other in the left or right directions? If so, mark that
                    if (pellet.x - otherPellet.x == 1) {
                        passedDirections[2] = true;
                    } else if (pellet.x - otherPellet.x == -1) {
                        passedDirections[0] = true;
                    }
                }

                // do the x positions match?
                if (Math.abs(pellet.x - otherPellet.x) == 0) {
                    // are the pellets 1 tile away from each other in the up or down directions? If so, mark that
                    if (pellet.y - otherPellet.y == 1) {
                        passedDirections[3] = true;
                    } else if (pellet.y - otherPellet.y == -1) {
                        passedDirections[1] = true;
                    }
                }
            }

            // If this node is not connected to at least 1 horizontal and vertical node, then it is not a path intersection node
            if (
                !(
                    (passedDirections[0] || passedDirections[2]) &&
                    (passedDirections[1] || passedDirections[3])
                )
            )
                continue;

            pathIntersections.push(
                new PathIntersection(pellet.x, pellet.y, passedDirections)
            );
        }

        return pathIntersections;
    }

    /**
     * Make the pellets for the gameboard
     * @returns An array of pellets
     */
    public makePellets(): Array<Pellet> {
        const pellets: Array<Pellet> = [];

        let id = 0;
        // loop through each tile
        for (let x = 0; x < this.bottomRight[0]; x++) {
            next_tile: for (let y = 0; y < this.bottomRight[1] + 2; y++) {
                // check to see if this pellet would be spawned inside a wall
                for (let i = 0; i < this.blockPositions.length; i++) {
                    if (
                        utils.pointIntersectsRect(
                            [x + 0.5, y + 0.5],
                            this.blockPositions[i]
                        )
                    ) {
                        continue next_tile;
                    }
                }

                pellets.push(
                    new Pellet(
                        x + 0.5,
                        y + 0.5,
                        id++,
                        Math.random() > 0.95
                            ? PELLET_TYPES.POWER
                            : PELLET_TYPES.NORMAL
                    )
                );
            }
        }

        // make random pellet the food pellet
        utils.getRandomListItem(pellets).type = PELLET_TYPES.FOOD;

        return pellets;
    }

    /**
     * Determine if a line intersects a wall
     * @param position The position to start the line
     * @param direction The direction the line goes
     * @param length The length of the line
     * @returns Does this line intersect a wall?
     */
    public lineIntersectsWall(
        position: { x: number; y: number },
        direction: 0 | 1 | 2 | 3,
        length: number = Infinity
    ) {
        return (
            this.lineWallCollisions(position, direction, length)?.length != 0
        );
    }

    /**
     * Find the collisions of a wall
     * @param position The position to start the line
     * @param direction The direction the line goes
     * @param length The length of the line
     * @returns All the collisions the line intersects
     */
    public lineWallCollisions(
        position: { x: number; y: number },
        direction: 0 | 1 | 2 | 3,
        length: number = Infinity
    ) {
        // get the function which converts a wall into a line based on the given line's direction
        let directionCheck = this.wallCollisionFunctions[direction];
        const directionDelta = utils.getDirectionDelta(direction);

        if (directionCheck == undefined) {
            console.error("Direction was invalid!");
            return null;
        }

        // go through each block and decide if it intersects the l ine
        let intersections: Array<{
            pos: { x: number; y: number };
            block: [number, number, number, number];
        }> = [];
        for (let i = 0; i < this.pixelBlockPositions.length; i++) {
            const thisWall = this.pixelBlockPositions[i];

            // convert this wall into a line, used to use the lineIntersection function
            const directionData = directionCheck(thisWall);

            // get the intersection data for the given line and the wall's line
            const intersection = utils.lineIntersection(
                position,
                directionDelta,
                directionData.pos,
                directionData.dir,
                length,
                directionData.dist
            );

            if (intersection == null) continue;

            // add this intersection to the list of intersections
            intersections.push({ pos: directionData.pos, block: thisWall });
        }

        return intersections;
    }

    /**
     * Duplicate this game board
     * @returns
     */
    public duplicate(): GameBoard {
        return new GameBoard(
            [
                ...this.blockPositions.map((innerArray) => [...innerArray]),
            ] as Array<[number, number, number, number]>,
            this.forcedPathIntersections
        );
    }

    static make_tunnel_nodes(
        nodes: Array<[PathIntersection, PathIntersection]>
    ): Array<PathIntersection> {
        for (let tunnelGroup of nodes) {
            tunnelGroup[0].connection = tunnelGroup[1];
            tunnelGroup[1].connection = tunnelGroup[0];
        }

        return nodes.flat();
    }
}

export enum PATH_INTERSECTION_TYPES {
    NORMAL,
    WARP_TUNNEL,
}

export class PathIntersection {
    static globalID = 0;

    x: number;
    y: number;
    id: number;
    directions: [boolean, boolean, boolean, boolean];
    type: PATH_INTERSECTION_TYPES;
    connection: PathIntersection | null;

    constructor(
        x: number,
        y: number,
        directions: [boolean, boolean, boolean, boolean],
        type: PATH_INTERSECTION_TYPES = PATH_INTERSECTION_TYPES.NORMAL,
        connection: PathIntersection | null = null
    ) {
        this.x = x;
        this.y = y;
        this.id = PathIntersection.globalID++;
        this.directions = directions;
        this.type = type;
        this.connection = connection;
    }
}

export enum PELLET_TYPES {
    NORMAL,
    POWER,
    FOOD,
}

export class Pellet {
    x: number;
    y: number;
    type: PELLET_TYPES;
    id: number;

    constructor(
        x: number,
        y: number,
        id: number,
        type: PELLET_TYPES = PELLET_TYPES.NORMAL
    ) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = id;
    }
}

export const gameBoards: any = {
    default: new GameBoard(
        [
            [8, 8, 1, 1], // ghost home

            [0, 0, 17, 1], // top wall
            [1, 18, 15, 1], // bottom wall

            [0, 1, 1, 7], // left-top wall
            [0, 9, 1, 10], // left-bottom wall
            // [-1, 8, 1, 1], // left-middle exit blocker

            [16, 1, 1, 7], // right-top wall
            [16, 9, 1, 10], // right-left wall
            // [18, 8, 1, 1], // far right-middle exit blocker
            // [17, 7, 2, 1], // right warp tunnel top exit blocker
            // [17, 9, 2, 1], // right warp tunnel bottom exit blocker

            [8, 1, 1, 2], // top middle "knob"
            [7, 4, 3, 1], // just below knob

            [2, 2, 2, 1], // top left block
            [5, 2, 2, 1], // +right block
            [2, 4, 2, 1], // down of top left block
            [5, 4, 1, 4], // +right block

            [10, 2, 2, 1], // right of top middle knob
            [13, 2, 2, 1], // +right block
            [13, 4, 2, 1], // +down
            [11, 4, 1, 4], // +left wall

            [8, 5, 1, 2],

            [1, 6, 3, 2],
            [6, 6, 1, 1],
            [10, 6, 1, 1],

            [13, 6, 3, 2],

            [1, 9, 3, 2],
            [5, 9, 1, 2],
            [11, 9, 1, 2],
            [13, 9, 3, 2], // modified 4.9.2025 for warp tunnel (2w -> 3w)
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
        ],
        GameBoard.make_tunnel_nodes([
            [
                new PathIntersection(
                    0.5,
                    8.5,
                    [true, false, false, false],
                    PATH_INTERSECTION_TYPES.WARP_TUNNEL
                ),
                new PathIntersection(
                    16.5,
                    8.5,
                    [true, false, false, false],
                    PATH_INTERSECTION_TYPES.WARP_TUNNEL
                ),
            ],
        ])
    ),
};
