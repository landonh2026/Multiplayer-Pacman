enum GAME_STATES { CONNECTING, DISCONNECTED, FINDING_ROOM, PREGAME, IN_GAME, AFTER_GAME }

class GameManager {
    remotePlayers: {[item: string]: RemotePlayer};
    performanceMode: boolean;
    ghosts: Ghost[];

    currentState: GAME_STATES;

    lastFrame: number;
    target_fps: number;
    ms_per_frame: number;

    tileSize: number;
    serverTime: number;

    currentBoard: GameBoard;
    localPacman: Pacman;

    inputManager: InputManager;
    drawManager: DrawManager;
    eventHandler: EventHandler;
    infoBoard: InfoBoard;
    connectionManager: ConnectionManager;
    debugger: Debugger;

    uuid: string|null;

    static GAME_STATES = GAME_STATES;

    constructor(debug: boolean = false) {
        this.tileSize = 40;
        this.serverTime = -1;

        this.remotePlayers = {};
        this.ghosts = [new Ghost(60, 140)];
        this.performanceMode = false;

        this.lastFrame = 0;
        this.target_fps = 24;
        this.ms_per_frame = 1/this.target_fps*1000;
        this.uuid = null;

        this.currentState = GameManager.GAME_STATES.DISCONNECTED;
        this.currentBoard = new GameBoard([[0, 12, 12, 1], [0, 0, 12, 1], [0, 1, 1, 11], [11, 1, 1, 11]], [], [], this.tileSize);

        this.localPacman = new Pacman(this.tileSize*1.5, this.tileSize*2.5, PACMAN_COLORS.YELLOW, directions.DOWN, directions.DOWN, false, 0, true, this.tileSize);
        this.inputManager = new InputManager();
        this.drawManager = new DrawManager(debug);
        this.eventHandler = new EventHandler();
        this.infoBoard = new InfoBoard();
        this.debugger = new Debugger(this.currentBoard);
        
        this.connectionManager = new ConnectionManager();
        // this.connectionManager = new ConnectionManager("ws://0.tcp.us-cal-1.ngrok.io:17022/gamesocket");
    }

    public beginGame() {
        this.nextFrame();
    }

    private nextFrame() {
        const now = performance.now();
        const ms_taken = (now-this.lastFrame);
        const fps = 1/(ms_taken/1000);
        
        this.infoBoard.setFPS(fps);
        
        let deltaTime = ms_taken / this.ms_per_frame;
        if (ms_taken > this.ms_per_frame*3) {
            console.warn("Allowing Slowdown");
            deltaTime = 1;
        }
    
        this.lastFrame = now;
        this.draw(deltaTime);

        requestAnimationFrame(this.nextFrame.bind(this));
    }

    private draw(deltaTime: number) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawManager.drawBoard();
    
        for (let session in this.remotePlayers) {
            let remotePlayer = this.remotePlayers[session as keyof typeof this.remotePlayers];
            
            remotePlayer.pacman.stepMovement(deltaTime);
            remotePlayer.pacman.draw(deltaTime);
        }

        for (let ghost of this.ghosts) {
            ghost.stepMovement(deltaTime);
            ghost.draw();
        }
    
        this.localPacman.stepMovement(deltaTime);
        this.localPacman.draw(deltaTime);

        // DEBUG FUNCTION
        // this.debugger.onFrameUpdate();
    }
}
