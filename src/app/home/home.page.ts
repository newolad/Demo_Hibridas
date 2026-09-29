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

  newTitle = '';

  /** Usuario global en tiempo real (onAuthStateChanged). */
  user$ = this.auth.user$;

  /** Lista de tareas: se re-suscribe con cada cambio de usuario y se actualiza con onSnapshot. */
  tasks$: Observable<Task[]> = this.auth.user$.pipe(
    switchMap((user) => (user ? this.fs.watchTasks(user.uid) : of([]))),
  );

  constructor() {
    addIcons({ createOutline, logOutOutline, trashOutline });
  }

  async submitAuth() {
    this.errorMsg = '';
    this.loading = true;
    try {
      if (this.isRegisterMode) await this.auth.register(this.email, this.password);
      else await this.auth.login(this.email, this.password);
      this.password = '';
    } catch (e: any) {
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
    return this.auth.logout();
  }

  async addTask(uid: string) {
    const title = this.newTitle.trim();
    if (!title) return;
    this.newTitle = '';
    await this.fs.addTask(title, uid);
  }

  toggleDone(task: Task) {
    return this.fs.updateTask(task.id!, { done: !task.done });
  }

  async editTask(task: Task) {
    const alert = await this.alertCtrl.create({
      header: 'Editar tarea',
      inputs: [{ name: 'title', type: 'text', value: task.title }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (d) => {
            const title = (d.title ?? '').trim();
            if (title) this.fs.updateTask(task.id!, { title });
          },
        },
      ],
    });
    await alert.present();
  }

  deleteTask(task: Task) {
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
