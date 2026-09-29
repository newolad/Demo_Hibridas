/**
 * MÓDULO 2 – Firebase Authentication
 */
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Estado global del usuario. `undefined` = aún resolviendo la sesión guardada,
   * `null` = sin sesión, `User` = sesión activa.
   */
  private userSubject = new BehaviorSubject<User | null | undefined>(undefined);
  readonly user$ = this.userSubject.asObservable();

  constructor(private zone: NgZone) {
    /**
     * PERSISTENCIA DE CREDENCIALES:
     * getAuth() usa por defecto `indexedDBLocalPersistence` en WebView (Capacitor/Cordova),
     * con respaldo en localStorage. El token de sesión (refresh token) se guarda en el
     * almacenamiento del propio dispositivo, dentro del sandbox de la app. Al reabrir la
     * app, el SDK lo lee, lo renueva y dispara onAuthStateChanged con el usuario, sin
     * pedir credenciales otra vez. signOut() borra ese token del almacenamiento.
     * (Alternativas: browserSessionPersistence = solo la sesión; inMemoryPersistence = nada.)
     *
     * onAuthStateChanged() es el observador en tiempo real: se dispara al iniciar la app,
     * al hacer login/registro y al cerrar sesión. Usamos NgZone.run para que Angular
     * detecte el cambio y actualice la vista.
     */
    onAuthStateChanged(auth, (user) => this.zone.run(() => this.userSubject.next(user)));
  }

  /** Registro con correo y contraseña. */
  register(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  /** Inicio de sesión con correo y contraseña. */
  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /** Cierre de sesión (limpia la persistencia local). */
  logout() {
    return signOut(auth);
  }

  get currentUser(): User | null {
    return auth.currentUser;
  }
}
