/**
 * Represents a Pacman game board with pellets, blocks, and path intersections where ghosts and pacman can turn
 */
class GameBoard {
    /** The raw block positions in terms of tiles instead of pixels */
    rawBlockPositions: Array<[number, number, number, number]>;
    /** The block positions in terms of pixels */
    blockPositions: Array<[number, number, number, number]>;
    
    /** The lines to draw the walls */
    drawLines: Array<[number, number, number, number]>;
    
    /** The raw pellet positions in terms of tiles instead of pixels */
    rawPellets: Array<Pellet>;
    /** The pellet positions in terms of pixels */
    pellets: Array<Pellet>;
    /** The bottom right position of the board. Also represents the width and height of the board. */
    bottomRight: [number, number];
    /** A list of path intersections where ghosts and pacman can turn */
    pathIntersections: Array<PathIntersection>;
    /** A list of wall collision functions that turn a wall into a single line given a direction */
    wallCollisionFunctions: Array<(wall: [number, number, number, number]) => { pos: { x: number; y: number; }; dir: { dx: number; dy: number; }; dist: number; }>;
    /** The pathfinder object for this gameboard */
    pathfinder: Pathfinder;

    constructor(
        rawBlockPositions: Array<[number, number, number, number]>,
        rawPellets: Array<Pellet>,
        pathIntersections: Array<{x: number, y: number, id: number, directions: [boolean, boolean, boolean, boolean]}>,
        tileSize: number|null = null
    ) {

        if (tileSize == null) tileSize = gameManager.tileSize;
        // ^ TODO: change in the future to calc at render time or to remake tiles at their pos when resizing
        // Maybe cache in draw manager?
        
        // duplicate the rawBlockPositions argument into the rawBlockPositions attriute
        this.rawBlockPositions = [...rawBlockPositions.map(innerArray => [...innerArray])] as Array<[number, number, number, number]>;
        this.blockPositions = rawBlockPositions;
        this.bottomRight = [0, 0];
        this.pathIntersections = this.makePathIntersections(pathIntersections, tileSize);

        // go through the block positions and multiply it by the tile size to get the pixel tile size
        for (let i = 0; i < this.blockPositions.length; i++) {
            let block = this.blockPositions[i];
            this.bottomRight = [Math.max(this.bottomRight[0], block[0]+block[2]), Math.max(block[1]+block[3])];

            for (let t = 0; t < 4; t++) {
                block[t] *= tileSize;
            }
        }
        this.drawLines = this.findDrawLines(this.blockPositions);


        // do the same as above for pellets
        this.rawPellets = rawPellets;
        this.pellets = rawPellets.map((p) => new Pellet(p.x*tileSize, p.y*tileSize, p.id, p.type));

        this.wallCollisionFunctions = [
            // left of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: wall[0], y: wall[1]}, dir: {dx: 0, dy: 1}, dist: wall[3] }; },
            
            // up of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: wall[0], y: wall[1]}, dir: {dx: 1, dy: 0}, dist: wall[2] }; },
            
            // right of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: (wall[0])+(wall[2]), y: wall[1]}, dir: {dx: 0, dy: 1}, dist: wall[3] }; },

            // bottom of wall check
            (wall: [number, number, number, number]) => { return { pos: {x: wall[0], y: wall[1]+(wall[3])}, dir: {dx: 1, dy: 0}, dist: wall[2] }; },
        ];

        this.pathfinder = new Pathfinder(this);
    }

    public findDrawLines(blockPositions: Array<[number, number, number, number]>): Array<[number, number, number, number]> {
        const lines: Array<[number, number, number, number]> = [];

        for (let i = 0; i < blockPositions.length; i++) {
            const [x, y, width, height] = blockPositions[i];

            // get the 4 sides of this block
            const top = [x, y, x + width, y] as [number, number, number, number];
            const bottom = [x, y + height, x + width, y + height] as [number, number, number, number];
            const left = [x, y, x, y + height] as [number, number, number, number];
            const right = [x + width, y, x + width, y + height] as [number, number, number, number];

            // get the segments for each of the sides
            let remainingTop = [top];
            let remainingBottom = [bottom];
            let remainingLeft = [left];
            let remainingRight = [right];

            for (let j = 0; j < blockPositions.length; j++) {
                if (i === j) continue;

                const [otherX, otherY, otherWidth, otherHeight] = blockPositions[j];

                // Check for adjacent lines and split them
                remainingTop = this.splitLine(remainingTop, [otherX, otherY + otherHeight, otherX + otherWidth, otherY + otherHeight]);
                remainingBottom = this.splitLine(remainingBottom, [otherX, otherY, otherX + otherWidth, otherY]);
                remainingLeft = this.splitLine(remainingLeft, [otherX + otherWidth, otherY, otherX + otherWidth, otherY + otherHeight]);
                remainingRight = this.splitLine(remainingRight, [otherX, otherY, otherX, otherY + otherHeight]);
            }

            lines.push(...remainingTop, ...remainingBottom, ...remainingLeft, ...remainingRight);
        }

        return lines;
    }

