/**
 * A currently blank class that can be used for debugging purposes
 */
class Debugger {
    ghost_pos: [number, number, Direction]
    ghost_movement_speed: number;
    ghost_debug_path: Path|null;

    constructor() {
        this.ghost_pos = [100, 100, directions.UP];
        this.ghost_movement_speed = 4;
        this.ghost_debug_path = null;
    }

    public onFrameUpdate(deltaTime: number) {
        ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#FFFFFF";
        ctx.arc(this.ghost_pos[0], this.ghost_pos[1], 5, 0, 2*Math.PI);
        ctx.fill();

        this.ghost_pos[0] += this.ghost_pos[2].getDeltas().dx * this.ghost_movement_speed * deltaTime;
        this.ghost_pos[1] += this.ghost_pos[2].getDeltas().dy * this.ghost_movement_speed * deltaTime;

        if (this.ghost_debug_path) {
            this.ghost_debug_path.draw();
        }
    }
}