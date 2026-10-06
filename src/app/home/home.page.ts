/**
 * MÓDULO 4 – Lógica de la vista.
 *
 * La vista se construye a partir de `profile$`, que combina la sesión de
 * Firebase Auth con el perfil guardado en Firestore:
 *
 *   profile$ === undefined → resolviendo sesión o perfil  → spinner
 *   profile$ === null      → sin sesión                   → login / registro
 *   profile$.role 'client' → panel de tareas propias
 *   profile$.role 'admin'  → panel con las tareas de todos los clientes
 */
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, from, of } from 'rxjs';
import { map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import {
  IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle,
  IonCardTitle, IonCheckbox, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel,
  IonList, IonNote, IonSpinner, IonTitle, IonToolbar, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, logOutOutline, peopleOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { FirestoreService, Task, UserProfile } from '../services/firestore.service';

/** Tareas de un cliente agrupadas para el panel del administrador. */
interface UserTaskGroup {
  uid: string;
  email: string;
  tasks: Task[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  imports: [
    AsyncPipe, FormsModule,
    IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle,
    IonCardTitle, IonCheckbox, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel,
    IonList, IonNote, IonSpinner, IonTitle, IonToolbar,
  ],
})
export class HomePage {
  private auth = inject(AuthService);
  private fs = inject(FirestoreService);
  private alertCtrl = inject(AlertController);

  // Formulario de autenticación
  email = '';
  password = '';
  isRegisterMode = false;
  loading = false;
  errorMsg = '';

  // Formulario de nueva tarea
  newTitle = '';
  newDeadline = '';

  /**
   * Perfil del usuario activo.
   * `undefined` mientras se resuelve la sesión o se lee el perfil,
   * `null` si no hay sesión. ensureUserProfile() crea el perfil si falta,
   * por lo que un usuario autenticado siempre termina con uno.
   */
  profile$: Observable<UserProfile | null | undefined> = this.auth.user$.pipe(
    switchMap((user) => {
      if (user === undefined) {
        console.log('[Auth] Resolviendo sesión guardada...');
        return of(undefined);
      }
      if (user === null) {
        console.log('[Auth] Sin sesión activa.');
        return of(null);
      }
      console.log('[Auth] Sesión activa → uid:', user.uid, '| resolviendo perfil...');
      // startWith(undefined) mantiene el spinner mientras la promesa se resuelve
      return from(this.fs.ensureUserProfile(user.uid, user.email ?? '')).pipe(
        startWith(undefined),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  /** Tareas propias del cliente, en tiempo real. Vacío si el rol es admin. */
  tasks$: Observable<Task[]> = this.profile$.pipe(
    switchMap((profile) =>
      profile && profile.role === 'client' ? this.fs.watchTasks(profile.uid) : of([]),
    ),
  );

  /**
   * Tareas de todos los clientes agrupadas por usuario, en tiempo real.
   * Solo se activa cuando el rol es admin; en cualquier otro caso emite vacío
   * y no abre ningún canal con Firestore.
   */
  adminGroups$: Observable<UserTaskGroup[]> = this.profile$.pipe(
    switchMap((profile) => {
      if (!profile || profile.role !== 'admin') return of([]);
      console.log('[Admin] Rol administrador detectado, cargando panel global...');
      return combineLatest([
        this.fs.watchAllTasks(),
        from(this.fs.getAllUserProfiles()),
      ]).pipe(map(([tasks, profiles]) => this.groupByUser(tasks, profiles)));
    }),
  );

  constructor() {
    addIcons({ createOutline, logOutOutline, peopleOutline, trashOutline });
    console.log('[App] HomePage inicializada.');
  }

  async submitAuth() {
    this.errorMsg = '';
    this.loading = true;
    console.log(`[Auth] Intento de ${this.isRegisterMode ? 'registro' : 'login'} con:`, this.email);
    try {
      if (this.isRegisterMode) {
        const cred = await this.auth.register(this.email, this.password);
        console.log('[Auth] Registro exitoso → uid:', cred.user.uid);
      } else {
        const cred = await this.auth.login(this.email, this.password);
        console.log('[Auth] Login exitoso → uid:', cred.user.uid);
      }
      this.password = '';
    } catch (e: any) {
      console.warn('[Auth] Error → código:', e?.code, '| mensaje:', e?.message);
      this.errorMsg = this.translateError(e?.code);
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMsg = '';
  }

  logout() {
    console.log('[Auth] Cerrando sesión...');
    return this.auth.logout().then(() => console.log('[Auth] Sesión cerrada.'));
  }

  async addTask(uid: string) {
    const title = this.newTitle.trim();
    if (!title) {
      console.warn('[Tarea] addTask cancelado: el título está vacío.');
      return;
    }
    const deadline = this.newDeadline || undefined;
    console.log('[Tarea] Creando →', { title, uid, deadline });
    this.newTitle = '';
    this.newDeadline = '';
    const ref = await this.fs.addTask(title, uid, deadline);
    console.log('[Tarea] Creada con id:', ref.id);
  }

  toggleDone(task: Task) {
    console.log('[Tarea] toggleDone → id:', task.id, '|', task.done, '→', !task.done);
    return this.fs.updateTask(task.id!, { done: !task.done });
  }

  async editTask(task: Task) {
    console.log('[Tarea] Abriendo editor → id:', task.id);
    const alert = await this.alertCtrl.create({
      header: 'Editar tarea',
      inputs: [{ name: 'title', type: 'text', value: task.title }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (d) => {
            const title = (d.title ?? '').trim();
            if (title) {
              console.log('[Tarea] Guardando edición → id:', task.id, '| título:', title);
              this.fs.updateTask(task.id!, { title });
            }
          },
        },
      ],
    });
    await alert.present();
  }

  deleteTask(task: Task) {
    console.log('[Tarea] Eliminando → id:', task.id);
    return this.fs.deleteTask(task.id!);
  }

  /**
   * Agrupa las tareas por propietario y resuelve el email de cada uno.
   * Si un uid no tiene perfil en `users` se muestra el uid como identificador.
   */
  private groupByUser(tasks: Task[], profiles: UserProfile[]): UserTaskGroup[] {
    const emailByUid = new Map(profiles.map((p) => [p.uid, p.email]));
    const tasksByUid = new Map<string, Task[]>();

    for (const task of tasks) {
      if (!tasksByUid.has(task.uid)) tasksByUid.set(task.uid, []);
      tasksByUid.get(task.uid)!.push(task);
    }

    const groups = Array.from(tasksByUid, ([uid, tasks]) => ({
      uid,
      email: emailByUid.get(uid) ?? `(sin perfil) ${uid}`,
      tasks,
    }));

    console.log('[Admin] Tareas agrupadas en', groups.length, 'usuario(s).');
    return groups;
  }

  private translateError(code?: string): string {
    switch (code) {
      case 'auth/invalid-email': return 'Correo inválido.';
      case 'auth/email-already-in-use': return 'Ese correo ya está registrado.';
      case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password': return 'Correo o contraseña incorrectos.';
      default: return 'Ocurrió un error. Intenta de nuevo.';
    }
  }
}
