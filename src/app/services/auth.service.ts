/**
 * MÓDULO 2 – Firebase Authentication
 *
 * El perfil en Firestore (`users/{uid}`) NO se crea aquí: lo resuelve
 * FirestoreService.ensureUserProfile() cuando onAuthStateChanged emite el
 * usuario. Así se evita la condición de carrera entre el registro y la
 * primera lectura del perfil, y los usuarios creados antes de que existiera
 * la colección `users` también obtienen su perfil automáticamente.
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
