namespace diagram_ts {
//
export let urlOrigin : string;

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
    pipes : Pipe[] = [];
    position : Vec2 = Vec2.zero();

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
        port.position = this.position.copy();

        return port;
    }

    makeObj() : any{
        return {
            idx : this.idx,
            destinations : this.destinations.map(dst => dst.idx)
        };
    }

    isNear(pos : Vec2){
        return this.position.distance(pos) < Port.radius;
    }

    drawPort(ctx : CanvasRenderingContext2D, cx : number, cy : number) : void {       
        ctx.beginPath();

        this.position.x = cx;
        this.position.y = cy;

        ctx.arc(this.position.x, this.position.y, Port.radius, 0, 2 * Math.PI);

        ctx.fill();
        ctx.stroke();

        for(const dst of this.destinations){
            Canvas.one.drawLine(this.position, dst.position, "brown");
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
    }

    canConnect(dst : Port) : boolean {
        const pairs = [
            [ PortType.bottom, PortType.top],
            [ PortType.top , PortType.bottom],
            // [ PortType.left , PortType.right],
            // [ PortType.right   , PortType.left],

            [ PortType.inputPort, PortType.outputPort],
            [ PortType.outputPort, PortType.inputPort]
        ];

        return pairs.some(pair => pair[0] == this.type && pair[1] == dst.type);
    }

    connect(port : Port) : void {   
        assert(this.canConnect(port));

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

    async valueChanged(value : number){
        await this.parent.valueChanged(value);
    }
}

class Joint {

    drawJoint(canvas : Canvas){        
    }
}

class Tube {

    drawTube(canvas : Canvas){        
    }
}

export class Pipe {
    source! : Port;
    destination! : Port;
    tubes : Tube[] = [];
    joints : Joint[] = [];

    drawPipe(canvas : Canvas){        
    }
}

export class Edge {
}

class Plot {    
}

export class Layer {
}

class Scheduler {
}

document.addEventListener('DOMContentLoaded', async () => {
    await asyncBodyOnLoad();
});  

//
let main : Main;

export class Main {
    static one : Main;
    canvas : Canvas;
    editor : Editor;

    constructor(){
        Main.one = this;
        // Get the canvas element

        this.editor = new Editor({});

        const root = $grid({
            rows : "100px 100%",        
            columns : "100px 25% 75%",
            cells : [
                // [
                //     $filler({
                //         colspan : 3,
                //         backgroundColor : "cornsilk"
                //     })
                // ]
                // ,
                [
                    $button({
                        text : "download",
                        click : async ()=>{
                            saveJson();
                        }
                    })
                    ,
                    $button({
                        text : "start",
                        click : async ()=>{
                            await startProgram();
                        }
                    })
                    ,
                    $filler({})
                ]
                ,
                [
                    $filler({})
                    ,
                    $vlist({
                        column : "100%",
                        children : [
                            $label({
                                text : "button"
                            })
                            ,
                            new StartBlock({ inToolbox : true })
                            ,
                            new IfBlock({ inToolbox : true })
                            ,
                            new InfiniteLoop({ inToolbox : true })
                            ,
                            new CompareBlock({ inToolbox : true })
                            ,
                            new ActionBlock({ inToolbox : true })
                            ,
                            new InputRangeBlock({ inToolbox : true })
                            ,
                            new ServoMotorBlock({ inToolbox : true })
                            ,                            
                            new SetValueBlock({ inToolbox : true })
                            ,
                            new CameraBlock({ inToolbox : true })
                            ,
                            new FaceDetectionBlock({ inToolbox : true })
                            ,
                            new CalcBlock({ inToolbox : true })
                        ]
                    })
                    ,
                    this.editor
                ]
            ]
        });

        const canvas_html = document.getElementById('world') as HTMLCanvasElement;
        this.canvas = new Canvas(canvas_html, root)

        // Initial resize when the page loads
        // Use DOMContentLoaded to ensure the canvas element exists before trying to access it
        document.addEventListener('DOMContentLoaded', this.canvas.resizeCanvas.bind(this.canvas));

        // Add an event listener to resize the canvas whenever the window is resized
        window.addEventListener('resize', this.canvas.resizeCanvas.bind(this.canvas));

        setDragDrop(this.canvas.canvas);

        this.canvas.resizeCanvas();
    }

}

export async function startProgram(){
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

function updateCameraImage(image_file_name : string){
    const blocks = Main.one.editor.blocks;
    const cameras = blocks.filter(x => x instanceof CameraBlock);
    for(const camera of cameras){
        cameraImg.src = `static/lib/diagram/img/${image_file_name}`;
    }
}

async function periodicTask() {
    const result = await sendData({
        command : "status"
    });
    const json_str = JSON.stringify(result, null, 2);
    msg(`status:${json_str}`);

    const queue = result["queue"]
    const image_file_name = queue["image_file_name"];
    if(image_file_name != undefined){
        updateCameraImage(image_file_name);
    }

    setTimeout(periodicTask, 1000);
}

export async function asyncBodyOnLoad(){
    msg("loaded");
    let pathname  : string;
    [ urlOrigin, pathname, ] = i18n_ts.parseURL();
    msg(`origin:[${urlOrigin}] path:[${pathname}]`);

    cameraImg = document.getElementById("camera-img") as HTMLImageElement;
    main = new Main();

    if( urlOrigin != "http://127.0.0.1:5500"){
        await periodicTask();
    }
}


// export class Node {
// }

/*
ダイアグラム
・フローチャート
・データフロー
・回路図
・UI画面
・UML
    ・シーケンス図
    ・クラス図
    ・アクティビティ図
    ・コンポーネント図
    ・状態遷移図
    ・タイミング図
    ・
・
・
・
・

コンポーネント
・実行
    ・if/else
    ・while
    ・代入
    ・ストリーム
        ・通信
            ・プロセス間
            ・ソケット
                ・TCP
                ・UDP
        ・バッファ付き
    ・sleep
    ・wait until
    ・call function
    ・ブロック
        ・関数定義
        ・デバイス


実行モード
・編集
・エミュレーション
・実機デバッグ

スケジューリング
・即時に再実行
・Tick時に再実行

・入力されたら
・値が変化したら

・１つでも入力されたら
・全部入力されたら

*/


}