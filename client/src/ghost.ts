/**
 * Represents a ghost
 */
class Ghost {
    x: number;
    y: number;
    movementSpeed: number;
    facingDirection: Direction|null;
    path: Path|null;
    
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.movementSpeed = 4;
        this.facingDirection = null;

        this.path = null;
    }

    /**
     * Draw this ghost
     */
    public draw() {
        gameManager.drawManager.drawGhost(this.x, this.y, this.facingDirection);
    }

    /**
     * Step the movement of the ghost
     * @param deltaTime 
     * @returns 
     */
    public stepMovement(deltaTime: number) {
        if (this.facingDirection == null) return;

        this.x += this.facingDirection.getDeltas().dx * this.movementSpeed * deltaTime;
        this.y += this.facingDirection.getDeltas().dy * this.movementSpeed * deltaTime;
    }
}