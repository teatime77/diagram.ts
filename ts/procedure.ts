namespace diagram_ts {
//
abstract class ProcedureBlock extends Block {
    abstract run() : Promise<void>;


    innerBlock(port : Port) : ProcedureBlock | undefined {
        assert(port.type == PortType.bottom);

        if(port.destinations.length == 0){
            return undefined;
        }
        else{
            const parent = port.destinations[0].parent;
            if(parent instanceof ProcedureBlock){
                return parent;
            }
            
            throw new MyError();
        }
    }

    nextBlock() : ProcedureBlock | undefined {
        let inner_port : Port;

        if(this instanceof IfBlock){
            inner_port = this.truePort;
        }
        else if(this instanceof InfiniteLoop){
            inner_port = this.loopPort;
        }
        else{
            throw new MyError();
        }

        if(inner_port.destinations.length == 0){
            return undefined;
        }

        const next_port = inner_port.destinations[0];

        return next_port.parent as ProcedureBlock;
    }

    totalHeight() : number {
        let height = this.minSize!.y;

        for(let block = this.nextBlock(); block != undefined; block = block.nextBlock()){
            height += block.minSize!.y;
        }

        return height;
    }
}

export class IfBlock extends ProcedureBlock {   
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

    setMinSize() : void {
        this.minSize = new Vec2(150, nest_h1 + nest_h2 + nest_h3);

        const true_block = this.trueBlock();
        if(true_block != undefined){
            true_block.setMinSize();

            this.minSize.y += true_block.totalHeight();
        }
    }

    isTrue() : boolean {
        throw new MyError();
    }

    trueBlock() : ProcedureBlock | undefined {
        return this.innerBlock(this.truePort);
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const true_block = this.trueBlock();
        const true_block_height = (true_block == undefined ? 0 : true_block.totalHeight());

        const x2 = x1 + 35;
        const x3 = x2 + 35;
        const x4 = x1 + this.minSize!.x;

        const y2 = y1 + nest_h1;
        const y3 = y2 + nest_h2 + true_block_height;
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
            await true_block.run();
        }
    }
}

export class InfiniteLoop extends ProcedureBlock {
    topPort  = new Port(this, PortType.top);
    loopPort = new Port(this, PortType.bottom);

    constructor(data : Attr){
        super(data);
        this.ports = [ 
            this.topPort, 
            this.loopPort 
        ];
    }

    loopBlock() : ProcedureBlock | undefined {
        return this.innerBlock(this.loopPort);
    }

    setMinSize() : void {
        this.minSize = new Vec2(150, nest_h1 + nest_h2 + nest_h3);

        const loop_block = this.loopBlock();
        if(loop_block != undefined){
            loop_block.setMinSize();

            this.minSize.y += loop_block.totalHeight();
        }
    }

    draw(){
        const [pos, size] = this.drawBox();
        const x1 = pos.x + this.borderWidth + blockLineWidth;
        const y1 = pos.y + this.borderWidth + blockLineWidth;

        const loop_block = this.loopBlock();
        const loop_block_height = (loop_block == undefined ? 0 : loop_block.totalHeight());

        const x2 = x1 + 35;
        const x3 = x2 + 35;
        const x4 = x1 + this.minSize!.x;

        const y2 = y1 + nest_h1;
        const y3 = y2 + nest_h2 + loop_block_height;
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
        ])
    }

    async run(){
        const loop_block = this.loopBlock();
        if(loop_block != undefined){
            while(true){
                await loop_block.run();
            }
        }
    }

}

}