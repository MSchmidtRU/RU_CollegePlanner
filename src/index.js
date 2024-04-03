const admin = require("firebase-admin");
const serviceAccount = require('../serviceAccountKey.json');
const { Server } = require("./server/server");
const { firestore } = require("./database/firebase");

const server = new Server();

server.startServer();