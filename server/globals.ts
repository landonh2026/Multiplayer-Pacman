import {Block} from "./gameBoard.ts";

type SocketData = { session: string, log: Function };
type Colors = "YELLOW"|"RED"|"PINK"|"BLUE";
type PositionData = { [x: string]: any; x: number, y: number, facingDirection: 0|1|2|3, queuedDirection: number, shouldMove: boolean, packetIndex: number };
type PacmanNextWallCollision = { wallObject: Block, distance: number, position: {x: number, y: number} };

const tile_size = 40;
const target_client_fps = 24;
const colors = ["YELLOW", "RED", "PINK", "BLUE"];
const topics = { event: "game-event" };

// TODO: power up should last a variable amount of time depending on how long the round has been going
//  ^ also movement speed eventually
const animation_timings = {
    kill: 41 / target_client_fps * 1000,
    power_up: 5 * 1000,
};

const debug = true;

export {colors, topics, target_client_fps, tile_size, debug, animation_timings};
export type {SocketData, Colors, PositionData, PacmanNextWallCollision};