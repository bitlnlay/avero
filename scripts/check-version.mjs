#!/usr/bin/env node
/**
 * 校验 git tag 与仓库版本号一致，且符合版本规范。
 *
 *   node scripts/check-version.mjs v1.2.3
 *   node scripts/check-version.mjs v1.2.3-alpha-1
 *
 * 规范：正式版 x.y.z；预览版 x.y.z-alpha-n / x.y.z-beta-n / x.y.z-rc-n
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_RE = /^\d+\.\d+\.\d+(?:-(alpha|beta|rc)-\d+)?$/;

const tag = process.argv[2];
if (!tag) {
  console.error('用法：node scripts/check-version.mjs <tag>（例如 v1.0.0-alpha-1）');
  process.exit(1);
}

const tagVersion = tag.replace(/^v/, '');
const pkgVersion = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const errors = [];

if (!VERSION_RE.test(tagVersion)) {
  errors.push(`tag "${tag}" 不符合版本规范：应为 vX.Y.Z 或 vX.Y.Z-alpha-N / -beta-N / -rc-N`);
}
if (tagVersion !== pkgVersion) {
  errors.push(`tag 版本 (${tagVersion}) 与 package.json 版本 (${pkgVersion}) 不一致`);
  errors.push('请先运行 npm run release:alpha|beta|rc|stable，提交后再打 tag');
}

if (errors.length > 0) {
  console.error(`❌ 版本校验失败：\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const isPrerelease = tagVersion.includes('-');
console.log(`✅ 版本校验通过：${pkgVersion}（${isPrerelease ? '预发布' : '正式版'}）`);
