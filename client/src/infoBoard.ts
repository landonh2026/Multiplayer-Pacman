class InfoBoard {
    fpsDisplay: HTMLElement;
    playerCountDisplay: HTMLElement;
    scoreDisplay: HTMLElement;
    
    score: number;

    constructor() {
        this.fpsDisplay = document.getElementById("fps") as HTMLElement;
        this.playerCountDisplay = document.getElementById("total-players") as HTMLElement;
        this.scoreDisplay = document.getElementById("score") as HTMLElement;

        this.score = 0;
    }

    public setFPS(fps: number) {
        this.fpsDisplay.innerText = Math.round(fps).toString();
    }

    public setPlayerCount(count: number) {
        this.playerCountDisplay.innerText = count.toString();
    }

    public addScore(score: number) {
        this.score += score;
        this.refreshScore();
    }

    public refreshScore() {
        this.scoreDisplay.innerText = this.score.toString();
    }
}