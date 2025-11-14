class ParticleManager {
    particles: Particle[];

    constructor() {
        this.particles = [];
    }
    
    public stepAndDraw(deltaTime: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // check if we should remove this particle
            if(particle.step(deltaTime)) {
                this.particles.splice(i, 1);
            }

            particle.draw();
        }
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
    public step(deltaTime: number): boolean {
        this.lastX = this.x;
        this.lastY = this.y;

        console.log(deltaTime);
        this.x += this.dx * deltaTime * 2.5;
        this.y += this.dy * deltaTime * 2.5;

        const decay = Math.pow(0.995, deltaTime*2.5);
        this.dx *= decay;
        this.dy *= decay;

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

    public step(deltaTime: number) {
        this.dy += 0.75 * deltaTime; // gravity
        super.step(deltaTime);

        if (this.x > gameManager.tileSize * 17) {
            this.x = gameManager.tileSize * 17;
            this.dx *= -1;
        }

        if (this.x < 0) {
            this.x = 0;
            this.dx *= -1;
        }

        if (this.y > gameManager.tileSize * 19) {
            if (this.bounced) {
                return true;
            }
            
            this.dy *= -0.3;
            this.dx *= 0.7;
            this.y = gameManager.tileSize * 19;

            this.bounced = true;
        }

        return false;
    }
}