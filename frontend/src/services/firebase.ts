import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyA9gMZu6tOmIteOn_QMN7tiVyrrv22ABrk",
  authDomain: "signflow-a431a.firebaseapp.com",
  projectId: "signflow-a431a",
  storageBucket: "signflow-a431a.firebasestorage.app",
  messagingSenderId: "536651470453",
  appId: "1:536651470453:web:8d9b51d95780ad102e8a3c",
  measurementId: "G-WXBF6FJDH0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
