const http = require('node:http');
const { methods } = require("./endpoints");
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');


const hostname = '127.0.0.1';
const port = 3000;
const rutgersClient = new OAuth2Client("YOUR_CLIENT_ID")

class Server {
    constructor() {
        this.server = http.createServer((req, res) => {
            let body = [];
            req
                .on('data', chunk => {
                    body.push(chunk);
                })
                .on('end', () => {
                    body = Buffer.concat(body).toString();
                    this.res = res;
                    this.req = req;
                    this.body = body
                    this.router();
                });
        });
    }

    displayContent(filePath, contentType = 'text/html') {
        const fullPath = path.join(__dirname, '../public', filePath)
        fs.readFile(fullPath, (error, content) => {
            if (error) {
                console.error(error)
                return this.sendResponse('Page could not be displayed.')
            }
            this.sendResponse(content, 200, contentType);
        })
    }

    async router() {
        try {
            let contentType = this.req.headers['content-type'];
            let method = this.req.method;
            let url = this.req.url.split("?")[0];
            let params = this.req.url.split("?")[1];

            if (method == 'OPTIONS') {
                // Respond to OPTIONS requests with a 200 OK statu
                this.sendResponse(null, 200, null)
                return;
            }

            let endpoints = methods[method];
            if (endpoints) {

                for (const [endpoint, handler] of Object.entries(endpoints)) {

                    const regex = new RegExp('^' + endpoint.replace(/~\w+/g, '[^/]+') + '$');

                    if (regex.test(url)) {
                        const embeddedParams = {};
                        const urlParts = url.split('/');
                        const endpointParts = endpoint.split('/');

                        for (let i = 0; i < urlParts.length; i++) {
                            if (endpointParts[i].startsWith('~')) {
                                embeddedParams[endpointParts[i].substring(1)] = urlParts[i].replace(/\//g, '');
                            }
                        }

                        this.req.params = { ...embeddedParams, ...this.parseParams(params) };
                        this.req.body = contentType == "application/json" ? this.parseJson(this.body) : "";
                        return this.sendResponse(...await handler(this.req));
                    }
                }
                return this.sendResponse("endpoint not found ~421");
            }
            return this.sendResponse("unknown method ~400");
        } catch (e) {
            this.sendError(e);
        }

    }

    parseParams(params) {
        if (params) {
            const paramsArray = params.split('&');
            const result = {};
            paramsArray.forEach(param => {
                const [name, value] = param.split('=');
                result[name] = value;
            });

            return result;
        }
        return [];
    }

    checkContentType(expected, received) {
        if (expected != received) {
            throw new Error(`Expected ${expected} but received ${received} as the Content-Type ~400`);
        }
    }

    checkMethod(expected, received) {
        if (expected != received) {
            throw new Error(`Expected ${expected} but received ${received} as the method ~405`);
        }
    }

    parseJson() {
        this.checkEmptyBody(this.body)
        try {
            return JSON.parse(this.body);
        } catch (e) {
            throw new Error("Expected JSON object ~406");
        }

    }

    checkEmptyBody() {
        if (this.body == "") {
            throw new Error("Error - empty body ~404");
        }
    }


    async startServer() {
        return new Promise((resolve, reject) => {
            this.server.listen(port, hostname, () => {
                console.log(`Server running at http://${hostname}:${port}/`);
                resolve();
            });

            this.server.on('error', (error) => {
                console.error('Error starting server:', error.message);
                reject(error);
            });
        });
    }

    sendResponse(response, code, contentType = "application/json") {
        this.res.statusCode = code;
        this.res.setHeader("Content-Type", contentType);
        this.res.setHeader('Access-Control-Allow-Origin', '*');
        this.res.setHeader('Access-Control-Allow-Methods', '*');
        this.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        this.res.end(response);
    }

    sendError(e) {
        let theMatch = (e.message).match(/^(.*?) ~(-?\d+)$/);
        if (theMatch) {
            this.sendResponse(theMatch[1], parseInt(theMatch[2]))
        } else {

            this.sendResponse(e.message, 400);
        }
    }
}

module.exports = { Server };