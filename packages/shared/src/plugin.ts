import type { ComponentType } from 'react';

import type { AiApi } from './bridge';
import type { SettingsApi } from './bridge';
import type { AppApi } from './bridge';
import type { Translator } from './i18n';

/**
 * 插件系统契约。
 *
 * 一个插件 = 一份 `manifest`（元数据与能力声明）+ 一个 `register` 函数。
 * `register` 收到宿主注入的 `PluginContext`，用来登记面板、命令与访问
 * 受限能力（存储 / 设置 / AI）。插件不应直接 import electron 或 node 模块。
 */

export interface PanelContribution {
  /** 全局唯一 id，形如 `<pluginId>.<panelId>` */
  id: string;
  /** 显示标题：可直接给文案，也可给 i18n key（宿主会经 t() 解析；未命中则原样显示） */
  title: string;
  /** 侧边栏图标（emoji 或单字，v1 简化） */
  icon?: string;
  /** 侧边栏排序，越小越靠前 */
  order?: number;
  /** 面板主体组件，由宿主渲染 */
  component: ComponentType;
}

export interface CommandContribution {
  id: string;
  /** 命令标题：可直接给文案，也可给 i18n key */
  title: string;
  /** 简短的描述，用于命令面板提示（同样支持 i18n key） */
  description?: string;
  run: () => void | Promise<void>;
}

export interface PluginManifest {
  id: string;
  /** 人类可读名称（回退用） */
  name: string;
  version: string;
  description: string;
  author?: string;
  /** 名称对应的 i18n key（缺省回落到 name） */
  nameKey?: string;
  /** 描述对应的 i18n key（缺省回落到 description） */
  descriptionKey?: string;
}

export interface NamespacedStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  /** 该命名空间下所有 key */
  list(): Promise<string[]>;
}

/** 宿主在 register 时注入给插件的能力集合 */
export interface PluginContext {
  manifest: PluginManifest;
  panels: {
    register(panel: PanelContribution): void;
  };
  commands: {
    register(command: CommandContribution): void;
  };
  storage: {
    /** 获得一个按插件 id 隔离的命名空间 */
    namespace(name: string): NamespacedStorage;
  };
  shell: {
    /** 切换到指定面板（面板由本插件或其他插件贡献） */
    navigate(panelId: string): void;
  };
  i18n: {
    /** 翻译函数，随宿主语言实时切换 */
    t: Translator;
  };
  ai: AiApi;
  settings: SettingsApi;
  app: AppApi;
}

export interface PluginDefinition {
  manifest: PluginManifest;
  register: (ctx: PluginContext) => void | Promise<void>;
}
