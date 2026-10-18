import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/sudoku/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Sudoku',
        short_name: 'Sudoku',
        description: 'Offline sudoku with fresh random puzzles',
        theme_color: '#1b2a4a',
        background_color: '#0f1729',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
