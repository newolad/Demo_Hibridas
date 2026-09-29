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
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO',
    storageBucket: 'TU_PROYECTO.appspot.com',
    messagingSenderId: 'TU_SENDER_ID',
    appId: 'TU_APP_ID',
  },
};
