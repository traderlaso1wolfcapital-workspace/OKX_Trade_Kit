import json
import re

# 1. Update version.json
with open('version.json', 'r', encoding='utf-8') as f:
    d = json.load(f)
v = d['version'].split('.')
new_version = f"{v[0]}.{v[1]}.{int(v[2])+1}"
d['version'] = new_version

with open('version.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=4)

print(f" -> Phien ban moi la: {new_version}")

# 2. Hardcode APP_VERSION into gui_main.py
with open('gui_main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'^APP_VERSION = .*$', f'APP_VERSION = "{new_version}"', content, flags=re.MULTILINE)

with open('gui_main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f" -> Da hardcode APP_VERSION = \"{new_version}\" vao gui_main.py")
