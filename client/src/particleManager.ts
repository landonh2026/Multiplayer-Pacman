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
    public step() {
        this.lastX = this.x;
        this.lastY = this.y;

        this.x += this.dx;
        this.y += this.dy;

        this.dx *= 0.995;
        this.dy *= 0.995;

        // TODO: IMPLEMENT SCREEN WIDTH AND HEIGHT
        let shouldDelete = (this.x < 0 && this.y < 0);
        // and actually use this
    }

    public draw() {
        gameManager.drawManager.drawParticle(this);
    }
}

class FallingParticle extends Particle {
    public step() {
        this.dy += 0.3; // gravity
        super.step();
    }
}