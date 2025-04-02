/**
 * An animation manager. Currently only holds the animations
 */
class AnimationManager {
    animations: { [Key: string]: GameAnimation };
    
    constructor() {
        this.animations = {};
    }
}

/**
 * A game animation. Is used to keep track of an animations current frame, if it loops, if it is active, and more
 */
class GameAnimation {
    /** The total number of frames in this animation */
    totalFrames: number;

    /** The current frame of this animation */
    currentFrame: number;

    /** The number of frames to step when stepping the animation */
    frameStep: number;

    /** Is this animation discrete (subframes when using deltatime?) */
    discrete: boolean;

    /** Does this animation loop? */
    looping: boolean;

    /** Is this animation active? */
    active: boolean;

    /** Any meta data for this animation */
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

    /**
     * Step this animation by deltaTime
     * @param deltaTime 
     */
    public step_frame(deltaTime: number) {
        this.currentFrame = (this.currentFrame + (this.frameStep * deltaTime));
        if (this.looping) this.currentFrame %= this.totalFrames;
        else this.currentFrame = Math.min(this.currentFrame, this.totalFrames);
    }

    /**
     * Get the current frame of this animation
     * @returns The current frame. Rounded if this animation is discrete
     */
    public get_frame() {
        if (this.discrete) {
            return Math.round(this.currentFrame + 1);
        }

        return this.currentFrame + 1;
    }

    public get_progress() {
        return this.currentFrame / this.totalFrames;
    }
}