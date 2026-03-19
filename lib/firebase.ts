import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Firebase config (same project use karo jisme domain add karoge)
const firebaseConfig = {
  apiKey: "AIzaSyDzqSfnQAu2wSsGMtnz_LDb1qU5gB8wcxQ",
  authDomain: "gen-lang-client-0161708816.firebaseapp.com",
  projectId: "gen-lang-client-0161708816",
  storageBucket: "gen-lang-client-0161708816.firebasestorage.app",
  messagingSenderId: "967257916518",
  appId: "1:967257916518:web:be58e5d121a7f5ca67d9a7"
};

// ✅ Initialize Firebase (safe for Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Auth setup
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Optional: force account selection
provider.setCustomParameters({
  prompt: "select_account"
});

// ✅ Firestore setup (FIXED)
const db = getFirestore(app);

// ✅ Export
export { auth, provider, db };