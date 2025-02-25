import type { Server, ServerWebSocket } from "bun";
const crypto = require("crypto");
import * as utils from "./utils.ts";
import * as globals from "./globals.ts";
import {GameBoard, gameBoards} from "./gameBoard.ts";
import {Room} from "./room.ts";

// the rooms and a dictionary for client sessions to rooms
const rooms: Room[] = [];
const sessionToRoom: {[session: string]: Room} = {};

// the ws url
const socketURL = "/gamesocket";

// create a server serving a websocket and fetch url
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

/**
 * Handles fetch data from a client
 * @param req The request context
 * @param server The server context
 * @returns The request response
 */
async function fetch(req: Request, server: Server) {
    const url = new URL(req.url);
    console.log(url.pathname);

    // if this is the socket url, upgrade it to a ws
    if (url.pathname == socketURL) {
        if (server.upgrade(req)) {
            return;
        }
    
        return new Response("Upgrade failed", { status: 500 });
    }

    // don't allow requests that include ".."
    // forward "/" requests to "/index.html"
    if (url.pathname.includes("..")) return new Response("Invalid Request", { status: 400 });
    if (url.pathname == "/") url.pathname = "/index.html";

    // get the file and return it to the client
    const file = Bun.file("../client/" + url.pathname);

    if (!await file.exists()) return new Response("File Not Found", { status: 404 });

    return new Response(file, {
        headers: {
            "Content-Type": file.type
        }
    });
}

/**
 * Function that handles a ws opening with a client
 * @param ws The ws context
 */
function open(ws: ServerWebSocket<globals.SocketData>) {
    // give the ws a session and log function
    ws.data = { session: crypto.randomUUID().toString(), log: log };
    ws.data.log = ws.data.log.bind(ws);

    // get the room to join
    let roomToJoin = rooms[rooms.length - 1];

    // if this room does not exist or is full, make a new one
    if (roomToJoin == undefined || roomToJoin.isFull()) {
        roomToJoin = new Room(server, crypto.randomUUID().toString());
        rooms.push(roomToJoin);
        console.log(`[${roomToJoin.uuid}] Created new room!`);
    }

    // handle a player joining this room in the server's context
    roomToJoin.handlePlayerJoin(ws);
    sessionToRoom[ws.data.session] = roomToJoin;
}

/**
 * Handle a client ws connection closing
 * @param ws The ws context
 * @param code The code representing the closing reason
 * @param message A message potentially containing the closing reason
 */
function close(ws: ServerWebSocket<globals.SocketData>, code: number, message: string) {
    ws.data.log(`Closed connection (${code}).`);

    // get the room that this client was associated with
    const room = sessionToRoom[ws.data.session];

    // handle the player leaving this room and delete the session to room key/value pair
    room.handlePlayerLeave(ws.data.session);
    delete sessionToRoom[ws.data.session];

    // if this room should close, remove it from the rooms list
    if (room.shouldClose()) {
        console.log(`[${room.uuid}] Room closing ...`);
        room.closeRoom();
        utils.removeFromList(rooms, room);
    }
}

/**
 * Handle a message from a ws client
 * @param ws The ws context
 * @param message The message from the client
 */
function message(ws: ServerWebSocket<globals.SocketData>, message: string | Buffer) {
    // ws.data.log(`Received message: ${message}`);

    // parse the message as json and attach a from-session key to the object
    const parsed = JSON.parse(message as string);
    parsed["from-session"] = ws.data.session;

    // find the room this session is associated with and handle the message
    const room = sessionToRoom[ws.data.session];
    room.handleMessage(ws.data.session, parsed);
}

function drain(ws: ServerWebSocket<globals.SocketData>) {
    ws.data.log("Draining connection.");
}

console.log(`Serving on ${server.url}`);