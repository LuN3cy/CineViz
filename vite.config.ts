import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const host = process.env.TAURI_DEV_HOST;

    return {
      clearScreen: false,
      server: {
        port: 3000,
        host: host || '0.0.0.0',
        strictPort: true,
        hmr: host ? {
          protocol: 'ws',
          host,
          port: 1421,
        } : undefined,
      },
      envPrefix: ['VITE_', 'TAURI_'],
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
