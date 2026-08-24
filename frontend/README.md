# 中医智能诊疗微信小程序

基于 `uni-app + Vue 3 + TypeScript + Pinia` 的独立微信小程序工程。当前版本提供可运行 Mock 业务闭环，并预留统一 HTTPS/WSS 网关接入边界。

## 当前能力

- 患者账号登录、身份保持、失效和退出清理；
- 登录账号绑定唯一患者健康档案；
- “问诊、诊疗、我的”三个内部面板及现有悬浮底部导航；
- 本人资料更新、历史疾病 Mock CRUD 与独立问诊专家选择；
- AI 实例创建、流式问诊、思考/步骤/工具摘要；
- 实例级 Socket、5 次有上限退避重连、前后台恢复；
- `sessionVersion` 上下文隔离；
- 四阶段诊疗、Canvas 证候雷达图、诊断结论和本次处方；
- 个人页只读历史诊疗报告摘要；
- 三维人体“规划中”静态占位，不加载模型资源；
- 安全 Markdown 文本节点转换，不注入原始 HTML；
- H5 与微信小程序双端构建及核心领域单元测试。

## 本地运行

环境要求：Node.js 20.19+。

从仓库根目录进入前端工程：

```powershell
cd frontend
npm install
npm run dev:h5
```

H5 默认地址：`http://127.0.0.1:4173/`

Mock 登录：

```text
账号：patient
密码：demo123
```

## 微信开发者工具

```bash
npm run build:mp-weixin
```

在微信开发者工具中导入：

```text
frontend/dist/build/mp-weixin
```

首次真机联调前，必须在 `src/manifest.json` 填写真实 AppID，并在微信后台配置 HTTPS/WSS 合法域名。

## 接入真实网关

复制 `.env.example` 的配置语义到目标环境：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://your-gateway.example.com
VITE_WS_BASE_URL=wss://your-gateway.example.com
```

页面只调用 `src/services/llm-chart-api.ts`，真实 REST 映射位于 `src/services/remote-api.ts`，Socket 位于 `src/services/socket-session.ts`。不要在页面中拼接旧服务地址。

真实联调前还需冻结：Token 契约、患者/病史 CRUD、诊疗结果/报告 DTO、WSS 事件 ID/顺序/重放语义和错误码。详见 [实施计划](./IMPLEMENTATION_PLAN.md)。

## 质量检查

```bash
npm run typecheck
npm test
npm run build:h5 -- --mode development
npm run build:mp-weixin
```

`npm run check` 会执行类型检查、单元测试和微信小程序构建。

## 隐私边界

- 本地只保存 Token、用户摘要和患者/历史疾病/问诊专家 ID；
- 不持久化患者完整资料、聊天正文、诊断报告或处方；
- 不在普通日志中输出密码、Token 或医疗正文；
- DCloud 统计默认关闭；
- 客户端不推导医疗结论，也不补全缺失剂量和单位。

依赖审计和编译链残余风险见 [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)。
