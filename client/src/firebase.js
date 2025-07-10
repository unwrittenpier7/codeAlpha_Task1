// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB-nmx5fAlWwn4kgSHkaAVjUELq0D_O5w0",
  authDomain: "video-confering-app.firebaseapp.com",
  projectId: "video-confering-app",
  storageBucket: "video-confering-app.appspot.com",
  messagingSenderId: "721766669304",
  appId: "1:721766669304:web:21714dade807c0e8b2d40d",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { auth };
