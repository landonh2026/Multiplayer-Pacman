class PacmanColor {
    color: string;
    gradient_start: string;
    gradient_end: string;

    constructor(color: string, gradient_start: string, gradient_end: string) {
        this.color = color;

        this.gradient_start = gradient_start;
        this.gradient_end = gradient_end;
    }
}

const ENVIRONMENT_COLORS = {
    TEXT: "white",
    BACKGROUND: "rgb(1, 1, 0)",
    WALL: "rgb(33, 32, 254)",
    PELLET: "rgb(250, 184, 177)"
};

const GHOST_COLORS = {
    PINKY: "rgb(253, 180, 255)"
}

const PACMAN_COLORS = {
    PINK: new PacmanColor("#e36dda", "#e090d8", "#d32197"),
    RED: new PacmanColor("#dd1f09", "#e84333", "#8d0c0b"),
    BLUE: new PacmanColor("#00b2d9", "#3bbfe6", "#0068ca"),
    YELLOW: new PacmanColor("#ddc300", "#dec200", "#d99a00")
};
