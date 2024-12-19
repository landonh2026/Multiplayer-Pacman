/**
 * The manager for handling user inputs through the webpage
 */
class InputManager {
    /** The list of directional keys that are currently pressed. [right, down, left, up] */
    downKeys: [boolean, boolean, boolean, boolean];

    static keyRawToInput = {
        "w": directions.UP,
        "arrowup": directions.UP,
    
        "s": directions.DOWN,
        "arrowdown": directions.DOWN,
    
        "a": directions.LEFT,
        "arrowleft": directions.LEFT,
    
        "d": directions.RIGHT,
        "arrowright": directions.RIGHT
    };

    constructor() {
        this.downKeys = [false, false, false, false];

        document.addEventListener("keydown", this.onKeyDown.bind(this));
        document.addEventListener("keyup", this.onKeyUp.bind(this));
    }

    /**
     * Event called when a key is pressed
     * @param event The event telling us which key was pressed
     */
    public onKeyDown(event: KeyboardEvent) {
        if (!(event.key.toLowerCase() in InputManager.keyRawToInput)) {
            return;
        }
    
        const key = InputManager.keyRawToInput[event.key.toLowerCase() as keyof typeof InputManager.keyRawToInput];
        this.downKeys[key.enumValue] = true;
    }

    /**
     * Event called when a key is released
     * @param event The event telling us which key was released
     */
    public onKeyUp(event: KeyboardEvent) {
        if (!(event.key.toLowerCase() in InputManager.keyRawToInput)) {
            return;
        }
    
        const key = InputManager.keyRawToInput[event.key.toLowerCase() as keyof typeof InputManager.keyRawToInput];
        this.downKeys[key.enumValue] = false;
    }
}