# ===== Start-Chrome-9222.ps1 =====
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$ud     = "D:\ChromeDebugProfile"     # ← 你想长期使用的目录（可改）
$port   = 9222                        # 如被占用可改成 9223/9224...
$addr   = "0.0.0.0"

# 关闭现有 Chrome（可能会把所有 Chrome 都关掉，注意保存）
# taskkill /IM chrome.exe /F

# 1) 确保目录存在
New-Item -ItemType Directory -Path $ud -Force | Out-Null

# 2) 启动（独立实例 + 强制IPv4）
& $chrome `
  --remote-debugging-port=$port `
  --remote-debugging-address=$addr `
  --user-data-dir="$ud" `
  --no-first-run --no-default-browser-check

# 3) 简单校验（可选）
# Start-Process "http://${addr}:${port}/json/version"
