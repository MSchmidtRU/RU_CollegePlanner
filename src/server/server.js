const http = require('node:http');
const { methods } = require("./endpoints");


const hostname = '127.0.0.1';
const port = 3000;

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

    async router() {
        try {
            let contentType = this.req.headers['content-type'];
            let method = this.req.method;
            let url = this.req.url.split("?")[0];
            let params = this.req.url.split("?")[1];

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
                        this.req.body = this.parseJson(this.body);
                        return this.sendResponse(...await handler(this.req));
                    }
                }
                return this.sendResponse("endpoint not found", 421);
            }
            return this.sendResponse("unknown method", 400);
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
            throw ([`Expected ${expected} but received ${received} as the Content-Type`, 400]);
        }
    }

    checkMethod(expected, received) {
        if (expected != received) {
            throw ([`Expected ${expected} but received ${received} as the method`, 405]);
        }
    }

    parseJson() {
        this.checkEmptyBody(this.body)
        try {
            return JSON.parse(this.body);
        } catch (e) {
            throw (["Expected JSON object", 406]);
        }

    }

    checkEmptyBody() {
        if (this.body == "") {
            throw (["Error - empty body", 404]);
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
        this.res.end(response);
    }

    sendError(e) {
        if (e.length > 0) {
            this.sendResponse(...e);
        }
        else {
            this.sendResponse(e.message, 400);
        }
    }
}

module.exports = { Server };