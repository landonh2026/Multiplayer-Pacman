import { Player } from "./player.ts";
import { Path } from "./pathfinding.ts";
import { Room, GHOST_PHASES } from "./room.ts";
import { PathNode } from "./pathfinding.ts";
import * as globals from "./globals.ts";
import * as utils from "./utils.ts";

/*
MOVEMENT REFERENCE:
https://www.todayifoundout.com/index.php/2015/10/ghosts-pac-man-work/
*/

export class Ghost {
    x: number;
    y: number;
    movementSpeed: number;
    facingDirection: 0|1|2|3|null;
    currentTarget: Player|null;
    path: Path|null;
    room: Room;
    nextTurnTimeout: Timer|null;
    id: string;
    color: globals.Colors;
    fallback_last: boolean;
    eaten: boolean;
    lastNodeTimestamp: number|null;

    constructor(x: number, y: number, room: Room) {
        this.x = x;
        this.y = y;
        this.movementSpeed = 5;
        this.lastNodeTimestamp = null;

        // this.color = globals.colors[Math.floor(globals.colors.length * Math.random())] as globals.Colors;
        this.color = "RED" as globals.Colors;
        this.id = crypto.randomUUID().toString();

        this.facingDirection = null;
        this.currentTarget = null;
        this.path = null;
        this.room = room;
        this.nextTurnTimeout = null;

        this.fallback_last = false;
        this.eaten = false;

        this.sendLocation();
    }

    public sendLocation() {
        this.room.server.publish(
            this.room.topics.event,
            utils.makeMessage("ghost-position",
            {
                position: {x: this.x, y: this.y, direction: this.facingDirection},
                eaten: this.eaten,
                id: this.id,
                color: this.color,
                debug_path: globals.debug ? this.path?.nodes.map((n) => { return {x: n.x, y: n.y} }) : null,
                phase: this.room.ghost_phase
            }
        ));
    }

    public eat() {
        this.eaten = true;

        this.facingDirection = null;
        this.sendLocation();

        if (this.nextTurnTimeout != null) clearTimeout(this.nextTurnTimeout);
    }

    public findCameFromNode(nodes: Array<PathNode>) {
        if (this.facingDirection == null) return;

        const reversedFacingDirection = (this.facingDirection + 2) % 4;
        let closestNode = {distance: Infinity, node: null as null|PathNode};

        for (let node of nodes) {
            const distance = Math.abs(this.x - node.x) + Math.abs(this.y - node.y);

            if (utils.getDirectionFromNodes({x: this.x, y: this.y}, node) != reversedFacingDirection) {
                continue;
            }

            if (distance < closestNode.distance) {
                closestNode = {distance: distance, node: node};
            }
        }

        return closestNode;
    }

