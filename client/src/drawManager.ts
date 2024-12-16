class DrawManager {
    debug: boolean;

    constructor(debug: boolean = false) {
        this.debug = debug;
    }

    public drawBoard(board: GameBoard|null = null) {
        if (board == null) board = gameManager.currentBoard;

        for (let i = 0; i < gameManager.currentBoard.blockPositions.length; i++) {
            let blockData = gameManager.currentBoard.blockPositions[i];

            ctx.strokeStyle = ENVIRONMENT_COLORS.WALL;
            ctx.beginPath();
            ctx.roundRect(blockData[0], blockData[1], blockData[2], blockData[3], 5 * (gameManager.tileSize / 40));
            ctx.stroke();
        }

        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pelletData = gameManager.currentBoard.pellets[i];
            if (pelletData[3] == PELLET_STATES.EAT_PENDING) continue;
            
            ctx.fillStyle = ENVIRONMENT_COLORS.PELLET;
            ctx.beginPath();
            ctx.arc(pelletData[0], pelletData[1], Math.max(3 * (gameManager.tileSize / 40), 1.5), 0, 2*Math.PI);
            ctx.fill();
        }

        if (!this.debug) {
            return;
        }

        for (let i = 0; i < gameManager.currentBoard.pathIntersections.length; i++) {
            let intersectionData = gameManager.currentBoard.pathIntersections[i];
            
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.arc(intersectionData.x, intersectionData.y, 10, 0, 2*Math.PI);
            ctx.stroke();
        }

        if (gameManager.localPacman.lastQueuedDirectionNode != null) {
            ctx.strokeStyle = "green";
            ctx.beginPath();
            ctx.arc(gameManager.localPacman.lastQueuedDirectionNode.node.x, gameManager.localPacman.lastQueuedDirectionNode.node.y, 10, 0, 2*Math.PI);
            ctx.stroke();
        }
    }

    public drawPacman(x: number, y: number, radius: number, frame: number, direction: Direction = directions.UP) {
        const maxArcSize = 0.35;
        const minArcSize = 0.02;
        const arcOffset = direction.enumValue / 2 * Math.PI;
        
        let frameRatio = (frame / 4) * 2;
        
        if (frame >= 2) {
            frameRatio = 2 - frameRatio;
        }
        
        const radiusDifference = (maxArcSize-minArcSize) * frameRatio + minArcSize;

        ctx.beginPath();
        ctx.arc(x, y, radius, (radiusDifference * Math.PI) + arcOffset, ((2 - radiusDifference) * Math.PI) + arcOffset, false);
        ctx.lineTo(x, y);
        ctx.fill();
    }

    public drawGhost(x: number, y: number, direction: Direction) {
        ctx.beginPath();
        ctx.fillStyle = "rgb(255, 0, 0)";
        ctx.strokeStyle = "rgb(255, 0, 0)";
        ctx.arc(x, y, 5, 0, 2*Math.PI);
        ctx.fill();

        return;

        const radius = (gameManager.tileSize/3);
        const diameter = radius*2;

        let eyeOffsets = direction.getDeltas();
        eyeOffsets = {dx: eyeOffsets.dx*2, dy: eyeOffsets.dy*3};

        const bottomRight = [x-radius, y+gameManager.tileSize/3];

        // ctx.beginPath();
        
        // start 83 116
        // ctx.moveTo(bottomRight[0], bottomRight[1]);
        // ctx.lineTo(bottomRight[0], bottomRight[1]-14); // 83 102
        // ctx.bezierCurveTo(bottomRight[0], bottomRight[1], 89, 88, 97, 88); // 83 94 89 88 97 88
        // ctx.bezierCurveTo(105, 88, 111, 94, 111, 102);
        // ctx.lineTo(111, 116);
        // ctx.lineTo(106.333, 111.333);
        // ctx.lineTo(101.666, 116);
        // ctx.lineTo(97, 111.333);
        // ctx.lineTo(92.333, 116);
        // ctx.lineTo(87.666, 111.333);
        // ctx.lineTo(83, 116);
        // ctx.fill();

        let t = gameManager.tileSize / 40;
        t *= 1.1;

        // original code: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes#making_combinations
        // somewhat modified by chatgpt

        // Draw the shape
        ctx.beginPath();
        ctx.moveTo(bottomRight[0], bottomRight[1]); // Starting point
        ctx.lineTo(bottomRight[0], bottomRight[1] - 14 * t); // 116 - 102 = 14, scaled by t
        ctx.bezierCurveTo(bottomRight[0], bottomRight[1] - 22 * t, bottomRight[0] + 6 * t, bottomRight[1] - 28 * t, bottomRight[0] + 14 * t, bottomRight[1] - 28 * t);
        ctx.bezierCurveTo(bottomRight[0] + 22 * t, bottomRight[1] - 28 * t, bottomRight[0] + 28 * t, bottomRight[1] - 22 * t, bottomRight[0] + 28 * t, bottomRight[1] - 14 * t);
        ctx.lineTo(bottomRight[0] + 28 * t, bottomRight[1]);
        ctx.lineTo(bottomRight[0] + 23.333 * t, bottomRight[1] - 4.667 * t);
        ctx.lineTo(bottomRight[0] + 18.666 * t, bottomRight[1]);
        ctx.lineTo(bottomRight[0] + 14 * t, bottomRight[1] - 4.667 * t);
        ctx.lineTo(bottomRight[0] + 9.333 * t, bottomRight[1]);
        ctx.lineTo(bottomRight[0] + 4.666 * t, bottomRight[1] - 4.667 * t);
        ctx.lineTo(bottomRight[0], bottomRight[1]);
        ctx.fill();

        // Draw the Eyes
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.moveTo(bottomRight[0] + 8 * t, bottomRight[1] - 20 * t); // Eye 1 relative to main body
        ctx.bezierCurveTo(bottomRight[0] + 5 * t, bottomRight[1] - 20 * t, bottomRight[0] + 4 * t, bottomRight[1] - 17 * t, bottomRight[0] + 4 * t, bottomRight[1] - 15 * t);
        ctx.bezierCurveTo(bottomRight[0] + 4 * t, bottomRight[1] - 13 * t, bottomRight[0] + 5 * t, bottomRight[1] - 10 * t, bottomRight[0] + 8 * t, bottomRight[1] - 10 * t);
        ctx.bezierCurveTo(bottomRight[0] + 11 * t, bottomRight[1] - 10 * t, bottomRight[0] + 12 * t, bottomRight[1] - 13 * t, bottomRight[0] + 12 * t, bottomRight[1] - 15 * t);
        ctx.bezierCurveTo(bottomRight[0] + 12 * t, bottomRight[1] - 17 * t, bottomRight[0] + 11 * t, bottomRight[1] - 20 * t, bottomRight[0] + 8 * t, bottomRight[1] - 20 * t);

        ctx.moveTo(bottomRight[0] + 20 * t, bottomRight[1] - 20 * t); // Eye 2 relative to main body
        ctx.bezierCurveTo(bottomRight[0] + 17 * t, bottomRight[1] - 20 * t, bottomRight[0] + 16 * t, bottomRight[1] - 17 * t, bottomRight[0] + 16 * t, bottomRight[1] - 15 * t);
        ctx.bezierCurveTo(bottomRight[0] + 16 * t, bottomRight[1] - 13 * t, bottomRight[0] + 17 * t, bottomRight[1] - 10 * t, bottomRight[0] + 20 * t, bottomRight[1] - 10 * t);
        ctx.bezierCurveTo(bottomRight[0] + 23 * t, bottomRight[1] - 10 * t, bottomRight[0] + 24 * t, bottomRight[1] - 13 * t, bottomRight[0] + 24 * t, bottomRight[1] - 15 * t);
        ctx.bezierCurveTo(bottomRight[0] + 24 * t, bottomRight[1] - 17 * t, bottomRight[0] + 23 * t, bottomRight[1] - 20 * t, bottomRight[0] + 20 * t, bottomRight[1] - 20 * t);
        ctx.fill();

        // Draw the pupils
        ctx.fillStyle = "blue";
        ctx.beginPath();
        ctx.arc(bottomRight[0] + eyeOffsets.dx + 20 * t, bottomRight[1] + eyeOffsets.dy - 15 * t, 2 * t, 0, Math.PI * 2, true); // Pupil 1
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bottomRight[0] + eyeOffsets.dx + 8 * t, bottomRight[1] + eyeOffsets.dy - 15 * t, 2 * t, 0, Math.PI * 2, true); // Pupil 2
        ctx.fill();
    }

    public drawWallCollision(x: number, y: number) {
        if (!this.debug) return;

        ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.arc(x, y, 1, 0, 2*Math.PI);
        ctx.fill();
    }
}