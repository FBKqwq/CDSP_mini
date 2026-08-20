# 依赖与隐私审计记录

审计日期：2026-08-19

## 已完成检查

- 源码未使用 `window`、`document`、`navigator`、iframe、原始 HTML 注入或浏览器 `WebSocket`。
- 源码未记录密码、Token、患者姓名、聊天正文或诊断内容到普通日志。
- DCloud 统计在 `src/manifest.json` 中显式关闭。
- 通过 npm `overrides` 将 Babel、Intlify、adm-zip、esbuild、jpeg-js、PostCSS 和 ws 提升到兼容的安全版本。
- 覆盖后重新通过类型检查、单元测试、H5 构建和微信小程序构建。

## npm audit 结果

命令：

```bash
npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org
```

初始结果：31 项（含 11 项 high）。

兼容覆盖后：6 项（1 项 high、5 项 moderate）。

### 残余项 1：Vite 5.2.8 开发服务器

DCloud 编译器 `@dcloudio/vite-plugin-uni@3.0.0-5020420260813003` 将 Vite 精确声明为 `5.2.8`。审计建议升级到 5.4.21，但这超出当前官方 peer 边界，因此未使用 `--force` 破坏编译链。

缓解措施：

- 开发服务器固定绑定 `127.0.0.1`；
- `strictPort: true`，避免静默切换到未知端口；
- 禁止将本地开发服务器暴露到局域网或公网；
- 正式交付使用静态构建产物，不运行 Vite 开发服务器；
- DCloud 发布兼容新版后优先升级并重新审计。

### 残余项 2：Jimp 0.10.3 → phin 2.9.3

该链路来自 `@dcloudio/uni-mp-weixin` 的构建期图片处理。强制升级 phin 会跨主版本改变 Jimp 依赖，审计建议也会把 uni-app 降到不兼容旧版，因此未强制处理。

缓解措施：

- 构建只使用仓库内受信任的本地资源；
- 不在 CI 构建阶段下载或处理用户提供的远程图片；
- 该依赖不进入小程序业务运行时；
- 随 DCloud 编译器升级一并消除。

## 发布前仍需完成

1. 使用组织批准的依赖镜像和锁文件执行可复现构建。
2. 对真实网关做 HTTPS/WSS、Token 失效和日志脱敏专项测试。
3. 对微信体验版做缓存、代理抓包和真机日志复核。
4. 升级 DCloud 编译器后重新执行本记录中的审计与构建命令。

