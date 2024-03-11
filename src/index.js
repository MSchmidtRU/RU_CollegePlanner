// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
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