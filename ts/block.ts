///<reference path="export.ts" />
///<reference path="ui.ts" />

namespace diagram_ts {
//
const notchSize : Vec2 = new Vec2(20, 20);
const blockLineWidth = 2;
const blockLineColor = "brown";
const nearPortDistance = 10;

export enum NotchType {
    unknown,
    bottom,
    top,
    left,
    right
}

export abstract class Block extends UI {
    parent? : UI;
    ports : Port[] = [];
    outlineColor : string = "green";
    outlineBox! : Vec2;
    notchBottom : boolean = true;
    notchRight  : boolean = true;

    constructor(data : Attr){
        super(data);
        if(this.backgroundColor == undefined){
            this.backgroundColor = "cornsilk";
        }
        this.padding = [5, 5, 5, 5];
    }

    abstract copy() : Block;

    copyBlock(dst : Block) : Block {
        const idx = dst.idx;
        Object.assign(dst, this);
        dst.idx = idx;

        dst.ports = this.ports.map(x => x.copyPort(dst));

        return dst;
    }

    setMinSize() : void {
        const w = this.outlineBox.x + (this.notchRight  ? notchSize.x : 0);
        const h = this.outlineBox.y + (this.notchBottom ? notchSize.y : 0);
        this.minSize = new Vec2(w, h);
        msg(`set-min-size:${this.constructor.name}`);
    }

    drawNotch(cx : number, cy : number, type : NotchType){
        const radius = 10;

        switch(type){
        case NotchType.bottom:
            this.ctx.arc(cx, cy, radius, Math.PI, 0, true);
            break;
        case NotchType.top:
            this.ctx.arc(cx, cy, radius, 0, Math.PI, false);
            break;

        case NotchType.right:
            this.ctx.arc(cx, cy, radius, 0.5 * Math.PI, 1.5 * Math.PI, true);
            break;

        case NotchType.left:
            this.ctx.arc(cx, cy, radius, 1.5 * Math.PI, 0.5 * Math.PI, false);
            break;
        }
    }

    drawOutline(points : [number, number, null|NotchType][]){
        const canvas = Canvas.one;
        if(canvas.draggedBlock == this){

            this.ctx.globalAlpha = 0.5;
        }
        else if(canvas.nearPorts.length != 0 && canvas.nearPorts[1].parent == this){
            this.ctx.globalAlpha = 0.5;
        }

        this.ctx.fillStyle = this.backgroundColor!;

        this.ctx.strokeStyle = blockLineColor;
        this.ctx.lineWidth   = blockLineWidth;

        this.ctx.beginPath();

        let port_idx = 0;
        for(const [idx, [x, y, type]] of points.entries()){
            if(idx == 0){

                this.ctx.moveTo(x, y);
            }
            else{
                if(type == null){

                    this.ctx.lineTo(x, y);
                }
                else{
                    const port = this.ports[port_idx];

                    port.type = type;
                    this.drawNotch(x, y, type);

                    const port_pos = port.position;
                    port_pos.x = x;
                    port_pos.y = y;

                    port_idx++;
                }
            }
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        if(this.ctx.globalAlpha != 1.0){
            this.ctx.globalAlpha = 1.0;
        }
    }

    canConnectNearPortPair(block : Block) : Port[] {
        for(const port1 of this.ports){
            for(const port2 of block.ports){
                if(port1.canConnect(port2) && port1.position.distance(port2.position) <= nearPortDistance){
                    return [port1, port2];
                }
            }
        }

        return [];
    }
}


export class StartBlock extends Block {
    constructor(){
        super({});
        this.ports = [ new Port(this) ];
        this.outlineBox = new Vec2(150, 50);
    }

    copy() : Block {
        return this.copyBlock(new StartBlock());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.outlineBox.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, NotchType.bottom],
            [x3, y2, null],

            [x3, y1, null],
        ]);

        const x = this.position.x + 20;
        const y = this.position.y + 40;

