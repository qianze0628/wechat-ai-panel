# -*- coding: utf-8 -*-
"""服务进程管理: PID/端口/启停/健康检查/持久化运行记录/派生进程"""
import os
import subprocess
import threading
import time
from pathlib import Path

from .config import BASE_DIR, CONFIG

# ============ 服务进程管理 ============
# 记录本面板启动的进程 PID (面板重启后无法找回旧进程, 只能按端口判断)
PROCS = {}
_LOCK = threading.Lock()

# 运行记录: 持久化到 runtime/instances.json, 面板重启后仍能识别自身服务进程
INSTANCE_FILE = BASE_DIR / "runtime" / "instances.json"

CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
_env_extra = None


def _load_instances():
    try:
        if INSTANCE_FILE.exists():
            return json_loads(INSTANCE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def json_loads(s):
    import json
    return json.loads(s)


def _save_instances(data):
    import json
    try:
        INSTANCE_FILE.parent.mkdir(parents=True, exist_ok=True)
        INSTANCE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[panel] 运行记录保存失败: {e}")


def record_service_start(label, pid, cmd, cwd, stdout_log, stderr_log):
    """记录服务启动信息到持久化运行记录"""
    with _LOCK:
        data = _load_instances()
        data[label] = {
            "service": label,
            "pid": pid,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "command": list(cmd),
            "working_directory": str(cwd),
            "stdout_log": str(stdout_log),
            "stderr_log": str(stderr_log),
        }
        _save_instances(data)


def clear_service_record(label):
    with _LOCK:
        data = _load_instances()
        if label in data:
            del data[label]
            _save_instances(data)


def pid_exists(pid):
    try:
        import ctypes
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        h = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, int(pid))
        if not h:
            return False
        ctypes.windll.kernel32.CloseHandle(h)
        return True
    except Exception:
        try:
            r = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"], capture_output=True,
                               text=True, timeout=5, creationflags=CREATE_NO_WINDOW)
            return str(pid) in r.stdout
        except Exception:
            return False


def get_pid_cmdline(pid):
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             f"(Get-CimInstance Win32_Process -Filter 'ProcessId={pid}').CommandLine"],
            capture_output=True, text=True, timeout=8,
            creationflags=CREATE_NO_WINDOW,
        )
        return (r.stdout or "").strip()
    except Exception:
        return ""


def get_recorded_pid(label):
    data = _load_instances()
    rec = data.get(label)
    if not rec or not rec.get("pid"):
        return None
    pid = rec["pid"]
    if not pid_exists(pid):
        return None
    cmdline = get_pid_cmdline(pid)
    if not cmdline:
        return pid
    record_cmd = " ".join(rec.get("command", []))
    tokens = [t for t in record_cmd.split() if t and not t.lower().endswith((".exe", ".cmd", ".py"))]
    tokens = tokens or record_cmd.split()
    if any(t and t.lower() in cmdline.lower() for t in tokens[:4]):
        return pid
    wd = rec.get("working_directory", "")
    if wd and wd.lower().replace("/", "\\") in cmdline.lower().replace("/", "\\"):
        return pid
    return None


