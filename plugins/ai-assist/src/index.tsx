import type { PluginDefinition } from '@avero/shared';

import { manifest } from './manifest';
import { AiAssistPanel } from './AiAssistPanel';

export const plugin: PluginDefinition = {
  manifest,
  register(ctx) {
    const { t } = ctx.i18n;

    ctx.panels.register({
      id: 'avero.ai-assist.panel',
      title: manifest.nameKey ?? manifest.name,
      icon: '✨',
      order: 5,
      component: () => <AiAssistPanel ai={ctx.ai} shell={ctx.shell} t={t} />,
    });

    ctx.commands.register({
      id: 'avero.ai-assist.open',
      title: 'ai.command.open',
      description: 'ai.command.open.desc',
      run: () => ctx.shell.navigate('avero.ai-assist.panel'),
    });
  },
};

export { manifest };
export { AiAssistPanel } from './AiAssistPanel';
