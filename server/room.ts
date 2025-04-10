import type { Server, ServerWebSocket } from "bun";
import * as utils from "./utils.ts";
import * as globals from "./globals.ts";
import { GameBoard, gameBoards, PELLET_TYPES } from "./gameBoard.ts";
import { Player, PLAYER_TIMER_TYPES } from "./player.ts";
import { Simulator } from "./simulator.ts";
import { Ghost } from "./ghost.ts";

export enum GAME_STATES {
    WAITING_FOR_PLAYERS,
    PLAYING,
    INTERMISSION,
    GAME_END
};

export enum GHOST_PHASES {
    CHASE,
    SCATTER,
    FRIGHTENED
}

enum SERVER_TIMERS {
    GHOST_PHASE
}

export class Room {
    /** The server context that this room is under */
    server: Server;

    /** The players that are in this server with the session as the key and the Player object as the value*/
    players: {[session: string]: Player};

    ghosts: {[id: string]: Ghost};

    timers: Map<SERVER_TIMERS, Timer>;

    /** The UUID for this room */
    uuid: string;

    gameState: GAME_STATES;

    joinCode: string;

    /** The topics of this room */
    topics: {[topic: string]: string};
    
    /** The maximum number of players that are allowed in this room */
    maxPlayers: number;
    
    /** The available colors that could be taken if a new player joined the room */
    availableColors: Array<globals.Colors>;

    /** The active game board for this room */
    gameBoard: GameBoard;

    /** Message handlers for the player clients */
    messageHandlers: {[messageType: string]: (player: Player, data: any) => void};

    /** The game simulator for the game */
    simulator: Simulator;

    /** Determines if lagbacks are enabled in this room */
    enable_lagback: boolean;

    constructor(server: Server, uuid: string) {
        this.server = server;
        this.uuid = uuid;
        // todo: change later to actual join code system
        this.joinCode = this.uuid;

        this.players = {};
        this.ghosts = {};
        this.maxPlayers = 4;
        
        this.availableColors = [...globals.colors] as Array<globals.Colors>;
        
        this.gameBoard = gameBoards.default.duplicate();
        this.enable_lagback = false;
        
        this.timers = new Map();        
        this.simulator = new Simulator();
        
        this.gameState = GAME_STATES.WAITING_FOR_PLAYERS;

        // todo: set ghost phase change timer for scatter phase

        this.messageHandlers = {
            "position": this.handlePositionUpdate.bind(this),
            "eat-pellet": this.handlePelletEat.bind(this),
            "player-collide": this.handlePlayerCollision.bind(this),
            "kill-pacman": this.handlePlayerDead.bind(this),
            "eat-ghost": this.handleGhostEat.bind(this)
        };

        this.topics = this.makeTopics();

        for (let i = 0; i < 0; i++) {
            const ghost = new Ghost(340, 300, this);
            this.ghosts[ghost.id] = ghost;
            ghost.startPathing();
        }
    }

    /**
     * Duplicate the topics from the global topics list
     * @returns Returns the duplicated topics list
     */
    private makeTopics() {
        this.topics = {};
        for (let topic in globals.topics) {
            this.topics[topic] = globals.topics[topic as keyof typeof globals.topics] + "-" + this.uuid;
        }

        return this.topics;
    }

    /**
     * Make a dict showing the score of each player
     * @returns The scores of each player with the key being the session and value being the score
     */
    private makeScoresList() {
        const out: {[session: string]: number} = {};

        for (let key in this.players) {
            const value = this.players[key];
            out[value.session] = value.score;
        }

        return out;
    }

    /**
     * Make the board state as a json object
     * @returns The board state in a dict
     */
    public makeBoardState() {
        return {
            board: this.gameBoard.blockPositions,
            pellets: this.gameBoard.pellets,
            pathIntersections: this.gameBoard.pathIntersections
        }
    }

    /**
     * Gets the current player count
     * @returns The player count
     */
    public getPlayerCount() {
        return Object.keys(this.players).length
    }

