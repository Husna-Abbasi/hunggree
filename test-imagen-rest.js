const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No GEMINI_API_KEY found");
    process.exit(1);
}

const data = JSON.stringify({
    instances: [
        { prompt: "Professional food photography of a burger" }
    ],
    parameters: {
        sampleCount: 1
    }
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log(`Testing endpoint: ${options.hostname}${options.path.replace(apiKey, 'HIDDEN_KEY')}`);

const req = https.request(options, (res) => {
    let body = '';
    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:', body.substring(0, 500)); // Print first 500 chars
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
