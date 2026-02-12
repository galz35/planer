Set WshShell = WScript.CreateObject("WScript.Shell")

' 1. Abre la consola y lanza el comando SSH
' -o StrictHostKeyChecking=no evita que Windows pregunte si confía en el host la primera vez
WshShell.Run "cmd /c ssh -o StrictHostKeyChecking=no root@190.56.16.85", 1, False

' 2. Espera 3 segundos para que el servidor pida la clave
' Puedes subir este numero a 5000 si el internet es lento
WScript.Sleep 3000

' 3. Escribe la contraseña y presiona ENTER automáticamente
WshShell.SendKeys "92li!ra$Gu11{ENTER}"
