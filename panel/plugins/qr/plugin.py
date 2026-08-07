# -*- coding: utf-8 -*-
"""二维码与配置 插件"""
from ..base import FeaturePlugin


class QrPlugin(FeaturePlugin):
    id = "qr"
    name = "二维码与配置"
    description = "扫码/凭据/OneBot配置/备份"
    version = "1.0.0"

    def register(self, app):
        from panel.routes.qr import register as _register
        _register(app)
