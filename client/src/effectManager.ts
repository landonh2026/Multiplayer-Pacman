class EffectsManager {
    effects: Effect[];

    constructor() {
        this.effects = [];
    }

    public stepAndDraw(deltaTime: number) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];

            // check if we should remove this particle
            if (effect.step(deltaTime)) {
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
    public step(deltaTime: number): boolean {
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
    public static screenDiagonalSize: number;
    
    x: number;
    y: number;
    radius: number;

    constructor(x: number, y: number) {
        super();
        this.x = x;
        this.y = y;
        this.radius = 0;
        CircleEffect.screenDiagonalSize = Math.sqrt(canvas.clientWidth * canvas.clientWidth + canvas.clientHeight * canvas.clientHeight);
    }

    public step(deltaTime: number): boolean {
        this.radius += 50 * deltaTime;

        if (this.radius > CircleEffect.screenDiagonalSize) {
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

class ScreenShake extends Effect {
    dx: number;
    dy: number;
    time: number;
    
    
    constructor(dx: number, dy: number, time: number) {
        super();

        this.dx = dx;
        this.dy = dy;
        this.time = time;
    }

    public step(deltaTime: number): boolean {
        if (this.time-- == 0) {
            gameManager.drawManager.drawOffset = [0, 0];
            return true;
        }

        gameManager.drawManager.drawOffset = [
            (Math.random() * this.dx * 2) - this.dx,
            (Math.random() * this.dy * 2) - this.dy
        ]
        return false;
    }

    public draw(): void {
        
    }
}