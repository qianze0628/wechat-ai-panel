# -*- coding: utf-8 -*-
"""AstrBot 相关: 凭据提取 / 平台配置 / 配置备份 / whitelist 对接"""
import json
import os
import re
import shutil
import time
from pathlib import Path

from .config import BASE_DIR, CONFIG
from .logs_core import _safe_read

# ============ 一键配置 AstrBot ============
BACKUP_DIR = BASE_DIR / "runtime" / "backups"


def _atomic_write(path: str, content: str, encoding: str = "utf-8-sig"):
    """写临时文件 → 重新解析校验 → 原子替换原文件。失败时原文件保持不变。"""
    p = Path(path)
    tmp = p.with_name(p.name + ".tmp-panel")
    tmp.write_text(content, encoding=encoding)
    json.loads(tmp.read_text(encoding=encoding))
    os.replace(str(tmp), str(p))


def _backup_raw_file(path: str):
    """备份原始配置文件 (设置页可关: backup_enabled=false 时跳过备份, 返回 None)"""
    if not CONFIG.get("backup_enabled", True):
        return None
    try:
        if not os.path.isfile(path):
            return None
        stamp = time.strftime("%Y%m%d-%H%M%S")
        dest_dir = BACKUP_DIR / stamp
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / Path(path).name
        shutil.copy2(path, str(dest))
        return str(dest)
    except Exception as e:
        print(f"[panel] 备份失败: {e}")
        return None


def extract_astrbot_creds():
    """返回 AstrBot 登录信息.

    关键: cmd_config.json 使用 PBKDF2 哈希存储密码 (password_storage_upgraded=true) 时,
    明文 password 字段是历史残留/初始密码, 已改过密码就不再是当前密码。
    """
    out = {"username": None, "password": None, "source": None, "password_changed": False}
    try:
        cfg_path = CONFIG["astrbot"]["cmd_config"]
        if os.path.isfile(cfg_path):
            cfg = json.loads(Path(cfg_path).read_text(encoding="utf-8-sig"))
            dash = cfg.get("dashboard", {})
            if dash.get("username"):
                out["username"] = dash["username"]
            upgraded = dash.get("password_storage_upgraded") is True
            if upgraded:
                out["password_changed"] = True
                out["source"] = "cmd_config"
                return out
            if dash.get("password"):
                out["password"] = dash["password"]
                out["source"] = "cmd_config"
                out["password_changed"] = False
                return out
    except Exception:
        pass
    # 从日志回退提取初始凭据
    log_files = [
        CONFIG["logs"].get("astrbot_capture_log", ""),
        CONFIG["logs"].get("astrbot_stdout", ""),
    ]
    patterns = [
        re.compile(r"Initial\s+username\s*[:：]\s*(\S+)", re.I),
        re.compile(r"Initial\s+password\s*[:：]\s*(\S+)", re.I),
        re.compile(r"Username\s*[:：]\s*(\S+)", re.I),
        re.compile(r"Password\s*[:：]\s*(\S+)", re.I),
    ]
    for f in log_files:
        if not f or not os.path.isfile(f):
            continue
        content = _safe_read(f, 500 * 1024)
        for i, pat in enumerate(patterns):
            m = pat.search(content)
            if m:
                val = m.group(1)
                if i % 2 == 0:
                    out["username"] = val
                else:
                    out["password"] = val
                    out["source"] = os.path.basename(f)
                    out["password_changed"] = False
    return out


def setup_astrbot_platform():
    """写入/校验 cmd_config.json 的 aiocqhttp 平台 + wake_prefix; 返回 (ok, message, detail)"""
    cfg_path = CONFIG["astrbot"]["cmd_config"]
    if not os.path.isfile(cfg_path):
        return False, f"cmd_config.json 不存在: {cfg_path}", None
    try:
        raw_bytes = Path(cfg_path).read_bytes()
    except Exception as e:
        return False, f"读取失败: {e}", None
    backup_path = _backup_raw_file(cfg_path)
    try:
        cfg = json.loads(raw_bytes.decode("utf-8-sig"))
    except Exception as e:
        return False, f"cmd_config.json 解析失败: {e}", backup_path
    a = CONFIG["astrbot"]
    platform = {
        "id": a["platform_id"],
        "type": a["platform_type"],
        "enable": True,
        "ws_reverse_host": a["ws_host"],
        "ws_reverse_port": a["ws_port"],
        "ws_reverse_token": a["ws_token"],
    }
    changed = False
    changes = []
    platforms = cfg.get("platform")
    if not isinstance(platforms, list):
        cfg["platform"] = []
        platforms = cfg["platform"]
        changed = True
        changes.append("platform 数组不存在, 已创建")
    found = None
    for p in platforms:
        if isinstance(p, dict) and p.get("id") == a["platform_id"]:
            found = p
            break
    if found:
        if dict(found) != platform:
            found.update(platform)
            changed = True
            changes.append(f"更新平台 {a['platform_id']} → {a['ws_host']}:{a['ws_port']}")
    else:
        platforms.append(platform)
        changed = True
        changes.append(f"新增平台 {a['platform_id']} ({a['platform_type']}, {a['ws_host']}:{a['ws_port']})")
    if cfg.get("wake_prefix") != a["wake_prefix"]:
        cfg["wake_prefix"] = a["wake_prefix"]
        changed = True
        changes.append(f"wake_prefix → {a['wake_prefix']}")
    ps = cfg.get("platform_settings")
    if not isinstance(ps, dict):
        ps = {}
        cfg["platform_settings"] = ps
        changed = True
        changes.append("platform_settings 不存在, 已创建")
    if ps.get("friend_message_needs_wake_prefix", True) is not False:
        ps["friend_message_needs_wake_prefix"] = False
        changed = True
        changes.append("friend_message_needs_wake_prefix → false (私聊免前缀)")
    dash = cfg.get("dashboard")
    if isinstance(dash, dict):
        if dash.get("port") != a["dashboard"]["port"]:
            dash["port"] = a["dashboard"]["port"]
            changed = True
            changes.append(f"dashboard.port → {a['dashboard']['port']}")
        if dash.get("host") != a["dashboard"]["host"]:
            dash["host"] = a["dashboard"]["host"]
            changed = True
            changes.append(f"dashboard.host → {a['dashboard']['host']}")
    try:
        if changed:
            _atomic_write(cfg_path, json.dumps(cfg, ensure_ascii=False, indent=2))
    except Exception as e:
        return False, f"写入失败 (原文件未改动): {e}", backup_path
    detail = {
        "backup": backup_path,
        "changed": changed,
        "changes": changes if changed else ["无变更"],
    }
    return True, ("配置已写入 (无变更)" if not changed else "配置已更新"), detail


