/**
 * MÓDULO 3 – Firestore (NoSQL) con CRUD modular y tiempo real
 *
 * Colecciones:
 *  · `users/{uid}`  → perfil del usuario: { email, role, createdAt }
 *                     role puede ser "client" | "admin"
 *  · `tasks/{id}`   → tarea: { title, done, uid, createdAt, deadline? }
 */
import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase.config';

export interface Task {
  id?: string;
  title: string;
  done: boolean;
  uid: string;
  /** Fecha límite en formato ISO "YYYY-MM-DD". Opcional. */
  deadline?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'client' | 'admin';
}

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly tasksRef = collection(db, 'tasks');
  private readonly usersRef = collection(db, 'users');

  constructor(private zone: NgZone) {}

  // ─────────────────────────────────────────────────────────────
  // PERFILES DE USUARIO
  // ─────────────────────────────────────────────────────────────

  /**
   * Crea el perfil del usuario en Firestore al registrarse.
   * Usa setDoc con el uid como ID del documento para que sea predecible.
   * El rol por defecto es "client".
   */
  createUserProfile(uid: string, email: string): Promise<void> {
    console.log('[Firestore] createUserProfile → uid:', uid, '| email:', email);
    return setDoc(doc(db, 'users', uid), {
      uid,
      email,
      role: 'client',
      createdAt: serverTimestamp(),
    });
  }

  /** Lee el perfil de un usuario por su uid. */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const profile = snap.data() as UserProfile;
    console.log('[Firestore] getUserProfile → perfil leído:', profile);
    return profile;
  }

  // ─────────────────────────────────────────────────────────────
  // TAREAS – operaciones de CLIENTE
  // ─────────────────────────────────────────────────────────────

  /** CREATE – addDoc() genera el ID automáticamente. */
  addTask(title: string, uid: string, deadline?: string) {
    const data: any = { title, done: false, uid, createdAt: serverTimestamp() };
    if (deadline) data['deadline'] = deadline;
    console.log('[Firestore] addTask → enviando a Firestore:', data);
    return addDoc(this.tasksRef, data);
  }

  /** UPDATE – updateDoc() modifica solo los campos indicados. */
  updateTask(id: string, changes: Partial<Pick<Task, 'title' | 'done' | 'deadline'>>) {
    console.log('[Firestore] updateTask → id:', id, '| cambios:', changes);
    return updateDoc(doc(db, 'tasks', id), changes);
  }

  /** DELETE – deleteDoc(). */
  deleteTask(id: string) {
    console.log('[Firestore] deleteTask → eliminando id:', id);
    return deleteDoc(doc(db, 'tasks', id));
  }

  /**
   * TIEMPO REAL (cliente) – escucha solo las tareas del usuario activo.
   */
  watchTasks(uid: string): Observable<Task[]> {
    console.log('[Firestore] watchTasks → abriendo canal tiempo real para uid:', uid);
    return new Observable<Task[]>((subscriber) => {
      const q = query(this.tasksRef, where('uid', '==', uid));
      const unsubscribe: Unsubscribe = onSnapshot(
        q,
        (snap) =>
          this.zone.run(() => {
            const tasks = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
            console.log('[Firestore] watchTasks → snapshot recibido, tareas:', tasks);
            subscriber.next(tasks);
          }),
        (err) => this.zone.run(() => {
          console.error('[Firestore] watchTasks → error en snapshot:', err);
          subscriber.error(err);
        }),
      );
      return () => {
        console.log('[Firestore] watchTasks → cerrando canal para uid:', uid);
        unsubscribe();
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // TAREAS – operaciones de ADMINISTRADOR
  // ─────────────────────────────────────────────────────────────

  /**
   * TIEMPO REAL (admin) – escucha TODAS las tareas de TODOS los usuarios.
   * Las agrupa por uid en un Map para que la vista pueda mostrarlas
   * identificadas por email de cada cliente.
   */
  watchAllTasks(): Observable<Task[]> {
    console.log('[Firestore] watchAllTasks → abriendo canal admin (todas las tareas)');
    return new Observable<Task[]>((subscriber) => {
      const unsubscribe: Unsubscribe = onSnapshot(
        this.tasksRef,
        (snap) =>
          this.zone.run(() => {
            const tasks = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
            console.log('[Firestore] watchAllTasks → total tareas recibidas:', tasks.length);
            subscriber.next(tasks);
          }),
        (err) => this.zone.run(() => {
          console.error('[Firestore] watchAllTasks → error:', err);
          subscriber.error(err);
        }),
      );
      return () => {
        console.log('[Firestore] watchAllTasks → cerrando canal admin');
        unsubscribe();
      };
    });
  }

  /** Lee todos los perfiles de usuario (solo usado por el admin). */
  async getAllUserProfiles(): Promise<UserProfile[]> {
    const snap = await getDocs(this.usersRef);
    const profiles = snap.docs.map((d) => d.data() as UserProfile);
    console.log('[Firestore] getAllUserProfiles → perfiles leídos:', profiles.length);
    return profiles;
  }
}
