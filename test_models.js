
const https = require('https');

const apiKey = 'AIzaSyA9APkvHATnWMXUZpml-K-FKt-r4bru8lc';
const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-pro'
];

async function testModel(model) {
    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const body = JSON.stringify({
            contents: [{ parts: [{ text: "Hello" }] }]
        });

        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({ model, success: true });
                } else {
                    try {
                        const err = JSON.parse(data);
                        resolve({ model, success: false, error: err.error?.message || res.statusCode });
                    } catch (e) {
                        resolve({ model, success: false, error: res.statusCode });
                    }
                }
            });
        });

        req.write(body);
        req.end();
    });
}

async function run() {
    console.log('Testing models...');
    for (const m of models) {
        const res = await testModel(m);
        console.log(`[${res.model}] ${res.success ? 'SUCCESS ✅' : 'FAILED ❌ (' + res.error + ')'}`);
    }
}

run();
