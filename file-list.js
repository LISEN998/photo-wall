// 自动生成的文件列表 - 请勿手动编辑
// 如需更新，请重新运行 scan.js

const FILE_LIST = {
    photos: [
        'e318dd24-ff66-4c99-99bb-842686afe2e3.jpg',
        '微信图片_20240409143121.png'
    ],
    
    music: [
        'musqweic.mp3'
    ]
};

// 自动添加文件夹路径
FILE_LIST.photos = FILE_LIST.photos.map(file => 'assets/photos/' + file);
FILE_LIST.music = FILE_LIST.music.map(file => 'assets/music/' + file);

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FILE_LIST;
}
