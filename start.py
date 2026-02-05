#!/usr/bin/env python3
# start.py - 简单的HTTP服务器，支持文件列表

import http.server
import socketserver
import os
import json
from urllib.parse import urlparse, parse_qs

PORT = 8080

class PhotoWallHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 处理文件列表请求
        if self.path.startswith('/api/files'):
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            dir_type = query.get('dir', ['photos'])[0]
            
            # 检查目录
            base_dir = os.path.join('assets', dir_type)
            if not os.path.exists(base_dir):
                os.makedirs(base_dir, exist_ok=True)
            
            # 获取文件列表
            files = []
            if os.path.exists(base_dir):
                for file in os.listdir(base_dir):
                    file_path = os.path.join(base_dir, file)
                    if os.path.isfile(file_path):
                        files.append(file)
                
                # 按名称排序
                files.sort()
            
            # 返回JSON
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(files).encode())
        else:
            # 默认的文件服务
            super().do_GET()
    
    def log_message(self, format, *args):
        # 减少日志输出
        pass

# 启动服务器
print(f"启动照片墙服务器...")
print(f"访问地址: http://localhost:{PORT}")
print(f"照片目录: assets/photos/")
print(f"音乐目录: assets/music/")
print("\n支持任意文件名的照片和音乐！")
print("按 Ctrl+C 停止服务器\n")

try:
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), PhotoWallHandler) as httpd:
        print(f"服务器运行在端口 {PORT}")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n服务器已停止")
except Exception as e:
    print(f"启动失败: {e}")