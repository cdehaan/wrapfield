async function SendData(phpFilename, data) {

    if(process.env.NODE_ENV === 'development') { phpFilename = 'http://localhost:3000/' + phpFilename; }
    //if(process.env.NODE_ENV === 'development') { phpFilename = 'http://localhost/wrapfield/public/' + phpFilename; }
    //else { phpFilename = 'http://localhost/wrapfield/build/' + phpFilename; }

    if (data === null || data === undefined) {data = {};}

    const formData = new FormData();
    for (const property in data) {
        formData.append(property, DeepCopy(data[property]));
    }

    const fetchOptions = {
        method: 'POST',
        cache: 'no-cache',
        /*body: formData*/
        body: JSON.stringify(data)
    }

    const response = await fetch(phpFilename, fetchOptions);

    if (!response.ok) {
        const message = `Error: ${response.status}`;
        throw new Error(message);
    }

    const text = await response.text();

    return text;
}

function DeepCopy(data) {
    if(data === null) { return null; }
    if(typeof(data) !== "object") { return data; }

    const formData = new FormData();
    for (const property in data) {
        formData.append(property, DeepCopy(data[property]));
    }
    return formData;
}

export default SendData;