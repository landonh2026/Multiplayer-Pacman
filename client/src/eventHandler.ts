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
            "trigger-bump": this.handleBump.bind(this)
        }
    }

    /**
     * Handle two pacman bumping into each other
     * @param parsedData The parsed data from the server
     */
    public handleBump(parsedData: any) {
        // go through each player in the collision and bump them
        for (let i = 0; i < parsedData.data.collisions.length; i++) {
            let collision = parsedData.data.collisions[i];

            // find which pacman to bump
            let pacman: Pacman;
            if (gameManager.uuid == collision.session) pacman = gameManager.localPacman;
            else pacman = gameManager.remotePlayers[collision.session].pacman;

            // debug
            if (gameManager.uuid == collision.session) {
                console.log((Direction.fromEnum(collision.from) as Direction).asString, collision.x, collision.y);
            }

            // move the pacman to the collision
            pacman.x = collision.x;
            pacman.y = collision.y;

            // bump the pacman
            pacman.triggerBump(Direction.fromEnum(collision.from) as Direction);         
        }
    }

    /**
     * Reset the client's playing time
     * @param parsedData The parsed data from the server
     */
    public resetServerTime(parsedData: any) {
        gameManager.serverTime = performance.now();
    }

    /**
     * Update the local player's score
     * @param parsedData The parsed data from the server
     */
    public scoreUpdate(parsedData: any) {
        gameManager.infoBoard.score = parsedData.data.score;
        gameManager.infoBoard.refreshScore();
    }

    /**
     * Handle a pellet eat packet being rejected by the server
     * @param parsedData The parsed data from the server
     */
    public pelletRejected(parsedData: any) {
        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pellet = gameManager.currentBoard.pellets[i];

            if (pellet[2] == parsedData.data.pelletID) {
                pellet[3] = PELLET_STATES.NONE;
            }
        }
    }

    /**
     * Handle a pellet being eaten
     * @param parsedData The parsed data from the server
     */
    public eatPellet(parsedData: any) {
        // get the scores for each player
        for (let key in parsedData.data.scores) {
            const value = parsedData.data.scores[key];

            // if this is our local player, refresh the scoreboard
            if (key == gameManager.uuid) {
                gameManager.infoBoard.score = value;
                gameManager.infoBoard.refreshScore();
                continue;
            }

            gameManager.remotePlayers[key].pacman.score = value;
        }

        // go through every pellet and remove the one that matches this pellet ID
        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pellet = gameManager.currentBoard.pellets[i];

            if (pellet[2] == parsedData.data.pelletID) {
                gameManager.currentBoard.pellets.splice(i, 1);
                break;
            }
        }
    }

    /**
     * Update the board state using information from the server
     * @param parsedData The parsed data from the server
     */
    public boardState(parsedData: any) {
        gameManager.currentBoard = new GameBoard(parsedData.data.board, parsedData.data.pellets, parsedData.data.pathIntersections);
    }

    /**
     * Update the local pacman's location using information from the server
     * @param parsedData The parsed data from the server
     */
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

    /**
     * Handle a player joining the room
     * @param parsedData The parsed data from the server
     */
    public playerJoin(parsedData: any) {
        // make a new remote player
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

        // add 1 to the infoboard
        gameManager.infoBoard.setPlayerCount(Object.keys(gameManager.remotePlayers).length + 1);

        // update the pacman's location
        if (parsedData.data["last-location"] != undefined)
            this.positionUpdate(parsedData.data["last-location"]);
    }

    /**
     * Handle a player leaving the room
     * @param parsedData The parsed data from the server
     */
    public playerLeave(parsedData: any) {
        delete gameManager.remotePlayers[parsedData.data.session];
        gameManager.infoBoard.setPlayerCount(Object.keys(gameManager.remotePlayers).length + 1);
    }

    /**
     * Handle a position update for a remote pacman form the server
     * @param parsedData The parsed data from the server
     */
    public positionUpdate(parsedData: any) {
        const workingPacman = gameManager.remotePlayers[parsedData["from-session"] as keyof typeof gameManager.remotePlayers].pacman;
        workingPacman.x = parsedData.data.x;
        workingPacman.y = parsedData.data.y;
        workingPacman.facingDirection = Direction.fromEnum(parsedData.data.facingDirection) as Direction;
        workingPacman.queuedDirection = Direction.fromEnum(parsedData.data.queuedDirection) as Direction;
        workingPacman.shouldMove = parsedData.data.shouldMove;
    }
}