class Pacman {
    x: number;
    y: number;
    color: PacmanColor;
    facingDirection: Direction;
    movingDirection: Direction;
    queuedDirection: Direction;
    radius: number;
    visualRadius: number;
    movementSpeed: number;
    shouldMove: boolean;
    movingLastFrame: boolean;
    isDead: boolean;
    score: number;
    isLocal: boolean;
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

        this.animationManager.animations.bodyAnimation.setActive(true);
    }

    /**
     * Get the position that is ahead a certain number of pixels
     * @param distance 
     * @param direction 
     * @returns 
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

            if (Math.abs(this.x-pellet[0]) < this.radius && Math.abs(this.y-pellet[1]) < this.radius) {
                if (pellet[3] == PELLET_STATES.EAT_PENDING) {
                    break;
                }
                // gameManager.currentBoard.pellets.splice(i, 1);
                pellet[3] = PELLET_STATES.EAT_PENDING;
                gameManager.connectionManager.eatPellet(this, pellet[2]);
                // gameManager.infoBoard.addScore(10);
                break;
            }
        }
    }

    /**
     * Calculates 2 collision points to check to see if the pacman is colliding with a wall
     * @param direction 
     * @param distanceFromPacman 
     * @returns 
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
     * Collides this pacman with the walls on the current stage
     * @param stopMove If pacman touches a wall, should this.shouldMove be set to false?
     * @returns 
     */
    public collideWalls(stopMove: boolean = true) {
        let [collisionX, collisionY, horizontalOffset, verticalOffset] = this.getCollisionPoints();

        // drawManager.drawWallCollision(collisionX, collisionY);
        gameManager.drawManager.drawWallCollision(collisionX+horizontalOffset, collisionY+verticalOffset);
        gameManager.drawManager.drawWallCollision(collisionX-horizontalOffset, collisionY-verticalOffset);

        for (let i = 0; i < gameManager.currentBoard.blockPositions.length; i++) {
            let blockData = gameManager.currentBoard.blockPositions[i];

            if (!(pointIntersectsRect([collisionX+horizontalOffset, collisionY+verticalOffset], blockData) ||
                pointIntersectsRect([collisionX-horizontalOffset, collisionY-verticalOffset], blockData))) continue;

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

            // console.log(this.x, this.y);
            
            this.animationManager.animations.bodyAnimation.currentFrame = 0;
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
        
        // ctx.fillStyle = this.color.color;
        const gradient = ctx.createLinearGradient(this.x - this.radius, this.y - this.radius, this.x + this.radius, this.y + this.radius);
        gradient.addColorStop(0, "white");
        gradient.addColorStop(0.225, this.color.gradient_start);
        gradient.addColorStop(0.875,  this.color.gradient_end);
        gradient.addColorStop(1, "black");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = "#FFFFFF";
        
        // console.log(ctx.fillStyle, ctx.strokeStyle);
        gameManager.drawManager.drawPacman(this.x, this.y, this.radius, this.animationManager.animations.bodyAnimation.get_frame(), this.facingDirection);
    }

    public checkQueuedDirection() {
        // get the next node if we were to continue this path
        const currentNode = gameManager.currentBoard.getNextIntersectionNode([this.x, this.y], this.facingDirection);

        // console.log(currentNode, this.lastQueuedDirectionNode);
        // console.log(this.facingDirection.asString, this.queuedDirection.asString);

        // no reason to continue if we are not queueing a dir
        if (this.facingDirection == this.queuedDirection) {
            this.lastQueuedDirectionNode = currentNode;
            return;
        }

        // send a warning if we can't find a node
        if (currentNode == null) {
            console.warn("Unable to find a path intersection node! Player coords:", this.x, this.y);
            // return;
        }
        
        // no previous node -- probably just started
        if (this.lastQueuedDirectionNode == null) {
            this.lastQueuedDirectionNode = currentNode;

            if (currentNode == null) {
                this.facingDirection = this.queuedDirection;
                this.shouldMove = true;
                return;
            }

            return;
        }

        // check if this node allows us to turn in our queued direction
        if (!this.lastQueuedDirectionNode.node.directions[this.queuedDirection.enumValue]) {
            this.lastQueuedDirectionNode = currentNode;
            return;
        }

        // if (this.lastQueuedDirectionNode)

        // declare constants
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

    public collideRemotePacman() {
        if (this.animationManager.animations.bumpAnimation.isActive()) {
            return false;
        }

        for (let remotePlayerSession in gameManager.remotePlayers) {
            let remotePlayer = gameManager.remotePlayers[remotePlayerSession];

            if (remotePlayer.pacman.animationManager.animations.bumpAnimation.isActive()) {
                continue;
            }

            let allowedDistance = this.radius + remotePlayer.pacman.radius;
            if (Math.abs(remotePlayer.pacman.x-this.x) > allowedDistance || Math.abs(remotePlayer.pacman.y-this.y) > allowedDistance) {
                continue;
            }

            gameManager.connectionManager.triggerBump(this, remotePlayer.session);
            // this.triggerBump(remotePlayer.pacman.facingDirection);
            return true;
        }

        return false;
    }

    public triggerBump(collisionFrom: Direction) {
        this.animationManager.animations.bumpAnimation.reset();
        this.animationManager.animations.bumpAnimation.setActive(true);

        this.facingDirection = collisionFrom;

        this.animationManager.animations.bumpAnimation.meta = {
            moveDirection: collisionFrom.getOpposite()
        };
    }

    public bumpAnimation(deltaTime: number) {
        if (!this.animationManager.animations.bumpAnimation.isActive()) return;

        let beforeFrame = this.animationManager.animations.bumpAnimation.currentFrame;
        this.animationManager.animations.bumpAnimation.step_frame(deltaTime);
        let frameChange = this.animationManager.animations.bumpAnimation.currentFrame - beforeFrame;

        this.movingDirection = this.animationManager.animations.bumpAnimation.meta.moveDirection;

        [this.x, this.y] = this.getPositionAhead(frameChange);

        if (this.animationManager.animations.bumpAnimation.isDone()) {
            this.collideWalls();
            gameManager.connectionManager.sendPosition(this);
            this.animationManager.animations.bumpAnimation.setActive(false);
            return false;
        }

        return true;
    }

    public inputDirection() {
        for (let i = 0; i < gameManager.inputManager.downKeys.length; i++) {
            let value = gameManager.inputManager.downKeys[i];

            if (value) {
                this.shouldMove = true;
                const thisDirection = Direction.fromEnum(i) as Direction;

                if (thisDirection == this.facingDirection) {
                    this.queuedDirection = thisDirection;
                    break;
                }

                if (thisDirection.getOpposite()?.enumValue == this.facingDirection.enumValue) {
                    this.facingDirection = thisDirection;
                    this.queuedDirection = thisDirection;
                    break;
                }

                this.queuedDirection = thisDirection;
                break;
            }
        }
    }

    /**
     * Steps the movement one frame
     * @param deltaTime 
     * @returns 
     */
    public stepMovement(deltaTime: number) {
        const lastDirection = this.facingDirection;
        const lastQueuedDirection = this.queuedDirection;
        const lastShouldMove = this.shouldMove;
        
        if (this.isLocal) {
            this.inputDirection();
        }

        if (((!gameManager.performanceMode) || this.isLocal)) {
            this.checkQueuedDirection();
        }

        if (this.isLocal) {
            this.collideRemotePacman();
        }
        
        if (this.bumpAnimation(deltaTime)) {
            this.collideWalls(false);
            this.movingLastFrame = this.shouldMove;
            return;
        }

        if (!this.shouldMove) {
            this.animationManager.animations.bodyAnimation.currentFrame = 0;
            this.movingLastFrame = this.shouldMove;
            return;
        }

        this.movingDirection = this.facingDirection;

        [this.x, this.y] = this.getPositionAhead(this.movementSpeed * deltaTime);
        this.collideWalls();

        const shouldSendUpdate = ((!(lastDirection == this.facingDirection && lastQueuedDirection == this.queuedDirection)) || this.shouldMove != lastShouldMove) && this.isLocal;
        // const shouldSendUpdate = (!(lastDirection == this.facingDirection && lastQueuedDirection == this.queuedDirection)) && this.isLocal;
        if (shouldSendUpdate) {
            gameManager.connectionManager.sendPosition(this);
        }

        if (this.isLocal) this.collidePellets();

        this.movingLastFrame = this.shouldMove;
    }
}