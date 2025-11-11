enum GAME_STATES {
    CONNECTING,
    DISCONNECTED,
    FINDING_ROOM,
    PREGAME,
    IN_GAME,
    AFTER_GAME,
}

/**
 * The primary game manager that manages the Pacman game
 */
class GameManager {
    performanceMode: boolean;

    debug: { [identifier: string]: boolean };

    /** A dictionary of remote players with the session being the key and the value being the RemotePlayer object */
    remotePlayers: { [session: string]: RemotePlayer };

    /** A list of ghosts that are current active in the game */
    ghosts: { [id: string]: Ghost };

    /** The current game state */
    currentState: GAME_STATES;

    lastFrame: number;
    target_fps: number;
    ms_per_frame: number;

    /** The tile size in terms of pixels */
    tileSize: number;

    /** The time since the game has started */
    serverTime: number;

    /** The currently active game board */
    currentBoard: GameBoard;

    /** The local pacman */
    localPacman: Pacman;

    // various managers that handle events
    inputManager: InputManager;
    drawManager: DrawManager;
    eventHandler: EventHandler;
    infoBoard: InfoBoard;
    connectionManager: ConnectionManager;
    particleManager: ParticleManager;
    effectManager: EffectsManager;
    debugger: Debugger;

    /** The local session ID */
    uuid: string | null;

    static GAME_STATES = GAME_STATES;

    constructor() {
        this.debug = {
            intersectionPoints: false,
            pacmanWallCollision: false,
            ghostPath: false,
            invulnerable: true,
        };

        this.tileSize = 40;
        this.serverTime = -1;

        this.remotePlayers = {};
        this.ghosts = {};
        this.performanceMode = false;

        this.lastFrame = 0;
        this.target_fps = 24;
        this.ms_per_frame = (1 / this.target_fps) * 1000;
        this.uuid = null;

        this.currentState = GameManager.GAME_STATES.DISCONNECTED;
        this.currentBoard = new GameBoard(
            [
                [0, 12, 12, 1],
                [0, 0, 12, 1],
                [0, 1, 1, 11],
                [11, 1, 1, 11],
            ],
            [],
            [],
            this.tileSize
        );

        this.localPacman = new Pacman(
            this.tileSize * 1.5,
            this.tileSize * 2.5,
            PACMAN_COLORS.YELLOW,
            directions.DOWN,
            directions.DOWN,
            false,
            0,
            true,
            this.tileSize
        );
        this.inputManager = new InputManager();
        this.drawManager = new DrawManager();
        this.eventHandler = new EventHandler();
        this.infoBoard = new InfoBoard();
        this.particleManager = new ParticleManager();
        this.effectManager = new EffectsManager();
        this.debugger = new Debugger();

        this.connectionManager = new ConnectionManager();
        // this.connectionManager = new ConnectionManager("ws:/2.tcp.us-cal-1.ngrok.io:10734/gamesocket");

        this.drawManager.newBoard(this);
    }

    /**
     * Begin the game
     */
    public beginGame() {
        this.nextFrame();
    }

    /**
     * Handle drawing the next frame
     */
    private nextFrame() {
        const now = performance.now();
        const ms_taken = now - this.lastFrame;
        this.infoBoard.updateFPS();

        let deltaTime = ms_taken / this.ms_per_frame;
        if (ms_taken > this.ms_per_frame * 3) {
            console.warn("Allowing Slowdown");
            deltaTime = 1;
        }

        this.lastFrame = now;
        this.draw(deltaTime);

        requestAnimationFrame(this.nextFrame.bind(this));
    }

    /**
     * Draw the next frame given the time difference from the target fps
     * @param deltaTime
     */
    private draw(deltaTime: number) {
        this.drawManager.newFrame(deltaTime);

        this.localPacman.drawGlow();

        // draw the glowing effect for each player before the board
        for (let session in this.remotePlayers) {
            const pacman =
                this.remotePlayers[session as keyof typeof this.remotePlayers]
                    .pacman;

            pacman.drawGlow();
        }

        // draw ghost glowing effect
        for (let id of Object.keys(this.ghosts)) {
            const ghost = this.ghosts[id];

            ghost.drawGlow();
        }

        this.drawManager.drawBoard(deltaTime);

        // step the movement and draw each remote player
        for (let session in this.remotePlayers) {
            let remotePlayer =
                this.remotePlayers[session as keyof typeof this.remotePlayers];

            remotePlayer.pacman.stepMovement(deltaTime);
            remotePlayer.pacman.draw(deltaTime);
        }

        // step the ghost movement and draw each ghost
        for (let id of Object.keys(this.ghosts)) {
            const ghost = this.ghosts[id];

            ghost.stepMovement(deltaTime);
            ghost.draw();

            if (this.debug.ghostPath) ghost.path?.draw();
        }

        // step and draw the local pacman
        this.localPacman.stepMovement(deltaTime);
        this.localPacman.draw(deltaTime);

        // TOOD: actually use the deltatime in these step functions
        this.particleManager.stepAndDraw(deltaTime);
        this.effectManager.stepAndDraw(deltaTime);

        // update the debugger
        this.debugger.onFrameUpdate(deltaTime);
    }

    public newBoard() {
        this.drawManager.newBoard(this);
    }
}
