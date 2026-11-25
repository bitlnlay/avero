import { useEffect, useRef, useState } from 'react';

import { useI18n } from '../i18n';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  run: () => void | Promise<void>;
}

export function CommandPalette(props: {
  commands: CommandItem[];
  onRun: (id: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const { commands, onRun, onClose } = props;
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? commands.filter(
        (c) =>
          t(c.title).toLowerCase().includes(q) ||
          (c.description ? t(c.description).toLowerCase().includes(q) : false),
      )
    : commands;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder={t('shell.palette.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
        <ul className="palette-list">
          {filtered.map((c) => (
            <li key={c.id}>
              <button type="button" className="palette-item" onClick={() => void onRun(c.id)}>
                <span className="palette-title">{t(c.title)}</span>
                {c.description && <span className="palette-desc">{t(c.description)}</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="palette-empty">{t('shell.palette.empty')}</li>}
        </ul>
      </div>
    </div>
  );
}
