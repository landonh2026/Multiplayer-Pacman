enum GHOST_PHASES { CHASE, SCATTER, FRIGHTENED };


/**
 * Represents a ghost
 */
class Ghost {
    x: number;
    y: number;
    movementSpeed: number;
    facingDirection: Direction|null;
    path: Path|null;
    color: string;
    id: string;
    eat_pending: boolean;
    eaten: boolean;
    phase: GHOST_PHASES;
    
    constructor(x: number, y: number, id: string, color: string, add_to_list: boolean = true) {
        this.x = x;
        this.y = y;
        this.movementSpeed = 5;
        this.facingDirection = null;
        this.color = color; // TODO: make this an object
        this.id = id;
        this.eat_pending = false;
        this.eaten = false;
        this.phase = GHOST_PHASES.CHASE;

        this.path = null;

        if (add_to_list) {
            gameManager.ghosts[id] = this;
        }
    }

    public getMovementSpeed() {
        if (this.eaten) return this.movementSpeed * 2;
        if (this.phase == GHOST_PHASES.FRIGHTENED) return this.movementSpeed * 0.75;
        return this.movementSpeed;
    }

    /**
     * Draw this ghost
     */
    public draw() {
        let color = this.color;

        if (this.phase == GHOST_PHASES.FRIGHTENED) color = ENTITY_STATE_COLORS.FRIGHTENED;

        gameManager.drawManager.drawGhost(this.x, this.y, color, !this.eaten, this.facingDirection);
    }

    public drawGlow() {
        // const size = 20 * 4;

        // console.log(this.color);

        // gameManager.drawManager.setObjectGlowGradient(
        //     this.x,
        //     this.y,
        //     size,
        //     this.eaten ? "#FFFFFF" : this.color
        //     // this.color
        // );

        // // specify max distances for some efficiency
        // gameManager.drawManager.drawGlowOnBoard(this.x, this.y, size);
    }

    /**
     * Step the movement of the ghost
     * @param deltaTime 
     * @returns
     */
    public stepMovement(deltaTime: number) {
        if (this.facingDirection == null) return;

        this.x += this.facingDirection.getDeltas().dx * this.getMovementSpeed() * deltaTime;
        this.y += this.facingDirection.getDeltas().dy * this.getMovementSpeed() * deltaTime;
    }

    public eat() {
        if (this.eat_pending) return;
        this.eat_pending = true;
        gameManager.connectionManager.eatGhost(this.id);

        const offset = 16;
        const hVel = 4;
        const vVel = 4;

        gameManager.particleManager.particles.push(new FallingParticle(this.x + offset, this.y + offset, +hVel + Math.random()*5-1, +vVel + Math.random()*5-1));
        gameManager.particleManager.particles.push(new FallingParticle(this.x + offset, this.y - offset, +hVel + Math.random()*5-1, -vVel + Math.random()*5-1));
        gameManager.particleManager.particles.push(new FallingParticle(this.x - offset, this.y + offset, -hVel + Math.random()*5-1, +vVel + Math.random()*5-1));
        gameManager.particleManager.particles.push(new FallingParticle(this.x - offset, this.y - offset, -hVel + Math.random()*5-1, -vVel + Math.random()*5-1));
    }
}