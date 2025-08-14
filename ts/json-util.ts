namespace diagram_ts {
//
export function downloadJson(data : any){
    // Convert the object to a JSON string
    const jsonData = JSON.stringify(data, null, 2); // The last two arguments are for formatting (indentation)

    // Create a Blob from the JSON string
    const blob = new Blob([jsonData], { type: "application/json" });

    // Create an anchor element
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "diagram.json"; // Set the filename

    // Append the link to the body (it must be in the document to be clickable)
    document.body.appendChild(link);

    // Programmatically click the link to trigger the download
    link.click();

    // Clean up: remove the link and revoke the object URL
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function preventDefaults(ev:DragEvent) {
    ev.preventDefault(); 
    ev.stopPropagation();
}

export function setDragDrop(canvas : HTMLCanvasElement){
    canvas.addEventListener("dragenter", (ev : DragEvent)=>{
        preventDefaults(ev);
        msg("drag enter");
    });

    canvas.addEventListener("dragover", (ev : DragEvent)=>{
        preventDefaults(ev);
        canvas.classList.add('dragover')

        msg("drag over");
    });

    canvas.addEventListener("dragleave", (ev : DragEvent)=>{
        preventDefaults(ev);
        canvas.classList.remove('dragover');
        msg("drag leave");
    });

    canvas.addEventListener("drop", async (ev : DragEvent)=>{
        preventDefaults(ev);
        canvas.classList.remove('dragover');

        msg("drop");
        const dt = ev.dataTransfer;
        if(dt == null){
            return;
        }

        const files = Array.from(dt.files);

        msg(`${files}`);

        if(files.length == 1){
            const file = files[0];

            msg(`File name: ${file.name}, File size: ${file.size}, File type: ${file.type}`);

            const reader = new FileReader();

            reader.onload = () => {
                const json = reader.result as string;
                const obj  = JSON.parse(json);

                assert(Array.isArray(obj));

                // msg(`dropped:[${JSON.stringify(data, null, 2)}]`);
                loadJson(obj as any[])
            };

            reader.readAsText(file);        


        }
    });    
}

export function saveJson(){
    let port_idx = 0;

    const blocks = Main.one.editor.blocks;
    for(const [idx, block] of blocks.entries()){
        block.idx = idx;

        for(const port of block.ports){
            port.idx = port_idx++;
        }
    }

    const json = blocks.map(x => x.makeObj());
    downloadJson(json);
}

function loadJson(objs:any[]){
    const block_map = new Map<number, Block>();
    const port_map = new Map<number, Port>();

    for(const obj of objs){
        let block : Block;

        msg(`block:[${obj.typeName}]`);
        switch(obj.typeName){
        case "StartBlock"       : block = new StartBlock({});       break;
        case "IfBlock"          : block = $if_block();              break;
        case "InfiniteLoop"     : block = new InfiniteLoop({});     break;
        case "ConditionBlock"   : block = new ConditionBlock({});   break;
        case "ActionBlock"      : block = new ActionBlock({});      break;
        case "InputRangeBlock"  : block = new InputRangeBlock({});  break;
        case "ServoMotorBlock"  : block = new ServoMotorBlock({});  break;
        case "SetValueBlock"    : block = new SetValueBlock({});    break;
        default: throw new MyError();
        }

        block.idx        = obj.idx;
        block.position.x = obj.x;
        block.position.y = obj.y;
        block.setMinSize();

        block_map.set(block.idx, block);

        for(const [port_idx, port_obj] of obj.ports.entries()){
            const port = block.ports[port_idx];
            port.idx = port_obj.idx;

            port_map.set(port.idx, port);
        }

        Main.one.editor.addBlock(block);
    }

    for(const obj of objs){
        const block = block_map.get(obj.idx)!;
        assert(block != undefined);

        for(const [port_idx, port_obj] of obj.ports.entries()){
            const port = block.ports[port_idx];

            for(const dst_port_idx of port_obj.destinations){
                const dst_port = port_map.get(dst_port_idx)!;
                assert(dst_port != undefined);

                port.connect(dst_port);
            }
        }
    }

    const canvas = Main.one.canvas;
    setContext2D(canvas.ctx, canvas.root);

    canvas.requestUpdateCanvas();
}
}