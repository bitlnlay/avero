import { useCallback, useEffect, useRef, useState } from 'react';

import type { AiMessage, PluginContext, Translator } from '@avero/shared';
import { AI_ERROR_CODES } from '@avero/shared';

type AiApi = PluginContext['ai'];
type Shell = PluginContext['shell'];

const SYSTEM_PROMPT =
  '你是 avero 工作空间内置的 AI 助手，帮助用户进行写作、研究、问答与知识整理。回答使用与用户相同的语言，简洁、准确、可执行。';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AiAssistPanel({
  ai,
  shell,
  t,
}: {
  ai: AiApi;
  shell: Shell;
  t: Translator;
}) {
  const [configured, setConfigured] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(
    null,
  );

  const streamIdRef = useRef<string | null>(null);
  const streamingRef = useRef('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ai.configured().then((ok) => {
      if (!cancelled) setConfigured(ok);
    });

    const offChunk = ai.onChunk((e) => {
      if (e.streamId !== streamIdRef.current) return;
      streamingRef.current += e.delta;
      setStreaming(streamingRef.current);
    });
    const offDone = ai.onDone((e) => {
      if (e.streamId !== streamIdRef.current) return;
      setMessages((prev) => [...prev, { role: 'assistant', content: streamingRef.current }]);
      setStreaming('');
      streamingRef.current = '';
      streamIdRef.current = null;
      setBusy(false);
      setProviderInfo({ provider: e.provider, model: e.model });
    });
    const offError = ai.onError((e) => {
      if (e.streamId !== streamIdRef.current) return;
      setError(e.error);
      setStreaming('');
      streamIdRef.current = null;
      setBusy(false);
    });

    return () => {
      cancelled = true;
      offChunk();
      offDone();
      offError();
    };
  }, [ai]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const history: AiMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setError(null);
    setBusy(true);
    setStreaming('');
    streamingRef.current = '';

    try {
      const { streamId } = await ai.chat({ messages: history, system: SYSTEM_PROMPT });
      streamIdRef.current = streamId;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }, [ai, input, messages, busy]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  return (
    <div className="ai-panel">
      <div className="ai-messages">
        {!configured && (
          <div className="ai-notice">
            <p>
              <strong>{t('ai.notice.title')}</strong>
            </p>
            <p>{t('ai.notice.body')}</p>
            <button className="btn primary" onClick={() => shell.navigate('avero.settings')}>
              {t('ai.notice.gotoSettings')}
            </button>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`ai-bubble ${m.role}`}>
            <div className="ai-bubble-role">
              {m.role === 'user' ? t('ai.role.user') : t('ai.role.assistant')}
            </div>
            <div className="ai-bubble-text">{m.content}</div>
          </div>
        ))}

        {(streaming || busy) && (
          <div className="ai-bubble assistant">
            <div className="ai-bubble-role">{t('ai.role.assistant')}</div>
            <div className="ai-bubble-text">
              {streaming || <span className="ai-cursor">▍</span>}
            </div>
          </div>
        )}

        {error && (
          <div className="ai-error">
            {error === AI_ERROR_CODES.notConfigured
              ? t('ai.error.notConfigured')
              : t('ai.error', { message: error })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="ai-inputbar">
        {providerInfo && (
          <span className="ai-model-tag">
            {providerInfo.provider} · {providerInfo.model}
          </span>
        )}
        <textarea
          className="ai-input"
          placeholder={t('ai.input.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!configured || busy}
          rows={3}
        />
        <button
          className="btn primary ai-send"
          onClick={() => void send()}
          disabled={!configured || busy || !input.trim()}
        >
          {t('ai.send')}
        </button>
      </div>
    </div>
  );
}
