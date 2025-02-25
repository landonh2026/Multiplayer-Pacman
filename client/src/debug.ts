/**
 * A currently blank class that can be used for debugging purposes
 */
class Debugger {
    ghost_pos: [number, number]

    constructor() {
        this.ghost_pos = [100, 100];
    }

    public onFrameUpdate() {
        ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#FFFFFF";
        ctx.arc(this.ghost_pos[0], this.ghost_pos[1], 5, 0, 2*Math.PI);
        ctx.fill();
    }
}