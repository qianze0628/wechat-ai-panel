# -*- coding: utf-8 -*-
"""日志路由: /api/logs /api/logs/stream (SSE)"""
import json
import os
import time

from fastapi import Query
from fastapi.responses import StreamingResponse

from ..logs_core import _log_paths, _safe_read


def register(app):
    @app.get("/api/logs")
    def api_logs(service: str = Query("wechat")):
        logs = _log_paths()
        keys = {
            "astrbot": "astrbot_stdout",
            "astrbot_err": "astrbot_stderr",
            "wechat": "wechat_stdout",
            "wechat_err": "wechat_stderr",
            "qr": "qr_stdout",
            "qr_err": "qr_stderr",
        }
        key = keys.get(service, "wechat_stdout")
        path = logs.get(key, "")
        content = _safe_read(path)
        capture_key = {
            "wechat": "wechat_capture_log",
            "astrbot": "astrbot_capture_log",
        }.get(service, "")
        cap = logs.get(capture_key, "")
        if cap and cap != path and os.path.isfile(cap):
            cap_content = _safe_read(cap)
            if cap_content.strip():
                if content.strip():
                    content = cap_content.rstrip("\n") + "\n\n" + content
                else:
                    path = cap
                    content = cap_content
        return {"service": service, "path": path, "content": content}

    @app.get("/api/logs/stream")
    async def api_logs_stream(service: str = Query("wechat"), tail: int = Query(200)):
        logs = _log_paths()
        keys = {
            "astrbot": "astrbot_stdout",
            "wechat": "wechat_stdout",
            "qr": "qr_stdout",
        }
        path = logs.get(keys.get(service, "wechat_stdout"), "")
        if not (path and os.path.isfile(path) and os.path.getsize(path) > 100):
            fallback_key = {
                "wechat": "wechat_capture_log",
                "astrbot": "astrbot_capture_log",
            }.get(service, "")
            fb = logs.get(fallback_key, "")
            if fb and fb != path and os.path.isfile(fb):
                path = fb
        seen = 0

        def _read():
            nonlocal seen
            if not path or not os.path.isfile(path):
                return ""
            with open(path, "rb") as f:
                f.seek(0, os.SEEK_END)
                size = f.tell()
                if size == 0:
                    return ""
                start = max(0, size - 200 * 1024)
                f.seek(start)
                data = f.read()
            text = data.decode("utf-8", errors="replace")
            if start > 0:
                idx = text.find("\n")
                if idx != -1:
                    text = text[idx + 1:]
            return text

        def gen():
            nonlocal seen
            text = _read()
            lines = text.split("\n")[-tail:]
            yield f"data: {json.dumps({'lines': lines}, ensure_ascii=False)}\n\n"
            seen = len(text)
            while True:
                time.sleep(2)
                text = _read()
                if len(text) > seen:
                    chunk = text[seen:]
                    seen = len(text)
                    lines = chunk.split("\n")
                    if lines:
                        yield f"data: {json.dumps({'lines': lines}, ensure_ascii=False)}\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream")