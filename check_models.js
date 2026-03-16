
const https = require('https');

const apiKey = 'AIzaSyA9APkvHATnWMXUZpml-K-FKt-r4bru8lc';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('Available Models:');
                json.models.forEach(m => console.log(m.name));
            } else {
                console.log('Error:', json);
            }
        } catch (e) {
            console.error('Parse Error', e);
            console.log('Raw:', data);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
