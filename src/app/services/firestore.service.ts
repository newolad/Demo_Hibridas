/**
 * MÓDULO 3 – Firestore (NoSQL) con CRUD modular y tiempo real
 * Estructura: colección `tasks`; cada documento = { title, done, uid, createdAt, deadline? }.
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

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly tasksRef = collection(db, 'tasks');

  constructor(private zone: NgZone) {}

  /** CREATE – addDoc() genera el ID automáticamente. */
  addTask(title: string, uid: string, deadline?: string) {
    const data: any = { title, done: false, uid, createdAt: serverTimestamp() };
    if (deadline) data['deadline'] = deadline;
    console.log('[Firestore] addTask → enviando a Firestore:', data);
    return addDoc(this.tasksRef, data);
  }

  /** READ (una vez) – getDocs() devuelve una "foto" de la consulta. */
  async getTasks(uid: string): Promise<Task[]> {
    const snap = await getDocs(query(this.tasksRef, where('uid', '==', uid)));
    const tasks = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
    console.log('[Firestore] getTasks → tareas leídas (foto):', tasks);
    return tasks;
  }

  /** READ (un documento) – getDoc(). */
  async getTask(id: string): Promise<Task | null> {
    const snap = await getDoc(doc(db, 'tasks', id));
    return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Task, 'id'>) } : null;
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
   * TIEMPO REAL – onSnapshot() abre un canal con Firestore: el callback se ejecuta al
   * inicio y cada vez que un documento cambia (desde este u otro dispositivo).
   * Devolvemos un Observable; al desuscribirse se llama a `unsubscribe` y se cierra el canal.
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
        console.log('[Firestore] watchTasks → cerrando canal tiempo real para uid:', uid);
        unsubscribe();
      };
    });
  }
}
