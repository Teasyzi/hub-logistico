// Configuração web do Firebase. Esses valores são públicos por natureza (identificam o projeto);
// a proteção dos dados é feita pelas regras do Firestore (firestore.rules) e pelo login.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAzmfc9RJdgoABieU9MtQFRQxjxUCTjjAQ',
  authDomain: 'hub-log-dd1a0.firebaseapp.com',
  projectId: 'hub-log-dd1a0',
  storageBucket: 'hub-log-dd1a0.firebasestorage.app',
  messagingSenderId: '429432695331',
  appId: '1:429432695331:web:248bece916bae522e6df96',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
