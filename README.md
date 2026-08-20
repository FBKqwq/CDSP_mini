# CDSP Mini

中医智能问诊项目采用前后端分目录组织：

```text
CDSP-mini_demo/
├─ frontend/   uni-app 微信小程序前端
├─ backend/    后端服务预留目录
└─ 微信小程序项目需求文档.md
```

## 前端开发

```powershell
cd frontend
npm install
npm run dev:mp-weixin
```

微信开发者工具调试时导入：

```text
frontend/dist/dev/mp-weixin
```

前端能力、Mock 账号、真实网关接入方式及质量检查见 [frontend/README.md](./frontend/README.md)。

## 后端开发

后端尚未实施，接口和数据契约冻结后在 `backend/` 中独立建设。边界说明见 [backend/README.md](./backend/README.md)。

## 远程仓库

[FBKqwq/CDSP_mini](https://github.com/FBKqwq/CDSP_mini)
