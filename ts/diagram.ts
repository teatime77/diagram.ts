namespace diagram_ts {
//


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
    parent : Block;
    destinations : Port[] = [];
    type : NotchType = NotchType.unknown;
    pipes : Pipe[] = [];
    position : Vec2 = Vec2.zero();

    prevValue : any | undefined;
    value : any | undefined;

    constructor(parent : Block){
        this.parent = parent;
    }

    copyPort(parent : Block) : Port {
        const port = new Port(parent);
        port.position = this.position.copy();

        return port;
    }

    drawPort(canvas : Canvas) : void {        
    }

    canConnect(dst : Port) : boolean {
        const pairs = [
            [ NotchType.Rightwards, NotchType.Leftwards],
            [ NotchType.Leftwards , NotchType.Rightwards],
            [ NotchType.Downwards , NotchType.Upwards],
            [ NotchType.Upwards   , NotchType.Downwards]
        ];

        return pairs.some(pair => pair[0] == this.type && pair[1] == dst.type);
    }

    connect(dst : Port) : void {        
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
            columns : "100px 20% 80%",
            cells : [
                [
                    $filler({
                        colspan : 3,
                        backgroundColor : "cornsilk"
                    })
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
                            $label({
                                text : "push"
                            })
                            ,
                            $label({
                                text : "camera"
                            })
                            ,
                            $if_block()
                            ,
                            new ConditionBlock()
                            ,
                            new ActionBlock()
                            ,
                            $label({
                                text : "video"
                            })
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

        this.canvas.resizeCanvas();
    }

}


export async function asyncBodyOnLoad(){
    msg("loaded");
    main = new Main();
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