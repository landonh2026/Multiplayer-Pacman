/**
 * Handle events from the server
 */
class EventHandler {
    /** A dictionary containing the event type as the key and the function as the value */
    typeHandlers: {[key: string]: CallableFunction};

    constructor() {
        this.typeHandlers = {
            "player-join": this.playerJoin.bind(this),
            "player-leave": this.playerLeave.bind(this),
            "position": this.remotePacmanUpdate.bind(this),
            "local-player-info": this.localInfo.bind(this),
            "board-state":this.boardState.bind(this),
            "eat-pellet": this.eatPellet.bind(this),
            "pellet-reject": this.pelletRejected.bind(this),
            "score-update": this.scoreUpdate.bind(this),
            "server-time-reset": this.resetServerTime.bind(this),
            "player-bump": this.handleBump.bind(this),
            "ghost-position": this.updateGhostPosition.bind(this),
            "update-scores": this.updateScores.bind(this),
            "kill-pacman": this.remotePacmanDied.bind(this),
            "reject-ghost-eat": this.ghostEatReject.bind(this)
        }
    }

    public remotePacmanDied(parsedData: any) {
        gameManager.remotePlayers[parsedData.data.id].pacman.kill();
    }

    public updateGhostPosition(parsedData: any) {
        const localGhost = gameManager.ghosts[parsedData.data.id];

        if (!localGhost) {
            const ghost = new Ghost(parsedData.data.position.x, parsedData.data.position.y, parsedData.data.id, parsedData.data.color, true);
            ghost.facingDirection = Direction.fromEnum(parsedData.data.position.direction) as Direction;
            return;
        }

        localGhost.eat_pending = false;
        localGhost.x = parsedData.data.position.x;
        localGhost.y = parsedData.data.position.y;
        localGhost.facingDirection = parsedData.data.position.direction == null ? null : Direction.fromEnum(parsedData.data.position.direction) as Direction;
        localGhost.path = new Path(parsedData.data.debug_path.map((n: {x: number, y: number}) => new PathNode(n.x, n.y)));
        localGhost.eaten = parsedData.data.eaten;
        localGhost.phase = parsedData.data.phase;
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
        for (let pellet of gameManager.currentBoard.pellets) {
            if (pellet.id == parsedData.data.pelletID) {
                pellet.local_state = PELLET_STATES.NONE;
                return;
            }
        }
    }

    public updateScores(parsedData: any) {
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
    }