    /**
     * Determines if this room is full
     * @returns Is this room full?
     */
    public isFull() { 
        return this.getPlayerCount() >= this.maxPlayers;
    }

    public closeRoom() {
        // ...
    }

    /**
     * Determines if this room should close
     * @returns Should this room close?
     */
    public shouldClose() {
        return this.getPlayerCount() == 0;
    }

    /**
     * Check to see if the player moved too far given a player and their new position
     * @return Is the player able to move here since their last position packet
     */
    public moveDistanceAllowed(now: number, player: Player, otherPosition: globals.PositionData, includeRadius: boolean = false, tolerance: number|null = null) {
        if (!this.enable_lagback) return true;

        // const now = performance.now();
        const distances = [
            Math.abs(otherPosition.x-player.pacman.lastLocation.x),
            Math.abs(otherPosition.y-player.pacman.lastLocation.y)
        ];
        const distanceTraveled = distances[0] + distances[1] - (includeRadius ? 20 : 0);

        let shouldTravelDistance = this.simulator.getMaxDistanceChange(now-player.pacman.lastClientTimestamp, player.pacman.movementSpeed, tolerance);

        if (distanceTraveled > shouldTravelDistance) {
            if (this.enable_lagback) console.log(`Player ${player.session} (${player.pacman.color}) moved too quickly!`, shouldTravelDistance, distances);
            return false;
        }

        return true;
    }

    /**
     * Verify the new position of a player
     * @param player The player to check the position of
     * @param newPosition The new position to check to see if the player can move here
     * @returns Should the player be allowed to move here?
     */
    public verifyNewPosition(player: Player, newPosition: globals.PositionData) {
        if (!player.isTimestampAllowed(newPosition.timestamp)) {
            player.log("Timestamp not allowed! Resetting timestamp.")
            player.sendLocalPlayerState();
            player.publishLocation();
            player.resetTimestamp();
            return false;
        }

        if (!this.moveDistanceAllowed(newPosition.timestamp, player, newPosition)) {
            player.pacman.lastClientTimestamp = newPosition.timestamp;
            player.sendLocalPlayerState();
            player.publishLocation();
            return false;
        }

        player.pacman.lastClientTimestamp = newPosition.timestamp;
        player.pacman.lastLocation = newPosition;
        player.pacman.lastPosPacketTime = performance.now();
        return true;
    }

    /**
     * Handle the position packet sent from the client
     * @param player 
     * @param data 
     */
    public handlePositionUpdate(player: Player, data: {data: globals.PositionData}) {
        if (player.pacman.lastLocation.packetIndex > data.data.packetIndex) {
            player.log("Ignoring old movement packet");
            return;
        }

        if (!this.verifyNewPosition(player, data.data)) {
            return;
        }

        player.publishLocation();
    }

