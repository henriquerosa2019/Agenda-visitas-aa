$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c ""C:\PROJETOS IA\AGENDA CTO\scripts\run-daily-analysis.bat""' -WorkingDirectory "C:\PROJETOS IA\AGENDA CTO"
$Trigger = New-ScheduledTaskTrigger -Daily -At 8:00AM
Register-ScheduledTask -TaskName "AnaliseVisitasAA" -Action $Action -Trigger $Trigger -Description "Relatório Diário de Visitas AA às 08:00" -Force
Write-Host "Tarefa AnaliseVisitasAA agendada com sucesso para todos os dias as 08:00!"
