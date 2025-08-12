///<reference path="export.ts" />
///<reference path="ui.ts" />

namespace diagram_ts {
//
const notchSize : Vec2 = new Vec2(20, 20);
const blockLineWidth = 2;
const blockLineColor = "brown";
const nearPortDistance = 10;

const rangeWidth  = 150;
const numberWidth = 45;

export enum PortType {
    unknown,
    bottom,
    top,
    left,
    right,

    leftPort,
    rightPort,
}

export abstract class Block extends UI {
    parent? : UI;
    ports : Port[] = [];
    outlineColor : string = "green";
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

    abstract setMinSize() : void;

    getPortFromPosition(pos : Vec2) : Port | undefined {
        return this.ports.find(x => x.isNear(pos));
    }

    moveDiff(diff : Vec2) : void {
        const new_position = this.position.add(diff);
        this.setPosition(new_position);
    }

    nextBlock() : Block | undefined {
        const bottom_port = this.ports.find(x => x.type == PortType.bottom);
        if(bottom_port == undefined){
            return undefined;
        }
        else{
            if(bottom_port.destinations.length == 0){
                return undefined;
            }

            const next_port = bottom_port.destinations[0];

            return next_port.parent;
        }
    }

    totalHeight() : number {
        let height = this.minSize!.y;

        for(let block = this.nextBlock(); block != undefined; block = block.nextBlock()){
            height += block.minSize!.y;
        }

        return height;
    }

    connectBlock(ports : Port[]){
        let [port1, port2] = ports;
        assert(port1.parent == this);

        if(port1.type == PortType.bottom){
            assert(port2.type == PortType.top);
        }
        else if(port1.type == PortType.top){
            assert(port2.type == PortType.bottom);
            [port1, port2] = [port2, port1];
        }
        else{
            return;
        }
        port1.connect(port2);

        msg(`connect block`);
    }

    innerBlock(port : Port) : Block | undefined {
        assert(port.type == PortType.bottom);

        if(port.destinations.length == 0){
            return undefined;
        }
        else{
            return port.destinations[0].parent;
        }
    }

    drawNotch(cx : number, cy : number, type : PortType){
        const radius = 10;        

        switch(type){
        case PortType.bottom:
            this.ctx.arc(cx, cy, radius, Math.PI, 0, true);
            break;
        case PortType.top:
            this.ctx.arc(cx, cy, radius, 0, Math.PI, false);
            break;

        case PortType.right:
            this.ctx.arc(cx, cy, radius, 0.5 * Math.PI, 1.5 * Math.PI, true);
            break;

        case PortType.left:
            this.ctx.arc(cx, cy, radius, 1.5 * Math.PI, 0.5 * Math.PI, false);
            break;

        default:
            throw new MyError();
        }
    }

