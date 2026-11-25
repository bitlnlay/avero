import type { AiChatRequest, AiMessage } from '@avero/shared';

/**
 * 可插拔 LLM 提供商接口。
 *
 * 新增提供商（OpenAI、本地模型等）只需实现此接口并注册到 ipc.ts 的
 * providers 表，无需改动插件或渲染层。
 */
export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AiChatResult {
  message: AiMessage;
  /** 本次实际使用的模型 id */
  model: string;
}

export interface AiProvider {
  id: string;
  isConfigured(config: ProviderConfig): boolean;
  chat(
    request: AiChatRequest,
    config: ProviderConfig,
    onDelta: (delta: string) => void,
  ): Promise<AiChatResult>;
}
