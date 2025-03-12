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
    
    constructor(x: number, y: number, id: string, color: string, add_to_list: boolean = true) {
        this.x = x;
        this.y = y;
        this.movementSpeed = 4;
        this.facingDirection = null;
        this.color = color; // TODO: make this an object

        this.path = null;

        if (add_to_list) {
            gameManager.ghosts[id] = this;
        }
    }

    /**
     * Draw this ghost
     */
    public draw() {
        ctx.fillStyle = this.color;
        // ctx.strokeStyle = "rgb(255, 0, 0)";
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