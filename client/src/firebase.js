import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB-nmx5fAlWwn4kgSHkaAVjUELq0D_O5w0",
  authDomain: "video-confering-app.firebaseapp.com",
  projectId: "video-confering-app",
  storageBucket: "video-confering-app.appspot.com",
  messagingSenderId: "721766669304",
  appId: "1:721766669304:web:21714dade807c0e8b2d40d", // Replace with actual appId
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);