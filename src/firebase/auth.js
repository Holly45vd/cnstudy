// src/firebase/auth.js
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./config";

/** 🔹 구글 로그인 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("로그인 성공:", user.displayName);
    return user;
  } catch (error) {
    console.error("로그인 실패:", error.message);
    throw error;
  }
}

/** 🔹 로그아웃 */
export async function logout() {
  await signOut(auth);
  console.log("로그아웃 완료");
}

/** 🔹 로그인 상태 감시 */
export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
