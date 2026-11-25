/**
 * electron-builder 配置。
 *
 * 产物命名统一为：
 *   avero-<version>-<系统>-<架构><后缀>.<ext>
 *   例：avero-1.0.0-windows-x64-setup.exe
 *       avero-1.0.0-macos-arm64.dmg
 *       avero-1.0.0-linux-amd64.deb
 *       avero-1.0.0-alpha-1-linux-x86_64.AppImage
 *
 * 架构按各发行版习惯命名（deb 用 amd64、rpm/AppImage 用 x86_64、rpm/pacman 的 arm64 用 aarch64），
 * 由 electron-builder 的 ${arch} 宏自动映射。
 */
const pkg = require('./package.json');

// 去掉预发布后缀的数值版本：1.0.0-alpha-1 -> 1.0.0
// macOS 的 CFBundleShortVersionString / CFBundleVersion 只接受数值，预发布标识不能写入。
const numericVersion = pkg.version.split('-')[0];

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.avero.app',
  productName: 'avero',
  executableName: 'avero',
  copyright: 'Copyright © 2026 avero contributors',

  directories: {
    output: 'release',
  },

  // 应用代码已由 electron-vite 打包进 out/，无需携带 node_modules。
  files: ['out/**/*', '!**/node_modules/**'],
  asar: true,
  npmRebuild: false,

  // ---------- Windows ----------
  win: {
    target: [{ target: 'nsis', arch: ['x64', 'arm64'] }],
    artifactName: '${productName}-${version}-windows-${arch}-setup.${ext}',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },

  // ---------- macOS ----------
  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.productivity',
    artifactName: '${productName}-${version}-macos-${arch}.${ext}',
    bundleShortVersion: numericVersion,
    bundleVersion: numericVersion,
    // 说明：正式签名/公证需在 macOS 主机上配置证书。
  },

  // ---------- Linux（按发行版家族提供官方包格式）----------
  linux: {
    target: [
      // 通用（任意发行版）
      { target: 'AppImage', arch: ['x64', 'arm64'] },
      // Debian / Ubuntu 及其衍生版
      { target: 'deb', arch: ['x64', 'arm64'] },
      // Fedora / RHEL / CentOS / openSUSE
      { target: 'rpm', arch: ['x64', 'arm64'] },
      // Arch Linux / Manjaro
      { target: 'pacman', arch: ['x64', 'arm64'] },
    ],
    category: 'Utility',
    maintainer: 'avero contributors',
    vendor: 'avero contributors',
    synopsis: pkg.description,
    description: pkg.description,
    syncDesktopName: true,
    artifactName: '${productName}-${version}-linux-${arch}.${ext}',
  },

  // 三个 fpm 目标的包名默认取 npm 包名（@avero/desktop），这里统一覆盖。
  deb: { packageName: 'avero' },
  rpm: { packageName: 'avero' },
  pacman: {
    packageName: 'avero',
    // electron-builder 默认扩展名是 .pacman，改为 Arch 约定的 .pkg.tar.xz
    artifactName: '${productName}-${version}-linux-${arch}.pkg.tar.xz',
  },
};
