@echo off
chcp 65001 >nul
echo 修复配置文件...
echo.

if not exist "file-list.js" (
    echo 创建新的配置文件...
    echo // file-list.js - 照片墙文件列表配置 > file-list.js
    echo // 自动生成，请勿手动编辑 >> file-list.js
    echo. >> file-list.js
    echo const FILE_LIST = { >> file-list.js
    echo. >> file-list.js
    echo     photos: [], >> file-list.js
    echo. >> file-list.js
    echo     music: [] >> file-list.js
    echo }; >> file-list.js
    echo. >> file-list.js
    echo // 自动添加文件夹路径 >> file-list.js
    echo FILE_LIST.photos = FILE_LIST.photos.map(file => 'assets/photos/' + file); >> file-list.js
    echo FILE_LIST.music = FILE_LIST.music.map(file => 'assets/music/' + file); >> file-list.js
    echo 配置文件已创建
) else (
    echo 检查现有配置文件...
    REM 删除最后几行并重新添加
    type file-list.js | findstr /v "^}" | findstr /v "^};" | findstr /v "^FILE_LIST.photos" | findstr /v "^FILE_LIST.music" > file-list.tmp
    echo } >> file-list.tmp
    echo. >> file-list.tmp
    echo // 自动添加文件夹路径 >> file-list.tmp
    echo FILE_LIST.photos = FILE_LIST.photos.map(file => 'assets/photos/' + file); >> file-list.tmp
    echo FILE_LIST.music = FILE_LIST.music.map(file => 'assets/music/' + file); >> file-list.tmp
    move /y file-list.tmp file-list.js >nul
    echo 配置文件已修复
)

echo.
echo 现在请运行 scan.bat 来扫描文件
pause