def astrbot_platform_ok():
    """检查 aiocqhttp 平台是否已配置且指向 ws_port"""
    try:
        cfg = json.loads(Path(CONFIG["astrbot"]["cmd_config"]).read_text(encoding="utf-8-sig"))
        for p in cfg.get("platform", []):
            if isinstance(p, dict) and p.get("id") == CONFIG["astrbot"]["platform_id"]:
                return bool(p.get("enable")) and int(p.get("ws_reverse_port", 0)) == CONFIG["astrbot"]["ws_port"]
    except Exception:
        pass
    return False


# ============ AstrBot 白名单/联系人 (对接 whitelist_manager 插件) ============
import urllib.request as _urllib_request
import urllib.error as _urllib_error

_ASTRBOT_WEBUI = "http://127.0.0.1:%d" % CONFIG["services"]["astrbot"]["webui_port"]
_ASTRBOT_LOGIN_USER = "astrbot"
_ASTRBOT_LOGIN_PWD = "astrbot123456"
_astrbot_token = {"value": None}


def _astrbot_login_token():
    if _astrbot_token["value"]:
        return _astrbot_token["value"]
    try:
        body = json.dumps({
            "username": _ASTRBOT_LOGIN_USER,
            "password": _ASTRBOT_LOGIN_PWD,
        }).encode()
        req = _urllib_request.Request(
            f"{_ASTRBOT_WEBUI}/api/v1/auth/login",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        with _urllib_request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read().decode("utf-8"))
        tok = data.get("data", {}).get("token") or data.get("token")
        if tok:
            _astrbot_token["value"] = tok
            return tok
    except Exception:
        pass
    return None


def _astrbot_api(path, method="GET", payload=None):
    token = _astrbot_login_token()
    if not token:
        return {"ok": False, "message": "无法登录 AstrBot (检查账号/密码)", "status": "unauthed"}
    url = f"{_ASTRBOT_WEBUI}/api/plug/whitelist_manager/{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = json.dumps(payload).encode() if payload is not None else None
    try:
        req = _urllib_request.Request(url, data=data, headers=headers, method=method)
        with _urllib_request.urlopen(req, timeout=8) as r:
            raw = r.read().decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {"ok": True, "raw": raw}
    except _urllib_error.HTTPError as e:
        if e.code == 401:
            _astrbot_token["value"] = None
            token2 = _astrbot_login_token()
            if token2:
                headers["Authorization"] = f"Bearer {token2}"
                req2 = _urllib_request.Request(url, data=data, headers=headers, method=method)
                try:
                    with _urllib_request.urlopen(req2, timeout=8) as r2:
                        return json.loads(r2.read().decode("utf-8"))
                except Exception:
                    pass
            return {"ok": False, "message": "AstrBot 未授权", "status": "unauthed"}
        try:
            body = e.read().decode("utf-8")
        except Exception:
            body = ""
        return {"ok": False, "message": f"AstrBot API 错误 {e.code}: {body[:200]}", "status": "error"}
    except Exception as e:
        return {"ok": False, "message": f"无法连接 AstrBot: {e}", "status": "error"}


def _hash_name_py(s):
    """与 wechat-bot bridge-integration.js hashId() 完全一致的 JS 式字符串哈希"""
    if not s:
        s = "unknown"
    h = 0
    for ch in str(s):
        h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
    return abs(h) + 10000


