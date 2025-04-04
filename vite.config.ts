import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 8080,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 8080,
  }
})
