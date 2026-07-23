import re

files = [
    'z_bot_sub1/bot_strategy.py',
    'z_bot_sub2/bot_strategy.py'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i in range(len(lines)):
        if i >= 2000:
            if 'except: pass' in lines[i]:
                lines[i] = lines[i].replace('except: pass', 'except Exception as e: hft_logger.error(f\"Lỗi API (Hủy/Đặt lệnh): {e}\")')
            elif 'except:' in lines[i] and i+1 < len(lines) and 'pass' in lines[i+1].strip():
                lines[i] = lines[i].replace('except:', 'except Exception as e:')
                lines[i+1] = lines[i+1].replace('pass', 'hft_logger.error(f\"Lỗi API (Hủy/Đặt lệnh): {e}\")')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'Processed {file}')
