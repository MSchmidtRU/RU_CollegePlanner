const http = require('http');
const fs = require('fs');
const path = require('path');

// Port number for the server
const port = 8080;

// Creating a server
const server = http.createServer((req, res) => {
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
    } else {
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
