@echo off
chcp 65001 >nul
title 照片墙系统
color 0A

echo ========================================
echo      照片墙系统 - 一键启动
echo ========================================
echo.

echo 正在扫描文件并生成配置...
echo.

REM 使用Node.js脚本扫描文件
node scan.js

echo.
echo 启动HTTP服务器...
echo 访问地址: http://localhost:8080
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 检查并启动服务器
python --version >nul 2>&1
if errorlevel 1 (
    echo 使用Node.js启动服务器...
    npx http-server -p 8080 -c-1
) else (
    echo 使用Python启动服务器...
    python -m http.server 8080
)

echo.
echo 服务器已停止
pause