    drawOutline(points : [number, number, null|Port][]){
        const canvas = Canvas.one;
        if(canvas.draggedUI == this){

            this.ctx.globalAlpha = 0.5;
        }
        else if(canvas.nearPorts.length != 0 && canvas.nearPorts[1].parent == this){
            this.ctx.globalAlpha = 0.5;
        }

        this.ctx.fillStyle = this.backgroundColor!;

        this.ctx.strokeStyle = blockLineColor;
        this.ctx.lineWidth   = blockLineWidth;

        this.ctx.beginPath();

        for(const [idx, [x, y, port]] of points.entries()){
            if(idx == 0){

                this.ctx.moveTo(x, y);
            }
            else{
                if(port == null){

                    this.ctx.lineTo(x, y);
                }
                else{
                    this.drawNotch(x, y, port.type);

                    const port_pos = port.position;
                    port_pos.x = x;
                    port_pos.y = y;
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

    async valueChanged(value : number){
        msg(`changed : [${value}] ${this.constructor.name}`);
    }
}


export class StartBlock extends Block {
    constructor(){
        super({});
        this.ports = [ new Port(this, PortType.bottom) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, 50);
    }

    copy() : Block {
        return this.copyBlock(new StartBlock());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.minSize!.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, this.ports[0]],
            [x3, y2, null],

            [x3, y1, null],
        ]);

        const x = this.position.x + 20;
        const y = this.position.y + 40;

        this.ctx.strokeStyle = textColor;
        this.ctx.strokeText("Start", x, y);

    }

    async click(){
        await sendData({
            command : "init",
            name: "hamada",
            age: 66
        });

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
        this.ports = [ new Port(this, PortType.top), new Port(this, PortType.right), new Port(this, PortType.bottom), new Port(this, PortType.bottom) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, 100);

        const true_block = this.trueBlock();
        if(true_block != undefined){
            true_block.setMinSize();

            this.minSize.y += true_block.totalHeight();
        }
    }

    copy() : Block {
        return this.copyBlock(new IfBlock());
    }

    trueBlock() : Block | undefined {
        return this.innerBlock(this.ports[2]);
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const true_block = this.trueBlock();
        const true_block_height = (true_block == undefined ? 0 : true_block.totalHeight());

        const x2 = x1 + 35;
        const x3 = x2 + 35;
        const x4 = x1 + this.minSize!.x;

        const y2 = y1 + 35;
        const y3 = y2 + 30 + true_block_height;
        const y4 = y3 + 35;


        this.drawOutline([
            [x1, y1, null],

            [x1, y4, null],
            [x2, y4, this.ports[3]],
            [x4, y4, null],

            [x4, y3, null],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, this.ports[2]],
            [x4, y2, null],

            [x4, 0.5 * (y1 + y2), this.ports[1]],

            [x4, y1, null],
            [x2, y1, this.ports[0]]
        ])
    }
}

export class ConditionBlock extends Block {
    constructor(){
        super({});
        this.ports = [ new Port(this, PortType.left) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, 50);
    }

    copy() : Block {
        return this.copyBlock(new ConditionBlock());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + this.minSize!.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],

            [x1, 0.5 * (y1 + y2), this.ports[0]],

            [x1, y2, null],
            [x2, y2, null],
            [x2, y1, null],
        ])
    }
}

export class InfiniteLoop extends Block {
    constructor(){
        super({});
        this.ports = [ new Port(this, PortType.top), new Port(this, PortType.bottom) ];
    }

    loopBlock() : Block | undefined {
        return this.innerBlock(this.ports[1]);
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, 100);

        const loop_block = this.loopBlock();
        if(loop_block != undefined){
            loop_block.setMinSize();

            this.minSize.y += loop_block.totalHeight();
        }
    }

    copy() : Block {
        return this.copyBlock(new InfiniteLoop());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const loop_block = this.loopBlock();
        const loop_block_height = (loop_block == undefined ? 0 : loop_block.totalHeight());

        const x2 = x1 + 35;
        const x3 = x2 + 35;
        const x4 = x1 + this.minSize!.x;

        const y2 = y1 + 35;
        const y3 = y2 + 30 + loop_block_height;
        const y4 = y3 + 35;


        this.drawOutline([
            [x1, y1, null],

            [x1, y4, null],
            [x4, y4, null],

            [x4, y3, null],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, this.ports[1]],
            [x4, y2, null],

            [x4, y1, null],
            [x2, y1, this.ports[0]]
        ])
    }

}

export class ActionBlock extends Block {
    constructor(){
        super({});
        this.ports = [ new Port(this, PortType.top), new Port(this, PortType.bottom) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, 50);
    }

    copy() : Block {
        return this.copyBlock(new ActionBlock());
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.minSize!.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, this.ports[1]],
            [x3, y2, null],

            [x3, y1, null],
            [x2, y1, this.ports[0]]
        ])
    }
}


export abstract class InputBlock extends Block {
    input : HTMLInputElement;

