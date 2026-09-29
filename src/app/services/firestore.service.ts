/**
 * MÓDULO 3 – Firestore (NoSQL) con CRUD modular y tiempo real
 * Estructura: colección `tasks`; cada documento = { title, done, uid, createdAt }.
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
}

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly tasksRef = collection(db, 'tasks');

  constructor(private zone: NgZone) {}

  /** CREATE – addDoc() genera el ID automáticamente. */
  addTask(title: string, uid: string) {
    return addDoc(this.tasksRef, { title, done: false, uid, createdAt: serverTimestamp() });
  }

  /** READ (una vez) – getDocs() devuelve una "foto" de la consulta. */
  async getTasks(uid: string): Promise<Task[]> {
    const snap = await getDocs(query(this.tasksRef, where('uid', '==', uid)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
  }

  /** READ (un documento) – getDoc(). */
  async getTask(id: string): Promise<Task | null> {
    const snap = await getDoc(doc(db, 'tasks', id));
    return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Task, 'id'>) } : null;
  }

  /** UPDATE – updateDoc() modifica solo los campos indicados. */
  updateTask(id: string, changes: Partial<Pick<Task, 'title' | 'done'>>) {
    return updateDoc(doc(db, 'tasks', id), changes);
  }

  /** DELETE – deleteDoc(). */
  deleteTask(id: string) {
    return deleteDoc(doc(db, 'tasks', id));
  }

  /**
   * TIEMPO REAL – onSnapshot() abre un canal con Firestore: el callback se ejecuta al
   * inicio y cada vez que un documento cambia (desde este u otro dispositivo).
   * Devolvemos un Observable; al desuscribirse se llama a `unsubscribe` y se cierra el canal.
   */
  watchTasks(uid: string): Observable<Task[]> {
    return new Observable<Task[]>((subscriber) => {
      const q = query(this.tasksRef, where('uid', '==', uid)); // sin orderBy: evita exigir un índice compuesto; se ordena en el cliente
      const unsubscribe: Unsubscribe = onSnapshot(
        q,
        (snap) =>
          this.zone.run(() =>
            subscriber.next(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }))),
          ),
        (err) => this.zone.run(() => subscriber.error(err)),
      );
      return unsubscribe;
    });
  }
}
