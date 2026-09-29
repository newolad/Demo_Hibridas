import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Importar firebase.config aquí garantiza que initializeApp() se ejecute una sola vez al arrancar.
import './app/config/firebase.config';

bootstrapApplication(AppComponent, {
  providers: [provideIonicAngular(), provideRouter(routes)],
}).catch((err) => console.error(err));
