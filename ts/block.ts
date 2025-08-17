///<reference path="export.ts" />
///<reference path="ui.ts" />

namespace diagram_ts {
//
export const notchRadius = 10;        

export const nest_h1 = 35;
export const nest_h2 = 30;
export const nest_h3 = 35;
export const nest_h123 = nest_h1 + nest_h2 + nest_h3;

export const blockLineWidth = 2;
const blockLineColor = "brown";
const nearPortDistance = 10;

const rangeWidth  = 150;
const numberWidth = 45;

export let cameraIcon : HTMLImageElement;
export let motorIcon  : HTMLImageElement;
export let cameraImg : HTMLImageElement;
export let distanceSensorIcon : HTMLImageElement;
export let ttsIcon : HTMLImageElement;

export let ttsAudio  : HTMLAudioElement;

export enum PortType {
    unknown,
    bottom,
    top,

    inputPort,
    outputPort,
}

export abstract class Block extends UI {
    ports : Port[] = [];
    outlineColor : string = "green";
    notchBottom : boolean = true;
    notchRight  : boolean = true;
    inToolbox   : boolean = false;

    constructor(data : Attr){
        super(data);
        if(this.backgroundColor == undefined){
            this.backgroundColor = "cornsilk";
        }
        this.padding = [5, 5, 5, 5];

        if(data.inToolbox != undefined){
            this.inToolbox = data.inToolbox;
        }
    }

    copy() : Block {
        const block = makeBlockByTypeName(this.constructor.name);

        block.position = this.position.copy();
        block.ctx      = this.ctx;

        block.setMinSize();
        block.boxSize = block.minSize!.copy();

        return block;
    }

    makeObj() : any{
        return {
            idx: this.idx,
            typeName: this.constructor.name,
            x : this.position.x,
            y : this.position.y,
            ports : this.ports.map(x => x.makeObj())
        };
    }

    loadObj(obj : any ){        
    }

    abstract setMinSize() : void;

    calcHeight() : number {
        return this.minSize!.y;
    }

    nextBlock() : Block | undefined {
        let bottom_port : Port | undefined;
        
        if(this instanceof IfBlock){
            bottom_port = this.bottomPort;
        }
        else if(this instanceof InfiniteLoop){            
        }
        else{
            bottom_port = this.ports.find(x => x.type == PortType.bottom);
        }
        
        if(bottom_port != undefined && bottom_port.destinations.length != 0){
            const dest_port = bottom_port.destinations[0];
            return dest_port.parent;
        }

        return undefined;
    }

    isProcedure() : boolean {
        return this instanceof NestBlock || this instanceof TTSBlock;
    }

    getPortFromPosition(pos : Vec2) : Port | undefined {
        return this.ports.find(x => x.isNear(pos));
    }

    moveDiff(diff : Vec2) : void {
        const new_position = this.position.add(diff);
        this.setPosition(new_position);
    }

    outputPorts() : Port[] {
        return this.ports.filter(x => x.type == PortType.outputPort);
    }

    nextDataflowBlocks() : Block[] {
        const blocks : Block[] = [];

        const output_ports = this.outputPorts();
        for(const port of output_ports){
            for(const dst of port.destinations){
                blocks.push(dst.parent);
            }
        }

        return blocks;
    }

