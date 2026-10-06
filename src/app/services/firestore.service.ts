/**
 * MÓDULO 3 – Firestore (NoSQL) con CRUD modular y tiempo real
 *
 * Colecciones:
 *  · `users/{uid}`  → perfil del usuario: { uid, email, role, createdAt }
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
   * Devuelve el perfil del usuario; si no existe lo crea con role "client".
   * Esto cubre tres casos:
   *  · Usuario nuevo recién registrado.
   *  · Usuario creado antes de que existiera la colección `users`.
   *  · Fallo transitorio al crear el perfil durante el registro.
   *
   * Si Firestore rechaza la operación (p. ej. reglas sin publicar) se devuelve
   * un perfil "client" en memoria para que la interfaz nunca quede vacía,
   * y el error queda registrado en consola para diagnóstico.
   */
  async ensureUserProfile(uid: string, email: string): Promise<UserProfile> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));

      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        console.log('[Firestore] ensureUserProfile → perfil existente:', profile);
        return profile;
      }

      console.log('[Firestore] ensureUserProfile → no existe, creando con role "client" para uid:', uid);
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        role: 'client',
        createdAt: serverTimestamp(),
      });
      return { uid, email, role: 'client' };
    } catch (err) {
      console.error(
        '[Firestore] ensureUserProfile → ERROR al leer/crear el perfil.',
        'Revisa que las reglas de Firestore estén publicadas en Firebase Console.',
        err,
      );
      return { uid, email, role: 'client' };
    }
  }

  /** Lee todos los perfiles de usuario (solo el admin tiene permiso). */
  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(this.usersRef);
      const profiles = snap.docs.map((d) => d.data() as UserProfile);
      console.log('[Firestore] getAllUserProfiles → perfiles leídos:', profiles.length);
      return profiles;
    } catch (err) {
      console.error('[Firestore] getAllUserProfiles → ERROR (¿reglas publicadas?):', err);
      return [];
    }
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

  /** TIEMPO REAL (cliente) – escucha solo las tareas del usuario activo. */
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
        (err) =>
          this.zone.run(() => {
            console.error('[Firestore] watchTasks → error en snapshot:', err);
            subscriber.next([]);
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
   * Si las reglas rechazan la lectura se emite una lista vacía en lugar de
   * propagar el error, para que el panel siga siendo usable.
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
        (err) =>
          this.zone.run(() => {
            console.error('[Firestore] watchAllTasks → ERROR (¿reglas publicadas?):', err);
            subscriber.next([]);
          }),
      );
      return () => {
        console.log('[Firestore] watchAllTasks → cerrando canal admin');
        unsubscribe();
      };
    });
  }
}
