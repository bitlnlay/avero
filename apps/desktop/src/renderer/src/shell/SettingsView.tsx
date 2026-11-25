import { useEffect, useState } from 'react';

import type { AiProviderId, PluginManifest, PublicAppSettings } from '@avero/shared';

import { useI18n } from '../i18n';

/**
 * 可选的界面语言。新增语言时：
 *  1. 在 `@avero/shared` 的 `locales` 登记字典
 *  2. 在下方加一个选项
 *  3. 在字典里补 `settings.language.<locale>` 显示名
 */
const LOCALE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'zh-CN', labelKey: 'settings.language.zhCN' },
];

export function SettingsView(props: {
  settings: PublicAppSettings | null;
  plugins: PluginManifest[];
  onChange: () => Promise<void>;
}) {
  const { settings, plugins, onChange } = props;
  const { t, locale, setLocale } = useI18n();

  const [provider, setProvider] = useState<AiProviderId>('none');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setProvider(settings.ai.provider);
    setModel(settings.ai.model ?? '');
    setBaseUrl(settings.ai.baseUrl ?? '');
    setApiKey('');
  }, [settings]);

  const saveAi = async () => {
    setSaving(true);
    setSaved(false);
    await window.avero.settings.set({
      ai: {
        provider,
        model: model || undefined,
        baseUrl: baseUrl || undefined,
        ...(apiKey ? { apiKey } : {}),
      },
    });
    setApiKey('');
    setSaving(false);
    setSaved(true);
    await onChange();
  };

  const pluginEnabled = (id: string): boolean =>
    !settings?.enabledPlugins || settings.enabledPlugins.includes(id);

  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    const current = settings?.enabledPlugins
      ? new Set(settings.enabledPlugins)
      : new Set(plugins.map((p) => p.id));
    if (enabled) current.add(pluginId);
    else current.delete(pluginId);
    await window.avero.settings.set({ enabledPlugins: [...current] });
    await onChange();
  };

  return (
    <div className="settings">
      <h2>{t('settings.title')}</h2>

      <section className="settings-section">
        <h3>{t('settings.language')}</h3>
        <div className="settings-row">
          <label className="settings-label">{t('settings.language')}</label>
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            {LOCALE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="settings-section">
        <h3>{t('settings.ai.title')}</h3>
        <div className="settings-row">
          <label className="settings-label">{t('settings.ai.provider')}</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value as AiProviderId)}>
            <option value="none">{t('settings.ai.provider.none')}</option>
            <option value="anthropic">{t('settings.ai.provider.anthropic')}</option>
          </select>
        </div>
        <div className="settings-row">
          <label className="settings-label">{t('settings.ai.apiKey')}</label>
          <div className="settings-control">
            <input
              type="password"
              placeholder={
                settings?.ai.hasApiKey
                  ? t('settings.ai.apiKey.placeholderSet')
                  : t('settings.ai.apiKey.placeholderEmpty')
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <span className="settings-hint">
              {settings?.ai.hasApiKey ? t('settings.ai.hasKey') : t('settings.ai.noKeyHint')}
            </span>
          </div>
        </div>
        <div className="settings-row">
          <label className="settings-label">{t('settings.ai.model')}</label>
          <div className="settings-control">
            <input
              placeholder={t('settings.ai.model.placeholder')}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>
        <div className="settings-row">
          <label className="settings-label">{t('settings.ai.baseUrl')}</label>
          <div className="settings-control">
            <input
              placeholder={t('settings.ai.baseUrl.placeholder')}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
        </div>
        <button className="btn primary" onClick={() => void saveAi()} disabled={saving}>
          {saving ? t('settings.ai.saving') : saved ? t('settings.ai.saved') : t('settings.ai.save')}
        </button>
      </section>

      <section className="settings-section">
        <h3>{t('settings.plugins.title')}</h3>
        {plugins.map((p) => (
          <div className="settings-row" key={p.id}>
            <label className="settings-label">
              {t(p.nameKey ?? p.name)}
              <span className="settings-hint">
                {p.id} · v{p.version} · {t(p.descriptionKey ?? p.description)}
              </span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={pluginEnabled(p.id)}
                onChange={(e) => void togglePlugin(p.id, e.target.checked)}
              />
              <span>
                {pluginEnabled(p.id) ? t('settings.plugins.enabled') : t('settings.plugins.disabled')}
              </span>
            </label>
          </div>
        ))}
      </section>
    </div>
  );
}
