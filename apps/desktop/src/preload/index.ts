import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

import type {
  AiChatRequest,
  AiChunkEvent,
  AiDoneEvent,
  AiErrorEvent,
  AppSettingsPatch,
  AveroBridge,
} from '@avero/shared';
import { AI_EVENTS, IPC } from '@avero/shared';

/**
 * contextBridge 暴露 `window.avero`，是渲染进程（含插件）唯一的能力入口。
 * 保持类型化，主进程按需返回，永不把敏感字段（如 API Key）下发。
 */
const bridge: AveroBridge = {
  storage: {
    get: (namespace, key) => ipcRenderer.invoke(IPC.storageGet, namespace, key),
    set: (namespace, key, value) => ipcRenderer.invoke(IPC.storageSet, namespace, key, value),
    delete: (namespace, key) => ipcRenderer.invoke(IPC.storageDelete, namespace, key),
    list: (namespace) => ipcRenderer.invoke(IPC.storageList, namespace),
  },
  ai: {
    configured: () => ipcRenderer.invoke(IPC.aiConfigured),
    chat: (request: AiChatRequest) => ipcRenderer.invoke(IPC.aiChat, request),
    onChunk: (cb) => {
      const handler = (_event: IpcRendererEvent, event: AiChunkEvent) => cb(event);
      ipcRenderer.on(AI_EVENTS.chunk, handler);
      return () => ipcRenderer.removeListener(AI_EVENTS.chunk, handler);
    },
    onDone: (cb) => {
      const handler = (_event: IpcRendererEvent, event: AiDoneEvent) => cb(event);
      ipcRenderer.on(AI_EVENTS.done, handler);
      return () => ipcRenderer.removeListener(AI_EVENTS.done, handler);
    },
    onError: (cb) => {
      const handler = (_event: IpcRendererEvent, event: AiErrorEvent) => cb(event);
      ipcRenderer.on(AI_EVENTS.error, handler);
      return () => ipcRenderer.removeListener(AI_EVENTS.error, handler);
    },
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    set: (patch: AppSettingsPatch) => ipcRenderer.invoke(IPC.settingsSet, patch),
  },
  app: {
    info: () => ipcRenderer.invoke(IPC.appInfo),
  },
};

contextBridge.exposeInMainWorld('avero', bridge);
