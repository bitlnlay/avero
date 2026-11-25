import type { PluginManifest } from '@avero/shared';

import manifestJson from '../plugin.json';

/** 类型化的 manifest，数据源为同目录 plugin.json。 */
export const manifest: PluginManifest = manifestJson as PluginManifest;
