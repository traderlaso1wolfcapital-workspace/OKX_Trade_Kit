"""
Script migrate cau truc OKX_Trade_Kit.
- Copy z_bot_sub1/ -> bots/sub1/
- Copy z_bot_sub2/ -> bots/sub2/
- Copy TLS1_Trading_App/ -> desktop_app/
- Copy TLS1_Trading_Web/ -> web_app/
- Update import paths trong toan bo .py files
- Update entry points: xGui_main.py, zBuild_To_GitHub.py
"""
import os
import re
import shutil

BASE = os.path.dirname(os.path.abspath(__file__))

def make_dir(path):
    os.makedirs(path, exist_ok=True)
    print(f"  [DIR] {os.path.relpath(path, BASE)}")

def copy_tree(src, dst, ignore=None):
    if not os.path.exists(src):
        print(f"  [SKIP] Source not found: {src}")
        return
    if ignore:
        shutil.copytree(src, dst, dirs_exist_ok=True, ignore=shutil.ignore_patterns(*ignore))
    else:
        shutil.copytree(src, dst, dirs_exist_ok=True)
    print(f"  [COPY] {os.path.relpath(src, BASE)} -> {os.path.relpath(dst, BASE)}")

def update_imports_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  [UPDATED] {os.path.relpath(filepath, BASE)}")
        return True
    return False

def update_imports_in_dir(dirpath, replacements, ext='.py'):
    count = 0
    for root, dirs, files in os.walk(dirpath):
        # Bo qua __pycache__
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for filename in files:
            if filename.endswith(ext):
                count += update_imports_in_file(os.path.join(root, filename), replacements)
    return count

print("=" * 60)
print("  MIGRATE OKX_Trade_Kit Structure")
print("=" * 60)

# ============================================================
# BUOC 1: Tao cau truc thu muc moi
# ============================================================
print("\n[1] Tao cau truc thu muc moi...")
make_dir(os.path.join(BASE, "bots", "sub1"))
make_dir(os.path.join(BASE, "bots", "sub2"))
make_dir(os.path.join(BASE, "desktop_app"))
make_dir(os.path.join(BASE, "web_app"))

# ============================================================
# BUOC 2: Copy files vao vi tri moi
# ============================================================
print("\n[2] Copy files...")

# bots/sub1/ <- z_bot_sub1/
copy_tree(
    os.path.join(BASE, "z_bot_sub1"),
    os.path.join(BASE, "bots", "sub1"),
    ignore=["__pycache__", "*.pyc"]
)

# bots/sub2/ <- z_bot_sub2/
copy_tree(
    os.path.join(BASE, "z_bot_sub2"),
    os.path.join(BASE, "bots", "sub2"),
    ignore=["__pycache__", "*.pyc"]
)

# desktop_app/ <- TLS1_Trading_App/
copy_tree(
    os.path.join(BASE, "TLS1_Trading_App"),
    os.path.join(BASE, "desktop_app"),
    ignore=["__pycache__", "*.pyc"]
)

# web_app/ <- TLS1_Trading_Web/
copy_tree(
    os.path.join(BASE, "TLS1_Trading_Web"),
    os.path.join(BASE, "web_app"),
    ignore=["__pycache__", "*.pyc", "node_modules"]
)

# ============================================================
# BUOC 3: Update import paths trong bots/sub1/
# ============================================================
print("\n[3] Update import paths trong bots/sub1/...")
sub1_replacements = {
    "from z_bot_sub1.": "from bots.sub1.",
    "import z_bot_sub1.": "import bots.sub1.",
    '"z_bot_sub1"': '"bots/sub1"',
    "'z_bot_sub1'": "'bots/sub1'",
    'os.path.basename(_file_dir) in ["z_bot_sub1",': 'os.path.basename(_file_dir) in ["sub1",',
    'os.path.basename(CURRENT_DIR) in ["z_bot_sub1",': 'os.path.basename(CURRENT_DIR) in ["sub1",',
}
n = update_imports_in_dir(os.path.join(BASE, "bots", "sub1"), sub1_replacements)
print(f"  -> Da cap nhat {n} files")

