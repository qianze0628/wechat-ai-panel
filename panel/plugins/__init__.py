# -*- coding: utf-8 -*-
"""内置功能插件 (可插拔): 自动发现 + 注册.

每个子目录含 plugin.py 定义一个 FeaturePlugin 子类 (id/name/register)。
新增插件: 拷贝示例插件目录, 实现 register(app) 即可, 无需改 app_factory。
禁用插件: 把目录重命名为 <name>.dis。
可用插件: 服务端 GET /api/plugins (由 plugins 插件提供)。
"""
# 确保 base/registry 可用于从外部 import
from .base import FeaturePlugin
from .registry import register_all, discover, get_registry

__all__ = ["FeaturePlugin", "register_all", "discover", "get_registry"]