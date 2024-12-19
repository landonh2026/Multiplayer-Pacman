class Pathfinder
{
    nodes: PathNode[];

    constructor(board: GameBoard|null = null, customNodes: PathNode[]|null = null) {
        this.nodes = this.makeNodes(board, customNodes);
    }

    /**
     * Get the direction between a start node and another node. The given nodes should be in the same position in at least 1 axis.
     * @param node The node which the direction is relative to
     * @param otherNode The other node
     * @returns The direction from the first node to the second node
     */
    public getTurnDirection(node: PathNode|{x: number, y: number}, otherNode: PathNode|{x: number, y: number}): Direction|null {
        if (Math.abs(node.y-otherNode.y) == 0) return node.x - otherNode.x > 0 ? directions.LEFT : directions.RIGHT;
        if (Math.abs(node.x-otherNode.x) == 0) return node.y - otherNode.y > 0 ? directions.UP : directions.DOWN;

        return directions.LEFT;
    }

    /**
     * Find the path between two points given a start and end node
     * @param start The node to begin the pathfinding at
     * @param goal The target node to pathfind to
     * @returns The path from the start node to the target node. null if no path is found.
     */
    public findPathWithNodes(start: PathNode, goal: PathNode): Path | null {
        this.resetNodes();
        // return this.customSearch(start, goal);
        return this.aStar(start, goal);
    }

    /**
     * Find the path between two points given start and end coordinates
     * @param start The position to begin the pathfinding at
     * @param goal The target position to pathfind to
     * @returns The path from the start position to the target position. null if no path is found.
     */
    public findPathWithCoordinates(start: {x: number, y: number}, goal: {x: number, y: number}): Path | null {
        const customNodes: PathNode[] = [];
        // create a copy of each path intersection
        for (let intersection of gameManager.currentBoard.pathIntersections) {
            // skip this intersection if it matches the starting position
            if(start.x == intersection.x && start.y == intersection.y) {
                continue;
            }

            customNodes.push(new PathNode(intersection.x, intersection.y));
        }

        // make 2 more nodes which can be used in the search
        const startNode = new PathNode(start.x, start.y);
        const goalNode = new PathNode(goal.x, goal.y);
        customNodes.push(startNode);
        customNodes.push(goalNode);

        const customNodesPathfinder = new Pathfinder(null, customNodes);
        const path = customNodesPathfinder.findPathWithNodes(startNode, goalNode);

        return path;
    }

    /**
     * Reset the nodes
     */
    public resetNodes() {
        for (let node of this.nodes) {
            node.g = Infinity;
            node.f = Infinity;
            node.cameFrom = null;
        }
    }


    /**
     * The A* search algorithm
     * @param start The beginning node
     * @param goal The goal node
     * @returns The Path to the goal node
     */
    private aStar(start: PathNode, goal: PathNode): Path | null {
        const openSet: Set<PathNode> = new Set([start]);
        start.g = 0;
        start.f = this.heuristic(start, goal);
    
        while (openSet.size > 0) {
            const current: PathNode = Array.from(openSet).reduce((a, b) => (a.f < b.f? a : b));
    
            if (current === goal) {
                return new Path(this.reconstructPath(current));
            }
    
            openSet.delete(current);
    
            for (const { node: neighbor, weight } of current.connections) {
                if (neighbor.id == current.id) {
                    continue;
                }

                const tentativeG: number = current.g + weight;
    
                if (tentativeG < neighbor.g) {
                    neighbor.cameFrom = current;
                    neighbor.g = tentativeG;
                    neighbor.f = tentativeG + this.heuristic(neighbor, goal);
    
                    if (!openSet.has(neighbor)) {
                        openSet.add(neighbor);
                    }
                }
            }
        }
    
        return null; // Path not found
    }

    /**
     * The Heuristic Function determining the score between two nodes
     * @param a The first node
     * @param b The second node
     * @returns The score for this path
     */
    private heuristic(a: PathNode, b: PathNode): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Reconstruct the path used in the A* search algorithm
     * @param current The current node
     * @returns The entire path
     */
    private reconstructPath(current: PathNode): PathNode[] {
        const totalPath: PathNode[] = [current];
        while (current.cameFrom) {

            current = current.cameFrom;

            if (totalPath[0] != undefined && totalPath[0].x == current.x && totalPath[0].y == current.y) {
                continue;
            }

            totalPath.unshift(current);
        }
    
        return totalPath;
    }

    /**
     * Make the nodes used in the search algorithm
     * @param board The current gameboard
     * @param customNodes Should we use custom nodes? Leave null if no.
     * @returns The created nodes
     */
    private makeNodes(board: GameBoard|null = null, customNodes: PathNode[]|null = null) {
        if (board == null) board = gameManager.currentBoard;

        let nodes: PathNode[] = [];
    
        // use default nodes if customNodes is null
        if (customNodes == null) {
            for (let intersection of board.pathIntersections) {
                nodes.push(new PathNode(intersection.x, intersection.y));
            }
        } else {
            nodes = customNodes;
        }
    
        // go through each node and connect them to all other nodes that are visible in each cardinal direction
        for (let node of nodes) {
            // the closest nodes by direction (right, down, left, up)
            let closestNodesByDirection: Array<null|{distance: number, node: PathNode}> = [null, null, null, null];
    
            for (let otherNode of nodes) {
                if (otherNode.id == node.id) continue;
    
                if (this.lineOfSightCheck(node, otherNode, board)) {
                    const distance = Math.abs(node.x-otherNode.x) + Math.abs(node.y-otherNode.y);
    
                    let direction = this.getTurnDirection(node, otherNode);
    
                    if (direction == null) {
                        console.warn("Direction not found... ", [node.x, node.y], [otherNode.x, otherNode.y]);
                        continue;
                    }
    
                    // @ts-ignore
                    if (closestNodesByDirection[direction.enumValue] == null || closestNodesByDirection[direction.enumValue].distance > distance) {
                        closestNodesByDirection[direction.enumValue] = {
                            distance: distance,
                            node: otherNode
                        };
                    }
                }
            }
    
            // go through each cardinal direction and add a connection
            // TODO: check to see if they are already connected?
            for (let object of closestNodesByDirection) {
                if (object == null) continue;
    
                node.addConnection(object.node);
                object.node.addConnection(node);
            }
        }
    
        return nodes;
    }

    /**
     * Perform a line-of-sight check between two nodes
     * @param node The first node
     * @param otherNode The second node
     * @param board The gameboard used for wall detection
     * @returns Can the two nodes see each other?
     */
    private lineOfSightCheck(node: PathNode, otherNode: PathNode, board: GameBoard|null = null) {
        if (board == null) board = gameManager.currentBoard;
        if (otherNode.id == node.id) return false;
    
        // do they have the same x position?
        if (Math.abs(node.x-otherNode.x) == 0) {
            const direction = node.y - otherNode.y > 0 ? directions.UP : directions.DOWN;
    
            if (board.lineIntersectsWall({x: node.x, y: node.y}, direction, Math.abs(node.y - otherNode.y))) {
                return false;
            }
    
            return true;
        }
    
        // do they have the same y position?
        if (Math.abs(node.y-otherNode.y) == 0) {
            const direction = node.x - otherNode.x > 0 ? directions.LEFT : directions.RIGHT;
            
            if (board.lineIntersectsWall({x: node.x, y: node.y}, direction, Math.abs(node.x - otherNode.x))) {
                return false;
            }
    
            return true;
        }
    
        return false;
    }
}

