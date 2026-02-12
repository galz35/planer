@echo off
:: Script para conectar por SSH automaticamente
set "PASS=92li!ra$Gu11"
set "IP=190.56.16.85"
set "USER=root"

echo Conectando a %IP%...
echo Espera unos segundos a que se escriba la clave sola...

:: Crear un pequeño script temporal de VBScript para automatizar el teclado
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%temp%\conectar.vbs"
echo WScript.Sleep 500 >> "%temp%\conectar.vbs"
:: Inicia SSH en una nueva ventana
echo WshShell.Run "cmd /c ssh %USER%@%IP%", 1, False >> "%temp%\conectar.vbs"
echo WScript.Sleep 3000 >> "%temp%\conectar.vbs"
:: Envia la contraseña
echo WshShell.SendKeys "%PASS%{ENTER}" >> "%temp%\conectar.vbs"

:: Ejecutar el script y borrarlo
cscript //nologo "%temp%\conectar.vbs"
del "%temp%\conectar.vbs"
exit
