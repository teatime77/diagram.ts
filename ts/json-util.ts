namespace diagram_ts {
//
export function testDownload(){
    // Define your data as a JavaScript object
    const data = {
    name: "John Doe",
    age: 30,
    isStudent: false,
    courses: ["Math", "Physics", "Chemistry"],
    };

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
}