class PathNode {
    x: number;
    y: number;
    connections: { node: PathNode, weight: number }[];
    g: number;
    f: number;
    cameFrom: PathNode | null;
    id: number

    static id_count = 0;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.connections = [];
        this.g = Infinity;
        this.f = Infinity;
        this.cameFrom = null;

        this.id = PathNode.id_count++;
    }

    /**
     * Add a connection that the A* Search algorithm can use when pathfinding
     * @param node The other node to add a connection to
     * @param weight The weight of this connection
     */
    addConnection(node: PathNode, weight: number = 1): void {
        this.connections.push({ node, weight });
    }
}

class Path {
    nodes: PathNode[]

    constructor(nodes: PathNode[]) {
        this.nodes = nodes;
    }

    /**
     * Draw this path to the gameboard
     */
    public draw() {
        ctx.lineWidth = 2;

        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            
            ctx.strokeStyle = "green";
            ctx.beginPath();
            ctx.arc(node.x, node.y, 10 * (gameManager.tileSize / 40), 0, 2*Math.PI);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.strokeStyle = "green";
        for (let i = 1; i < this.nodes.length; i++) {
            ctx.moveTo(this.nodes[i-1].x, this.nodes[i-1].y);
            ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
        }
        ctx.stroke();

        ctx.lineWidth = 1;
    }
}