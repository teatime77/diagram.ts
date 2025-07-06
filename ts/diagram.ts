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

export abstract class Port {
    parent! : Node;
    destinations : Port[] = [];
    pipes : Pipe[] = [];
    position! : Vec2;

    prevValue : any | undefined;
    value : any | undefined;

    abstract drawPort(canvas : Canvas) : void;

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

export class Canvas {
}

class Scheduler {
}

document.addEventListener('DOMContentLoaded', async () => {
    await asyncBodyOnLoad();
});  

//
let main : Main;

export class Main {
    canvas : HTMLCanvasElement;
    ctx : CanvasRenderingContext2D;
    editor : Editor;
    root   : Grid;

    constructor(){
        // Get the canvas element
        this.canvas = document.getElementById('world') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!; // Or 'webgl', 'webgl2'
        if (!this.ctx) {
            console.error("Canvas context not supported!");
        }

        this.editor = new Editor({});

        this.root = $grid({
            rows : "100px 100%",        
            columns : "100px 20% 80%",
            cells : [
                [
                    $filler({
                        colspan : 3,
                        children : [],
                        backgroundColor : "cornsilk"
                    })
                ]
                ,
                [
                    $filler({
                        children : []
                    })
                    ,
                    $filler({
                        children : []
                    })
                    ,
                    this.editor
                ]
            ]
        });
        

        // Initial resize when the page loads
        // Use DOMContentLoaded to ensure the canvas element exists before trying to access it
        document.addEventListener('DOMContentLoaded', this.resizeCanvas.bind(this));

        // Add an event listener to resize the canvas whenever the window is resized
        window.addEventListener('resize', this.resizeCanvas.bind(this));

        this.resizeCanvas();
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