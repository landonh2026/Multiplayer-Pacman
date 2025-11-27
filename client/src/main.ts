"use strict";

// get DOM elements
var canvas = document.getElementById("game") as HTMLCanvasElement;
var ctx = canvas?.getContext("2d") as CanvasRenderingContext2D;

var gameManager: GameManager;

if (canvas === null) { throw new Error("Canvas is null! Something catastrophic must have happened."); }
if (ctx === null) { throw new Error("ctx is null! Something catastrophic must have happened."); }

// wait for the window to load before fitting the canvas and beginning the game
window.addEventListener('load', function() {
    gameManager = new GameManager();

    fitCanvas();

    gameManager.beginGame();
});

function fitCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

// fit the canvas when the window resizes
window.addEventListener("resize", () => {
    fitCanvas();
});