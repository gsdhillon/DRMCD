@echo off
setlocal EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%" >nul
IF ERRORLEVEL 1 (
    echo Unable to switch to project directory %SCRIPT_DIR%
    exit /b 1
)

if defined PAYARA_HOME (
    set "PAYARA=%PAYARA_HOME%\bin\asadmin.bat"
) ELSE (
    set "PAYARA=%SCRIPT_DIR%..\payara7\bin\asadmin.bat"
)
set DOMAIN_NAME=domain1
set ADMIN_HOST=localhost
set ADMIN_PORT=4848
set ADMIN_WAIT_SECONDS=5
set APP_NAME=drmcd
set WAR_FILE=target\drmcd.war
set APP_URL=http://localhost:8080/drmcd/

if not exist "%PAYARA%" (
    set PAYARA=asadmin
)

IF NOT EXIST "%WAR_FILE%" (
    echo %WAR_FILE% was not found. Run mvn clean package first.
    exit /b 1
)

echo Checking Payara domain %DOMAIN_NAME% ...
call "%PAYARA%" list-domains | findstr /I /R "^%DOMAIN_NAME% .*running" >nul

IF %ERRORLEVEL% NEQ 0 (
    echo Payara domain %DOMAIN_NAME% is not running. Starting it ...
    call "%PAYARA%" start-domain %DOMAIN_NAME%

    IF ERRORLEVEL 1 (
        echo Unable to start Payara domain %DOMAIN_NAME%
        exit /b 1
    )
) ELSE (
    echo Payara domain %DOMAIN_NAME% is already running.
)

call :wait_for_admin

IF ERRORLEVEL 1 (
    echo Payara admin is not reachable yet. Running start-domain %DOMAIN_NAME% ...
    call "%PAYARA%" start-domain %DOMAIN_NAME%
    call :wait_for_admin
)

IF ERRORLEVEL 1 (
    echo Payara domain %DOMAIN_NAME% is running, but admin is not reachable on %ADMIN_HOST%:%ADMIN_PORT%.
    exit /b 1
)

echo Payara admin is reachable.

call "%PAYARA%" --host %ADMIN_HOST% --port %ADMIN_PORT% list-applications | findstr /I /R "^%APP_NAME%[ ]" >nul

IF %ERRORLEVEL% EQU 0 (
    echo Undeploying %APP_NAME% ...
    call "%PAYARA%" --host %ADMIN_HOST% --port %ADMIN_PORT% undeploy %APP_NAME%

    IF ERRORLEVEL 1 (
        echo Undeploy failed
        exit /b 1
    )
) ELSE (
    echo %APP_NAME% is not currently deployed. Skipping undeploy.
)

echo Deploying %WAR_FILE% ...
call "%PAYARA%" --host %ADMIN_HOST% --port %ADMIN_PORT% deploy --contextroot %APP_NAME% --name %APP_NAME% --force=true "%WAR_FILE%"

IF %ERRORLEVEL% NEQ 0 (
    echo Deployment failed
    exit /b %ERRORLEVEL%
)

echo Deployment completed.
echo Application URL: %APP_URL%
echo Opening %APP_URL% in browser ...
start "" chrome --new-tab "%APP_URL%"
exit /b 0

:wait_for_admin
set ADMIN_READY=
<nul set /p "=Waiting for Payara admin on %ADMIN_HOST%:%ADMIN_PORT% for %ADMIN_WAIT_SECONDS% secs: "

for /L %%i in (1,1,%ADMIN_WAIT_SECONDS%) do (
    <nul set /p "=*"
    call "%PAYARA%" --host %ADMIN_HOST% --port %ADMIN_PORT% list-applications >nul 2>nul

    IF NOT ERRORLEVEL 1 (
        echo.
        set ADMIN_READY=1
        goto admin_ready
    )

    powershell -NoProfile -Command "Start-Sleep -Seconds 1"
)
echo.

:admin_ready
IF NOT "%ADMIN_READY%"=="1" (
    exit /b 1
)

exit /b 0
