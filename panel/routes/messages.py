# -*- coding: utf-8 -*-
"""微信消息记录路由"""
from fastapi import Query

from ..logs_core import read_messages


def register(app):
    @app.get("/api/messages")
    def api_messages(contact: str = Query(""), search: str = Query(""), limit: int = Query(200)):
        return read_messages(contact=contact, search=search, limit=limit)