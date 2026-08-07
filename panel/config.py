# -*- coding: utf-8 -*-
"""配置加载: 路径常量 / 默认配置 / 深度合并 / 校验 / CONFIG 全局"""
import json
import os
from pathlib import Path

# ============ 路径 ============
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_FILE = BASE_DIR / "config.json"
STATIC_DIR = BASE_DIR / "static"
LOG_DIR = BASE_DIR / "logs"

# 默认配置 (与 config.json 合并)
DEFAULT_CONFIG = {
    "port": 8080,
    "panel_password": "",
    "project_root": "C:/Users/YMB/Desktop/wechat",
    "wechat_bot_dir": "C:/Users/YMB/Desktop/wechat/wechat-bot-windows",
    "astrbot_root": "C:/Users/YMB",
    "astrbot_data_dir": "C:/Users/YMB/data",
    "qr_server_script": "C:/Users/YMB/Desktop/wechat/qr-server.js",
    "wechat_bot_serve": "ChatGPT",
    "logs": {
        "astrbot_stdout": "logs/astrbot_boot.log",
        "astrbot_stderr": "logs/astrbot_boot_err.log",
        "wechat_stdout": "logs/bot_boot.log",
        "wechat_stderr": "logs/bot_boot_err.log",
        "qr_stdout": "logs/qr_boot.log",
        "qr_stderr": "logs/qr_boot_err.log",
    },
    "services": {
        "astrbot": {"webui_port": 6185, "ws_port": 20129},
        "wechat": {"api_port": 6189},
        "qr": {"port": 8090},
    },
    "astrbot": {
        "cmd_config": "C:/Users/YMB/data/cmd_config.json",
        "platform_id": "wechat-bridge",
        "platform_type": "aiocqhttp",
        "ws_host": "127.0.0.1",
        "ws_port": 20129,
        "ws_token": "",
        "wake_prefix": ["/"],
        "dashboard": {"enable": True, "host": "0.0.0.0", "port": 6185},
    },
}


def _deep_merge(base, override):
    """递归深度合并: override 中的 dict 与 base 中同名 dict 递归合并, 其余覆盖"""
    if not isinstance(base, dict) or not isinstance(override, dict):
        return override
    result = dict(base)
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def _validate_config(cfg):
    """启动时校验配置结构, 返回 (ok, 错误信息列表)"""
    errors = []
    # 端口必须为正整数
    for key in ("port",):
        if not isinstance(cfg.get(key), int) or cfg.get(key) <= 0:
            errors.append(f"config.{key} 必须是正整数 (当前: {cfg.get(key)!r})")
    # services 端口
    for svc, spec in (("astrbot", ("webui_port", "ws_port")),
                      ("wechat", ("api_port",)),
                      ("qr", ("port",))):
        s = cfg.get("services", {}).get(svc)
        if not isinstance(s, dict):
            errors.append(f"config.services.{svc} 必须是对象")
            continue
        for field in spec:
            v = s.get(field)
            if not isinstance(v, int) or v <= 0:
                errors.append(f"config.services.{svc}.{field} 必须是正整数 (当前: {v!r})")
    # astrbot 配置
    a = cfg.get("astrbot", {})
    for field in ("platform_id", "platform_type", "ws_host", "ws_token", "cmd_config"):
        if not isinstance(a.get(field), str):
            errors.append(f"config.astrbot.{field} 必须是字符串 (当前: {a.get(field)!r})")
    if not isinstance(a.get("ws_port"), int) or a.get("ws_port") <= 0:
        errors.append(f"config.astrbot.ws_port 必须是正整数 (当前: {a.get('ws_port')!r})")
    if not isinstance(a.get("wake_prefix"), list):
        errors.append("config.astrbot.wake_prefix 必须是数组")
    dash = a.get("dashboard", {})
    if not isinstance(dash, dict):
        errors.append("config.astrbot.dashboard 必须是对象")
    else:
        for field in ("host",):
            if not isinstance(dash.get(field), str):
                errors.append(f"config.astrbot.dashboard.{field} 必须是字符串")
        if not isinstance(dash.get("port"), int) or dash.get("port") <= 0:
            errors.append(f"config.astrbot.dashboard.port 必须是正整数 (当前: {dash.get('port')!r})")
    # logs
    if not isinstance(cfg.get("logs", {}), dict):
        errors.append("config.logs 必须是对象")
    return (not errors), errors


# config.local.json: 本地私有覆盖 (不提交, 用于个人路径等)
LOCAL_CONFIG_FILE = BASE_DIR / "config.local.json"


def _load_config():
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))  # deep copy
    # 1) 主 config.json
    try:
        if CONFIG_FILE.exists():
            user = json.loads(CONFIG_FILE.read_text(encoding="utf-8-sig"))
            cfg = _deep_merge(cfg, user)
    except Exception as e:
        print(f"[panel] config.json 读取失败, 使用默认配置: {e}")
    # 2) 本地覆盖 config.local.json (优先级更高)
    try:
        if LOCAL_CONFIG_FILE.exists():
            local = json.loads(LOCAL_CONFIG_FILE.read_text(encoding="utf-8-sig"))
            cfg = _deep_merge(cfg, local)
            print("[panel] 已加载 config.local.json (本地覆盖)")
    except Exception as e:
        print(f"[panel] config.local.json 读取失败(忽略): {e}")
    # 相对路径基于 BASE_DIR 解析
    def resolve(p):
        if not p:
            return p
        p = str(p)
        if not os.path.isabs(p):
            p = str(BASE_DIR / p)
        return p.replace("\\", "/")
    cfg["project_root"] = resolve(cfg.get("project_root"))
    cfg["wechat_bot_dir"] = resolve(cfg.get("wechat_bot_dir"))
    cfg["astrbot_root"] = resolve(cfg.get("astrbot_root"))
    cfg["astrbot_data_dir"] = resolve(cfg.get("astrbot_data_dir"))
    cfg["qr_server_script"] = resolve(cfg.get("qr_server_script"))
    cfg.setdefault("astrbot", {})
    cfg["astrbot"]["cmd_config"] = resolve(cfg["astrbot"].get("cmd_config", ""))
    logs = cfg.get("logs", {})
    for k, v in logs.items():
        if isinstance(v, str):
            logs[k] = resolve(v)
    # 3) Pydantic 深度校验 + 类型转换 (错误仅告警, 不阻断)
    from .config_schema import validate_config
    model, errs = validate_config(cfg)
    if errs:
        print("[panel] config.json 校验告警 (Pydantic):")
        for e in errs:
            print(f"  - {e}")
    cfg["_config_errors"] = errs
    # model_dump 回写 (确保 CONFIG 字典完整, 含默认值)
    merged = model.model_dump()
    for k, v in merged.items():
        cfg.setdefault(k, v)
    return cfg


CONFIG = _load_config()