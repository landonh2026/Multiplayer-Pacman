class EffectsManager {
    effects: Effect[];

    constructor() {
        this.effects = [];
    }

    public stepAndDraw() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];

            // check if we should remove this particle
            if (effect.step()) {
                this.effects.splice(i, 1);
            }

            effect.draw();
        }
    }
}

class Effect {
    constructor() {}

    // TODO: add deltatime
    /**
     * Steps the effect
     * @returns Is the effect done?
     */
    public step(): boolean {
        throw Error("Not Implemented");
    }

    /**
     * Draw the effect
     */
    public draw() {
        throw Error("Not Implemented");
    }
}

class CircleEffect extends Effect {
    public static diagonalSize: number;
    
    x: number;
    y: number;
    radius: number;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
        this.radius = 0;
        CircleEffect.diagonalSize = Math.sqrt(canvas.clientWidth * canvas.clientWidth + canvas.clientHeight * canvas.clientHeight);
    }

    public step(): boolean {
        this.radius += 20;

        if (this.radius > CircleEffect.diagonalSize) {
            return true;
        }

        return false;
    }

    public draw() {
        ctx.save();
        ctx.clip(gameManager.drawManager.wallClipPath);

        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.strokeStyle = "#FFFFFF" + "60";
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = 1;

        ctx.restore();
    }
}
