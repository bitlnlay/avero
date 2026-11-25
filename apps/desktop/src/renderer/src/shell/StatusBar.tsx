import { useEffect, useState } from 'react';

import type { AppInfo } from '@avero/shared';

export function StatusBar({ activePanelTitle }: { activePanelTitle: string }) {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    void window.avero.app.info().then(setInfo);
  }, []);

  return (
    <footer className="statusbar">
      <span className="statusbar-panel">{activePanelTitle}</span>
      <span className="statusbar-spacer" />
      {info && (
        <span className="statusbar-info">
          {info.name} {info.version} · {info.platform} / {info.arch}
        </span>
      )}
    </footer>
  );
}