    /**
     * Splits a line into segments, excluding the overlapping portion with another line
     * @param lines The original line segments
     * @param overlap The line to exclude from the original segments
     * @returns The remaining line segments
     */
    public splitLine(
        lines: Array<[number, number, number, number]>,
        overlap: [number, number, number, number]
    ): Array<[number, number, number, number]> {
        const result: Array<[number, number, number, number]> = [];

        for (const [x1, y1, x2, y2] of lines) {
            const [ox1, oy1, ox2, oy2] = overlap;

            if (y1 === y2 && oy1 === oy2 && y1 === oy1) {
                // the lines are horizontal
                if (x1 < ox1) result.push([x1, y1, Math.min(x2, ox1), y1]);
                if (x2 > ox2) result.push([Math.max(x1, ox2), y1, x2, y1]);
            }
            else if (x1 === x2 && ox1 === ox2 && x1 === ox1) {
                // the lines are vertical
                if (y1 < oy1) result.push([x1, y1, x1, Math.min(y2, oy1)]);
                if (y2 > oy2) result.push([x1, Math.max(y1, oy2), x1, y2]);
            } else {
                // If no overlap, keep the original line
                result.push([x1, y1, x2, y2]);
            }
        }

        return result;
    }

    /**
     * Make the path intersections given path intersection data
     * @param data The data from the server
     * @param tileSize The tilesize to compute the pixels to put the tile
     * @returns The path intersections
     */
    public makePathIntersections(data: Array<{x: number, y: number, id: number, directions: [boolean, boolean, boolean, boolean]}>, tileSize: number) {
        const intersections = [];

        for (let node of data) {
            intersections.push(new PathIntersection(node.x*tileSize, node.y*tileSize, node.id, node.directions));
        }
        
        return intersections;
    }

    /**
     * Determine if a line intersects a wall
     * @param position The position to start the line
     * @param direction The direction the line goes
     * @param length The length of the line
     * @returns Does this line intersect a wall?
     */
    public lineIntersectsWall(position: {x: number, y: number}, direction: Direction, length: number = Infinity) {
        return this.lineWallCollisions(position, direction, length)?.length != 0;
    }

    /**
     * Find the collisions of a wall
     * @param position The position to start the line
     * @param direction The direction the line goes
     * @param length The length of the line
     * @returns All the collisions the line intersects
     */
    public lineWallCollisions(position: {x: number, y: number}, direction: Direction, length: number = Infinity) {
        // get the function which converts a wall into a line based on the given line's direction
        let directionCheck = this.wallCollisionFunctions[direction.enumValue];
        const directionDelta = direction.getDeltas();

        if (directionCheck == undefined) {
            console.error("Direction was invalid!");
            return null;
        }

        // go through each block and decide if it intersects the l ine
        let intersections: Array<{pos: {x: number, y: number}, block: [number, number, number, number]}> = [];
        for (let i = 0; i < this.blockPositions.length; i++) {
            const thisWall = this.blockPositions[i];

            // convert this wall into a line, used to use the lineIntersection function
            const directionData = directionCheck(thisWall);

            // get the intersection data for the given line and the wall's line
            const intersection =  lineIntersection(
                position, directionDelta,
                directionData.pos, directionData.dir,
                length, directionData.dist
            );

            if (intersection == null) continue;

            // add this intersection to the list of intersections
            intersections.push({pos: directionData.pos, block: thisWall});
        }

        return intersections;
    }

