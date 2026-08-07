# -*- coding: utf-8 -*-
"""依赖安装 插件"""
from ..base import FeaturePlugin


class InstallPlugin(FeaturePlugin):
    id = "install"
    name = "依赖安装"
    description = "多平台依赖安装引擎"
    version = "1.0.0"
    nav = {"to": "/plugin/install", "label": "依赖安装（插件）", "icon": "Puzzle"}

    def register(self, app):
        from panel.routes.install import register as _register
        _register(app)
