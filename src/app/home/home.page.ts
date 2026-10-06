/**
 * MÓDULO 4 – Lógica de la vista.
 *
 * Tres estados según el usuario y su rol:
 *  Estado 0: user$ === undefined  → resolviendo sesión (spinner)
 *  Estado 1: user$ === null       → sin sesión (formulario login/registro)
 *  Estado 2: sesión activa + role "client"  → panel de tareas propias
 *  Estado 3: sesión activa + role "admin"   → panel de todas las tareas
 */
import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCheckbox, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote,
  IonSpinner, IonTitle, IonToolbar, IonBadge, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, logOutOutline, trashOutline, peopleOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { FirestoreService, Task, UserProfile } from '../services/firestore.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  imports: [
    AsyncPipe, CommonModule, FormsModule,
    IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCheckbox, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote,
    IonSpinner, IonTitle, IonToolbar, IonBadge,
  ],
})
export class HomePage implements OnInit {
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

  /** Rol del usuario activo. Se carga tras el login. */
  userRole: 'client' | 'admin' | null = null;

  /** Perfiles de todos los usuarios (solo admin los usa para mostrar emails). */
  userProfiles: Map<string, UserProfile> = new Map();

  /** Usuario global en tiempo real (onAuthStateChanged). */
  user$ = this.auth.user$;

  /** Tareas del cliente activo en tiempo real. */
  tasks$: Observable<Task[]> = this.auth.user$.pipe(
    switchMap((user) => {
      if (user) {
        console.log('[Auth] Usuario autenticado, cargando tareas para uid:', user.uid);
        return this.fs.watchTasks(user.uid);
      }
      console.log('[Auth] Sin sesión activa.');
      return of([]);
    }),
  );

  /** Todas las tareas en tiempo real (solo admin). */
  allTasks$: Observable<Task[]> = of([]);

  constructor() {
    addIcons({ createOutline, logOutOutline, trashOutline, peopleOutline });
    console.log('[App] HomePage inicializada.');
  }

  ngOnInit() {
    // Cada vez que cambia el estado de autenticación, cargamos el rol del usuario
    this.auth.user$.subscribe(async (user) => {
      if (user) {
        const profile = await this.fs.getUserProfile(user.uid);
        this.userRole = profile?.role ?? 'client';
        console.log('[Auth] Rol detectado:', this.userRole, '| uid:', user.uid);

        if (this.userRole === 'admin') {
          // Cargar perfiles de todos los usuarios para mostrar emails en el panel admin
          const profiles = await this.fs.getAllUserProfiles();
          this.userProfiles = new Map(profiles.map((p) => [p.uid, p]));
          console.log('[Admin] Perfiles cargados:', profiles.length);
          // Abrir canal en tiempo real de todas las tareas
          this.allTasks$ = this.fs.watchAllTasks();
        }
      } else {
        this.userRole = null;
        this.userProfiles = new Map();
        this.allTasks$ = of([]);
      }
    });
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
      console.warn('[Auth] Error → código:', e?.code);
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
    if (!title) return;
    const deadline = this.newDeadline || undefined;
    console.log('[Tarea] Creando →', { title, uid, deadline });
    this.newTitle = '';
    this.newDeadline = '';
    const ref = await this.fs.addTask(title, uid, deadline);
    console.log('[Tarea] Creada con id:', ref.id);
  }

  toggleDone(task: Task) {
    console.log('[Tarea] toggleDone → id:', task.id, '| done:', task.done, '→', !task.done);
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

  /** Devuelve el email del dueño de una tarea usando el mapa de perfiles. */
  getOwnerEmail(uid: string): string {
    return this.userProfiles.get(uid)?.email ?? uid;
  }

  /**
   * Agrupa un array plano de tareas por uid del propietario.
   * Usado en la vista del admin para mostrar secciones por usuario.
   */
  groupByUser(tasks: Task[]): { uid: string; email: string; tasks: Task[] }[] {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!map.has(t.uid)) map.set(t.uid, []);
      map.get(t.uid)!.push(t);
    }
    return Array.from(map.entries()).map(([uid, tasks]) => ({
      uid,
      email: this.getOwnerEmail(uid),
      tasks,
    }));
  }

  trackById(_: number, t: Task) {
    return t.id;
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
