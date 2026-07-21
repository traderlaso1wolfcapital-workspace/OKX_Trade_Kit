import os
from PIL import Image

ico_path = r"d:\4. Trade Coin - TLS1\4. Cursor - IDE\TLS1_Company\zProjects\OKX_Trade_Kit\TLS1_Trading_App\media\logo.ico"

try:
    img = Image.open(ico_path)
    
    # Kích thước chuẩn cho Windows Icon
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]
    
    # Đảm bảo ảnh là hệ RGBA để hỗ trợ trong suốt
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
        
    # Tạo danh sách các ảnh resize chất lượng cao (LANCZOS)
    images = []
    for size in icon_sizes:
        if size == img.size:
            images.append(img.copy())
        else:
            resized_img = img.resize(size, Image.Resampling.LANCZOS)
            images.append(resized_img)
    
    # Save lại vào chính file logo.ico cũ
    images[0].save(ico_path, format='ICO', sizes=icon_sizes, append_images=images[1:])
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
