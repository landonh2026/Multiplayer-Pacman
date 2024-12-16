class EventHandler {
    typeHandlers: {[key: string]: CallableFunction};

    constructor() {
        this.typeHandlers = {
            "player-join": this.playerJoin.bind(this),
            "player-leave": this.playerLeave.bind(this),
            "position": this.positionUpdate.bind(this),
            "local-player-info": this.localInfo.bind(this),
            "board-state":this.boardState.bind(this),
            "eat-pellet": this.eatPellet.bind(this),
            "pellet-reject": this.pelletRejected.bind(this),
            "score-update": this.scoreUpdate.bind(this),
            "server-time-reset": this.resetServerTime.bind(this),
            "trigger-bump": this.triggerBump.bind(this)
        }
    }

    public triggerBump(parsedData: any) {
        gameManager.localPacman.triggerBump(Direction.fromEnum(parsedData.data.from) as Direction);
    }

    public resetServerTime(parsedData: any) {
        gameManager.serverTime = performance.now();
    }

    public scoreUpdate(parsedData: any) {
        gameManager.infoBoard.score = parsedData.data.score;
        gameManager.infoBoard.addScore(0);
    }

    public pelletRejected(parsedData: any) {
        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pellet = gameManager.currentBoard.pellets[i];

            if (pellet[2] == parsedData.data.pelletID) {
                pellet[3] = PELLET_STATES.NONE;
            }
        }
    }

    public eatPellet(parsedData: any) {
        for (let key in parsedData.data.scores) {
            const value = parsedData.data.scores[key];

            if (key == gameManager.uuid) {
                gameManager.infoBoard.score = value;
                gameManager.infoBoard.refreshScore();
                continue;
            }

            // console.log(key, value);

            gameManager.remotePlayers[key].pacman.score = value;
        }

        gameManager.infoBoard.addScore(0);

        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pellet = gameManager.currentBoard.pellets[i];

            if (pellet[2] == parsedData.data.pelletID) {
                gameManager.currentBoard.pellets.splice(i, 1);
                break;
            }
        }
    }

    public boardState(parsedData: any) {
        gameManager.currentBoard = new GameBoard(parsedData.data.board, parsedData.data.pellets, parsedData.data.pathIntersections);
    }

    public localInfo(parsedData: any) {
        gameManager.localPacman.color = PACMAN_COLORS[parsedData.data.color as keyof typeof PACMAN_COLORS];

        gameManager.localPacman.x = parsedData.data.loc.x;
        gameManager.localPacman.y = parsedData.data.loc.y;
        gameManager.localPacman.facingDirection = Direction.fromEnum(parsedData.data.loc.facingDirection) as Direction;
        gameManager.localPacman.queuedDirection = Direction.fromEnum(parsedData.data.loc.queuedDirection) as Direction;
        gameManager.localPacman.shouldMove = parsedData.data.loc.shouldMove;
        gameManager.localPacman.movementSpeed = parsedData.data.moveSpeed;

        gameManager.uuid = parsedData.data.session;
    }

    public playerJoin(parsedData: any) {
        document.getElementById("total-players")

        gameManager.remotePlayers[parsedData.data.session] = new RemotePlayer(
            parsedData.data.session,
            new Pacman(
                60,
                100,
                PACMAN_COLORS[parsedData.data.color as keyof typeof PACMAN_COLORS],
                directions.DOWN,
                directions.DOWN,
                false,
                0,
                false
            )
        );

        gameManager.infoBoard.setPlayerCount(Object.keys(gameManager.remotePlayers).length + 1);

        if (parsedData.data["last-location"] != undefined)
            this.positionUpdate(parsedData.data["last-location"]);
    }

    public playerLeave(parsedData: any) {
        delete gameManager.remotePlayers[parsedData.data.session];
        gameManager.infoBoard.setPlayerCount(Object.keys(gameManager.remotePlayers).length + 1);
    }

    public positionUpdate(parsedData: any) {
        const workingPacman = gameManager.remotePlayers[parsedData["from-session"] as keyof typeof gameManager.remotePlayers].pacman;
        workingPacman.x = parsedData.data.x;
        workingPacman.y = parsedData.data.y;
        workingPacman.facingDirection = Direction.fromEnum(parsedData.data.facingDirection) as Direction;
        workingPacman.queuedDirection = Direction.fromEnum(parsedData.data.queuedDirection) as Direction;
        workingPacman.shouldMove = parsedData.data.shouldMove;
    }
}