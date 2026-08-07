# -*- coding: utf-8 -*-
"""状态概览 插件"""
from ..base import FeaturePlugin


class StatusPlugin(FeaturePlugin):
    id = "status"
    name = "状态概览"
    description = "概览/状态/环境/服务/系统信息"
    version = "1.0.0"

    def register(self, app):
        from panel.routes.status import register as _register
        _register(app)