def whitelist_contacts():
    """微信联系人/群列表 (wechat + 补全历史聊过的群 + 标记 chatted)"""
    from .logs_core import history_room_infos, _chat_names
    import time as _time
    data = _astrbot_api("contacts")
    if not isinstance(data, dict):
        data = {}
    if data.get("error"):
        return {"ok": False, "message": data["error"], "contacts": [], "rooms": []}
    base_rooms = data.get("rooms") or []
    base_contacts = data.get("contacts") or []
    now = _time.time()
    # wechat4u 只能同步"有消息进来的群", 其余群在消息记录里但当前 session 没加载。
    # 近期(默认 3 天)有消息的群 = 仍在群里的活跃群 (只标 fromUnsynced, 不标历史)
    # 更早的群 = 可能已退出 (标 fromHist 历史)
    hist_rooms = history_room_infos()
    known = {str(r.get("hashId")) for r in base_rooms}
    for item in hist_rooms:
        name = item["name"]
        h = _hash_name_py(name)
        if str(h) in known:
            continue
        last_active = item.get("lastActive") or 0
        is_recent = (now - last_active) <= 3 * 86400
        base_rooms.append({
            "name": name, "hashId": h, "id": name,
            "fromHist": not is_recent,
            "fromUnsynced": is_recent,
            "lastActive": last_active,
        })
    # 标记联系人是否在消息记录中出现过 (聊过=真实互动)
    chatted_names = _chat_names()
    for c in base_contacts:
        nm = c.get("name") or c.get("rawName") or ""
        c["chatted"] = nm in chatted_names
    # 给群补充历史活跃发言者 (成员名微信侧拿不到时, 前端可显示这些真实昵称)
    from .logs_core import room_active_members
    for r in base_rooms:
        rm = r.get("name") or ""
        if rm:
            r["activeNames"] = room_active_members(rm)
    # 群成员名合并: bot 侧 members 常缺名 ("未知名成员"), 用消息记录真实昵称补齐,
    # 构造 memberList = 真实名去重后的完整成员列表 (带 hashId, 可直接勾选进白名单)
    for r in base_rooms:
        rm = r.get("name") or ""
        if not rm:
            continue
        existing = {}
        for m in r.get("members") or []:
            mn = (m.get("name") or "").strip()
            if not mn or mn == "未知名成员":
                continue
            existing[mn] = {"rawId": m.get("rawId") or mn, "name": mn, "hashId": _hash_name_py(mn), "source": "wechat"}
        for n in r.get("activeNames") or []:
            n = (n or "").strip()
            if n and n not in existing and n != rm:
                existing[n] = {"rawId": n, "name": n, "hashId": _hash_name_py(n), "source": "messages"}
        r["memberList"] = list(existing.values())
        # 统计拿不到名字的 bot 侧成员数 (前端折叠显示)
        r["unknownMemberCount"] = sum(
            1 for m in (r.get("members") or []) if not (m.get("name") or "").strip() or (m.get("name") or "").strip() == "未知名成员"
        )
        # 人数兜底: wechat4u 未同步的群 (fromUnsynced) 没有 memberCount/members,
        # 用 memberList(消息记录真实名) + 未知名成员数 估算总人数, 避免显示 0
        total = len(r["memberList"]) + r["unknownMemberCount"]
        cur = r.get("memberCount")
        if not isinstance(cur, int) or cur <= 0:
            r["memberCount"] = total
    return {"ok": True, "contacts": base_contacts, "rooms": base_rooms}


def whitelist_get():
    """当前白名单/管理员 + 名字反查映射"""
    data = _astrbot_api("whitelist", method="GET")
    if not isinstance(data, dict) or "chatIds" not in data:
        return data
    try:
        cfg_path = CONFIG["astrbot"]["cmd_config"]
        if os.path.isfile(cfg_path):
            raw = json.loads(Path(cfg_path).read_text(encoding="utf-8-sig"))
            supers = [str(x) for x in raw.get("super_admins_id") or []]
            data["superAdminIds"] = supers
    except Exception:
        data["superAdminIds"] = []
    chat_ids = [str(x) for x in data.get("chatIds", [])]
    admin_ids = [str(x) for x in data.get("adminIds", [])]
    name_map = {}
    try:
        contacts_resp = _astrbot_api("contacts")
        items = []
        if isinstance(contacts_resp, dict):
            items = (contacts_resp.get("contacts") or []) + (contacts_resp.get("rooms") or [])
        for it in items:
            nm = it.get("name") or it.get("rawName") or ""
            if not nm:
                continue
            h = _hash_name_py(nm)
            name_map[str(h)] = nm
    except Exception:
        pass
    data["nameMap"] = name_map
    data["chatNames"] = [name_map.get(x, x) for x in chat_ids]
    data["adminNames"] = [name_map.get(x, x) for x in admin_ids]
    data["superAdminNames"] = [name_map.get(x, x) for x in data.get("superAdminIds", [])]
    return data


def whitelist_save(chat_ids, admin_ids, excluded_group_members=None):
    payload = {"chatIds": chat_ids, "adminIds": admin_ids}
    if excluded_group_members:
        payload["excludedGroupMembers"] = excluded_group_members
    return _astrbot_api("whitelist", method="POST", payload=payload)