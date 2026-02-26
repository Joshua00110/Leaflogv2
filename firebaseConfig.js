import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB-IZ5VVROxppLSvgGHuJipJrJtj8fFfHs",
  authDomain: "leaflog-4ef30.firebaseapp.com",
  projectId: "leaflog-4ef30",
  storageBucket: "leaflog-4ef30.firebasestorage.app",
  messagingSenderId: "184539560046",
  appId: "1:184539560046:web:1235afff406711062f0e7f",
  measurementId: "G-2WH9R8NPQT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize and EXPORT the members
export const db = getFirestore(app);
export const auth = getAuth(app); // 3. This line fixes the ts(2305) error