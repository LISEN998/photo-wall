// scan.js - Node.js文件扫描脚本
const fs = require('fs');
const path = require('path');

console.log('正在扫描照片和音乐文件...\n');

// 支持的格式
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.BMP'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.MP3', '.WAV', '.OGG', '.M4A', '.FLAC'];

const fileList = {
    photos: [],
    music: []
};

// 扫描照片文件
console.log('正在扫描照片文件...');
const photosDir = 'assets/photos';
if (fs.existsSync(photosDir)) {
    const files = fs.readdirSync(photosDir);
    files.forEach(file => {
        const ext = path.extname(file);
        if (IMAGE_EXTENSIONS.includes(ext)) {
            fileList.photos.push(file);
        }
    });
    fileList.photos.sort();
    console.log(`找到 ${fileList.photos.length} 张照片`);
} else {
    console.log('照片目录不存在: assets/photos/');
}

// 扫描音乐文件
console.log('正在扫描音乐文件...');
const musicDir = 'assets/music';
if (fs.existsSync(musicDir)) {
    const files = fs.readdirSync(musicDir);
    files.forEach(file => {
        const ext = path.extname(file);
        if (AUDIO_EXTENSIONS.includes(ext)) {
            fileList.music.push(file);
        }
    });
    fileList.music.sort();
    console.log(`找到 ${fileList.music.length} 首音乐`);
} else {
    console.log('音乐目录不存在: assets/music/');
}

// 生成配置文件
const configContent = `// 自动生成的文件列表 - 请勿手动编辑
// 如需更新，请重新运行 scan.js

const FILE_LIST = {
    photos: [
${fileList.photos.map(file => `        '${file}'`).join(',\n')}
    ],
    
    music: [
${fileList.music.map(file => `        '${file}'`).join(',\n')}
    ]
};

// 自动添加文件夹路径
FILE_LIST.photos = FILE_LIST.photos.map(file => 'assets/photos/' + file);
FILE_LIST.music = FILE_LIST.music.map(file => 'assets/music/' + file);

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FILE_LIST;
}
`;

fs.writeFileSync('file-list.js', configContent, 'utf8');

console.log('\n扫描完成！');
console.log(`照片: ${fileList.photos.length} 张`);
console.log(`音乐: ${fileList.music.length} 首`);
console.log('\n配置文件已生成: file-list.js');
console.log('\n现在可以:');
console.log('1. 运行 start.bat 启动服务器');
console.log('2. 访问 http://localhost:8080');
console.log('3. 或者直接双击 index.html (仅图片模式)');