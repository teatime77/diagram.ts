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
        const [xa, ya, xb, yb] = this.borderInnerBox();

        const x2 = xa + 35;
        const x3 = x2 + 35;

        const y2 = ya + nest_h1;
        const y3 = y2 + nest_h2 + this.innerBlocksHeight();
        const y4 = yb - notchRadius;


        this.drawOutline([
            // left top
            [xa, ya, null],

            // left bottom
            [xa, y4, null],

            // bottom notch
            [x2, y4, this.bottomPort],

            // right bottom
            [xb, y4, null],

            [xb, y3, null],
            [x2, y3, null],

            [x2, y2, null],

            // loop notch
            [x3, y2, this.truePort],
            [xb, y2, null],

            // right top
            [xb, ya, null],

            // top notch
            [x2, ya, this.topPort]
        ]);

        this.conditionPort.drawPort(this.ctx, xb - Port.radius, 0.5 * (ya + y2));
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
        const [xa, ya, xb, yb] = this.borderInnerBox();

        const x2 = xa + 35;
        const x3 = x2 + 35;

        const y2 = ya + nest_h1;
        const y3 = y2 + nest_h2 + this.innerBlocksHeight();


        this.drawOutline([
            [xa, ya, null],

            [xa, yb, null],
            [xb, yb, null],

            [xb, y3, null],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, this.loopPort],
            [xb, y2, null],

            [xb, ya, null],
            [x2, ya, this.topPort]
        ]);
        
        const borderWidth = this.borderWidth;
        this.borderWidth = 0.5;
        this.drawOutline([
            [xa, ya, null],

            [xa, yb, null],
            [xb, yb, null],

            [xb, y3, null],
            [x2, y3, null],

            [x2, y2, null],
            [x3, y2, this.loopPort],
            [xb, y2, null],

            [xb, ya, null],
            [x2, ya, this.topPort]
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