# ============================================================
# BUOC 4: Update import paths trong bots/sub2/
# ============================================================
print("\n[4] Update import paths trong bots/sub2/...")
sub2_replacements = {
    "from z_bot_sub2.": "from bots.sub2.",
    "import z_bot_sub2.": "import bots.sub2.",
    '"z_bot_sub2"': '"bots/sub2"',
    "'z_bot_sub2'": "'bots/sub2'",
    'os.path.basename(_file_dir) in ["z_bot_sub1", "z_bot_sub2"]': 'os.path.basename(_file_dir) in ["sub1", "sub2"]',
    'os.path.basename(CURRENT_DIR) in ["z_bot_sub1", "z_bot_sub2"]': 'os.path.basename(CURRENT_DIR) in ["sub1", "sub2"]',
    '"z_bot_sub1"': '"bots/sub1"',
}
n = update_imports_in_dir(os.path.join(BASE, "bots", "sub2"), sub2_replacements)
print(f"  -> Da cap nhat {n} files")

# ============================================================
# BUOC 5: Update desktop_app/gui_main.py
# ============================================================
print("\n[5] Update desktop_app/gui_main.py...")
gui_replacements = {
    '"z_bot_sub1"': '"bots/sub1"',
    '"z_bot_sub2"': '"bots/sub2"',
    "'z_bot_sub1'": "'bots/sub1'",
    "'z_bot_sub2'": "'bots/sub2'",
    'os.path.isdir(os.path.join(PROJECT_DIR, "z_bot_sub1"))': 'os.path.isdir(os.path.join(PROJECT_DIR, "bots", "sub1"))',
    'for b_name in ["z_bot_sub1", "z_bot_sub2"]': 'for b_name in ["bots/sub1", "bots/sub2"]',
    'import z_bot_sub2.bot_strategy as sub2_strat': 'import bots.sub2.bot_strategy as sub2_strat',
    'from z_bot_sub2.bot_models import AssetTracker': 'from bots.sub2.bot_models import AssetTracker',
    'os.path.join(PROJECT_DIR, "TLS1_Trading_App", "media"': 'os.path.join(PROJECT_DIR, "desktop_app", "media"',
}
n = update_imports_in_dir(os.path.join(BASE, "desktop_app"), gui_replacements)
print(f"  -> Da cap nhat {n} files")

# ============================================================
# BUOC 6: Tao __init__.py de Python nhan ra package
# ============================================================
print("\n[6] Tao __init__.py...")
for pkg in ["bots", "bots/sub1", "bots/sub2", "desktop_app", "web_app"]:
    init_path = os.path.join(BASE, pkg, "__init__.py")
    if not os.path.exists(init_path):
        with open(init_path, 'w') as f:
            f.write("")
        print(f"  [INIT] {pkg}/__init__.py")

# ============================================================
# BUOC 7: Update xGui_main.py entry point
# ============================================================
print("\n[7] Update xGui_main.py...")
xgui_path = os.path.join(BASE, "xGui_main.py")
xgui_replacements = {
    'from TLS1_Trading_App import gui_main': 'from desktop_app import gui_main',
    '"TLS1_Trading_App"': '"desktop_app"',
    "'TLS1_Trading_App'": "'desktop_app'",
    'app_dir_app = os.path.join(current_dir, "TLS1_Trading_App")': 
        'app_dir_app = os.path.join(current_dir, "desktop_app")',
    'module_name = f"sys_bot_{strategy}"': 'module_name = f"sys_bot_{strategy}"',
}
# Dac biet: xGui_main.py can import bot tu bots/subX
xgui_extra = {
    'module = importlib.import_module(module_name)': 'module = importlib.import_module(module_name)',
    'fallback_folder = f"z_bot_{strategy}"': 'fallback_folder = f"bots.sub{strategy.replace(chr(115)+chr(117)+chr(98),chr(32)).strip()}"',
    'f"z_bot_{strategy}"': 'f"bots.sub{strategy[-1]}"',
    'f"{fallback_folder}.{module_name}"': 'f"{fallback_folder}.{module_name}"',
}
update_imports_in_file(xgui_path, xgui_replacements)

print("\n" + "=" * 60)
print("  HOAN THANH! Kiem tra lai truoc khi xoa thu muc cu.")
print("  Thu muc cu z_bot_sub1, z_bot_sub2, TLS1_Trading_App,")
print("  TLS1_Trading_Web van con nguyen de du phong.")
print("=" * 60)
