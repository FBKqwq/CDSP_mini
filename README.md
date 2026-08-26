# CDSP Mini

中医智能问诊项目采用前后端分目录组织：

```text
CDSP-mini_demo/
├─ frontend/   uni-app 微信小程序前端
├─ backend/    FastAPI 后端脚手架
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

后端已建立 FastAPI 脚手架，基础 CRUD 与大模型对话按独立模块组织。当前接口只定义契约，未接入数据库和大模型服务。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

具体目录、接口状态和后续接入点见 [backend/README.md](./backend/README.md)。

## 远程仓库

[FBKqwq/CDSP_mini](https://github.com/FBKqwq/CDSP_mini)
