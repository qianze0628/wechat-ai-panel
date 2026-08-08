# -*- coding: utf-8 -*-
"""更新检测路由: /api/update-check + /api/update/download-info

- 检测 GitHub latest release (含更新日志 release notes)
- 按用户 IP 地区判断是否走国内镜像下载 (ipinfo.io 优先 → gh-proxy 前缀)
"""
import json
import urllib.request

GH_REPO = "qianze0628/wechat-ai-panel-go"
_MIRROR_PROXY = "https://gh-proxy.com/"


def _http_get_json(url, timeout=15):
    """GET JSON (带 UA), 失败抛异常"""
    req = urllib.request.Request(url, headers={
        "User-Agent": "wechat-ai-panel-updater",
        "Accept": "application/vnd.github+json",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read(2 * 1024 * 1024).decode("utf-8", "replace"))


def _version_is_newer(latest, current):
    def parse(v):
        v = v.lstrip("v")
        out = []
        for part in v.split("."):
            num = ""
            for c in part:
                if c.isdigit():
                    num += c
                else:
                    break
            out.append(int(num) if num else 0)
        return out

    l, c = parse(latest), parse(current)
    for i in range(max(len(l), len(c))):
        lv = l[i] if i < len(l) else 0
        cv = c[i] if i < len(c) else 0
        if lv != cv:
            return lv > cv
    return False


def _detect_region():
    """按 IP 判断地区 (ipinfo.io 优先; 失败回退; 全失败 unknown)"""
    for url in ("https://ipinfo.io/json",
                "http://ip-api.com/json/?fields=countryCode",
                "https://ipapi.co/json/"):
        try:
            data = _http_get_json(url, timeout=6)
            for key in ("country", "countryCode", "country_code"):
                cc = data.get(key)
                if cc:
                    return str(cc).upper()
        except Exception:
            continue
    return "unknown"


def register(app):
    @app.get("/api/update-check")
    def api_update_check(version: str = ""):
        """检测更新: /api/update-check?version=v0.1.9"""
        try:
            rel = _http_get_json(f"https://api.github.com/repos/{GH_REPO}/releases/latest")
        except Exception as e:
            from fastapi.responses import JSONResponse
            return JSONResponse({"ok": False, "message": f"请求 GitHub 失败: {e}"}, status_code=502)
        latest = rel.get("tag_name", "")
        has = _version_is_newer(latest, version)
        return {
            "has_update": has or latest.lstrip("v") != version.lstrip("v"),
            "current_version": version,
            "latest": {
                "tag_name": latest,
                "name": rel.get("name", ""),
                "published_at": rel.get("published_at", ""),
                "body": rel.get("body", ""),   # 更新日志
                "html_url": rel.get("html_url", ""),
                "assets": rel.get("assets", []),
            },
            "message": "发现新版本" if has else "已是最新版本",
        }

    @app.get("/api/update/download-info")
    def api_download_info(asset: str = ""):
        """下载信息 (含镜像判断): /api/update/download-info?asset=xxx.zip"""
        direct = f"https://github.com/{GH_REPO}/releases/latest/download/{asset}"
        region = _detect_region()
        info = {"region": region, "use_mirror": False, "mirror_prefix": "", "direct_url": direct, "final_url": direct}
        if region == "CN":
            info["use_mirror"] = True
            info["mirror_prefix"] = _MIRROR_PROXY
            info["final_url"] = _MIRROR_PROXY + direct
        return info