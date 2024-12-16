class Pathfinder
{
    nodes: PathNode[];

    constructor(board: GameBoard|null = null, customNodes: PathNode[]|null = null) {
        this.nodes = this.makeNodes(board, customNodes);
    }

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
        for (let intersection of gameManager.currentBoard.pathIntersections) {
            if(start.x == intersection.x && start.y == intersection.y) {
                continue;
            }

            customNodes.push(new PathNode(intersection.x, intersection.y));
        }

        const startNode = new PathNode(start.x, start.y);
        const goalNode = new PathNode(goal.x, goal.y);
        customNodes.push(startNode);
        customNodes.push(goalNode);

        const customNodesPathfinder = new Pathfinder(null, customNodes);
        const path = customNodesPathfinder.findPathWithNodes(startNode, goalNode);

        return path;
    }

    public resetNodes() {
        for (let node of this.nodes) {
            node.g = Infinity;
            node.f = Infinity;
            node.cameFrom = null;
        }
    }

    private customSearch(start: PathNode, goal: PathNode): Path | null {
        const nodes: Set<PathNode> = new Set([start]);
        start.cameFrom = null;

        // let customSearch = (node: PathNode, depth: number, firstSearch: boolean = false) => {
        //     console.log(depth);
        //     // return;
        //     if (depth == 0) return;
        //     if ((!firstSearch) && (node.id == start.id || nodes.has(node))) return;

        //     node.f = this.heuristic(node, goal);
        //     nodes.add(node);

        //     for (const { node: neighbor, weight } of node.connections) {
        //         if (nodes.has(neighbor)) continue;

        //         neighbor.cameFrom = node;
        //         customSearch(neighbor, depth - 1);
        //     }
        // };

        // customSearch(start, 4, true);

        for (const { node: neighbor, weight } of start.connections) {
            neighbor.cameFrom = start;

            if (neighbor.id == start.id) continue;

            if (!nodes.has(neighbor)) {
                neighbor.f = this.heuristic(neighbor, goal);
                nodes.add(neighbor);
            }

            for (const { node: neighbor2, weight: weight2 } of neighbor.connections) {
                if (neighbor2.x == start.x && neighbor2.y == start.y) continue;
                if (nodes.has(neighbor2)) continue;

                neighbor2.f = this.heuristic(neighbor2, goal);
                neighbor2.cameFrom = neighbor;
                nodes.add(neighbor2);
            }
        }

        if (nodes.size == 1) { return null; }

        nodes.delete(start);
        const bestEndNode = Array.from(nodes).reduce((a, b) => (a.f < b.f? a : b));

        return new Path(this.reconstructPath(bestEndNode));
    }

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

    private heuristic(a: PathNode, b: PathNode): number {
        // Manhattan distance heuristic, favoring horizontal movement first
        // return Math.abs(a.x - b.x) + Math.pow(Math.abs(a.y - b.y), 2);
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

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

    private makeNodes(board: GameBoard|null = null, customNodes: PathNode[]|null = null) {
        if (board == null) board = gameManager.currentBoard;

        let nodes: PathNode[] = [];
    
        if (customNodes == null) {
            for (let intersection of board.pathIntersections) {
                nodes.push(new PathNode(intersection.x, intersection.y));
            }
        } else {
            nodes = customNodes;
        }
    
        for (let node of nodes) {
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
    
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    if (closestNodesByDirection[direction.enumValue] == null || closestNodesByDirection[direction.enumValue].distance > distance) {
                        closestNodesByDirection[direction.enumValue] = {
                            distance: distance,
                            node: otherNode
                        };
                    }
                }
            }
    
            for (let object of closestNodesByDirection) {
                if (object == null) continue;
    
                node.addConnection(object.node);
                object.node.addConnection(node);
            }
        }
    
        return nodes;
    }

    private lineOfSightCheck(node: PathNode, otherNode: PathNode, board: GameBoard|null = null) {
        if (board == null) board = gameManager.currentBoard;
        if (otherNode.id == node.id) return false;
    
        if (Math.abs(node.x-otherNode.x) == 0) {
            const direction = node.y - otherNode.y > 0 ? directions.UP : directions.DOWN;
    
            if (board.lineIntersectsWall({x: node.x, y: node.y}, direction, Math.abs(node.y - otherNode.y))) {
                return false;
            }
    
            return true;
        }
    
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

    addConnection(node: PathNode, weight: number = 1): void {
        this.connections.push({ node, weight });
    }
}

class Path {
    nodes: PathNode[]

    constructor(nodes: PathNode[]) {
        this.nodes = nodes;
    }

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