class InputManager {
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

        // setInterval(() => {
        //     for (let i = 0; i < this.downKeys.length; i++) {
        //         this.downKeys[i] = false;
        //     }
        //     this.downKeys[Math.floor(Math.random()*4)] = true;
        // }, 500);
    }

    public onKeyDown(event: KeyboardEvent) {
        if (!(event.key.toLowerCase() in InputManager.keyRawToInput)) {
            return;
        }
    
        const key = InputManager.keyRawToInput[event.key.toLowerCase() as keyof typeof InputManager.keyRawToInput];
        this.downKeys[key.enumValue] = true;
    }

    public onKeyUp(event: KeyboardEvent) {
        if (!(event.key.toLowerCase() in InputManager.keyRawToInput)) {
            return;
        }
    
        const key = InputManager.keyRawToInput[event.key.toLowerCase() as keyof typeof InputManager.keyRawToInput];
        this.downKeys[key.enumValue] = false;
    }
}