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

    public draw() {
        gameManager.drawManager.drawGhost(this.x, this.y, this.facingDirection || directions.RIGHT);
    }

    /**
     * Get the position that is ahead a certain number of pixels
     * @param distance 
     * @param direction 
     * @returns 
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

    public facePath() {
        if (this.path == null) {
            console.error("Path is null, not turning ...");
            return;
        }

        if (this.path.nodes.length == 1) {
            if (this.target == null) {
                console.error("target is null, not turning ...");
                return;
            }

            this.facingDirection = gameManager.currentBoard.pathfinder.getTurnDirection({x: this.x, y: this.y}, this.target) as Direction;

            return;
        }
    
        this.facingDirection = gameManager.currentBoard.pathfinder.getTurnDirection(this.path.nodes[0], this.path.nodes[1]) as Direction;
    }

    public shouldUpdatePath(pos: {x: number, y: number}) {
        // return true; // ignore other logic for new system

        if (this.lastTargetDistanceCheck == null) {
            this.lastTargetDistanceCheck = pos;
            return true;
        }

        // @ts-ignore
        const targetDistanceFromLastKnown = Math.abs(pos.x-this.lastTargetDistanceCheck.x) + Math.abs(pos.y-this.lastTargetDistanceCheck.y);
        const ghostDistanceFromTarget = Math.abs(pos.x-this.x) + Math.abs(pos.y-this.y);

        // console.log(targetDistanceFromLastKnown);

        // console.log(ghostDistanceFromTarget);

        if (targetDistanceFromLastKnown > gameManager.tileSize * 4 || ghostDistanceFromTarget < gameManager.tileSize * 4) {
            this.lastTargetDistanceCheck = pos;
            return true;
        }

        return false;
    }

    private getFullPath() {
        if (this.target == null) return;

        this.path = gameManager.currentBoard.pathfinder.findPathWithCoordinates({x: this.x, y: this.y}, this.target);
    }

    private getPartialPath() {
        if (this.target == null || this.path == null) return;

        const generatedPath = gameManager.currentBoard.pathfinder.findPathWithCoordinates(
            {x: this.path.nodes[this.path.nodes.length - 1].x, y: this.path.nodes[this.path.nodes.length - 1].y},
            this.target
        );

        if (generatedPath == null) {
            console.error("Unable to generate new path");
            return;
        }

        this.path.nodes.pop();
        this.path.nodes.push(...generatedPath.nodes);
    }

    public getPath() {
        this.generatingPath = true;
        // this.numTimesSinceLastFullGen++;
        // console.log("got path");

        this.target = {x: gameManager.localPacman.x, y: gameManager.localPacman.y};

        if (this.target.x == this.x && this.target.y == this.y) {
            this.path = null;
            this.generatingPath = false;
            return;
        }
        
        if (this.shouldUpdatePath(this.target)) {
            this.getFullPath();
        } else {
            // this.getPartialPath();
        }

        if (this.path == null) {
            [this.x, this.y] = [this.target.x, this.target.y];
            console.error("Can't find path to pacman!");
            this.generatingPath = false;
            return;
        }

        if (this.path.nodes.length == 1) {
            // we are already on our target
            this.generatingPath = false;
            return;
        }

        this.facePath();

        if (this.x == this.path.nodes[0].x && this.y == this.path.nodes[0].y) {
            this.path.nodes.shift();
        }

        this.generatingPath = false;
    }

    public checkPassedNode() {
        if (this.path == null) {
            console.error("'path' attribute is not defined!");
            return;
        }

        if (this.target == null) return;

        if (this.facingDirection == null) {
            this.facePath();
            return;
        }

        // declare constants
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

    public stepMovement(deltaTime: number) {
        if (this.generatingPath) {
            this.path?.draw();
            return;
        }

        if (this.path != null) [this.x, this.y] = this.getPositionAhead(this.movementSpeed * deltaTime);
            
        if (this.path == null) {
            // @ts-ignore
            setTimeout(async () => 
            {
                this.getPath();
            }, 0);
            
            // this.path?.draw();
            return;
        }

        this.path?.draw();

        this.checkPassedNode();
    }
}