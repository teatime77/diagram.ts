namespace diagram_ts {
//

const nest_h1 = 35;
const nest_h2 = 30;
const nest_h3 = 10;

export abstract class NestBlock extends ActionBlock {
    innerPort() : Port {
        if(this instanceof IfBlock){
            return this.truePort;
        }
        else if(this instanceof InfiniteLoop){
            return this.loopPort;
        }
        else{
            throw new MyError();
        }
    }

    innerBlock() : ActionBlock | undefined {
        const port = this.innerPort();

        assert(port.type == PortType.bottom);

        if(port.destinations.length == 0){
            return undefined;
        }
        else{
            return port.destinations[0].parent as ActionBlock;
        }
    }

    innerBlocksHeight() : number {
        let height = 0;

        for(let block = this.innerBlock(); block != undefined; ){
            const next_block = block.nextBlock();
            if(next_block == undefined){

                const [xa, ya, xb, yb] = block.borderInnerBox();
                height += yb - ya;
                break;
            }
            else{
                const [xa, ya, xb, yb] = block.drawBox();
                height += yb - ya;
                
                block = next_block;
            }
        }
        if(height != 0){
            msg(`inner blocks id:${this.idx} h:${height}`);
        }

        return height;
    }

    setMinSize() : void {
        for(let block = this.innerBlock(); block != undefined; block = block.nextBlock()){
            block.setMinSize();
        }

        this.boxSize = new Vec2(150, this.calcHeight());
    }

    calcHeight() : number {
        let height : number;

        if(this instanceof IfBlock){
            height = nest_h1 + nest_h2 + nest_h3 + notchRadius;
        }
        else if(this instanceof InfiniteLoop){
            height = nest_h1 + nest_h2 + nest_h3;            
        }
        else{
            throw new MyError();
        }

        msg(`height:${this.constructor.name} ${height + this.innerBlocksHeight()} = ${height} + ${this.innerBlocksHeight()}`)
        return height + this.innerBlocksHeight();
    }

    dependentPorts() : Port[] {
        return [ this.innerPort(), this.bottomPort ];
    }
}

export class IfBlock extends NestBlock {   
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

    trueBlock() : ActionBlock | undefined {
        return this.innerBlock();
    }

    draw(){
        const [xa, ya, xb, yb] = this.borderInnerBox();

        const x2 = xa + 35;
        const x3 = x2 + 35;

        const y2 = ya + nest_h1;
        const y3 = yb - notchRadius - nest_h3;
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
    loopPort = new Port(this, PortType.bottom);

    constructor(data : Attr){
        super(data);
        this.ports = [ 
            this.topPort, 
            this.loopPort 
        ];
    }

    loopBlock() : ActionBlock | undefined {
        return this.innerBlock();
    }

    draw(){
        const [xa, ya, xb, yb] = this.borderInnerBox();

        const x2 = xa + 35;
        const x3 = x2 + 35;

        const y2 = ya + nest_h1;
        const y3 = yb - nest_h3;


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