// script.js - 照片墙播放系统（完整版）
// 修复音乐播放问题，增加华丽切换动画

class PhotoWall {
    constructor() {
        console.log('照片墙系统初始化...');
        
        this.config = {
            playback: {
                interval: 5000,
                transitionDuration: 1200
            },
            music: {
                enabled: true,
                volume: 0.5,
                shuffle: false,
                autoPlay: true
            },
            ui: {
                autoHideControls: true,
                mouseIdleTimeout: 3000
            }
        };
        
        // 从配置文件加载文件列表
        this.photos = FILE_LIST.photos || [];
        this.musicFiles = FILE_LIST.music || [];
        
        // 系统状态
        this.currentPhotoIndex = 0;
        this.currentMusicIndex = 0;
        this.isPlaying = false;
        this.isMuted = false;
        this.timer = null;
        this.progressInterval = null;
        this.photoCache = new Map();
        this.controlsVisible = true;
        this.mouseMoveTimer = null;
        this.isMouseOverControls = false;
        
        // 音乐播放状态
        this.audioElement = null;
        this.userInteracted = false;
        this.audioInitialized = false;
        
        this.init();
    }
    
    async init() {
        console.log(`加载: ${this.photos.length} 张照片, ${this.musicFiles.length} 首音乐`);
        
        this.showLoading();
        this.setupUI();
        this.setupKeyboard();
        this.setupFullscreenListener();
        this.setupMouseListeners();
        this.setupAudio();
        
        setTimeout(() => {
            this.showMainInterface();
        }, 500);
    }
    
