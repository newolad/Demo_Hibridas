# Demo Híbridas – Gestor de Tareas e Identidad Móvil en Tiempo Real

Ionic (Angular standalone, TypeScript) + Firebase JS SDK v10+ modular (Auth + Firestore).

| Módulo | Archivo |
|---|---|
| 1. Configuración cloud | `src/environments/environment.ts`, `src/app/config/firebase.config.ts` |
| 2. Autenticación y persistencia | `src/app/services/auth.service.ts` |
| 3. Firestore CRUD + `onSnapshot` | `src/app/services/firestore.service.ts` |
| 4. UI (login / panel) | `src/app/home/home.page.ts`, `home.page.html` |

## Puesta en marcha
1. Crea un proyecto en Firebase, activa **Authentication → Email/Password** y **Firestore**.
2. Copia la config web en `src/environments/environment.ts`.
3. Publica las reglas de `firestore.rules`.
4. `npm install && npm start`

## Móvil (Capacitor)
```bash
npm run build
npx cap add android   # y/o: npx cap add ios
npx cap sync
```
- Android: `google-services.json` → `android/app/`
- iOS: `GoogleService-Info.plist` → `ios/App/App/` (añadir al target en Xcode)
- El `appId` de `capacitor.config.ts` debe coincidir con el registrado en Firebase.
