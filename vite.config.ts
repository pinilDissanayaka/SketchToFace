import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/SketchToFace',
  plugins: [
    tailwindcss(),
  ],
})