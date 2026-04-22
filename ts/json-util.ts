import type { Editor } from "./canvas";

export let theEditor : Editor;

export function setEditor(editor : Editor){
    theEditor = editor;
}

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

export function saveJson(){
    let port_idx = 0;

    const blocks = theEditor.blocks;
    for(const [idx, block] of blocks.entries()){
        block.idx = idx;

        for(const port of block.ports){
            port.idx = port_idx++;
        }
    }

    const json = blocks.map(x => x.makeObj());
    downloadJson(json);
}