    propergateCalc(){
        const next_dataflow_blocks = this.nextDataflowBlocks();
        next_dataflow_blocks.forEach(x => x.calc());
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

    drawNotch(cx : number, cy : number, type : PortType){
        switch(type){
        case PortType.bottom:
            this.ctx.arc(cx, cy, notchRadius, Math.PI, 0, true);
            break;
        case PortType.top:
            this.ctx.arc(cx, cy, notchRadius, 0, Math.PI, false);
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

    drawIOPorts(x1 : number, x2 : number, y1 : number, y2 : number){
        const input_ports  = this.ports.filter(x => x.type == PortType.inputPort);
        const output_ports = this.ports.filter(x => x.type == PortType.outputPort);

        for(const ports of [ input_ports, output_ports]){
            const y = (ports == input_ports ? y1 + notchRadius: y2 - notchRadius);
            for(const [i, port] of ports.entries()){
                const p = (i + 1) / (ports.length + 1);
                const x = x1 * (1 - p) + x2 * p;
                port.drawPort(this.ctx, x, y);
            }
        }
    }

    drawIcon(img : HTMLImageElement){
        const [x1, y1, x2, y2] = this.getCornerPosition();


        const img_height = (y2 - y1) - 6;
        const img_width  = img_height * img.width / img.height;

        const img_x = x2 - img_width - 5;
        const img_y = y1 + 3;

        this.ctx.drawImage(img, img_x, img_y, img_width, img_height);
    }

    getCornerPosition() : [number, number, number, number] {
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + this.minSize!.x;
        const y2 = y1 + this.minSize!.y;

        return [x1, y1, x2, y2];
    }

    drawDataflowBlock(){
        const [x1, y1, x2, y2] = this.getCornerPosition();


        this.drawOutline([
            [x1, y1, null],
            [x1, y2, null],
            [x2, y2, null],
            [x2, y1, null],
        ]);

        this.drawIOPorts(x1, x2, y1, y2);
    }

    drawActionBlock(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.minSize!.x;

        const y2 = y1 + this.minSize!.y - notchRadius;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, this.ports[1]],
            [x3, y2, null],

            [x3, y1, null],
            [x2, y1, this.ports[0]]
        ]);
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

    calc(){
        throw new MyError();
    }

    async run(){
        throw new MyError();
    }
}


export class StartBlock extends Block {
    constructor(data : Attr){
        super(data);
        this.ports = [ new Port(this, PortType.bottom) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, 50);
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.minSize!.x;
        const y2 = y1 + this.minSize!.y - notchRadius;

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
}


export abstract class InputBlock extends Block {
    input : HTMLInputElement;

    constructor(data : Attr){
        super(data);

        this.input = document.createElement("input");
        this.input.style.position = "absolute";

        document.body.appendChild(this.input);
    }

    getInputPosition() : [number, number]{
        const [x1, y1, x2, y2] = this.getCornerPosition();

        const rect = this.input.getBoundingClientRect();

        const input_x = x1 + 0.5 * ((x2 - x1) - rect.width);
        const input_y = y1 + 0.5 * ((y2 - y1) - rect.height);

        return [input_x, input_y];
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

        this.ports = [ new Port(this, PortType.outputPort) ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(200, 50);
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
        this.drawDataflowBlock();
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

        this.ports = [ new Port(this, PortType.inputPort) ];
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
            channel : parseInt(this.input.value)
        });

        return obj;
    }

    loadObj(obj : any ){        
        super.loadObj(obj);
        this.input.value = `${obj.channel}`;
    }

    setMinSize() : void {
        this.minSize = new Vec2(200, 50);
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [x1, y1, x2, y2] = this.getCornerPosition();

        const rect = this.input.getBoundingClientRect();

        const input_x = x1 + 10;
        const input_y = y1 + 0.5 * ((y2 - y1) - rect.height);

        this.input.style.left = `${input_x}px`;
        this.input.style.top  = `${input_y}px`;
    }

    draw(): void {
        this.drawDataflowBlock();
        this.drawIcon(motorIcon);
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


    calc(){
        msg(`motor calc:${this.ports[0].value}`);
    }

}


abstract class InputTextBlock extends InputBlock {
    constructor(data : Attr){
        super(data);
        this.input.type = "text";
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
            text : this.input.value
        });

        return obj;
    }

    loadObj(obj : any ){        
        super.loadObj(obj);
        this.input.value = obj.text;
    }

    setMinSize() : void {
            this.minSize = new Vec2(200, 20 + 2 * 2 * notchRadius);
    }

    draw(){
        this.drawDataflowBlock();
    }

    makeInputValueMap() : Map<string, number> {
        const map = new Map<string, number>();
        for(const port of this.ports){
            if(port.type == PortType.inputPort){
                assert(port.name != "" && typeof port.value === 'number' && ! isNaN(port.value));
                map.set(port.name, port.value);
            }
        }

        return map;
    }
}

export class SetValueBlock extends InputTextBlock {
    constructor(data : Attr){
        super(data);

        this.input.style.width = "45px";
        this.input.value = "0";

        this.input.addEventListener("change", (ev : Event) => {
            msg(`change : [${this.input.value}]`);
        });

        this.ports = [ 
            new Port(this, PortType.top),
            new Port(this, PortType.outputPort),
            new Port(this, PortType.bottom),
        ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(200, 50);
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;

        const x2 = x1 + 35;
        const x3 = x1 + this.minSize!.x;

        const y1 = pos.y + this.borderWidth + blockLineWidth;
        const y2 = y1 + this.minSize!.y - notchRadius;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, this.ports[2]],
            [x3, y2, null],

            [x3, y1, null],
            [x2, y1, this.ports[0]]
        ])

