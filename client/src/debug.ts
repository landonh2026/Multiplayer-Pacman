// implementation of a* is from claude
// smoothPath function is from ChatGPT

class Debugger {
    lastPos: [number, number];
    frame: number;
    doPathfinding: boolean;
    path: Path|null;
    startNodeIndex: number|null;
    targetNodeIndex: number|null;
    pathfinder: Pathfinder|null;

    constructor(board: GameBoard) {
        canvas.addEventListener("mousemove", (e) => {
        });

        canvas.addEventListener("mousedown", (e) => {
            // if (e.button == 1) e.preventDefault();

            // console.log(e);
            this.lastPos = [e.offsetX, e.offsetY];

            if (gameManager.currentBoard.pathfinder.nodes == null) return;

            let minDistance = null;
            let minDistanceNode = null;

            for (let i = 0; i < gameManager.currentBoard.pathfinder.nodes.length; i++) {
                const node = gameManager.currentBoard.pathfinder.nodes[i];
                const distance = Math.abs(this.lastPos[0]-node.x) + Math.abs(this.lastPos[1]-node.y);
                
                // console.log("hi", i, node, distance);
                if (minDistance == null || distance < minDistance) {
                    // console.log("new best", minDistance, minDistanceNode, i);
                    minDistance = distance;
                    minDistanceNode = i;
                }
            }

            if (minDistanceNode != null) {
                if (e.button == 1) {
                    this.targetNodeIndex = minDistanceNode;
                } else if (e.button == 0) {
                    this.startNodeIndex = minDistanceNode;
                }
                this.doPathfinding = true;
                // console.log(minDistanceNode);
            }
        });

        // gameManager.currentBoard.pathfinder.nodes = nodesFromPathIntersections(board);

        this.lastPos = [0, 0];
        this.frame = 0;
        this.doPathfinding = true;
        this.path = null;
        this.targetNodeIndex = null;
        this.startNodeIndex = null;
        this.pathfinder = null;
    }

    public onFrameUpdate() {
        ctx.beginPath();
        ctx.fillStyle = "red";
        ctx.arc(this.lastPos[0], this.lastPos[1], 5, 0, 2*Math.PI);
        ctx.fill();

        this.frame = (this.frame + 1) %gameManager.target_fps;
        // if (this.frame != 0) return;

        
        if (gameManager.currentBoard.pathIntersections.length == 0) {
            return;
        }
        
        this.drawPath();

        if (!this.doPathfinding) return;
        this.doPathfinding = false;
        this.pathfinder = new Pathfinder();

        if (this.targetNodeIndex == null || this.startNodeIndex == null) {
            this.targetNodeIndex = gameManager.currentBoard.pathfinder.nodes.length - 1;
            this.startNodeIndex = 0;
        }

        // console.log(gameManager.currentBoard.pathfinder.nodes);

        // const a = performance.now();
        this.path = gameManager.currentBoard.pathfinder.findPathWithCoordinates(
            {x: gameManager.localPacman.x, y: gameManager.localPacman.y },
            {x: gameManager.currentBoard.pellets[1][0], y: gameManager.currentBoard.pellets[1][1]}
        );
        // console.log(performance.now()-a);
        // this.path = gameManager.currentBoard.pathfinder.findPathWithNodes(gameManager.currentBoard.pathfinder.nodes[this.startNodeIndex], gameManager.currentBoard.pathfinder.nodes[this.targetNodeIndex]);

        if (this.path == null) {
            console.log("no path found");
            return;
        }

        console.log(this.path.nodes.map(node => `(${node.x},${node.y})`).join(' -> '));
    }

    public drawPath() {
        if (this.path == null) return;

        this.path.draw();
    }
}