    public enterFrightened() {
        [this.x, this.y] = this.getInBetweenPosition();

        if (this.nextTurnTimeout != null) clearTimeout(this.nextTurnTimeout);

        reverseDir: if (this.facingDirection != null && this.path != null) {
            const fromNode = this.findCameFromNode(this.path.nodes[0].connections.map(c => c.node))?.node;
            console.log(fromNode);

            if (!fromNode) break reverseDir;

            this.facingDirection = (this.facingDirection + 2) % 4 as 0|1|2|3;
            
            this.sendLocation();
            const time = this.getTimeToTurn(fromNode);
            this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), time);
        }

        this.setFallbackTimeout();
    }

    public getInBetweenPosition() {
        if (this.lastNodeTimestamp == null || this.facingDirection == null) {
            return [this.x, this.y];
        }

        const deltaTime = performance.now() - this.lastNodeTimestamp;
        const distance = globals.target_client_fps * this.movementSpeed * (deltaTime/1000);
        const movementDelta = utils.getDirectionDelta(this.facingDirection);

        movementDelta.dx *= distance;
        movementDelta.dy *= distance;

        return [this.x + movementDelta.dx, this.y + movementDelta.dy];
    }

    public determineTarget(players: Array<Player>) {
        const heuristic = (x1: number, y1: number, x2: number, y2: number) => { return Math.abs(x1-x2) + Math.abs(y1-y2) };

        let closest = {
            player: null as null|Player,
            distance: Infinity
        };

        for (let player of players) {
            if (!player.pacman.isAlive || player.pacman.isPoweredUp) continue;

            const distance = heuristic(this.x, this.y, player.pacman.lastLocation.x, player.pacman.lastLocation.y);

            if (distance < closest.distance) {
                closest = {
                    player: player,
                    distance: distance
                };
            }
        }

        return closest.player;
    }

    public findPathToNextTarget() {
        this.currentTarget = this.determineTarget(Object.values(this.room.players));

        if (this.currentTarget == undefined) {
            this.facingDirection = null;
            return;
        }

        const estimatedPos = this.currentTarget.pacman.getEstimatedPosition(performance.now()-this.currentTarget.pacman.lastPosPacketTime);

        this.path = this.room.gameBoard.pathfinder.findPathWithCoordinates({x: this.x, y: this.y}, {x: Math.round(estimatedPos.x), y: Math.round(estimatedPos.y)});
        
        if (this.path?.nodes[0].x == this.x && this.path?.nodes[0].y == this.y) {
            this.path.nodes.shift();
        }

        if (this.path?.nodes.length == 0) this.facingDirection = null;
    }

    public getAdjacentNodeDirections(node: PathNode, avoidNode: PathNode|null = null) {
        const possibleDirections: Array<{node: PathNode, direction: 0|1|2|3}> = [];

        for (let connection of node.connections) {
            const otherNode = connection.node;

            if (avoidNode != null && avoidNode.id == otherNode.id) continue;

            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;

            if (dx == 0) possibleDirections.push({node: otherNode, direction: dy > 0 ? 3 : 1});
            else if (dy == 0) possibleDirections.push({node: otherNode, direction: dx > 0 ? 2 : 0});
        }

        const selected = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
        return selected;
    }

    public frightenedTurn() {
        let lastNode;
        if (this.path != null) {
            lastNode = this.path.nodes[0];
            [this.x, this.y] = [this.path.nodes[1].x, this.path.nodes[1].y];
        }
        
        const node = this.room.gameBoard.pathfinder.getManhattanClosestNode(this.x, this.y).node;
        if (node == null) return;
        // [this.x, this.y] = [node.x, node.y];

        const adjacentNode = this.getAdjacentNodeDirections(node, lastNode);
        this.facingDirection = adjacentNode.direction;
        
        this.path = new Path([node, adjacentNode.node]);
        this.sendLocation();

        this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), this.getTimeToTurn(adjacentNode.node));
    }

    public chaseTurn() {
        // if the path is null set the fallback timer
        if (this.path == null || this.path.nodes.length === 0 || this.currentTarget == undefined) {
            this.findPathToNextTarget();
            this.setFallbackTimeout();
            return;
        }

        if (this.facingDirection != null) {
            [this.x, this.y] = [this.path.nodes[0].x, this.path.nodes[0].y];
            this.path.nodes.shift();
        }

        this.findPathToNextTarget();

        if (this.path == null || this.path.nodes.length === 0 || this.currentTarget == undefined) {
            this.findPathToNextTarget();
            this.setFallbackTimeout();
            return;
        }

        const estimatedPos = this.currentTarget.pacman.getEstimatedPosition(performance.now()-this.currentTarget.pacman.lastPosPacketTime);
        this.facingDirection = this.room.gameBoard.pathfinder.getTurnDirection(
            {x: this.x, y: this.y},
            this.path.nodes[0] ?? estimatedPos
        );

        this.sendLocation();

        if (this.path.nodes.length === 0) {
            this.setFallbackTimeout();
            return;
        }

        // set a new timeout for when the ghost passes the next turn
        this.setTurnTimeout();
    }

    public onTurn() {
        if (this.eaten) return;

        if (this.room.ghost_phase == GHOST_PHASES.FRIGHTENED) {
            this.frightenedTurn();
            this.lastNodeTimestamp = performance.now();
            return;
        }

        this.chaseTurn();
        this.lastNodeTimestamp = performance.now();
    }

    private setFallbackTimeout() {
        if (!this.fallback_last) this.sendLocation();
        this.fallback_last = true;

        this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), 150);
    }

    public getTimeToTurn(nextNode: PathNode|null = null) {
        if (this.path == null) throw new Error("Path property is null");
        
        if (nextNode == null) nextNode = this.path.nodes[0];
        const distance = Math.abs(this.x - nextNode.x) + Math.abs(this.y - nextNode.y);

        return (distance * 1000) / (this.movementSpeed * globals.target_client_fps * (this.room.ghost_phase == GHOST_PHASES.FRIGHTENED ? 0.75 : 1));
    }

    private setTurnTimeout() {
        this.fallback_last = false;
        this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), this.getTimeToTurn());
    }

    public startPathing() {
        this.findPathToNextTarget();
        
        if (this.path) this.setTurnTimeout();
        else this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), 150);

        this.sendLocation();
    }
}