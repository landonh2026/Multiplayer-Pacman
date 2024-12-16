"use strict";

var canvas = document.getElementById("game") as HTMLCanvasElement;
var ctx = canvas?.getContext("2d") as CanvasRenderingContext2D;

var gameManager: GameManager;

if (canvas === null) { throw new Error("Canvas is null! Something catastrophic must have happened."); }
if (ctx === null) { throw new Error("ctx is null! Something catastrophic must have happened."); }

window.addEventListener('load', function() {
    gameManager = new GameManager(true);

    fitCanvas();

    gameManager.beginGame();
});

// setInterval(draw, ms_per_frame);

function fitCanvas() {
    // canvas.width = canvas.clientWidth / 2;
    // canvas.height = canvas.clientHeight / 2;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // canvas.width = 
}

window.addEventListener("resize", () => {
    fitCanvas();
});