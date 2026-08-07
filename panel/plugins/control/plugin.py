# -*- coding: utf-8 -*-
"""服务控制 插件"""
from ..base import FeaturePlugin


class ControlPlugin(FeaturePlugin):
    id = "control"
    name = "服务控制"
    description = "服务启停/重启/健康"
    version = "1.0.0"

    def register(self, app):
        from panel.routes.control import register as _register
        _register(app)
