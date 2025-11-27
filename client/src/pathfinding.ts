class PathNode {
    x: number;
    y: number;

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
    /** A list of nodes in this path */
    nodes: PathNode[]

    constructor(nodes: PathNode[]) {
        this.nodes = nodes;
    }

    /**
     * Draw this path to the gameboard
     */
    public draw() {
        ctx.lineWidth = 2;

        // for (let i = 0; i < this.nodes.length; i++) {
        //     const node = this.nodes[i];
            
        //     ctx.strokeStyle = "green";
        //     ctx.beginPath();
        //     ctx.arc(node.x, node.y, 10 * (gameManager.tileSize / 40), 0, 2*Math.PI);
        //     ctx.stroke();
        // }

        ctx.beginPath();
        ctx.strokeStyle = "green";
        for (let i = 1; i < this.nodes.length; i++) {
            ctx.moveTo(this.nodes[i-1].x * gameManager.tileSize, this.nodes[i-1].y * gameManager.tileSize);
            ctx.lineTo(this.nodes[i].x * gameManager.tileSize, this.nodes[i].y * gameManager.tileSize);
        }
        ctx.stroke();

        ctx.lineWidth = 1;
    }
}