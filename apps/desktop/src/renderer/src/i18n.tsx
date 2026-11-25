import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { Translator } from '@avero/shared';

export interface I18nValue {
  t: Translator;
  locale: string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ value, children }: { value: I18nValue; children: ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n 必须在 I18nProvider 内使用');
  return ctx;
}
