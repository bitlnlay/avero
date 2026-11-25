# avero

**综合型 AI 工作空间** —— 不局限于内容创作，为知识管理、研究、自动化与商业化留好扩展位。跨平台桌面应用，可安装于 Windows、Linux、macOS。

> v0.0.1 当前交付的是「可扩展架构 + 可运行核心工作台」：应用外壳、插件系统，以及两个能真正跑起来的插件（笔记 / AI 助手）。其余领域是设计好的扩展点，见 [路线图](#路线图)。

## 快速开始

前置：Node.js ≥ 22.12（当前在 22.20 验证）。

```bash
npm install        # 安装依赖（electron 走 npmmirror 镜像）
npm run dev        # 开发模式（HMR）
npm run build      # 构建（electron-vite）
npm run typecheck  # 全仓类型检查
npm run smoke      # 无头端到端冒烟测试（无显示环境用 xvfb-run 包裹）
npm run dist       # 打包当前平台安装包（electron-builder）
```

> 首次 `npm install` 会下载约 100MB 的 Electron 二进制（国内可配 npmmirror 镜像，`.npmrc` 已 gitignore，不入库）。
> Linux 无显示环境下运行冒烟测试：`xvfb-run -a npm run smoke`。

## 架构

```
┌─────────────────────────── 渲染进程（Chromium 沙箱） ───────────────────────────┐
│  应用外壳（Sidebar / 设置 / 命令面板 / 状态栏）                                  │
│  PluginRegistry（manifest + 生命周期 + 能力注入）                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐                       │
│  │ 笔记插件      │  │ AI 助手插件   │  │ 未来的研究/自动化/商业化插件…            │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘                       │
│         │   window.avero（类型化 IPC，插件唯一能力入口）  │                        │
└─────────┼─────────────────┼────────────────────┼──────────────────────────────┘
          │   contextBridge / ipcRenderer          │
┌─────────┴─────────────────┴────────────────────┴──────────────────────────────┐
│  主进程（特权，唯一能访问 Node / 文件系统 / API Key）                             │
│  storage（JSON 命名空间存储） · settings（含密钥，永不下发） · AI providers      │
└────────────────────────────────────────────────────────────────────────────────┘
```

三条核心原则：

1. **插件跑在渲染进程沙箱里**，无法直接访问 Node。所有特权能力（存储 / 设置 / AI）都必须经 `window.avero`（preload → 主进程 IPC）。**IPC 面就是插件的能力边界。**
2. **API Key 只存在于主进程**。渲染进程拿到的设置里只有 `hasApiKey` 布尔值，密钥只写不读。
3. **主进程保持瘦**：不感知具体插件，只提供通用能力（命名空间存储、全局设置、可插拔 AI 提供商）。

## 目录结构

```
avero/
├── apps/desktop/            # Electron 应用外壳
│   ├── src/main/            # 主进程：窗口、IPC、存储、设置、AI provider
│   ├── src/preload/         # contextBridge 桥（window.avero）
│   ├── src/renderer/        # React 渲染层：外壳 + PluginRegistry
│   └── electron-builder.yml # Windows(nsis)/macOS(dmg)/Linux(AppImage,deb)
├── packages/shared/         # 契约层：插件 API、IPC 协议、设置类型（无运行时代码）
├── plugins/notes/           # 内置插件：Markdown 笔记 / 知识管理
└── plugins/ai-assist/       # 内置插件：AI 助手（可插拔提供商）
```

## 插件系统

一个插件 = 一份 `manifest` + 一个 `register` 函数。

`plugins/notes/plugin.json`：

```json
{
  "id": "avero.notes",
  "name": "笔记",
  "version": "0.0.1",
  "description": "Markdown 笔记与知识管理：创建、编辑、搜索本地笔记。",
  "nameKey": "notes.name",
  "descriptionKey": "notes.description",
  "author": "avero"
}
```

`plugins/notes/src/index.tsx`：

```tsx
import type { PluginDefinition } from '@avero/shared';
import { manifest } from './manifest';
import { NotesPanel } from './NotesPanel';

export const plugin: PluginDefinition = {
  manifest,
  register(ctx) {
    // 按插件 id 隔离的存储命名空间
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
```

`PluginContext` 提供的能力：

| 能力 | 说明 |
|---|---|
| `panels.register` | 贡献侧边栏面板（React 组件） |
| `commands.register` | 贡献命令（出现在命令面板，`Ctrl/Cmd+K`） |
| `storage.namespace` | 按插件 id 隔离的 KV 存储 |
| `shell.navigate` | 切换到指定面板 |
| `i18n.t` | 翻译函数，随宿主语言切换；文案 key 见 `packages/shared/src/i18n.ts` |
| `ai` | AI 对话（流式），能力在 `@avero/shared` 的 `AiApi` |
| `settings` / `app` | 全局设置与宿主信息 |

**新写一个内置插件**：在 `plugins/<name>/` 建包 → 实现 `manifest` + `register` → 在
`apps/desktop/src/renderer/src/host/builtins.ts` 注册 → 在 `electron.vite.config.ts`
与根 `tsconfig.json` 加别名。第三方插件的运行时加载（从 `userData/plugins` 目录加载、
沿用同一 manifest 契约）是既定的扩展点，当前内置插件已通过同一注册表「吃自己的狗粮」。

> 约定：`register(ctx)` 必须**同步**完成面板与命令的登记（内置插件正是如此），
> 宿主在渲染期间同步调用它；如需异步初始化，请在面板组件内部处理。

## 国际化（i18n）

所有用户可见文案集中在 `packages/shared/src/i18n.ts` 的 `zhCN` 字典里（扁平 key，`.` 命名空间）。
宿主经 `useI18n()` 取 `t`，插件经 `ctx.i18n.t` 取 `t`；面板/命令的 `title`、manifest 的
`nameKey`/`descriptionKey` 都是 key，宿主统一用 `t()` 解析（未命中则原样显示）。

**新增一门语言**（三步）：
1. 在 `packages/shared/src/i18n.ts` 新增一份 `<locale>` 字典，并登记到 `locales`；
2. 在 `apps/desktop/src/renderer/src/shell/SettingsView.tsx` 的 `LOCALE_OPTIONS` 加一个选项；
3. 在字典里补 `settings.language.<locale>`（语言显示名）——设置页下拉框即自动出现该语言。

## 添加 AI 提供商

实现 `apps/desktop/src/main/ai/provider.ts` 的 `AiProvider` 接口（`isConfigured` +
`chat`），然后在 `apps/desktop/src/main/ipc.ts` 的 `providers` 表注册即可，渲染层与插件零改动。

内置的 Anthropic 提供商默认 `claude-opus-5-5`，流式输出；API Key 取设置项，缺省回落到
`ANTHROPIC_API_KEY` / `ant auth login` 配置文件，因此「不填 key」也能用（只要环境有凭据）。

## 安全说明

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`，渲染进程无 Node 能力。
- 第三方插件一旦启用，运行于渲染进程沙箱内，只能触达 `window.avero` 的有限 IPC 面；
  安装来源不明的插件仍应视为「信任该插件在沙箱内能做的任何事」。
- API Key 只写不读、永不进渲染进程；存储与设置落在 `userData/avero/`。

## 验证方式

- `npm run typecheck` —— 全仓严格类型检查。
- `npm run build` —— 主/预加载/渲染三端打包。
- `npm run smoke` —— 无头端到端：启动 Electron，断言 preload 桥已暴露且 React 已挂载。

## 路线图

- ✅ 应用外壳（侧边栏 / 设置 / 命令面板 / 状态栏）
- ✅ 插件系统（manifest + 生命周期 + 能力注入）
- ✅ 笔记插件（Markdown 知识管理，本地 JSON 存储）
- ✅ AI 助手插件（流式对话，可插拔提供商）
- ✅ 三平台打包配置（Windows/macOS/Linux）
- ✅ 多架构（x64 / arm64）与 Linux 各发行版包格式（deb / rpm / pacman / AppImage）
- ✅ 版本规范与发布流程（alpha / beta / rc / stable）
- ⬜ 第三方插件运行时加载（`userData/plugins`）
- ⬜ 研究 / 自动化 / 商业化等领域插件
- ⬜ 存储升级 SQLite（接口已隔离，可平滑替换）
- ⬜ 笔记 Markdown 预览、全文检索、AI 能力接入笔记

## 打包产物

命名规则：`avero-<系统>-<架构><后缀>.<ext>`

> 文件名不含版本号，版本由 Release 标签区分；同一发布页内产物名称固定，便于脚本直接下载。

**Windows**

| 架构 | 文件 |
|---|---|
| x64 | `avero-windows-x64-setup.exe` |
| arm64 | `avero-windows-arm64-setup.exe` |

**macOS**

| 架构 | 文件 |
|---|---|
| Apple Silicon | `avero-macos-arm64.dmg` |
| Intel | `avero-macos-x64.dmg` |

**Linux**（覆盖主流发行版家族）

| 格式 | 适用发行版 | x64 | arm64 |
|---|---|---|---|
| AppImage | 任意发行版（免安装） | `avero-linux-x86_64.AppImage` | `avero-linux-arm64.AppImage` |
| deb | Debian / Ubuntu / Mint / Deepin | `avero-linux-amd64.deb` | `avero-linux-arm64.deb` |
| rpm | Fedora / RHEL / CentOS / openSUSE | `avero-linux-x86_64.rpm` | `avero-linux-aarch64.rpm` |
| pacman | Arch / Manjaro | `avero-linux-x64.pkg.tar.xz` | `avero-linux-aarch64.pkg.tar.xz` |

> 架构后缀按各生态惯例：deb 用 `amd64`、rpm/AppImage 用 `x86_64`、rpm/pacman 的 arm64 用 `aarch64`，由 electron-builder 自动映射。
>
> 本地打包需要 `rpm`（提供 `rpmbuild`）与 `libarchive-tools`（提供 `bsdtar`）：`sudo apt-get install -y rpm libarchive-tools`。CI 已自动安装。
> 未包含 snap / flatpak（需要额外工具链，AppImage 已覆盖同类场景）。

打包配置见 `apps/desktop/electron-builder.cjs`（用 JS 配置是因为 macOS 的 `CFBundleShortVersionString` 必须为纯数值，需要按版本动态计算）。

## 版本与发布

版本规范：

| 类型 | 格式 | 示例 |
|---|---|---|
| 预览版 | `x.y.z-alpha-n` | `1.0.0-alpha-1` |
| 预览版 | `x.y.z-beta-n` | `1.0.0-beta-1` |
| 预览版 | `x.y.z-rc-n` | `1.0.0-rc-1` |
| 正式版 | `x.y.z` | `1.0.0` |

发布流程：

```bash
npm run release:alpha    # 推进版本（alpha → beta → rc → stable 自动衔接）
npm run version:show     # 查看当前版本
npm run version:set 1.2.0-rc-1   # 直接指定版本

git add -A && git commit -m "release: v1.0.0-alpha-1"
git tag v1.0.0-alpha-1 && git push origin main --tags
```

推送 `v*` 标签后，GitHub Actions 会：

1. 校验 tag 与 `package.json` 版本一致、符合规范；
2. 三个平台并行构建全部架构的安装包；
3. 发布 Release —— **预发布版本自动标记为 pre-release，且不会占用 Latest**。

版本推进规则：`alpha-1 → alpha-2 → beta-1 → rc-1 → 1.0.0 → 1.0.1 → …`；同一基版本内通道只向前切（alpha→beta→rc→stable），回退通道或从正式版开始时补丁号 +1 并重新从 `-1` 起算。

## License

MIT © 2026 avero contributors