        this.ctx.strokeStyle = textColor;
        this.ctx.strokeText("Start", x, y);

    }

    async sendData(){
        const name = "hamada";
        const age  = 66;

        const dataToSend = {
            name: name,
            age: age
        };

        const url = `${urlOrigin}/send_data`;
        msg(`post:[${url}]`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend) // Convert JavaScript object to JSON string
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message}`);
            }

            const result = await response.json(); // Parse the JSON response from Flask
            const json_str = JSON.stringify(result, null, 2); // Pretty print JSON
            msg(`send data result:[${json_str}]`);
        } catch (error: any) {
            msg(`send data error: ${error.message || error}`);
        }
    }

    async click(){
        await this.sendData();

        try {
            const url = `${urlOrigin}/get_data`;
            msg(`fetch:[${url}]`);
            const response = await fetch(url); // Default method is GET

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json(); // Parse the JSON response from Flask
            const json_str = JSON.stringify(data, null, 2); // Pretty print JSON
            msg(`start click name:[${data["product_name"]}] price:[${data["price"]}] json:[${json_str}]`);
        } catch (error: any) {
            msg(`start click error: ${error.message || error}`);
        }


    }
}



export class IfBlock extends Block {
    constructor(){
        super({});
        this.ports = range(4).map((i) => new Port(this));
        this.outlineBox = new Vec2(150, 100);
    }

    copy() : Block {
        return this.copyBlock(new IfBlock());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x2 + 35;
        const x4 = x1 + this.outlineBox.x;

        const y2 = y1 + 35;
        const y3 = y2 + 30;
        const y4 = y3 + 35;


        this.drawOutline([
            [x1, y1, null],

            [x1, y4, null],
            [x2, y4, NotchType.bottom],
            [x4, y4, null],

            [x4, y3, null],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, NotchType.bottom],
            [x4, y2, null],

            [x4, 0.5 * (y1 + y2), NotchType.right],

            [x4, y1, null],
            [x2, y1, NotchType.top]
        ])
    }
}

export class ConditionBlock extends Block {
    constructor(){
        super({});
        this.ports = [ new Port(this) ];
        this.outlineBox = new Vec2(150, 50);
    }

    copy() : Block {
        return this.copyBlock(new ConditionBlock());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + this.outlineBox.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],

            [x1, 0.5 * (y1 + y2), NotchType.left],

            [x1, y2, null],
            [x2, y2, null],
            [x2, y1, null],
        ])
    }
}


export class ActionBlock extends Block {
    constructor(){
        super({});
        this.ports = range(2).map((i) => new Port(this));
        this.outlineBox = new Vec2(150, 50);
    }

    copy() : Block {
        return this.copyBlock(new ActionBlock());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.outlineBox.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, NotchType.bottom],
            [x3, y2, null],

            [x3, y1, null],
            [x2, y1, NotchType.top]
        ])
    }
}


export abstract class InputBlock extends Block {
    input : HTMLInputElement;

    constructor(data : Attr){
        super(data);

        this.input = document.createElement("input");
        // this.input.disabled = true;
        this.input.style.position = "absolute";

        document.body.appendChild(this.input);
        // this.input.style.display  = "none";
    }

    copyMember(dst : any, names : string[]){
        const map = new Map<string, any>();

        for(const name of names){
            map.set(name, dst[name]);
        }

        Object.assign(dst, this);

        for(const name of names){
            dst[name] = map.get(name);
        }
    }

    copyBlock(dst : InputBlock) : InputBlock {
        this.copyMember(dst, [ "idx", "input" ]);

        dst.ports = this.ports.map(x => x.copyPort(dst));

        return dst;
    }

    copyInput(dst : InputBlock){
        dst.input = document.createElement("input");
        dst
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        this.input.style.left = `${x1}px`;
        this.input.style.top  = `${y1}px`;
    }
}


export class InputRangeBlock extends InputBlock {
    minInput : HTMLInputElement;
    maxInput : HTMLInputElement;

    constructor(data : Attr){
        super(data);
        this.input.type = "range";
        this.input.style.width = "100px";
        this.input.min = "0";
        this.input.max = "100";

        this.minInput = document.createElement("input");
        this.minInput.type = "number";
        this.minInput.value = "0";
        this.minInput.style.position = "absolute";
        this.minInput.style.width = "45px";

        this.maxInput = document.createElement("input");
        this.maxInput.type = "number";
        this.maxInput.value = "100";
        this.maxInput.style.position = "absolute";
        this.maxInput.style.width = "45px";

        document.body.appendChild(this.minInput);
        document.body.appendChild(this.maxInput);

        this.input.addEventListener("input", (ev : Event) => {
            msg(`change : [${this.input.value}]`);
        });

        this.minInput.addEventListener('change', (ev : Event) => {
            this.input.min = this.minInput.value;
            msg(`min : [${this.input.min}]`);
        });

        this.maxInput.addEventListener('change', (ev : Event) => {
            this.input.max = this.maxInput.value;
            msg(`max : [${this.input.max}]`);
        });

        this.ports = [ new Port(this) ];
        this.outlineBox = new Vec2(200, 50);
    }

    copyBlock(dst : InputBlock) : InputBlock {
        this.copyMember(dst, [ "idx", "input", "minInput", "maxInput" ]);

        dst.ports = this.ports.map(x => x.copyPort(dst));

        return dst;
    }

    copy() : Block {
        return this.copyBlock(new InputRangeBlock({}));
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        this.minInput.style.left = `${x1}px`;
        this.minInput.style.top  = `${y1}px`;

        this.input.style.left = `${x1 + 45}px`;
        this.input.style.top  = `${y1}px`;

        this.maxInput.style.left = `${x1 + 45 + 100}px`;
        this.maxInput.style.top  = `${y1}px`;
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + this.outlineBox.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],
            [x1, y2, null],
            [x2, y2, null],
            [x2, 0.5 * (y1 + y2), NotchType.right],
            [x2, y1, null],
        ])
    }
}

export function $if_block() : IfBlock {
    return new IfBlock();
}
}