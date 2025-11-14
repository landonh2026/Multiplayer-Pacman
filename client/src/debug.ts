class Debugger {
    constructor() {
        document.addEventListener("click", this.mouseClick);
    }

    public mouseClick(e: MouseEvent) {
        // console.log(e);

        // gameManager.effectManager.effects.push(new CircleEffect(e.layerX, e.layerY));
        // const p = new FallingParticle(e.layerX, e.layerY, Math.random() * 20 - 10, -10);
        // gameManager.particleManager.particles.push(p);

        // gameManager.effectManager.effects.push(new ScreenFreeze(100));
    }

    public onFrameUpdate(deltaTime: number) {
        
    }
}