namespace diagram_ts {
//
export abstract class NestBlock extends Block {
    innerBlock() : Block | undefined {
        let port : Port;

        if(this instanceof IfBlock){
            port = this.truePort;
        }
        else if(this instanceof InfiniteLoop){
            port = this.loopPort;
        }
        else{
            throw new MyError();
        }

        assert(port.type == PortType.bottom);

        if(port.destinations.length == 0){
            return undefined;
        }
        else{
            return port.destinations[0].parent;
        }
    }

    innerBlocksHeight() : number {
        let height = 0;

        for(let block = this.innerBlock(); block != undefined; block = block.nextBlock()){
            if(height != 0){
                height -= notchRadius;
            }

            height += block.calcHeight();
        }
        if(height != 0){
            msg(`inner blocks id:${this.idx} h:${height}`);
        }

        return height;
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, nest_h123);

        for(let block = this.innerBlock(); block != undefined; block = block.nextBlock()){
            block.setMinSize();
        }

        this.minSize.y += this.innerBlocksHeight();
    }

    calcHeight() : number {
        return nest_h123 + this.innerBlocksHeight();
    }
}

export class IfBlock extends NestBlock {   
    topPort       = new Port(this, PortType.top);
    bottomPort    = new Port(this, PortType.bottom);
    truePort      = new Port(this, PortType.bottom);

    conditionPort = new Port(this, PortType.inputPort);

    constructor(data : Attr){
        super(data);
        this.ports = [ 
            this.topPort, 
            this.bottomPort, 
            this.truePort,
            this.conditionPort
        ];
    }

    isTrue() : boolean {
        return this.conditionPort.value == 1;
    }

    trueBlock() : Block | undefined {
        return this.innerBlock();
    }

    draw(){
        const [xa, ya, xb, yb] = this.drawBox();
        const x1 = xa + this.borderWidth;
        const y1 = ya + this.borderWidth;

        const x2 = x1 + 35;
        const x3 = x2 + 35;
        const x4 = x1 + this.minSize!.x;

        const y2 = y1 + nest_h1;
        const y3 = y2 + nest_h2 + this.innerBlocksHeight();
        const y4 = y3 + nest_h3 - notchRadius;


        this.drawOutline([
            // left top
            [x1, y1, null],

            // left bottom
            [x1, y4, null],

            // bottom notch
            [x2, y4, this.bottomPort],

            // right bottom
            [x4, y4, null],

            [x4, y3, null],
            [x2, y3, null],

            [x2, y2, null],

            // loop notch
            [x3, y2, this.truePort],
            [x4, y2, null],

            // right top
            [x4, y1, null],

            // top notch
            [x2, y1, this.topPort]
        ]);

        this.conditionPort.drawPort(this.ctx, x4 - Port.radius, 0.5 * (y1 + y2));
    }

    async run(){
        const true_block = this.trueBlock();
        if(true_block != undefined && this.isTrue()){
            await runBlockChain(true_block);
        }
    }
}

export class InfiniteLoop extends NestBlock {
    topPort  = new Port(this, PortType.top);
    loopPort = new Port(this, PortType.bottom);

    constructor(data : Attr){
        super(data);
        this.ports = [ 
            this.topPort, 
            this.loopPort 
        ];
    }

    loopBlock() : Block | undefined {
        return this.innerBlock();
    }

    draw(){
        const [xa, ya, xb, yb] = this.drawBox();
        const x1 = xa + this.borderWidth;
        const y1 = ya + this.borderWidth;

        const x2 = x1 + 35;
        const x3 = x2 + 35;
        const x4 = x1 + this.minSize!.x;

        const y2 = y1 + nest_h1;
        const y3 = y2 + nest_h2 + this.innerBlocksHeight();
        const y4 = y3 + nest_h3;


        this.drawOutline([
            [x1, y1, null],

            [x1, y4, null],
            [x4, y4, null],

            [x4, y3, null],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, this.loopPort],
            [x4, y2, null],

            [x4, y1, null],
            [x2, y1, this.topPort]
        ]);
        const borderWidth = this.borderWidth;
        this.borderWidth = 0.5;
        this.drawOutline([
            [x1, y1, null],

            [x1, y4, null],
            [x4, y4, null],

            [x4, y3, null],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, this.loopPort],
            [x4, y2, null],

            [x4, y1, null],
            [x2, y1, this.topPort]
        ], "yellow");
        this.borderWidth = borderWidth;
    }

    async run(){
        const loop_block = this.loopBlock();
        if(loop_block != undefined){
            while(true){
                await runBlockChain(loop_block);

                if(stopFlag){
                    break;
                }

                await sleep(100);
            }
        }
    }
}

}