    /**
     * Handle a pellet being eaten
     * @param parsedData The parsed data from the server
     */
    public eatPellet(parsedData: any) {
        this.updateScores(parsedData);

        // go through every pellet and remove the one that matches this pellet ID
        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pellet = gameManager.currentBoard.pellets[i];

            if (pellet.id == parsedData.data.pelletID) {
                gameManager.currentBoard.pellets.splice(i, 1);
                break;
            }
        }
    }

    public ghostEatReject(parsedData: any) {
        gameManager.ghosts[parsedData.data.id].eat_pending = false;
    }

    /**
     * Update the board state using information from the server
     * @param parsedData The parsed data from the server
     */
    public boardState(parsedData: any) {
        gameManager.drawManager.oldPellets = gameManager.currentBoard.pellets;
        gameManager.drawManager.pelletShrinkAnimation.reset();
        gameManager.drawManager.pelletShrinkAnimation.setActive(true);

        gameManager.currentBoard = new GameBoard(
            parsedData.data.board,
            parsedData.data.pellets.map((p: any) => new Pellet(p.x, p.y, p.id, p.type)),
            parsedData.data.pathIntersections
        );

        gameManager.newBoard();
    }

    /**
     * Update the local pacman's location using information from the server
     * @param parsedData The parsed data from the server
     */
    public localInfo(parsedData: any) {
        gameManager.localPacman.color = PACMAN_COLORS[parsedData.data.color as keyof typeof PACMAN_COLORS];

        if (parsedData.data.shouldFade) {
            gameManager.localPacman.animations.fadeAnimation.reset();
            gameManager.localPacman.animations.fadeAnimation.setActive(true);
            gameManager.localPacman.animations.fadeAnimation.meta.position = {x: gameManager.localPacman.x, y: gameManager.localPacman.y, direction: gameManager.localPacman.facingDirection};
        }

        // local pacman just revived
        if (gameManager.localPacman.isDead && parsedData.data.isAlive) {
            gameManager.localPacman.animations.killAnimation.reset();
            gameManager.localPacman.animations.killAnimation.setActive(false);
        }

        // local pacman power up animation
        if (gameManager.localPacman.isPoweredUp != parsedData.data.poweredUp) {
            gameManager.localPacman.animations.powerAnimation.reset();
            gameManager.localPacman.animations.powerAnimation.setActive(true);
        }

        gameManager.localPacman.isDead = !parsedData.data.isAlive;
        gameManager.localPacman.isPoweredUp = parsedData.data.poweredUp;
        gameManager.localPacman.movementSpeed = parsedData.data.moveSpeed;
        gameManager.localPacman.powerupExpiresAt = parsedData.data.powerupTimer ? performance.now() + parsedData.data.powerupTimer : null;

        if (parsedData.data.loc != null) {
                gameManager.localPacman.x = parsedData.data.loc.x;
                gameManager.localPacman.y = parsedData.data.loc.y;
                gameManager.localPacman.facingDirection = Direction.fromEnum(parsedData.data.loc.facingDirection) as Direction;
                gameManager.localPacman.queuedDirection = Direction.fromEnum(parsedData.data.loc.queuedDirection) as Direction;
                gameManager.localPacman.shouldMove = parsedData.data.loc.shouldMove;
        }
        
        gameManager.uuid = parsedData.data.session;
    }

    /**
     * Handle a position update for a remote pacman form the server
     * @param parsedData The parsed data from the server
     */
    public remotePacmanUpdate(parsedData: any) {
        const workingPacman = gameManager.remotePlayers[parsedData["from-session"] as keyof typeof gameManager.remotePlayers].pacman;
        
        // pacman just revived
        if (workingPacman.isDead && parsedData.data.isAlive) {
            workingPacman.animationManager.animations.killAnimation.reset();
            workingPacman.animationManager.animations.killAnimation.setActive(false);
        }

        // pacman just powered up
        if (workingPacman.isPoweredUp != parsedData.data.poweredUp) {
            workingPacman.animations.powerAnimation.reset();
            workingPacman.animations.powerAnimation.setActive(true);
        }

        if (!workingPacman.isDead && !parsedData.data.isAlive) {
            workingPacman.animations.killAnimation.setActive(true);
        }

        workingPacman.isPoweredUp = parsedData.data.poweredUp;
        workingPacman.powerupExpiresAt = parsedData.data.powerupTimer ? performance.now() + parsedData.data.powerupTimer : null;
        workingPacman.isDead = !parsedData.data.isAlive;

        if (!parsedData.data.no_pos) {
            workingPacman.x = parsedData.data.x;
            workingPacman.y = parsedData.data.y;
            workingPacman.facingDirection = Direction.fromEnum(parsedData.data.facingDirection) as Direction;
            workingPacman.queuedDirection = Direction.fromEnum(parsedData.data.queuedDirection) as Direction;
            workingPacman.shouldMove = parsedData.data.shouldMove;
        }
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
            this.remotePacmanUpdate(parsedData.data["last-location"]);
    }

    /**
     * Handle a player leaving the room
     * @param parsedData The parsed data from the server
     */
    public playerLeave(parsedData: any) {
        delete gameManager.remotePlayers[parsedData.data.session];
        gameManager.infoBoard.setPlayerCount(Object.keys(gameManager.remotePlayers).length + 1);
    }
}