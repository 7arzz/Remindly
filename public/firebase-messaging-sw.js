importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// 🔧 Hubungkan Firebase SW dengan project Anda
firebase.initializeApp({
  apiKey: "AIzaSyADgLsiTYqfYbvnlt1BI2cQonBTguxlhDU",
  authDomain: "remindly-579de.firebaseapp.com",
  projectId: "remindly-579de",
  storageBucket: "remindly-579de.firebasestorage.app",
  messagingSenderId: "575184734169",
  appId: "1:575184734169:web:6c8fbd257a6a686e263bc8"
});

const messaging = firebase.messaging();

// Menangani notifikasi saat aplikasi ditutup
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/bell.jpg',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
