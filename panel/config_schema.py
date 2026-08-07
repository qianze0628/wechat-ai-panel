# -*- coding: utf-8 -*-
"""面板配置的 Pydantic Schema: 结构校验 + 默认值 + 类型转换

- 将 (默认配置 + config.json + config.local.json) 合并后的 dict 校验为结构化模型
- 校验失败仅记录错误 (config_errors), 不阻断启动
- 提供 model_dump() 转回 dict 供 CONFIG 使用 (保持字典接口兼容)
"""
from typing import List
from pydantic import BaseModel, Field, ValidationError


class LogPaths(BaseModel):
    astrbot_stdout: str = ""
    astrbot_stderr: str = ""
    wechat_stdout: str = ""
    wechat_stderr: str = ""
    qr_stdout: str = ""
    qr_stderr: str = ""
    astrbot_capture_log: str = ""
    wechat_capture_log: str = ""


class AstrbotServices(BaseModel):
    webui_port: int = Field(6185, gt=0)
    ws_port: int = Field(20129, gt=0)


class WechatServices(BaseModel):
    api_port: int = Field(6189, gt=0)


class QrServices(BaseModel):
    port: int = Field(8090, gt=0)


class Services(BaseModel):
    astrbot: AstrbotServices = Field(default_factory=AstrbotServices)
    wechat: WechatServices = Field(default_factory=WechatServices)
    qr: QrServices = Field(default_factory=QrServices)


class Dashboard(BaseModel):
    enable: bool = True
    host: str = "0.0.0.0"
    port: int = Field(6185, gt=0)


class AstrbotConfig(BaseModel):
    cmd_config: str = ""
    platform_id: str = "wechat-bridge"
    platform_type: str = "aiocqhttp"
    ws_host: str = "127.0.0.1"
    ws_port: int = Field(20129, gt=0)
    ws_token: str = ""
    wake_prefix: List[str] = Field(default_factory=lambda: ["/"])
    dashboard: Dashboard = Field(default_factory=Dashboard)


class PanelConfig(BaseModel):
    """面板配置完整 schema"""
    port: int = Field(8080, gt=0)
    panel_password: str = ""
    project_root: str = ""
    wechat_bot_dir: str = ""
    astrbot_root: str = ""
    astrbot_data_dir: str = ""
    qr_server_script: str = ""
    wechat_bot_serve: str = "ChatGPT"
    logs: LogPaths = Field(default_factory=LogPaths)
    services: Services = Field(default_factory=Services)
    astrbot: AstrbotConfig = Field(default_factory=AstrbotConfig)

    model_config = {"extra": "allow"}  # 允许插件/未来字段


def merge_defaults(raw: dict) -> dict:
    """用默认值补齐缺失字段"""
    defaults = PanelConfig().model_dump()
    return {**defaults, **{k: v for k, v in raw.items() if k in defaults}}


def validate_config(raw: dict) -> tuple[PanelConfig, list[str]]:
    """校验合并后配置, 返回 (model, 错误列表). 失败时错误记录, 不抛异常"""
    try:
        model = PanelConfig.model_validate(raw)
        return model, []
    except ValidationError as e:
        msg = []
        for err in e.errors():
            loc = ".".join(str(x) for x in err["loc"])
            msg.append(f"{loc}: {err['msg']}")
        try:
            model = PanelConfig.model_validate(merge_defaults(raw))
        except ValidationError:
            model = PanelConfig()
        return model, msg