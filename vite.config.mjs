import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Garante caminhos relativos para o Electron carregar os assets corretamente
  server: {
    port: 3000, // Mantém a porta 3000 para compatibilidade com o main.js existente
  },
  build: {
    outDir: 'build', // Define a pasta de saída como 'build' para compatibilidade com o main.js existente
    emptyOutDir: true,
  }
})