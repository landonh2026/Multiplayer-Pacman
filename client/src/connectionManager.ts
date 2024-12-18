class ConnectionManager {
    socket: WebSocket;
    movementPacketIndex: number;
    
    constructor(host: string|URL = "ws://localhost:8080/gamesocket") {
        this.socket = new WebSocket(host);
        this.movementPacketIndex = 0;

        this.socket.addEventListener("open", this.onOpen.bind(this));
        this.socket.addEventListener("close", this.onClose.bind(this))
        this.socket.addEventListener("message", this.onMessage.bind(this));
        this.socket.addEventListener("error", this.onError.bind(this));
    }

    private onOpen(event: Event) {
        gameManager.currentState = GameManager.GAME_STATES.PREGAME;
        gameManager.serverTime = performance.now();
        console.log("[WSS] Connected to server.");
    }

    private onClose(event: CloseEvent) {
        gameManager.currentState = GameManager.GAME_STATES.DISCONNECTED;
        console.log(`[WSS] Closed connection to server. (${event.code})`);
    }

    private onMessage(event: MessageEvent<any>) {
        const parsed = JSON.parse(event.data);

        // console.log(parsed);

        if (parsed.messageType in gameManager.eventHandler.typeHandlers) {
            gameManager.eventHandler.typeHandlers[parsed.messageType](parsed);
            return;
        }

        console.error("handler not found " + parsed.messageType);
    }
    
    private onError(event: Event) {
        console.error("[WSS] Error occurred.");
    }

    private makeMessage(type: string, data: any): string {
        return JSON.stringify({"messageType": type, "data": data});
    }

    private getTimestamp() {
        return performance.now() - gameManager.serverTime;
    }

    /**
     * Sends the bump packet to the server at the location of the given pacman
     * @param pacman The local pacman
     * @param remoteSession The remote pacman that the client bumped into
     */
    public triggerBump(pacman: Pacman, remoteSession: string) {
        this.socket.send(this.makeMessage(
            "trigger-bump",
            {
                remotePlayer: remoteSession,
                position: {
                    x: pacman.x,
                    y: pacman.y,
                },
                facingDirection: pacman.facingDirection.enumValue,
                queuedDirection: pacman.queuedDirection.enumValue,
                shouldMove: pacman.shouldMove,
                packetIndex: this.movementPacketIndex++,
                timestamp: this.getTimestamp()
            }
        ))
    }
    
    /**
     * Send the position packet of the local pacman
     * @param pacman The local pacman
     */
    public sendPosition(pacman: Pacman) {
        if (this.socket.readyState == 0) return;

        console.log("sending pos packet", pacman.x, pacman.y, pacman.shouldMove);
        // console.trace();
    
        this.socket.send(this.makeMessage(
            "position",
            {
                x: pacman.x,
                y: pacman.y,
                facingDirection: pacman.facingDirection.enumValue,
                queuedDirection: pacman.queuedDirection.enumValue,
                shouldMove: pacman.shouldMove,
                packetIndex: this.movementPacketIndex++,
                timestamp: this.getTimestamp()
            }
        ));
    }
    
    /**
     * Sends the eat pellet packet to the server
     * @param pacman The local pacman
     * @param pellet The pellet index that was eaten
     */
    public eatPellet(pacman: Pacman, pellet: number) {
        this.socket.send(this.makeMessage(
            "eat-pellet",
            {
                pelletID: pellet,
                "position": {
                    x: pacman.x,
                    y: pacman.y
                },
                timestamp: this.getTimestamp()
            }
        ))
    }
    
}