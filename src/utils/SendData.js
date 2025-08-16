const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.wrapfield.com';

async function SendData(endpoint, data) {
    const url = /^https?:\/\//i.test(endpoint) ? endpoint : `${API_BASE.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    // if(process.env.NODE_ENV === 'development') { endpoint = 'http://localhost:3000/' + endpoint; }
    // if(process.env.NODE_ENV === 'development') { phpFilename = 'http://localhost/wrapfield/public/' + phpFilename; }
    // else { phpFilename = 'http://localhost/wrapfield/build/' + phpFilename; }

    if (data === null || data === undefined) {data = {};}

    const formData = new FormData();
    for (const property in data) {
        formData.append(property, DeepCopy(data[property]));
    }

    const fetchOptions = {
        method: 'POST',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' }, // important for php://input
        body: JSON.stringify(data),
    };

    const response = await fetch(url, fetchOptions);

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