    /**
     * Handle the packet sent when a client collides with another player
     * @param player The player that sent the packet
     * @param data The data from the client
     */
    public handlePlayerCollision(player: Player, data: {data: globals.PositionData}) {
        const otherPlayer = this.players[data.data.remotePlayer];
        if (otherPlayer == undefined) return;

        if (!player.pacman.isAlive || !otherPlayer.pacman.isAlive) return;

        const now = performance.now();
        if (now-player.lastCollision < 500 && now-otherPlayer.lastCollision < 500) {
            // console.log(`too quick bumps (${now-player.lastBump}, ${now-otherPlayer.lastBump})`);
            // both players submitted this collision, only acknowledge one total. we already acknowledged one so we skip
            return; 
        }

        // move the player to the new pos
        let newPacmanPosition: globals.PositionData = {...player.pacman.lastLocation};
        newPacmanPosition.x = data.data.position.x;
        newPacmanPosition.y = data.data.position.y;
        newPacmanPosition.timestamp = data.data.timestamp;

        // if (!this.checkPlayerMoveDistance(data.data.timestamp, player, newPacmanPosition)) {
        if (!this.verifyNewPosition(player, newPacmanPosition)) {
            player.log("Moved too quickly while attempting to trigger a bump");
            return;
        }

        // if the stationary player bumps into the moving player by sending their packet first,
        // this estimated position sometimes can teleport the moving player into walls. Fun
        let estimatedOtherPlayerPosition = otherPlayer.pacman.getEstimatedPosition(performance.now()-otherPlayer.pacman.lastPosPacketTime);
        
        // change when radius is not constant
        let allowedDistance = 70;

        let dx = Math.abs(player.pacman.lastLocation.x-estimatedOtherPlayerPosition.x);
        let dy = Math.abs(player.pacman.lastLocation.y-estimatedOtherPlayerPosition.y);

        if (dx > allowedDistance || dy > allowedDistance) {
            // TODO: do something here
            player.log("Attempted to bump a pacman that was too far");
            return;
        }

        // both are in the same powerup state, they should bump
        if (player.pacman.isPoweredUp == otherPlayer.pacman.isPoweredUp) {
            this.handlePlayerBump(player, dx, dy, now, estimatedOtherPlayerPosition, otherPlayer);
            return;
        }

        // otherwise, one pacman eats the other
        let eaten = player.pacman.isPoweredUp ? otherPlayer : player;
        eaten.pacman.isAlive = false;

        if (otherPlayer.pacman.isPoweredUp) {
            // update the remote player's position
            otherPlayer.pacman.lastLocation.x = estimatedOtherPlayerPosition.x;
            otherPlayer.pacman.lastLocation.y = estimatedOtherPlayerPosition.y;
        }

        eaten.sendLocalPlayerState();
        eaten.publishLocation();
    }

    public handlePlayerBump(player: Player, dx: number, dy: number, now: number, estimatedOtherPlayerPosition: { x: number; y: number; }, otherPlayer: Player) {
        // calculate the direction each player should launch
        let direction;
        if (dx < dy) direction = player.pacman.lastLocation.y - estimatedOtherPlayerPosition.y > 0 ? 3 : 1;
        else direction = player.pacman.lastLocation.x - estimatedOtherPlayerPosition.x > 0 ? 2 : 0;

        // set the last bump time for each player to be now
        player.lastCollision = now;
        otherPlayer.lastCollision = now;

        // send the collision data to each client
        this.server.publish(this.topics.event, utils.makeMessage("player-bump", {
            collisions: [
                {
                    session: player.session,
                    x: player.pacman.lastLocation.x,
                    y: player.pacman.lastLocation.y,
                    from: direction
                },
                {
                    session: otherPlayer.session,
                    x: estimatedOtherPlayerPosition.x,
                    y: estimatedOtherPlayerPosition.y,
                    from: (direction+2)%4
                }
            ]
        }));
    }

