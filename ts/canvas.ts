namespace diagram_ts {
//

export class Canvas {
    canvas : HTMLCanvasElement;
    ctx : CanvasRenderingContext2D;
    root   : Grid;

    constructor(canvas_html : HTMLCanvasElement, root : Grid){
        this.canvas = canvas_html;
        this.ctx = this.canvas.getContext('2d')!; // Or 'webgl', 'webgl2'
        if (!this.ctx) {
            console.error("Canvas context not supported!");
        }

        this.root = root;

        setContext2D(this.ctx, this.root);

        this.canvas.addEventListener("pointerdown",  this.pointerdown.bind(this));
        this.canvas.addEventListener("pointermove",  this.pointermove.bind(this));
        this.canvas.addEventListener("pointerup"  ,  this.pointerup.bind(this));

    }

    getPositionInCanvas(event : PointerEvent) : Vec2 {
        // Get the bounding rectangle of the canvas
        const rect = this.canvas.getBoundingClientRect();

        // Calculate the scaling factors if the canvas is styled differently from its internal resolution
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Calculate the canvas coordinates
        const canvasX = (event.clientX - rect.left) * scaleX;
        const canvasY = (event.clientY - rect.top) * scaleY;

        return new Vec2(canvasX, canvasY);
        // Now you have the canvas coordinates!
        // console.log(`Canvas X: ${canvasX}, Canvas Y: ${canvasY}`);
    }

    getUIFromPosition(ui : UI, pos : Vec2) : UI | undefined {
        for(const child of ui.children()){
            const target = this.getUIFromPosition(child, pos);
            if(target != undefined){
                return target;
            }
        }

        if(ui.position.x <= pos.x && pos.x < ui.position.x + ui.boxSize.x){
            if(ui.position.y <= pos.y && pos.y < ui.position.y + ui.boxSize.y){
                return ui;
            }
        }

        return undefined;
    }

    pointerdown(ev:PointerEvent){
        const pos = this.getPositionInCanvas(ev);
        const target = this.getUIFromPosition(this.root, pos);
        const s = (target == undefined ? "" : `target:[${target.str()}]`);
        msg(`down pos:(${pos.x},${pos.y}) ${s}`);
    }

    pointermove(ev:PointerEvent){
        const pos = this.getPositionInCanvas(ev);
        const target = this.getUIFromPosition(this.root, pos);
        const s = (target == undefined ? "" : `target:[${target.str()}]`);
        msg(`move pos:(${pos.x},${pos.y}) ${s}`);

    }

    pointerup(ev:PointerEvent){
        const pos = this.getPositionInCanvas(ev);
        const target = this.getUIFromPosition(this.root, pos);
        const s = (target == undefined ? "" : `target:[${target.str()}]`);
        msg(`up pos:(${pos.x},${pos.y}) ${s}`);

    }

    resizeCanvas() {
        // Set the canvas's internal drawing dimensions to match its display size
        // window.innerWidth/Height give the viewport dimensions.
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // If you're drawing something, you might want to redraw it here
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the canvas
            // Example drawing
            this.ctx.fillStyle = 'blue';
            this.ctx.fillRect(50, 50, 100, 100);
            this.ctx.font = '30px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText('Hello Canvas!', this.canvas.width / 2 - 100, this.canvas.height / 2);
        }

        this.root.setMinSize();
        this.root.layout(0, 0, new Vec2(this.canvas.width, this.canvas.height), 0);        
        this.root.dump(0);
        this.root.draw(this.ctx);
    }
}

}