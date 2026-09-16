import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5NFign5aKg2FJZWYNRjy8CJFCP67GMnw",
  authDomain: "whole-b32fb.firebaseapp.com",
  projectId: "whole-b32fb",
  storageBucket: "whole-b32fb.firebasestorage.app",
  messagingSenderId: "1015926407251",
  appId: "1:1015926407251:web:1542e24cdf3a1fe29bc6a6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;