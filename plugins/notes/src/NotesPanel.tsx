import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { NamespacedStorage, Translator } from '@avero/shared';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const KEY_PREFIX = 'doc:';

function noteKey(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyNote(): Note {
  const now = Date.now();
  return { id: newId(), title: '', content: '', createdAt: now, updatedAt: now };
}

export function NotesPanel({ storage, t }: { storage: NamespacedStorage; t: Translator }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const keys = (await storage.list()).filter((k) => k.startsWith(KEY_PREFIX));
    const items = (await Promise.all(keys.map((k) => storage.get<Note>(k)))).filter(
      (n): n is Note => n != null,
    );
    items.sort((a, b) => a.createdAt - b.createdAt);
    setNotes(items);
    setActiveId((prev) => prev ?? items[0]?.id ?? null);
  }, [storage]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const persist = useCallback(
    (note: Note) => {
      void storage.set(noteKey(note.id), note);
    },
    [storage],
  );

  const scheduleSave = useCallback(
    (note: Note) => {
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        persist(note);
        setDirty(false);
      }, 400);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const createNote = useCallback(async () => {
    const note = emptyNote();
    await storage.set(noteKey(note.id), note);
    setNotes((prev) => [...prev, note]);
    setActiveId(note.id);
  }, [storage]);

  const deleteNote = useCallback(
    async (id: string) => {
      await storage.delete(noteKey(id));
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      setActiveId((prev) => (prev === id ? remaining[0]?.id ?? null : prev));
    },
    [storage, notes],
  );

  const update = useCallback(
    (patch: Partial<Note>) => {
      if (!active) return;
      const next = { ...active, ...patch, updatedAt: Date.now() };
      setNotes((prev) => prev.map((n) => (n.id === next.id ? next : n)));
      scheduleSave(next);
    },
    [active, scheduleSave],
  );

  return (
    <div className="notes-panel">
      <aside className="notes-sidebar">
        <div className="notes-toolbar">
          <button className="btn primary" onClick={createNote}>
            {t('notes.new')}
          </button>
          <input
            className="input"
            placeholder={t('notes.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="notes-list">
          {visible.map((n) => (
            <li
              key={n.id}
              className={n.id === activeId ? 'notes-item active' : 'notes-item'}
              onClick={() => setActiveId(n.id)}
            >
              <span className="notes-item-title">
                {n.title.trim() || t('notes.untitled')}
              </span>
              <button
                className="notes-item-delete"
                title={t('notes.delete')}
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteNote(n.id);
                }}
              >
                ✕
              </button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="notes-empty">
              {query ? `${t('notes.empty')}${t('notes.emptySearch')}` : t('notes.empty')}
            </li>
          )}
        </ul>
      </aside>

      <section className="notes-editor">
        {active ? (
          <>
            <div className="notes-editor-head">
              <input
                className="input notes-title-input"
                placeholder={t('notes.titlePlaceholder')}
                value={active.title}
                onChange={(e) => update({ title: e.target.value })}
              />
              <span className="notes-save-state">
                {dirty ? t('notes.saving') : t('notes.saved')}
              </span>
            </div>
            <textarea
              className="notes-content"
              placeholder={t('notes.contentPlaceholder')}
              value={active.content}
              onChange={(e) => update({ content: e.target.value })}
            />
          </>
        ) : (
          <div className="notes-empty-big">{t('notes.emptyBig')}</div>
        )}
      </section>
    </div>
  );
}
