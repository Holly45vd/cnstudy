// CRA용 Firebase config
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCtu7U6oAplL9-yL8zfov8b208s7wTeAXc",
  authDomain: "studynote-8c150.firebaseapp.com",
  projectId: "studynote-8c150",
  storageBucket: "studynote-8c150.firebasestorage.app",
  messagingSenderId: "754481466909",
  appId: "1:754481466909:web:cb131025ce5d550f7640f4",
  measurementId: "G-7WZP2H1Y34"
};

if (process.env.NODE_ENV !== "production") {
  const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) console.warn("⚠️ Firebase env 누락:", missing);
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
