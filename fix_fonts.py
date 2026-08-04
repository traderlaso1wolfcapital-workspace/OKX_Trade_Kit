import sys
import io

with io.open('TLS1_Trading_App/gui_main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('font-size: 13px; padding: 5px; border-radius: 4px; border: 1px solid #333;', 
    'font-family: \'Consolas\', \'Cascadia Code\', monospace; font-size: 18px; padding: 5px; border-radius: 4px; border: 1px solid #333;')
content = content.replace('font-size: 13px; }\"', 'font-size: 14px; }\"')
content = content.replace('font-family: \"Segoe UI\"; font-size: 13px;', 'font-size: 14px;')

with io.open('TLS1_Trading_App/gui_main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done fixing fonts.')
