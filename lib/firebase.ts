import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDzqSfnQAu2wSsGMtnz_LDb1qU5gB8wcxQ",
  authDomain: "gen-lang-client-0161708816.firebaseapp.com",
  projectId: "gen-lang-client-0161708816",
  storageBucket: "gen-lang-client-0161708816.firebasestorage.app",
  messagingSenderId: "967257916518",
  appId: "1:967257916518:web:be58e5d121a7f5ca67d9a7"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app, "ai-studio-60ca3e89-83f1-4975-9207-8875c0e34bf8");

export { auth, provider, db };
