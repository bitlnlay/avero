import type {
  CommandContribution,
  NamespacedStorage,
  PanelContribution,
  PluginContext,
  PluginDefinition,
  PluginManifest,
  Translator,
} from '@avero/shared';

export interface RegisteredPanel extends PanelContribution {
  pluginId: string;
}

export interface RegisteredCommand extends CommandContribution {
  pluginId: string;
}

/**
 * 渲染进程内的插件注册表：负责插件的生命周期（注册）与能力注入。
 *
 * 插件在 register 时收到一个 PluginContext，其中所有特权能力（存储 / 设置 /
 * AI）都来自 `window.avero`（preload → 主进程 IPC），插件无法直接访问 Node。
 */
export class PluginRegistry {
  readonly plugins: PluginManifest[] = [];
  readonly panels: RegisteredPanel[] = [];
  readonly commands: RegisteredCommand[] = [];

  private navigateFn: ((panelId: string) => void) | null = null;
  private translateFn: Translator | null = null;

  setNavigate(fn: (panelId: string) => void): void {
    this.navigateFn = fn;
  }

  /** 宿主在语言切换时更新翻译函数；插件侧拿到的是稳定委托，随语言实时变化 */
  setTranslate(fn: Translator): void {
    this.translateFn = fn;
  }

  private readonly translate: Translator = (key, params) =>
    this.translateFn ? this.translateFn(key, params) : key;

  register(def: PluginDefinition): void {
    const panels: PanelContribution[] = [];
    const commands: CommandContribution[] = [];

    const ctx: PluginContext = {
      manifest: def.manifest,
      panels: { register: (panel) => panels.push(panel) },
      commands: { register: (command) => commands.push(command) },
      storage: {
        namespace: (name) => this.namespace(def.manifest.id, name),
      },
      shell: {
        navigate: (panelId) => this.navigateFn?.(panelId),
      },
      i18n: {
        t: this.translate,
      },
      ai: window.avero.ai,
      settings: window.avero.settings,
      app: window.avero.app,
    };

    void def.register(ctx);

    this.plugins.push(def.manifest);
    for (const panel of panels) this.panels.push({ ...panel, pluginId: def.manifest.id });
    for (const command of commands) this.commands.push({ ...command, pluginId: def.manifest.id });
  }

  private namespace(pluginId: string, name: string): NamespacedStorage {
    const ns = `${pluginId}.${name}`;
    const storage = window.avero.storage;
    return {
      get: <T>(key: string): Promise<T | undefined> =>
        storage.get(ns, key) as Promise<T | undefined>,
      set: (key, value) => storage.set(ns, key, value),
      delete: (key) => storage.delete(ns, key),
      list: () => storage.list(ns),
    };
  }
}
