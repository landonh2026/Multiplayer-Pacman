class Ghost {
    x: number;
    y: number;
    movementSpeed: number;
    facingDirection: Direction|null;
    path: Path|null;
    collisionRadius: number;
    target: {x: number, y: number}|null;
    generatingPath: boolean;
    lastTargetDistanceCheck: {x: number, y: number}|null;
    // numTimesSinceLastFullGen: number;
    
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.movementSpeed = 4;
        this.facingDirection = null;
        this.collisionRadius = 20; // TODO: change to tile size
        
        this.path = null;
        this.target = null;

        this.lastTargetDistanceCheck = null;
        // this.numTimesSinceLastFullGen = 0;
        
        this.generatingPath = false;
    }

    /**
     * Draw this ghost
     */
    public draw() {
        gameManager.drawManager.drawGhost(this.x, this.y, this.facingDirection || directions.RIGHT);
    }

    /**
     * Get the position that is ahead a certain number of pixels
     * @param distance The distance representing how far to move
     * @param direction The direction to check in
     * @returns The new position
     */
    public getPositionAhead(distance: number, direction: Direction|null = null): [number, number] {
        if (!direction) direction = this.facingDirection;

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
     * Face the path for visuals
     */
    public facePath() {
        if (this.path == null) {
            console.error("Path is null, not turning ...");
            return;
        }

        // if the path's length is 1, look at the target
        if (this.path.nodes.length == 1) {
            if (this.target == null) {
                console.error("target is null, not turning ...");
                return;
            }

            this.facingDirection = gameManager.currentBoard.pathfinder.getTurnDirection({x: this.x, y: this.y}, this.target) as Direction;

            return;
        }
    
        // turn towards the moving direction
        this.facingDirection = gameManager.currentBoard.pathfinder.getTurnDirection(this.path.nodes[0], this.path.nodes[1]) as Direction;
    }

    /**
     * Determine if the path should be updated
     * @param pos The position of the ghost
     * @returns Should the current path/goal be updated?
     */
    public shouldUpdatePath(pos: {x: number, y: number}) {
        if (this.lastTargetDistanceCheck == null) {
            this.lastTargetDistanceCheck = pos;
            return true;
        }

        // @ts-ignore
        // get the distance that the target has moved and the ghost's distance form the target
        const targetDistanceFromLastKnown = Math.abs(pos.x-this.lastTargetDistanceCheck.x) + Math.abs(pos.y-this.lastTargetDistanceCheck.y);
        const ghostDistanceFromTarget = Math.abs(pos.x-this.x) + Math.abs(pos.y-this.y);

        // If we are close enough to the player, update the path
        // or if the player has also moved far enough, update the path
        if (targetDistanceFromLastKnown > gameManager.tileSize * 4 || ghostDistanceFromTarget < gameManager.tileSize * 4) {
            this.lastTargetDistanceCheck = pos;
            return true;
        }

        return false;
    }

    /**
     * Get the full path to the target
     */
    private getFullPath() {
        if (this.target == null) return;

        // Get the path to the target
        this.path = gameManager.currentBoard.pathfinder.findPathWithCoordinates({x: this.x, y: this.y}, this.target);
    }

    /**
     * Get the path to the target
     */
    public getPath() {
        this.generatingPath = true;
        this.target = {x: gameManager.localPacman.x, y: gameManager.localPacman.y};

        // if we are overlapping the target, don't do anything
        if (this.target.x == this.x && this.target.y == this.y) {
            this.path = null;
            this.generatingPath = false;
            return;
        }
        
        // if we should update our path to the target, do it
        if (this.shouldUpdatePath(this.target)) {
            this.getFullPath();
        }

        // if we can't find a path to pacman, though an error
        if (this.path == null) {
            [this.x, this.y] = [this.target.x, this.target.y];
            console.error("Can't find path to pacman!");
            this.generatingPath = false;
            return;
        }

        // If we are already on the target, don't do anything
        if (this.path.nodes.length == 1) {
            this.generatingPath = false;
            return;
        }

        // face in the direction of the path or target
        this.facePath();

        // remove the first pathnode if are are on it
        if (this.x == this.path.nodes[0].x && this.y == this.path.nodes[0].y) {
            this.path.nodes.shift();
        }

        this.generatingPath = false;
    }

    /**
     * Check to see if we passed a movement node
     */
    public checkPassedNode() {
        if (this.path == null) {
            console.error("Path is null!");
            return;
        }

        if (this.target == null) return;

        if (this.facingDirection == null) {
            this.facePath();
            return;
        }

        // Get the direction that the next node would be in
        const checkDirection = this.facingDirection.enumValue % 2 == 0 ? "x" : "y" as "x"|"y";
        const otherCheckDirection =  this.facingDirection.enumValue % 2 == 0 ? "y" : "x" as "x"|"y";
        let checkOrientation = this.facingDirection.enumValue < 2 ? -1 : 1;

        // node is too far apart radius-wise
        if (Math.abs(this[otherCheckDirection]-this.path.nodes[0][otherCheckDirection]) != 0) {
            this.facePath();

            return;
        }

        // check to see if we passed the node
        const distanceToNode = (this[checkDirection]-this.path.nodes[0][checkDirection]) * checkOrientation;
        if (distanceToNode > 0) {
            return;
        }

        // we just passed the node! make a turn.
        [this.x, this.y] = [this.path.nodes[0].x, this.path.nodes[0].y];

        // TODO: pass distanceToNode check earlier and generate the path in a different thread
        // in order to not have stuttering
        this.getPath();
    }

    /**
     * Step the movement of the ghost
     * @param deltaTime 
     * @returns 
     */
    public stepMovement(deltaTime: number) {
        if (this.generatingPath) return;

        // move ahead our movement speed
        if (this.path != null) [this.x, this.y] = this.getPositionAhead(this.movementSpeed * deltaTime);
        
        // find the path if we have not found it yet
        if (this.path == null) {
            this.getPath();
            return;
        }

        // draw the path
        this.path?.draw();

        // check to see if we passed a movement node
        this.checkPassedNode();
    }
}