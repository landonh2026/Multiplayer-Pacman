/**
 * Handles the info board that is above the canvas
 */
class InfoBoard {
    private fpsDisplay: HTMLElement;
    private playerCountDisplay: HTMLElement;
    private scoreDisplay: HTMLElement;
    
    private score: number;

    private last_fps_update: number;
    private fps_update_time: number;

    constructor() {
        this.fpsDisplay = document.getElementById("fps") as HTMLElement;
        this.playerCountDisplay = document.getElementById("total-players") as HTMLElement;
        this.scoreDisplay = document.getElementById("score") as HTMLElement;

        this.score = 0;
        this.last_fps_update = 0;
        this.fps_update_time = performance.now();
    }

    public updateFPS() {
        const frame_skips = 5;

        this.last_fps_update++;
        if (this.last_fps_update < frame_skips) return;

        const now = performance.now();
        const ms_taken = (now-this.fps_update_time);
        const fps = 1/(ms_taken/1000/frame_skips);
        
        this.last_fps_update = 0;
        this.fps_update_time = now;
        
        this.setFPS(fps);
    }

    /**
     * Set the FPS shown on the infoboard to the given FPS
     * @param fps The fps to show
     */
    public setFPS(fps: number) {
        this.fpsDisplay.innerText = Math.round(fps).toString();
    }

    /**
     * Set the player count on the infoboard to the given player count
     * @param playerCount The player count to show
     */
    public setPlayerCount(playerCount: number) {
        this.playerCountDisplay.innerText = playerCount.toString();
    }

    public setScore(newScore: number) {
        this.score = newScore;
        this.scoreDisplay.innerText = newScore.toString();
    }
}