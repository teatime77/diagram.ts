namespace diagram_ts {
//
// script.ts (or main.ts if you're compiling from TypeScript)
let canvas : HTMLCanvasElement;
let ctx : CanvasRenderingContext2D;

function resizeCanvas() {
    // Set the canvas's internal drawing dimensions to match its display size
    // window.innerWidth/Height give the viewport dimensions.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // If you're drawing something, you might want to redraw it here
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        // Example drawing
        ctx.fillStyle = 'blue';
        ctx.fillRect(50, 50, 100, 100);
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Hello Canvas!', canvas.width / 2 - 100, canvas.height / 2);
    }
}

export function initCanvas(){
    // Get the canvas element
    canvas = document.getElementById('world') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!; // Or 'webgl', 'webgl2'

    if (!ctx) {
        console.error("Canvas context not supported!");
    }

    // Initial resize when the page loads
    // Use DOMContentLoaded to ensure the canvas element exists before trying to access it
    document.addEventListener('DOMContentLoaded', () => {
        resizeCanvas();
    });

    // Add an event listener to resize the canvas whenever the window is resized
    window.addEventListener('resize', resizeCanvas);

    resizeCanvas();
}
}