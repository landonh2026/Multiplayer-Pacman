/**
 * Represents a Pacman
 */
class Pacman {
    x: number;
    y: number;
    radius: number;
    color: PacmanColor;

    facingDirection: Direction;
    movingDirection: Direction;
    queuedDirection: Direction;

    visualRadius: number;
    movementSpeed: number;
    shouldMove: boolean;
    movingLastFrame: boolean;
    
    isDead: boolean;
    isLocal: boolean;

    score: number;
    lastQueuedDirectionNode: { distance: number, node: PathIntersection, nodeIndex: number } | null;
    animationManager: AnimationManager;

    constructor(x: number, y: number, color: PacmanColor, facingDirection: Direction, queuedDirection: Direction, isDead: boolean, score: number, isLocal: boolean, tileSize: number|null = null) {
        if (tileSize == null) tileSize = gameManager.tileSize;
        
        this.x = x;
        this.y = y;
        this.color = color;
        
        this.facingDirection = facingDirection;
        this.movingDirection = facingDirection;
        this.queuedDirection = queuedDirection;
        
        this.radius = tileSize / 2;
        this.visualRadius = this.radius;
        
        this.movementSpeed = tileSize / (6 + (2/3));

        this.shouldMove = true;
        this.movingLastFrame = true;
        
        this.isDead = isDead;

        this.score = score;
        this.isLocal = isLocal;

        this.lastQueuedDirectionNode = null;

        this.animationManager = new AnimationManager();

        this.animationManager.animations.bodyAnimation = new GameAnimation(4, false, 0.85, true);
        this.animationManager.animations.bumpAnimation = new GameAnimation(100, false, 20, false);
        this.animationManager.animations.killAnimation = new GameAnimation(180, false, 1, false);

        this.animationManager.animations.bodyAnimation.setActive(true);
    }

    /**
     * Get the position that is ahead a certain number of pixels
     * @param distance The distance away to find
     * @param direction The direction to find the distance away from
     * @returns The position that is the given distance away in the given direction
     */
    public getPositionAhead(distance: number, direction: Direction|null = null): [number, number] {
        if (!direction) direction = this.movingDirection;

        switch (direction) {
            case directions.UP:
                return [this.x, this.y - distance];
            case directions.DOWN:
                return [this.x, this.y + distance];
            case directions.LEFT:
                return [this.x - distance, this.y];
            case directions.RIGHT:
                return [this.x + distance, this.y];
        }

        return [this.x, this.y]
    }

    /**
     * Eat any pellets that this pacman is in contact with
     */
    public collidePellets() {
        for (let i = 0; i < gameManager.currentBoard.pellets.length; i++) {
            let pellet = gameManager.currentBoard.pellets[i];

            // if we are close enough to this pellet try eating it
            if (Math.abs(this.x-pellet[0]) < this.radius && Math.abs(this.y-pellet[1]) < this.radius) {
                if (pellet[3] == PELLET_STATES.EAT_PENDING) {
                    break;
                }

                // send to the server that we want to eat this pellet
                pellet[3] = PELLET_STATES.EAT_PENDING;
                gameManager.connectionManager.eatPellet(this, pellet[2]);
                break;
            }
        }
    }

    /**
     * Calculates 2 collision points to check to see if the pacman is colliding with a wall
     * @param direction The direction pacman to check in
     * @param distanceFromPacman The distance each collision point should be from pacman
     * @returns The collision data for the 2 points
     */
    public getCollisionPoints(direction: Direction|null = null, distanceFromPacman: number = 0): [number, number, number, number] {
        if (!direction) direction = this.movingDirection;

        let [collisionX, collisionY] = this.getPositionAhead(this.radius + distanceFromPacman, direction);
        let isHorizontal = this.x != collisionX;

        let horizontalOffset = isHorizontal ? 0 : this.radius * 0.99;
        let verticalOffset = isHorizontal ? this.radius * 0.99: 0;

        return [collisionX, collisionY, horizontalOffset, verticalOffset];
    }

    /**
     * Collides this pacman with the walls in the current gameboard
     * @param stopMove If pacman touches a wall, should this.shouldMove be set to false?
     */
    public collideWalls(stopMove: boolean = true) {
        let [collisionX, collisionY, horizontalOffset, verticalOffset] = this.getCollisionPoints();

        // draw debug wall collision that pacman will collide with
        gameManager.drawManager.drawWallCollision(collisionX+horizontalOffset, collisionY+verticalOffset);
        gameManager.drawManager.drawWallCollision(collisionX-horizontalOffset, collisionY-verticalOffset);

        // go through each block and see if we touch them
        for (let i = 0; i < gameManager.currentBoard.blockPositions.length; i++) {
            let blockData = gameManager.currentBoard.blockPositions[i];

            // skip this block if we are not in it
            if (!(pointIntersectsRect([collisionX+horizontalOffset, collisionY+verticalOffset], blockData) ||
                pointIntersectsRect([collisionX-horizontalOffset, collisionY-verticalOffset], blockData))) continue;

            // move us to an end of the wall depending on our facing direction
            switch (this.movingDirection) {
                case directions.UP:
                    this.y = blockData[1] + blockData[3] + this.radius;
                    break;
                case directions.DOWN:
                    this.y = blockData[1] - this.radius;
                    break;
                case directions.LEFT:
                    this.x = blockData[0] + blockData[2] + this.radius;
                    break;
                case directions.RIGHT:
                    this.x = blockData[0] - this.radius;
                    break;
            }

            // Set the pacman's current mouth frame to 0
            this.animationManager.animations.bodyAnimation.currentFrame = 0;

            // stop the pacman's movement if stopMove is true
            if (stopMove) this.shouldMove = false;

            return;
        }
    }

