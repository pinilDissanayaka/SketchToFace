import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  base: '/SketchToFace/',  // <-- add this line
  plugins: [
    tailwindcss(),
    
  ],
})