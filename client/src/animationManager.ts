class AnimationManager {
    animations: { [Key: string]: GameAnimation };
    
    constructor() {
        this.animations = {};
    }
}

class GameAnimation {
    totalFrames: number;
    currentFrame: number;
    frameStep: number;
    discrete: boolean;
    looping: boolean;
    active: boolean;
    meta: any;

    constructor(totalFrames: number, isDiscrete: boolean, frameStep: number = 1, looping: boolean = true) {
        this.totalFrames = totalFrames - 1; // 60 turns into 59 bc current_frame starts at 0
        this.discrete = isDiscrete;
        this.frameStep = frameStep;
        this.currentFrame = 0;
        this.looping = looping;

        this.meta = {};

        this.active = false;
    }

    public setActive(active: boolean) {
        this.active = active;
    }

    public isActive() {
        return this.active;
    }

    public isDone() {
        return (!this.active) || ((!this.looping) && this.currentFrame == this.totalFrames);
    }

    public reset() {
        this.currentFrame = 0;
    }

    public step_frame(deltaTime: number) {
        this.currentFrame = (this.currentFrame + (this.frameStep * deltaTime));
        if (this.looping) this.currentFrame %= this.totalFrames;
        else this.currentFrame = Math.min(this.currentFrame, this.totalFrames);
    }

    public get_frame() {
        if (this.discrete) {
            return Math.round(this.currentFrame + 1);
        }

        return this.currentFrame + 1;
    }


}