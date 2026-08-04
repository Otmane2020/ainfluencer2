# Recrée la tâche planifiée quotidienne (déjà installée — utile après réinstallation).
# Modifie l'heure ci-dessous si besoin.

$TaskName = "EmoRobotTikTok"
$RunAt    = "10:00"

$Action = New-ScheduledTaskAction `
    -Execute (Get-Command python).Source `
    -Argument '"C:\Emo Robot\main.py"' `
    -WorkingDirectory "C:\Emo Robot"

$Trigger = New-ScheduledTaskTrigger -Daily -At $RunAt

$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Publication quotidienne EMO Robot FR sur TikTok" `
    -Force | Out-Null

Write-Host "Tache '$TaskName' enregistree - prochaine execution :" -ForegroundColor Green
(Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime
