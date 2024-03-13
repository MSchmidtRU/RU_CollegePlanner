//THE STUFF COMMENTED OUT BELOW IS THE DEFAULT CODE THAT THEY GAVE US FOR INDEX.JS. I COMMENTED IT OUT BECAUSE I THINK WE NEED TO USE FIREBASE ADMIN
// Import the functions you need from the SDKs you need
/*
const { auth } = require('firebase/auth');
const { firestore } = require('firebase/firestore');
const { initializeApp } = require("firebase/app");

const firebaseConfig = {
    apiKey: "AIzaSyAEUZTiKw2ojRvs6GRcM9bp827MTfxydkw",
    authDomain: "maps-9ae32.firebaseapp.com",
    projectId: "maps-9ae32",
    storageBucket: "maps-9ae32.appspot.com",
    messagingSenderId: "687862985843",
    appId: "1:687862985843:web:221c76658501ea070fe606",
    measurementId: "G-BH2DZ1N5CW"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

module.exports = {app, firestore, auth}; //Hannah added
*/

var admin = require("firebase-admin");

var serviceAccount = require('../serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();
const auth = admin.auth();

module.exports = { firestore };
