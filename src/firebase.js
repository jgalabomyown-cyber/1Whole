// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4XWYsny2QvmF3wVzrnqHrmOFfNaVSjxY",
  authDomain: "onewhole-a6974.firebaseapp.com",
  projectId: "onewhole-a6974",
  storageBucket: "onewhole-a6974.firebasestorage.app",
  messagingSenderId: "81269220166",
  appId: "1:81269220166:web:8476e62813912859acfb47",
  measurementId: "G-LE58JZX0RP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);