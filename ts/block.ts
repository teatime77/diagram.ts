///<reference path="export.ts" />
///<reference path="ui.ts" />

namespace diagram_ts {
//
export const notchRadius = 10;        
export const inputHeight = 21;

const blockLineColor = "brown";
const nearPortDistance = 10;

const rangeWidth  = 150;
const numberWidth = 45;

export let cameraIcon : HTMLImageElement;
export let motorIcon  : HTMLImageElement;
export let cameraImg : HTMLImageElement;
export let distanceSensorIcon : HTMLImageElement;
export let ttsIcon : HTMLImageElement;
export let sleepIcon : HTMLImageElement;

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

    clearBlock() : void {        
    }

    loadObj(obj : any ){        
    }

    abstract setMinSize() : void;

    calcHeight() : number {
        return this.boxSize!.y;
    }

    getUIPortFromPosition(pos : Vec2) : UI | Port | undefined {
        const port = this.getPortFromPosition(pos);
        if(port != undefined){
            return port;
        }

        const target = super.getUIPortFromPosition(pos);
        if(target != undefined){
            return target;
        }

        const [xa, ya, xb, yb] = this.marginBox();

        if(xa <= pos.x && pos.x < xb){
            if(ya <= pos.y && pos.y < yb){
                return this;
            }
        }
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

        Canvas.one.layoutRoot();
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

    drawOutline(points : [number, number, null|Port][], color : string = blockLineColor){
        const canvas = Canvas.one;
        if(canvas.draggedUI == this){

            this.ctx.globalAlpha = 0.5;
        }
        else if(canvas.nearPorts.length != 0 && canvas.nearPorts[1].parent == this){
            this.ctx.globalAlpha = 0.5;
        }

        this.ctx.fillStyle   = this.backgroundColor!;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth   = this.borderWidth;

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
        const [x1, y1, x2, y2] = this.borderInnerBox();


        const img_height = y2 - y1;
        const img_width  = img_height * img.width / img.height;

        const img_x = x2 - img_width;
        const img_y = y1;

        this.ctx.drawImage(img, img_x, img_y, img_width, img_height);
    }

    drawDataflowBlock(){
        const [x1, y1, x2, y2] = this.borderInnerBox();

        this.drawOutline([
            [x1, y1, null],
            [x1, y2, null],
            [x2, y2, null],
            [x2, y1, null],
        ]);

        this.drawIOPorts(x1, x2, y1, y2);
    }

    drawActionBlock(){
        const [x1, y1, x2_, y2_] = this.borderInnerBox();

        const x2 = x1 + 35;

        const y2 = y2_ - notchRadius;

        this.drawOutline([
            [x1, y1, null],

            [x1, y2, null],
            [x2, y2, this.ports[1]],
            [x2_, y2, null],

            [x2_, y1, null],
            [x2, y1, this.ports[0]]
        ]);

        this.drawIOPorts(x1, x2_, y1, y2_);
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

    async valueChanged(){
        msg(`changed : ${this.constructor.name}`);
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

    calc(){
        throw new MyError();
    }

    async run(){
        throw new MyError();
    }

    drawDebug(){
        const x = this.position.x;
        const y = this.position.y;

        this.ctx.save();
        this.ctx.lineWidth = 1;

        this.ctx.strokeStyle = "green";
        this.ctx.strokeRect(x, y, this.boxSize.x, this.boxSize.y);

        this.ctx.strokeStyle = "blue";
        this.ctx.strokeRect(x, y, this.boxSize.x, this.boxSize.y);

        {
            const [xa, ya, xb, yb] = this.marginBox();
            this.ctx.strokeStyle = "red";
            this.ctx.strokeRect(xa, ya, xb - xa, yb - ya);
        }

        {
            const [xa, ya, xb, yb] = this.borderCenterBox();
            this.ctx.strokeStyle = "cyan";
            this.ctx.strokeRect(xa, ya, xb - xa, yb - ya);
        }

        {
            const [xa, ya, xb, yb] = this.borderInnerBox();
            this.ctx.strokeStyle = "magenta";
            this.ctx.strokeRect(xa, ya, xb - xa, yb - ya);
        }

        this.ctx.restore();
    }
}

export abstract class ActionBlock extends Block {
    topPort       = new Port(this, PortType.top);
    bottomPort    = new Port(this, PortType.bottom);

    constructor(data : Attr){
        super(data);

        this.ports = [ 
            this.topPort, 
            this.bottomPort 
        ];
    }

    dependentPorts() : Port[] {
        return [ this.bottomPort ];
    }

    *dependantActions() : Generator<ActionBlock> {
        for(const src_port of this.dependentPorts()){
            for(const dst_port of src_port.destinations){
                const action = dst_port.parent as ActionBlock;
                yield* action.dependantActions();
            }
        }

        yield this;
    }

    nextBlock() : ActionBlock | undefined {        
        if(this.bottomPort.destinations.length != 0){
            const dest_port = this.bottomPort.destinations[0];
            return dest_port.parent as ActionBlock;
        }

        return undefined;
    }
}

export abstract class FunctionBlock extends Block {
}


export abstract class InputBlock extends FunctionBlock {
    input : HTMLInputElement;

    abstract updatePort() : void;

    constructor(data : Attr){
        super(data);

        this.input = document.createElement("input");
        this.input.style.position = "absolute";

        document.body.appendChild(this.input);
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

    clearBlock(): void {
        super.clearBlock();
        document.body.removeChild(this.input);
    }

    getInputPosition() : [number, number]{
        const [x1, y1, x2, y2] = this.borderInnerBox();

        const rect = this.input.getBoundingClientRect();
        msg(`input h:${rect.height} ${this.input.type}`);

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

    draw(){
        this.drawDataflowBlock();
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
            this.updatePort();
            
            Canvas.one.requestUpdateCanvas();
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

    clearBlock(): void {
        super.clearBlock();
        
        document.body.removeChild(this.minInput);
        document.body.removeChild(this.maxInput);
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
            value : this.input.value,
            min   : this.minInput.value,
            max   : this.maxInput.value
        });

        return obj;
    }

    loadObj(obj : any ){        
        super.loadObj(obj);

        this.input.value    = `${obj.value}`;
        this.minInput.value = `${obj.min}`;
        this.maxInput.value = `${obj.max}`;
    }

    updatePort() : void {        
        const value = parseFloat(this.input.value);
        for(const src of this.ports){
            src.setPortValue(value);
        }
    }

    setMinSize() : void {
        this.boxSize = new Vec2(200, 80);
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [xa, ya, xb, yb] = this.borderInnerBox();
        const height = yb - ya;

        const rc1 = this.input.getBoundingClientRect();
        const rc2 = this.minInput.getBoundingClientRect();

        const gap = (height - (rc1.height + rc2.height + 2 * Port.radius + this.borderWidth)) / 3;

        const x1 = xa + this.borderWidth + 2 * Port.radius;
        const y1 = ya + gap;
        const y2 = y1 + rc1.height + gap;

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


export class ServoMotorBlock extends FunctionBlock {
    inputPort = new NumberPort(this, PortType.inputPort);
    input : HTMLInputElement;

    constructor(data : Attr){
        super(data);
        
        this.ports.push(this.inputPort);
        this.input = document.createElement("input");
        this.input.type = "number";
        this.input.style.width = "45px";
        this.input.value = "0";
        this.input.min   = "0";
        this.input.max   = "15";
        this.input.style.position = "absolute";

        document.body.appendChild(this.input);
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
        this.boxSize = new Vec2(200, 50);
    }

    setPosition(position : Vec2) : void {
        super.setPosition(position);

        const [x1, y1, x2, y2] = this.borderInnerBox();

        const rect = this.input.getBoundingClientRect();
        msg(`input h:${rect.height} ${this.input.type}`);

        const input_x = x1 + 10;
        const input_y = y1 + 0.5 * ((y2 - y1) - rect.height);

        this.input.style.left = `${input_x}px`;
        this.input.style.top  = `${input_y}px`;
    }

    draw(): void {
        this.drawDataflowBlock();
        this.drawIcon(motorIcon);
    }

    async valueChanged(){
        const channel = parseInt(this.input.value);
        const value   = this.ports[0].value;
        msg(`motor changed : ch:${channel} value:[${value}]`);
        if(typeof value != "number"){
            msg(`illegal motor value:${value}`);
            return;
        }

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


export class InputTextBlock extends InputBlock {
    textPort : TextPort;

    constructor(data : Attr){
        super(data);
        this.input.type = "text";

        this.textPort = new TextPort(this, PortType.outputPort);
        this.ports    = [ this.textPort ];

        this.input.addEventListener("input", async (ev : Event) => {
            this.updatePort();
            
            Canvas.one.requestUpdateCanvas();
        });
    }

    updatePort() : void {        
        this.textPort.setPortValue(this.input.value);
    }

    setMinSize() : void {
        this.boxSize = new Vec2(200, 20 + 2 * 2 * notchRadius);
    }
}

export class InputNumberBlock extends InputBlock {
    numberPort : NumberPort;

    constructor(data : Attr){
        super(data);
        this.input.type = "number";
        this.input.value = "0";

        this.numberPort = new NumberPort(this, PortType.outputPort);
        this.numberPort.setPortValue(this.input.valueAsNumber);

        this.ports    = [ this.numberPort ];

        this.input.addEventListener("input", async (ev : Event) => {
            this.updatePort();
            
            Canvas.one.requestUpdateCanvas();
        });
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
            value : this.input.valueAsNumber
        });

        return obj;
    }

    loadObj(obj : any ){        
        super.loadObj(obj);
        this.input.value = obj.value;
    }

    updatePort() : void {        
        this.numberPort.setPortValue(this.input.valueAsNumber);
    }

    setMinSize() : void {
        this.boxSize = new Vec2(200, 20 + 2 * 2 * notchRadius);
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
        const h = inputHeight + 2 * Port.radius + 2 * notchRadius + 3 * this.borderWidth;
        this.boxSize = new Vec2(200, h);
    }

    getInputPosition() : [number, number]{
        const [x1, y1, x2, y2] = this.borderInnerBox();

        const rect = this.input.getBoundingClientRect();
        msg(`input h:${rect.height} ${this.input.type}`);

        const input_x = x1 + 0.5 * ((x2 - x1) - rect.width);
        const input_y = y1;

        return [input_x, input_y];
    }

    draw(){
        const [xa, ya, xb, yb] = this.borderInnerBox();

        const x2 = xa + 35;

        const y2 = yb - notchRadius;

        this.drawOutline([
            [xa, ya, null],

            [xa, y2, null],
            [x2, y2, this.ports[2]],
            [xb, y2, null],

            [xb, ya, null],
            [x2, ya, this.ports[0]]
        ])

        this.drawIOPorts(xa, xb, ya, y2);
    }
}


export class CameraBlock extends Block {
    constructor(data : Attr){
        super(data);
        this.ports = [ new Port(this, PortType.outputPort) ];

    }

    setMinSize() : void {
        if(this.inToolbox){

            this.boxSize = new Vec2(320, 50 + 2 * notchRadius);
        }
        else{

            this.boxSize = new Vec2(320, 240 + 2 * notchRadius);
        }
    }


    draw(){
        this.drawDataflowBlock();

        const [x1, y1, x2, y2] = this.borderInnerBox();

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

export class TTSBlock extends ActionBlock {
    inputPort = new TextPort(this, PortType.inputPort);
    speech : Speech;

    constructor(data : Attr){
        super(data);
        this.ports.push(this.inputPort);

        i18n_ts.setVoiceLanguageCode("jpn");
        this.speech = new Speech();
    }

    setMinSize() : void {
        // const h = inputHeight + 2 * notchRadius + 4 * this.borderWidth;
        this.boxSize = new Vec2(300, 60);
    }

    draw(): void {
        this.drawActionBlock();
        this.drawIcon(ttsIcon);
    }

    async run(){
        const text = this.inputPort.stringValue().trim();
        await this.speech.speak_waitEnd(text);
    }
}


export class SleepBlock extends ActionBlock {
    inputPort = new NumberPort(this, PortType.inputPort);

    constructor(data : Attr){
        super(data);
        this.ports.push(this.inputPort);
    }

    setMinSize() : void {
        this.boxSize = new Vec2(200, 60);
    }

    draw(): void {
        this.drawActionBlock();
        this.drawIcon(sleepIcon);
    }

    async run(){
        const second = this.inputPort.numberValue();
        await sleep(second * 1000);
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

            this.boxSize = new Vec2(150, 10 + 2 * 2 * notchRadius);
        }
        else{

            this.boxSize = new Vec2(320, 240 + 2 * 2 * notchRadius);
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
            const [x1, y1, x2, y2] = this.borderInnerBox();

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
        this.boxSize = new Vec2(150, 50);
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
        this.boxSize = new Vec2(300, 50);
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
        return term.fval();
    }
    else if(term instanceof ConstNum){
        return term.value.fval();
    }
    else if(term instanceof RefVar){
        value = map.get(term.name)!;
        assert(value != undefined);
        return value;
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
        else if(app.fncName == "%"){
            value = arg_values[0] % arg_values[1];
        }
        else if(app.isEq()){
            value = (arg_values[0] == arg_values[1] ? 1 : 0);
        }
        else if(app.fncName == "<="){
            value = (arg_values[0] <= arg_values[1] ? 1 : 0);
        }
        else if(app.fncName == "<"){
            value = (arg_values[0] < arg_values[1] ? 1 : 0);
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

    setMinSize() : void {
        // const h = inputHeight + 2 * 2 * Port.radius + 4 * this.borderWidth;
        this.boxSize = new Vec2(200, 80);
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
    setMinSize() : void {
        this.boxSize = new Vec2(200, 80);
    }

    calc() {
        msg(`start compare: a:${this.ports[0].value}`);
        let expr : App;

        try{
            expr = parseMath(this.input.value.trim()) as App;
        }
        catch(error){
            if(error instanceof parser_ts.SyntaxError){
                msg(`syntax error`);
            }
            else{
                console.error("An unexpected error occurred:", error);
            }

            this.ports[1].setPortValue(undefined);
            return;
        }

        const map = this.makeInputValueMap();
        const result = calcTerm(map, expr);

        if(result == 0 || result == 1){

            this.ports[1].setPortValue(result);
        }
        else{

            msg(`illegal compare result:${result}`);
            this.ports[1].setPortValue(undefined);
        }
    }
}

export function makeBlockByTypeName(typeName : string) : Block {
    switch(typeName){
    case InputTextBlock.name:                return new InputTextBlock({});
    case InputNumberBlock.name:              return new InputNumberBlock({});
    case IfBlock.name:                       return new IfBlock({});
    case CompareBlock.name:                  return new CompareBlock({});
    case InfiniteLoop.name:                  return new InfiniteLoop({});
    case InputRangeBlock.name:               return new InputRangeBlock({});
    case ServoMotorBlock.name:               return new ServoMotorBlock({});
    case SetValueBlock.name:                 return new SetValueBlock({});
    case CameraBlock.name:                   return new CameraBlock({});
    case TTSBlock.name:                      return new TTSBlock({});
    case SleepBlock.name:                    return new SleepBlock({});
    case FaceDetectionBlock.name:            return new FaceDetectionBlock({});
    case JoyStickBlock.name:                 return new JoyStickBlock({});
    case UltrasonicDistanceSensorBlock.name: return new UltrasonicDistanceSensorBlock({});
    case CalcBlock.name:                     return new CalcBlock({});
    default:
        throw new MyError();
    }
}

}