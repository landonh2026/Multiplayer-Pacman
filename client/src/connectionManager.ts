/**
 * Manages the connection with the remote server
 */
class ConnectionManager {
    /** The websocket connection with the server */
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

    /**
     * Handles the connection with the server being opened
     * @param event The open event context
     */
    private onOpen(event: Event) {
        gameManager.currentState = GameManager.GAME_STATES.PREGAME;
        gameManager.serverTime = performance.now();
        console.log("[WSS] Connected to server.");
    }

    /**
     * Handles the connection with the server being closed
     * @param event The close event context
     */
    private onClose(event: CloseEvent) {
        gameManager.currentState = GameManager.GAME_STATES.DISCONNECTED;
        console.log(`[WSS] Closed connection to server. (${event.code})`);
    }

    /**
     * Handles a message from the server
     * @param event The message/event context
     */
    private onMessage(event: MessageEvent<any>) {
        const parsed = JSON.parse(event.data);

        if (parsed.messageType in gameManager.eventHandler.typeHandlers) {
            console.log("Received", parsed.messageType, "packet");
            gameManager.eventHandler.typeHandlers[parsed.messageType](parsed);
            return;
        }

        console.error("handler not found " + parsed.messageType);
    }
    
    /**
     * Handles an error occurring with the connection
     * @param event The error context
     */
    private onError(event: Event) {
        console.error("[WSS] Error occurred.");
        console.error(event);
    }

    /**
     * Create a message to send to the server given a type and data to send
     * @param type The message type
     * @param data The data to send
     * @returns The data as a string
     */
    private makeMessage(type: string, data: any): string {
        return JSON.stringify({"messageType": type, "data": data});
    }

    /**
     * Calculates the time that has passed since the game has started
     * @returns The time in ms
     */
    private getTimestamp() {
        return performance.now() - gameManager.serverTime;
    }

    /**
     * Sends the bump packet to the server at the location of the given pacman
     * @param pacman The local pacman
     * @param remoteSession The remote pacman that the client bumped into
     */
    public playerCollision(pacman: Pacman, remoteSession: string) {
        this.socket.send(this.makeMessage(
            "player-collide",
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
                    y: pacman.y,
                },
                timestamp: this.getTimestamp()
            }
        ));
    }

    public killLocalPacman() {
        this.socket.send(this.makeMessage(
            "kill-pacman",
            {
                "position": {
                    x: gameManager.localPacman.x,
                    y: gameManager.localPacman.y,
                },
                timestamp: this.getTimestamp()
            }
        ));
    }

    public eatGhost(id: string) {
        this.socket.send(this.makeMessage(
            "eat-ghost",
            {
                "position": {
                    x: gameManager.localPacman.x,
                    y: gameManager.localPacman.y,
                },
                timestamp: this.getTimestamp(), // TODO: should this be in .position or not
                ghost_id: id
            }
        ));
    }
}