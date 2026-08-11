# -*- coding: utf-8 -*-
"""环境检测 / 系统信息"""
import os
import shutil
import time

from .config import CONFIG


def _which(name: str):
    found = shutil.which(name) or ""
    if found:
        return found
    # 修复 (2026-08-12): 便携工具目录 (与 Go 版 which2 一致). 全新电脑面板自装
    # ~/.wechat-ai-panel/ 下的 node/git 后, PATH 快照找不到 → 误报"未安装"。
    home = os.path.expanduser("~")
    ext = ".exe"
    if os.name == "nt":
        name_check = name + ".exe"
    else:
        name_check = name
    portable_dirs = [
        os.path.join(home, ".wechat-ai-panel", "nodejs"),
        os.path.join(home, ".wechat-ai-panel", "git", "cmd"),
        os.path.join(home, ".wechat-ai-panel", "git", "mingw64", "bin"),
        os.path.join(home, ".wechat-ai-panel", "git"),
    ]
    for d in portable_dirs:
        cand = os.path.join(d, name_check)
        if os.path.isfile(cand):
            return cand
        if os.name == "nt" and name == "npm":
            cand2 = os.path.join(d, "npm.cmd")
            if os.path.isfile(cand2):
                return cand2
    return ""


def detect_env():
    node = _which("node")
    npm = _which("npm")
    uv = _which("uv")
    python = _which("python")
    astrbot_exe = ""
    for cand in [
        os.path.expanduser(r"~\AppData\Roaming\uv\tools\astrbot\Scripts\astrbot.exe"),
        _which("astrbot"),
    ]:
        if cand and os.path.exists(cand):
            astrbot_exe = cand
            break
    wechat_pkg = os.path.join(CONFIG["wechat_bot_dir"], "package.json")
    wechat_node_modules = os.path.isdir(os.path.join(CONFIG["wechat_bot_dir"], "node_modules"))
    astrbot_root_ok = os.path.isdir(CONFIG["astrbot_root"]) and os.path.isdir(
        os.path.join(CONFIG["astrbot_root"], ".astrbot")
    )
    cmd_config_exists = os.path.isfile(CONFIG["astrbot"]["cmd_config"])
    return {
        "node": {"installed": bool(node), "path": node or ""},
        "npm": {"installed": bool(npm), "path": npm or ""},
        "uv": {"installed": bool(uv), "path": uv or ""},
        "python": {"installed": bool(python), "path": python or ""},
        "astrbot": {"installed": bool(astrbot_exe), "path": astrbot_exe or ""},
        "wechat_bot": {
            "installed": os.path.isfile(wechat_pkg),
            "deps_ready": wechat_node_modules,
            "path": CONFIG["wechat_bot_dir"],
        },
        "astrbot_root": {"ok": astrbot_root_ok, "path": CONFIG["astrbot_root"]},
        "cmd_config": {"exists": cmd_config_exists, "path": CONFIG["astrbot"]["cmd_config"]},
    }


# ============ 系统信息 (仿 napcat SystemStatus) ============
_psutil = None
try:
    import psutil as _psutil
except Exception:
    _psutil = None


def system_status():
    """返回 CPU/内存/磁盘/系统信息。psutil 缺失时降级为粗略值。"""
    out = {
        "cpu": None,
        "memory": None,
        "disk": None,
        "system": None,
        "uptime": None,
        "processes": None,
        "panel_pid": os.getpid(),
    }
    if _psutil:
        try:
            out["cpu"] = {
                "cores": _psutil.cpu_count(logical=True),
                "physical_cores": _psutil.cpu_count(logical=False),
                "usage_percent": _psutil.cpu_percent(interval=0.2),
                "freq_mhz": (_psutil.cpu_freq().current if _psutil.cpu_freq() else None),
            }
        except Exception:
            pass
        try:
            vm = _psutil.virtual_memory()
            out["memory"] = {
                "total": vm.total,
                "used": vm.used,
                "free": vm.available,
                "usage_percent": vm.percent,
            }
        except Exception:
            pass
        try:
            du = _psutil.disk_usage("C:\\")
            out["disk"] = {
                "total": du.total,
                "used": du.used,
                "free": du.free,
                "usage_percent": du.percent,
            }
        except Exception:
            pass
        try:
            import platform as _platform
            out["system"] = {
                "platform": _platform.platform(),
                "system": _platform.system(),
                "release": _platform.release(),
                "version": _platform.version(),
                "machine": _platform.machine(),
                "hostname": _platform.node(),
            }
            out["processes"] = len(_psutil.pids())
        except Exception:
            pass
        try:
            out["uptime"] = int(time.time() - _psutil.boot_time()) if hasattr(_psutil, "boot_time") else None
        except Exception:
            pass
    return out