# -*- coding: utf-8 -*-
"""
微信 AI 机器人一键部署管理面板 (FastAPI)
端口 8080
入口: 组装 panel 包的应用 (配置/进程/环境/AstrBot/路由已模块化)
原单体版本备份在: app.py.monolith-backup
"""
import threading
import time

import uvicorn

from panel.app_factory import create_app
from panel.config import CONFIG
from panel.processes import health_check, start_astrbot, start_wechat_bot, start_qr_server

app = create_app()


def _auto_start_services():
    """面板启动时自动拉起已就绪的服务 (幂等: 已在跑则跳过)"""
    for name, fn in [("astrbot", start_astrbot), ("wechat", start_wechat_bot), ("qr", start_qr_server)]:
        try:
            ok, _ = health_check(name)
            if ok:
                print(f"[supervisor] {name} 已在运行, 跳过")
                continue
            ok2, msg = fn()
            print(f"[supervisor] 已自动拉起 {name}: {msg}" if ok2 else f"[supervisor] {name} 启动失败: {msg}")
        except Exception as e:
            print(f"[supervisor] {name} 启动异常: {e}")


def _supervise(interval=30):
    """后台守护: 每 interval 秒健康检查, 掉线自动重启 (5 分钟冷却防抖)"""
    cooldown = {}

    def _loop():
        while True:
            time.sleep(interval)
            for name, fn in [("astrbot", start_astrbot), ("wechat", start_wechat_bot), ("qr", start_qr_server)]:
                try:
                    ok, _ = health_check(name)
                    if ok:
                        continue
                    if name in cooldown and time.time() - cooldown[name] < 300:
                        print(f"[supervisor] {name} 掉线, 冷却期内跳过")
                        continue
                    cooldown[name] = time.time()
                    ok2, msg = fn()
                    print(f"[supervisor] {name} 掉线已自动拉起: {msg}" if ok2 else f"[supervisor] {name} 自动拉起失败: {msg}")
                except Exception as e:
                    print(f"[supervisor] {name} 检查异常: {e}")

    threading.Thread(target=_loop, daemon=True).start()


if __name__ == "__main__":
    port = int(CONFIG.get("port", 8080))
    # 服务守护: 启动自动拉起 + 每 30s 健康检查掉线自动恢复 (与 Go 版对齐)
    _auto_start_services()
    _supervise()
    print(f"[panel] 微信 AI 管理面板: http://localhost:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")