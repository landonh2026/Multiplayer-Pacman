/**
 * Handles drawing various objects onto the canvas
 */
class DrawManager {
    constructor() {
        
    }

    /**
     * Draw the board onto the canvas
     * @param board The gameboard to draw onto. Leave null for the current board.
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

        if (gameManager.debug.intersectionPoints) {
            // draw path intersections
            for (let i = 0; i < gameManager.currentBoard.pathIntersections.length; i++) {
                let intersectionData = gameManager.currentBoard.pathIntersections[i];
                
                ctx.strokeStyle = "red";
                ctx.beginPath();
                ctx.arc(intersectionData.x, intersectionData.y, 10, 0, 2*Math.PI);
                ctx.stroke();
            }
        }
    }

    public drawDeadPacman(x: number, y: number, radius: number, frame: number) {
        if (frame > 35) {
            ctx.strokeStyle = "white";

            frame -= 35;
            ctx.beginPath();
            
            const particlePositions = [[-1, -1], [-1, 1], [1, 1], [1, -1]];

            const start_shrinking_frame = 3;
            const starting_distance = 5;

            for (let particle of particlePositions) {
                let p_start = [particle[0]*starting_distance, particle[1]*starting_distance];
                let distance = frame;

                if (distance > start_shrinking_frame) {
                    p_start = [particle[0]*(starting_distance+start_shrinking_frame+1), particle[1]*(starting_distance+start_shrinking_frame+1)];
                    particle = [-particle[0], -particle[1]];
                    distance = (start_shrinking_frame - (frame-start_shrinking_frame));
                }

                distance *= 1.5;

                ctx.moveTo(x + p_start[0], y + p_start[1]);
                ctx.lineTo(x + p_start[0] + (particle[0] * distance), y + p_start[1] + (particle[1] * distance));
            }

            
            const oldWidth = ctx.lineWidth;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = oldWidth;
            return;
        }

        frame = Math.max(frame-5, 0);

        frame = Math.round(frame / 3);
        const rad = Math.PI * frame * 18 / 180;

        // actually draw the pacman
        ctx.beginPath();
        ctx.arc(x, y, radius, Math.PI * -0.5 + rad, Math.PI * 1.5 - rad, false);
        ctx.lineTo(x, y);
        ctx.fill();
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
    public drawGhost(x: number, y: number, direction: Direction|null) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2*Math.PI);
        ctx.fill();
    }

    /**
     * Draw wall collision in the form of small dots. Debug only.
     * @param x X position of the dot
     * @param y Y position of the dot
     */
    public drawWallCollision(x: number, y: number) {
        if (!gameManager.debug.pacmanWallCollision) return;

        ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.arc(x, y, 1, 0, 2*Math.PI);
        ctx.fill();
    }
}