# -*- coding: utf-8 -*-
"""面板认证 插件"""
from ..base import FeaturePlugin


class AuthPlugin(FeaturePlugin):
    id = "auth"
    name = "面板认证"
    description = "登录与会话"
    version = "1.0.0"

    def register(self, app):
        from panel.routes.auth_route import register as _register
        _register(app)
