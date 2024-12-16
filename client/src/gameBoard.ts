class GameBoard {
    rawBlockPositions: Array<[number, number, number, number]>;
    blockPositions: Array<[number, number, number, number]>;
    rawPellets: Array<[number, number, number]>;
    pellets: Array<[number, number, number, PELLET_STATES]>;
    bottomRight: [number, number];
    pathIntersections: Array<PathIntersection>;
    wallCollisionFunctions: Array<(wall: [number, number, number, number]) => { pos: { x: number; y: number; }; dir: { dx: number; dy: number; }; dist: number; }>;
    pathfinder: Pathfinder;

    constructor(
        rawBlockPositions: Array<[number, number, number, number]>,
        rawPellets: Array<[number, number, number]>,
        pathIntersections: Array<{x: number, y: number, id: number, directions: [boolean, boolean, boolean, boolean]}>,
        tileSize: number|null = null) {

        if (tileSize == null) tileSize = gameManager.tileSize;
        // ^ TODO: change in the future to calc at render time or to remake tiles at their pos when resizing
        // Maybe cache in draw manager?
        
        this.rawBlockPositions = [...rawBlockPositions.map(innerArray => [...innerArray])] as Array<[number, number, number, number]>;
        this.blockPositions = rawBlockPositions;
        this.bottomRight = [0, 0];
        this.pathIntersections = this.makePathIntersections(pathIntersections, tileSize);

        for (let i = 0; i < this.blockPositions.length; i++) {
            let block = this.blockPositions[i];
            this.bottomRight = [Math.max(this.bottomRight[0], block[0]+block[2]), Math.max(block[1]+block[3])];

            for (let t = 0; t < 4; t++) {
                block[t] *= tileSize;
            }
        }

        this.rawPellets = rawPellets;
        const pellets = [...rawPellets.map(innerArray => [...innerArray])] as Array<[number, number, number]>;
        this.pellets = [];

        for (let i = 0; i < pellets.length; i++) {
            this.pellets.push([pellets[i][0]*tileSize, pellets[i][1]*tileSize, pellets[i][2], PELLET_STATES.NONE]);
        }

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

    public makePathIntersections(data: Array<{x: number, y: number, id: number, directions: [boolean, boolean, boolean, boolean]}>, tileSize: number) {
        const intersections = [];

        for (let node of data) {
            intersections.push(new PathIntersection(node.x*tileSize, node.y*tileSize, node.id, node.directions));
        }
        
        return intersections;
    }

    public lineIntersectsWall(position: {x: number, y: number}, direction: Direction, length: number = Infinity) {
        return this.lineWallCollisions(position, direction, length)?.length != 0;
    }

    public lineWallCollisions(position: {x: number, y: number}, direction: Direction, length: number = Infinity) {
        let directionCheck = this.wallCollisionFunctions[direction.enumValue];
        const directionDelta = direction.getDeltas();

        if (directionCheck == undefined) {
            console.error("Direction was invalid!");
            return null;
        }

        let intersections: Array<{pos: {x: number, y: number}, block: [number, number, number, number]}> = [];
        for (let i = 0; i < this.blockPositions.length; i++) {
            const thisWall = this.blockPositions[i];

            const directionData = directionCheck(thisWall);
    
            // ctx.beginPath();
            // ctx.strokeStyle = "white";
            // ctx.moveTo(directionData.pos.x, directionData.pos.y);
            // ctx.lineTo(
            //     directionData.pos.x + 
            //         (direction.enumValue%2 == 1 ? (directionData.dir.dx * directionData.dist) : 0),
            //     directionData.pos.y +
            //         (direction.enumValue%2 == 0 ? (directionData.dir.dy * directionData.dist) : 0)
            // );
            // ctx.stroke();

            const intersection =  lineIntersection(
                position, directionDelta,
                directionData.pos, directionData.dir,
                length, directionData.dist
            );

            if (intersection == null) continue;

            intersections.push({pos: directionData.pos, block: thisWall});
        }

        return intersections;
    }

    public getTileCoordinatesFromPosition(position: Array<number>): [number, number] {
        return [Math.ceil(position[0]/gameManager.tileSize-1), Math.ceil(position[1]/gameManager.tileSize-1)];
    }

    public getTileAtPosition(position: [number, number], offset: Array<number> = [0, 0]): [number, number, number, number]|undefined {
        const tilePosition = this.getTileCoordinatesFromPosition([position[0]+offset[0],position[1]+offset[1]]);
        tilePosition[0] += 0.5;
        tilePosition[1] += 0.5;

        for (let i = 0; i < this.blockPositions.length; i++) {
            if (!pointIntersectsRect(tilePosition, this.rawBlockPositions[i])) continue;

            return this.blockPositions[i] as [number, number, number, number];
        }
    }

    public isPositionWall(position: [number, number], offset: Array<number> = [0, 0]) {
        return this.getTileAtPosition(position, offset) == undefined;
    }

    public getNextIntersectionNode(position: [number, number], direction: Direction, tolerance: number = 0) {
        const checkDirection = direction.enumValue % 2 == 0 ? 0 : 1;
        const otherCheckDirection = (checkDirection + 1) % 2;
        const checkOrientation = direction.enumValue < 2 ? -1 : 1;

        let minDistanceData = {
            distance: -1 as number,
            node: null as PathIntersection|null,
            nodeIndex: -1 as number
        };

        for (let i = 0; i < this.pathIntersections.length; i++) {
            // duplicate the array * tile size
            // TODO: preprocess
            const node = [this.pathIntersections[i].x, this.pathIntersections[i].y] as [number, number];

            if (Math.abs(position[otherCheckDirection]-node[otherCheckDirection]) > tolerance) continue;
            
            const distance = (position[checkDirection]-node[checkDirection]) * checkOrientation;
            
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

class PathIntersection {
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

enum PELLET_STATES {
    NONE, EAT_PENDING
}