    /**
     * Handle the packet sent when a client wants to eat a pellet
     * @param player 
     * @param data 
     */
    public handlePelletEat(player: Player, data: any) {
        let newPacmanPosition: globals.PositionData = {...player.pacman.lastLocation};
        newPacmanPosition.x = data.data.position.x;
        newPacmanPosition.y = data.data.position.y;

        if (!this.moveDistanceAllowed(data.data.timestamp, player, newPacmanPosition)) {
            player.log("Moved too quickly while attempting to eat a pellet");
            player.ws.send(utils.makeMessage("pellet-reject", {pelletID: data.data.pelletID}));
            return;
        }

        player.pacman.lastLocation = newPacmanPosition;
        player.pacman.lastPosPacketTime = performance.now();

        // get the current pellet and pellet index
        // TODO: use a map or smth
        let pellet = undefined;
        let pellet_index = 0;
        for (pellet_index = 0; pellet_index < this.gameBoard.pellets.length; pellet_index++) {
            pellet = this.gameBoard.pellets[pellet_index];

            if (pellet.id == data.data.pelletID) {
                break;
            }
        }

        // return if the pellet is undefined
        if (pellet == undefined) {
            player.log("Attempted to eat non-existent pellet: " + data.data.pelletID);
            player.ws.send(utils.makeMessage("pellet-reject", {pelletID: data.data.pelletID}));
            return;
        }

        // get the pellet position and the distance the pacman is from the pellet, reject the pellet if the player is too far
        const pellet_pos = [pellet.x*40, pellet.y*40];
        const distance_from_pellet = [Math.abs(player.pacman.lastLocation.x - pellet_pos[0]), Math.abs(player.pacman.lastLocation.y - pellet_pos[1])];
        if (distance_from_pellet[0] > 40 || distance_from_pellet[1] > 40) {
            player.log("Attempted to eat pellet too far away from new pos: ", distance_from_pellet, pellet.id);
            player.ws.send(utils.makeMessage("pellet-reject", {pelletID: data.data.pelletID}));
            return;
        }

        // remake the gameboard if all the pellets are gone
        if (this.gameBoard.pellets.length == 1) {
            player.score += 10;
            this.gameBoard = gameBoards.default.duplicate();
            this.server.publish(this.topics.event, utils.makeMessage("board-state", this.makeBoardState()));
            return;
        }

        // remove the pellet from the gameboard
        this.gameBoard.pellets.splice(pellet_index, 1);
        player.score += 10;
        this.server.publish(this.topics.event, utils.makeMessage("eat-pellet", {pelletID: pellet.id, scores: this.makeScoresList()}));

        if (pellet.type == PELLET_TYPES.FOOD) {
            this.gameBoard = gameBoards.default.duplicate();
            this.server.publish(this.topics.event, utils.makeMessage("board-state", this.makeBoardState()));
        }

        // power up the player if appropriate
        else if (pellet.type == PELLET_TYPES.POWER) {
            this.handlePowerPelletEat(player);
        }
    }

    public handlePowerPelletEat(player: Player) {
        player.pacman.isPoweredUp = true;
        player.pacman.powerupTime = performance.now() + globals.animation_timings.power_up;

        clearInterval(this.timers.get(SERVER_TIMERS.GHOST_PHASE));
        for (let ghost of Object.values(this.ghosts)) {
            if (ghost.phase == GHOST_PHASES.FRIGHTENED) continue;
            ghost.phase = GHOST_PHASES.FRIGHTENED;
            ghost.enterFrightened();
        }

        player.sendLocalPlayerState(false);
        player.publishLocation(false);

        // clear existing timers
        clearTimeout(player.timers.get(PLAYER_TIMER_TYPES.POWERUP));
        
        player.timers.set(PLAYER_TIMER_TYPES.POWERUP, setTimeout(() => {
            player.pacman.powerupTime = null;
            player.pacman.isPoweredUp = false;

            let shouldGhostFrightened = false;
            for (let player of Object.values(this.players)) {
                shouldGhostFrightened = player.pacman.isPoweredUp;
                if (shouldGhostFrightened) break;
            }

            if (!shouldGhostFrightened) {
                for (let ghost of Object.values(this.ghosts)) {
                    ghost.phase = GHOST_PHASES.CHASE;
                    ghost.exitFrightened();
                }
                // todo: set ghost timer now
            }

            // don't update the player if they died
            if (!player.pacman.isAlive) return;

            const estimated_pos = player.pacman.getEstimatedPosition(performance.now()-player.pacman.lastPosPacketTime);
            player.pacman.lastLocation.x = estimated_pos.x;
            player.pacman.lastLocation.y = estimated_pos.y;

            player.publishLocation(false);
            player.sendLocalPlayerState(false);
        }, globals.animation_timings.power_up));
    }

