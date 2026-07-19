#!/bin/bash
echo "========================================="
echo "   AUTO RELEASE TLS1 TRADING APP (MAC)"
echo "========================================="
echo ""

echo "[1/4] Cai dat thu vien can thiet..."
python3 -m pip install pyinstaller pillow gdown numpy pandas PyQt6 lightweight_charts python-dotenv requests cython setuptools

echo "[2/4] Xay dung Updater cho Mac..."
rm -rf build/updater dist/updater
python3 -m PyInstaller --noconfirm --onefile --console --icon="media/logo.ico" updater.py

echo "[3/4] Chuan bi moi truong Build Cython..."
rm -rf cython_build
mkdir -p cython_build

echo "Copy cac file ma nguon sang thu muc build doc lap..."
cp -r ../z_bot_sub1 cython_build/
cp -r ../z_bot_sub2 cython_build/
cp ../sys_bot_*.py cython_build/
cp gui_main.py cython_build/
cp version.json cython_build/
cp -r media cython_build/
cp ../build_cython.py cython_build/

# Lay duong dan thu muc js cua lightweight_charts
CHART_JS_DIR=$(python3 -c "import lightweight_charts, os; print(os.path.join(os.path.dirname(lightweight_charts.__file__), 'js'))")

cd cython_build

echo "Dang bien dich source code thanh C bang Cython..."
python3 build_cython.py

echo "Dang xoa cac file .py goc trong thu muc build de chi giu lai file .so bao mat..."
rm -f sys_bot_*.py
rm -f z_bot_sub1/*.py
rm -f z_bot_sub2/*.py
rm -f build_cython.py

echo "Dang nhoi Code da ma hoa vao file .app..."
rm -rf build/gui_main dist/gui_main dist/gui_main.app
python3 -m PyInstaller --noconfirm --onedir --windowed --icon="media/logo.ico" \
--add-data "version.json:." \
--add-data "media:media" \
--add-data "$CHART_JS_DIR:lightweight_charts/js" \
--hidden-import "lightweight_charts" \
--hidden-import "PyQt6" \
--hidden-import "z_bot_sub1.bot_config" \
--hidden-import "z_bot_sub1.bot_strategy" \
--hidden-import "z_bot_sub2.bot_config" \
--hidden-import "z_bot_sub2.bot_strategy" \
--hidden-import "sys_bot_sub1" \
--hidden-import "sys_bot_sub2" \
gui_main.py

echo "Xoa plugin gay crash tren macOS 15..."
find dist/gui_main.app -name "*permissionplugin*" -delete

cd ..

echo "[4/4] Dang tao thu muc App_Release_Mac..."
rm -rf App_Release_Mac
mkdir -p App_Release_Mac

# Copy cac file can thiet
cp -r cython_build/dist/gui_main.app App_Release_Mac/TLS1_Trading.app
cp dist/updater App_Release_Mac/updater
cp -r media App_Release_Mac/media
cp version.json App_Release_Mac/version.json

echo OKX_IS_DEMO=\"False\" > "App_Release_Mac/.env.example"
echo OKX_API_KEY=\"\" >> "App_Release_Mac/.env.example"
echo OKX_SECRET_KEY=\"\" >> "App_Release_Mac/.env.example"
echo OKX_PASSPHRASE=\"\" >> "App_Release_Mac/.env.example"

echo ""
echo "Nen thu muc va sao chep len Google Drive..."
OUTPUT_DIR="/Users/tls1clawbot/Library/CloudStorage/GoogleDrive-traderlaso1.wolfcapital@gmail.com/Drive của tôi/Output_Chung"

echo "Dang luu vao thu muc: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
cd App_Release_Mac
zip -r "$OUTPUT_DIR/update_mac.zip" *
cd ..

echo "Dang don dep cac file rac..."
rm -rf cython_build

echo "========================================="
echo "   HOAN THANH DONG GOI CHO MAC 100%!"
echo "========================================="
echo "File cua Mac da duoc tao tai: $OUTPUT_DIR/update_mac.zip"
echo "Dong thoi file chay nguyen ban la: App_Release_Mac/TLS1_Trading.app"
