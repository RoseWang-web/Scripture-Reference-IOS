# 腳本名稱: Load-Env.ps1
# 說明: 讀取指定的 .env 檔案，並將其變數設定到當前 PowerShell 會話中。

# 確保檔案存在
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "Error: .env file not found at '$envFile'"
    exit 1
}

# 讀取檔案內容
$content = Get-Content $envFile

foreach ($line in $content) {
    # 忽略空行和註解行 (# 開頭)
    if ($line -notmatch '^\s*#' -and $line -notmatch '^\s*$' -and $line -match '=') {
        
        # 尋找第一個等號 (=) 的位置
        $splitIndex = $line.IndexOf('=')
        $key = $line.Substring(0, $splitIndex).Trim()
        
        # 取得值 (包含等號後面的所有內容)
        # 注意: 我們需要移除首尾的引號，但保留值內部的任何空格或其他符號
        $value = $line.Substring($splitIndex + 1).Trim().Trim('"').Trim("'")
        
        # 使用 $env: 前綴設定環境變數
        # 這會將變數設定到當前進程及其子進程的環境中
        $env:$key = $value
        
        # 可選：輸出已載入的變數
        Write-Host "✅ Loaded environment variable: $key"
    }
}

Write-Host "`nSuccessfully loaded environment variables from $envFile."
