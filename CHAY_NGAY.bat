@echo off
chcp 65001 >nul
title VMAX Tech - Khởi Chạy Ứng Dụng Tự Động Hóa
echo ========================================================
echo          VMAX TECH - HỆ THỐNG TỰ ĐỘNG HÓA TÀI KHOẢN
echo ========================================================
echo.
echo [1/2] Đang kiểm tra môi trường chạy...

if exist "release\VMAX Tech Automation-Portable-25.5.8.exe" (
    echo [2/2] Đang khởi chạy bản Portable độc lập...
    start "" "release\VMAX Tech Automation-Portable-25.5.8.exe"
    exit
)

if exist "release\win-unpacked\VMAX Tech Automation.exe" (
    echo [2/2] Đang khởi chạy từ bản win-unpacked...
    start "" "release\win-unpacked\VMAX Tech Automation.exe"
    exit
)

echo [Thông báo] Đang chạy qua mã nguồn Electron...
npm start
exit
