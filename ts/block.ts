///<reference path="export.ts" />
///<reference path="ui.ts" />

namespace diagram_ts {
//
const notchSize : Vec2 = new Vec2(20, 20);
const blockLineWidth = 2;
const blockLineColor = "brown";

enum NotchType {
    Rightwards,
    Leftwards,
    Downwards,
    Upwards
}

export abstract class Block extends UI {
    parent? : UI;
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
        case NotchType.Rightwards:
            this.ctx.arc(cx, cy, radius, Math.PI, 0, true);
            break;
        case NotchType.Leftwards:
            this.ctx.arc(cx, cy, radius, 0, Math.PI, false);
            break;

        case NotchType.Upwards:
            this.ctx.arc(cx, cy, radius, 0.5 * Math.PI, 1.5 * Math.PI, true);
            break;

        case NotchType.Downwards:
            this.ctx.arc(cx, cy, radius, 1.5 * Math.PI, 0.5 * Math.PI, false);
            break;
        }
    }

    drawOutline(points : [number, number, null|NotchType][]){
        if(Canvas.one.draggedUI == this){
            this.ctx.globalAlpha = 0.5;
        }

        this.ctx.fillStyle = this.backgroundColor!;

        this.ctx.strokeStyle = blockLineColor;
        this.ctx.lineWidth   = blockLineWidth;

        this.ctx.beginPath();

        for(const [idx, [x, y, type]] of points.entries()){
            if(idx == 0){

                this.ctx.moveTo(x, y);
            }
            else{
                if(type == null){

                    this.ctx.lineTo(x, y);
                }
                else{
                    this.drawNotch(x, y, type);
                }
            }
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        if(Canvas.one.draggedUI == this){
            this.ctx.globalAlpha = 1.0;
        }
    }
}

export class IfBlock extends Block {
    constructor(){
        super({});
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
            [x2, y4, NotchType.Rightwards],
            [x4, y4, null],

            [x4, y3, null],
            // [x3, y3, NotchType.RightToLeft],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, NotchType.Rightwards],
            [x4, y2, null],

            [x4, 0.5 * (y1 + y2), NotchType.Upwards],

            [x4, y1, null],
            [x2, y1, NotchType.Leftwards]
        ])
    }
}

export class ConditionBlock extends Block {
    constructor(){
        super({});
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

            [x1, 0.5 * (y1 + y2), NotchType.Downwards],

            [x1, y2, null],
            [x2, y2, null],
            [x2, y1, null],
        ])
    }
}


export class ActionBlock extends Block {
    constructor(){
        super({});
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
            [x2, y2, NotchType.Rightwards],
            [x3, y2, null],

            [x3, y1, null],
            [x2, y1, NotchType.Leftwards]
        ])
    }
}

export function $if_block() : IfBlock {
    return new IfBlock();
}
}