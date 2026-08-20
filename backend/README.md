# CDSP Mini 后端

这是面向微信小程序网关的 FastAPI 基础脚手架。当前目标是固定模块边界和外部接口形状，不实现数据库读写、旧服务适配、鉴权或大模型调用。

## 模块边界

```text
backend/
├─ app/
│  ├─ api/                 路由组装与健康检查
│  ├─ core/                配置、异常和统一响应处理
│  ├─ contracts/           CRUD 与对话模块共享的稳定契约
│  └─ modules/
│     ├─ crud/             患者、疾病、咨询、记录、诊断和报告
│     │  ├─ router.py      HTTP 接口
│     │  ├─ schemas.py     CRUD DTO
│     │  ├─ ports.py       数据仓储端口
│     │  └─ service.py     CRUD 用例层
│     └─ chat/             大模型实例与 WebSocket 流式对话
│        ├─ router.py      实例 HTTP 接口和 WSS 接口
│        ├─ schemas.py     对话 DTO 与流事件
│        ├─ ports.py       大模型提供方端口
│        └─ service.py     对话用例层
├─ tests/                  脚手架冒烟测试
├─ .env.example
└─ pyproject.toml
```

`crud` 不依赖 `chat`，`chat` 也不依赖 `crud`。两者只允许依赖 `contracts` 中的诊疗上下文等共享协议。这样以后更换数据库或大模型供应商时不会互相牵连。

## 本地启动

要求 Python 3.11 或更高版本。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

启动后可访问：

- 健康检查：`http://127.0.0.1:8000/health`
- OpenAPI：`http://127.0.0.1:8000/docs`
- OpenAPI JSON：`http://127.0.0.1:8000/openapi.json`

## 当前接口状态

外部路径与前端及需求文档保持一致：

- CRUD：`/api/v1/llm-chart/*`
- 创建对话实例：`/api/v1/llm-chart/chat/instances`
- 流式对话：`/ws/v1/llm-chart/stream?instanceId=...`

除 `/health` 外，接口当前会返回统一的 `501 NOT_IMPLEMENTED`。这是有意设计，防止脚手架用假数据伪装成已接入真实业务。

## 运行测试

```powershell
python -m pytest
```

## 后续接入顺序

1. 在 `crud/ports.py` 的端口后接数据库或旧服务适配器。
2. 在 `chat/ports.py` 的端口后接实际智能体/大模型平台。
3. 增加独立 `auth` 模块，统一 REST 与 WSS Token 校验。
4. 在应用装配层注入真实实现，移除相应接口的 `501`。
5. 补充数据库迁移、审计脱敏、幂等和集成测试。

禁止在普通日志中记录密码、Token、患者姓名、完整聊天正文、诊断内容或处方。