    /**
     * Draws this pacman
     * @param deltaTime 
     */
    public draw(deltaTime: number) {
        if (this.shouldMove) {
            this.animationManager.animations.bodyAnimation.step_frame(deltaTime);
        }

        if (this.isDead) {
            this.animationManager.animations.killAnimation.step_frame(deltaTime);
            gameManager.drawManager.drawDeadPacman(this.x, this.y, this.radius, this.animationManager.animations.killAnimation.get_frame());
            return;
        }
        
        // create a gradient for this pacman
        const gradient = ctx.createLinearGradient(this.x - this.radius, this.y - this.radius, this.x + this.radius, this.y + this.radius);
        gradient.addColorStop(0, "white");
        gradient.addColorStop(0.225, this.color.gradient_start);
        gradient.addColorStop(0.875,  this.color.gradient_end);
        gradient.addColorStop(1, "black");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "#FFFFFF";
        
        // actually draw the pacman shape
        gameManager.drawManager.drawPacman(this.x, this.y, this.radius, this.animationManager.animations.bodyAnimation.get_frame(), this.facingDirection);
    }

    /**
     * Check to see if this pacman should turn in the queued direction
     */
    public checkQueuedDirection() {
        // get the next node if we were to continue this path
        const currentNode = gameManager.currentBoard.getNextIntersectionNode([this.x, this.y], this.facingDirection);

        // no reason to continue if we are not queueing a direction
        if (this.facingDirection == this.queuedDirection) {
            this.lastQueuedDirectionNode = currentNode;
            return;
        }

        // send a warning if we can't find a node
        if (currentNode == null) {
            console.warn("Unable to find a path intersection node! Player coords:", this.x, this.y);
        }
        
        // no previous node -- this pacman obj was probably just created
        if (this.lastQueuedDirectionNode == null) {
            this.lastQueuedDirectionNode = currentNode;

            // if we don't have a current node or a past node, allow any queued direction changes
            if (currentNode == null) {
                this.facingDirection = this.queuedDirection;
                this.shouldMove = true;
                return;
            }

            return;
        }

        // check if this node allows us to turn in our queued direction
        // so we don't turn on a node that would make us face a wall
        if (!this.lastQueuedDirectionNode.node.directions[this.queuedDirection.enumValue]) {
            this.lastQueuedDirectionNode = currentNode;
            return;
        }

        // Get the direction that the next node would be in
        const checkDirection = this.facingDirection.enumValue % 2 == 0 ? "x" : "y" as "x"|"y";
        const otherCheckDirection =  this.facingDirection.enumValue % 2 == 0 ? "y" : "x" as "x"|"y";
        const checkOrientation = this.facingDirection.enumValue < 2 ? -1 : 1;

        // node is too far apart radius-wise
        if (Math.abs(this[otherCheckDirection]-this.lastQueuedDirectionNode.node[otherCheckDirection]) != 0) {
            this.lastQueuedDirectionNode = currentNode;
            return;
        }
        
        // check to see if we passed the node
        const distanceToNode = (this[checkDirection]-this.lastQueuedDirectionNode.node[checkDirection]) * checkOrientation;
        if (distanceToNode > 0) {
            this.lastQueuedDirectionNode = currentNode;
            return;
        }
        
        // we just passed the node! make a turn.
        [this.x, this.y] = [this.lastQueuedDirectionNode.node.x, this.lastQueuedDirectionNode.node.y];
        this.facingDirection = this.queuedDirection;
        this.shouldMove = true;
        this.lastQueuedDirectionNode = currentNode;
    }

    /**
     * Handle collision with any remote pacman
     * @returns Did we collide with another pacman?
     */
    public collideRemotePacman() {
        // skip if we are in our bump animation
        if (this.animationManager.animations.bumpAnimation.isActive()) {
            return false;
        }

        // loop through each remote player
        for (let remotePlayerSession in gameManager.remotePlayers) {
            let remotePlayer = gameManager.remotePlayers[remotePlayerSession];

            if (remotePlayer.pacman.animationManager.animations.bumpAnimation.isActive()) {
                continue;
            }

            // determine if we should bump this remote pacman
            let allowedDistance = this.radius + remotePlayer.pacman.radius;
            if (Math.abs(remotePlayer.pacman.x-this.x) > allowedDistance || Math.abs(remotePlayer.pacman.y-this.y) > allowedDistance) {
                continue;
            }

            // tell the server that we just bumped this remote pacman
            gameManager.connectionManager.triggerBump(this, remotePlayer.session);
            return true;
        }

        return false;
    }

