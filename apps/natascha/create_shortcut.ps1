# NATASCHA Desktop-Shortcut erstellen
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\NATASCHA.lnk")

# Ziel: Windows Terminal mit WSL und NATASCHA
$Shortcut.TargetPath = "wt.exe"
$Shortcut.Arguments = '--title "NATASCHA" wsl bash -c "cd /mnt/c/Users/natas/OneDrive/Desktop/Natascha3 && .venv/bin/python natascha.py"'
$Shortcut.WorkingDirectory = "C:\Users\natas\OneDrive\Desktop\Natascha3"
$Shortcut.Description = "NATASCHA Schularbeits-Assistent"

# Icon: Windows Terminal Icon
$Shortcut.IconLocation = "C:\Users\natas\AppData\Local\Microsoft\WindowsApps\wt.exe,0"

$Shortcut.Save()
Write-Host "Shortcut erstellt: $DesktopPath\NATASCHA.lnk"
