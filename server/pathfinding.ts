import {GameBoard, gameBoards, PATH_INTERSECTION_TYPES, PathIntersection} from "./gameBoard.ts";
import * as globals from "./globals.ts";
import * as utils from "./utils.ts";

export class Pathfinder
{
    /** The list of connected nodes used in the search algorithm. Position is scaled to screen size. */
    nodes: PathNode[];
    board: GameBoard|null;
    tunnelNodes: PathNode[];

    constructor(board: GameBoard|null, customNodes: PathNode[]|null = null) {
        this.board = board;
        this.nodes = this.makeNodes(customNodes);
        this.tunnelNodes = this.findTunnelNodes();
    }

    public getManhattanClosestNode(x: number, y: number) {
        let closest = {
            node: null,
            distance: Infinity 
        } as {node: PathNode|null, distance: number};

        for (let node of this.nodes) {
            const distance = Math.abs(x-node.x) + Math.abs(y-node.y);

            if (distance < closest.distance) {
                closest = { node: node, distance: distance };
            }
        }

        return closest;
    }

    /**
     * Find the path between two points given a start and end node
     * @param start The node to begin the pathfinding at
     * @param goal The target node to pathfind to
     * @returns The path from the start node to the target node. null if no path is found.
     */
    public findPathWithNodes(start: PathNode, goal: PathNode, allow_tunnel: boolean = true): Path | null {
        this.resetNodes();

        // TODO: add a param to enable using the warp tunnels
        // if enabled, we also need to manually find the distance if we went through one of the warp tunnels
        //      how? idk
        // we need to do this because a* naturally only goes in the direction which has the lowest distance, meaning it will never explore backwards

        // TODO: we might only need to calculate if we are going to use. See below note.
        // const directPath = this.aStar(start, goal);

        // get the closer warp tunnel
        const bestTunnel = utils.getLargest(this.tunnelNodes, (node) => {
            return -this.heuristic(start, node);
        });

        let tunnelDistance = null;
        if (bestTunnel != null && bestTunnel.tunnelConnection != null) {
            // console.log(bestTunnel.tunnelConnection.x, bestTunnel.tunnelConnection.y);
            // we need to scale the screen here
            tunnelDistance = this.heuristic(start, bestTunnel) +
                this.heuristic(new PathNode(bestTunnel.tunnelConnection.x, bestTunnel.tunnelConnection.y), goal);
        }

        // determine if we should even use this warp tunnel based on heuristic distance
        if (tunnelDistance != null && bestTunnel != null && tunnelDistance < this.heuristic(start, goal)) {
            return this.aStar(start, bestTunnel);
        }

        // if manhattan distance is smaller, check the actual distance
        // TODO: should we also check the total manhattan distance to the tunnel and to the pacman?
        // is the manhattan distance actually a good estimate of the best distance
        // I would think so, since there is not a ton of spots where you can't travel similarly to that

        // return the shorter of the two paths
        // console.log(bestTunnel?.tunnelConnection.id);

        const directPath = this.aStar(start, goal);
        return directPath;
    }

