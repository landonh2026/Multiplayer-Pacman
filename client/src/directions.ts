class Direction {
    asString: string;
    enumValue: 0|1|2|3;

    constructor(asString: string, enumValue: 0|1|2|3) {
        this.asString = asString;
        this.enumValue = enumValue;
    }

    /**
     * Get the normalized direction delta for the given direction
     * @returns The direction delta
     */
    public getDeltas(): {dx: number, dy: number} {
        switch (this.enumValue) {
            case 0: return {dx: 1, dy: 0}
            case 1: return {dx: 0, dy: 1}
            case 2: return {dx: -1, dy: 0}
            case 3: return {dx: 0, dy: -1}
        }
    }
    
    /**
     * Get a direction object from a string
     * @param value The string to get the direction of
     * @returns The direction found
     */
    static fromString(value: string): Direction|undefined {
        for (let key in directions) {
            let d = directions[key as keyof typeof directions];
            
            if (d.asString == value) {
                return d;
            }
        }
    }

    /**
     * Get a direction object form a number (0 is right, 1 is down, 2 is left, 3 is up)
     * @param value The number representing the direction to search for
     * @returns The direction found
     */
    static fromEnum(value: number): Direction|undefined {
        for (let key in directions) {
            let d = directions[key as keyof typeof directions];
            
            if (d.enumValue == value) {
                return d;
            }
        }
    }

    /**
     * Get the opposite direction
     */
    public getOpposite() {
        return Direction.fromEnum((this.enumValue+2)%4);
    }

    /**
     * Get a random direction
     */
    static getRandom(): Direction {
        return Direction.fromEnum(getRandomInt(0, 3)) as Direction;
    }
}

var directions = {
    RIGHT: new Direction("right", 0),
    DOWN: new Direction("down", 1),
    LEFT: new Direction("left", 2),
    UP: new Direction("up", 3),
}