    constructor(data : Attr){
        super(data);

        this.input = document.createElement("input");
        this.input.style.position = "absolute";

        document.body.appendChild(this.input);
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

    getInputPosition() : [number, number]{
        const [pos, size] = this.drawBox();

        const rect = this.input.getBoundingClientRect();

        const x1 = pos.x + this.borderWidth + blockLineWidth + 2 * Port.radius;
        const y1 = pos.y + 0.5 * (size.y - rect.height);

        return [x1, y1];
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [x1, y1] = this.getInputPosition();

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
        this.input.style.width = `${rangeWidth}px`;
        this.input.min = "0";
        this.input.max = "100";

        this.minInput = document.createElement("input");
        this.minInput.type = "number";
        this.minInput.value = "0";
        this.minInput.style.position = "absolute";
        this.minInput.style.width = `${numberWidth}px`;

        this.maxInput = document.createElement("input");
        this.maxInput.type = "number";
        this.maxInput.value = "100";
        this.maxInput.style.position = "absolute";
        this.maxInput.style.width = `${numberWidth}px`;

        document.body.appendChild(this.minInput);
        document.body.appendChild(this.maxInput);

        this.input.addEventListener("input", async (ev : Event) => {
            const value = parseFloat(this.input.value);
            for(const src of this.ports){
                for(const dst of src.destinations){
                    await dst.valueChanged(value);
                }
            }
        });

        this.minInput.addEventListener('change', (ev : Event) => {
            this.input.min = this.minInput.value;
            msg(`min : [${this.input.min}]`);
        });

        this.maxInput.addEventListener('change', (ev : Event) => {
            this.input.max = this.maxInput.value;
            msg(`max : [${this.input.max}]`);
        });

        this.ports = [ new Port(this, PortType.rightPort) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(200, 50);
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

        const rc1 = this.input.getBoundingClientRect();
        const rc2 = this.minInput.getBoundingClientRect();

        const x1 = pos.x + this.borderWidth + blockLineWidth + 2 * Port.radius;
        const y1 = pos.y + 0.5 * (size.y - (rc1.height + rc2.height));
        const y2 = y1 + rc1.height;

        this.input.style.left = `${x1}px`;
        this.input.style.top  = `${y1}px`;

        this.minInput.style.left = `${x1}px`;
        this.minInput.style.top  = `${y2}px`;

        this.maxInput.style.left = `${x1 + rc1.width - rc2.width}px`;
        this.maxInput.style.top  = `${y2}px`;
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + this.minSize!.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],
            [x1, y2, null],
            [x2, y2, null],
            [x2, y1, null],
        ]);

        this.ports[0].drawPort(this.ctx, x2, 0.5 * (y1 + y2));
    }
}

export class ServoMotorBlock extends InputBlock {
    constructor(data : Attr){
        super(data);

        this.input.type = "number";
        this.input.style.width = "45px";
        this.input.value = "0";
        this.input.min   = "0";
        this.input.max   = "15";

        this.input.addEventListener("input", (ev : Event) => {
            msg(`change : [${this.input.value}]`);
        });

        this.ports = [ new Port(this, PortType.leftPort) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(200, 50);
    }

    copy() : Block {
        return this.copyBlock(new ServoMotorBlock({}));
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [x1, y1] = this.getInputPosition();

        this.input.style.left = `${x1}px`;
        this.input.style.top  = `${y1}px`;
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + this.minSize!.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],
            [x1, y2, null],
            [x2, y2, null],
            [x2, y1, null],
        ]);

        this.ports[0].drawPort(this.ctx, x1, 0.5 * (y1 + y2));
    }

    async valueChanged(value : number){
        const channel = parseInt(this.input.value);
        msg(`motor changed : ch:${channel} value:[${value}]`);

        await sendData({
            command : "servo",
            channel : channel,
            value   : value
        });
    }
}


export class SetValueBlock extends InputBlock {
    constructor(data : Attr){
        super(data);

        this.input.type = "text";
        this.input.style.width = "45px";
        this.input.value = "0";

        this.input.addEventListener("change", (ev : Event) => {
            msg(`change : [${this.input.value}]`);
        });

        this.ports = [ 
            new Port(this, PortType.top),
            new Port(this, PortType.rightPort),
            new Port(this, PortType.bottom),
        ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(200, 50);
    }

    copy() : Block {
        return this.copyBlock(new SetValueBlock({}));
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [x1, y1] = this.getInputPosition();

        this.input.style.left = `${x1}px`;
        this.input.style.top  = `${y1}px`;
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.minSize!.x;
        const y2 = y1 + 50;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, this.ports[2]],
            [x3, y2, null],

            [x3, y1, null],
            [x2, y1, this.ports[0]]
        ])

        this.ports[1].drawPort(this.ctx, x3, 0.5 * (y1 + y2));
    }
}


export function $if_block() : IfBlock {
    return new IfBlock();
}
}