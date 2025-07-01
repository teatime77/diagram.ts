namespace diagram_ts {
//
class Vec2 {
}

export abstract class Node {
    position! : Vec2;

    abstract done() : boolean;
    abstract drawNode(canvas : Canvas) : void;
}

export abstract class Block extends Node {
}

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

export async function asyncBodyOnLoad(){
    msg("loaded");
    initCanvas();
}

document.addEventListener('DOMContentLoaded', async () => {
    await asyncBodyOnLoad();
});  

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