    setupAudio() {
        // 创建或获取音频元素
        this.audioElement = document.getElementById('bgm');
        if (!this.audioElement) {
            this.audioElement = document.createElement('audio');
            this.audioElement.id = 'bgm';
            this.audioElement.loop = true;
            this.audioElement.preload = 'metadata';
            this.audioElement.style.display = 'none';
            document.body.appendChild(this.audioElement);
        }
        
        // 设置音频属性
        this.audioElement.volume = this.config.music.volume;
        this.audioElement.muted = this.isMuted;
        
        // 用户点击页面后初始化音频
        const initAudioOnInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('用户已交互，准备播放音乐');
                
                // 如果当前有音乐文件且正在播放，开始播放音乐
                if (this.musicFiles.length > 0 && this.config.music.enabled && this.isPlaying) {
                    this.playBackgroundMusic();
                }
            }
        };
        
        // 绑定点击事件
        document.addEventListener('click', initAudioOnInteraction);
        document.addEventListener('keydown', initAudioOnInteraction);
        
        // 音频错误处理
        this.audioElement.onerror = (e) => {
            console.error('音频加载失败:', e);
            this.showNotification('音乐加载失败，请检查文件格式', 'error', 3000);
        };
        
        this.audioElement.oncanplaythrough = () => {
            console.log('音频可以播放');
            this.audioInitialized = true;
        };
    }
    
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div class="spinner"></div>
                <div id="loading-text">
                    正在加载 ${this.photos.length} 张照片...
                </div>
                <div style="margin-top: 20px; color: #aaa; font-size: 14px;">
                    ${this.musicFiles.length > 0 ? `发现 ${this.musicFiles.length} 首音乐` : '未找到音乐文件'}
                </div>
            `;
        }
    }
    
    setupUI() {
        // 绑定控制按钮
        const bindButton = (id, handler) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    handler();
                    this.resetMouseIdleTimer();
                    if (!this.userInteracted) this.userInteracted = true;
                };
            }
        };
        
        bindButton('play-pause', () => this.togglePlay());
        bindButton('prev-btn', () => this.prevPhoto());
        bindButton('next-btn', () => this.nextPhoto());
        bindButton('fullscreen-btn', () => this.toggleFullscreen());
        bindButton('mute-btn', () => this.toggleMute());
        bindButton('help-btn', () => this.showInstructions());
        bindButton('close-help', () => document.getElementById('keyboard-help').classList.add('hidden'));
        bindButton('close-instructions', () => document.getElementById('instructions').classList.add('hidden'));
        bindButton('use-demo', () => this.useDemoContent());
        bindButton('reload-page', () => location.reload());
        
        // 音量控制
        const volumeSlider = document.getElementById('volume-range');
        if (volumeSlider) {
            volumeSlider.value = this.config.music.volume * 100;
            volumeSlider.oninput = (e) => {
                const volume = e.target.value / 100;
                this.config.music.volume = volume;
                if (this.audioElement) {
                    this.audioElement.volume = volume;
                }
                const icon = volume === 0 ? 'volume-mute' : 'volume-up';
                const muteBtn = document.getElementById('mute-btn');
                if (muteBtn) muteBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
                this.resetMouseIdleTimer();
                if (!this.userInteracted) this.userInteracted = true;
            };
        }
        
        // 切换间隔控制
        const intervalSlider = document.getElementById('interval-range');
        const intervalValue = document.getElementById('interval-value');
        if (intervalSlider && intervalValue) {
            intervalSlider.value = this.config.playback.interval / 1000;
            intervalValue.textContent = `${intervalSlider.value}秒`;
            intervalSlider.oninput = (e) => {
                const seconds = e.target.value;
                intervalValue.textContent = `${seconds}秒`;
                this.config.playback.interval = seconds * 1000;
                this.config.playback.transitionDuration = Math.min(1500, seconds * 1000 * 0.3);
                
                if (this.isPlaying) this.restartTimer();
                this.resetMouseIdleTimer();
            };
        }
        
        // 动画效果选择器 - 丰富选项
        const transitionSelect = document.getElementById('transition-select');
        if (transitionSelect) {
            transitionSelect.innerHTML = '';
            
            const transitions = [
                { value: 'fade', name: '淡入淡出', category: '基础' },
                { value: 'slide', name: '滑动效果', category: '基础' },
                { value: 'zoom', name: '缩放效果', category: '3D' },
                { value: 'rotate3d', name: '3D旋转', category: '3D' },
                { value: 'flip', name: '翻页效果', category: '3D' },
                { value: 'cube', name: '立方体', category: '3D' },
                { value: 'glitch', name: '故障效果', category: '特效' },
                { value: 'wave', name: '波浪效果', category: '特效' },
                { value: 'particles', name: '粒子消散', category: '特效' },
                { value: 'mosaic', name: '马赛克', category: '特效' },
                { value: 'swirl', name: '漩涡效果', category: '特效' },
                { value: 'dreamy', name: '梦幻模糊', category: '特效' },
                { value: 'random', name: '随机效果', category: '高级' }
            ];
            
            // 分组添加选项
            const groups = {};
            transitions.forEach(transition => {
                if (!groups[transition.category]) {
                    groups[transition.category] = document.createElement('optgroup');
                    groups[transition.category].label = transition.category;
                }
                const option = document.createElement('option');
                option.value = transition.value;
                option.textContent = transition.name;
                groups[transition.category].appendChild(option);
            });
            
            Object.values(groups).forEach(group => {
                transitionSelect.appendChild(group);
            });
            
            transitionSelect.value = 'fade';
            transitionSelect.onchange = () => this.resetMouseIdleTimer();
        }
        
        // 如果没有音乐文件，禁用相关控件
        if (this.musicFiles.length === 0) {
            this.config.music.enabled = false;
            const volumeGroup = document.querySelector('.control-group:nth-child(4)');
            if (volumeGroup) {
                volumeGroup.style.opacity = '0.5';
                volumeGroup.title = '未找到音乐文件';
            }
        }
        
        // 显示时钟
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // 添加音乐状态提示
        this.addMusicStatus();
    }
    
    addMusicStatus() {
        const status = document.getElementById('status');
        if (status && this.musicFiles.length > 0) {
            const musicStatus = document.createElement('span');
            musicStatus.id = 'music-status';
            musicStatus.className = 'music-status';
            musicStatus.innerHTML = ' <i class="fas fa-music"></i>';
            musicStatus.title = '点击页面任意位置播放音乐';
            status.parentNode.insertBefore(musicStatus, status.nextSibling);
        }
    }
    
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlay();
                    this.resetMouseIdleTimer();
                    if (!this.userInteracted) this.userInteracted = true;
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.prevPhoto();
                    this.resetMouseIdleTimer();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextPhoto();
                    this.resetMouseIdleTimer();
                    break;
                case 'F11':
                    e.preventDefault();
                    this.toggleFullscreen();
                    this.resetMouseIdleTimer();
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    this.toggleMute();
                    this.resetMouseIdleTimer();
                    if (!this.userInteracted) this.userInteracted = true;
                    break;
                case 'Escape':
                    if (document.fullscreenElement) document.exitFullscreen();
                    break;
                case 'c':
                case 'C':
                    e.preventDefault();
                    this.toggleControls();
                    this.resetMouseIdleTimer();
                    break;
            }
        });
    }
    
    setupFullscreenListener() {
        document.addEventListener('fullscreenchange', () => {
            const isFullscreen = !!document.fullscreenElement;
            const icon = document.querySelector('#fullscreen-btn i');
            if (icon) icon.className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
            
            if (isFullscreen && this.config.ui.autoHideControls) {
                setTimeout(() => this.hideControls(), 1000);
            } else {
                this.showControls();
                this.clearMouseIdleTimer();
            }
        });
        
        document.addEventListener('webkitfullscreenchange', () => {
            const isFullscreen = !!document.webkitFullscreenElement;
            if (!isFullscreen) {
                this.showControls();
                this.clearMouseIdleTimer();
            }
        });
    }
    
    setupMouseListeners() {
        // 鼠标移动检测
        let mouseMoveTimer;
        document.addEventListener('mousemove', () => {
            // 检查是否在控制条区域内
            const controlPanel = document.querySelector('.control-panel');
            if (controlPanel) {
                const rect = controlPanel.getBoundingClientRect();
                this.isMouseOverControls = (
                    event.clientX >= rect.left &&
                    event.clientX <= rect.right &&
                    event.clientY >= rect.top &&
                    event.clientY <= rect.bottom
                );
            }
            
            if (document.fullscreenElement && this.config.ui.autoHideControls) {
                this.showControls();
                this.resetMouseIdleTimer();
            }
        });
        
        // 控制条区域悬停处理
        const controlPanel = document.querySelector('.control-panel');
        if (controlPanel) {
            controlPanel.addEventListener('mouseenter', () => {
                this.isMouseOverControls = true;
                this.clearMouseIdleTimer();
            });
            
            controlPanel.addEventListener('mouseleave', () => {
                this.isMouseOverControls = false;
                if (document.fullscreenElement && this.config.ui.autoHideControls) {
                    this.resetMouseIdleTimer();
                }
            });
        }
        
        // 鼠标离开窗口时隐藏控制条
        document.addEventListener('mouseleave', () => {
            if (document.fullscreenElement && this.config.ui.autoHideControls) {
                this.hideControls();
                this.clearMouseIdleTimer();
            }
        });
        
        // 鼠标进入窗口时显示控制条
        document.addEventListener('mouseenter', () => {
            if (document.fullscreenElement && this.config.ui.autoHideControls) {
                this.showControls();
                this.resetMouseIdleTimer();
            }
        });
    }
    
    resetMouseIdleTimer() {
        this.clearMouseIdleTimer();
        
        if (document.fullscreenElement && this.config.ui.autoHideControls && !this.isMouseOverControls) {
            this.mouseMoveTimer = setTimeout(() => {
                if (document.fullscreenElement && !this.isMouseOverControls) {
                    this.hideControls();
                }
            }, this.config.ui.mouseIdleTimeout);
        }
    }
    
    clearMouseIdleTimer() {
        if (this.mouseMoveTimer) {
            clearTimeout(this.mouseMoveTimer);
            this.mouseMoveTimer = null;
        }
    }
    
    showControls() {
        if (!this.controlsVisible) {
            this.controlsVisible = true;
            const controlPanel = document.querySelector('.control-panel');
            const topBar = document.querySelector('.top-bar');
            
            if (controlPanel) {
                controlPanel.style.transform = 'translateY(0)';
                controlPanel.style.opacity = '1';
            }
            
            if (topBar) {
                topBar.style.transform = 'translateY(0)';
                topBar.style.opacity = '1';
            }
        }
    }
    
    hideControls() {
        if (this.controlsVisible) {
            this.controlsVisible = false;
            const controlPanel = document.querySelector('.control-panel');
            const topBar = document.querySelector('.top-bar');
            
            if (controlPanel) {
                controlPanel.style.transform = 'translateY(100%)';
                controlPanel.style.opacity = '0';
            }
            
            if (topBar) {
                topBar.style.transform = 'translateY(-100%)';
                topBar.style.opacity = '0';
            }
        }
    }
    
    toggleControls() {
        if (this.controlsVisible) {
            this.hideControls();
        } else {
            this.showControls();
            this.resetMouseIdleTimer();
        }
    }
    
    showMainInterface() {
        // 隐藏加载界面
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');
        
        // 显示主界面
        const mainInterface = document.getElementById('main-interface');
        if (mainInterface) mainInterface.classList.remove('hidden');
        
        // 初始化照片墙
        this.initializePhotoWall();
        
        // 显示第一张照片
        if (this.photos.length > 0) {
            this.showPhoto(0);
            
            // 自动开始播放
            setTimeout(() => {
                if (!this.isPlaying && this.photos.length > 0) {
                    this.start();
                }
            }, 1000);
        } else {
            // 没有照片，显示提示
            const noResources = document.getElementById('no-resources');
            if (noResources) noResources.classList.remove('hidden');
        }
        
        // 显示欢迎信息
        this.showWelcomeMessage();
    }
    
    showWelcomeMessage() {
        if (this.photos.length === 0) return;
        
        let message = `已加载 ${this.photos.length} 张照片`;
        if (this.musicFiles.length > 0) {
            message += `，${this.musicFiles.length} 首音乐`;
            message += '\n点击页面任意位置开始播放音乐';
        }
        
        message += '\n全屏时：鼠标移动显示控制条，闲置3秒后自动隐藏';
        
        this.showNotification(message, 'success', 5000);
    }
    
    initializePhotoWall() {
        const wall = document.getElementById('photo-wall');
        if (!wall) return;
        
        wall.innerHTML = '';
        
        const currentImg = document.createElement('img');
        currentImg.className = 'photo current';
        currentImg.alt = '当前照片';
        
        const nextImg = document.createElement('img');
        nextImg.className = 'photo next';
        nextImg.alt = '下一张照片';
        
        wall.appendChild(currentImg);
        wall.appendChild(nextImg);
    }
    
    async showPhoto(index) {
        if (this.photos.length === 0) return;
        
        // 确保索引在有效范围内
        if (index < 0) index = this.photos.length - 1;
        if (index >= this.photos.length) index = 0;
        
        this.currentPhotoIndex = index;
        const photoUrl = this.photos[index];
        
        console.log(`显示第 ${index + 1} 张照片: ${photoUrl}`);
        
        // 获取图片元素
        const currentImg = document.querySelector('.photo.current');
        const nextImg = document.querySelector('.photo.next');
        
        if (!currentImg || !nextImg) return;
        
        // 预加载图片
        try {
            const img = await this.preloadImage(photoUrl);
            nextImg.src = img.src;
        } catch (error) {
            console.error('图片加载失败:', photoUrl, error);
            nextImg.src = this.createPlaceholderImage();
        }
        
        // 获取切换效果
        const transitionSelect = document.getElementById('transition-select');
        const transitionType = transitionSelect ? transitionSelect.value : 'fade';
        
        // 应用动画效果
        this.applyEnhancedTransition(currentImg, nextImg, transitionType);
        
        // 切换角色（稍微延迟以确保动画效果）
        setTimeout(() => {
            currentImg.src = nextImg.src;
            currentImg.className = 'photo current';
            nextImg.className = 'photo next';
        }, this.config.playback.transitionDuration - 100);
        
        // 更新界面
        this.updateCounter();
        this.updatePhotoInfo();
        this.resetProgress();
    }
    
    applyEnhancedTransition(current, next, effect) {
        if (!current || !next) return;
        
        // 重置样式
        current.className = 'photo current';
        next.className = 'photo next';
        
        // 清除之前的动画
        current.style.animation = '';
        next.style.animation = '';
        
        // 强制重排以确保动画重新开始
        void current.offsetWidth;
        void next.offsetWidth;
        
        const duration = this.config.playback.transitionDuration;
        
        // 随机效果处理
        if (effect === 'random') {
            const effects = [
                'fade', 'slide', 'zoom', 'rotate3d', 'flip', 
                'cube', 'glitch', 'wave', 'particles', 'mosaic',
                'swirl', 'dreamy'
            ];
            effect = effects[Math.floor(Math.random() * effects.length)];
        }
        
        // 应用不同的动画效果
        switch(effect) {
            case 'fade':
                // 增强的淡入淡出
                next.style.animation = `enhancedFadeIn ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `enhancedFadeOut ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                break;
                
            case 'slide':
                // 随机方向的滑动
                const directions = ['left', 'right', 'top', 'bottom'];
                const direction = directions[Math.floor(Math.random() * directions.length)];
                next.style.animation = `slideIn${direction.charAt(0).toUpperCase() + direction.slice(1)} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `slideOut${direction.charAt(0).toUpperCase() + direction.slice(1)} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                break;
                
            case 'zoom':
                // 缩放效果
                next.style.animation = `zoomIn ${duration}ms cubic-bezier(0.68, -0.55, 0.27, 1.55)`;
                current.style.animation = `zoomOut ${duration}ms cubic-bezier(0.68, -0.55, 0.27, 1.55)`;
                break;
                
            case 'rotate3d':
                // 3D旋转
                const axes = ['X', 'Y', 'Z'];
                const axis = axes[Math.floor(Math.random() * axes.length)];
                next.style.animation = `rotate3dIn${axis} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `rotate3dOut${axis} ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                break;
                
            case 'flip':
                // 翻页效果
                next.style.animation = `flipIn ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `flipOut ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                break;
                
            case 'cube':
                // 立方体效果
                next.style.animation = `cubeIn ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `cubeOut ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                break;
                
            case 'glitch':
                // 故障效果
                next.style.animation = `glitchIn ${duration}ms steps(2, end)`;
                current.style.animation = `glitchOut ${duration}ms steps(2, end)`;
                break;
                
            case 'wave':
                // 波浪效果
                next.style.animation = `waveIn ${duration}ms ease-in-out`;
                current.style.animation = `waveOut ${duration}ms ease-in-out`;
                break;
                
            case 'particles':
                // 粒子消散
                next.style.animation = `particlesIn ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `particlesOut ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                break;
                
            case 'mosaic':
                // 马赛克效果
                next.style.animation = `mosaicIn ${duration}ms steps(8, end)`;
                current.style.animation = `mosaicOut ${duration}ms steps(8, end)`;
                break;
                
            case 'swirl':
                // 漩涡效果
                next.style.animation = `swirlIn ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `swirlOut ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                break;
                
            case 'dreamy':
                // 梦幻模糊
                next.style.animation = `dreamyIn ${duration}ms ease-out`;
                current.style.animation = `dreamyOut ${duration}ms ease-out`;
                break;
                
            default:
                // 默认效果
                next.style.animation = `enhancedFadeIn ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                current.style.animation = `enhancedFadeOut ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        }
    }
    
    async preloadImage(src) {
        return new Promise((resolve, reject) => {
            // 检查缓存
            if (this.photoCache.has(src)) {
                resolve(this.photoCache.get(src));
                return;
            }
            
            const img = new Image();
            
            img.onload = () => {
                this.photoCache.set(src, img);
                resolve(img);
            };
            
            img.onerror = () => {
                console.warn('图片加载失败，使用占位图:', src);
                reject(new Error(`图片加载失败: ${src}`));
            };
            
            img.src = src;
        });
    }
    
    createPlaceholderImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        
        // 渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
        gradient.addColorStop(0, '#1a2980');
        gradient.addColorStop(1, '#26d0ce');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1920, 1080);
        
        // 图标
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        
        // 绘制相机图标
        ctx.beginPath();
        ctx.arc(960, 400, 120, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#1a2980';
        ctx.beginPath();
        ctx.arc(960, 400, 80, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(960, 400, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // 文字
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Arial';
        ctx.fillText('照片墙展示系统', 960, 650);
        
        ctx.font = '36px Arial';
        ctx.fillText(`第 ${this.currentPhotoIndex + 1} 张，共 ${this.photos.length} 张`, 960, 720);
        
        return canvas.toDataURL();
    }
    
    togglePlay() {
        if (this.photos.length === 0) {
            this.showNotification('没有照片可播放', 'warning');
            return;
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    start() {
        if (this.isPlaying || this.photos.length === 0) return;
        
        this.isPlaying = true;
        this.updateStatus('播放中');
        
        // 更新播放按钮
        const playPauseBtn = document.getElementById('play-pause');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playPauseBtn.title = '暂停 (空格键)';
        }
        
        // 开始定时切换
        this.startTimer();
        
        // 开始进度条
        this.startProgress();
        
        // 播放背景音乐
        this.playBackgroundMusic();
        
        // 更新音乐状态指示器
        this.updateMusicStatus();
    }
    
    pause() {
        this.isPlaying = false;
        this.updateStatus('已暂停');
        
        // 更新播放按钮
        const playPauseBtn = document.getElementById('play-pause');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            playPauseBtn.title = '播放 (空格键)';
        }
        
        // 停止定时器
        this.stopTimer();
        
        // 停止进度条
        this.stopProgress();
        
        // 暂停音乐
        if (this.audioElement) {
            this.audioElement.pause();
        }
        
        // 更新音乐状态指示器
        this.updateMusicStatus();
    }
    
    playBackgroundMusic() {
        if (!this.config.music.enabled || this.musicFiles.length === 0) {
            console.log('音乐功能已禁用或没有音乐文件');
            return;
        }
        
        if (!this.audioElement) {
            console.error('音频元素未初始化');
            return;
        }
        
        // 选择音乐
        const musicIndex = this.config.music.shuffle ? 
            Math.floor(Math.random() * this.musicFiles.length) : 
            this.currentMusicIndex % this.musicFiles.length;
        
        const musicUrl = this.musicFiles[musicIndex];
        this.currentMusicIndex = (musicIndex + 1) % this.musicFiles.length;
        
        console.log('准备播放音乐:', musicUrl);
        
        // 设置音频源
        this.audioElement.src = musicUrl;
        this.audioElement.volume = this.config.music.volume;
        this.audioElement.muted = this.isMuted;
        
        // 用户交互后尝试播放
        if (this.userInteracted) {
            const playPromise = this.audioElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('音乐播放成功');
                    this.updateMusicStatus(true);
                }).catch(error => {
                    console.log('音乐自动播放被阻止:', error);
                    this.showNotification('点击页面任意位置播放音乐', 'info', 2000);
                    this.updateMusicStatus(false);
                });
            }
        } else {
            this.showNotification('点击页面任意位置播放音乐', 'info', 2000);
        }
        
        // 音乐结束时的处理
        this.audioElement.onended = () => {
            console.log('音乐播放结束');
            if (this.isPlaying) {
                this.playBackgroundMusic();
            }
        };
    }
    
    updateMusicStatus(isPlaying = null) {
        const musicStatus = document.getElementById('music-status');
        if (musicStatus) {
            if (isPlaying === null) {
                isPlaying = this.audioElement && !this.audioElement.paused;
            }
            
            if (isPlaying) {
                musicStatus.innerHTML = ' <i class="fas fa-volume-up" style="color: #4dabf7"></i>';
                musicStatus.title = '音乐播放中';
            } else {
                musicStatus.innerHTML = ' <i class="fas fa-volume-mute" style="color: #aaa"></i>';
                musicStatus.title = '音乐已暂停';
            }
        }
    }
    
    nextPhoto() {
        if (this.photos.length === 0) return;
        const nextIndex = (this.currentPhotoIndex + 1) % this.photos.length;
        this.showPhoto(nextIndex);
    }
    
    prevPhoto() {
        if (this.photos.length === 0) return;
        const prevIndex = (this.currentPhotoIndex - 1 + this.photos.length) % this.photos.length;
        this.showPhoto(prevIndex);
    }
    
    startTimer() {
        this.stopTimer();
        this.timer = setInterval(() => {
            this.nextPhoto();
        }, this.config.playback.interval);
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    restartTimer() {
        if (this.isPlaying) {
            this.stopTimer();
            this.startTimer();
        }
    }
    
    startProgress() {
        this.stopProgress();
        
        const progressBar = document.querySelector('.progress');
        if (!progressBar) return;
        
        progressBar.style.transition = `width ${this.config.playback.interval}ms linear`;
        progressBar.style.width = '100%';
        
        this.progressInterval = setTimeout(() => {
            progressBar.style.width = '0%';
        }, this.config.playback.interval);
    }
    
    stopProgress() {
        const progressBar = document.querySelector('.progress');
        if (progressBar) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
        }
        
        if (this.progressInterval) {
            clearTimeout(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    resetProgress() {
        this.stopProgress();
        if (this.isPlaying) {
            setTimeout(() => this.startProgress(), 50);
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.audioElement) {
            this.audioElement.muted = this.isMuted;
        }
        
        const icon = this.isMuted ? 'volume-mute' : 'volume-up';
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
        }
        
        this.updateMusicStatus();
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('全屏请求失败:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    useDemoContent() {
        console.log('使用示例内容...');
        
        this.photos = [
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&h=1080&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&h=1080&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&h=1080&fit=crop&auto=format',
            'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&h=1080&fit=crop&auto=format'
        ];
        
        this.musicFiles = [
            'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
            'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3'
        ];
        
        this.config.music.enabled = true;
        
        document.getElementById('no-resources').classList.add('hidden');
        this.showPhoto(0);
        this.start();
        
        this.showNotification('正在使用演示内容', 'info', 3000);
    }
    
    updateClock() {
        const clockEl = document.getElementById('clock');
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('zh-CN');
        }
    }
    
    updateCounter() {
        const counter = document.getElementById('counter');
        if (counter) {
            counter.textContent = `${this.currentPhotoIndex + 1}/${this.photos.length}`;
        }
    }
    
    updateStatus(text) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = text;
        }
    }
    
    updatePhotoInfo() {
        const info = document.getElementById('photo-info');
        if (info && this.photos.length > 0) {
            const currentPhoto = this.photos[this.currentPhotoIndex];
            const fileName = decodeURIComponent(currentPhoto.split('/').pop() || '');
            info.innerHTML = `<i class="fas fa-image"></i> ${fileName}`;
            info.title = fileName;
        }
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // 图标映射
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.opacity = '1', 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    
    showInstructions() {
        const instructions = document.getElementById('instructions');
        if (instructions) instructions.classList.remove('hidden');
    }
}

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
    console.log('照片墙系统启动...');
    
    // 添加增强的动画样式
    const style = document.createElement('style');
    style.textContent = `
        /* 增强的基础动画 */
        @keyframes enhancedFadeIn {
            from { 
                opacity: 0; 
                filter: brightness(0.8) contrast(1.2);
                transform: scale(1.05);
            }
            to { 
                opacity: 1; 
                filter: brightness(1) contrast(1);
                transform: scale(1);
            }
        }
        
        @keyframes enhancedFadeOut {
            from { 
                opacity: 1; 
                filter: brightness(1) contrast(1);
                transform: scale(1);
            }
            to { 
                opacity: 0; 
                filter: brightness(1.2) contrast(0.8);
                transform: scale(0.95);
            }
        }
        
        /* 滑动效果 */
        @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInTop {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideInBottom {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideOutLeft {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-100%); opacity: 0; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes slideOutTop {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-100%); opacity: 0; }
        }
        
        @keyframes slideOutBottom {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
        }
        
        /* 缩放效果 */
        @keyframes zoomIn {
            from { 
                transform: scale(0.5) rotate(-5deg); 
                opacity: 0; 
                filter: blur(10px);
            }
            to { 
                transform: scale(1) rotate(0); 
                opacity: 1; 
                filter: blur(0);
            }
        }
        
        @keyframes zoomOut {
            from { 
                transform: scale(1) rotate(0); 
                opacity: 1; 
                filter: blur(0);
            }
            to { 
                transform: scale(1.5) rotate(5deg); 
                opacity: 0; 
                filter: blur(10px);
            }
        }
        
        /* 3D旋转效果 */
        @keyframes rotate3dInX {
            from { 
                transform: perspective(1000px) rotateX(90deg); 
                opacity: 0;
            }
            to { 
                transform: perspective(1000px) rotateX(0); 
                opacity: 1;
            }
        }
        
        @keyframes rotate3dInY {
            from { 
                transform: perspective(1000px) rotateY(90deg); 
                opacity: 0;
            }
            to { 
                transform: perspective(1000px) rotateY(0); 
                opacity: 1;
            }
        }
        
        @keyframes rotate3dInZ {
            from { 
                transform: perspective(1000px) rotateZ(90deg); 
                opacity: 0;
            }
            to { 
                transform: perspective(1000px) rotateZ(0); 
                opacity: 1;
            }
        }
        
        @keyframes rotate3dOutX {
            from { 
                transform: perspective(1000px) rotateX(0); 
                opacity: 1;
            }
            to { 
                transform: perspective(1000px) rotateX(-90deg); 
                opacity: 0;
            }
        }
        
        @keyframes rotate3dOutY {
            from { 
                transform: perspective(1000px) rotateY(0); 
                opacity: 1;
            }
            to { 
                transform: perspective(1000px) rotateY(-90deg); 
                opacity: 0;
            }
        }
        
        @keyframes rotate3dOutZ {
            from { 
                transform: perspective(1000px) rotateZ(0); 
                opacity: 1;
            }
            to { 
                transform: perspective(1000px) rotateZ(-90deg); 
                opacity: 0;
            }
        }
        
        /* 翻页效果 */
        @keyframes flipIn {
            from { 
                transform: perspective(1000px) rotateY(-180deg); 
                opacity: 0;
            }
            to { 
                transform: perspective(1000px) rotateY(0); 
                opacity: 1;
            }
        }
        
        @keyframes flipOut {
            from { 
                transform: perspective(1000px) rotateY(0); 
                opacity: 1;
            }
            to { 
                transform: perspective(1000px) rotateY(180deg); 
                opacity: 0;
            }
        }
        
        /* 立方体效果 */
        @keyframes cubeIn {
            from { 
                transform: perspective(1000px) rotateY(90deg) translateZ(200px); 
                opacity: 0;
            }
            to { 
                transform: perspective(1000px) rotateY(0) translateZ(0); 
                opacity: 1;
            }
        }
        
        @keyframes cubeOut {
            from { 
                transform: perspective(1000px) rotateY(0) translateZ(0); 
                opacity: 1;
            }
            to { 
                transform: perspective(1000px) rotateY(-90deg) translateZ(200px); 
                opacity: 0;
            }
        }
        
        /* 故障效果 */
        @keyframes glitchIn {
            0% { 
                transform: translate(2px, 0) skew(0deg); 
                opacity: 0;
                clip-path: inset(0 0 0 0);
            }
            10% { 
                transform: translate(-2px, 0) skew(1deg); 
                opacity: 0.2;
                clip-path: inset(20% 0 60% 0);
            }
            20% { 
                transform: translate(0, -2px) skew(0deg); 
                opacity: 0.4;
                clip-path: inset(60% 0 20% 0);
            }
            30% { 
                transform: translate(0, 2px) skew(-1deg); 
                opacity: 0.6;
                clip-path: inset(10% 0 80% 0);
            }
            40% { 
                transform: translate(0, 0) skew(0deg); 
                opacity: 0.8;
                clip-path: inset(80% 0 10% 0);
            }
            50%, 100% { 
                transform: translate(0, 0) skew(0deg); 
                opacity: 1;
                clip-path: inset(0 0 0 0);
            }
        }
        
        @keyframes glitchOut {
            0% { 
                transform: translate(0, 0) skew(0deg); 
                opacity: 1;
                clip-path: inset(0 0 0 0);
            }
            10% { 
                transform: translate(2px, 0) skew(1deg); 
                opacity: 0.8;
                clip-path: inset(20% 0 60% 0);
            }
            20% { 
                transform: translate(-2px, 0) skew(0deg); 
                opacity: 0.6;
                clip-path: inset(60% 0 20% 0);
            }
            30% { 
                transform: translate(0, -2px) skew(-1deg); 
                opacity: 0.4;
                clip-path: inset(10% 0 80% 0);
            }
            40% { 
                transform: translate(0, 2px) skew(0deg); 
                opacity: 0.2;
                clip-path: inset(80% 0 10% 0);
            }
            50%, 100% { 
                transform: translate(0, 0) skew(0deg); 
                opacity: 0;
                clip-path: inset(0 0 0 0);
            }
        }
        
        /* 波浪效果 */
        @keyframes waveIn {
            0% { 
                transform: translateY(100%) scaleY(0.5);
                opacity: 0;
                filter: hue-rotate(0deg);
            }
            50% { 
                transform: translateY(0) scaleY(1.2);
                opacity: 0.8;
                filter: hue-rotate(180deg);
            }
            100% { 
                transform: translateY(0) scaleY(1);
                opacity: 1;
                filter: hue-rotate(360deg);
            }
        }
        
        @keyframes waveOut {
            0% { 
                transform: translateY(0) scaleY(1);
                opacity: 1;
                filter: hue-rotate(0deg);
            }
            50% { 
                transform: translateY(-50%) scaleY(0.8);
                opacity: 0.5;
                filter: hue-rotate(180deg);
            }
            100% { 
                transform: translateY(-100%) scaleY(0.5);
                opacity: 0;
                filter: hue-rotate(360deg);
            }
        }
        
        /* 粒子消散效果 */
        @keyframes particlesIn {
            0% { 
                transform: scale(0.3);
                opacity: 0;
                filter: blur(20px);
            }
            50% { 
                transform: scale(1.1);
                opacity: 1;
                filter: blur(5px);
            }
            100% { 
                transform: scale(1);
                opacity: 1;
                filter: blur(0);
            }
        }
        
        @keyframes particlesOut {
            0% { 
                transform: scale(1);
                opacity: 1;
                filter: blur(0);
            }
            100% { 
                transform: scale(1.5);
                opacity: 0;
                filter: blur(20px);
            }
        }
        
        /* 马赛克效果 */
        @keyframes mosaicIn {
            0% { 
                clip-path: inset(0 0 100% 0);
                opacity: 0;
            }
            12.5% { 
                clip-path: inset(0 0 87.5% 0);
                opacity: 0.125;
            }
            25% { 
                clip-path: inset(0 0 75% 0);
                opacity: 0.25;
            }
            37.5% { 
                clip-path: inset(0 0 62.5% 0);
                opacity: 0.375;
            }
            50% { 
                clip-path: inset(0 0 50% 0);
                opacity: 0.5;
            }
            62.5% { 
                clip-path: inset(0 0 37.5% 0);
                opacity: 0.625;
            }
            75% { 
                clip-path: inset(0 0 25% 0);
                opacity: 0.75;
            }
            87.5% { 
                clip-path: inset(0 0 12.5% 0);
                opacity: 0.875;
            }
            100% { 
                clip-path: inset(0 0 0 0);
                opacity: 1;
            }
        }
        
        @keyframes mosaicOut {
            0% { 
                clip-path: inset(0 0 0 0);
                opacity: 1;
            }
            12.5% { 
                clip-path: inset(12.5% 0 0 0);
                opacity: 0.875;
            }
            25% { 
                clip-path: inset(25% 0 0 0);
                opacity: 0.75;
            }
            37.5% { 
                clip-path: inset(37.5% 0 0 0);
                opacity: 0.625;
            }
            50% { 
                clip-path: inset(50% 0 0 0);
                opacity: 0.5;
            }
            62.5% { 
                clip-path: inset(62.5% 0 0 0);
                opacity: 0.375;
            }
            75% { 
                clip-path: inset(75% 0 0 0);
                opacity: 0.25;
            }
            87.5% { 
                clip-path: inset(87.5% 0 0 0);
                opacity: 0.125;
            }
            100% { 
                clip-path: inset(100% 0 0 0);
                opacity: 0;
            }
        }
        
        /* 漩涡效果 */
        @keyframes swirlIn {
            0% { 
                transform: rotate(720deg) scale(0);
                opacity: 0;
                border-radius: 50%;
            }
            60% { 
                transform: rotate(180deg) scale(1.2);
                opacity: 0.8;
                border-radius: 30%;
            }
            100% { 
                transform: rotate(0) scale(1);
                opacity: 1;
                border-radius: 0;
            }
        }
        
        @keyframes swirlOut {
            0% { 
                transform: rotate(0) scale(1);
                opacity: 1;
                border-radius: 0;
            }
            40% { 
                transform: rotate(-180deg) scale(1.2);
                opacity: 0.6;
                border-radius: 30%;
            }
            100% { 
                transform: rotate(-720deg) scale(0);
                opacity: 0;
                border-radius: 50%;
            }
        }
        
        /* 梦幻模糊效果 */
        @keyframes dreamyIn {
            0% { 
                opacity: 0;
                filter: blur(20px) brightness(2) saturate(2);
                transform: scale(1.1);
            }
            50% { 
                opacity: 0.5;
                filter: blur(10px) brightness(1.5) saturate(1.5);
                transform: scale(1.05);
            }
            100% { 
                opacity: 1;
                filter: blur(0) brightness(1) saturate(1);
                transform: scale(1);
            }
        }
        
        @keyframes dreamyOut {
            0% { 
                opacity: 1;
                filter: blur(0) brightness(1) saturate(1);
                transform: scale(1);
            }
            50% { 
                opacity: 0.5;
                filter: blur(10px) brightness(1.5) saturate(1.5);
                transform: scale(0.95);
            }
            100% { 
                opacity: 0;
                filter: blur(20px) brightness(2) saturate(2);
                transform: scale(0.9);
            }
        }
        
        /* 图片样式 */
        .photo {
            position: absolute;
            width: 100%;
            height: 100%;
            object-fit: cover;
            will-change: transform, opacity, filter;
            backface-visibility: hidden;
        }
        
        /* 其他样式保持不变 */
        .notification {
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            border-radius: 8px; color: white; z-index: 9999;
            display: flex; align-items: center; gap: 10px; opacity: 0;
            transition: opacity 0.3s; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            max-width: 400px; background: rgba(0,0,0,0.8);
            backdrop-filter: blur(10px);
        }
        
        .notification.success { border-left: 4px solid #27ae60; }
        .notification.error { border-left: 4px solid #e74c3c; }
        .notification.warning { border-left: 4px solid #f39c12; }
        .notification.info { border-left: 4px solid #3498db; }
        .control-panel, .top-bar { transition: transform 0.3s ease, opacity 0.3s ease; }
    `;
    document.head.appendChild(style);
    
    window.photoWall = new PhotoWall();
    
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    });
    
    // 页面点击后自动播放音乐
    document.addEventListener('click', function initAudio() {
        if (window.photoWall && window.photoWall.userInteracted) {
            window.photoWall.playBackgroundMusic();
        }
        document.removeEventListener('click', initAudio);
    });
    
    console.log('系统初始化完成');
});