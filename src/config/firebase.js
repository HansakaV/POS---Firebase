import { initializeApp } from "firebase/app";
import {getAuth,GoogleAuthProvider} from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyBwdUDy_cVBeLT0qjf6oEuqGKDlea0Wcrg",
  authDomain: "pos-dp.firebaseapp.com",
  projectId: "pos-dp",
  storageBucket: "pos-dp.appspot.com",
  messagingSenderId: "816631828077",
  appId: "1:816631828077:web:9626cb7e77bc2670d23964"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);