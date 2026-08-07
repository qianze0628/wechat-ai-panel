# -*- coding: utf-8 -*-
"""插件基类与元数据

FeaturePlugin: 功能插件基类, 声明平台无关的元数据 + FastAPI 路由注册器。
任何文件夹内含 FeaturePlugin 子类的模块都会被 registry 自动发现并注册。
"""


class FeaturePlugin:
    # 插件标识 (唯一, 对应 panel/plugins/<id> 目录名)
    id: str = ""
    # 展示名
    name: str = ""
    # 描述
    description: str = ""
    # 版本
    version: str = "1.0.0"
    # 是否默认启用
    enabled: bool = True
    # 前端导航声明 (可选): 若提供, 前端可在侧边栏显示
    # { to, label, icon, description }
    nav: dict = None

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        # 自动收集所有 FeaturePlugin 子类 (注册器扫描时使用)

    def register(self, app):
        """子类实现: 在 FastAPI app 上注册路由"""
        raise NotImplementedError

    def meta(self):
        """返回插件元数据 (用于 /api/plugins 状态接口)"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "enabled": self.enabled,
            "nav": self.nav,
        }