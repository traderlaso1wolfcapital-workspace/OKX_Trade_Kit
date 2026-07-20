@echo off
python -c "import re, json; v=json.load(open('version.json', encoding='utf-8'))['version']; content=open('gui_main.py', encoding='utf-8').read(); content=re.sub(r'^APP_VERSION = .*$', f'APP_VERSION = \"{v}\"', content, flags=re.MULTILINE); open('gui_main.py', 'w', encoding='utf-8').write(content); print(' -> Da hardcode APP_VERSION = \"' + v + '\" vao gui_main.py')"
