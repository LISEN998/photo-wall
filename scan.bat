@echo off
chcp 65001 >nul
echo 正在扫描照片和音乐文件...
echo.

REM 设置支持的格式
set IMAGE_EXTENSIONS=.jpg .jpeg .png .gif .webp .bmp .JPG .JPEG .PNG .GIF .WEBP .BMP
set AUDIO_EXTENSIONS=.mp3 .wav .ogg .m4a .flac .MP3 .WAV .OGG .M4A .FLAC

REM 创建输出文件
echo // file-list.js - 照片墙文件列表配置 > file-list.js
echo // 自动生成，请勿手动编辑 >> file-list.js
echo. >> file-list.js
echo const FILE_LIST = { >> file-list.js
echo. >> file-list.js
echo     // 照片文件列表 >> file-list.js
echo     photos: [ >> file-list.js

REM 扫描照片文件
echo 正在扫描照片文件...
set "photo_count=0"
if exist "assets\photos" (
    cd "assets\photos"
    for %%f in (*) do (
        for %%e in (%IMAGE_EXTENSIONS%) do (
            if /i "%%~xf"=="%%e" (
                echo         '%%f', >> ..\..\file-list.js
                set /a photo_count+=1
            )
        )
    )
    cd ..\..
)

if %photo_count%==0 (
    echo         // 没有找到照片文件 >> file-list.js
)

echo     ], >> file-list.js
echo. >> file-list.js
echo     // 音乐文件列表 >> file-list.js
echo     music: [ >> file-list.js

REM 扫描音乐文件
echo 正在扫描音乐文件...
set "music_count=0"
if exist "assets\music" (
    cd "assets\music"
    for %%f in (*) do (
        for %%e in (%AUDIO_EXTENSIONS%) do (
            if /i "%%~xf"=="%%e" (
                echo         '%%f', >> ..\..\file-list.js
                set /a music_count+=1
            )
        )
    )
    cd ..\..
)

if %music_count%==0 (
    echo         // 没有找到音乐文件 >> file-list.js
)

echo     ] >> file-list.js
echo }; >> file-list.js
echo. >> file-list.js
echo // 自动添加文件夹路径 >> file-list.js
echo FILE_LIST.photos = FILE_LIST.photos.filter(f => !f.includes('//')).map(file => 'assets/photos/' + file); >> file-list.js
echo FILE_LIST.music = FILE_LIST.music.filter(f => !f.includes('//')).map(file => 'assets/music/' + file); >> file-list.js

echo.
echo 扫描完成！
echo 照片: %photo_count% 张
echo 音乐: %music_count% 首
echo.
echo 配置文件已生成: file-list.js
echo.
echo 现在可以:
echo 1. 双击 index.html 运行
echo 2. 添加新文件后，请重新运行本脚本
echo.
pause