# ============ 端口检测 ============
def port_listening(port: int) -> bool:
    try:
        r = subprocess.run(
            ["netstat", "-ano"], capture_output=True, text=True, shell=True,
            timeout=10, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        for line in r.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2 and "LISTENING" in line:
                local = parts[1] if parts[0] in ("TCP", "UDP") else parts[1]
                try:
                    if str(local).endswith(f":{port}"):
                        return True
                except Exception:
                    pass
        return False
    except Exception:
        return False


def get_pid_on_port(port: int):
    try:
        r = subprocess.run(
            ["netstat", "-ano"], capture_output=True, text=True, shell=True,
            timeout=10, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        for line in r.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 5 and "LISTENING" in line:
                local = parts[1]
                if str(local).endswith(f":{port}"):
                    return int(parts[-1])
        return None
    except Exception:
        return None


def kill_pid(pid: int, tree: bool = False):
    try:
        args = ["taskkill", "/F", "/PID", str(pid)]
        if tree:
            args.insert(1, "/T")
        subprocess.run(
            args, capture_output=True, timeout=10,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        return True
    except Exception:
        return False


# ============ 派生进程 & 启动 ============
def _base_env():
    global _env_extra
    if _env_extra is None:
        _env_extra = {
            "PYTHONIOENCODING": "utf-8",
            "ASTRBOT_MCP_INIT_TIMEOUT": "300",
            "ASTRBOT_ENABLE_MCP_TIMEOUT": "300",
            **os.environ.copy(),
        }
    return dict(_env_extra)


def _spawn(args, cwd, stdout_log, stderr_log, label):
    from .config import LOG_DIR
    os.makedirs(LOG_DIR, exist_ok=True)
    Path(stdout_log).parent.mkdir(parents=True, exist_ok=True)
    Path(stderr_log).parent.mkdir(parents=True, exist_ok=True)
    fout = open(stdout_log, "a", encoding="utf-8", errors="replace")
    ferr = open(stderr_log, "a", encoding="utf-8", errors="replace")
    try:
        p = subprocess.Popen(
            args,
            cwd=cwd,
            env=_base_env(),
            stdout=fout,
            stderr=ferr,
            creationflags=CREATE_NO_WINDOW,
        )
    except Exception:
        fout.close()
        ferr.close()
        raise
    with _LOCK:
        PROCS[label] = p
    record_service_start(label, p.pid, args, cwd, stdout_log, stderr_log)
    return p


def start_astrbot():
    exe = ""
    for cand in [
        os.path.expanduser(r"~\AppData\Roaming\uv\tools\astrbot\Scripts\astrbot.exe"),
        _which("astrbot"),
    ]:
        if cand and os.path.exists(cand):
            exe = cand
            break
    if not exe:
        return False, "astrbot 未安装, 请先安装"
    logs = _log_paths()
    p = _spawn(
        [exe, "run"],
        cwd=CONFIG["astrbot_root"],
        stdout_log=logs["astrbot_stdout"],
        stderr_log=logs["astrbot_stderr"],
        label="astrbot",
    )
    return True, f"AstrBot 已启动 (PID {p.pid}), 工作目录 {CONFIG['astrbot_root']}"


def start_wechat_bot():
    node = _which("node")
    if not node:
        return False, "node 未安装"
    pkg = os.path.join(CONFIG["wechat_bot_dir"], "package.json")
    if not os.path.isfile(pkg):
        return False, f"wechat-bot 不存在: {CONFIG['wechat_bot_dir']}"
    logs = _log_paths()
    serve = CONFIG.get("wechat_bot_serve", "ChatGPT")
    p = _spawn(
        [node, "./cli.js", "start", "-s", serve],
        cwd=CONFIG["wechat_bot_dir"],
        stdout_log=logs["wechat_stdout"],
        stderr_log=logs["wechat_stderr"],
        label="wechat",
    )
    return True, f"wechat-bot 已启动 (PID {p.pid})"


def start_qr_server():
    node = _which("node")
    if not node:
        return False, "node 未安装"
    if not os.path.isfile(CONFIG["qr_server_script"]):
        return False, f"qr-server.js 不存在: {CONFIG['qr_server_script']}"
    logs = _log_paths()
    p = _spawn(
        [node, CONFIG["qr_server_script"]],
        cwd=os.path.dirname(CONFIG["qr_server_script"]) or CONFIG["project_root"],
        stdout_log=logs["qr_stdout"],
        stderr_log=logs["qr_stderr"],
        label="qr",
    )
    return True, f"qr-server 已启动 (PID {p.pid})"


def _service_ports(name):
    if name == "astrbot":
        s = CONFIG["services"]["astrbot"]
        return [s["webui_port"], s["ws_port"]]
    if name == "wechat":
        return [CONFIG["services"]["wechat"]["api_port"]]
    if name == "qr":
        return [CONFIG["services"]["qr"]["port"]]
    return []


def _force_stop_ports(ports):
    pids = set()
    for port in ports:
        pid = get_pid_on_port(port)
        if pid:
            pids.add(pid)
    for pid in pids:
        kill_pid(pid, tree=True)


def stop_service(name):
    if name not in ("astrbot", "wechat", "qr"):
        return False, f"未知服务: {name}", None
    detail = {"method": None, "pids": [], "skipped": []}
    rec_pid = get_recorded_pid(name)
    if rec_pid:
        detail["method"] = "instance-record"
        if kill_pid(rec_pid, tree=True):
            detail["pids"].append(rec_pid)
        clear_service_record(name)
    port_pids = []
    for port in _service_ports(name):
        pid = get_pid_on_port(port)
        if pid and pid not in port_pids:
            port_pids.append(pid)
    if not detail["pids"] and not port_pids:
        return True, f"{name} 未在运行", detail
    for pid in port_pids:
        if pid in detail["pids"]:
            continue
        if name in ("astrbot", "wechat", "qr"):
            rec = _load_instances().get(name)
            if rec and pid != rec.get("pid"):
                cmdline = get_pid_cmdline(pid)
                rec_cmd = " ".join(rec.get("command", []))
                tokens = [t for t in rec_cmd.split() if t and not t.lower().endswith((".exe", ".cmd", ".py"))]
                if not any(t and t.lower() in cmdline.lower() for t in tokens[:4]):
                    detail["skipped"].append(pid)
                    continue
        if kill_pid(pid, tree=True):
            detail["pids"].append(pid)
    clear_service_record(name)
    if not detail["pids"]:
        skipped = f" (跳过非本实例进程 {', '.join(map(str, detail['skipped']))})" if detail["skipped"] else ""
        return True, f"{name} 无本实例进程可停止{skipped}", detail
    skipped = f" (跳过非本实例进程 {', '.join(map(str, detail['skipped']))})" if detail["skipped"] else ""
    return True, f"{name} 已停止 (PID {', '.join(map(str, detail['pids']))}){skipped}", detail


def wait_port(port, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if port_listening(port):
            return True
        time.sleep(0.5)
    return False


def http_ok(url, timeout=5):
    import urllib.request
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "panel-healthcheck"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return 200 <= r.status < 400
    except Exception:
        return False


def wait_http_ok(url, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if http_ok(url):
            return True
        time.sleep(1)
    return False


def health_check(service):
    s = CONFIG["services"]
    if service == "astrbot":
        webui = port_listening(s["astrbot"]["webui_port"])
        ws = port_listening(s["astrbot"]["ws_port"])
        webui_http = wait_http_ok(f"http://127.0.0.1:{s['astrbot']['webui_port']}", timeout=5)
        return (webui and ws and webui_http), {
            "webui_port": webui, "ws_port": ws, "webui_http": webui_http,
            "detail": "WebUI 端口 + WS 端口 + WebUI HTTP 响应" if (webui and ws and webui_http) else "不健康",
        }
    if service == "wechat":
        port = s["wechat"]["api_port"]
        api = http_ok(f"http://127.0.0.1:{port}/api/status", timeout=5)
        return api, {"api_http": api, "detail": "GET /api/status 正常" if api else "API 无响应"}
    if service == "qr":
        port = s["qr"]["port"]
        st = http_ok(f"http://127.0.0.1:{port}/status", timeout=5)
        return st, {"status_http": st, "detail": "GET /status 正常" if st else "API 无响应"}
    return False, {"detail": "未知服务"}


def wait_health(service, timeout=40):
    deadline = time.time() + timeout
    while time.time() < deadline:
        ok, _ = health_check(service)
        if ok:
            return True
        time.sleep(1)
    return False


# ============ 服务状态 ============
def service_status():
    s = CONFIG["services"]
    return {
        "astrbot": {
            "running": port_listening(s["astrbot"]["webui_port"]),
            "webui_port": s["astrbot"]["webui_port"],
            "ws_port": s["astrbot"]["ws_port"],
            "pid": get_pid_on_port(s["astrbot"]["webui_port"]),
        },
        "wechat": {
            "running": port_listening(s["wechat"]["api_port"]),
            "api_port": s["wechat"]["api_port"],
            "pid": get_pid_on_port(s["wechat"]["api_port"]),
        },
        "qr": {
            "running": port_listening(s["qr"]["port"]),
            "port": s["qr"]["port"],
            "pid": get_pid_on_port(s["qr"]["port"]),
        },
    }


# 依赖（延迟避免循环 import）
def _which(name):
    from .env import _which as _w
    return _w(name)


def _log_paths():
    return CONFIG.get("logs", {})