    /**
     * The a tile's coordinates given a pixel position
     * @param position The given pixel position
     * @returns The tile's coordinates
     */
    public getTileCoordinatesFromPosition(position: Array<number>): [number, number] {
        return [Math.ceil(position[0]/gameManager.tileSize-1), Math.ceil(position[1]/gameManager.tileSize-1)];
    }

    /**
     * Get the wall at a given pixel position
     * @param position 
     * @param offset 
     * @returns 
     */
    public getWallAtPosition(position: [number, number], offset: Array<number> = [0, 0]): [number, number, number, number]|null {
        // TODO: why are we using an offset?

        // get the position given a location
        const tilePosition = this.getTileCoordinatesFromPosition([position[0]+offset[0],position[1]+offset[1]]);

        // offset the given tile location so it will be in the center of the wall
        tilePosition[0] += 0.5;
        tilePosition[1] += 0.5;

        // go through each wall
        for (let i = 0; i < this.blockPositions.length; i++) {
            // if this point is not inside this wall, skip it
            if (!pointIntersectsRect(tilePosition, this.rawBlockPositions[i])) continue;

            // return this wall
            return this.blockPositions[i] as [number, number, number, number];
        }

        return null;
    }

    /**
     * Determines if a pixel position is a wall
     * @param position The pixel position
     * @param offset 
     * @returns Is this position a wall?
     */
    public isPositionWall(position: [number, number], offset: Array<number> = [0, 0]) {
        return this.getWallAtPosition(position, offset) == null;
    }

    /**
     * Get the next path intersection node given a position, direction, and tolerance
     * @param position The position of the object
     * @param direction The direction to find the next node in
     * @param tolerance The tolerance either vertically or horizontally to the pathnodes
     * @returns The next path intersection node
     */
    public getNextIntersectionNode(position: [number, number], direction: Direction, tolerance: number = 0) {
        const checkDirection = direction.enumValue % 2 == 0 ? 0 : 1;    // horizontal or vertical check
        const otherCheckDirection = (checkDirection + 1) % 2;           // the other direction from above
        const checkOrientation = direction.enumValue < 2 ? -1 : 1;      // The orientation (left vs right, up vs down). Used to skip nodes behind the object

        let minDistanceData = {
            distance: -1 as number,
            node: null as PathIntersection|null,
            nodeIndex: -1 as number
        };

        // go through each path intersection and decide if this node is on the correct direction and is closest
        for (let i = 0; i < this.pathIntersections.length; i++) {
            // duplicate the array * tile size
            // TODO: preprocess
            const node = [this.pathIntersections[i].x, this.pathIntersections[i].y] as [number, number];

            // if the node is outside our tolerance, then ignore it
            if (Math.abs(position[otherCheckDirection]-node[otherCheckDirection]) > tolerance) continue;
            
            const distance = (position[checkDirection]-node[checkDirection]) * checkOrientation;
            
            // decide if this node is closer than any previous nodes
            // also skip distances that would make the node behind the object
            if (distance < 0) continue;
            if (minDistanceData.node == null || distance < minDistanceData.distance) {
                minDistanceData.distance = distance;
                minDistanceData.node = this.pathIntersections[i];
                minDistanceData.nodeIndex = i;
            }
        }

        if (minDistanceData.node == null) return null;

        return minDistanceData as { distance: number, node: PathIntersection, nodeIndex: number } | null;
    }
}

/**
 * Represents a path intersection where pacman and ghosts can turn
 */
class PathIntersection {
    x: number;
    y: number;
    id: number;

    /** Which directions can a ghost or pacman turn here? [right, down, left, right] */
    directions: [boolean, boolean, boolean, boolean];
    
    constructor(x: number, y: number, id: number, directions: [boolean, boolean, boolean, boolean]) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.directions = directions;
    }
}

enum PELLET_STATES {
    NONE, EAT_PENDING
}

enum PELLET_TYPES {
    NORMAL,
    POWER,
    FOOD
}

class Pellet {
    x: number;
    y: number;
    type: PELLET_TYPES;
    id: number;
    local_state: PELLET_STATES

    constructor(x: number, y: number, id: number, type: PELLET_TYPES = PELLET_TYPES.NORMAL) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = id;
        this.local_state = PELLET_STATES.NONE;
    }
}