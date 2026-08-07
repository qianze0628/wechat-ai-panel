# -*- coding: utf-8 -*-
"""日志文件读取 / 微信消息记录"""
import json
import os
from pathlib import Path

from .config import CONFIG


def _log_paths():
    return CONFIG.get("logs", {})


def _safe_read(path, max_bytes=200 * 1024):
    """读取日志文件尾部 (防大文件撑爆内存), 返回最近 max_bytes 内容"""
    try:
        p = Path(path)
        if not p.exists():
            return ""
        size = p.stat().st_size
        if size <= max_bytes:
            return p.read_text(encoding="utf-8", errors="replace")
        with open(p, "rb") as f:
            f.seek(size - max_bytes)
            data = f.read()
        s = data.decode("utf-8", errors="replace")
        idx = s.find("\n")
        return s[idx + 1:] if idx != -1 else s
    except Exception:
        return ""


def _messages_path():
    return os.path.join(CONFIG["wechat_bot_dir"], ".data", "wechat", "messages.jsonl")


def read_messages(contact="", search="", limit=200):
    """读取微信消息记录 (messages.jsonl), 支持按联系人筛选和关键词搜索"""
    path = _messages_path()
    if not os.path.isfile(path):
        return {"ok": False, "message": f"消息记录不存在: {path}", "contacts": [], "messages": [], "total": 0}
    contacts = {}
    messages = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    m = json.loads(line)
                except Exception:
                    continue
                name = m.get("roomName") or m.get("talkerName") or ""
                text = m.get("text") or ""
                isText = bool(m.get("isText")) or bool(text.strip())
                item = {
                    "timestamp": m.get("timestamp", ""),
                    "type": m.get("type", 0),
                    "typeName": m.get("typeName", ""),
                    "isText": isText,
                    "room": m.get("isRoom", False),
                    "contact": name,
                    "talker": m.get("talkerName", ""),
                    "receiver": m.get("receiverName", ""),
                    "self": m.get("self", False),
                    "text": text,
                }
                if name:
                    if name not in contacts:
                        contacts[name] = {"count": 0, "room": bool(m.get("isRoom"))}
                    contacts[name]["count"] += 1
                if contact and name != contact:
                    continue
                if search:
                    q = search.lower()
                    hay = (text + " " + name + " " + m.get("talkerName", "")).lower()
                    if q not in hay:
                        continue
                messages.append(item)
    except Exception as e:
        return {"ok": False, "message": f"读取消息失败: {e}", "contacts": sorted(contacts.items()), "messages": [], "total": 0}
    # 按时间正序 (旧的在前); limit 取最近 N 条后仍按正序
    messages = sorted(messages, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
    messages = sorted(messages, key=lambda x: x.get("timestamp", ""))
    return {
        "ok": True,
        "path": path,
        "total": len(messages),
        "contacts": [{"name": k, "count": v["count"], "room": v["room"]} for k, v in
                     sorted(contacts.items(), key=lambda kv: kv[1]["count"], reverse=True)],
        "messages": messages,
    }


def _chat_names():
    """从 messages.jsonl 提取所有出现过的联系人名 (私聊/群成员, 用于标记 chatted)"""
    path = _messages_path()
    if not os.path.isfile(path):
        return set()
    names = set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    m = json.loads(line)
                except Exception:
                    continue
                t = m.get("talkerName") or m.get("contact") or ""
                r = m.get("receiverName") or ""
                if t:
                    names.add(t)
                if r and m.get("self"):
                    names.add(r)
    except Exception:
        pass
    return names


def room_active_members(room_name: str, limit: int = 30):
    """返回某群在消息记录中的活跃发言者名 (按条数降序, 去重)"""
    path = _messages_path()
    if not os.path.isfile(path):
        return []
    counts = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    m = json.loads(line)
                except Exception:
                    continue
                if m.get("isRoom") and (m.get("roomName") or "") == room_name:
                    t = m.get("talkerName") or ""
                    if t and t != room_name:  # 排除群名自身
                        counts[t] = counts.get(t, 0) + 1
    except Exception:
        return []
    top = sorted(counts.items(), key=lambda kv: -kv[1])
    return [n for n, _ in top[:limit]]


def history_room_names(active_days: int = 30):
    """从 messages.jsonl 提取历史聊过的群名 (带条数排序).

    仅补最近 active_days 天内有消息的群, 避免已退出的群长期显示.
    """
    import time as _time
    path = _messages_path()
    if not os.path.isfile(path):
        return []
    counts = {}
    last_ts = {}
    now = _time.time()
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    m = json.loads(line)
                except Exception:
                    continue
                if m.get("isRoom"):
                    rm = (m.get("roomName") or "").strip()
                    if rm:
                        counts[rm] = counts.get(rm, 0) + 1
                        ts = m.get("timestamp") or ""
                        if ts:
                            # ISO 时间 → epoch (容错)
                            try:
                                import datetime
                                dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
                                ep = dt.timestamp()
                                if ep > last_ts.get(rm, 0):
                                    last_ts[rm] = ep
                            except Exception:
                                pass
    except Exception:
        return []
    # 过滤: 只保留最近 active_days 天内有消息的群
    out = []
    for n, _ in sorted(counts.items(), key=lambda kv: -kv[1]):
        t = last_ts.get(n, 0)
        if not t or (now - t) <= active_days * 86400:
            out.append(n)
    return out