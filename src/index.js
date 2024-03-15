const admin = require("firebase-admin");
const serviceAccount = require('../serviceAccountKey.json');
const { Server } = require("./server/server");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();
const auth = admin.auth();

const server = new Server();

//server.startServer();

module.exports = { firestore };
