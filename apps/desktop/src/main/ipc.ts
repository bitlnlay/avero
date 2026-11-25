import { randomUUID } from 'node:crypto';

import { app, ipcMain } from 'electron';

import type { AiChatRequest, AppSettingsPatch } from '@avero/shared';
import { AI_ERROR_CODES, AI_EVENTS, IPC } from '@avero/shared';

import { anthropicProvider } from './ai/anthropic';
import type { AiProvider } from './ai/provider';
import type { SettingsService } from './settings';
import type { JsonStorage } from './storage';

/**
 * 装配全部 IPC 处理器。
 *
 * 这是插件的特权能力边界：渲染进程 / 插件只能通过 `window.avero`（preload）
 * 触达这里定义的有限能力，无法直接访问 Node / 文件系统。
 */
export function registerIpc(opts: {
  storage: JsonStorage;
  settings: SettingsService;
}): void {
  const { storage, settings } = opts;
  const providers: Record<string, AiProvider> = { anthropic: anthropicProvider };

  ipcMain.handle(IPC.storageGet, (_event, namespace: string, key: string) =>
    storage.get(namespace, key),
  );
  ipcMain.handle(IPC.storageSet, (_event, namespace: string, key: string, value: unknown) =>
    storage.set(namespace, key, value),
  );
  ipcMain.handle(IPC.storageDelete, (_event, namespace: string, key: string) =>
    storage.delete(namespace, key),
  );
  ipcMain.handle(IPC.storageList, (_event, namespace: string) => storage.list(namespace));

  ipcMain.handle(IPC.settingsGet, async () => settings.toPublic(await settings.get()));
  ipcMain.handle(IPC.settingsSet, async (_event, patch: AppSettingsPatch) =>
    settings.toPublic(await settings.patch(patch)),
  );

  ipcMain.handle(IPC.appInfo, () => ({
    name: 'avero',
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  }));

  ipcMain.handle(IPC.aiConfigured, async () => {
    const s = await settings.get();
    const provider = providers[s.ai.provider];
    return provider ? provider.isConfigured(s.ai) : false;
  });

  ipcMain.handle(IPC.aiChat, async (event, request: AiChatRequest) => {
    const s = await settings.get();
    const provider = providers[s.ai.provider];
    const streamId = randomUUID();
    const sender = event.sender;

    if (!provider || !provider.isConfigured(s.ai)) {
      setTimeout(() => {
        sender.send(AI_EVENTS.error, {
          streamId,
          error: AI_ERROR_CODES.notConfigured,
        });
      }, 0);
      return { streamId };
    }

    void (async () => {
      try {
        const result = await provider.chat(request, s.ai, (delta) => {
          sender.send(AI_EVENTS.chunk, { streamId, delta });
        });
        sender.send(AI_EVENTS.done, {
          streamId,
          message: result.message,
          provider: provider.id,
          model: result.model,
        });
      } catch (err) {
        sender.send(AI_EVENTS.error, {
          streamId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return { streamId };
  });
}
