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

    public getMovementSpeed() {
        if (this.eaten) return this.movementSpeed * 2;
        if (this.room.ghost_phase == GHOST_PHASES.FRIGHTENED) return this.movementSpeed * 0.75;
        return this.movementSpeed;
    }

    public eat() {
        [this.x, this.y] = this.getInBetweenPosition();
        this.lastNodeTimestamp = performance.now();
        this.eaten = true; // update after getting our position because we were moving a different speed before
        this.facingDirection = null;

        this.path = this.room.gameBoard.pathfinder.findPathWithCoordinates({x: this.x, y: this.y}, {x: 340, y: 300});
        
        if (this.path?.nodes[0].x == this.x && this.path?.nodes[0].y == this.y) this.path.nodes.shift();
        if (this.path?.nodes.length == 0) this.facingDirection = null;
        
        if (this.nextTurnTimeout != null) clearTimeout(this.nextTurnTimeout);        
        
        this.onTurn();
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
        if (this.eaten) return;

        [this.x, this.y] = this.getInBetweenPosition();
        this.lastNodeTimestamp = performance.now();

        if (this.nextTurnTimeout != null) clearTimeout(this.nextTurnTimeout);

        reverseDir: if (this.facingDirection != null && this.path != null) {
            const fromNode = this.findCameFromNode(this.path.nodes[0].connections.map(c => c.node))?.node;
            if (!fromNode) break reverseDir;

            this.facingDirection = (this.facingDirection + 2) % 4 as 0|1|2|3;

            this.path = new Path([fromNode, fromNode]);
            
            this.sendLocation();
            const time = this.getTimeToTurn(fromNode);
            this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), time);
            return;
        }

        this.setFallbackTimeout();
    }

    public exitFrightened() {
        if (this.eaten) return;

        [this.x, this.y] = this.getInBetweenPosition();
        this.lastNodeTimestamp = performance.now();

        if (this.nextTurnTimeout != null) clearTimeout(this.nextTurnTimeout);

        continueDirection: if (this.facingDirection != null && this.path != null) {
            const toNode = this.path.nodes[1];
            console.log(toNode?.x, toNode?.y);

            if (!toNode) break continueDirection;

            this.path = new Path([toNode]);
            // this.path = new Path([]);

            this.sendLocation();
            const time = this.getTimeToTurn(toNode);
            this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), time);
            return;
        }

        this.setFallbackTimeout();
    }

    private getInBetweenPosition() {
        if (this.lastNodeTimestamp == null || this.facingDirection == null) {
            return [this.x, this.y];
        }

        const deltaTime = performance.now() - this.lastNodeTimestamp;
        const distance = globals.target_client_fps * this.getMovementSpeed() * (deltaTime/1000);
        // const distance = globals.target_client_fps * 5 * 0.75 * (deltaTime/1000);
        const movementDelta = utils.getDirectionDelta(this.facingDirection);

        movementDelta.dx *= distance;
        movementDelta.dy *= distance;

        return [this.x + movementDelta.dx, this.y + movementDelta.dy];
    }

    private determineTarget(players: Array<Player>) {
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

    private findPathToNextTarget() {
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

    private getAdjacentNodeDirections(node: PathNode, avoidNode: PathNode|null = null) {
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

    private followPathTurn(): boolean {
        // if the path is null set the fallback timer
        if (this.path == null || this.path.nodes.length === 0 || this.currentTarget == undefined) {
            this.setFallbackTimeout();
            return false;
        }

        if (this.facingDirection != null) {
            [this.x, this.y] = [this.path.nodes[0].x, this.path.nodes[0].y];
            this.path.nodes.shift();
        }

        return true;
    }

    private frightenedTurn() {
        let lastNode;

        if (this.path != null) {
            lastNode = this.path.nodes[0];
            if (lastNode != undefined) [this.x, this.y] = [this.path.nodes[1].x, this.path.nodes[1].y];
        }
        
        const node = this.room.gameBoard.pathfinder.getManhattanClosestNode(this.x, this.y).node;
        if (node == null) return;
        // [this.x, this.y] = [node.x, node.y];

        const adjacentNode = this.getAdjacentNodeDirections(node, lastNode ?? null);
        this.facingDirection = adjacentNode.direction;
        
        this.path = new Path([node, adjacentNode.node]);
        this.sendLocation();

        this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), this.getTimeToTurn(adjacentNode.node));
    }

    private chaseTurn() {
        if (!this.followPathTurn()) {
            this.findPathToNextTarget();
            this.setFallbackTimeout();
            return;
        }
        
        this.findPathToNextTarget();
        
        if (this.path == null || this.path.nodes.length === 0 || this.currentTarget == null) {
            this.setFallbackTimeout();
            return;
        }

        // Either face towards pacman or the next node
        this.facingDirection = this.room.gameBoard.pathfinder.getTurnDirection(
            {x: this.x, y: this.y},
            this.path.nodes[0] ?? this.currentTarget.pacman.getEstimatedPosition(performance.now()-this.currentTarget.pacman.lastPosPacketTime)
        );

        // send our new location
        this.sendLocation();

        // set a new timeout for when the ghost passes the next turn
        this.setTurnTimeout();
    }

    public eatenReturnTurn() {
        if (this.path == null) {
            console.error("Error in returning to path: path is null");
            console.log(this.x, this.y);
            return;
        }

        let passingNode = this.path.nodes[this.path.nodes.length - 1];

        if (!this.followPathTurn()) {
            console.error("Can't follow return path.", this.path == null, this.path?.nodes.length === 0, this.currentTarget == undefined);
            return;
        }

        if (this.path.nodes.length === 0) {
            // assume we reached the target
            [this.x, this.y] = [passingNode.x, passingNode.y];
            this.eaten = false;

            this.path = new Path([passingNode]);
            
            this.lastNodeTimestamp = performance.now();
            if (this.room.ghost_phase == GHOST_PHASES.FRIGHTENED) this.enterFrightened();
            else this.onTurn();
            
            return;
        }
        
        // Either face towards pacman or the next node
        this.facingDirection = this.room.gameBoard.pathfinder.getTurnDirection(
            {x: this.x, y: this.y},
            this.path.nodes[0]
        );

        // send our new location
        this.sendLocation();

        // set a new timeout for when the ghost passes the next turn
        this.setTurnTimeout();
    }

    public onTurn() {
        clearTimeout(this.nextTurnTimeout || undefined);

        if (this.eaten) {
            this.eatenReturnTurn();
            this.lastNodeTimestamp = performance.now();
            return;
        }

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

        this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), 1000);
    }

    public getTimeToTurn(nextNode: PathNode|null = null) {
        if (this.path == null) throw new Error("Path property is null");
        
        if (nextNode == null) nextNode = this.path.nodes[0];
        const distance = Math.abs(this.x - nextNode.x) + Math.abs(this.y - nextNode.y);

        return (distance * 1000) / (this.getMovementSpeed() * globals.target_client_fps);
    }

    private setTurnTimeout() {
        this.fallback_last = false;
        this.nextTurnTimeout = setTimeout(this.onTurn.bind(this), this.getTimeToTurn());
    }

    public startPathing() {
        this.findPathToNextTarget();
        
        if (this.path) this.setTurnTimeout();
        else this.setFallbackTimeout();

        this.sendLocation();
    }
}