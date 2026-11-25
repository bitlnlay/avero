// 无头冒烟测试：启动打包好的 Electron 应用，确认主进程启动、窗口就绪后退出。
// 用法：npm run build 之后执行 `node scripts/smoke.mjs`（无显示环境用 xvfb-run 包裹）。
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 在普通 Node 进程中 require('electron') 返回 Electron 可执行文件路径
const electronPath = require('electron');

const child = spawn(electronPath, ['.', '--no-sandbox'], {
  cwd: appDir,
  env: {
    ...process.env,
    AVERO_SMOKE_TEST: '1',
    ELECTRON_DISABLE_SANDBOX: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  child.kill('SIGKILL');
}, 30000);

child.stdout.on('data', (d) => {
  output += d.toString();
});
child.stderr.on('data', (d) => {
  output += d.toString();
});

child.on('close', (code) => {
  clearTimeout(timer);
  if (output.includes('AVERO_SMOKE_OK')) {
    console.log('✅ 冒烟测试通过：Electron 主进程启动、窗口就绪。');
    process.exit(0);
  }
  console.error(`❌ 冒烟测试失败（退出码 ${code}，超时 ${timedOut}）`);
  console.error(output.slice(-4000));
  process.exit(1);
});
