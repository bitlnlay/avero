import Anthropic from '@anthropic-ai/sdk';

import type { AiProvider, AiChatResult } from './provider';

const DEFAULT_MODEL = 'claude-opus-5-5';
const DEFAULT_MAX_TOKENS = 16384;

/**
 * Anthropic Claude 提供商（使用官方 @anthropic-ai/sdk）。
 *
 * - 模型默认 claude-opus-5-5，可在设置中覆盖。
 * - 流式输出，增量通过 onDelta 回传。
 * - API Key 优先取设置项；缺省时回落到环境变量 / `ant auth login` 配置文件。
 */
export const anthropicProvider: AiProvider = {
  id: 'anthropic',

  isConfigured(config) {
    return Boolean(
      config.apiKey ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.ANTHROPIC_AUTH_TOKEN,
    );
  },

  async chat(request, config, onDelta): Promise<AiChatResult> {
    const client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    const model = config.model || request.model || DEFAULT_MODEL;
    const stream = client.messages.stream({
      model,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: request.system,
      messages: request.messages,
    });

    let accumulated = '';
    stream.on('text', (delta) => {
      accumulated += delta;
      onDelta(delta);
    });

    const final = await stream.finalMessage();
    const text = final.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    return {
      message: { role: 'assistant', content: text || accumulated },
      model,
    };
  },
};
