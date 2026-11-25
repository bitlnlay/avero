import type {
  AiChatAccepted,
  AiChatRequest,
  AiChunkEvent,
  AiDoneEvent,
  AiErrorEvent,
} from './ipc';
import type { AppInfo, AppSettingsPatch, PublicAppSettings } from './settings';

/**
 * `window.avero` —— preload 通过 contextBridge 暴露给渲染进程的完整 API。
 * 这是插件唯一可触碰的宿主能力面。
 */

export interface StorageApi {
  get(namespace: string, key: string): Promise<unknown>;
  set(namespace: string, key: string, value: unknown): Promise<void>;
  delete(namespace: string, key: string): Promise<void>;
  list(namespace: string): Promise<string[]>;
}

export interface AiApi {
  /** 是否已配置可用的 provider（含 key） */
  configured(): Promise<boolean>;
  chat(request: AiChatRequest): Promise<AiChatAccepted>;
  /** 订阅流式事件；返回取消订阅函数 */
  onChunk(cb: (event: AiChunkEvent) => void): () => void;
  onDone(cb: (event: AiDoneEvent) => void): () => void;
  onError(cb: (event: AiErrorEvent) => void): () => void;
}

export interface SettingsApi {
  get(): Promise<PublicAppSettings>;
  set(patch: AppSettingsPatch): Promise<PublicAppSettings>;
}

export interface AppApi {
  info(): Promise<AppInfo>;
}

export interface AveroBridge {
  storage: StorageApi;
  ai: AiApi;
  settings: SettingsApi;
  app: AppApi;
}
