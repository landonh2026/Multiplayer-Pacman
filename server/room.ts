import type { Server, ServerWebSocket } from "bun";
import { Player } from "./player.ts";
import * as utils from "./utils.js";
import * as globals from "./globals.js";
import {GameBoard, gameBoards} from "./gameBoard.js";
import {Simulator} from "./simulator.ts";

export class Room {
    server: Server;
    players: Record<string, Player>;
    uuid: String;
    topics: {[topic: string]: string};
    maxPlayers: number;
    canJoin: boolean;
    availableColors: Array<globals.Colors>;
    gameBoard: GameBoard;
    messageHandlers: {[messageType: string]: (player: Player, data: any) => void};
    simulator: Simulator;
    nextCollisions: {[sessionsHash: number]: {collisionUnix: number, session1: string, session2: string, timeout: Timer}};

    constructor(server: Server, uuid: String) {
        this.server = server;
        this.players = {};
        this.uuid = uuid;
        this.maxPlayers = 4;
        this.canJoin = true;
        this.availableColors = [...globals.colors] as Array<globals.Colors>;
        this.gameBoard = gameBoards.default.duplicate();
        this.nextCollisions = {};

        this.simulator = new Simulator();

        this.messageHandlers = {
            "position": this.handlePositionUpdate.bind(this),
            "eat-pellet": this.handlePelletEat.bind(this),
            "trigger-bump": this.handlePlayerBump.bind(this)
        };

        this.topics = this.makeTopics();
    }

    private makeTopics() {
        this.topics = {};
        for (let topic in globals.topics) {
            this.topics[topic] = globals.topics[topic as keyof typeof globals.topics] + "-" + this.uuid;
        }

        return this.topics;
    }

    private makeScoresList() {
        const out: {[session: string]: number} = {};

        for (let key in this.players) {
            const value = this.players[key];
            out[value.session] = value.score;
        }

        return out;
    }

    public makeBoardState() {
        return {
            board: this.gameBoard.rawBlockPositions,
            pellets: this.gameBoard.pellets,
            pathIntersections: this.gameBoard.pathIntersections
        }
    }

    public getPlayerCount() {
        return Object.keys(this.players).length
    }

    public isFull() { 
        return this.getPlayerCount() >= this.maxPlayers;
    }

    public closeRoom() {
        // ...
    }

    public shouldClose() {
        return this.getPlayerCount() == 0;
    }

    public checkPlayerMoveDistance(now: number, player: Player, otherPosition: globals.PositionData, includeRadius: boolean = false, tolerance: number|null = null) {
        // const now = performance.now();
        const distances = [
            Math.abs(otherPosition.x-player.pacman.lastKnownLocation.x),
            Math.abs(otherPosition.y-player.pacman.lastKnownLocation.y)
        ];
        const distanceTraveled = distances[0] + distances[1] - (includeRadius ? 20 : 0);

        let shouldTravelDistance = this.simulator.getMaxDistanceChange(now-player.pacman.lastClientTimestamp, player.pacman.movementSpeed, tolerance);

        // could potentially be looped in order to travel quickly with many packets (send not moving packet, then moving, etc)
        // if (!player.pacman.lastKnownLocation.shouldMove) {
        //     shouldTravelDistance = 5;
        // }

        if (distanceTraveled > shouldTravelDistance) {
            console.log(`Player ${player.session} (${player.pacman.color}) moved too quickly!`, shouldTravelDistance, distances);
            return false;
        }

        return true;
    }

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
        return true;
    }

    public handlePositionUpdate(player: Player, data: {data: globals.PositionData}) {
        if (player.pacman.lastKnownLocation.packetIndex > data.data.packetIndex) {
            player.log("Ignoring old movement packet");
            return;
        }

        if (!this.verifyNewPosition(player, data.data)) {
            return;
        }
    
        player.publishLocation();

        for (let sessionsHash in player.pacman.nextCollisions) {
            let otherSession = player.pacman.nextCollisions[sessionsHash];

        // CLEAR SESSION            
        }

        for (let session in this.players) {
            let otherPlayer = this.players[session];
            
            if (otherPlayer.session == player.session) continue;
            
            // TODO: clear timeout if 
            const collisionTime = this.simulator.getPacmanCollision(player.pacman, otherPlayer.pacman);
            if (collisionTime == null) continue;


            const hash = utils.makeSessionsHash(player.session, session);

            if (hash in this.nextCollisions) {
                clearTimeout(this.nextCollisions[hash].timeout);
            }

            const timeout = setTimeout(() => {
                console.log("bump");
            }, collisionTime);

            this.nextCollisions[hash] = {
                collisionUnix: performance.now()+collisionTime,
                session1: player.session,
                session2: session,
                timeout: timeout
            };

            player.pacman.nextCollisions[hash] = session;
            otherPlayer.pacman.nextCollisions[hash] = player.session;
            
            break;
        }
    }

    public handlePlayerBump(player: Player, data: {data: globals.PositionData}) {
        const otherPlayer = this.players[data.data.remotePlayer];
        if (otherPlayer == undefined) return;

        // move the player to the new pos
        let newPacmanPosition: globals.PositionData = {...player.pacman.lastKnownLocation};
        newPacmanPosition.x = data.data.position.x;
        newPacmanPosition.y = data.data.position.y;

        if (!this.verifyNewPosition(player, data.data)) {
            player.log("Moved too quickly while attempting to trigger a bump");
            player.ws.send(utils.makeMessage("bump-reject", {})); // TODO: implement
            return;
        }

    }

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

    public handleMessage(session: string, data: any) {
        const player = this.players[session];

        if (!(data.messageType in this.messageHandlers)) {
            console.error("Invalid message handler: " + data.messageType);
            return;
        }

        this.messageHandlers[data.messageType](player, data);
    }

    public handlePlayerJoin(ws: ServerWebSocket<globals.SocketData>) {
        const newPlayer = new Player(ws.data.session, ws, utils.getRandomListItem(this.availableColors), this);
        utils.removeFromList(this.availableColors, newPlayer.pacman.color);
        
        newPlayer.ws.subscribe(this.topics.event);
        newPlayer.ws.publish(this.topics.event, utils.makeMessage("player-join", {"session": ws.data.session, "color": newPlayer.pacman.color}));
        
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

        newPlayer.sendLocalPlayerState();
        newPlayer.ws.send(utils.makeMessage("board-state", this.makeBoardState()));
        this.players[newPlayer.session] = newPlayer;
    }

    public handlePlayerLeave(session: string) {
        const player = this.players[session];

        console.log(`Player ${player.session} (${player.pacman.color}) disconnected`);

        player.ws.publish(this.topics.event, utils.makeMessage("player-leave", {"session": session}));
        this.availableColors.push(player.pacman.color);

        delete this.players[session];
    }
}