    public kill() {
        this.isDead = true;
        this.animationManager.animations.killAnimation.reset();
    }

    /**
     * Start the bump animation
     * @param collisionFrom The direction that the collision came from
     */
    public triggerBump(collisionFrom: Direction) {
        this.animationManager.animations.bumpAnimation.reset();
        this.animationManager.animations.bumpAnimation.setActive(true);

        this.facingDirection = collisionFrom;

        this.animationManager.animations.bumpAnimation.meta = {
            moveDirection: collisionFrom.getOpposite()
        };
    }

    /**
     * Handle the bump animation
     * @param deltaTime 
     * @returns Is the bump animation still active?
     */
    public bumpAnimation(deltaTime: number) {
        if (!this.animationManager.animations.bumpAnimation.isActive()) return;

        // calculate the distance that we should move
        let beforeFrame = this.animationManager.animations.bumpAnimation.currentFrame;
        this.animationManager.animations.bumpAnimation.step_frame(deltaTime);
        let frameChange = this.animationManager.animations.bumpAnimation.currentFrame - beforeFrame;

        // set our moving direction to the move direction of the animation
        this.movingDirection = this.animationManager.animations.bumpAnimation.meta.moveDirection;

        // move the pacman in the moving direction
        [this.x, this.y] = this.getPositionAhead(frameChange);

        // handle if we just finished the bump animation
        if (this.animationManager.animations.bumpAnimation.isDone()) {
            // collide with walls, send our current position, and disable the animation
            this.collideWalls();
            gameManager.connectionManager.sendPosition(this);
            this.animationManager.animations.bumpAnimation.setActive(false);
            return false;
        }

        return true;
    }

    /**
     * Handle user inputs to the pacman's movement
     */
    public inputDirection() {
        // go through each key and handle if we press it
        for (let i = 0; i < gameManager.inputManager.downKeys.length; i++) {
            let value = gameManager.inputManager.downKeys[i];

            if (!value) continue;

            this.shouldMove = true;
            const thisDirection = Direction.fromEnum(i) as Direction;

            // cancel any queued movement if we repress the direction we are moving in
            if (thisDirection == this.facingDirection) {
                this.queuedDirection = thisDirection;
                break;
            }

            // if we want to move in the opposite direction then do that
            if (thisDirection.getOpposite()?.enumValue == this.facingDirection.enumValue) {
                this.facingDirection = thisDirection;
                this.queuedDirection = thisDirection;
                break;
            }

            // queue this direction
            this.queuedDirection = thisDirection;
            break;
        }
    }

    /**
     * Steps the movement one frame and handles input
     * @param deltaTime 
     * @returns 
     */
    public stepMovement(deltaTime: number) {
        const lastDirection = this.facingDirection;
        const lastQueuedDirection = this.queuedDirection;
        const lastShouldMove = this.shouldMove;

        if (this.isDead) this.shouldMove = false;
        
        // handle player input and remote pacman collision
        if (this.isLocal) {
            this.inputDirection();
            this.collideRemotePacman();
        }

        // weird bump mechanics caused by checking direction?
        if (((!gameManager.performanceMode) || this.isLocal)) {
            this.checkQueuedDirection();
        }
        
        // handle if we are active in the bump animation
        if (this.bumpAnimation(deltaTime)) {
            this.collideWalls(false);
            this.movingLastFrame = this.shouldMove;
            return;
        }

        // if we shouldn't move, set our animation frame to 0
        if (!this.shouldMove) {
            this.animationManager.animations.bodyAnimation.currentFrame = 0;
            this.movingLastFrame = this.shouldMove;
            return;
        }

        // set our moving direction to the facing direction
        this.movingDirection = this.facingDirection;

        // Move this pacman ahead and collide with walls
        [this.x, this.y] = this.getPositionAhead(this.movementSpeed * deltaTime);
        this.collideWalls();

        if (this.isLocal) {
            // todo: find a server side way of doing this
            for (let id of Object.keys(gameManager.ghosts)) {
                const ghost = gameManager.ghosts[id];
    
                // todo: include ghost radius
                if (Math.abs(ghost.x-this.x) + Math.abs(ghost.y-this.y) <= this.radius*2) {
                    this.kill();
                    break;
                }
            }
        }

        // determine if we should send our new position
        if (((!(lastDirection == this.facingDirection && lastQueuedDirection == this.queuedDirection)) || this.shouldMove != lastShouldMove) && this.isLocal) {
            gameManager.connectionManager.sendPosition(this);
        }

        // collide with pellets if this is our client's pacman
        if (this.isLocal) this.collidePellets();

        this.movingLastFrame = this.shouldMove;
    }
}