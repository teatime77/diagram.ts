import { msg } from "@i18n";
import { urlOrigin } from "./diagram";

export async function sendData(dataToSend : any) : Promise<any> {
    const url = `${urlOrigin}/send_data`;
    // msg(`post:[${url}]`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend) // Convert JavaScript object to JSON string
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message}`);
        }

        const result = await response.json(); // Parse the JSON response from Flask
        const json_str = JSON.stringify(result, null, 2); // Pretty print JSON
        // msg(`send data result:[${json_str}]`);

        return result;
    } catch (error: any) {
        msg(`send data error: ${error.message || error}`);

        return undefined;
    }
    
}
