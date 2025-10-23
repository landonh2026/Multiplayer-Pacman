/**
 * Handles drawing various objects onto the canvas
 */
class DrawManager {
    powerPelletFlash: GameAnimation;
    pelletShrinkAnimation: GameAnimation;
    oldPellets: Array<Pellet>;
    lightingCanvas: HTMLCanvasElement;
    lctx: CanvasRenderingContext2D;

    constructor() {
        this.powerPelletFlash = new GameAnimation(24, true, 1, true);
        this.pelletShrinkAnimation = new GameAnimation(12, false, 1, false);
        this.oldPellets = [];

        this.lightingCanvas = document.createElement("canvas");
        this.lctx = this.lightingCanvas.getContext("2d") as CanvasRenderingContext2D;
    }

    public newFrame() {

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

        for (let i = 0; i < board.drawLines.length; i++) {
            let lineData = board.drawLines[i];

            ctx.strokeStyle = ENVIRONMENT_COLORS.WALL;
            // ctx.beginPath();
            // ctx.moveTo(lineData[0], lineData[1]);
            // ctx.lineTo(lineData[2], lineData[3]);
            // ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // if (!this.pelletShrinkAnimation.isDone()) this.drawPellets(this.oldPellets, deltaTime, true);
        this.drawPellets(board.pellets, deltaTime, false);

        if (gameManager.debug.intersectionPoints) {
            // draw path intersections
            for (let i = 0; i < board.pathIntersections.length; i++) {
                let intersectionData = board.pathIntersections[i];
                
                ctx.strokeStyle = intersectionData.type == PATH_INTERSECTION_TYPES.NORMAL ? "red" : "green";
                ctx.beginPath();
                ctx.arc(intersectionData.x, intersectionData.y, 10, 0, 2*Math.PI);
                ctx.stroke();
            }
        }
    }

    public drawDeadPacman(x: number, y: number, radius: number, frame: number, frightened: boolean = false) {
        // draw dead pacman particles
        if (Math.round(frame) == 35) {
            const offset = 16;
            const hVel = 4;
            const vVel = 4;

            // TODO: make it so we only send out 1 set of particles
            gameManager.particleManager.particles.push(new FallingParticle(x + offset, y + offset, +hVel + Math.random()*2-1, +vVel + Math.random()*2-1));
            gameManager.particleManager.particles.push(new FallingParticle(x + offset, y - offset, +hVel + Math.random()*2-1, -vVel + Math.random()*2-1));
            gameManager.particleManager.particles.push(new FallingParticle(x - offset, y + offset, -hVel + Math.random()*2-1, +vVel + Math.random()*2-1));
            gameManager.particleManager.particles.push(new FallingParticle(x - offset, y - offset, -hVel + Math.random()*2-1, -vVel + Math.random()*2-1));
            
            return;
        }

        if (frame > 35) {
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
     * Draws the board's grid again. Assumes the fillstyle is already set to the pacman's glow gradient.
     */
    public drawGlowOnBoard(x: number, y: number, distance: number, board: GameBoard|null = null) {
        if (board == null) board = gameManager.currentBoard;
        
        distance = gameManager.tileSize * 10;

        const allowed = (bx: number, by: number) => {
            return Math.abs(bx - x) + Math.abs(by - y) < distance;
        }

        for (let i = 0; i < board.blockPositions.length; i++) {
            const block = board.blockPositions[i];

            let shouldDraw = allowed(block[0], block[1]) ||
                allowed(block[0], block[1]+block[3]) ||
                allowed(block[0]+block[2], block[1]) ||
                allowed(block[0]+block[2], block[1]+block[3]);

            if (!shouldDraw) {
                continue;
            }

            // ctx.fillStyle = ENVIRONMENT_COLORS.BACKGROUND;
            ctx.beginPath();
            ctx.fillRect(block[0], block[1], block[2], block[3]);
        }
    }

    public getObjectGlowGradient(x: number, y: number, size: number, color: string, opacity: string = "B0") {
        if (this.shouldDoEntityFlash()) {
            color = "#FFFFFF";
        }

        // console.log(color);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, color + opacity);
        gradient.addColorStop(1, color + "00");
        ctx.fillStyle = gradient;

        // ctx.beginPath();
        // ctx.arc(x, y, size, 0, Math.PI * 2);
        // ctx.fill();
    }

    public addToGlowWallLighting(x: number, y: number, distance: number, board: GameBoard|null = null) {
        // this.lctx
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

        const doFlash = this.shouldDoEntityFlash();

        if (doFlash) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
        }
        
        if (!frightened) {
            ctx.fill();
            return;
        }

        if (!doFlash) {
            const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);    
            gradient.addColorStop(0, ENTITY_STATE_COLORS.FRIGHTENED_BRIGHT);
            gradient.addColorStop(1,  ENTITY_STATE_COLORS.FRIGHTENED_DARK);
            ctx.fillStyle = gradient;
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

    public drawParticle(particle: Particle) {
        const beforeLineWidth = ctx.lineWidth;
        ctx.fillStyle = particle.color;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(particle.x - particle.radius/2, particle.y - particle.radius/2, particle.radius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.lastX, particle.lastY);
        ctx.stroke();
        ctx.closePath();

        ctx.lineWidth = beforeLineWidth;
    }
}