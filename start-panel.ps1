# ============================================
#  微信 AI 管理面板 - 启动脚本
#  检查依赖 -> 启动面板 (端口 8080)
# ============================================
$ErrorActionPreference = 'SilentlyContinue'

$PanelDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $PanelDir

Write-Host '=============================================='
Write-Host ' 微信 AI 管理面板 Launcher'
Write-Host '=============================================='

# 从 config.json 读取面板端口 (与 app.py 保持一致)
$port = 8080
try {
  $cfg = Get-Content (Join-Path $PanelDir 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($null -ne $cfg.port -and $cfg.port -is [int] -and $cfg.port -gt 0) {
    $port = [int]$cfg.port
  }
} catch {
  Write-Host "[WARN] config.json 读取失败, 使用默认端口 8080" -ForegroundColor Yellow
}
Write-Host "[0/3] 面板端口: $port (来自 config.json)"

# 1. 检查 python + fastapi
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
  Write-Host '[ERROR] 未找到 python, 请先安装 Python 3.10+' -ForegroundColor Red
  exit 1
}

# 2. 检查 fastapi / uvicorn (缺失则安装)
$hasFastapi = python -c "import fastapi, uvicorn" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host '[1/3] 安装 fastapi + uvicorn...' -ForegroundColor Yellow
  python -m pip install -r requirements.txt
  if ($LASTEXITCODE -ne 0) {
    Write-Host '[ERROR] 依赖安装失败' -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host '[1/3] 依赖已就绪 (fastapi + uvicorn)'
}

# 3. 端口冲突检测
$conflict = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($conflict) {
  Write-Host "[ERROR] 端口 $port 已被占用 (PID $($conflict.OwningProcess -join ','))" -ForegroundColor Red
  Write-Host '       请先停止占用进程, 或修改 config.json 的 port' -ForegroundColor Yellow
  exit 1
}

# 4. 启动面板
Write-Host '[2/3] 启动管理面板...' -ForegroundColor Yellow
$stdout = Join-Path $PanelDir 'logs\panel_boot.log'
$stderr = Join-Path $PanelDir 'logs\panel_boot_err.log'
New-Item -ItemType Directory -Force (Join-Path $PanelDir 'logs') | Out-Null

Start-Process python -ArgumentList 'app.py' -WorkingDirectory $PanelDir `
  -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden

Start-Sleep -Seconds 3

# 5. 打开浏览器
$c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($c) {
  Write-Host '[3/3] 面板已启动!' -ForegroundColor Green
  Start-Process "http://localhost:$port"
} else {
  Write-Host "[WARN] 面板可能仍在启动中, 手动打开 http://localhost:$port" -ForegroundColor Yellow
  Write-Host "       错误日志: $stderr" -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=============================================='
Write-Host " 管理面板: http://localhost:$port"
Write-Host ' 停止面板: 关闭后台 python 进程即可'
Write-Host '=============================================='
