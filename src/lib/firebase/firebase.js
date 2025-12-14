// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyDKcbkqvIsE1m6lttvezs86Y23HP48xOj0",
    authDomain: "fitup-c2e8c.firebaseapp.com",
    projectId: "fitup-c2e8c",
    storageBucket: "fitup-c2e8c.firebasestorage.app",
    messagingSenderId: "999416205468",
    appId: "1:999416205468:web:b65e745bf55e9160eddd59"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
