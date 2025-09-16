namespace diagram_ts {
//
export let urlOrigin : string;
let startButton : HTMLButtonElement;
export let stopFlag : boolean = false;
let isRunning : boolean = false;

class Variable {
    name! : string;
    type! : DataType;
}

class Field extends Variable {
    parent! : Struct;
}

export class Struct {
    members : Field[] = [];
}

export class DataType {
    dimensions : number[] = [];
    typeName! : string;

}

export class Port {
    static radius = 10;        

    idx : number = 0;
    name : string;
    parent : Block;
    destinations : Port[]  = [];
    sources : Port[]  = [];
    type : PortType;
    offset : Vec2 = Vec2.zero();
    private position : Vec2 = Vec2.zero();

    prevValue : any | undefined;
    value : any | undefined;

    constructor(parent : Block, type : PortType, name : string = ""){
        this.parent = parent;
        this.type   = type;
        this.name   = name;
    }

    str() : string {
        return "port";
    }

    copyPort(parent : Block) : Port {
        const port = new Port(parent, this.type);
        port.setPortPositionXY(this.position.x, this.position.y);

        return port;
    }

    makeObj() : any{
        return {
            idx : this.idx,
            destinations : this.destinations.map(dst => dst.idx)
        };
    }

    setPortValue(value : any | undefined){
        this.value = value;

        for(const dst of this.destinations){
            dst.setPortValue(value);

            dst.parent.valueChanged()
            .then(()=>{
            })
            .catch(error => {
                console.error("Failed to value change:", error);
            });
        }
    }

    getPosition() : Vec2 {
        return this.position;
    }

    setPortPositionXY(x : number, y : number){
        this.position.x = x;
        this.position.y = y;

        this.offset.x = x - this.parent.position.x;
        this.offset.y = y - this.parent.position.y;
    }

    isNear(pos : Vec2){
        return this.position.distance(pos) < Port.radius;
    }

    isNearPort(port : Port){
        return this.position.distance(port.position) < Port.radius;
    }

    diffPosition(port : Port) : Vec2 {
        return this.position.sub(port.position);
    }

    prevPort() : Port | undefined {
        if(this.sources.length == 1){
            return this.sources[0];
        }

        return undefined;
    }

    nextPort() : Port | undefined {
        if(this.destinations.length == 1){
            return this.destinations[0];
        }

        return undefined;
    }
    
    drawNotch(ctx : CanvasRenderingContext2D){
        switch(this.type){
        case PortType.top:
            ctx.arc(this.position.x, this.position.y, notchRadius, 0, Math.PI, false);
            break;

            case PortType.bottom:
            ctx.arc(this.position.x, this.position.y, notchRadius, Math.PI, 0, true);
            break;

        default:
            throw new MyError();
        }
    }

    drawIOPort(ctx : CanvasRenderingContext2D) : void {   
        ctx.beginPath();

        ctx.arc(this.position.x, this.position.y, Port.radius, 0, 2 * Math.PI);

        ctx.fill();
        ctx.stroke();

        for(const dst of this.destinations){
            Canvas.one.drawLine(this.position, dst.position, "brown", 4);
        }

        if(this.name != ""){
            // ctx.strokeText(this.name, this.position.x, this.position.y);
            ctx.save();
            ctx.font = '24px Arial';
            ctx.fillStyle = "black";
            const x = this.position.x - 7;
            const y = this.position.y + 7;
            ctx.fillText(this.name, x, y);
            ctx.restore();
        }

        if(this.value != undefined){

            ctx.save();
            ctx.font = '24px Arial';
            ctx.fillStyle = "black";
            const x = this.position.x - 7 + Port.radius;
            const y = this.position.y + 7;
            ctx.fillText(`${this.value}`, x, y);
            ctx.restore();
        }
    }

    drawDraggedPort(move_pos : Vec2){       
        Canvas.one.drawLine(this.position, move_pos, "blue") ;
    }

    fitPortType(dst : Port) : boolean {
        const pairs = [
            [ PortType.bottom, PortType.top],
            [ PortType.top , PortType.bottom],

            [ PortType.inputPort, PortType.outputPort],
            [ PortType.outputPort, PortType.inputPort]
        ];

        return pairs.some(pair => pair[0] == this.type && pair[1] == dst.type);
    }

    canConnect(dst : Port) : boolean {
        return this.fitPortType(dst) && this.isNearPort(dst);
    }

    connect(port : Port) : void {   
        assert(this.fitPortType(port));

        let src : Port;
        let dst : Port;

        if(this.type == PortType.bottom || this.type == PortType.outputPort){
            [src, dst] = [this, port];
        }
        else{
            [src, dst] = [port, this];
        }

        append(src.destinations, dst);
        append(dst.sources, src);

        msg(`connect port:${this.idx}=>${port.idx}`);
    }

    disconnect(port : Port) : void {   
        remove(this.destinations, port, true);
        remove(port.sources, this, true);
    }
}

export class NumberPort extends Port {
    numberValue() : number {
        if(typeof this.value == "number"){
            return this.value;
        }

        throw new MyError();
    }
}

export class TextPort extends Port {
    stringValue() : string {
        if(typeof this.value == "string"){
            return this.value;
        }

        throw new MyError();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await asyncBodyOnLoad();
});  


export class Main {
    static one : Main;
    canvas : Canvas;

    constructor(){
        Main.one = this;

        const tools : Block[] = [
            new IfBlock({ inToolbox : true })
            ,
            new InfiniteLoop({ inToolbox : true })
            ,
            new TTSBlock({ inToolbox : true })
            ,
            new SleepBlock({ inToolbox : true })
            ,
            new InputTextBlock({ inToolbox : true })
            ,
            new InputNumberBlock({ inToolbox : true })
            ,
            new CompareBlock({ inToolbox : true })
            ,
            new InputRangeBlock({ inToolbox : true })
            ,
            new ServoMotorBlock({ inToolbox : true })
            ,
            new CameraBlock({ inToolbox : true })
            ,
            new FaceDetectionBlock({ inToolbox : true })
            ,
            new CalcBlock({ inToolbox : true })
            ,
            new UltrasonicDistanceSensorBlock({ inToolbox : true })
        ];

        new Editor(tools);

        const canvas_html = document.getElementById('world') as HTMLCanvasElement;
        this.canvas = new Canvas(canvas_html);

        // Initial resize when the page loads
        // Use DOMContentLoaded to ensure the canvas element exists before trying to access it
        document.addEventListener('DOMContentLoaded', this.canvas.resizeCanvas.bind(this.canvas));

        // Add an event listener to resize the canvas whenever the window is resized
        window.addEventListener('resize', this.canvas.resizeCanvas.bind(this.canvas));

        setDragDrop(this.canvas.canvas);

        this.canvas.resizeCanvas();
    }

}

function fetchImage(image_url : string){
    const image = new Image();
    image.width  = 320;
    image.height = 240;

    // 2. Set the crossOrigin attribute for security and to prevent a tainted canvas
    image.crossOrigin = 'Anonymous'; 
    
    image.src = image_url; 

    // 4. Wait for the image to load
    image.onload = () => {
        cameraImg = image;
    };
}

function updateCameraImage(image_file_name : string){
    const blocks = Editor.one.blocks;
    const cameras = blocks.filter(x => x instanceof CameraBlock);
    for(const camera of cameras){
        const image_url = `static/lib/diagram/img/${image_file_name}`;
        fetchImage(image_url);
    }
}

function updateFaceDetection(face : number[]){
    const face_detection = Editor.one.blocks.find(x => x instanceof FaceDetectionBlock) as FaceDetectionBlock;
    if(face_detection != undefined){
        face_detection.setFace(face);

        face_detection.propergateCalc();
    }
}

function updateDistanceSensor(distance : number){
    const distance_sensor = Editor.one.blocks.find(x => x instanceof UltrasonicDistanceSensorBlock) as UltrasonicDistanceSensorBlock;
    if(distance_sensor != undefined){
        distance_sensor.setDistance(distance);

        distance_sensor.propergateCalc();
    }
}

async function clearQueue() {
    for(let idx = 0; ; idx++){
        const result = await sendData({
            command : "status"
        });

        const queue = result["queue"]
        if(queue == null){
            break;
        }
        
        msg(`clear queue:${idx}`);
    }
}

async function periodicTask() {
    const result = await sendData({
        command : "status"
    });

    const queue = result["queue"]
    if(queue != null){

        const json_str = JSON.stringify(result, null, 2);
        // msg(`status:${json_str}`);

        const image_file_name = queue["image_file_name"];
        if(image_file_name != undefined){
            updateCameraImage(image_file_name);
        }

        const face = queue["face"];
        if(face != undefined){
            assert(face.length == 4);
            updateFaceDetection(face);
        }

        const distance = queue["distance"];
        if(distance != undefined){
            assert(typeof distance == "number");
            updateDistanceSensor(distance);
        }

        Canvas.one.requestUpdateCanvas();
    }

    setTimeout(periodicTask, 100);
}

export function allActions() : ActionBlock[] {
    return Editor.one.blocks.filter(x => x instanceof ActionBlock);
}

export function allDependentPorts() : Port[] {
    const action_blocks = allActions();
    return action_blocks.map(x => x.dependentPorts()).flat();
}

export function getTopActions() : ActionBlock[] {
    const action_blocks = allActions();

    const top_blocks : ActionBlock[] = [];
    for(const block of action_blocks){
        const top_port = block.ports.find(x => x.type == PortType.top)!;
        assert(top_port != undefined);
        if(top_port.sources.length == 0){
            top_blocks.push(block);
        }
    }

    return top_blocks;
}

export async function runBlockChain(top_block : ActionBlock){
    for(let block : ActionBlock | undefined = top_block; block != undefined; block = block.nextBlock()){
        await block.run();

        if(stopFlag){
            break;
        }
    }
}

async function startProcedures() {
    startButton.innerText = "Stop";

    isRunning = true;
    stopFlag = false;

    const input_blocks = Editor.one.blocks.filter(x => x instanceof InputBlock);
    input_blocks.forEach(x => x.updatePort());


    const top_blocks = getTopActions();
    for(const top_block of top_blocks){
        msg(`top proc:${top_block.constructor.name}`);
        await runBlockChain(top_block);

        if(stopFlag){
            break;
        }
    }

    msg("procedures complete.");
    isRunning = false;
    startButton.innerText = "Start";
}

export async function asyncBodyOnLoad(){
    msg("loaded");
    let pathname  : string;
    [ urlOrigin, pathname, ] = i18n_ts.parseURL();
    msg(`origin:[${urlOrigin}] path:[${pathname}]`);

    cameraIcon = document.getElementById("camera-icon") as HTMLImageElement;
    motorIcon  = document.getElementById("motor-icon") as HTMLImageElement;
    distanceSensorIcon  = document.getElementById("distance-sensor-icon") as HTMLImageElement;
    ttsIcon    = document.getElementById("tts-icon") as HTMLImageElement;
    sleepIcon    = document.getElementById("sleep-icon") as HTMLImageElement;
    
    $("clear-btn").addEventListener("click", (ev : MouseEvent)=>{
        Editor.one.clearBlock();
    });

    startButton = $("start-btn") as HTMLButtonElement;
    startButton.addEventListener("click", async(ev : MouseEvent)=>{
        if(isRunning){

            stopFlag = true;
        }
        else{
            await startProcedures();
        }
    });

    const downloadBtn = $("download-btn") as HTMLButtonElement;
    downloadBtn.addEventListener("click", async(ev : MouseEvent)=>{
        saveJson();
    });


    new Main();

    await clearQueue();

    if( urlOrigin != "http://127.0.0.1:5500"){
        await periodicTask();
    }
}

}