        this.drawIOPorts(x1, x3, y1, y2);
    }
}


export class CameraBlock extends Block {
    constructor(data : Attr){
        super(data);
        this.ports = [ new Port(this, PortType.outputPort) ];

    }

    setMinSize() : void {
        if(this.inToolbox){

            this.minSize = new Vec2(320, 50 + 2 * notchRadius);
        }
        else{

            this.minSize = new Vec2(320, 240 + 2 * notchRadius);
        }
    }


    draw(){
        this.drawDataflowBlock();

        const [x1, y1, x2, y2] = this.getCornerPosition();

        let img : HTMLImageElement;

        if(this.inToolbox){

            img = cameraIcon;
        }
        else{

            if(cameraImg == undefined){
                return;
            }
            img = cameraImg;
        }
        
        const img_height = (y2 - y1) - 2 * notchRadius;
        const img_width  = img_height * img.width / img.height;

        const img_x = x1 + 0.5 * ((x2 - x1) - img_width);
        const img_y = y1;

        this.ctx.drawImage(img, img_x, img_y, img_width, img_height);
    }
}

export class TTSBlock extends InputTextBlock {
    constructor(data : Attr){
        super(data);
        this.ports = [ 
            new Port(this, PortType.top), 
            new Port(this, PortType.bottom) 
        ];

        this.input.value = "こんにちは!どうぞよろしく!";
    }

    setMinSize() : void {
        this.minSize = new Vec2(300, 50);
    }

    draw(): void {
        this.drawActionBlock();
        this.drawIcon(ttsIcon);
    }

    async run(){
        const audio = ttsAudio;

        try {
            msg("start audio play")
            // Start playing the audio
            await audio.play();

            // Create a new Promise that resolves when the 'ended' event is triggered
            await new Promise<void>((resolve) => {
                audio.addEventListener('ended', () => {
                    resolve();
                }, { once: true }); // Use { once: true } to automatically remove the listener after it fires
            });

            msg("Audio playback has finished.");
        } catch (error) {
            // Catch errors that might occur if the browser blocks autoplay
            console.error("Audio playback failed:", error);
        }        
    }
}

export class FaceDetectionBlock extends Block {
    face : number[] = [];

    constructor(data : Attr){
        super(data);
        this.ports = [ new Port(this, PortType.inputPort), new Port(this, PortType.outputPort), new Port(this, PortType.outputPort) ];
    }

    setMinSize() : void {
        if(this.inToolbox){

            this.minSize = new Vec2(150, 10 + 2 * 2 * notchRadius);
        }
        else{

            this.minSize = new Vec2(320, 240 + 2 * 2 * notchRadius);
        }
    }

    setFace(face : number[]){
        this.face = face.slice();
        const [x, y, w, h] = this.face;
        
        const cx = x + w / 2;
        const cy = y + h / 2;

        this.ports[1].setPortValue(cx);
        this.ports[2].setPortValue(cy);
    }

    getCamera() : CameraBlock | undefined {
        if(this.ports[0].sources.length != 0){
            const camera = this.ports[0].sources.map(x => x.parent).find(x => x instanceof CameraBlock);
            return camera;
        }

        return undefined;
    }

    draw(){
        this.drawDataflowBlock();

        const camera = this.getCamera();
        if(camera != undefined){
            const [x1, y1, x2, y2] = this.getCornerPosition();

            if(cameraImg == undefined){
                return;
            }
            const img = cameraImg;

            const img_height = (y2 - y1) - 2 * 2 * notchRadius;
            const img_width  = img_height * img.width / img.height;

            const img_x = x1 + 0.5 * ((x2 - x1) - img_width);
            const img_y = y1 + 2 * notchRadius;

            this.ctx.drawImage(img, img_x, img_y, img_width, img_height);


            if(this.face.length == 4){
                this.ctx.save();

                // Set the stroke color to red
                this.ctx.strokeStyle = 'red';

                // Set the line thickness to 5 pixels
                this.ctx.lineWidth = 5;

                const [face_x, face_y, face_w, face_h] = this.face;

                const cx = img_x + img_width  / 2;
                const cy = img_y + img_height / 2;

                const img_face_x = cx + img_width  * face_x / 100;
                const img_face_y = cy + img_height * face_y / 100;
                const img_face_w = img_width  * face_w / 100;
                const img_face_h = img_height * face_h / 100;

                // Draw an outlined rectangle at (200, 50) with a size of 100x75
                this.ctx.strokeRect(img_face_x, img_face_y, img_face_w, img_face_h);            

                this.ctx.restore();
            }
        }
    }
}

