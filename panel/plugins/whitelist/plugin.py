# -*- coding: utf-8 -*-
"""白名单与管理员 插件"""
from ..base import FeaturePlugin


class WhitelistPlugin(FeaturePlugin):
    id = "whitelist"
    name = "白名单与管理员"
    description = "白名单/管理员/超管"
    version = "1.0.0"

    def register(self, app):
        from panel.routes.whitelist import register as _register
        _register(app)
