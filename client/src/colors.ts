/**
 * Represents a color that a pacman can be
 */
class PacmanColor {
    /** The fill color for this pacman */
    color: string;

    /** The gradient start color for this pacman */
    gradient_start: string;

    /** The gradient end color for this pacman */
    gradient_end: string;

    constructor(color: string, gradient_start: string, gradient_end: string) {
        this.color = color;

        this.gradient_start = gradient_start;
        this.gradient_end = gradient_end;
    }
}

const ENTITY_STATE_COLORS = {
    FRIGHTENED: "#612196",
    FRIGHTENED_BRIGHT: "#7c35b7",
    FRIGHTENED_DARK: "#612196"
};

/** General environmental colors */
const ENVIRONMENT_COLORS = {
    TEXT: "white",
    BACKGROUND: "rgb(1, 1, 0)",
    WALL: "rgb(33, 32, 254)",
    PELLET: "#fab8b1",
    DARK_PELLET: "rgb(94, 64, 61)"
};

/** Ghost colors */
const GHOST_COLORS = {
    PINK: "#e36dda",
    RED: "#dd1f09",
    BLUE: "#00b2d9",
    YELLOW: "#ddc300"
};

/** Pacman colors */
const PACMAN_COLORS = {
    PINK: new PacmanColor("#e36dda", "#e090d8", "#d32197"),
    RED: new PacmanColor("#dd1f09", "#e84333", "#8d0c0b"),
    BLUE: new PacmanColor("#00b2d9", "#3bbfe6", "#0068ca"),
    YELLOW: new PacmanColor("#ddc300", "#dec200", "#d99a00")
};
