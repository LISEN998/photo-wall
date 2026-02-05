<?php
// get-files.php - 获取文件列表的PHP脚本
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dir = isset($_GET['dir']) ? $_GET['dir'] : 'photos';
$basePath = __DIR__ . '/assets/' . $dir . '/';

$files = [];

if (is_dir($basePath)) {
    $handle = opendir($basePath);
    
    // 支持的格式
    $imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg', '.ico'];
    $audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.aiff', '.m4b', '.m4p'];
    
    $extensions = $dir === 'music' ? $audioExtensions : $imageExtensions;
    
    while (false !== ($entry = readdir($handle))) {
        if ($entry === '.' || $entry === '..') continue;
        
        $filePath = $basePath . $entry;
        $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
        
        // 检查文件扩展名
        $isValid = false;
        foreach ($extensions as $validExt) {
            if ('.' . $ext === $validExt) {
                $isValid = true;
                break;
            }
        }
        
        if ($isValid && is_file($filePath)) {
            $files[] = $entry;
        }
    }
    
    closedir($handle);
    
    // 按文件名排序
    sort($files);
}

echo json_encode($files);
?>