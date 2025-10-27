class ParticleManager {
    particles: Particle[];

    constructor() {
        this.particles = [];
    }
}

class Particle {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;

    lastX: number;
    lastY: number;

    delete_off_screen: boolean;
    color: string;
    
    constructor(x: number, y: number, dx: number = 0, dy: number = 0) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.radius = 0;

        this.lastX = x;
        this.lastY = y;

        this.delete_off_screen = true;
        this.color = "white";
    }


    // TODO: use deltatime
    public step(): boolean {
        this.lastX = this.x;
        this.lastY = this.y;

        this.x += this.dx;
        this.y += this.dy;

        this.dx *= 0.995;
        this.dy *= 0.995;

        return this.x < 0 || this.x > canvas.clientWidth || this.y < 0 || this.y > canvas.clientHeight;
    }

    public draw() {
        gameManager.drawManager.drawParticle(this);
    }
}

class FallingParticle extends Particle {
    bounced: boolean;

    constructor(x: number, y: number, dx: number = 0, dy: number = 0) {
        super(x, y, dx, dy);
        this.bounced = false;
    }

    public step() {
        this.dy += 0.3; // gravity
        super.step();

        if (this.x > canvas.clientWidth) {
            this.x = canvas.clientWidth;
            this.dx *= -1;
        }

        if (this.x < 0) {
            this.x = 0;
            this.dx *= -1;
        }

        if (this.y > canvas.clientHeight) {
            if (this.bounced) {
                return true;
            }
            
            this.dy *= -0.3;
            this.dx *= 0.7;
            this.y = canvas.clientHeight;

            this.bounced = true;
        }

        return false;
    }
}