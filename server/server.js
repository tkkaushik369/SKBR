"use strict";
// When starting this project by using `npm run dev`, this server script
// will be compiled using tsc and will be running concurrently along side webpack-dev-server
// visit http://127.0.0.1:8080
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// In the production environment we don't use the webpack-dev-server, so instead type,
// `npm run build`        (this creates the production version of bundle.js and places it in ./dist/client/)
// `tsc -p ./src/server`  (this compiles ./src/server/server.ts into ./dist/server/server.js)
// `npm start            (this starts nodejs with express and serves the ./dist/client folder)
// visit http://127.0.0.1:3000
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const port = Number(process.env.PORT) || 3000;
const privateHost = false;
class AppServer {
    constructor(port) {
        this.uid = 1;
        this.Start = this.Start.bind(this);
        // init
        this.port = port;
        const app = (0, express_1.default)();
        app.use(express_1.default.static(path_1.default.join(__dirname, "../client")));
        this.server = http_1.default.createServer(app);
    }
    Start() {
        this.server.listen(this.port, privateHost ? "127.0.0.1" : "0.0.0.0", () => {
            console.log(`Server listening on port ${this.port}.`);
        });
    }
}
new AppServer(port).Start();
