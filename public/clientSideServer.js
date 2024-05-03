const http = require('http');
const fs = require('fs');
const path = require('path');

// Port number for the server
const port = 8080;

// Creating a server
const server = http.createServer((req, res) => {
    // Set CORS headers to allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Permissions-Policy', 'interest-cohort=()');

    // Handling requests for '/'
    if (req.url === '/') {
        // Reading the HTML file
        fs.readFile(path.join(__dirname, './login.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }
    else if (req.url === '/index') {
        fs.readFile(path.join(__dirname, './index.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }
    else if (req.url === '/tokensignin' && req.method === 'POST') {
        // Handle the POST request to /tokensignin
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); // convert Buffer to string
        });
        req.on('end', () => {
            // Parse the JSON data from the request body
            const { idtoken } = JSON.parse(body);
            // Here you can verify the token and perform necessary actions
            // For now, let's just send a success response
            console.log("HEre");
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('success');
        });
    }
    else {
        // Handling other requests (like CSS, JavaScript files)
        const filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File Not Found');
            } else {
                res.writeHead(200);
                res.end(data);
            }
        });
    }
});

// Start listening on the specified port
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
