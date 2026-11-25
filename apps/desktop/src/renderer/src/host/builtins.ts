import type { PluginDefinition } from '@avero/shared';

import { plugin as aiAssist } from '@avero/plugin-ai-assist';
import { plugin as notes } from '@avero/plugin-notes';

/**
 * 内置插件清单。这些插件与宿主一起打包，通过同一个 PluginRegistry 注册，
 * 以“吃自己的狗粮”的方式验证插件 API。第三方插件加载是后续扩展点。
 */
export const builtinPlugins: PluginDefinition[] = [aiAssist, notes];
