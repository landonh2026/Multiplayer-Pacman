import type { Server, ServerWebSocket } from "bun";
import { Player } from "./player.ts";
import * as utils from "./utils.ts";
import * as globals from "./globals.ts";
import {GameBoard, gameBoards} from "./gameBoard.ts";
import {Simulator} from "./simulator.ts";
import { Ghost } from "./ghost.ts";

export class Room {
    /** The server context that this room is under */
    server: Server;

    /** The players that are in this server with the session as the key and the Player object as the value*/
    players: {[session: string]: Player};

    /** The UUID for this room */
    uuid: String;

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

    constructor(server: Server, uuid: String) {
        this.server = server;
        this.players = {};
        this.uuid = uuid;
        this.maxPlayers = 4;
        this.availableColors = [...globals.colors] as Array<globals.Colors>;
        this.gameBoard = gameBoards.default.duplicate();
        this.enable_lagback = false;

        this.simulator = new Simulator();

        this.messageHandlers = {
            "position": this.handlePositionUpdate.bind(this),
            "eat-pellet": this.handlePelletEat.bind(this),
            "trigger-bump": this.handlePlayerBump.bind(this),
            "kill-pacman": this.handlePlayerDead.bind(this)
        };

        this.topics = this.makeTopics();
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
            board: this.gameBoard.rawBlockPositions,
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
    public checkPlayerMoveDistance(now: number, player: Player, otherPosition: globals.PositionData, includeRadius: boolean = false, tolerance: number|null = null) {
        if (!this.enable_lagback) return true;

        // const now = performance.now();
        const distances = [
            Math.abs(otherPosition.x-player.pacman.lastKnownLocation.x),
            Math.abs(otherPosition.y-player.pacman.lastKnownLocation.y)
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

        if (!this.checkPlayerMoveDistance(newPosition.timestamp, player, newPosition)) {
            player.pacman.lastClientTimestamp = newPosition.timestamp;
            player.sendLocalPlayerState();
            player.publishLocation();
            return false;
        }

        player.pacman.lastClientTimestamp = newPosition.timestamp;
        player.pacman.lastKnownLocation = newPosition;
        player.pacman.lastPosPacketTime = performance.now();
        return true;
    }

    /**
     * Handle the position packet sent from the client
     * @param player 
     * @param data 
     */
    public handlePositionUpdate(player: Player, data: {data: globals.PositionData}) {
        if (player.pacman.lastKnownLocation.packetIndex > data.data.packetIndex) {
            player.log("Ignoring old movement packet");
            return;
        }

        if (!this.verifyNewPosition(player, data.data)) {
            return;
        }

        player.publishLocation();
    }

    public handlePlayerDead(player: Player, data: {data: {position: globals.PositionData}}) {
        
    }

    /**
     * Handle the packet sent when a client bumps another player
     * @param player The player that sent the packet
     * @param data The data from the client
     */
    public handlePlayerBump(player: Player, data: {data: globals.PositionData}) {
        const otherPlayer = this.players[data.data.remotePlayer];
        if (otherPlayer == undefined) return;

        const now = performance.now();
        // both players submitted this bump, only acknowledge one bump so we skip this one
        if (now-player.lastBump < 500 && now-otherPlayer.lastBump < 500) {
            console.log(`too quick bumps (${now-player.lastBump}, ${now-player.lastBump})`);
            return; 
        }

        // move the player to the new pos
        let newPacmanPosition: globals.PositionData = {...player.pacman.lastKnownLocation};
        newPacmanPosition.x = data.data.position.x;
        newPacmanPosition.y = data.data.position.y;
        newPacmanPosition.timestamp = data.data.timestamp;

        // if (!this.checkPlayerMoveDistance(data.data.timestamp, player, newPacmanPosition)) {
        if (!this.verifyNewPosition(player, newPacmanPosition)) {
            player.log("Moved too quickly while attempting to trigger a bump");
            // player.ws.send(utils.makeMessage("bump-reject", {})); // TODO: implement
            return;
        }

        // if the stationary player bumps into the moving player by sending their packet first,
        // this estimated position sometimes can teleport the moving player into walls. Fun
        let estimatedOtherPlayerPosition = otherPlayer.pacman.getEstimatedPosition(performance.now()-otherPlayer.pacman.lastPosPacketTime);
        
        // change when radius is not constant
        let allowedDistance = 150;

        let dx = Math.abs(player.pacman.lastKnownLocation.x-estimatedOtherPlayerPosition.x);
        let dy = Math.abs(player.pacman.lastKnownLocation.y-estimatedOtherPlayerPosition.y);

        console.log(player.pacman.color, dx, dy);

        if (dx > allowedDistance || dy > allowedDistance) {
            // TODO: do something here
            player.log("Attempted to bump a pacman that was too far");
            return;
        }

        // calculate the direction each player should launch
        let direction;
        if (dx < dy) direction = player.pacman.lastKnownLocation.y - estimatedOtherPlayerPosition.y > 0 ? 3 : 1;
        else direction = player.pacman.lastKnownLocation.x - estimatedOtherPlayerPosition.x > 0 ? 2 : 0;

        // set the last bump time for each player to be now
        player.lastBump = now;
        otherPlayer.lastBump = now;

        // send the collision data to each client
        this.server.publish(this.topics.event, utils.makeMessage("trigger-bump", {
            collisions: [
                {
                    session: player.session,
                    x: player.pacman.lastKnownLocation.x,
                    y: player.pacman.lastKnownLocation.y,
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
        // move the player to the new pos
        let newPacmanPosition: globals.PositionData = {...player.pacman.lastKnownLocation};
        newPacmanPosition.x = data.data.position.x;
        newPacmanPosition.y = data.data.position.y;

        // check to see if the player moved a valid distance
        // if (!this.checkPlayerMoveDistance(player, newPacmanPosition, false)) {
        if (!this.checkPlayerMoveDistance(data.data.timestamp, player, newPacmanPosition)) {
            player.log("Moved too quickly while attempting to eat a pellet");
            player.ws.send(utils.makeMessage("pellet-reject", {pelletID: data.data.pelletID}));
            return;
        }

        player.pacman.lastKnownLocation = newPacmanPosition;
        player.pacman.lastPosPacketTime = performance.now();

        // get the current pellet and pellet index
        let pellet, pellet_index;
        for (pellet_index = 0; pellet_index < this.gameBoard.pellets.length; pellet_index++) {
            pellet = this.gameBoard.pellets[pellet_index];

            if (pellet[2] == data.data.pelletID) {
                break;
            }
        }

        // return if the pellet is undefined
        if (pellet == undefined) {
            player.log("Attempted to eat non-existent pellet: " + data.data.pelletID);
            player.ws.send(utils.makeMessage("pellet-reject", {pelletID: data.data.pelletID}));
            return;
        }

        // get the pellet position and the distance the pacman is from the pellet
        const pellet_pos = [pellet[0]*40, pellet[1]*40];
        const distance_from_pellet = [Math.abs(player.pacman.lastKnownLocation.x - pellet_pos[0]), Math.abs(player.pacman.lastKnownLocation.y - pellet_pos[1])]
        // const distance_from_pellet = [Math.abs(newPacmanPosition.x - pellet_pos[0]), Math.abs(newPacmanPosition.y - pellet_pos[1])]
        
        // reject the pellet if the player is too far
        if (distance_from_pellet[0] > 40 || distance_from_pellet[1] > 40) {
            player.log("Attempted to eat pellet too far away from new pos: ", distance_from_pellet);
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
        this.server.publish(this.topics.event, utils.makeMessage("eat-pellet", {pelletID: pellet[2], scores: this.makeScoresList()}));
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
                        data: player.pacman.lastKnownLocation
                    }
                }
            ));
        }

        console.log(`Player ${newPlayer.session} (${newPlayer.pacman.color}) joined`);

        // send the new player the current board state, and add the player to the dict of players
        newPlayer.sendLocalPlayerState();
        newPlayer.ws.send(utils.makeMessage("board-state", this.makeBoardState()));
        this.players[newPlayer.session] = newPlayer;

        const ghost = new Ghost(this.gameBoard.pathIntersections[10].x*40, this.gameBoard.pathIntersections[10].y*40, this);
        ghost.startPathing();
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