    /**
     * Find the path between two points given start and end coordinates
     * @param start The position to begin the pathfinding at
     * @param goal The target position to pathfind to
     * @returns The path from the start position to the target position. null if no path is found.
     */
    public findPathWithCoordinates(start: {x: number, y: number}, goal: {x: number, y: number}): Path | null {
        if (this.board == null) throw Error("Board property is null");

        // create a copy of each path intersection
        const customNodes: PathNode[] = [];
        for (let intersection of this.board.pathIntersections) {
            // skip this intersection if it matches the starting position
            if(start.x == intersection.x && start.y == intersection.y) {
                continue;
            }

            // TODO: doesn't update connection to be connected to the newly created other node
            customNodes.push(new PathNode(intersection.x, intersection.y, intersection.type, intersection.connection));
        }

        // make 2 more nodes which can be used in the search
        const startNode = new PathNode(start.x, start.y);
        const goalNode = new PathNode(goal.x, goal.y);
        customNodes.push(startNode);
        customNodes.push(goalNode);

        const customNodesPathfinder = new Pathfinder(this.board, customNodes);
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
        if (a.type == PATH_INTERSECTION_TYPES.WARP_TUNNEL && b.type == PATH_INTERSECTION_TYPES.WARP_TUNNEL) {
            return 0;
        }
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
    private makeNodes(customNodes: PathNode[]|null = null) {
        if (this.board == null) throw Error("Board property is null");
        
        // use default nodes if customNodes is null
        let nodes: PathNode[] = customNodes ?? this.board.pathIntersections.map(p => new PathNode(p.x, p.y, p.type, p.connection));
    
        // go through each node and connect them to all other nodes that are visible in each cardinal direction
        for (let node of nodes) {
            // the closest nodes by direction (right, down, left, up)
            let closestNodesByDirection: Array<null|{distance: number, node: PathNode}> = [null, null, null, null];

            // if this is a warp block, add it's connection as a connecting node
            warp_check: if (node.type == PATH_INTERSECTION_TYPES.WARP_TUNNEL && node.tunnelConnection != null) {
                const index = this.board.pathIntersections.indexOf(node.tunnelConnection);
                if (index == -1) break warp_check;

                const turnDirection = utils.getTurnDirection(
                    {x: node.tunnelConnection.x, y: node.tunnelConnection.y},
                    node
                );
                if (turnDirection == null) break warp_check;

                closestNodesByDirection[turnDirection] = {distance: 0, node: nodes[index]};
            }
    
            for (let otherNode of nodes) {
                if (otherNode.id == node.id) continue;

                if (this.lineOfSightCheck(node, otherNode)) {
                    const distance = Math.abs(node.x-otherNode.x) + Math.abs(node.y-otherNode.y);
    
                    let direction = utils.getTurnDirection(node, otherNode);
    
                    if (direction == null) {
                        console.warn("Direction not found... ", [node.x, node.y], [otherNode.x, otherNode.y]);
                        continue;
                    }
    
                    if (closestNodesByDirection[direction] == null || closestNodesByDirection[direction].distance > distance) {
                        closestNodesByDirection[direction] = {
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
                // object.node.addConnection(node);
            }
        }

        // for (let node of nodes) {
        //     if (node.type == PATH_INTERSECTION_TYPES.WARP_TUNNEL) {
        //         console.log(node.connections.length);
        //         for (let otherNode of node.connections) {
        //             if (otherNode.node.type != PATH_INTERSECTION_TYPES.WARP_TUNNEL) continue;

        //             console.log(otherNode.weight);
        //         }
        //     }
        // }
    
        return nodes;
    }

    /**
     * Find tunnel nodes inside this.nodes and return an array of them
     * @returns 
     */
    private findTunnelNodes(): PathNode[] {
        const tunnelNodes = [];

        for (let node of this.nodes) {
            if (node.type == PATH_INTERSECTION_TYPES.WARP_TUNNEL) {
                tunnelNodes.push(node);
            }
        }

        return tunnelNodes;
    }

    /**
     * Perform a line-of-sight check between two nodes
     * @param node The first node
     * @param otherNode The second node
     * @param board The gameboard used for wall detection
     * @returns Can the two nodes see each other?
     */
    private lineOfSightCheck(node: PathNode, otherNode: PathNode) {
        if (this.board == null) throw Error("Board property is null");
        if (otherNode.id == node.id) return false;
    
        // do they have the same x position?
        if (Math.abs(node.x-otherNode.x) == 0) {
            const direction = node.y - otherNode.y > 0 ? 3 : 1;
    
            if (this.board.lineIntersectsWall({x: node.x, y: node.y}, direction, Math.abs(node.y - otherNode.y))) {
                return false;
            }
    
            return true;
        }
    
        // do they have the same y position?
        if (Math.abs(node.y-otherNode.y) == 0) {
            const direction = node.x - otherNode.x > 0 ? 2 : 0;
            
            if (this.board.lineIntersectsWall({x: node.x, y: node.y}, direction, Math.abs(node.x - otherNode.x))) {
                return false;
            }
    
            return true;
        }
    
        return false;
    }
}

/**
 * Represents a path node which stores information relating to A*
 */
export class PathNode {
    x: number;
    y: number;

    type: PATH_INTERSECTION_TYPES;
    tunnelConnection: PathIntersection|null;

    /** A list of connections that this node has made */
    connections: { node: PathNode, weight: number }[];

    /** The currently known cost of the cheapest path from start to this node */
    g: number;

    /** The estimated cost for a path from start to finish */
    f: number;

    /** The node that the current path came from in the search algorithm */
    cameFrom: PathNode | null;

    /** The ID of this node */
    id: number

    /** The current node ID used for creating nodes */
    static id_count = 0;

    constructor(x: number, y: number, type: PATH_INTERSECTION_TYPES = PATH_INTERSECTION_TYPES.NORMAL, connection: PathIntersection|null = null) {
        this.x = x;
        this.y = y;
        this.connections = [];
        this.g = Infinity;
        this.f = Infinity;
        this.cameFrom = null;
        this.type = type;
        this.tunnelConnection = connection;

        this.id = PathNode.id_count++;
        if (PathNode.id_count == Number.MAX_SAFE_INTEGER) PathNode.id_count = 0;
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

/**
 * Stores a list of PathNodes in a list
 */
export class Path {
    /** A list of nodes in this path */
    nodes: PathNode[]

    constructor(nodes: PathNode[]) {
        this.nodes = nodes;
    }
}