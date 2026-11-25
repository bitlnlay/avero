#!/usr/bin/env node
/**
 * avero 版本管理。
 *
 * 版本规范：
 *   正式版    x.y.z
 *   预览版    x.y.z-alpha-n / x.y.z-beta-n / x.y.z-rc-n   （n 从 1 开始）
 *
 * 用法：
 *   node scripts/version.mjs set 1.2.3-alpha-1   # 直接设定版本
 *   node scripts/version.mjs next alpha          # 推进到下一个 alpha
 *   node scripts/version.mjs next beta           # 推进到下一个 beta
 *   node scripts/version.mjs next rc             # 推进到下一个 rc
 *   node scripts/version.mjs next stable         # 发布正式版
 *   node scripts/version.mjs show                # 查看当前版本
 *
 * 同步更新所有 package.json / plugin.json 的版本与内部依赖，并刷新 package-lock.json。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)-(\d+))?$/;
const CHANNELS = ['alpha', 'beta', 'rc'];

/** 需要同步版本的文件（相对仓库根目录） */
const MANIFESTS = [
  'package.json',
  'apps/desktop/package.json',
  'packages/shared/package.json',
  'plugins/notes/package.json',
  'plugins/notes/plugin.json',
  'plugins/ai-assist/package.json',
  'plugins/ai-assist/plugin.json',
];

function parse(version) {
  const m = VERSION_RE.exec(version);
  if (!m) {
    throw new Error(
      `版本号 "${version}" 不符合规范，应为 x.y.z 或 x.y.z-alpha-n / -beta-n / -rc-n`,
    );
  }
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    channel: m[4] ?? null,
    n: m[5] ? Number(m[5]) : 0,
  };
}

function format(v) {
  const base = `${v.major}.${v.minor}.${v.patch}`;
  return v.channel ? `${base}-${v.channel}-${v.n}` : base;
}

/** 计算下一个版本 */
function next(current, target) {
  const v = parse(current);

  if (target === 'stable') {
    // 已有预发布：就地把该版本转正；已是正式版：补丁号 +1
    return v.channel ? format({ ...v, channel: null, n: 0 }) : format({ ...v, patch: v.patch + 1 });
  }

  if (!CHANNELS.includes(target)) {
    throw new Error(`未知的发布通道 "${target}"，可选：${CHANNELS.join(' / ')} / stable`);
  }

  const order = { alpha: 0, beta: 1, rc: 2 };

  // 同一基版本、且目标通道不早于当前通道：推进或切换通道
  if (v.channel && order[target] >= order[v.channel]) {
    const n = target === v.channel ? v.n + 1 : 1;
    return format({ ...v, channel: target, n });
  }

  // 其他情况（正式版 / 回退通道）：开启新一轮，补丁号 +1
  return format({ ...v, patch: v.patch + 1, channel: target, n: 1 });
}

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
}

function writeJson(rel, data) {
  writeFileSync(path.join(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function currentVersion() {
  return readJson('package.json').version;
}

function apply(version) {
  const parsed = parse(version);
  const normalized = format(parsed);

  for (const rel of MANIFESTS) {
    const data = readJson(rel);
    data.version = normalized;

    // 内部 workspace 依赖跟随版本
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const deps = data[field];
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (name.startsWith('@avero/')) deps[name] = normalized;
      }
    }

    writeJson(rel, data);
  }

  // 同步 lockfile，保证 CI 的 npm ci 不会因版本不一致失败
  execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  return normalized;
}

const [command, arg] = process.argv.slice(2);

try {
  if (command === 'show') {
    console.log(currentVersion());
    process.exit(0);
  }

  if (command === 'set' && arg) {
    const applied = apply(arg);
    console.log(`版本已设为 ${applied}`);
  } else if (command === 'next' && arg) {
    const before = currentVersion();
    const applied = apply(next(before, arg));
    console.log(`版本已推进：${before} -> ${applied}`);
  } else {
    console.error(
      [
        '用法：',
        '  node scripts/version.mjs set <x.y.z[-alpha-n|-beta-n|-rc-n]>',
        '  node scripts/version.mjs next <alpha|beta|rc|stable>',
        '  node scripts/version.mjs show',
      ].join('\n'),
    );
    process.exit(1);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
