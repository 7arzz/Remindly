import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADgLsiTYqfYbvnlt1BI2cQonBTguxlhDU",
  authDomain: "remindly-579de.firebaseapp.com",
  projectId: "remindly-579de",
  storageBucket: "remindly-579de.firebasestorage.app",
  messagingSenderId: "575184734169",
  appId: "1:575184734169:web:6c8fbd257a6a686e263bc8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const messaging = getMessaging(app);

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export const requestForToken = (vapidKey) => {
  return getToken(messaging, { vapidKey: vapidKey })
    .then((currentToken) => {
      if (currentToken) {
        console.log('Current token for client: ', currentToken);
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    })
    .catch((err) => {
      console.log('An error occurred while retrieving token. ', err);
    });
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Message received in foreground: ", payload);
      resolve(payload);
    });
  });

export { auth, db, messaging };
