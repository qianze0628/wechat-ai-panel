# -*- coding: utf-8 -*-
"""更新检测 插件"""
from ..base import FeaturePlugin


class UpdatePlugin(FeaturePlugin):
    id = "update"
    name = "更新检测"
    description = "检测 GitHub 最新版本 + 按 IP 选择国内镜像下载"
    version = "1.0.0"

    def register(self, app):
        from panel.routes.update import register as _register
        _register(app)