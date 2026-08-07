# -*- coding: utf-8 -*-
"""安装引擎路由: /api/install /api/install/status (多平台 + 自定义路径 + 日志)"""
import os
import subprocess
import sys
import threading

from fastapi.responses import JSONResponse
from starlette.requests import Request

from .. import auth
from ..config import CONFIG
from ..env import _which
from ..processes import CREATE_NO_WINDOW

_INSTALL_STATE = {"running": False, "logs": [], "done": False, "ok": None, "platform": None, "install_where": {}}


def _detect_platform():
    if os.name == "nt":
        return "windows"
    if sys.platform == "darwin":
        return "mac"
    return "linux"


def _plan_install_tasks(platform, wechat_dir, astrbot_root, wechat_repo=""):
    tasks = []
    pkg = os.path.join(wechat_dir, "package.json")
    node_modules = os.path.isdir(os.path.join(wechat_dir, "node_modules"))
    if os.path.isfile(pkg) and not node_modules:
        tasks.append({"label": f"npm install (wechat-bot @ {wechat_dir})", "kind": "npm", "target": wechat_dir})
    elif not os.path.isfile(pkg):
        if wechat_repo:
            tasks.append({"label": f"git clone {wechat_repo} → {wechat_dir}", "kind": "clone", "target": wechat_dir, "repo": wechat_repo})
        else:
            tasks.append({"label": f"wechat-bot 源码缺失: {wechat_dir} (请先克隆/放置项目)", "kind": "warn", "target": wechat_dir})
    astrbot_exe = _which("astrbot")
    if not astrbot_exe:
        tasks.append({"label": "uv tool install astrbot", "kind": "uv", "target": astrbot_root})
    return tasks


def _run_install(tasks, platform, wechat_dir, astrbot_root):
    _INSTALL_STATE.update({
        "running": True, "logs": [], "done": False, "ok": None,
        "platform": platform,
        "install_where": {"platform": platform, "wechat_dir": wechat_dir, "astrbot_dir": astrbot_root},
    })
    ok_all = True
    for task in tasks:
        _INSTALL_STATE["logs"].append(f"[{platform}] [start] {task['label']}")
        kind = task.get("kind", "")
        try:
            if kind == "npm":
                r = subprocess.run(
                    ["npm", "install"], cwd=task["target"],
                    capture_output=True, text=True, timeout=600,
                    creationflags=CREATE_NO_WINDOW,
                )
                tail = (r.stdout or "")[-800:] + "\n" + (r.stderr or "")[-800:]
                if r.returncode != 0:
                    ok_all = False
                _INSTALL_STATE["logs"].append(f"[{platform}] [done] {task['label']} exit={r.returncode}\n{tail}")
            elif kind == "uv":
                r = subprocess.run(
                    ["uv", "tool", "install", "astrbot"],
                    capture_output=True, text=True, timeout=900,
                    creationflags=CREATE_NO_WINDOW,
                )
                tail = (r.stdout or "")[-800:] + "\n" + (r.stderr or "")[-800:]
                if r.returncode != 0:
                    ok_all = False
                _INSTALL_STATE["logs"].append(f"[{platform}] [done] {task['label']} exit={r.returncode}\n{tail}")
            elif kind == "clone":
                # 从配置/参数指定的仓库克隆 wechat-bot 源码 (优化版), 克隆后自动 npm install
                try:
                    os.makedirs(task["target"], exist_ok=True)
                except Exception:
                    pass
                r = subprocess.run(
                    ["git", "clone", "--depth", "1", task["repo"], task["target"]],
                    capture_output=True, text=True, timeout=900,
                    creationflags=CREATE_NO_WINDOW,
                )
                tail = (r.stdout or "")[-800:] + "\n" + (r.stderr or "")[-800:]
                _INSTALL_STATE["logs"].append(f"[{platform}] [done] {task['label']} exit={r.returncode}\n{tail}")
                if r.returncode != 0:
                    ok_all = False
                else:
                    # 克隆成功后补 npm install (源码就绪)
                    _INSTALL_STATE["logs"].append(f"[{platform}] [start] npm install (wechat-bot)")
                    r2 = subprocess.run(
                        ["npm", "install"], cwd=task["target"],
                        capture_output=True, text=True, timeout=600,
                        creationflags=CREATE_NO_WINDOW,
                    )
                    tail2 = (r2.stdout or "")[-800:] + "\n" + (r2.stderr or "")[-800:]
                    _INSTALL_STATE["logs"].append(f"[{platform}] [done] npm install exit={r2.returncode}\n{tail2}")
                    if r2.returncode != 0:
                        ok_all = False
            elif kind == "warn":
                _INSTALL_STATE["logs"].append(f"[{platform}] [warn] {task['label']}")
        except Exception as e:
            ok_all = False
            _INSTALL_STATE["logs"].append(f"[{platform}] [error] {task['label']}: {e}")
    _INSTALL_STATE["running"] = False
    _INSTALL_STATE["done"] = True
    _INSTALL_STATE["ok"] = ok_all
    _INSTALL_STATE["install_where"] = {
        "platform": platform,
        "wechat_dir": wechat_dir,
        "astrbot_dir": astrbot_root,
        "astrbot_exe": _which("astrbot") or "",
    }


def register(app):
    @app.post("/api/install")
    async def api_install(request: Request):
        auth.require_auth(request)
        platform = _detect_platform()
        wechat_dir = CONFIG["wechat_bot_dir"]
        astrbot_root = CONFIG["astrbot_root"]
        # wechat-bot 源码仓库 (优化版), 缺源码且给了 repo 时自动 git clone
        wechat_repo = CONFIG.get("wechat_bot_repo", "") or ""
        try:
            body = await request.json()
            if isinstance(body, dict):
                if body.get("platform"):
                    platform = str(body["platform"]).lower()
                if body.get("wechat_dir"):
                    wechat_dir = str(body["wechat_dir"]).replace("\\", "/")
                if body.get("astrbot_dir"):
                    astrbot_root = str(body["astrbot_dir"]).replace("\\", "/")
                if body.get("wechat_repo"):
                    wechat_repo = str(body["wechat_repo"]).strip()
        except Exception:
            pass
        if platform not in ("windows", "mac", "linux"):
            return JSONResponse({"ok": False, "message": f"未知平台: {platform} (应为 windows/mac/linux)"}, status_code=400)
        tasks = _plan_install_tasks(platform, wechat_dir, astrbot_root, wechat_repo)
        if not tasks:
            return {
                "ok": True, "message": "所有组件已就绪, 无需安装", "tasks": [], "platform": platform,
                "wechat_dir": wechat_dir, "astrbot_dir": astrbot_root,
            }
        thread = threading.Thread(
            target=_run_install, args=(tasks, platform, wechat_dir, astrbot_root), daemon=True
        )
        thread.start()
        return {
            "ok": True,
            "message": f"开始安装 ({platform}): " + " / ".join(t["label"] for t in tasks),
            "tasks": tasks,
            "platform": platform,
            "wechat_dir": wechat_dir,
            "astrbot_dir": astrbot_root,
        }

    @app.get("/api/install/status")
    def api_install_status():
        return _INSTALL_STATE