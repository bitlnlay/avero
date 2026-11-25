# avero 项目指令

## 提交与推送（长期约定）

完成每一项任务后，直接 `git commit` 并 `git push` 到 origin，**无需每次等待用户明确说「提交并推送」**。

- 提交信息用中文，简洁描述本次改动。
- 如无特别说明，直接提交到当前分支并推送。
- 构建产物与敏感/本机配置已被 `.gitignore`（`node_modules/`、`out/`、`release/`、`.npmrc` 等），不要提交。

## 参考

- 项目架构、插件开发、i18n 与打包：见 `README.md`。
- 构建/运行的环境坑点：见本机记忆 `avero-env-gotchas`。
