namespace diagram_ts {
//

export const nest_h1 = 35;
const nest_h2 = 30;
const nest_h3 = 20;

export abstract class ActionBlock extends Block {
    topPort       = new Port(this, PortType.top);
    bottomPort    = new Port(this, PortType.bottom);

    constructor(data : Attr){
        super(data);

        this.ports = [ 
            this.topPort, 
            this.bottomPort 
        ];
    }

    dependentPorts() : Port[] {
        return [ this.bottomPort ];
    }

    *dependantActions() : Generator<ActionBlock> {
        for(const src_port of this.dependentPorts()){
            for(const dst_port of src_port.destinations){
                const action = dst_port.parent as ActionBlock;
                yield* action.dependantActions();
            }
        }

        yield this;
    }

    nextBlock() : ActionBlock | undefined {        
        if(this.bottomPort.destinations.length != 0){
            const dest_port = this.bottomPort.destinations[0];
            return dest_port.parent as ActionBlock;
        }

        return undefined;
    }

    disconnectSeperatedPort() : boolean {
        if(this.topPort.sources.length == 1){
            const src_port = this.topPort.sources[0];
            if(! src_port.isNear(this.topPort.position)){
                src_port.disconnect(this.topPort);
                msg(`dis-connect:${src_port.parent.constructor.name} ${this.constructor.name}`);

                return true;
            }
        }

        return false;
    }

    setPortPositions(){    
        super.setPortPositions();

        const [xa, ya, xb, yb] = this.drawBox();
        const x2 = xa + 35;

        this.topPort.position.x = x2;
        this.topPort.position.y = ya;

        this.bottomPort.position.x = x2;
        this.bottomPort.position.y = yb;
    }

    draw(){
        const [x1, y1, x2, y2] = this.drawBox();

        this.drawOutline([
            [x1, y1],
            [x1, y2],
            this.bottomPort,
            [x2, y2],
            [x2, y1],
            this.topPort
        ]);

        this.drawIOPorts();
    }
}

export class TTSBlock extends ActionBlock {
    inputPort = new TextPort(this, PortType.inputPort);
    speech : Speech;

    constructor(data : Attr){
        super(data);
        this.ports.push(this.inputPort);

        i18n_ts.setVoiceLanguageCode("jpn");
        this.speech = new Speech();
    }

    setBoxSize() : void {
        // const h = inputHeight + 2 * notchRadius + 4 * this.borderWidth;
        this.boxSize = new Vec2(200, 60);
    }

    draw(): void {
        super.draw();
        this.drawIcon(ttsIcon);
    }

    async run(){
        const text = this.inputPort.stringValue().trim();
        await this.speech.speak_waitEnd(text);
    }
}


export class SleepBlock extends ActionBlock {
    inputPort = new NumberPort(this, PortType.inputPort);

    constructor(data : Attr){
        super(data);
        this.ports.push(this.inputPort);
    }

    setBoxSize() : void {
        this.boxSize = new Vec2(200, 60);
    }

    draw(): void {
        super.draw();
        this.drawIcon(sleepIcon);
    }

    async run(){
        const second = this.inputPort.numberValue();
        await sleep(second * 1000);
    }
}

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

    setBoxSize() : void {
        for(let block = this.innerBlock(); block != undefined; block = block.nextBlock()){
            block.setBoxSize();
        }

        this.boxSize = new Vec2(200, this.calcHeight());
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

    setPortPositions(){    
        super.setPortPositions();

        const [xa, ya, xb, yb] = this.drawBox();
        const port = this.innerPort();
        port.position.x = xa + 35 + 35;
        port.position.y = ya + nest_h1;
    }


    draw(){
        const [xa, ya, xb, yb] = this.drawBox();

        const x2 = xa + 35;

        const y2 = ya + nest_h1;
        const y3 = yb - nest_h3;

        const bottom_port = (this instanceof InfiniteLoop ? null : this.bottomPort);
        this.drawOutline([
            [xa, ya],

            [xa, yb],
            bottom_port,
            [xb, yb],

            [xb, y3],
            [x2, y3],

            [x2, y2],
            this.innerPort(),
            [xb, y2],

            [xb, ya],
            this.topPort
        ]);

        this.drawIOPorts();
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