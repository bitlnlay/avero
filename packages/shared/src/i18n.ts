/**
 * 轻量 i18n 契约与内置语言包。
 *
 * 所有用户可见文案集中在此（扁平 key，命名空间用 `.` 分隔）。
 * 新增一门语言 = 在 `locales` 里加一个字典文件并在此登记，无需改动业务代码。
 */

export type Locale = string;

/** 扁平 key → 文案模板；模板里可用 `{name}` 占位符 */
export type Messages = Record<string, string>;

export type TranslateParams = Record<string, string | number>;

export type Translator = (key: string, params?: TranslateParams) => string;

export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function createTranslator(messages: Messages): Translator {
  return (key, params) => interpolate(messages[key] ?? key, params);
}

export function translate(
  messages: Messages,
  key: string,
  params?: TranslateParams,
): string {
  return interpolate(messages[key] ?? key, params);
}

export const zhCN: Messages = {
  // 应用外壳
  'shell.settings': '设置',
  'shell.emptyPanels': '没有可用的面板',
  'shell.command.settings': '设置：打开设置',
  'shell.command.settings.desc': '配置 AI 提供商与插件启用状态',
  'shell.palette.placeholder': '输入命令…',
  'shell.palette.empty': '没有匹配的命令',

  // 设置页
  'settings.title': '设置',
  'settings.ai.title': 'AI 提供商',
  'settings.ai.provider': '提供商',
  'settings.ai.provider.none': '未配置',
  'settings.ai.provider.anthropic': 'Anthropic (Claude)',
  'settings.ai.apiKey': 'API Key',
  'settings.ai.apiKey.placeholderSet': '已设置（输入以替换）',
  'settings.ai.apiKey.placeholderEmpty': 'sk-ant-…',
  'settings.ai.hasKey': '✅ 已配置',
  'settings.ai.noKeyHint': '未配置；也可用 ANTHROPIC_API_KEY 环境变量',
  'settings.ai.model': '模型',
  'settings.ai.model.placeholder': 'claude-opus-5-5（默认）',
  'settings.ai.baseUrl': 'Base URL',
  'settings.ai.baseUrl.placeholder': '留空使用官方端点（代理 / 网关可填）',
  'settings.ai.save': '保存 AI 设置',
  'settings.ai.saving': '保存中…',
  'settings.ai.saved': '已保存 ✓',
  'settings.plugins.title': '插件',
  'settings.plugins.enabled': '启用',
  'settings.plugins.disabled': '停用',
  'settings.language': '语言',
  'settings.language.zhCN': '中文 (简体)',

  // 笔记插件
  'notes.name': '笔记',
  'notes.description': 'Markdown 笔记与知识管理：创建、编辑、搜索本地笔记。',
  'notes.new': '＋ 新建笔记',
  'notes.search': '搜索笔记…',
  'notes.untitled': '无标题',
  'notes.empty': '没有笔记',
  'notes.emptySearch': '（换个关键词试试）',
  'notes.saved': '已保存',
  'notes.saving': '保存中…',
  'notes.titlePlaceholder': '标题',
  'notes.contentPlaceholder': '用 Markdown 记录你的想法…',
  'notes.emptyBig': '新建一篇笔记开始记录',
  'notes.delete': '删除',
  'notes.command.open': '笔记：打开知识管理面板',
  'notes.command.open.desc': '切换到 Markdown 笔记工作台',

  // AI 助手插件
  'ai.name': 'AI 助手',
  'ai.description': '可插拔 LLM 提供商的通用助手：写作、研究、问答，流式输出。',
  'ai.notice.title': '尚未配置 AI 提供商。',
  'ai.notice.body': '在设置中填入 Anthropic API Key（或通过环境变量 / ant 登录）后即可使用。',
  'ai.notice.gotoSettings': '前往设置',
  'ai.role.user': '你',
  'ai.role.assistant': 'avero',
  'ai.input.placeholder': '输入消息，Enter 发送，Shift+Enter 换行…',
  'ai.send': '发送',
  'ai.error': '出错了：{message}',
  'ai.error.notConfigured': 'AI 提供商未配置，请在设置中填写 API Key。',
  'ai.command.open': 'AI 助手：打开对话',
  'ai.command.open.desc': '切换到 AI 助手面板',
};

export const DEFAULT_LOCALE: Locale = 'zh-CN';

/** 已登记的语言包；新增语言在此加一行 */
export const locales: Record<Locale, Messages> = {
  'zh-CN': zhCN,
};

export function resolveMessages(locale: Locale): Messages {
  return locales[locale] ?? locales[DEFAULT_LOCALE];
}