export class JoyStickBlock extends Block {
    constructor(data : Attr){
        super(data);
        this.ports = [ ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, 50);
    }
}

export class UltrasonicDistanceSensorBlock extends Block {
    constructor(data : Attr){
        super(data);
        this.ports = [ 
            new Port(this, PortType.outputPort) 
        ];
    }

    setMinSize() : void {
        this.minSize = new Vec2(300, 50);
    }

    setDistance(distance : number){
        this.ports[0].setPortValue(distance);
    }

    draw(): void {
        this.drawDataflowBlock();
        this.drawIcon(distanceSensorIcon);
    }
}

function  calcTerm(map : Map<string, number>, term : Term) : number {
    let value : number;

    if(term instanceof Rational){
        value = term.fval();
    }
    else if(term instanceof ConstNum){
        value = term.value.fval();
    }
    else if(term instanceof RefVar){
        value = map.get(term.name)!;
        assert(value != undefined);
    }
    else if(term instanceof App){
        const app = term;
        const arg_values = app.args.map(x => calcTerm(map, x));
        if(app.isAdd()){
            value = sum(arg_values);
        }
        else if(app.isMul()){
            value = arg_values.reduce((acc, cur) => acc * cur, 1);
        }
        else if(app.isDiv()){
            value = arg_values[0] / arg_values[1];
        }
        else{
            throw new MyError("unimplemented");
        }
    }
    else{

        throw new MyError("unimplemented");
    }

    return term.value.fval() * value;
}

export class CalcBlock extends InputTextBlock {
    constructor(data : Attr){
        super(data);
        this.ports = [ 
            new Port(this, PortType.inputPort, "a"), 
            new Port(this, PortType.outputPort, "b") 
        ];
    }

    calc(){
        msg(`start calc: a:${this.ports[0].value}`);
        const expr = parseMath(this.input.value.trim()) as App;
        assert(expr.isRootEq());
        const lhs = expr.args[0] as RefVar;
        const rhs = expr.args[1];

        const map = this.makeInputValueMap();

        const rhs_value = calcTerm(map, rhs);
        const lhs_port = this.ports.find(x => x.name == lhs.name && x.type == PortType.outputPort)!;
        assert(lhs_port != undefined);
        lhs_port.setPortValue(rhs_value);

        msg(`end calc: b:${this.ports[1].value}`);

        this.propergateCalc();
    }
}

export class CompareBlock extends InputTextBlock {    
    constructor(data : Attr){
        super(data);
        this.ports = [ 
            new Port(this, PortType.inputPort, "a"), 
            new Port(this, PortType.outputPort) 
        ];

        this.input.value = "a == a";
    }

    calc() {
        msg(`start compare: a:${this.ports[0].value}`);
        const expr = parseMath(this.input.value.trim()) as App;

        const map = this.makeInputValueMap();
        const result = calcTerm(map, expr);
        assert(result == 0 || result == 1);

        this.ports[1].setPortValue(result);
    }
}
export function makeBlockByTypeName(typeName : string) : Block {
    switch(typeName){
    case StartBlock.name:                    return new StartBlock({});
    case IfBlock.name:                       return new IfBlock({});
    case CompareBlock.name:                  return new CompareBlock({});
    case InfiniteLoop.name:                  return new InfiniteLoop({});
    case InputRangeBlock.name:               return new InputRangeBlock({});
    case ServoMotorBlock.name:               return new ServoMotorBlock({});
    case SetValueBlock.name:                 return new SetValueBlock({});
    case CameraBlock.name:                   return new CameraBlock({});
    case TTSBlock.name:                      return new TTSBlock({});
    case FaceDetectionBlock.name:            return new FaceDetectionBlock({});
    case JoyStickBlock.name:                 return new JoyStickBlock({});
    case UltrasonicDistanceSensorBlock.name: return new UltrasonicDistanceSensorBlock({});
    case CalcBlock.name:                     return new CalcBlock({});
    default:
        throw new MyError();
    }
}

}