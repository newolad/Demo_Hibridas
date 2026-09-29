import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.demo.gestortareas', // Debe coincidir con el package name registrado en Firebase (Android) / Bundle ID (iOS)
  appName: 'Gestor de Tareas',
  webDir: 'www',
};

export default config;
