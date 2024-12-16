import type { Server, ServerWebSocket } from "bun";
const crypto = require("crypto");
import * as utils from "./utils.js";
import * as globals from "./globals.js";
import {GameBoard, gameBoards} from "./gameBoard.js";
import {Room} from "./room.js";

const rooms: Room[] = [];
const sessionToRoom: {[session: string]: Room} = {};

const socketURL = "/gamesocket";

const server = Bun.serve({
    port: 8080,
    hostname: "0.0.0.0",

    fetch: fetch,
    websocket: {
      message,
      open,
      close,
      drain
    }
});

function log(this: ServerWebSocket<globals.SocketData>, ...data: any[]) {
    console.log(`[${this.data.session}]`, ...data);
}

async function fetch(req: Request, server: Server) {
    const url = new URL(req.url);
    console.log(url.pathname);

    if (url.pathname == socketURL) {
        if (server.upgrade(req)) {
            return;
        }
    
        return new Response("Upgrade failed", { status: 500 });
    }

    if (url.pathname.includes("..")) return new Response("Invalid Request", { status: 400 });
    if (url.pathname == "/") url.pathname = "/index.html";

    const file = Bun.file("../client/" + url.pathname);

    if (!await file.exists()) return new Response("File Not Found", { status: 404 });

    return new Response(file, {
        headers: {
            "Content-Type": file.type
        }
    });
}

function open(ws: ServerWebSocket<globals.SocketData>) {
    ws.data = { session: crypto.randomUUID().toString(), log: log };
    ws.data.log = ws.data.log.bind(ws);

    let roomToJoin = rooms[rooms.length - 1];

    if (roomToJoin == undefined || roomToJoin.isFull()) {
        roomToJoin = new Room(server, crypto.randomUUID().toString());
        rooms.push(roomToJoin);
        console.log(`[${roomToJoin.uuid}] Created new room!`);
    }

    roomToJoin.handlePlayerJoin(ws);
    sessionToRoom[ws.data.session] = roomToJoin;
}

function close(ws: ServerWebSocket<globals.SocketData>, code: number, message: string) {
    ws.data.log(`Closed connection (${code}).`);

    const room = sessionToRoom[ws.data.session];

    room.handlePlayerLeave(ws.data.session);
    delete sessionToRoom[ws.data.session];

    if (room.shouldClose()) {
        console.log(`[${room.uuid}] Room closing ...`);
        room.closeRoom();
        utils.removeFromList(rooms, room);
    }
}

function message(ws: ServerWebSocket<globals.SocketData>, message: string | Buffer) {
    // ws.data.log(`Received message: ${message}`);

    const parsed = JSON.parse(message as string);
    parsed["from-session"] = ws.data.session;

    const room = sessionToRoom[ws.data.session];

    room.handleMessage(ws.data.session, parsed);
}

function drain(ws: ServerWebSocket<globals.SocketData>) {
    ws.data.log("Draining connection.");
}

console.log(`Serving on ${server.url}`);