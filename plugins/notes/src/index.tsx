import type { PluginDefinition } from '@avero/shared';

import { manifest } from './manifest';
import { NotesPanel } from './NotesPanel';

export const plugin: PluginDefinition = {
  manifest,
  register(ctx) {
    const notes = ctx.storage.namespace('notes');
    const { t } = ctx.i18n;

    ctx.panels.register({
      id: 'avero.notes.panel',
      title: manifest.nameKey ?? manifest.name,
      icon: '📝',
      order: 10,
      component: () => <NotesPanel storage={notes} t={t} />,
    });

    ctx.commands.register({
      id: 'avero.notes.open',
      title: 'notes.command.open',
      description: 'notes.command.open.desc',
      run: () => ctx.shell.navigate('avero.notes.panel'),
    });
  },
};

export { manifest };
export { NotesPanel } from './NotesPanel';
export type { Note } from './NotesPanel';
