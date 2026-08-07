# -*- coding: utf-8 -*-
"""插件注册器: 自动发现 panel/plugins/ 下的插件并注册到 FastAPI

- 扫描 panel/plugins/ 下每个含 plugin.py 的子目录
- plugin.py 内定义 FeaturePlugin 子类即视为一个插件
- 目录重命名为 <name>.dis 即禁用 (HypeR_Bot 风格一键启停)
"""
import importlib
import importlib.util
import pathlib

from .base import FeaturePlugin

PLUGINS_DIR = pathlib.Path(__file__).resolve().parent

# 已加载的插件实例列表
registry: list[FeaturePlugin] = []


def _dir_plugin_names():
    """返回启用插件目录名 (含 plugin.py, 非 .dis, 排序)"""
    out = []
    for entry in PLUGINS_DIR.iterdir():
        if not entry.is_dir() or entry.name.endswith(".dis"):
            continue
        if (entry / "plugin.py").exists():
            out.append(entry.name)
    return sorted(out)


def _load_plugin(name: str) -> FeaturePlugin | None:
    """导入 panel.plugins.<name>.plugin 并实例化 FeaturePlugin 子类"""
    try:
        module = importlib.import_module(f"panel.plugins.{name}.plugin")
    except ModuleNotFoundError:
        path = PLUGINS_DIR / name / "plugin.py"
        spec = importlib.util.spec_from_file_location(f"panel.plugins.{name}.plugin", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    found = None
    for attr in dir(module):
        obj = getattr(module, attr)
        if isinstance(obj, type) and issubclass(obj, FeaturePlugin) and obj is not FeaturePlugin:
            found = obj
            break
    if found is None:
        print(f"[plugins] {name}: 未找到 FeaturePlugin 子类, 跳过")
        return None
    instance = found()
    print(f"[plugins] 已加载: {instance.id} ({instance.name})")
    return instance


def discover() -> list[FeaturePlugin]:
    """重新扫描并实例化全部启用插件"""
    global registry
    registry = [p for p in (_load_plugin(n) for n in _dir_plugin_names()) if p]
    return registry


def register_all(app) -> list[FeaturePlugin]:
    """确保插件被发现并全部注册到 app"""
    if not registry:
        discover()
    for plugin in registry:
        if not plugin.enabled:
            continue
        try:
            plugin.register(app)
        except Exception as e:
            print(f"[plugins] 注册失败 {plugin.id}: {e}")
    return registry


def get_registry() -> list[FeaturePlugin]:
    return registry