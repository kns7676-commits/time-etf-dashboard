# Run locally. The bot token is read securely, used in memory, and never printed or saved.
$ErrorActionPreference = 'Stop'
$secureToken = Read-Host 'BotFather token (hidden input)' -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $botToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    $updates = Invoke-RestMethod -Method Get -Uri ('https://api.telegram.org/bot' + $botToken + '/getUpdates')
    $chats = @($updates.result | ForEach-Object { $_.message.chat } | Where-Object { $_.type -eq 'private' } | Sort-Object id -Unique)
    if ($chats.Count -eq 0) {
        Write-Host 'Open your new bot in Telegram, send /start, then run this script again.'
    } else {
        Write-Host 'Select your own private chat ID for TELEGRAM_CHAT_ID:'
        $chats | Select-Object id, first_name, username | Format-Table
        Write-Host 'Store the token in GitHub Actions secret TELEGRAM_BOT_TOKEN. Do not paste it into chat.'
    }
} catch {
    Write-Host 'Connection failed. Check the bot token, internet connection and /start message. Token not logged.'
    exit 1
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
    $botToken = $null
}
