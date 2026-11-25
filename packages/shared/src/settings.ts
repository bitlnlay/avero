/**
 * 全局设置。
 *
 * 安全约定：`AppSettings`（含 `apiKey`）只存在于主进程，永不通过 IPC 下发；
 * 渲染进程拿到的是 `PublicAppSettings`，其中只有 `hasApiKey` 布尔值。
 */

export type AiProviderId = 'none' | 'anthropic';

/** 主进程内部持有（含敏感字段） */
export interface AiSettings {
  provider: AiProviderId;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AppSettings {
  /** 已启用的插件 id 列表；缺省即全部启用 */
  enabledPlugins?: string[];
  /** 界面语言（i18n locale），缺省 zh-CN */
  locale?: string;
  ai: AiSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    provider: 'none',
  },
};

/** 下发给渲染进程的公开设置（无敏感字段） */
export interface PublicAiSettings {
  provider: AiProviderId;
  model?: string;
  baseUrl?: string;
  /** 是否已配置 API Key（Key 本身永不返回） */
  hasApiKey: boolean;
}

export interface PublicAppSettings {
  enabledPlugins?: string[];
  locale?: string;
  ai: PublicAiSettings;
}

/** 渲染进程 → 主进程 的设置更新。`apiKey` 为只写字段（用于设置新 Key）。 */
export interface AppSettingsPatch {
  enabledPlugins?: string[];
  locale?: string;
  ai?: {
    provider?: AiProviderId;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
  };
}

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  arch: string;
}
