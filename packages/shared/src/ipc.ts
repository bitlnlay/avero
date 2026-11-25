/**
 * IPC 协议契约 —— 这是 avero 插件的能力边界。
 *
 * 所有特权操作（存储、设置、AI 调用）都由渲染进程通过 preload 暴露的
 * `window.avero`（AveroBridge）发起，最终在主进程执行。插件本身运行在
 * 渲染进程沙箱中，无法直接访问 Node / 文件系统。
 *
 * 通道名称统一集中在此处，避免字符串散落各处。
 */

export const IPC = {
  storageGet: 'storage:get',
  storageSet: 'storage:set',
  storageDelete: 'storage:delete',
  storageList: 'storage:list',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  aiChat: 'ai:chat',
  aiConfigured: 'ai:configured',
  appInfo: 'app:info',
} as const;

/** 主进程 → 渲染进程 的流式事件通道 */
export const AI_EVENTS = {
  chunk: 'ai:chunk',
  done: 'ai:done',
  error: 'ai:error',
} as const;

/**
 * 主进程下发的结构化错误码（随 `AiErrorEvent.error` 传递）。
 * 渲染层据错误码做本地化，避免主进程硬编码语言。
 */
export const AI_ERROR_CODES = {
  /** 提供商未配置（无 key 等） */
  notConfigured: 'AI_NOT_CONFIGURED',
} as const;

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  /** 完整对话历史（user / assistant 交替） */
  messages: AiMessage[];
  /** 可选系统提示词；缺省使用宿主默认 */
  system?: string;
  model?: string;
}

export interface AiChatAccepted {
  /** 流式响应的唯一标识，用于关联后续事件 */
  streamId: string;
}

export interface AiChunkEvent {
  streamId: string;
  delta: string;
}

export interface AiDoneEvent {
  streamId: string;
  message: AiMessage;
  /** 本次实际使用的 provider / model，便于回显 */
  provider: string;
  model: string;
}

export interface AiErrorEvent {
  streamId: string;
  error: string;
}

export type StreamId = string;
