/**
 * MÓDULO 1 – Variables de entorno
 * ---------------------------------------------------------------
 * Reemplaza los valores con los de tu proyecto:
 * Firebase Console → Configuración del proyecto → Tus apps → App web → SDK setup and configuration.
 *
 * NOTA: las claves de Firebase Web NO son secretos (identifican el proyecto);
 * la seguridad real se define en las Reglas de Firestore y en Authentication.
 */
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyCvEpsNsCYGArmkzuURzNEr7z44p4H0H4U',
    authDomain: 'fir-hibridas.firebaseapp.com',
    projectId: 'fir-hibridas',
    storageBucket: 'fir-hibridas.firebasestorage.app',
    messagingSenderId: '482102994774',
    appId: '1:482102994774:web:dd24dbdfd28aacc18dd8f7',
  },
};
