# -*- coding: utf-8 -*-
"""设置插件: 面板设置读写 (认证开关/备份开关/开机自启)"""
from ..base import FeaturePlugin


class SettingsPlugin(FeaturePlugin):
    id = "settings"
    name = "面板设置"
    description = "面板设置读写 (认证开关/备份开关/开机自启/可编辑配置)"
    version = "1.0.0"

    def register(self, app):
        from panel.routes.settings import register as _register
        from panel.routes.autostart import register as _register_autostart

        _register(app)
        _register_autostart(app)
