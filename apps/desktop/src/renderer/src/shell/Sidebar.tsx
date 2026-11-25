import type { RegisteredPanel } from '../host/registry';
import { useI18n } from '../i18n';

export function Sidebar(props: {
  panels: RegisteredPanel[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const { panels, activeId, onSelect, onOpenSettings } = props;
  const { t } = useI18n();

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">a</span>
        <span>avero</span>
      </div>

      <div className="sidebar-panels">
        {panels.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`sidebar-item ${p.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(p.id)}
            title={t(p.title)}
          >
            <span className="sidebar-icon">{p.icon ?? '•'}</span>
            <span className="sidebar-label">{t(p.title)}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-item ${activeId === 'avero.settings' ? 'active' : ''}`}
          onClick={onOpenSettings}
          title={t('shell.settings')}
        >
          <span className="sidebar-icon">⚙️</span>
          <span className="sidebar-label">{t('shell.settings')}</span>
        </button>
      </div>
    </nav>
  );
}
