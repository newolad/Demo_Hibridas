/**
 * MÓDULO 2 – Firebase Authentication
 * Al registrar un usuario nuevo, crea automáticamente su perfil en Firestore
 * con role: "client". El administrador se designa manualmente en Firestore.
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
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Estado global del usuario. `undefined` = aún resolviendo la sesión guardada,
   * `null` = sin sesión, `User` = sesión activa.
   */
  private userSubject = new BehaviorSubject<User | null | undefined>(undefined);
  readonly user$ = this.userSubject.asObservable();

  constructor(private zone: NgZone, private fs: FirestoreService) {
    onAuthStateChanged(auth, (user) => this.zone.run(() => this.userSubject.next(user)));
  }

  /**
   * Registro con correo y contraseña.
   * Después de crear la cuenta en Auth, crea el perfil en Firestore con role "client".
   */
  async register(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await this.fs.createUserProfile(cred.user.uid, email);
    return cred;
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
