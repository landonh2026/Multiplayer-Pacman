class DrawManager {
    debug: boolean;

    constructor(debug: boolean = false) {
        this.debug = debug;
    }

    /**
     * Draw the board onto the canvas
     * @param board The current gameboard
     */
    public drawBoard(board: GameBoard|null = null) {
        if (board == null) board = gameManager.currentBoard;

        // draw the walls from the block data
        for (let i = 0; i < gameManager.currentBoard.blockPositions.length; i++) {
            let blockData = gameManager.currentBoard.blockPositions[i];

            ctx.strokeStyle = ENVIRONMENT_COLORS.WALL;
            ctx.beginPath();
            ctx.roundRect(blockData[0], blockData[1], blockData[2], blockData[3], 5 * (gameManager.tileSize / 40));
            ctx.stroke();
        }

        // draw the pellets from the pellet data
        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pelletData = gameManager.currentBoard.pellets[i];
            if (pelletData[3] == PELLET_STATES.EAT_PENDING) continue;
            
            ctx.fillStyle = ENVIRONMENT_COLORS.PELLET;
            ctx.beginPath();
            ctx.arc(pelletData[0], pelletData[1], Math.max(3 * (gameManager.tileSize / 40), 1.5), 0, 2*Math.PI);
            ctx.fill();
        }

        // only continue if debug is active
        if (!this.debug) {
            return;
        }

        // draw path intersections
        for (let i = 0; i < gameManager.currentBoard.pathIntersections.length; i++) {
            let intersectionData = gameManager.currentBoard.pathIntersections[i];
            
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.arc(intersectionData.x, intersectionData.y, 10, 0, 2*Math.PI);
            ctx.stroke();
        }
    }

    /**
     * Draw a pacman given many arguments
     * @param x The x position that is the center of the pacman
     * @param y The y position that is the center of the pacman
     * @param radius The radius of the pacman
     * @param frame The current frame of the mouth animation of the pacman
     * @param direction The facing direction of the pacman
     */
    public drawPacman(x: number, y: number, radius: number, frame: number, direction: Direction = directions.UP) {
        // define the size of the mouth
        const maxArcSize = 0.35;
        const minArcSize = 0.02;

        // calculate the mouth's offset based on the rotation
        const arcOffset = direction.enumValue / 2 * Math.PI;
        
        // make the mouth open and close instead of jumping on the animation
        let frameRatio = (frame / 4) * 2;
        if (frame >= 2) {
            frameRatio = 2 - frameRatio;
        }
        
        // calculate the angle that the mouth should open
        const radiusDifference = (maxArcSize-minArcSize) * frameRatio + minArcSize;

        // actually draw the pacman
        ctx.beginPath();
        ctx.arc(x, y, radius, (radiusDifference * Math.PI) + arcOffset, ((2 - radiusDifference) * Math.PI) + arcOffset, false);
        ctx.lineTo(x, y);
        ctx.fill();
    }

    /**
     * Unfinished. Draws a ghost given many arguments.
     * @param x The x position of the ghost
     * @param y The y position of the ghost
     * @param direction The direction that the ghost is facing
     */
    public drawGhost(x: number, y: number, direction: Direction) {
        ctx.beginPath();
        ctx.fillStyle = "rgb(255, 0, 0)";
        ctx.strokeStyle = "rgb(255, 0, 0)";
        ctx.arc(x, y, 5, 0, 2*Math.PI);
        ctx.fill();
    }

    /**
     * Draw wall collision in the form of small dots. Debug only.
     * @param x X position of the dot
     * @param y Y position of the dot
     */
    public drawWallCollision(x: number, y: number) {
        if (!this.debug) return;

        ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.arc(x, y, 1, 0, 2*Math.PI);
        ctx.fill();
    }
}