import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// 🔧 Ganti dengan konfigurasi Firebase Anda dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyADgLsiTYqfYbvnlt1BI2cQonBTguxlhDU",
  authDomain: "remindly-579de.firebaseapp.com",
  projectId: "remindly-579de",
  storageBucket: "remindly-579de.firebasestorage.app",
  messagingSenderId: "575184734169",
  appId: "1:575184734169:web:6c8fbd257a6a686e263bc8"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: "BHjJbGZy2q-jsrdmj8trHW8Q1lRY0LL_ZhdzqjkRExI5nJKaGRxbKqVO_dAFzBLrjelXI5Xl6vIS0RzFIlBxOjM", // Dapatkan dari Firebase Console -> Messaging -> Web Push certificates
    });
    if (currentToken) {
      console.log("FCM Token:", currentToken);
      return currentToken;
    } else {
      console.log("No registration token available. Request permission to generate one.");
      return null;
    }
  } catch (err) {
    console.log("An error occurred while retrieving token. ", err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
