/**
 * Handles drawing various objects onto the canvas
 */
class DrawManager {
    powerPelletFlash: GameAnimation;
    pelletShrinkAnimation: GameAnimation;
    oldPellets: Array<Pellet>;

    constructor() {
        this.powerPelletFlash = new GameAnimation(24, true, 1, true);
        this.pelletShrinkAnimation = new GameAnimation(12, false, 1, false);
        this.oldPellets = [];
    }

    public shouldDoEntityFlash(): boolean {
        let allPacman = [gameManager.localPacman];
        for (let player of Object.keys(gameManager.remotePlayers)) allPacman.push(gameManager.remotePlayers[player].pacman);

        const longest_time = Math.max(...allPacman.map(p => p.powerupExpiresAt != null && p.isPoweredUp ? (p.powerupExpiresAt - performance.now()) : -1 ));

        const min = 0;
        const max = 3000;

        if (longest_time > max || longest_time < min) return false;

        const flashInterval = 150 + (150 * (longest_time / max));
        return Math.floor(longest_time / flashInterval) % 2 === 0;
    }

    public drawPellets(pellets: Array<Pellet>, deltaTime: number, shrink: boolean = false) {
        // draw the pellets from the pellet data
        for (let pellet of pellets) {
            if (pellet.local_state == PELLET_STATES.EAT_PENDING) continue;
            
            ctx.fillStyle = ENVIRONMENT_COLORS.PELLET;
            ctx.strokeStyle = ENVIRONMENT_COLORS.PELLET

            let size = Math.max(2.5 * (gameManager.tileSize / 40), 1.25);
            
            // todo: line animation thing instead?
            if (!this.pelletShrinkAnimation.isDone()) {
                size *= (shrink ? 1 - this.pelletShrinkAnimation.get_progress() : this.pelletShrinkAnimation.get_progress());
            }
            
            if (pellet.type == PELLET_TYPES.POWER) {
                size *= 2;

                if (this.powerPelletFlash.get_progress() < 0.5) ctx.fillStyle = ENVIRONMENT_COLORS.DARK_PELLET;
            } else if (pellet.type == PELLET_TYPES.FOOD) {
                size *= 3;
            }

            ctx.beginPath();

            if (pellet.type == PELLET_TYPES.FOOD) {
                ctx.moveTo(pellet.x, pellet.y+size);
                ctx.lineTo(pellet.x+size, pellet.y);
                ctx.lineTo(pellet.x-size, pellet.y);
                ctx.lineTo(pellet.x, pellet.y+size);
            } else {
                ctx.arc(pellet.x, pellet.y, size, 0, 2*Math.PI);
            }
            
            if (pellet.type != PELLET_TYPES.FOOD) ctx.fill();
            else ctx.stroke();
        }
    }

    /**
     * Draw the board onto the canvas
     * @param board The gameboard to draw onto. Leave null for the current board.
     */
    public drawBoard(deltaTime: number, board: GameBoard|null = null) {
        if (board == null) board = gameManager.currentBoard;

        this.pelletShrinkAnimation.step_frame(deltaTime);
        this.powerPelletFlash.step_frame(deltaTime);

        ctx.shadowBlur = 10;
        ctx.shadowColor = ENVIRONMENT_COLORS.WALL;

        // draw the walls from the block data
        for (let i = 0; i < board.blockPositions.length; i++) {
            let blockData = board.blockPositions[i];

            ctx.strokeStyle = ENVIRONMENT_COLORS.WALL;
            ctx.beginPath();
            ctx.roundRect(blockData[0], blockData[1], blockData[2], blockData[3], 5 * (gameManager.tileSize / 40));
            ctx.stroke();
        };

        // for (let i = 0; i < board.drawLines.length; i++) {
        //     let lineData = board.drawLines[i];

        //     ctx.strokeStyle = ENVIRONMENT_COLORS.WALL;
        //     ctx.beginPath();
        //     ctx.moveTo(lineData[0], lineData[1]);
        //     ctx.lineTo(lineData[2], lineData[3]);
        //     ctx.stroke();
        // }

        ctx.shadowBlur = 0;
        ctx.shadowColor = ENVIRONMENT_COLORS.WALL;

        // if (!this.pelletShrinkAnimation.isDone()) this.drawPellets(this.oldPellets, deltaTime, true);
        this.drawPellets(board.pellets, deltaTime, false);

        if (gameManager.debug.intersectionPoints) {
            // draw path intersections
            for (let i = 0; i < board.pathIntersections.length; i++) {
                let intersectionData = board.pathIntersections[i];
                
                ctx.strokeStyle = "red";
                ctx.beginPath();
                ctx.arc(intersectionData.x, intersectionData.y, 10, 0, 2*Math.PI);
                ctx.stroke();
            }
        }
    }

    public drawDeadPacman(x: number, y: number, radius: number, frame: number, frightened: boolean = false) {
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
        ctx.moveTo(x, y);
        ctx.arc(x, y, radius, Math.PI * -0.5 + rad, Math.PI * 1.5 - rad, false);
        ctx.lineTo(x, y);

        if (!frightened) {
            ctx.fill();
            return;
        }

        const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);    
        gradient.addColorStop(0, ENTITY_STATE_COLORS.FRIGHTENED_BRIGHT);
        gradient.addColorStop(1,  ENTITY_STATE_COLORS.FRIGHTENED_DARK);
        ctx.fillStyle = gradient;
        
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    /**
     * Draw a pacman given many arguments
     * @param x The x position that is the center of the pacman
     * @param y The y position that is the center of the pacman
     * @param radius The radius of the pacman
     * @param frame The current frame of the mouth animation of the pacman
     * @param direction The facing direction of the pacman
     */
    public drawPacman(x: number, y: number, radius: number, frame: number, direction: Direction = directions.UP, frightened: boolean = false) {
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
        ctx.moveTo(x, y);
        ctx.arc(x, y, radius, (radiusDifference * Math.PI) + arcOffset, ((2 - radiusDifference) * Math.PI) + arcOffset, false);
        ctx.lineTo(x, y);
        
        if (!frightened) {
            ctx.fill();
            return;
        }

        const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);    
        gradient.addColorStop(0, ENTITY_STATE_COLORS.FRIGHTENED_BRIGHT);
        gradient.addColorStop(1,  ENTITY_STATE_COLORS.FRIGHTENED_DARK);
        ctx.fillStyle = gradient;

        if (this.shouldDoEntityFlash()) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
        }
        
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    /**
     * Unfinished. Draws a ghost given many arguments.
     * @param x The x position of the ghost
     * @param y The y position of the ghost
     * @param direction The direction that the ghost is facing
     */
    public drawGhost(x: number, y: number, direction: Direction|null) {
        if (this.shouldDoEntityFlash()) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
        }

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