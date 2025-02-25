type SocketData = { session: string, log: Function };
type Colors = "YELLOW"|"RED"|"PINK"|"BLUE";
type PositionData = {
    [x: string]: any; x: number, y: number, facingDirection: 0|1|2|3, queuedDirection: number, shouldMove: boolean, packetIndex: number
};
type PacmanNextWallCollision = {
    wallObject: [number, number, number, number], distance: number, position: {x: number, y: number}
}

const tile_size = 40;
const target_client_fps = 24;
const colors = ["YELLOW", "RED", "PINK", "BLUE"];
const topics = {
    event: "game-event"
};

export {colors, topics, target_client_fps, tile_size};
export type {SocketData, Colors, PositionData, PacmanNextWallCollision};