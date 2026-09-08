import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBUHGXoUMg0bV3EdmfpfmVAEYMLQceqkQc",
  authDomain: "expedicao-brasil.firebaseapp.com",
  projectId: "expedicao-brasil",
  storageBucket: "expedicao-brasil.firebasestorage.app",
  messagingSenderId: "766439248151",
  appId: "1:766439248151:web:ffe62de3fcf988ed756752",
  measurementId: "G-QDMSH4NRVK"
};

const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

if (typeof window !== "undefined") {
  signInAnonymously(auth).catch((err) => {
    console.warn("[FTF Firebase Auth] Anonymous sign in note:", err);
  });
}
