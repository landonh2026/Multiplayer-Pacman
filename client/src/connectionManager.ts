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

        console.log(parsed);

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
    
    public sendPosition(pacman: Pacman) {
        if (this.socket.readyState == 0) return;

        // console.log(pacman.x, pacman.y, this.movementPacketIndex);
    
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