    public handleGhostEat(player: Player, data: {data: any}) {
        if (!player.pacman.isPoweredUp) {
            player.ws.send(utils.makeMessage("reject-ghost-eat", {id: data.data.ghost_id}));
            return;
        }

        let newPacmanPosition: globals.PositionData = {...player.pacman.lastLocation};
        newPacmanPosition.timestamp = data.data.timestamp;
        newPacmanPosition.x = data.data.position.x;
        newPacmanPosition.y = data.data.position.y;

        if (!this.verifyNewPosition(player, newPacmanPosition)) {
            player.log("Moved too quickly while attempting to eat a ghost");
            player.ws.send(utils.makeMessage("reject-ghost-eat", {id: data.data.ghost_id}));
            return;
        }

        player.pacman.lastLocation.x = data.data.position.x;
        player.pacman.lastLocation.y = data.data.position.y;
        player.pacman.lastClientTimestamp = data.data.timestamp;
        
        player.pacman.lastPosPacketTime = performance.now();

        if (this.ghosts[data.data.ghost_id] == undefined) {
            player.ws.send(utils.makeMessage("reject-ghost-eat", {id: data.data.ghost_id}));
            return;
        }
        
        player.score += 100;
        this.server.publish(this.topics.event, utils.makeMessage("update-scores", {scores: this.makeScoresList()}));
        this.ghosts[data.data.ghost_id].eat();
    }

    public handlePlayerDead(player: Player, data: {data: {position: globals.PositionData}}) {
        player.pacman.isAlive = false;
        player.pacman.lastLocation.shouldMove = false;

        player.pacman.lastLocation.x = data.data.position.x;
        player.pacman.lastLocation.y = data.data.position.y;
        player.score = 0;

        player.sendLocalPlayerState();
        player.ws.publish(this.topics.event, utils.makeMessage("kill-pacman", { id: player.session }));

        this.server.publish(this.topics.event, utils.makeMessage("update-scores", {scores: this.makeScoresList()}));
        player.log("died");

        let remainingPlayers = 0;
        for (let player of Object.values(this.players)) {
            if (player.pacman.isAlive) remainingPlayers++;
        }

        if (remainingPlayers <= 1) {
            this.roundDone();
        }
    }
    
    public roundDone() {
        console.log("Round is over!");
    }

    /**
     * Handle the raw(er) packets from the client and choose which function to send the data to
     * @param session The session that sent this packet
     * @param data The data sent in this packet
     */
    public handleMessage(session: string, data: any) {
        const player = this.players[session];

        if (!(data.messageType in this.messageHandlers)) {
            console.error("Invalid message handler: " + data.messageType);
            return;
        }

        this.messageHandlers[data.messageType](player, data);
    }

    /**
     * Handle a player joining this room
     * @param ws The ws representing this player
     */
    public handlePlayerJoin(ws: ServerWebSocket<globals.SocketData>) {
        // make a new player from the list of available colors, then remove that color from available colors
        const newPlayer = new Player(ws.data.session, ws, utils.getRandomListItem(this.availableColors), this);
        utils.removeFromList(this.availableColors, newPlayer.pacman.color);
        
        // subscribe this player's ws to the event topic and publish their joining
        newPlayer.ws.subscribe(this.topics.event);
        newPlayer.ws.publish(this.topics.event, utils.makeMessage("player-join", {"session": ws.data.session, "color": newPlayer.pacman.color}));
        
        // tell the new player all the other players in the room
        for (let session in this.players) {
            let player = this.players[session];
    
            newPlayer.ws.send(utils.makeMessage(
                "player-join", 
                {
                    "session": session,
                    "color": player.pacman.color,
                    "last-location":
                    {
                        "from-session": player.session,
                        data: {...player.pacman.lastLocation, isAlive: player.pacman.isAlive, poweredUp: player.pacman.isPoweredUp}
                    }
                }
            ));
        }

        console.log(`Player ${newPlayer.session} (${newPlayer.pacman.color}) joined`);

        // send the new player the current board state, and add the player to the dict of players
        newPlayer.sendLocalPlayerState();
        newPlayer.ws.send(utils.makeMessage("board-state", this.makeBoardState()));
        this.players[newPlayer.session] = newPlayer;
    }

    /**
     * Handle a player leaving the room
     * @param session The session of the player that left the room
     */
    public handlePlayerLeave(session: string) {
        const player = this.players[session];

        console.log(`Player ${player.session} (${player.pacman.color}) disconnected`);

        player.ws.publish(this.topics.event, utils.makeMessage("player-leave", {"session": session}));
        this.availableColors.push(player.pacman.color);

        delete this.players[session];
    }
}