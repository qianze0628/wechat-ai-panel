# -*- coding: utf-8 -*-
"""消息记录 插件"""
from ..base import FeaturePlugin


class MessagesPlugin(FeaturePlugin):
    id = "messages"
    name = "消息记录"
    description = "微信消息记录"
    version = "1.0.0"
    nav = {"to": "/plugin/messages", "label": "插件示例：消息记录", "icon": "Puzzle"}

    def register(self, app):
        from panel.routes.messages import register as _register
        _register(app)
