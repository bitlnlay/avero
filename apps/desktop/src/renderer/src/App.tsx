import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PublicAppSettings } from '@avero/shared';
import { createTranslator, DEFAULT_LOCALE, resolveMessages } from '@avero/shared';

import { builtinPlugins } from './host/builtins';
import { PluginRegistry } from './host/registry';
import { I18nProvider } from './i18n';
import { CommandPalette } from './shell/CommandPalette';
import type { CommandItem } from './shell/CommandPalette';
import { SettingsView } from './shell/SettingsView';
import { Sidebar } from './shell/Sidebar';
import { StatusBar } from './shell/StatusBar';

export const SETTINGS_PANEL_ID = 'avero.settings';

export function App() {
  const [activePanelId, setActivePanelId] = useState<string>('avero.ai-assist.panel');
  const [settings, setSettings] = useState<PublicAppSettings | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 注册表只初始化一次；navigate / translate 通过闭包回调宿主状态
  const registryRef = useRef<PluginRegistry | null>(null);
  if (registryRef.current === null) {
    const registry = new PluginRegistry();
    registry.setNavigate((id) => setActivePanelId(id));
    for (const def of builtinPlugins) registry.register(def);
    registryRef.current = registry;
  }
  const registry = registryRef.current;

  useEffect(() => {
    void window.avero.settings.get().then(setSettings);
  }, []);

  const locale = settings?.locale ?? DEFAULT_LOCALE;
  const t = useMemo(() => createTranslator(resolveMessages(locale)), [locale]);
  // 语言切换时，让插件侧的翻译委托实时跟随
  registry.setTranslate(t);

  const setLocale = useCallback(async (next: string) => {
    setSettings(await window.avero.settings.set({ locale: next }));
  }, []);

  const refreshSettings = useCallback(async () => {
    setSettings(await window.avero.settings.get());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const enabledSet = settings?.enabledPlugins ? new Set(settings.enabledPlugins) : null;
  const isEnabled = useCallback(
    (pluginId: string) => enabledSet === null || enabledSet.has(pluginId),
    [enabledSet],
  );

  const visiblePanels = useMemo(
    () =>
      registry.panels
        .filter((p) => isEnabled(p.pluginId))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [registry, isEnabled],
  );

  const showSettings = activePanelId === SETTINGS_PANEL_ID;
  const activePanel = showSettings
    ? null
    : visiblePanels.find((p) => p.id === activePanelId) ?? visiblePanels[0] ?? null;

  const commands = useMemo<CommandItem[]>(() => {
    const pluginCommands = registry.commands.filter((c) => isEnabled(c.pluginId));
    return [
      ...pluginCommands,
      {
        id: 'avero.shell.open-settings',
        title: 'shell.command.settings',
        description: 'shell.command.settings.desc',
        run: () => setActivePanelId(SETTINGS_PANEL_ID),
      },
    ];
  }, [registry, isEnabled]);

  const runCommand = useCallback(
    async (commandId: string) => {
      const command = commands.find((c) => c.id === commandId);
      if (!command) return;
      await command.run();
      setPaletteOpen(false);
    },
    [commands],
  );

  const activeTitle = showSettings
    ? t('shell.settings')
    : activePanel
      ? t(activePanel.title)
      : 'avero';

  return (
    <I18nProvider value={{ t, locale, setLocale }}>
      <div className="app-shell">
        <Sidebar
          panels={visiblePanels}
          activeId={showSettings ? SETTINGS_PANEL_ID : activePanel?.id ?? null}
          onSelect={setActivePanelId}
          onOpenSettings={() => setActivePanelId(SETTINGS_PANEL_ID)}
        />

        <main className="app-main">
          {showSettings ? (
            <SettingsView
              settings={settings}
              plugins={registry.plugins}
              onChange={refreshSettings}
            />
          ) : activePanel ? (
            <activePanel.component />
          ) : (
            <div className="app-empty">{t('shell.emptyPanels')}</div>
          )}
        </main>

        {paletteOpen && (
          <CommandPalette
            commands={commands}
            onRun={runCommand}
            onClose={() => setPaletteOpen(false)}
          />
        )}

        <StatusBar activePanelTitle={activeTitle} />
      </div>
    </I18nProvider>
  );
}
