/**
 * MÓDULO 1 – Inicialización de Firebase (JS SDK v10+ modular)
 * ---------------------------------------------------------------
 * PASO 1: Importamos solo las funciones que necesitamos (tree-shaking → bundle más liviano).
 * PASO 2: initializeApp() recibe la configuración de environment.ts y crea la conexión con la nube.
 * PASO 3: Exportamos las instancias (app, auth, db) para inyectarlas en los servicios.
 *
 * ── Consideraciones para dispositivos móviles (Capacitor / Cordova) ──
 *  • Android: descarga `google-services.json` desde Firebase Console (app Android con el mismo
 *    `appId` de capacitor.config.ts) y colócalo en `android/app/google-services.json`.
 *    Luego `npx cap sync android`.
 *  • iOS: descarga `GoogleService-Info.plist` (app iOS con el mismo Bundle ID) y agrégalo
 *    al target "App" desde Xcode (`ios/App/App/`). Luego `npx cap sync ios`.
 *  • Con el JS SDK (web) el WebView usa la config de environment.ts; los archivos nativos son
 *    necesarios si añades plugins nativos de Firebase (Push, Analytics, Auth nativo, etc.).
 *  • Cordova: mismos archivos, ubicados en la raíz del proyecto y declarados en config.xml
 *    con <resource-file> (Android) / <resource-file> (iOS).
 *  • Google Sign-In / dominios: añade la huella SHA-1 en Firebase para Android.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export const firebaseApp = initializeApp(environment.firebase);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
