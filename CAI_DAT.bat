@echo off
chcp 65001 >nul
title VMAX Tech - Trình Cài Đặt Ứng Dụng
echo ========================================================
echo       VMAX TECH AUTOMATION - TRÌNH CÀI ĐẶT WINDOWS
echo ========================================================
echo.

if exist "release\VMAX Tech Automation-Setup-25.5.8.exe" (
    echo [OK] Đã tìm thấy tệp cài đặt chính thức:
    echo      release\VMAX Tech Automation-Setup-25.5.8.exe
    echo.
    echo Đang khởi động trình cài đặt (Setup Wizard)...
    start "" "release\VMAX Tech Automation-Setup-25.5.8.exe"
    exit
) else (
    echo [Cảnh báo] Chưa tìm thấy file Setup. Đang tiến hành đóng gói...
    call npm run dist
    echo.
    echo Đang mở trình cài đặt...
    start "" "release\VMAX Tech Automation-Setup-25.5.8.exe"
    exit
)
