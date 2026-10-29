$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c call "C:\PROJETOS IA\AGENDA CTO\scripts\run-daily-analysis.bat"' -WorkingDirectory "C:\PROJETOS IA\AGENDA CTO"
$Trigger = New-ScheduledTaskTrigger -Daily -At 8:00AM
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "AnaliseVisitasAA" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Relatório Diário de Visitas AA às 08:00" -Force
Write-Host "Tarefa AnaliseVisitasAA agendada com sucesso para todos os dias às 08:00!"
