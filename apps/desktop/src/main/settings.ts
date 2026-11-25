import { promises as fs } from 'node:fs';
import path from 'node:path';

import type {
  AppSettings,
  AppSettingsPatch,
  PublicAppSettings,
} from '@avero/shared';
import { DEFAULT_SETTINGS } from '@avero/shared';

/**
 * 全局设置服务。持有含 `apiKey` 的内部 AppSettings，对外只暴露
 * `PublicAppSettings`（通过 toPublic 抹掉敏感字段）。
 */
export class SettingsService {
  private current: AppSettings = structuredClone(DEFAULT_SETTINGS);
  private loaded = false;

  constructor(private readonly file: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      this.current = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        ai: { ...DEFAULT_SETTINGS.ai, ...(parsed.ai ?? {}) },
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') console.warn('[settings] 读取设置失败:', err);
    }
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.current, null, 2), 'utf8');
  }

  async get(): Promise<AppSettings> {
    await this.ensureLoaded();
    return structuredClone(this.current);
  }

  async patch(patch: AppSettingsPatch): Promise<AppSettings> {
    await this.ensureLoaded();
    if (patch.enabledPlugins !== undefined) {
      this.current.enabledPlugins = patch.enabledPlugins;
    }
    if (patch.locale !== undefined) {
      this.current.locale = patch.locale;
    }
    if (patch.ai) {
      const ai = patch.ai;
      if (ai.provider !== undefined) this.current.ai.provider = ai.provider;
      if (ai.model !== undefined) this.current.ai.model = ai.model || undefined;
      if (ai.baseUrl !== undefined) this.current.ai.baseUrl = ai.baseUrl || undefined;
      if (ai.apiKey !== undefined) this.current.ai.apiKey = ai.apiKey || undefined;
    }
    await this.persist();
    return structuredClone(this.current);
  }

  toPublic(s: AppSettings): PublicAppSettings {
    return {
      enabledPlugins: s.enabledPlugins,
      locale: s.locale,
      ai: {
        provider: s.ai.provider,
        model: s.ai.model,
        baseUrl: s.ai.baseUrl,
        hasApiKey: Boolean(s.ai.apiKey),
      },
    };
  }
}
