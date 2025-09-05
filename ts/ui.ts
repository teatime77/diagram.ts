namespace diagram_ts {
//
const AUTO = "auto";
const TextSizeFill = 8;
export const textColor = "black";

function ratio(width : string) : number {
    width = width.trim();
    assert(width.endsWith("%"));
    const num_str = width.substring(0, width.length - 1);

    const num = parseFloat(num_str);

    return num / 100;
}

function pixel(length : string,  remaining_length? : number) : number {
    if(length != undefined){
        if(length.endsWith("px")){
            const num_str = length.substring(0, length.length - 2);

            return parseFloat(num_str);
        }
        else if(length.endsWith("%")){
            if(remaining_length != undefined){
                return ratio(length) * remaining_length;
            }
        }
    }
    
    throw new MyError();
}

export function setContext2D(ctx : CanvasRenderingContext2D, ui : UI){
    ui.ctx = ctx;
    ui.children().forEach(child => setContext2D(ctx, child));
}

export interface Attr {
    className? : string;
    obj? : any;
    name? : string;
    position? : string;
    margin? : number[];
    color? : string;
    backgroundColor? : string;
    borderStyle? : string;
    borderWidth? : number;
    padding? : number[];
    paddingLeft? : string;
    verticalAlign? : string;
    horizontalAlign? : string;
    colspan? : number;
    width? : string;
    height? : string;
    disabled? : boolean;
    visibility? : string;
    inToolbox?   : boolean;
}

export interface TextAttr extends Attr {
    text? : string;
    fontSize? : string;
    textAlign? : string;
}

export interface ButtonAttr extends TextAttr {
    click : ()=>Promise<void>;
}

export interface GridAttr extends Attr {
    columns?: string;
    rows?   : string;
    cells : UI[][];
}


export abstract class UI {
    static count : number = 0;

    idx : number;
    ctx! : CanvasRenderingContext2D;
    position : Vec2 = Vec2.zero();
    boxSize  : Vec2 = Vec2.zero();
    width? : string;
    height? : string;
    minSize : Vec2 | undefined;
    colspan : number = 1;
    rowspan : number = 1;
    margin : number[] = [ 4, 4, 4, 4 ];     // left, right, top, bottom
    borderWidth : number = 3;
    padding : number[] = [ 0, 0, 0, 0 ];    // left, right, top, bottom

    horizontalAlign? : string;
    backgroundColor? : string;

    constructor(data : Attr){
        this.idx = ++UI.count;
        if(data.colspan != undefined){
            this.colspan = data.colspan;
        }
        this.backgroundColor = data.backgroundColor;
    }

    children() : UI[] {
        return [];
    }    

    getAllUISub(uis : UI[]){
        uis.push(this);
        this.children().forEach(x => x.getAllUISub(uis));
    }

    getAllUI() : UI[] {
        let uis : UI[] = [];
        this.getAllUISub(uis);

        return uis;
    }

    marginWidth() : number {
        return this.margin[0] + this.margin[1];
    }

    marginHeight() : number {
        return this.margin[2] + this.margin[3];
    }

    marginBorderPaddingWidth() : number {
        return this.margin[0] + this.margin[1] + 2 * this.borderWidth + this.padding[0] + this.padding[1];
    }

    marginBorderPaddingHeight() : number {
        return this.margin[2] + this.margin[3] + 2 * this.borderWidth + this.padding[2] + this.padding[3];
    }

    setMinSize() : void {
        this.minSize = Vec2.zero();
        msg(`set-min-size:${this.constructor.name}`);
    }

    getMinWidth() : number {       
        assert(this.minSize != undefined);
        return this.minSize!.x;
    }

    getMinHeight() : number {
        assert(this.minSize != undefined);
        return this.minSize!.y;
    }

    setPosition(position : Vec2) : void {
        this.position = position;
    }

    layout(x : number, y : number, size : Vec2, nest : number){
        this.boxSize = size;
        this.setPosition(new Vec2(x, y));
    }

    drawBox() : [Vec2, Vec2] {
        const x = this.position.x + this.margin[0];
        const y = this.position.y + this.margin[2];
        const w = this.boxSize.x - this.marginWidth();
        const h = this.boxSize.y - this.marginHeight();

        return [ new Vec2(x, y), new Vec2(w, h) ];
    }

    draw(){
        const [pos, size] = this.drawBox();
        this.drawRidgeRect2(this.ctx, pos.x, pos.y, size.x, size.y, this.borderWidth);
    }

    str() : string {
        if(this.minSize == undefined){
            throw new MyError();
        }

        const width  = (this.width  != undefined ? `width:${this.width} `  : "");
        const height = (this.height != undefined ? `height:${this.height} ` : "");
        const minSize = (this.minSize!= undefined ? `min-size:${this.minSize.x.toFixed()}, ${this.minSize.y.toFixed()} ` : "");
        const position = `pos:(${this.position.x},${this.position.y}) `;
        const boxSize = `box:(${this.boxSize.x},${this.boxSize.y}) `;

        return `${this.constructor.name} ${width}${height}${minSize}${position}${boxSize}`;
    }

    dump(nest : number){
        msg(`${" ".repeat(nest * 4)}${this.str()}`);
    }


    drawRidgeRect2(ctx : CanvasRenderingContext2D, x : number, y : number, width : number, height : number, ridgeWidth : number, isInset = false) {
        // Define light and dark colors
        // const lightColor = isInset ? '#888' : '#eee'; // Darker for inset top/left
        // const darkColor = isInset ? '#eee' : '#888';  // Lighter for inset bottom/right

        const lightColor = "#ffffff";
        const darkColor = "#888888";
        const backgroundColor = (this.backgroundColor != undefined ? this.backgroundColor : "#cccccc");

        // Optionally, draw the inner rectangle (fill or another stroke)
        ctx.fillStyle = backgroundColor; // Example inner color
        ctx.fillRect(x + ridgeWidth, y + ridgeWidth, width - 2 * ridgeWidth, height - 2 * ridgeWidth);

        // Draw the "light" sides (top and left)
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = ridgeWidth;
        ctx.beginPath();
        ctx.moveTo(x + ridgeWidth / 2, y + height - ridgeWidth / 2); // Bottom-left corner
        ctx.lineTo(x + ridgeWidth / 2, y + ridgeWidth / 2);     // Top-left corner
        ctx.lineTo(x + width - ridgeWidth / 2, y + ridgeWidth / 2); // Top-right corner
        ctx.stroke();

        // Draw the "dark" sides (bottom and right)
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = ridgeWidth;
        ctx.beginPath();
        ctx.moveTo(x + width - ridgeWidth / 2, y + ridgeWidth / 2);     // Top-right corner
        ctx.lineTo(x + width - ridgeWidth / 2, y + height - ridgeWidth / 2); // Bottom-right corner
        ctx.lineTo(x + ridgeWidth / 2, y + height - ridgeWidth / 2); // Bottom-left corner
        ctx.stroke();
    }

    drawRidgeRect(ctx : CanvasRenderingContext2D, x : number, y : number, width : number, height : number, borderWidth : number, isInset = false){
        // Colors for ridge effect
        const lightColor = "#ffffff";
        const darkColor = "#888888";
        const backgroundColor = "#cccccc";

        // Fill rectangle background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(x, y, width, height);

        // Top & left (highlight)
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.moveTo(x + width, y);       // Top-right
        ctx.lineTo(x, y);               // Top-left
        ctx.lineTo(x, y + height);      // Bottom-left
        ctx.stroke();

        // Bottom & right (shadow)
        ctx.strokeStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(x, y + height);      // Bottom-left
        ctx.lineTo(x + width, y + height); // Bottom-right
        ctx.lineTo(x + width, y);       // Top-right
        ctx.stroke();    
    }


}

export class Filler extends UI {
}

export class TextUI extends UI {
    fontSize? : string;
    textAlign? : string;
    text : string;
    metrics!: TextMetrics;
    actualHeight!: number;

    constructor(data : TextAttr){
        super(data);
        this.fontSize  = data.fontSize;
        this.textAlign = data.textAlign;
        this.text = (data.text != undefined ? data.text : "");
    }


    setMinSize() : void {
        this.metrics = this.ctx.measureText(this.text);
      
        this.actualHeight = this.metrics.actualBoundingBoxAscent + this.metrics.actualBoundingBoxDescent;
      
        msg(`idx:[${this.idx}]  font :[${this.fontSize}]  w:[${this.metrics.width}] h:[${this.actualHeight}] [${this.text}]`);

        const width  = this.metrics.width + this.marginBorderPaddingWidth() + TextSizeFill;
        const height = this.actualHeight  + this.marginBorderPaddingHeight() + TextSizeFill;

        this.minSize = new Vec2(width, height);
    }

    draw(){
        super.draw();

        const x = this.position.x + this.margin[0] + this.borderWidth + this.padding[0];
        const y = this.position.y + this.margin[2] + this.borderWidth + this.padding[2]
                  + this.actualHeight;

        this.ctx.strokeStyle = textColor;
        this.ctx.strokeText(this.text, x, y);
    }

    str() : string {
        return `${super.str()} text:${this.text}`;
    }

}

export class Label extends TextUI {
}

export class Button extends TextUI {
    click : ()=>Promise<void>;

    constructor(data : ButtonAttr){
        super(data);
        this.click = data.click;
    }
}

export abstract class Node extends UI {
    abstract done() : boolean;
    abstract drawNode(canvas : Canvas) : void;

    constructor(data : Attr){
        super(data);
    }
}

export class Editor extends UI {
    blocks : Block[] = [];

    children() : UI[] {
        return this.blocks.slice();
    }

    clearBlocks(){
        this.blocks.forEach(x => x.clearBlock());
        this.blocks = [];
    }

    addBlock(block : Block){
        this.blocks.push(block);
    }

    draw(){
        super.draw();

        this.blocks.forEach(x => x.draw());
    }
}

export class Grid extends UI {
    colDescs : string[];
    rowDescs   : string[];
    cells : UI[][];

    minWidths : number[] = [];
    minHeights: number[] = [];

    colWidths : number[] = [];
    rowHeights: number[] = [];

    numRows : number;
    numCols : number;

    constructor(data : GridAttr){        
        super(data as any);

        this.cells = data.cells;
        this.numRows = this.cells.length;
        this.numCols = Math.max(... this.cells.map(row => sum(row.map(ui => ui.colspan))));

        if(data.columns == undefined){
            this.colDescs = arrayFill(this.numCols, "auto");
        }
        else{

            this.colDescs = data.columns.split(" ");
        }

        if(data.rows == undefined){

            this.rowDescs = arrayFill(this.numRows, "auto");
        }
        else{

            this.rowDescs = data.rows.split(" ");
        }

        assert(this.colDescs.length == this.numCols);
        assert(this.rowDescs.length   == this.numRows);
    }

    children() : UI[] {
        return this.cells.flat();
    }

    getRow(idx : number) : UI[] {
        return this.cells[idx];
    }

    getRowHeight(idx : number) : number {
        return Math.max(... this.getRow(idx).map(ui => ui.getMinHeight()));
    }

    getColumnWith(col_idx : number) : number {
        let max_width = 0;
        for(const row of this.cells){
            let offset = 0;
            for(const ui of row){
                if(offset == col_idx){
                    if(ui.colspan == 1){
                        max_width = Math.max(max_width, ui.getMinWidth());
                    }
                    break;
                }

                offset += ui.colspan;
                if(col_idx < offset){
                    break;
                }
            }
        }

        return max_width;
    }

    calcHeights(){
        const heights = new Array(this.rowDescs!.length).fill(0);
        for(const [idx, row] of this.rowDescs!.entries()){
            if(row.endsWith("px")){
                heights[idx] = pixel(row);
            }
            else if(row == AUTO){
                heights[idx] = this.getRowHeight(idx);
            }
        }

        return heights;
    }

    setMinSizeSub(is_width : boolean) : void {
        let offset_size_px_ui_spans : [number, number, UI, number][] = [];

        const min_sizes = arrayFill(is_width ? this.numCols : this.numRows, 0);
        for(const [row_idx, row] of this.cells.entries()){
            let offset = 0;
            for(const ui of row){
                let size_px : number;

                const [ui_size, ui_min_size, ui_span] = (is_width ? [ui.width, ui.minSize!.x, ui.colspan] : [ui.height, ui.minSize!.y, ui.rowspan]);
                if(ui_size == undefined){
                    size_px = ui_min_size;
                }
                else{

                    if(ui_size.endsWith("px")){
                        size_px = pixel(ui_size);
                        if(size_px < ui_min_size){
                            throw new MyError();
                        }
                    }
                    else if(ui_size.endsWith("%")){
                        size_px = ui_min_size / ratio(ui_size);
                    }
                    else{
                        throw new MyError();
                    }
                }

                const pos = (is_width ? offset : row_idx);
                if(ui_span == 1){
                    if(min_sizes[pos] < size_px){
                        min_sizes[pos] = size_px;
                    }
                }
                else{
                    offset_size_px_ui_spans.push([pos, size_px, ui, ui_span]);

                }

                offset += ui.colspan;
            }
        }

        let max_remaining_size = 0;

        const descs = (is_width ? this.colDescs : this.rowDescs);
        for(const [offset, width_px, ui, ui_span] of offset_size_px_ui_spans){
            let fixed_px = 0;
            let ratio_sum = 0;
            for(const idx of range2(offset, offset + ui_span)){
                if(descs[idx].endsWith("%")){
                    ratio_sum += ratio(descs[idx]);
                }
                else{
                    fixed_px += min_sizes[idx];
                }
            }

            if(ratio_sum == 0){

                if(fixed_px < ui.minSize!.x){
                    throw new MyError();
                }
            }
            else{
                if(fixed_px <= ui.minSize!.x){
                    const ratio_px = ui.minSize!.x - fixed_px;
                    const remaining_width = ratio_px / ratio_sum;
                    if(max_remaining_size < remaining_width){
                        max_remaining_size = remaining_width;
                    }

                }
                else{
                    throw new MyError();
                }
            }
        }

        for(const [idx, col] of descs.entries()){
            if(col.endsWith("px")){
                min_sizes[idx] = pixel(col);
            }
            else if(col.endsWith("%")){
                min_sizes[idx] = max_remaining_size * ratio(col);
            }
        }

        const size = sum(min_sizes);

        const this_size = (is_width ? this.width : this.height);
        let   this_size_px : number;
        if(this_size == undefined || this_size == "auto"){
            this_size_px = size;
        }
        else{
            if(this_size.endsWith("px")){
                this_size_px = pixel(this_size);
                if(this_size_px < size){
                    throw new MyError();
                }
            }
            else if(this_size.endsWith("%")){
                this_size_px = size / ratio(this_size);
            }
            else{
                throw new MyError();
            }
        }

        if(is_width){
            this.minWidths  = min_sizes;
            this.minSize!.x = this_size_px + this.marginBorderPaddingWidth();
        }
        else{
            this.minHeights = min_sizes;
            this.minSize!.y = this_size_px + this.marginBorderPaddingHeight();

        }
    }

    setMinSize() : void {
        this.minSize = Vec2.zero();

        this.children().forEach(x => x.setMinSize());
        this.setMinSizeSub(true);
        this.setMinSizeSub(false);
    }

    static calcSizes(descs : string[], min_sizes : number[], remaining_px : number) : number []{
        const sizes = Array<number>(descs.length);

        for(const [idx, desc] of descs.entries()){
            if(desc.endsWith("px")){
                sizes[idx] = pixel(desc);
                if(sizes[idx] < min_sizes[idx]){
                    throw new MyError();
                }
            }
            else if(desc.endsWith("%")){
                sizes[idx] = ratio(desc) * remaining_px;
            }
            else if(desc == "auto"){
                sizes[idx] = min_sizes[idx];
            }
            else{
                throw new MyError();
            }
        }

        return sizes;
    }

    layout(x : number, y : number, size : Vec2, nest : number){
        super.layout(x, y, size, nest);

        const fixed_width_px  = sum(range(this.numCols).filter(i => !this.colDescs[i].endsWith("%")).map(i => this.minWidths[i]));
        const fixed_height_px = sum(range(this.numRows).filter(i => !this.rowDescs[i].endsWith("%")).map(i => this.minHeights[i]));

        if(size.x < fixed_width_px || size.y < fixed_height_px){
            throw new MyError();
        }

        const remaining_width_px  = size.x - fixed_width_px;
        const remaining_height_px = size.y - fixed_height_px;

        this.colWidths  = Grid.calcSizes(this.colDescs, this.minWidths , remaining_width_px);
        this.rowHeights = Grid.calcSizes(this.rowDescs, this.minHeights, remaining_height_px);

        let y_offset = 0;
        for(const [row_idx, row] of this.cells.entries()){
            let offset = 0;
            let x_offset = 0;
            for(const ui of row){
                let ui_width_px  : number;
                let ui_height_px : number;

                if(ui.colspan == 1){
                    ui_width_px = this.colWidths[offset];
                }
                else{
                    ui_width_px = sum(this.colWidths.slice(offset, offset + ui.colspan));
                }

                if(ui.width != undefined && ui.width.endsWith("%")){
                    ui_width_px *= ratio(ui.width);
                }

                if(ui.rowspan == 1){
                    ui_height_px = this.rowHeights[row_idx];
                }
                else{
                    ui_height_px = sum(this.rowHeights.slice(row_idx, row_idx + ui.rowspan));
                }

                if(ui.height != undefined && ui.height.endsWith("%")){
                    ui_height_px *= ratio(ui.height);
                }

                const ui_size = new Vec2(ui_width_px, ui_height_px);
                ui.layout(x + x_offset, y + y_offset, ui_size, nest + 1);

                x_offset += sum(this.colWidths.slice(offset, offset + ui.colspan));

                offset += ui.colspan;
            }

            y_offset += this.rowHeights[row_idx];
        }

    }  


    updateRootLayout(){
        this.getAllUI().forEach(x => x.setMinSize());
        let size = Vec2.zero();

        let x : number;
        let y : number;

        if(this.colDescs.some(x => x.endsWith("%"))){

            size.x = window.innerWidth;
            x = 0;
        }
        else{

            size.x = this.minSize!.x;
            x = Math.max(0, 0.5 * (window.innerWidth  - size.x));
        }

        if(this.rowDescs.some(x => x.endsWith("%"))){

            size.y = window.innerHeight;
            y = 0;
        }
        else{

            size.y = this.minSize!.y;
            y = Math.max(0, 0.5 * (window.innerHeight - size.y));
        }

        this.layout(x, y, size, 0);
    }

    draw(){
        super.draw();
        this.children().forEach(x => x.draw());
    }

    str() : string {
        const col_descs = this.colDescs.join(" ");
        const row_descs = this.rowDescs.join(" ");

        const min_ws = this.minWidths.map(x => `${x}`).join(" ");
        const min_hs = this.minHeights.map(x => `${x}`).join(" ");

        const col_ws = this.colWidths.map(x => `${x}`).join(" ");
        const row_hs = this.rowHeights.map(x => `${x}`).join(" ");

        return `${super.str()} col:${col_descs} row:${row_descs} min-ws:${min_ws} min-hs:${min_hs} col-ws:${col_ws} row-hs:${row_hs}`;
    }

    dump(nest : number){
        super.dump(nest);
        for(const row of this.cells){
            row.forEach(ui => ui.dump(nest + 1));

            msg("");
        }
    }
}

export function $label(data : TextAttr) : Label {
    return new Label(data);
}

export function $button(data : ButtonAttr) : Button {
    return new Button(data);
}

export function $filler(data : Attr) : Filler {
    return new Filler(data);
}

export function $grid(data : GridAttr) : Grid {    
    return new Grid(data);
}

export function $hlist(data : Attr & { rows? : string, column?: string, children : UI[] }){
    const grid_data = data as any as GridAttr;

    grid_data.columns = data.column;
    grid_data.cells   = [ data.children ];

    delete (data as any).children;
    delete (data as any).column;

    return $grid(grid_data);
}

export function $vlist(data : Attr & { rows? : string, column?: string, children : UI[] }){
    const grid_data = data as any as GridAttr;

    grid_data.columns = data.column;
    grid_data.cells   = data.children.map(x => [x]);

    delete (data as any).children;
    delete (data as any).column;

    return $grid(grid_data);
}

}