/**
 * MÓDULO 4 – Lógica de la vista. Dos estados según el usuario (AuthService.user$):
 *  Estado 1: sin sesión → formulario de login/registro.
 *  Estado 2: con sesión → usuario conectado + logout + CRUD de tareas en tiempo real.
 */
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCheckbox,
  IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonSpinner,
  IonTitle, IonToolbar, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, logOutOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { FirestoreService, Task } from '../services/firestore.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  imports: [
    AsyncPipe, FormsModule, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader,
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

  /** Usuario global en tiempo real (onAuthStateChanged). */
  user$ = this.auth.user$;

  /** Lista de tareas: se re-suscribe con cada cambio de usuario y se actualiza con onSnapshot. */
  tasks$: Observable<Task[]> = this.auth.user$.pipe(
    switchMap((user) => {
      if (user) {
        console.log('[Auth] Usuario autenticado activo, cargando tareas para uid:', user.uid);
        return this.fs.watchTasks(user.uid);
      }
      console.log('[Auth] Sin sesión activa, lista de tareas vacía.');
      return of([]);
    }),
  );

  constructor() {
    addIcons({ createOutline, logOutOutline, trashOutline });
    console.log('[App] HomePage inicializada.');
  }

  async submitAuth() {
    this.errorMsg = '';
    this.loading = true;
    console.log(`[Auth] Intento de ${this.isRegisterMode ? 'registro' : 'login'} con correo:`, this.email);
    try {
      if (this.isRegisterMode) {
        const cred = await this.auth.register(this.email, this.password);
        console.log('[Auth] Registro exitoso → uid:', cred.user.uid, '| email:', cred.user.email);
      } else {
        const cred = await this.auth.login(this.email, this.password);
        console.log('[Auth] Login exitoso → uid:', cred.user.uid, '| email:', cred.user.email);
      }
      this.password = '';
    } catch (e: any) {
      console.warn('[Auth] Error en autenticación → código:', e?.code, '| mensaje:', e?.message);
      this.errorMsg = this.translateError(e?.code);
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMsg = '';
    console.log('[Auth] Modo cambiado a:', this.isRegisterMode ? 'Registro' : 'Login');
  }

  logout() {
    console.log('[Auth] Cerrando sesión...');
    return this.auth.logout().then(() => console.log('[Auth] Sesión cerrada correctamente.'));
  }

  async addTask(uid: string) {
    const title = this.newTitle.trim();
    if (!title) {
      console.warn('[Tarea] addTask cancelado: el título está vacío.');
      return;
    }
    const deadline = this.newDeadline || undefined;
    console.log('[Tarea] Creando tarea →', { title, uid, deadline });
    this.newTitle = '';
    this.newDeadline = '';
    const ref = await this.fs.addTask(title, uid, deadline);
    console.log('[Tarea] Tarea creada en Firestore con id:', ref.id);
  }

  toggleDone(task: Task) {
    const nuevoEstado = !task.done;
    console.log('[Tarea] toggleDone → id:', task.id, '| done:', task.done, '→', nuevoEstado);
    return this.fs.updateTask(task.id!, { done: nuevoEstado });
  }

  async editTask(task: Task) {
    console.log('[Tarea] Abriendo editor para tarea id:', task.id, '| título actual:', task.title);
    const alert = await this.alertCtrl.create({
      header: 'Editar tarea',
      inputs: [{ name: 'title', type: 'text', value: task.title }],
      buttons: [
        { text: 'Cancelar', role: 'cancel', handler: () => console.log('[Tarea] Edición cancelada.') },
        {
          text: 'Guardar',
          handler: (d) => {
            const title = (d.title ?? '').trim();
            if (title) {
              console.log('[Tarea] Guardando edición → id:', task.id, '| nuevo título:', title);
              this.fs.updateTask(task.id!, { title });
            } else {
              console.warn('[Tarea] Edición ignorada: título vacío.');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  deleteTask(task: Task) {
    console.log('[Tarea] Eliminando tarea → id:', task.id, '| título:', task.title);
    return this.fs.deleteTask(task.id!);
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
