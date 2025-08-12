namespace diagram_ts {
//
let animationFrameId : number | null = null;

export class Canvas {
    static one : Canvas;

    canvas : HTMLCanvasElement;
    ctx : CanvasRenderingContext2D;
    root   : Grid;
    draggedUI? : Block | Port | Button;
    nearPorts : Port[] = [];
    pointerId : number = NaN;

    downPos : Vec2 = Vec2.zero();
    movePos : Vec2 = Vec2.zero();
    uiOrgPos : Vec2 = Vec2.zero();

    moved : boolean = false;

    constructor(canvas_html : HTMLCanvasElement, root : Grid){
        Canvas.one = this;
        this.canvas = canvas_html;
        this.ctx = this.canvas.getContext('2d')!; // Or 'webgl', 'webgl2'
        if (!this.ctx) {
            console.error("Canvas context not supported!");
        }

        this.root = root;

        setContext2D(this.ctx, this.root);

        this.canvas.addEventListener("pointerdown",  this.pointerdown.bind(this));
        this.canvas.addEventListener("pointermove",  this.pointermove.bind(this));
        
        this.canvas.addEventListener("pointerup"  , async (ev:PointerEvent)=>{
            await Canvas.one.pointerup(ev);
        });
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

    getUIFromPosition(ui : UI, pos : Vec2) : UI | Port | undefined {
        for(const child of ui.children()){
            const target = this.getUIFromPosition(child, pos);
            if(target != undefined){
                return target;
            }
        }

        if(ui.position.x <= pos.x && pos.x < ui.position.x + ui.boxSize.x){
            if(ui.position.y <= pos.y && pos.y < ui.position.y + ui.boxSize.y){

                if(ui instanceof Block){
                    const port = ui.getPortFromPosition(pos);
                    if(port != undefined){
                        return port;
                    }
                }

                return ui;
            }
        }

        return undefined;
    }

    pointerdown(ev:PointerEvent){
        this.moved = false;

        const pos = this.getPositionInCanvas(ev);
        const target = this.getUIFromPosition(this.root, pos);
        if(target != undefined){
            this.downPos   = pos;
            this.movePos   = pos;

            if(target instanceof Block){
                if(target instanceof InputRangeBlock){
                    msg(`range: box${target.boxSize.x.toFixed()} out:${target.minSize!.x}`);
                }

                if(target.parent == undefined){

                    const block = target.copy();
                    Main.one.editor.addBlock(block);

                    this.draggedUI = block
                }
                else{

                    this.draggedUI = target;
                }
            }
            else if(target instanceof Port){

                msg(`down port:${target.str()}`);
                this.draggedUI = target;
            }
            else if(target instanceof Button){

                msg(`down button:${target.text}`);
                this.draggedUI = target;
            }
            else{
                return;
            }


            this.uiOrgPos  = this.draggedUI.position.copy();
            this.pointerId = ev.pointerId;

            this.canvas.setPointerCapture(this.pointerId);
            this.canvas.classList.add('dragging');
        }
    }

    getNearPorts(dragged_block : Block){
        this.nearPorts = [];
        const other_blocks = Main.one.editor.blocks.filter(x => x != this.draggedUI);
        for(const block of other_blocks){
            const near_ports = dragged_block.canConnectNearPortPair(block);
            if(near_ports.length != 0){
                msg(`near`);
                this.nearPorts = near_ports;
                break;
            }
        }

    }

    pointermove(ev:PointerEvent){
        this.moved = true;

        if(this.draggedUI == undefined){
            return;
        }

        const pos = this.getPositionInCanvas(ev);
        const target = this.getUIFromPosition(this.root, pos);
        const s = (target == undefined ? "" : `target:[${target.str()}]`);

        this.movePos = pos;

        const diff = pos.sub(this.downPos);

        if(this.draggedUI instanceof Block){

            this.draggedUI.setPosition( this.uiOrgPos.add(diff) );
            this.getNearPorts(this.draggedUI);
        }

        this.requestUpdateCanvas();
    }

    requestUpdateCanvas(){
        if (animationFrameId == null) {

            animationFrameId = requestAnimationFrame(()=>{
                animationFrameId = null;
                this.repaint();
            });

        }        
    }

    async pointerup(ev:PointerEvent){
        if(this.draggedUI == undefined){
            return;
        }

        const pos = this.getPositionInCanvas(ev);
        const target = this.getUIFromPosition(this.root, pos);

        if(this.moved){
            msg("dragged");
            if(this.draggedUI instanceof Port && target instanceof Port){
                this.draggedUI.connect(target);
            }
            else if(this.draggedUI instanceof Block){
                const diff = pos.sub(this.downPos);

                this.getNearPorts(this.draggedUI);
                if(this.nearPorts.length == 2){
                    const port_diffs = this.nearPorts[1].position.sub(this.nearPorts[0].position);
                    this.draggedUI.moveDiff(port_diffs);

                    this.draggedUI.connectBlock(this.nearPorts);
                    this.layoutRoot();
                }
                else{
                    this.draggedUI.setPosition( this.uiOrgPos.add(diff) );
                }
            }
        }
        else if(this.draggedUI instanceof Block){
            msg("click");

            if(this.draggedUI instanceof StartBlock){
                await this.draggedUI.click();
            }
        }
        else if(this.draggedUI instanceof Button){
            await this.draggedUI.click();
        }

        this.canvas.releasePointerCapture(this.pointerId);
        this.canvas.classList.remove('dragging');

        this.draggedUI = undefined;
        this.pointerId = NaN;
        this.nearPorts = [];

        this.requestUpdateCanvas();

        this.moved = false;

    }

    layoutRoot(){
        this.root.setMinSize();
        this.root.layout(0, 0, new Vec2(this.canvas.width, this.canvas.height), 0);        
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

        this.layoutRoot();
        this.root.dump(0);

        this.requestUpdateCanvas();
    }

    drawDraggedPort(port : Port){       
        this.drawLine(port.position, this.movePos, "blue") ;
    }

    repaint(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);        
        this.root.draw();
        if(this.draggedUI instanceof Port){
            this.drawDraggedPort(this.draggedUI);
        }
        // msg("repaint");
    }

    drawLine(start : Vec2, end : Vec2, color : string){
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth   = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);

        this.ctx.stroke();
    }
}

}