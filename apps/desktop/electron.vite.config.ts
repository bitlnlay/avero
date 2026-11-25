import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const shared = resolve(__dirname, '../../packages/shared/src/index.ts');
const notes = resolve(__dirname, '../../plugins/notes/src/index.tsx');
const aiAssist = resolve(__dirname, '../../plugins/ai-assist/src/index.tsx');

export default defineConfig({
  main: {
    // @avero/shared 是 TS 源码、@anthropic-ai/sdk 需要自包含打包，
    // 故将它们从 externalize 中排除（即打包进产物），其余 npm 依赖仍 externalize。
    plugins: [externalizeDepsPlugin({ exclude: ['@avero/shared', '@anthropic-ai/sdk'] })],
    resolve: {
      alias: { '@avero/shared': shared },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@avero/shared'] })],
    resolve: {
      alias: { '@avero/shared': shared },
    },
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@avero/shared': shared,
        '@avero/plugin-notes': notes,
        '@avero/plugin-ai-assist': aiAssist,
      },
    },
  },
});
