// 📁 assets/js/firebase/firebaseConfig.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js';

// 👇 ตั้งค่า Firebase ของคุณเองตรงนี้
const firebaseConfig = {
    apiKey: "AIzaSyAvJ4SgGaazPf6mY4G5-QfWcX2Yhkg-1X0",
    authDomain: "rd-wash-v2.firebaseapp.com",
    projectId: "rd-wash-v2",
    storageBucket: "rd-wash-v2.firebasestorage.app",
    messagingSenderId: "553662948172",
    appId: "1:553662948172:web:2423d7a81f2bbc9d53a5e9",
  };

// ✅ สร้าง Firebase App และ Firestore (แค่ครั้งเดียว)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Export ไปใช้ทุก module
export { db };
