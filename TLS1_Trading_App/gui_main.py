import sys
import os
import multiprocessing

if __name__ == '__main__':
    multiprocessing.freeze_support()

def fix_qtwebengine_path():
    if sys.platform == 'darwin' and getattr(sys, 'frozen', False):
        bundle_dir = os.path.dirname(os.path.dirname(sys.executable))
        for root, dirs, files in os.walk(bundle_dir):
            if 'QtWebEngineProcess' in files:
                qt_proc = os.path.join(root, 'QtWebEngineProcess')
                os.environ['QTWEBENGINEPROCESS_PATH'] = qt_proc
                break

fix_qtwebengine_path()


import time
import ctypes
import json
import subprocess
import signal
import requests
import numpy as np
import pandas as pd
import dotenv

if getattr(sys, 'frozen', False):
    _base = os.path.dirname(sys.executable)
    USER_DATA_DIR = _base
else:
    _base = os.path.dirname(os.path.abspath(__file__))
    USER_DATA_DIR = None

# Tìm ngược lên thư mục gốc OKX_Trade_Kit (chứa z_bot_sub1)
PROJECT_DIR = _base
for _ in range(4):
    if os.path.isdir(os.path.join(PROJECT_DIR, "z_bot_sub1")):
        break
    PROJECT_DIR = os.path.dirname(PROJECT_DIR)

if not USER_DATA_DIR:
    USER_DATA_DIR = PROJECT_DIR

FIREBASE_URL = "https://botvip-e5772-default-rtdb.asia-southeast1.firebasedatabase.app"

sys.path.insert(0, PROJECT_DIR)



def get_app_version():
    try:
        if getattr(sys, 'frozen', False):
            # version.json được đóng gói vào sys._MEIPASS bởi PyInstaller --onefile
            base_dir = sys._MEIPASS
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            for _ in range(4):
                if os.path.exists(os.path.join(base_dir, "version.json")):
                    break
                base_dir = os.path.dirname(base_dir)
        v_file = os.path.join(base_dir, "version.json")
        with open(v_file, "r", encoding="utf-8") as f:
            return json.load(f).get("version", "1.0.59")
    except:
        return "1.0.59"

APP_VERSION = "1.0.98"

IS_LOGGED_IN = False
CURRENT_USER = None
CURRENT_UID = None

def exception_hook(exctype, value, traceback):
    import traceback as tb
    log_path = os.path.join(USER_DATA_DIR, "crash_log.txt")
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("=== CRASH LOG ===\n")
        tb.print_exception(exctype, value, traceback, file=f)
    tb.print_exception(exctype, value, traceback)

sys.excepthook = exception_hook

try:
    from PyQt6 import QtWidgets, QtCore, QtGui
except ImportError:
    if getattr(sys, 'frozen', False):
        raise ImportError("Thiếu thư viện PyQt6 trong file đóng gói. Hãy liên hệ admin.")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyQt6"])
    import importlib
    importlib.invalidate_caches()
    from PyQt6 import QtWidgets, QtCore, QtGui

try:
    from lightweight_charts.widgets import QtChart
except ImportError:
    if getattr(sys, 'frozen', False):
        raise ImportError("Thiếu thư viện lightweight_charts trong file đóng gói. Hãy liên hệ admin.")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "lightweight_charts", "PyQt6-WebEngine"])
    import importlib
    importlib.invalidate_caches()
    from lightweight_charts.widgets import QtChart


class ToggleSwitch(QtWidgets.QCheckBox):
    def __init__(self, parent=None, text_on='ON', text_off='OFF', width=36, height=18):
        super().__init__(parent)
        self.text_on = text_on
        self.text_off = text_off
        self.setFixedSize(width, height)
        self.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)

    def paintEvent(self, event):
        painter = QtGui.QPainter(self)
        painter.setRenderHint(QtGui.QPainter.RenderHint.Antialiasing)
        
        rect = self.rect()
        checked = self.isChecked()
        
        bg_color = QtGui.QColor('#00cc66') if checked else QtGui.QColor('#808080')
        painter.setBrush(bg_color)
        painter.setPen(QtCore.Qt.PenStyle.NoPen)
        painter.drawRoundedRect(rect, rect.height() // 2, rect.height() // 2)
        
        painter.setPen(QtGui.QColor('white'))
        font = painter.font()
        font.setBold(True)
        font.setPixelSize(rect.height() // 2 - 1)
        painter.setFont(font)
        
        if checked:
            painter.drawText(QtCore.QRectF(3, 0, rect.width() - rect.height() - 2, rect.height()), QtCore.Qt.AlignmentFlag.AlignCenter, self.text_on)
        else:
            painter.drawText(QtCore.QRectF(rect.height() - 1, 0, rect.width() - rect.height() - 2, rect.height()), QtCore.Qt.AlignmentFlag.AlignCenter, self.text_off)
            
        thumb_size = rect.height() - 6
        thumb_rect = QtCore.QRect(rect.width() - thumb_size - 3 if checked else 3, 3, thumb_size, thumb_size)
        painter.setBrush(QtGui.QColor('white'))
        painter.drawEllipse(thumb_rect)

class HelpButton(QtWidgets.QPushButton):
    def __init__(self, tooltip_text, parent=None):
        super().__init__("[?]", parent)
        self._help_text = tooltip_text
        self.setFixedSize(20, 20)
        self.setStyleSheet("QPushButton { background-color: transparent; color: #888888; font-weight: normal; font-size: 9px; border: none; padding: 0px; } "
                           "QToolTip { background-color: #1a1a1a; color: #ffaa00; border: 1px solid #ffaa00; padding: 4px; }")
        self.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        
    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.MouseButton.LeftButton:
            # Hiện phía trên dấu [?] bằng cách dời y lên
            pos = self.mapToGlobal(QtCore.QPoint(self.width() // 2, -15))
            QtWidgets.QToolTip.showText(pos, self._help_text, self)
        super().mousePressEvent(event)

class BotSubprocessWorker(QtCore.QThread):
    log_signal = QtCore.pyqtSignal(str)
    finished_signal = QtCore.pyqtSignal()

    def __init__(self, env_file, strategy):
        super().__init__()
        self.env_file = env_file
        self.strategy = strategy
        self.process = None
        self._is_running = True

    def run(self):
        cmd = [sys.executable, '--run-bot', self.strategy, self.env_file]
        if not getattr(sys, 'frozen', False):
            cmd = [sys.executable, sys.argv[0], '--run-bot', self.strategy, self.env_file]

        try:
            creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding='utf-8',
                errors='replace',
                creationflags=creationflags
            )
            
            for line in self.process.stdout:
                if not self._is_running:
                    break
                self.log_signal.emit(line.rstrip('\n'))
                
            self.process.wait()
        except Exception as e:
            self.log_signal.emit(f"❌ Lỗi khởi chạy tiến trình {self.strategy}: {e}")
        finally:
            self.finished_signal.emit()

    def stop(self):
        self._is_running = False
        if self.process:
            self.log_signal.emit("\n🛑 Đang gửi tín hiệu dừng tiến trình...")
            try:
                flag_path = os.path.join(USER_DATA_DIR, "json_data", f"stop_{self.strategy}.flag")
                with open(flag_path, "w") as f: f.write("stop")
                
                for _ in range(15):
                    if self.process.poll() is not None: break
                    time.sleep(0.2)
                    
                if self.process.poll() is None:
                    self.process.terminate()
                    self.process.wait(timeout=2)
            except Exception:
                try: self.process.kill()
                except: pass

class LiveChartWorker(QtCore.QThread):
    chart_data_signal = QtCore.pyqtSignal(dict)
    
    def __init__(self, inst_id="BTC-USDT-SWAP", bar="5m", parent=None):
        super().__init__(parent)
        self.inst_id = inst_id
        self.bar = bar
        self._is_running = True
        
    def run(self):
        import requests
        import time
        while self._is_running:
            try:
                resp = requests.get(f"https://www.okx.com/api/v5/market/candles?instId={self.inst_id}&bar={self.bar}&limit=100", timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("code") == "0":
                        candles = data.get("data", [])
                        if candles:
                            candles.reverse()
                            chart_data = {
                                "type": "chart_data",
                                "candles": [c[:6] for c in candles]
                            }
                            self.chart_data_signal.emit(chart_data)
            except Exception:
                pass
            time.sleep(5)
            
    def stop(self):
        self._is_running = False
        self.wait()

class HoverSoundFilter(QtCore.QObject):
    def __init__(self, tab_bar):
        super().__init__(tab_bar)
        self.tab_bar = tab_bar
        self.last_hovered_index = -1
        self.tab_bar.setMouseTracking(True)
        self.tab_bar.setAttribute(QtCore.Qt.WidgetAttribute.WA_Hover, True)
        
        try:
            from PyQt6.QtMultimedia import QSoundEffect
            from PyQt6.QtCore import QUrl
            import os
            self.sound = QSoundEffect()
            media_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "soft_click.wav")
            if os.path.exists(media_path):
                self.sound.setSource(QUrl.fromLocalFile(media_path))
                self.sound.setVolume(1.0) # The 5% volume is baked natively into the wav file
        except Exception:
            self.sound = None
            
    def eventFilter(self, obj, event):
        if event.type() in (QtCore.QEvent.Type.HoverMove, QtCore.QEvent.Type.MouseMove, QtCore.QEvent.Type.HoverEnter):
            pos = event.position().toPoint() if hasattr(event, 'position') else event.pos()
            index = self.tab_bar.tabAt(pos)
            if index != -1 and index != self.last_hovered_index:
                self.last_hovered_index = index
                if getattr(self, 'sound', None):
                    self.sound.play()
                else:
                    try:
                        import winsound
                        winsound.Beep(200, 3)
                    except Exception:
                        pass
            elif index == -1:
                self.last_hovered_index = -1
        elif event.type() == QtCore.QEvent.Type.Leave:
            self.last_hovered_index = -1
        return super().eventFilter(obj, event)

class ButtonHoverSoundFilter(QtCore.QObject):
    def __init__(self, button):
        super().__init__(button)
        self.button = button
        self.button.setAttribute(QtCore.Qt.WidgetAttribute.WA_Hover, True)
        
    def eventFilter(self, obj, event):
        if event.type() == QtCore.QEvent.Type.HoverEnter:
            if self.button.isEnabled():
                try:
                    import winsound
                    # Âm thanh khác một xíu: tiếng "ting" thanh hơn, giống MT5
                    winsound.Beep(800, 4)
                except Exception:
                    pass
        return super().eventFilter(obj, event)

class BotInstanceWidget(QtWidgets.QWidget):
    def __init__(self, strategy_id, strategy_name, env_files):
        super().__init__()
        self.strategy_id = strategy_id
        self.strategy_name = strategy_name
        self.env_files = env_files
        self.worker = None
        self.init_ui()
        self.load_current_settings()

    def set_welcome_name(self, name):
        pass # Đã chuyển nút Đăng Xuất lên thanh Header của App chính

    def init_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)

        # Khởi tạo dropdown (sẽ được add vào tab API)
        self.account_dropdown = QtWidgets.QComboBox()
        self.account_dropdown.setView(QtWidgets.QListView())
        self.account_dropdown.setMinimumWidth(180)
        
        if self.strategy_id in ["trinhsat", "quansu"]:
            self.account_dropdown.addItem("Mặc định (Không cần API)", ".env")
            self.account_dropdown.setDisabled(True)
        else:
            for env in self.env_files:
                display = "Tài khoản chính (.env)" if env == ".env" else f"Sub ({env})"
                self.account_dropdown.addItem(display, env)

        target_env = ".env" if self.strategy_id == "main" else f".env_{self.strategy_id}"
        idx = self.account_dropdown.findData(target_env)
        if idx >= 0:
            self.account_dropdown.setCurrentIndex(idx)
            
        self.account_dropdown.currentIndexChanged.connect(self.on_account_changed)

        # 3 Inner Tabs
        self.tabs = QtWidgets.QTabWidget()
        self.tabs.setObjectName("InnerTabs")
        self.inner_hover_filter = HoverSoundFilter(self.tabs.tabBar())
        self.tabs.tabBar().installEventFilter(self.inner_hover_filter)
        self.tabs.tabBar().setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        layout.addWidget(self.tabs)
        
        # Đưa trạng thái (ĐANG DỪNG/CHẠY) lên thanh corner của Tab
        self.status_led = QtWidgets.QLabel("● ĐANG DỪNG")
        self.status_led.setFont(QtGui.QFont("Segoe UI", 10, QtGui.QFont.Weight.Bold))
        self.status_led.setStyleSheet("color: #FF3333; padding: 5px 15px;")
        self.tabs.setCornerWidget(self.status_led, QtCore.Qt.Corner.TopRightCorner)

        # TAB 1: DASHBOARD
        self.tab_dashboard = QtWidgets.QWidget()
        self.setup_tab_dashboard()
        self.tabs.addTab(self.tab_dashboard, "📊 Bảng Điều Khiển")

        if self.strategy_id not in ["trinhsat", "quansu"]:
            # TAB 2: API CONFIG
            self.tab_api = QtWidgets.QWidget()
            self.setup_tab_api()
            self.tabs.addTab(self.tab_api, "🔑 Cấu Hình API Key")

            # TAB 3: STRATEGY CONFIG
            self.tab_strategy = QtWidgets.QWidget()
            self.setup_tab_strategy()
            self.tabs.addTab(self.tab_strategy, "⚙️ Cấu Hình Chiến Thuật")

    def setup_tab_dashboard(self):
        dash_layout = QtWidgets.QVBoxLayout(self.tab_dashboard)
        dash_layout.setContentsMargins(10, 10, 10, 10)
        dash_layout.setSpacing(15)

        # Hàng trên: Hành động
        top_panel = QtWidgets.QHBoxLayout()
        top_panel.setSpacing(15)

        # Nhóm Hành Động
        control_box = QtWidgets.QGroupBox("Hành Động")
        control_layout = QtWidgets.QHBoxLayout(control_box)
        control_layout.setContentsMargins(15, 20, 15, 15)
        control_layout.setSpacing(10)

        self.btn_start = QtWidgets.QPushButton("▶ BẮT ĐẦU CHẠY BOT")
        self.btn_start.setFont(QtGui.QFont("Segoe UI", 10, QtGui.QFont.Weight.Bold))
        self.btn_start.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_start.setStyleSheet("""
            QPushButton { background-color: #2E7D32; color: white; min-height: 28px; min-width: 120px; padding: 5px 10px; border: 1px solid transparent; border-radius: 4px; }
            QPushButton:hover { background-color: #388E3C; border: 1px solid #ffaa00; }
        """)
        self.btn_start_hover = ButtonHoverSoundFilter(self.btn_start)
        self.btn_start.installEventFilter(self.btn_start_hover)
        self.btn_start.clicked.connect(self.start_bot)

        self.btn_stop = QtWidgets.QPushButton("🛑 DỪNG HOẠT ĐỘNG")
        self.btn_stop.setFont(QtGui.QFont("Segoe UI", 10, QtGui.QFont.Weight.Bold))
        self.btn_stop.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_stop.setStyleSheet("""
            QPushButton { background-color: #C62828; color: white; min-height: 28px; min-width: 120px; padding: 5px 10px; border: 1px solid transparent; border-radius: 4px; }
            QPushButton:hover { background-color: #D32F2F; border: 1px solid #ffaa00; }
            QPushButton:disabled { background-color: #555555; color: #888888; border: 1px solid #444; }
        """)
        self.btn_stop_hover = ButtonHoverSoundFilter(self.btn_stop)
        self.btn_stop.installEventFilter(self.btn_stop_hover)
        self.btn_stop.setEnabled(False)
        self.btn_stop.clicked.connect(self.stop_bot)

        control_layout.addWidget(self.btn_start)
        control_layout.addWidget(self.btn_stop)
        top_panel.addWidget(control_box)
        
        top_panel.addStretch(1)
        dash_layout.addLayout(top_panel, 0)


        # Khung phân vùng Tab Live View
        self.tab_live_view = QtWidgets.QTabWidget()
        self.live_view_hover_filter = HoverSoundFilter(self.tab_live_view.tabBar())
        self.tab_live_view.tabBar().installEventFilter(self.live_view_hover_filter)
        self.tab_live_view.tabBar().setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.tab_live_view.setStyleSheet("""
            QTabWidget::pane { border: 1px solid #333333; border-radius: 4px; }
            QTabBar::tab { background: #1e1e1e; color: #a0a0a0; padding: 8px 20px; border: 1px solid #333; border-bottom: none; border-top-left-radius: 4px; border-top-right-radius: 4px; }
            QTabBar::tab:selected { background: #2d2d2d; color: #FF9900; font-weight: bold; }
            QTabBar::tab:hover { background: #2e2e2e; }
        """)

        # Tab 1: Logs
        self.tab_logs = QtWidgets.QWidget()
        console_layout = QtWidgets.QVBoxLayout(self.tab_logs)
        
        log_header = QtWidgets.QHBoxLayout()
        log_header.addWidget(QtWidgets.QLabel("Màn hình logs hệ thống (realtime):"))
        log_header.addStretch(1)
        
        btn_clear_log = QtWidgets.QPushButton("🗑️ Xóa Màn Hình Logs")
        btn_clear_log.setStyleSheet("max-width: 150px; padding: 5px;")
        
        self.log_display = QtWidgets.QPlainTextEdit()
        self.log_display.setReadOnly(True)
        self.log_display.setMaximumBlockCount(100)
        self.log_display.setLineWrapMode(QtWidgets.QPlainTextEdit.LineWrapMode.NoWrap)
        self.log_display.setFont(QtGui.QFont("Courier New", 10))
        self.log_display.setStyleSheet(
            "background-color: #0c0c0c; color: #FFFFFF; font-family: 'Courier New', 'Consolas', monospace; font-size: 13px;"
            "border: 1px solid #333333; border-radius: 4px;"
        )
        
        btn_clear_log.clicked.connect(self.log_display.clear)
        log_header.addWidget(btn_clear_log)
        console_layout.addLayout(log_header)
        console_layout.addWidget(self.log_display)


        # Tab 2: Chart
        self.tab_chart = QtWidgets.QWidget()
        chart_layout = QtWidgets.QVBoxLayout(self.tab_chart)
        chart_layout.setContentsMargins(0, 0, 0, 0)
        
        control_layout = QtWidgets.QHBoxLayout()
        control_layout.setContentsMargins(10, 10, 10, 0)
        
        self.combo_coin = QtWidgets.QComboBox()
        self.combo_coin.addItems(["BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP", "XRP-USDT-SWAP"])
        self.combo_tf = QtWidgets.QComboBox()
        self.combo_tf.addItems(["1m", "5m", "15m", "1H", "4H", "1D"])
        self.combo_tf.setCurrentText("5m")
        
        control_layout.addWidget(QtWidgets.QLabel("Cặp giao dịch:"))
        control_layout.addWidget(self.combo_coin)
        control_layout.addWidget(QtWidgets.QLabel("Timeframe:"))
        control_layout.addWidget(self.combo_tf)
        control_layout.addStretch()
        
        chart_layout.addLayout(control_layout)
        
        try:
            self.chart_widget = QtChart()
            chart_layout.addWidget(self.chart_widget.get_webview())
            
            self.chart_widget.layout(background_color='#0c0c0c', text_color='#e0e0e0', font_size=12)
            self.chart_widget.candle_style(up_color='#26a69a', down_color='#ef5350',
                                    border_up_color='#26a69a', border_down_color='#ef5350',
                                    wick_up_color='#26a69a', wick_down_color='#ef5350')
            self.chart_widget.volume_config(up_color='rgba(38, 166, 154, 0.5)', down_color='rgba(239, 83, 80, 0.5)')
            self.chart_widget.watermark('BTC-USDT-SWAP (Live)', color='rgba(255, 153, 0, 0.1)')
            self.chart_widget.grid(vert_enabled=True, horz_enabled=True, color='#2a2a2a')
            self.chart_widget.time_scale(right_offset=30)
            
            # Khởi chạy luồng lấy dữ liệu chart auto
            self._chart_initialized = False
            self.live_chart_worker = LiveChartWorker(inst_id="BTC-USDT-SWAP", bar="5m", parent=self)
            self.live_chart_worker.chart_data_signal.connect(self.update_live_chart)
            
            self.combo_coin.currentTextChanged.connect(self.on_chart_config_changed)
            self.combo_tf.currentTextChanged.connect(self.on_chart_config_changed)
            
            self.live_chart_worker.start()
        except Exception as e:
            chart_layout.addWidget(QtWidgets.QLabel(f"Lỗi khởi tạo biểu đồ: {str(e)}"))
            self.chart_widget = None

        self.split_view = QtWidgets.QSplitter(QtCore.Qt.Orientation.Horizontal)
        self.split_view.addWidget(self.tab_logs)
        self.split_view.addWidget(self.tab_chart)
        self.split_view.setSizes([550, 550])

        self.tab_live_view.addTab(self.split_view, "📊 TỔNG QUAN (CHART & LOGS)")

        self.combo_layout_mode = QtWidgets.QComboBox()
        self.combo_layout_mode.addItems(["Chế độ ngang", "Chế độ dọc"])
        self.combo_layout_mode.setStyleSheet("padding: 2px; font-weight: bold; font-size: 11px;")
        
        def on_layout_mode_changed(text):
            if not hasattr(self, 'split_view') or self.split_view is None:
                return
            if "ngang" in text.lower():
                self.split_view.setOrientation(QtCore.Qt.Orientation.Horizontal)
                self.split_view.insertWidget(0, self.tab_logs)
                self.split_view.insertWidget(1, self.tab_chart)
                self.split_view.setSizes([550, 550])
            else:
                self.split_view.setOrientation(QtCore.Qt.Orientation.Vertical)
                self.split_view.insertWidget(0, self.tab_chart)
                self.split_view.insertWidget(1, self.tab_logs)
                self.split_view.setSizes([750, 350])
                
        self.combo_layout_mode.currentTextChanged.connect(on_layout_mode_changed)
        
        corner_widget = QtWidgets.QWidget()
        c_layout = QtWidgets.QHBoxLayout(corner_widget)
        c_layout.setContentsMargins(0, 0, 10, 0)
        c_layout.addWidget(self.combo_layout_mode)
        
        self.tab_live_view.setCornerWidget(corner_widget, QtCore.Qt.Corner.TopRightCorner)

        dash_layout.addWidget(self.tab_live_view, 1)

    def setup_tab_api(self):
        layout = QtWidgets.QVBoxLayout(self.tab_api)
        
        # Chọn tài khoản
        acc_layout = QtWidgets.QHBoxLayout()
        acc_layout.addWidget(QtWidgets.QLabel("Chọn tài khoản đang cấu hình:"))
        acc_layout.addWidget(self.account_dropdown)
        acc_layout.addStretch(1)
        layout.addLayout(acc_layout)
        
        form_group = QtWidgets.QGroupBox("Thông Tin API OKX")
        form_group.setSizePolicy(QtWidgets.QSizePolicy.Policy.Expanding, QtWidgets.QSizePolicy.Policy.Preferred)
        layout_api = QtWidgets.QVBoxLayout(form_group)
        layout_api.setSpacing(10)
        
        self.input_api_key = QtWidgets.QLineEdit()
        self.input_secret_key = QtWidgets.QLineEdit()
        self.input_secret_key.setEchoMode(QtWidgets.QLineEdit.EchoMode.Password)
        self.input_passphrase = QtWidgets.QLineEdit()
        self.input_passphrase.setEchoMode(QtWidgets.QLineEdit.EchoMode.Password)
        self.chk_demo_mode = ToggleSwitch(text_on="DEMO", text_off="THẬT", width=56, height=20)
        
        form_layout = QtWidgets.QFormLayout()
        form_layout.setLabelAlignment(QtCore.Qt.AlignmentFlag.AlignLeft)
        form_layout.setFormAlignment(QtCore.Qt.AlignmentFlag.AlignLeft | QtCore.Qt.AlignmentFlag.AlignTop)
        form_layout.setSpacing(5)

        self.input_api_key.setFixedWidth(600)
        self.input_secret_key.setFixedWidth(600)
        self.input_passphrase.setFixedWidth(600)
        
        self.input_api_key.setStyleSheet("min-width: 600px; max-width: 600px;")
        self.input_secret_key.setStyleSheet("min-width: 600px; max-width: 600px;")
        self.input_passphrase.setStyleSheet("min-width: 600px; max-width: 600px;")
        
        form_layout.addRow("Chế Độ Giao Dịch:", self.chk_demo_mode)
        form_layout.addRow("OKX_API_KEY:", self.input_api_key)
        form_layout.addRow("OKX_SECRET_KEY:", self.input_secret_key)
        form_layout.addRow("OKX_PASSPHRASE:", self.input_passphrase)
        
        # Đặt Form vào một layout ngang có lò xo dồn sang trái
        h_container = QtWidgets.QHBoxLayout()
        h_container.addLayout(form_layout)
        h_container.addStretch(1)
        
        layout_api.addLayout(h_container)
        layout.addWidget(form_group)
        
        self.btn_save_api = QtWidgets.QPushButton("💾 LƯU CẤU HÌNH API KEY")
        self.btn_save_api.setStyleSheet("background-color: #ff9900; color: black; min-height: 40px;")
        self.btn_save_api.clicked.connect(self.save_api_settings)
        layout.addWidget(self.btn_save_api)
        
        layout.addSpacing(15)
        
        # Nhóm Lệnh Can Thiệp Nhanh
        actions_box = QtWidgets.QGroupBox("Lệnh Can Thiệp Nhanh (Audit Hệ Thống)")
        actions_layout = QtWidgets.QHBoxLayout(actions_box)
        actions_layout.setContentsMargins(15, 20, 15, 15)
        actions_layout.setSpacing(10)

        self.btn_reset_wallet = QtWidgets.QPushButton("♻️ Reset Vốn Gốc (Audit)")
        self.btn_reset_wallet.setStyleSheet("min-height: 40px; min-width: 150px;")
        self.btn_reset_wallet.clicked.connect(self.reset_wallet)

        self.btn_reset_nen = QtWidgets.QPushButton("♻️ Reset Đếm Nến")
        self.btn_reset_nen.setStyleSheet("min-height: 40px; min-width: 150px;")
        self.btn_reset_nen.clicked.connect(self.reset_nen)

        actions_layout.addWidget(self.btn_reset_wallet)
        actions_layout.addWidget(self.btn_reset_nen)
        actions_layout.addStretch(1)
        layout.addWidget(actions_box)
        layout.addSpacing(15)

        # Bổ sung Mã Máy (HWID)
        hwid_box = QtWidgets.QGroupBox("Mã Máy (HWID) Cá Nhân")
        hwid_layout = QtWidgets.QHBoxLayout(hwid_box)
        hwid_layout.setContentsMargins(15, 20, 15, 15)
        
        lbl_hwid_msg = QtWidgets.QLabel("Mã Máy của bạn:")
        hwid_val = get_hwid()
        self.btn_hwid_display = QtWidgets.QPushButton(hwid_val)
        self.btn_hwid_display.setStyleSheet("background: transparent; color: #00ffff; font-weight: bold; font-size: 15px; border: none; padding: 0px; text-align: left;")
        self.btn_hwid_display.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_hwid_display.setToolTip("Click để copy Mã Máy")
        
        def on_copy_hwid():
            QtWidgets.QApplication.clipboard().setText(hwid_val)
            self.btn_hwid_display.setText("✅ Đã Copy!")
            QtCore.QTimer.singleShot(1500, lambda: self.btn_hwid_display.setText(hwid_val))
            
        self.btn_hwid_display.clicked.connect(on_copy_hwid)
        
        hwid_layout.addWidget(lbl_hwid_msg)
        hwid_layout.addWidget(self.btn_hwid_display)
        hwid_layout.addStretch(1)
        layout.addWidget(hwid_box)
        
        layout.addStretch(1)

    def setup_tab_strategy(self):
        if self.strategy_id == "sub2":
            self.setup_tab_strategy_smc()
            return
            
        # Create Scroll Area
        scroll = QtWidgets.QScrollArea()

        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QtWidgets.QFrame.Shape.NoFrame)
        
        container = QtWidgets.QWidget()
        container.setStyleSheet("background-color: transparent;")
        scroll.setStyleSheet("background-color: transparent;")
        layout = QtWidgets.QVBoxLayout(container)
        layout.setSpacing(15)

        # Helper to create fields with tooltips
        def add_field(layout_obj, row, label_text, widget, tooltip_text):
            lbl = QtWidgets.QLabel(label_text)
            lbl.setStyleSheet("color: #e0e0e0;")
            btn_help = HelpButton(tooltip_text)
            
            h_lbl = QtWidgets.QHBoxLayout()
            h_lbl.addWidget(lbl)
            h_lbl.addWidget(btn_help)
            h_lbl.addStretch()
            
            layout_obj.addLayout(h_lbl, row, 0)
            layout_obj.addWidget(widget, row, 1)


        def add_checkbox(layout_obj, row, col, label_text, widget, tooltip_text, colspan=1):
            lbl = QtWidgets.QLabel(label_text)
            lbl.setStyleSheet("color: #e0e0e0; font-weight: bold;")
            btn_help = HelpButton(tooltip_text)
            
            h_lbl = QtWidgets.QHBoxLayout()
            h_lbl.addWidget(widget)
            h_lbl.addWidget(lbl)
            h_lbl.addWidget(btn_help)
            h_lbl.addStretch()
            
            layout_obj.addLayout(h_lbl, row, col, 1, colspan)


        # 1. CÔNG TẮC CHIẾN THUẬT
        grp_toggles = QtWidgets.QGroupBox("Công Tắc Chiến Thuật")
        l_toggles = QtWidgets.QGridLayout(grp_toggles)
        
        self.chk_main = ToggleSwitch()
        self.chk_xole = ToggleSwitch()
        self.chk_pingpong = ToggleSwitch()
        self.chk_dynamic_pingpong_tp = ToggleSwitch()
        
        add_checkbox(l_toggles, 0, 0, "Bật MAIN", self.chk_main, "Bật/Tắt chiến thuật Đa Khung EMA200 (Main).")
        add_checkbox(l_toggles, 0, 1, "Bật XOLE", self.chk_xole, "Bật/Tắt chiến thuật Bắt Bẻ Xole (Giao dịch ngược xu hướng nhỏ).")
        add_checkbox(l_toggles, 0, 2, "Bật PING-PONG", self.chk_pingpong, "Bật/Tắt chiến thuật Ping-Pong (Đánh nhồi trong vùng Squeeze).")
        add_checkbox(l_toggles, 1, 0, "Bật TP Động (Option A)", self.chk_dynamic_pingpong_tp, "Bật cơ chế Chốt lời động bám theo EMA200 của khung thời gian nhỏ hơn liền kề.", colspan=3)
        layout.addWidget(grp_toggles)

        # 2. LỚP BẢO VỆ CỤC BỘ
        grp_safeguard = QtWidgets.QGroupBox("Lớp Bảo Vệ Cục Bộ")

        l_safeguard = QtWidgets.QGridLayout(grp_safeguard)
        
        self.chk_sideway_safe = ToggleSwitch()
        self.chk_squeeze_escape = ToggleSwitch()
        self.chk_safeguard_entry = ToggleSwitch()
        self.chk_trailing_sl = ToggleSwitch()
        self.chk_max_roi = ToggleSwitch()
        self.chk_sideway_vap = ToggleSwitch()
        self.chk_h4_flip = ToggleSwitch()
        
        add_checkbox(l_safeguard, 0, 0, "Chốt Sideway an toàn", self.chk_sideway_safe, "Chốt lời chủ động khi Sideway strict + ROI >= 20%.")
        add_checkbox(l_safeguard, 0, 1, "Thoát nén Squeeze", self.chk_squeeze_escape, "Thoát sớm khi khung vị thế bị nén tam giác (Squeeze).")
        add_checkbox(l_safeguard, 0, 2, "Bảo vệ Entry", self.chk_safeguard_entry, "Thoát hòa khi lỗ sâu >70% SL rồi giá hồi về Entry.")
        add_checkbox(l_safeguard, 1, 0, "Trailing SL", self.chk_trailing_sl, "Trailing SL động — khóa lợi nhuận khi ROI tăng dần.")
        add_checkbox(l_safeguard, 1, 1, "Chốt Max ROI", self.chk_max_roi, "Chốt lời tối đa khi ROI >= 120% (Lợi nhuận Vàng).")
        add_checkbox(l_safeguard, 1, 2, "Cắt hòa Vấp EMA", self.chk_sideway_vap, "Cắt hòa/dương khi Vấp EMA200 >= 2 lần liên tiếp.")
        add_checkbox(l_safeguard, 2, 0, "Đóng H4 đảo chiều", self.chk_h4_flip, "Đóng toàn bộ vị thế ngược chiều khi H4 đảo chiều (tích lũy >= 60).")
        layout.addWidget(grp_safeguard)

        # 3. QUẢN LÝ VỐN & RỦI RO
        grp_risk = QtWidgets.QGroupBox("Quản Lý Vốn & Rủi Ro")

        l_risk = QtWidgets.QGridLayout(grp_risk)
        self.chk_dynamic_risk = ToggleSwitch()
        add_checkbox(l_risk, 0, 0, "Bật quản lý Volume theo % vốn", self.chk_dynamic_risk, "Nếu bật, bot sẽ dùng % vốn dưới đây để vào lệnh. Nếu tắt, sẽ dùng Vốn Limit Cố Định.", 2)
        
        self.input_risk_pct = QtWidgets.QDoubleSpinBox(); self.input_risk_pct.setSuffix(" %")
        add_field(l_risk, 1, "Vào lệnh theo % vốn (%):", self.input_risk_pct, "Phần trăm tổng tài khoản sẽ bị mất nếu lệnh chạm mốc Dừng Lỗ (SL). Ví dụ 2.0%.")
        
        self.input_tp_pct = QtWidgets.QDoubleSpinBox(); self.input_tp_pct.setSuffix(" %")
        self.input_sl_pct = QtWidgets.QDoubleSpinBox(); self.input_sl_pct.setSuffix(" %")
        add_field(l_risk, 2, "Chốt lời cơ sở (M5):", self.input_tp_pct, "Tỷ lệ Take Profit cơ sở tính theo giá khớp. VD: 2.1%.")
        add_field(l_risk, 3, "Dừng lỗ cơ sở (M5):", self.input_sl_pct, "Tỷ lệ Stop Loss cơ sở tính theo giá khớp. VD: 2.1%.")
        
        self.input_pos_vol = QtWidgets.QDoubleSpinBox(); self.input_pos_vol.setMaximum(1000000)
        add_field(l_risk, 4, "Vào lệnh theo volume đòn bẩy:", self.input_pos_vol, "Vốn cố định sử dụng nếu Quản lý vốn động bị tắt. (POSITION_VOLUME_HIGH_CONFIDENCE)")
        layout.addWidget(grp_risk)

        # 4. BỘ LỌC & DUNG SAI KỸ THUẬT
        grp_filter = QtWidgets.QGroupBox("Bộ Lọc & Dung Sai Kỹ Thuật")

        l_filter = QtWidgets.QGridLayout(grp_filter)
        
        
        self.input_dca_gap_pct = QtWidgets.QDoubleSpinBox(); self.input_dca_gap_pct.setSuffix(" %"); self.input_dca_gap_pct.setDecimals(3)
        add_field(l_filter, 1, "Khoảng cách DCA tối thiểu:", self.input_dca_gap_pct, "Khoảng cách tối thiểu giữa 2 trục EMA200 liền kề (VD: 0.5%) để rải limit. Dưới mức này sẽ gộp lệnh.")
        
        self.input_confluence_pct = QtWidgets.QDoubleSpinBox(); self.input_confluence_pct.setSuffix(" %"); self.input_confluence_pct.setDecimals(3)
        add_field(l_filter, 2, "Hợp lưu EMA200 đa khung:", self.input_confluence_pct, "Dung sai độ lệch cho phép (VD: 0.23%) khi xét điểm hợp lưu EMA200 giữa nhiều khung giờ.")
        
        self.input_squeeze_tol = QtWidgets.QDoubleSpinBox(); self.input_squeeze_tol.setSuffix(" %"); self.input_squeeze_tol.setDecimals(3)
        add_field(l_filter, 3, "Dung sai nén Squeeze:", self.input_squeeze_tol, "Dung sai khoảng cách nén tam giác hẹp giữa EMA34 và EMA89 (VD: 0.25%).")
        
        self.input_drift_pct = QtWidgets.QDoubleSpinBox(); self.input_drift_pct.setSuffix(" %"); self.input_drift_pct.setDecimals(3)
        add_field(l_filter, 4, "Ngưỡng trượt EMA200:", self.input_drift_pct, "Ngưỡng trượt tối đa EMA200 trong 20 nến (0.3% cho phép độ dốc nhẹ <= 4 độ). Nếu cao hơn sẽ bị coi là trend mạnh.")
        
        self.input_alt_diff = QtWidgets.QDoubleSpinBox(); self.input_alt_diff.setSuffix(" %"); self.input_alt_diff.setDecimals(3)
        add_field(l_filter, 5, "Lệch pha Alt/BTC:", self.input_alt_diff, "Ngưỡng lệch pha Altcoin so với BTC (VD: 0.5%) để bật chế độ lùi Limit sâu.")
        
        self.input_entry_offset = QtWidgets.QDoubleSpinBox(); self.input_entry_offset.setSuffix(" %"); self.input_entry_offset.setDecimals(4)
        add_field(l_filter, 6, "Đệm đón lõm Entry:", self.input_entry_offset, "Đệm (VD: 0.06%) trừ lùi vào vị trí đặt Limit để dễ khớp trước vạch cản.")
        
        self.input_accum_candles = QtWidgets.QSpinBox(); self.input_accum_candles.setMaximum(9999)
        add_field(l_filter, 7, "Nến tích lũy bắt buộc:", self.input_accum_candles, "Số nến tối thiểu phải tích lũy đi ngang liên tục để xác nhận vùng hỗ trợ.")
        layout.addWidget(grp_filter)

        # 5. CẤU HÌNH PING-PONG & CHU KỲ
        grp_misc = QtWidgets.QGroupBox("Cấu Hình Ping-Pong & Lượng Tử")
        l_misc = QtWidgets.QGridLayout(grp_misc)
        
        self.input_pp_div = QtWidgets.QDoubleSpinBox()
        add_field(l_misc, 0, "Tỷ lệ chia Volume Ping-Pong:", self.input_pp_div, "Tỷ lệ chia nhỏ Volume khi đánh nhồi Ping-Pong trong vùng Squeeze (VD: 3.0).")
        
        self.input_pp_lev = QtWidgets.QSpinBox(); self.input_pp_lev.setMaximum(200)
        add_field(l_misc, 1, "Đòn bẩy Ping-Pong:", self.input_pp_lev, "Đòn bẩy cô lập (Isolated) riêng cho Ping-Pong (VD: 50x).")
        
        self.input_q_buffer = QtWidgets.QSpinBox(); self.input_q_buffer.setMaximum(999)
        add_field(l_misc, 2, "Nến đệm lượng tử:", self.input_q_buffer, "Số nến quá khứ (Buffer) làm vùng đệm cho thuật toán ma trận lượng tử.")
        
        self.input_q_forth = QtWidgets.QSpinBox(); self.input_q_forth.setMaximum(999)
        add_field(l_misc, 3, "Nến dự báo lượng tử:", self.input_q_forth, "Số nến tương lai mô phỏng được thuật toán phóng chiếu.")
        
        self.input_evo_cycle = QtWidgets.QSpinBox(); self.input_evo_cycle.setMaximum(999999)
        add_field(l_misc, 4, "Chu kỳ tiến hóa (giây):", self.input_evo_cycle, "Thời gian tối thiểu giữa 2 lần AI chạy tự tiến hóa lại hệ số thông minh.")
        layout.addWidget(grp_misc)

        # 6. ĐÒN BẨY & VOL
        grp_port = QtWidgets.QGroupBox("Đòn Bẩy Cắt Ngang (Cross)")
        l_port = QtWidgets.QGridLayout(grp_port)
        self.input_btc_lever = QtWidgets.QSpinBox(); self.input_btc_lever.setMaximum(200)
        add_field(l_port, 0, "BTC Leverage:", self.input_btc_lever, "Đòn bẩy Cross mặc định cho các lệnh BTC (VD: 100x).")
        self.input_btc_vol_mult = QtWidgets.QDoubleSpinBox()
        add_field(l_port, 1, "BTC Vol Multiplier:", self.input_btc_vol_mult, "Hệ số nhân Volume cho BTC. Giúp tùy chỉnh tỷ trọng tài sản.")
        self.input_eth_lever = QtWidgets.QSpinBox(); self.input_eth_lever.setMaximum(200)
        add_field(l_port, 2, "ETH Leverage:", self.input_eth_lever, "Đòn bẩy Cross mặc định cho các lệnh ETH (VD: 100x).")
        self.input_eth_vol_mult = QtWidgets.QDoubleSpinBox()
        add_field(l_port, 3, "ETH Vol Multiplier:", self.input_eth_vol_mult, "Hệ số nhân Volume cho ETH. Giúp tùy chỉnh tỷ trọng tài sản.")
        layout.addWidget(grp_port)

        self.btn_save_strategy = QtWidgets.QPushButton("💾 LƯU CẤU HÌNH CHIẾN THUẬT (AUTO-RELOAD)")
        self.btn_save_strategy.setStyleSheet("background-color: #2E7D32; color: white; min-height: 40px; font-weight: bold; font-size: 14px;")
        self.btn_save_strategy.clicked.connect(self.save_strategy_settings)
        layout.addWidget(self.btn_save_strategy)
        
        scroll.setWidget(container)
        main_layout = QtWidgets.QVBoxLayout(self.tab_strategy)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.addWidget(scroll)


    def setup_tab_strategy_smc(self):
        scroll = QtWidgets.QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QtWidgets.QFrame.Shape.NoFrame)
        
        container = QtWidgets.QWidget()
        container.setStyleSheet("background-color: transparent;")
        scroll.setStyleSheet("background-color: transparent;")
        layout = QtWidgets.QVBoxLayout(container)
        layout.setSpacing(15)

        def add_field(layout_obj, row, label_text, widget, tooltip_text):
            lbl = QtWidgets.QLabel(label_text)
            lbl.setStyleSheet("color: #e0e0e0;")
            btn_help = HelpButton(tooltip_text)
            h_lbl = QtWidgets.QHBoxLayout()
            h_lbl.addWidget(lbl)
            h_lbl.addWidget(btn_help)
            h_lbl.addStretch()
            layout_obj.addLayout(h_lbl, row, 0)
            layout_obj.addWidget(widget, row, 1)

        def add_checkbox(layout_obj, row, col, label_text, widget, tooltip_text, colspan=1):
            h = QtWidgets.QHBoxLayout()
            h.addWidget(widget)
            lbl = QtWidgets.QLabel(label_text)
            lbl.setStyleSheet("color: #e0e0e0;")
            h.addWidget(lbl)
            btn_help = HelpButton(tooltip_text)
            h.addWidget(btn_help)
            h.addStretch()
            layout_obj.addLayout(h, row, col, 1, colspan)

        # 1. DANH MỤC CHIẾN THUẬT
        grp_toggles = QtWidgets.QGroupBox("Danh Mục Chiến Thuật SMC")
        l_toggles = QtWidgets.QGridLayout(grp_toggles)
        self.smc_chk_main = ToggleSwitch()
        add_checkbox(l_toggles, 0, 0, "Bật Chiến thuật SMC Order Block", self.smc_chk_main, "Kích hoạt thuật toán nhận diện Order Block và tự động giao dịch SMC.")
        layout.addWidget(grp_toggles)

        # 2. QUẢN LÝ VỐN & RỦI RO
        grp_risk = QtWidgets.QGroupBox("Quản Lý Vốn & Rủi Ro")
        l_risk = QtWidgets.QGridLayout(grp_risk)
        self.smc_chk_dynamic_risk = ToggleSwitch()
        add_checkbox(l_risk, 0, 0, "Bật quản lý Volume theo % vốn", self.smc_chk_dynamic_risk, "Nếu bật, bot sẽ dùng % vốn dưới đây để vào lệnh.", 2)
        self.smc_input_risk_pct = QtWidgets.QDoubleSpinBox(); self.smc_input_risk_pct.setSuffix(" %")
        add_field(l_risk, 1, "Vào lệnh theo % vốn:", self.smc_input_risk_pct, "Phần trăm tài khoản sẽ vào lệnh (Risk per trade).")
        self.smc_input_pos_vol = QtWidgets.QDoubleSpinBox(); self.smc_input_pos_vol.setMaximum(1000000)
        add_field(l_risk, 2, "Vốn Limit cố định:", self.smc_input_pos_vol, "Sử dụng nếu quản lý vốn động bị tắt.")
        
        self.smc_input_rr = QtWidgets.QDoubleSpinBox(); self.smc_input_rr.setDecimals(1)
        add_field(l_risk, 3, "Tỷ lệ Risk:Reward (RR):", self.smc_input_rr, "Tỷ lệ lợi nhuận/rủi ro cho mỗi setup SMC (VD: 2.0 = 1:2).")
        layout.addWidget(grp_risk)

        # 3. CẤU TRÚC SMC & PIVOT
        grp_smc = QtWidgets.QGroupBox("Cấu Trúc SMC & Order Block")
        l_smc = QtWidgets.QGridLayout(grp_smc)
        
        self.smc_input_swing = QtWidgets.QSpinBox(); self.smc_input_swing.setMaximum(999)
        add_field(l_smc, 0, "Nến Swing Pivot:", self.smc_input_swing, "Số nến để xác định đáy/đỉnh cấu trúc lớn.")
        
        self.smc_input_internal = QtWidgets.QSpinBox(); self.smc_input_internal.setMaximum(999)
        add_field(l_smc, 1, "Nến Internal Pivot:", self.smc_input_internal, "Số nến để xác định đáy/đỉnh cấu trúc nhỏ.")
        
        self.smc_input_ob_max = QtWidgets.QSpinBox(); self.smc_input_ob_max.setMaximum(999)
        add_field(l_smc, 2, "Số lượng OB lưu trữ:", self.smc_input_ob_max, "Số lượng vùng Order Block tối đa giữ lại trên RAM.")
        
        self.smc_input_ob_vol = QtWidgets.QDoubleSpinBox(); self.smc_input_ob_vol.setDecimals(1)
        add_field(l_smc, 3, "Lọc nến OB x ATR:", self.smc_input_ob_vol, "Nến tạo OB phải lớn hơn N lần ATR(200).")
        
        self.smc_combo_source = QtWidgets.QComboBox()
        self.smc_combo_source.addItems(["SWING", "INTERNAL", "ALL"])
        add_field(l_smc, 4, "Nguồn OB ưu tiên:", self.smc_combo_source, "Dùng OB từ cấu trúc lớn (SWING), cấu trúc nhỏ (INTERNAL) hay cả hai.")
        
        self.smc_combo_dir = QtWidgets.QComboBox()
        self.smc_combo_dir.addItems(["BOTH", "LONG_ONLY", "SHORT_ONLY"])
        add_field(l_smc, 5, "Chiều giao dịch:", self.smc_combo_dir, "Đánh cả 2 chiều hay chỉ ưu tiên Long/Short.")
        
        self.smc_combo_tp = QtWidgets.QComboBox()
        self.smc_combo_tp.addItems(["RR", "NEAREST_OB"])
        add_field(l_smc, 6, "Chế độ Chốt lời:", self.smc_combo_tp, "Chốt lời cố định theo RR hay chốt tại Order Block gần nhất.")
        
        self.smc_input_max_setup = QtWidgets.QSpinBox(); self.smc_input_max_setup.setMaximum(99)
        add_field(l_smc, 7, "Số lệnh chạy tối đa:", self.smc_input_max_setup, "Số lượng lệnh (setups) SMC tối đa được mở cùng lúc.")
        
        layout.addWidget(grp_smc)

        self.btn_save_strategy = QtWidgets.QPushButton("💾 LƯU CẤU HÌNH SMC (AUTO-RELOAD)")
        self.btn_save_strategy.setStyleSheet("background-color: #2E7D32; color: white; min-height: 40px; font-weight: bold; font-size: 14px;")
        self.btn_save_strategy.clicked.connect(self.save_strategy_settings)
        layout.addWidget(self.btn_save_strategy)
        
        scroll.setWidget(container)
        main_layout = QtWidgets.QVBoxLayout(self.tab_strategy)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.addWidget(scroll)

    def get_selected_env(self):
        return self.account_dropdown.currentData()

    def get_acc_name(self):
        env = self.get_selected_env()
        if not env: return "main"
        acc_name = env.replace(".env", "").replace("_", "")
        return "main" if acc_name == "" else acc_name

    def on_account_changed(self, index=None):
        self.log_display.appendPlainText(f"🔌 Đã chuyển sang tài khoản: {self.get_selected_env()}")
        self.load_current_settings()

    def load_current_settings(self):
        if self.strategy_id in ["trinhsat", "quansu"]:
            return
        env_file = self.get_selected_env()
        acc_name = self.get_acc_name()

        if env_file:
            env_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", env_file)
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if "=" in line:
                            k, v = line.strip().split("=", 1)
                            v = v.strip("\"'")
                            if k == "OKX_API_KEY": self.input_api_key.setText(v)
                            elif k == "OKX_SECRET_KEY": self.input_secret_key.setText(v)
                            elif k == "OKX_PASSPHRASE": self.input_passphrase.setText(v)
                            elif k == "OKX_IS_DEMO": self.chk_demo_mode.setChecked(v.lower() == "true")

        import importlib.util
        bot_dir = f"z_bot_{self.strategy_id}"
        bot_config_path = os.path.join(USER_DATA_DIR, bot_dir, "bot_config.py")
        
        try:
            if os.path.exists(bot_config_path):
                spec = importlib.util.spec_from_file_location(f"{bot_dir}.bot_config", bot_config_path)
                bot_config = importlib.util.module_from_spec(spec)
                sys.modules[f"{bot_dir}.bot_config"] = bot_config
                spec.loader.exec_module(bot_config)
            else:
                import importlib
                bot_config = importlib.import_module(f"{bot_dir}.bot_config")
        except ModuleNotFoundError:
            # Nếu chưa có thư mục bot (ví dụ z_bot_sub3), bỏ qua không báo lỗi
            class DummyConfig:
                def __getattr__(self, name):
                    if name == "COIN_PORTFOLIO": return []
                    return 0
            bot_config = DummyConfig()
        except Exception as e:
            with open("config_load_error.txt", "w") as err_f:
                import traceback
                err_f.write(traceback.format_exc())
            class DummyConfig:
                def __getattr__(self, name):
                    if name == "COIN_PORTFOLIO": return []
                    return 0
            bot_config = DummyConfig()
        cfg = {}
        config_path = os.path.join(USER_DATA_DIR, "json_data", f"{acc_name}_global_config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f: cfg = json.load(f)
            except: pass

        try:
            if self.strategy_id == "sub2":
                self.smc_chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_SMC", getattr(bot_config, "ENABLE_STRATEGY_SMC", True))))
                self.smc_chk_dynamic_risk.setChecked(bool(cfg.get("USE_DYNAMIC_RISK", getattr(bot_config, "USE_DYNAMIC_RISK", True))))
                self.smc_input_risk_pct.setValue(float(cfg.get("RISK_PER_TRADE_PCT", getattr(bot_config, "RISK_PER_TRADE_PCT", 0.01))) * 100)
                self.smc_input_pos_vol.setValue(float(cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", getattr(bot_config, "POSITION_VOLUME_HIGH_CONFIDENCE", 150))))

                # Smart Money Concepts
                # Smart Money Concepts
                try:
                    self.smc_combo_swing_bull.setCurrentText(cfg.get("SMC_SWING_BULL", getattr(bot_config, "SMC_SWING_BULL", "All")))
                    self.smc_combo_swing_bear.setCurrentText(cfg.get("SMC_SWING_BEAR", getattr(bot_config, "SMC_SWING_BEAR", "All")))
                    self.smc_chk_show_swing_pts.setChecked(bool(cfg.get("SMC_SHOW_SWING_PTS", getattr(bot_config, "SMC_SHOW_SWING_PTS", False))))
                    self.smc_input_swing.setValue(int(cfg.get("SWING_LENGTH", getattr(bot_config, "SWING_LENGTH", 50))))
                    self.smc_chk_show_int.setChecked(bool(cfg.get("SMC_SHOW_INTERNAL", getattr(bot_config, "SMC_SHOW_INTERNAL", True))))
                    self.smc_combo_int_bull.setCurrentText(cfg.get("SMC_INT_BULL", getattr(bot_config, "SMC_INT_BULL", "All")))
                    self.smc_combo_int_bear.setCurrentText(cfg.get("SMC_INT_BEAR", getattr(bot_config, "SMC_INT_BEAR", "All")))
                    self.smc_chk_int_conf.setChecked(bool(cfg.get("SMC_INT_CONF", getattr(bot_config, "SMC_INT_CONF", False))))
                    self.smc_input_internal.setValue(int(cfg.get("INTERNAL_LENGTH", getattr(bot_config, "INTERNAL_LENGTH", 5))))
                    self.smc_chk_show_swing.setChecked(bool(cfg.get("SMC_SHOW_SWING", getattr(bot_config, "SMC_SHOW_SWING", True))))
                    self.smc_chk_show_hl.setChecked(bool(cfg.get("SMC_SHOW_HL", getattr(bot_config, "SMC_SHOW_HL", True))))
                    self.smc_chk_int_ob.setChecked(bool(cfg.get("SMC_INT_OB", getattr(bot_config, "SMC_INT_OB", True))))
                    self.smc_input_int_ob.setValue(int(cfg.get("SMC_INT_OB_CNT", getattr(bot_config, "SMC_INT_OB_CNT", 5))))
                    self.smc_chk_swing_ob.setChecked(bool(cfg.get("SMC_SWING_OB", getattr(bot_config, "SMC_SWING_OB", True))))
                    self.smc_input_swing_ob.setValue(int(cfg.get("SMC_SWING_OB_CNT", getattr(bot_config, "SMC_SWING_OB_CNT", 5))))
                    self.smc_combo_ob_filter.setCurrentText(cfg.get("SMC_OB_FILTER", getattr(bot_config, "SMC_OB_FILTER", "Atr")))
                    self.smc_combo_ob_mitig.setCurrentText(cfg.get("SMC_OB_MITIG", getattr(bot_config, "SMC_OB_MITIG", "High/Low")))
                    self.smc_input_ob_vol.setValue(float(cfg.get("OB_VOLATILITY_MULT", getattr(bot_config, "OB_VOLATILITY_MULT", 2.0))))
                    self.smc_chk_eqh.setChecked(bool(cfg.get("SMC_EQH", getattr(bot_config, "SMC_EQH", False))))
                    self.smc_input_eqh_bars.setValue(int(cfg.get("SMC_EQH_BARS", getattr(bot_config, "SMC_EQH_BARS", 3))))
                    self.smc_input_eqh_thr.setValue(float(cfg.get("SMC_EQH_THR", getattr(bot_config, "SMC_EQH_THR", 0.1))))
                    self.smc_chk_fvg.setChecked(bool(cfg.get("SMC_FVG", getattr(bot_config, "SMC_FVG", False))))
                    self.smc_chk_fvg_auto.setChecked(bool(cfg.get("SMC_FVG_AUTO", getattr(bot_config, "SMC_FVG_AUTO", True))))
                    self.smc_input_fvg_extend.setValue(int(cfg.get("SMC_FVG_EXTEND", getattr(bot_config, "SMC_FVG_EXTEND", 1))))
                    self.smc_chk_daily.setChecked(bool(cfg.get("SMC_DAILY", getattr(bot_config, "SMC_DAILY", False))))
                    self.smc_chk_weekly.setChecked(bool(cfg.get("SMC_WEEKLY", getattr(bot_config, "SMC_WEEKLY", False))))
                    self.smc_chk_monthly.setChecked(bool(cfg.get("SMC_MONTHLY", getattr(bot_config, "SMC_MONTHLY", False))))
                    self.smc_chk_zones.setChecked(bool(cfg.get("SMC_ZONES", getattr(bot_config, "SMC_ZONES", False))))
                    self.smc_chk_trade.setChecked(bool(cfg.get("SMC_TRADE", getattr(bot_config, "SMC_TRADE", True))))
                    src_map = {"SWING": "Swing OB", "INTERNAL": "Internal OB", "ALL": "Internal + Swing", "TRADE_ALL_OB": "Internal + Swing"}
                    src = cfg.get("OB_SOURCE", getattr(bot_config, "OB_SOURCE", "ALL"))
                    self.smc_combo_source.setCurrentText(src_map.get(src, "Internal + Swing"))
                    dir_map = {"BOTH": "Both", "LONG_ONLY": "Long only", "SHORT_ONLY": "Short only"}
                    dr = cfg.get("OB_DIRECTION", getattr(bot_config, "OB_DIRECTION", "BOTH"))
                    self.smc_combo_dir.setCurrentText(dir_map.get(dr, "Both"))
                    tp_map = {"RR": "Risk:Reward", "NEAREST_OB": "Nearest opposite OB", "FALLBACK_RR": "Opposite OB, fallback RR"}
                    tpm = cfg.get("OB_TP_MODE", getattr(bot_config, "OB_TP_MODE", "RR"))
                    self.smc_combo_tp.setCurrentText(tp_map.get(tpm, "Risk:Reward"))
                    self.smc_input_rr.setValue(float(cfg.get("OB_RR_RATIO", getattr(bot_config, "OB_RR_RATIO", 2.0))))
                    self.smc_input_max_setup.setValue(int(cfg.get("OB_MAX_ACTIVE_SETUPS", getattr(bot_config, "OB_MAX_ACTIVE_SETUPS", 10))))
                    self.smc_input_ob_max.setValue(int(cfg.get("OB_MAX_COUNT", getattr(bot_config, "OB_MAX_COUNT", 20))))
                except AttributeError:
                    pass
                return

            self.chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_MAIN", getattr(bot_config, "ENABLE_STRATEGY_MAIN", True))))
            self.chk_xole.setChecked(bool(cfg.get("ENABLE_STRATEGY_XOLE", getattr(bot_config, "ENABLE_STRATEGY_XOLE", True))))
            self.chk_pingpong.setChecked(bool(cfg.get("ENABLE_STRATEGY_PING_PONG", getattr(bot_config, "ENABLE_STRATEGY_PING_PONG", False))))
            self.chk_dynamic_pingpong_tp.setChecked(bool(cfg.get("ENABLE_DYNAMIC_PINGPONG_TP", getattr(bot_config, "ENABLE_DYNAMIC_PINGPONG_TP", False))))
            
            self.chk_sideway_safe.setChecked(bool(cfg.get("ENABLE_SIDEWAY_SAFE_EXIT", getattr(bot_config, "ENABLE_SIDEWAY_SAFE_EXIT", False))))
            self.chk_squeeze_escape.setChecked(bool(cfg.get("ENABLE_SQUEEZE_ESCAPE_EXIT", getattr(bot_config, "ENABLE_SQUEEZE_ESCAPE_EXIT", False))))
            self.chk_safeguard_entry.setChecked(bool(cfg.get("ENABLE_SAFEGUARD_ENTRY_EXIT", getattr(bot_config, "ENABLE_SAFEGUARD_ENTRY_EXIT", False))))
            self.chk_trailing_sl.setChecked(bool(cfg.get("ENABLE_TRAILING_SL", getattr(bot_config, "ENABLE_TRAILING_SL", False))))
            self.chk_max_roi.setChecked(bool(cfg.get("ENABLE_MAX_ROI_EXIT", getattr(bot_config, "ENABLE_MAX_ROI_EXIT", False))))
            self.chk_sideway_vap.setChecked(bool(cfg.get("ENABLE_SIDEWAY_VAP_EXIT", getattr(bot_config, "ENABLE_SIDEWAY_VAP_EXIT", False))))
            self.chk_h4_flip.setChecked(bool(cfg.get("ENABLE_H4_FLIP_CLOSE", getattr(bot_config, "ENABLE_H4_FLIP_CLOSE", False))))
            
            self.chk_dynamic_risk.setChecked(bool(cfg.get("USE_DYNAMIC_RISK", getattr(bot_config, "USE_DYNAMIC_RISK", False))))
            self.input_risk_pct.setValue(float(cfg.get("RISK_PER_TRADE_PCT", float(getattr(bot_config, "RISK_PER_TRADE_PCT", 0.01)))) * 100)
            self.input_tp_pct.setValue(float(cfg.get("TP_TARGET_OPTIMAL", float(getattr(bot_config, "SCALPING_TP_PCT", 0.01)))) * 100)
            self.input_sl_pct.setValue(float(cfg.get("SL_TARGET_OPTIMAL", float(getattr(bot_config, "SCALPING_SL_PCT", 0.01)))) * 100)
            self.input_pos_vol.setValue(float(cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", float(getattr(bot_config, "POSITION_VOLUME_HIGH_CONFIDENCE", 150.0)))))
            
            self.input_dca_gap_pct.setValue(float(cfg.get("DCA_GAP_THRESHOLD_PCT", float(getattr(bot_config, "DCA_GAP_THRESHOLD_PCT", 0.01)))) * 100)
            self.input_confluence_pct.setValue(float(cfg.get("EMA_CONFLUENCE_TOLERANCE_PCT", float(getattr(bot_config, "EMA_CONFLUENCE_TOLERANCE_PCT", 0.01)))) * 100)
            self.input_squeeze_tol.setValue(float(cfg.get("EMA_SQUEEZE_TOLERANCE_PCT", float(getattr(bot_config, "EMA_SQUEEZE_TOLERANCE_PCT", 0.01)))) * 100)
            self.input_drift_pct.setValue(float(cfg.get("EMA200_DRIFT_THRESHOLD_PCT", float(getattr(bot_config, "EMA200_DRIFT_THRESHOLD_PCT", 0.01)))) * 100)
            self.input_alt_diff.setValue(float(cfg.get("ALTCOIN_DIFF_THRESHOLD_PCT", float(getattr(bot_config, "ALTCOIN_DIFF_THRESHOLD_PCT", 0.01)))) * 100)
            self.input_entry_offset.setValue(float(cfg.get("BASE_ENTRY_OFFSET_PCT", float(getattr(bot_config, "BASE_ENTRY_OFFSET_PCT", 0.01)))) * 100)
            self.input_accum_candles.setValue(int(cfg.get("REQUIRED_ACCUMULATION_CANDLES", getattr(bot_config, "REQUIRED_ACCUMULATION_CANDLES", 3))))
            
            self.input_pp_div.setValue(float(cfg.get("PING_PONG_VOL_DIVIDER", float(getattr(bot_config, "PING_PONG_VOL_DIVIDER", 3.0)))))
            self.input_pp_lev.setValue(int(cfg.get("PING_PONG_LEVERAGE", getattr(bot_config, "PING_PONG_LEVERAGE", 50))))
            self.input_q_buffer.setValue(int(cfg.get("QUANTUM_BUFFER_CANDLES", getattr(bot_config, "QUANTUM_BUFFER_CANDLES", 10))))
            self.input_q_forth.setValue(int(cfg.get("QUANTUM_FORTH_CANDLES", getattr(bot_config, "QUANTUM_FORTH_CANDLES", 5))))
            self.input_evo_cycle.setValue(int(cfg.get("EVOLUTION_CYCLE_SECONDS", getattr(bot_config, "EVOLUTION_CYCLE_SECONDS", 86400))))
            
            btc_cfg = next((c for c in getattr(bot_config, "COIN_PORTFOLIO", []) if c.get("coin") == "BTC"), {})
            eth_cfg = next((c for c in getattr(bot_config, "COIN_PORTFOLIO", []) if c.get("coin") == "ETH"), {})
            
            self.input_btc_lever.setValue(int(cfg.get("LEVERAGES", {}).get("BTC", btc_cfg.get("leverage", 100))))
            self.input_eth_lever.setValue(int(cfg.get("LEVERAGES", {}).get("ETH", eth_cfg.get("leverage", 100))))
            self.input_btc_vol_mult.setValue(float(cfg.get("VOL_MULTIPLIERS", {}).get("BTC", float(btc_cfg.get("vol_mult", 1.0)))))
            self.input_eth_vol_mult.setValue(float(cfg.get("VOL_MULTIPLIERS", {}).get("ETH", float(eth_cfg.get("vol_mult", 1.3)))))
        except Exception as e: 
            print('Error setting defaults:', e)

    def save_api_settings(self):
        env_file = self.get_selected_env()
        if not env_file: return
        
        api_key = self.input_api_key.text().strip()
        secret_key = self.input_secret_key.text().strip()
        passphrase = self.input_passphrase.text().strip()
        is_demo = self.chk_demo_mode.isChecked()
        
        # --- VERIFY API KEY WITH OKX ---
        if api_key or secret_key:
            self.btn_save_api.setText("ĐANG KIỂM TRA API...")
            self.btn_save_api.setEnabled(False)
            QtWidgets.QApplication.processEvents()
            
            try:
                import time
                import hmac
                import base64
                import urllib.request
                import urllib.error
                import json
                import datetime
                
                timestamp = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'
                method = 'GET'
                request_path = '/api/v5/account/balance'
                message = timestamp + method + request_path
                
                mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod='sha256')
                sign = base64.b64encode(mac.digest()).decode('utf-8')
                
                url = "https://www.okx.com" + request_path
                
                headers = {
                    'OK-ACCESS-KEY': api_key,
                    'OK-ACCESS-SIGN': sign,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': passphrase,
                    'Content-Type': 'application/json'
                }
                if is_demo:
                    headers['x-simulated-trading'] = '1'
                    
                req = urllib.request.Request(url, headers=headers)
                
                with urllib.request.urlopen(req, timeout=5) as response:
                    res = json.loads(response.read().decode('utf-8'))
                    if res.get("code") != "0":
                        raise Exception(res.get("msg", "Unknown OKX Error"))
                        
            except urllib.error.HTTPError as e:
                err_msg = str(e)
                try:
                    err_body = json.loads(e.read().decode('utf-8'))
                    err_msg = err_body.get("msg", str(e))
                except Exception:
                    pass
                
                display_err = "API Key không hợp lệ hoặc sai Passphrase!"
                if "Timestamp request expired" in err_msg:
                    display_err = "Giờ máy tính của bạn chạy KHÔNG ĐÚNG thực tế!\nVui lòng đồng bộ lại giờ đồng hồ của Windows (Sync Time) trước khi sử dụng."
                elif "APIKey does not match" in err_msg or "Invalid Sign" in err_msg:
                    display_err = "API Key/Secret Key sai hoặc không phải của sàn OKX!"
                
                QtWidgets.QMessageBox.critical(self, "Lỗi API Key", f"{display_err}\n\nChi tiết OKX: {err_msg}")
                self.btn_save_api.setText("💾 LƯU CẤU HÌNH API KEY")
                self.btn_save_api.setEnabled(True)
                return
                
            except Exception as e:
                QtWidgets.QMessageBox.critical(self, "Lỗi API Key", f"Không thể xác thực API Key:\n{str(e)}")
                self.btn_save_api.setText("💾 LƯU CẤU HÌNH API KEY")
                self.btn_save_api.setEnabled(True)
                return
                
            self.btn_save_api.setText("💾 LƯU CẤU HÌNH API KEY")
            self.btn_save_api.setEnabled(True)
        # -------------------------------
        
        env_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", env_file)
        os.makedirs(os.path.dirname(env_path), exist_ok=True)
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(f"OKX_IS_DEMO=\"{is_demo}\"\n")
            f.write(f"OKX_API_KEY=\"{api_key}\"\n")
            f.write(f"OKX_SECRET_KEY=\"{secret_key}\"\n")
            f.write(f"OKX_PASSPHRASE=\"{passphrase}\"\n")
        QtWidgets.QMessageBox.information(self, "Thành Công", f"Đã xác thực và lưu API Key vào {env_file}!")

    def save_strategy_settings(self):
        env_file = self.get_selected_env()
        if not env_file: return
        acc_name = self.get_acc_name()
        json_data_dir = os.path.join(USER_DATA_DIR, "json_data")
        os.makedirs(json_data_dir, exist_ok=True)
        config_path = os.path.join(json_data_dir, f"{acc_name}_global_config.json")
        
        cfg = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f: cfg = json.load(f)
            except: pass

        if self.strategy_id == "sub2":
            # Map GUI text -> internal enum
            src_map = {"Internal + Swing": "ALL", "Internal OB": "INTERNAL", "Swing OB": "SWING"}
            dir_map = {"Both": "BOTH", "Long only": "LONG_ONLY", "Short only": "SHORT_ONLY"}
            tp_map = {"Risk:Reward": "RR", "Nearest opposite OB": "NEAREST_OB", "Opposite OB, fallback RR": "FALLBACK_RR"}
            cfg.update({
                # Vốn & Rủi ro
                "ENABLE_STRATEGY_SMC": self.smc_chk_main.isChecked(),
                "USE_DYNAMIC_RISK": self.smc_chk_dynamic_risk.isChecked(),
                "RISK_PER_TRADE_PCT": str(round(self.smc_input_risk_pct.value() / 100.0, 4)),
                "POSITION_VOLUME_HIGH_CONFIDENCE": str(round(self.smc_input_pos_vol.value(), 2)),
                # Smart Money Concepts
                "SMC_MODE": self.smc_combo_mode.currentText(),
                "SMC_STYLE": self.smc_combo_style.currentText(),
                # Internal Structure
                "SMC_SHOW_INTERNAL": self.smc_chk_show_int.isChecked(),
                "SMC_INT_BULL": self.smc_combo_int_bull.currentText(),
                "SMC_INT_BEAR": self.smc_combo_int_bear.currentText(),
                "SMC_INT_CONF": self.smc_chk_int_conf.isChecked(),
                "INTERNAL_LENGTH": self.smc_input_internal.value(),
                # Swing Structure
                "SMC_SHOW_SWING": self.smc_chk_show_swing.isChecked(),
                "SMC_SWING_BULL": self.smc_combo_swing_bull.currentText(),
                "SMC_SWING_BEAR": self.smc_combo_swing_bear.currentText(),
                "SMC_SHOW_SWING_PTS": self.smc_chk_show_swing_pts.isChecked(),
                "SWING_LENGTH": self.smc_input_swing.value(),
                "SMC_SHOW_HL": self.smc_chk_show_hl.isChecked(),
                # Order Blocks
                "SMC_INT_OB": self.smc_chk_int_ob.isChecked(),
                "SMC_INT_OB_CNT": self.smc_input_int_ob.value(),
                "SMC_SWING_OB": self.smc_chk_swing_ob.isChecked(),
                "SMC_SWING_OB_CNT": self.smc_input_swing_ob.value(),
                "SMC_OB_FILTER": self.smc_combo_ob_filter.currentText(),
                "SMC_OB_MITIG": self.smc_combo_ob_mitig.currentText(),
                "OB_VOLATILITY_MULT": str(round(self.smc_input_ob_vol.value(), 2)),
                # EQH/EQL
                "SMC_EQH": self.smc_chk_eqh.isChecked(),
                "SMC_EQH_BARS": self.smc_input_eqh_bars.value(),
                "SMC_EQH_THR": str(round(self.smc_input_eqh_thr.value(), 2)),
                # FVG
                "SMC_FVG": self.smc_chk_fvg.isChecked(),
                "SMC_FVG_AUTO": self.smc_chk_fvg_auto.isChecked(),
                "SMC_FVG_EXTEND": self.smc_input_fvg_extend.value(),
                # MTF Levels
                "SMC_DAILY": self.smc_chk_daily.isChecked(),
                "SMC_WEEKLY": self.smc_chk_weekly.isChecked(),
                "SMC_MONTHLY": self.smc_chk_monthly.isChecked(),
                # Zones
                "SMC_ZONES": self.smc_chk_zones.isChecked(),
                # OB Trade Setup
                "SMC_TRADE": self.smc_chk_trade.isChecked(),
                "OB_SOURCE": src_map.get(self.smc_combo_source.currentText(), "ALL"),
                "OB_DIRECTION": dir_map.get(self.smc_combo_dir.currentText(), "BOTH"),
                "OB_TP_MODE": tp_map.get(self.smc_combo_tp.currentText(), "RR"),
                "OB_RR_RATIO": str(round(self.smc_input_rr.value(), 2)),
                "OB_MAX_ACTIVE_SETUPS": self.smc_input_max_setup.value(),
                "OB_MAX_COUNT": self.smc_input_ob_max.value(),
            })
        else:
            cfg.update({
                "ENABLE_STRATEGY_MAIN": self.chk_main.isChecked(),
                "ENABLE_STRATEGY_XOLE": self.chk_xole.isChecked(),
            "ENABLE_STRATEGY_PING_PONG": self.chk_pingpong.isChecked(),
            "ENABLE_DYNAMIC_PINGPONG_TP": self.chk_dynamic_pingpong_tp.isChecked(),
            "ENABLE_SIDEWAY_SAFE_EXIT": self.chk_sideway_safe.isChecked(),
            "ENABLE_SQUEEZE_ESCAPE_EXIT": self.chk_squeeze_escape.isChecked(),
            "ENABLE_SAFEGUARD_ENTRY_EXIT": self.chk_safeguard_entry.isChecked(),
            "ENABLE_TRAILING_SL": self.chk_trailing_sl.isChecked(),
            "ENABLE_MAX_ROI_EXIT": self.chk_max_roi.isChecked(),
            "ENABLE_SIDEWAY_VAP_EXIT": self.chk_sideway_vap.isChecked(),
            "ENABLE_H4_FLIP_CLOSE": self.chk_h4_flip.isChecked(),

            "USE_DYNAMIC_RISK": self.chk_dynamic_risk.isChecked(),
            "RISK_PER_TRADE_PCT": str(round(self.input_risk_pct.value() / 100.0, 4)),
            "TP_TARGET_OPTIMAL": str(round(self.input_tp_pct.value() / 100.0, 5)),
            "SL_TARGET_OPTIMAL": str(round(self.input_sl_pct.value() / 100.0, 5)),
            "POSITION_VOLUME_HIGH_CONFIDENCE": str(round(self.input_pos_vol.value(), 2)),

            "DCA_GAP_THRESHOLD_PCT": str(round(self.input_dca_gap_pct.value() / 100.0, 6)),
            "EMA_CONFLUENCE_TOLERANCE_PCT": str(round(self.input_confluence_pct.value() / 100.0, 6)),
            "EMA_SQUEEZE_TOLERANCE_PCT": str(round(self.input_squeeze_tol.value() / 100.0, 6)),
            "EMA200_DRIFT_THRESHOLD_PCT": str(round(self.input_drift_pct.value() / 100.0, 6)),
            "ALTCOIN_DIFF_THRESHOLD_PCT": str(round(self.input_alt_diff.value() / 100.0, 6)),
            "BASE_ENTRY_OFFSET_PCT": str(round(self.input_entry_offset.value() / 100.0, 6)),
            "REQUIRED_ACCUMULATION_CANDLES": self.input_accum_candles.value(),

            "PING_PONG_VOL_DIVIDER": str(round(self.input_pp_div.value(), 2)),
            "PING_PONG_LEVERAGE": self.input_pp_lev.value(),
            "QUANTUM_BUFFER_CANDLES": self.input_q_buffer.value(),
            "QUANTUM_FORTH_CANDLES": self.input_q_forth.value(),
            "EVOLUTION_CYCLE_SECONDS": self.input_evo_cycle.value(),

            "LEVERAGES": {
                "BTC": self.input_btc_lever.value(),
                "ETH": self.input_eth_lever.value()
            },
            "VOL_MULTIPLIERS": {
                "BTC": str(round(self.input_btc_vol_mult.value(), 2)),
                "ETH": str(round(self.input_eth_vol_mult.value(), 2))
            }
        })

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4)
            
        QtWidgets.QMessageBox.information(self, "Thành Công", f"Đã lưu Cấu Hình Chiến Thuật cho {acc_name}!\\n\\nBot sẽ tự động nạp cấu hình mới này vào chu kỳ tiếp theo.")

    def start_bot(self):
        env_file = self.get_selected_env()
        if not env_file: return
        
        flag_path = os.path.join(USER_DATA_DIR, "json_data", f"stop_{self.strategy_id}.flag")
        if os.path.exists(flag_path):
            try: os.remove(flag_path)
            except: pass
            
        # self.log_display.clear()
        self.log_display.appendPlainText(f"\n=======================================================\n🔄 Đang khởi động Bot [{self.strategy_name}] trên {env_file}...")
        
        self.worker = BotSubprocessWorker(env_file, self.strategy_id)
        self.worker.log_signal.connect(self.append_log)
        self.worker.finished_signal.connect(self.on_bot_finished)
        self.worker.start()
        
        self.btn_start.setEnabled(False)
        self.btn_stop.setEnabled(True)
        self.account_dropdown.setEnabled(False)
        self.status_led.setText("● ĐANG CHẠY")
        self.status_led.setStyleSheet("color: #00FF00; padding-left:10px;")

    def stop_bot(self):
        if self.worker:
            self.btn_stop.setEnabled(False)
            self.worker.stop()

    def reset_wallet(self):
        flag = os.path.join(USER_DATA_DIR, "json_data", f"reset_wallet_{self.strategy_id}.flag")
        with open(flag, "w") as f: f.write("1")
        self.append_log("\n♻️ [HỆ THỐNG]: Đã kích hoạt lệnh Reset Kiểm Toán Vốn Gốc.")

    def reset_nen(self):
        flag = os.path.join(USER_DATA_DIR, "json_data", f"reset_nen_{self.strategy_id}.flag")
        with open(flag, "w") as f: f.write("1")
        self.append_log("\n♻️ [HỆ THỐNG]: Đã kích hoạt lệnh Reset Đếm Nến.")

    def on_bot_finished(self):
        self.log_display.appendPlainText("\n🛑 Bot đã dừng hoàn toàn.")
        self.btn_start.setEnabled(True)
        self.btn_stop.setEnabled(False)
        self.account_dropdown.setEnabled(True)
        self.status_led.setText("● ĐANG DỪNG")
        self.status_led.setStyleSheet("color: #FF3333; padding-left:10px;")
        self.worker = None

    def on_chart_config_changed(self):
        if getattr(self, 'live_chart_worker', None):
            self.live_chart_worker.inst_id = self.combo_coin.currentText()
            self.live_chart_worker.bar = self.combo_tf.currentText()
            self._chart_initialized = False
            if getattr(self, 'chart_widget', None):
                self.chart_widget.watermark(f'{self.live_chart_worker.inst_id} ({self.live_chart_worker.bar})', color='rgba(255, 153, 0, 0.1)')

    def update_live_chart(self, data):
        if getattr(self, 'chart_widget', None):
            try:
                import pandas as pd
                candles = data.get("candles", [])
                if candles:
                    df = pd.DataFrame(candles, columns=['time', 'open', 'high', 'low', 'close', 'volume'])
                    df['time'] = pd.to_numeric(df['time'])
                    df['time'] = pd.to_datetime(df['time'], unit='ms').astype('datetime64[ns]')
                    
                    # Also need to cast float columns
                    for col in ['open', 'high', 'low', 'close', 'volume']:
                        df[col] = pd.to_numeric(df[col])
                    
                    if not getattr(self, '_chart_initialized', False):
                        self.chart_widget.set(df)
                        self._chart_initialized = True
                    else:
                        self.chart_widget.update(df.iloc[-1])
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Chart error: {e}")

    def append_log(self, text):
        try:
            if text.strip().startswith('{"type": "chart_data"'):
                return
        except Exception:
            pass

        cursor = self.log_display.textCursor()
        cursor.movePosition(QtGui.QTextCursor.MoveOperation.End)
        self.log_display.setTextCursor(cursor)
        self.log_display.insertPlainText(text + "\n")
        if self.log_display.document().lineCount() > 1500:
            self.log_display.clear()
            self.log_display.appendPlainText("🧹 Đã dọn bớt log cũ (Giữ giới hạn 50 chu kỳ)...\n")

class MainWindow(QtWidgets.QMainWindow):
    def show_help(self, title, text):
        msg = QtWidgets.QMessageBox(self)
        msg.setWindowTitle(title)
        msg.setText(text)
        msg.setStyleSheet("QMessageBox { background-color: #2b2b2b; } QLabel { color: #ff8c00; font-size: 13px; font-weight: bold; } QPushButton { background-color: #ff8c00; color: white; border-radius: 4px; padding: 5px 15px; font-weight: bold; }")
        msg.exec()

    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"TLS1 Trading v{APP_VERSION}")
        self.resize(1100, 850)
        
        if getattr(sys, 'frozen', False):
            logo_path = os.path.join(sys._MEIPASS, "media", "logo.ico")
        else:
            logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "logo.ico")
        try:
            if os.path.exists(logo_path):
                self.setWindowIcon(QtGui.QIcon(logo_path))
        except Exception: pass

        self.env_files = self.scan_env_files()
        self.init_ui()
        self.apply_dark_theme()
        
        # Check for updates in background
        self.update_check_timer = QtCore.QTimer(self)
        self.update_check_timer.setSingleShot(True)
        self.update_check_timer.timeout.connect(self.check_update_background)
        self.update_check_timer.start(2000)

        # Setup background UID verification timer
        self.uid_check_timer = QtCore.QTimer(self)
        self.uid_check_timer.timeout.connect(self.verify_uid_background)
        # 10 seconds = 10000 ms
        self.uid_check_timer.start(10000)

        # Setup background HWID verification timer
        self.hwid_check_timer = QtCore.QTimer(self)
        self.hwid_check_timer.timeout.connect(self.verify_hwid_background)
        # 30 seconds = 30000 ms
        self.hwid_check_timer.start(30000)

    def verify_uid_background(self):
        global CURRENT_UID
        if not CURRENT_UID or CURRENT_UID == "admtls12021":
            return
            
        try:
            import urllib.request
            import json
            
            base_url = FIREBASE_URL.rstrip('/')
            url = f"{base_url}/users/{CURRENT_UID}.json"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                user_info = json.loads(response.read().decode('utf-8'))
                
            if user_info is None:
                self.force_exit_unauthorized("UID của bạn ĐÃ BỊ LOẠI khỏi danh sách hợp lệ (Có thể bạn đã gỡ Ref TLS1).")
                return
                
            registered_hwid = user_info.get('hwid', '')
            if registered_hwid and registered_hwid != "None" and registered_hwid != get_hwid():
                self.force_exit_unauthorized("Tài khoản của bạn đang được truy cập trên một thiết bị không hợp lệ.")
                
        except Exception:
            # Bỏ qua lỗi mạng ngầm để không làm phiền khách hàng
            pass

    def verify_hwid_background(self):
        """Kiểm tra HWID ngầm mỗi 30 giây - đảm bảo máy khách không bị thay đổi."""
        global CURRENT_UID
        if not CURRENT_UID or CURRENT_UID == "admtls12021":
            return

        try:
            import urllib.request
            import json

            base_url = FIREBASE_URL.rstrip('/')
            url = f"{base_url}/users/{CURRENT_UID}.json"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                user_info = json.loads(response.read().decode('utf-8'))

            if user_info is not None:
                registered_hwid = user_info.get('hwid', '')
                current_hwid = get_hwid()
                if registered_hwid and registered_hwid != "None" and registered_hwid != current_hwid:
                    self.force_exit_unauthorized("Phát hiện truy cập từ thiết bị không hợp lệ.\nTài khoản của bạn đã bị khóa vì lý do bảo mật.")

        except Exception:
            pass

    def force_exit_unauthorized(self, reason):
        msg = QtWidgets.QMessageBox(self)
        msg.setWindowTitle("Cảnh báo vi phạm bảo mật")
        msg.setText(f"{reason}\n\nỨng dụng sẽ tự động đóng. Vui lòng liên hệ Admin để giải quyết!")
        msg.setIcon(QtWidgets.QMessageBox.Icon.Critical)
        msg.setStyleSheet("""
            QMessageBox {
                background-color: #ffffff;
            }
            QMessageBox QLabel {
                color: #000000;
                font-size: 13px;
            }
            QPushButton {
                background-color: #333333;
                color: #ffffff;
                border-radius: 4px;
                padding: 6px 20px;
                font-size: 12px;
            }
            QPushButton:hover {
                background-color: #555555;
            }
        """)
        msg.exec()
        sys.exit(0)


    def update_tab_icons(self, index):
        for i in range(self.bot_tabs.count()):
            txt = self.bot_tabs.tabText(i)
            # Remove any existing icon
            base_name = txt[2:].strip() if len(txt) > 0 and txt[0] in ["🟢", "⚪", "🟣", "🔴", "🟡", "⚫"] else txt
            
            icon = "🟢" if i == index else "⚫"
            self.bot_tabs.setTabText(i, f"{icon} {base_name}")

    def set_welcome_name(self, name):
        self.lbl_main_welcome.setText(f" Chúc sếp \"{name}\" giao dịch thuận lợi ")
        self.lbl_main_welcome.show()
        self.btn_main_logout.show()
        for i in range(self.bot_tabs.count()):
            widget = self.bot_tabs.widget(i)
            if hasattr(widget, 'set_welcome_name'):
                widget.set_welcome_name(name)

    def scan_env_files(self):
        env_files = set()
        for d in os.listdir(PROJECT_DIR):
            if d.startswith("z_bot_") and os.path.isdir(os.path.join(PROJECT_DIR, d)):
                try:
                    for f in os.listdir(os.path.join(PROJECT_DIR, d)):
                        if f.startswith(".env") and not f.endswith(".example"):
                            env_files.add(f)
                except Exception:
                    pass
        return sorted(list(env_files))

    def init_ui(self):
        central_widget = QtWidgets.QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QtWidgets.QVBoxLayout(central_widget)
        main_layout.setContentsMargins(15, 5, 15, 15)
        main_layout.setSpacing(5)

        header_layout = QtWidgets.QHBoxLayout()
        title = QtWidgets.QLabel("Setup by: Cộng đồng Trader Là Số 1 - VN")
        title.setFont(QtGui.QFont("Segoe UI", 16, QtGui.QFont.Weight.Bold))
        title.setStyleSheet("color: #FF9900;")
        header_layout.addWidget(title)
        
        header_layout.addStretch()

        self.lbl_main_welcome = QtWidgets.QLabel("")
        self.lbl_main_welcome.setStyleSheet("color: #ffaa00; font-size: 14px; font-weight: bold; font-style: italic; margin-right: 15px;")
        self.lbl_main_welcome.hide()
        
        self.btn_main_logout = QtWidgets.QPushButton("Đăng Xuất")
        self.btn_main_logout.setStyleSheet("""
            QPushButton {
                background-color: #333333; color: white; border-radius: 4px; padding: 5px 15px; font-size: 13px; font-weight: bold; margin-right: 10px;
            }
            QPushButton:hover { background-color: #ff3333; }
        """)
        self.btn_main_logout.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_main_logout.hide()
        
        def on_main_logout():
            reply = QtWidgets.QMessageBox.question(self, 'Xác nhận', 'Bạn có chắc chắn muốn đăng xuất?', QtWidgets.QMessageBox.StandardButton.Yes | QtWidgets.QMessageBox.StandardButton.No)
            if reply == QtWidgets.QMessageBox.StandardButton.Yes:
                import sys, subprocess
                self.close()
                if getattr(sys, 'frozen', False):
                    subprocess.Popen([sys.executable] + sys.argv[1:])
                else:
                    subprocess.Popen([sys.executable] + sys.argv)
                sys.exit(0)
                
        self.btn_main_logout.clicked.connect(on_main_logout)
        
        header_layout.addWidget(self.lbl_main_welcome)

        self.btn_update = QtWidgets.QPushButton("⏳ Đang kiểm tra cập nhật...")
        self.btn_update.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_update.setStyleSheet("background-color: #333333; color: gray; border-radius: 4px; padding: 5px 15px; font-weight: bold; font-size: 13px; margin-right: 10px;")
        self.btn_update.clicked.connect(self.run_update_app)
        self.btn_update.setEnabled(False)

        # Tìm đường dẫn media thông minh tùy thuộc vào vị trí chạy file exe
        def get_media_path(img_name):
            if getattr(sys, 'frozen', False):
                return os.path.join(sys._MEIPASS, "media", img_name)
            p1 = os.path.join(PROJECT_DIR, "media", img_name)
            if os.path.exists(p1):
                return p1
            return os.path.join(PROJECT_DIR, "TLS1_Trading_App", "media", img_name)

        btn_discord = QtWidgets.QPushButton()
        btn_discord.setIcon(QtGui.QIcon(get_media_path("Discord.png")))
        btn_discord.setIconSize(QtCore.QSize(28, 28))
        btn_discord.setStyleSheet("background: transparent; border: none; margin-right: -10px;")
        btn_discord.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_discord.clicked.connect(lambda: __import__('winsound').Beep(1000, 4))
        btn_discord.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://discord.gg/cS4QXJTpnb")))
        self.discord_hover = ButtonHoverSoundFilter(btn_discord)
        btn_discord.installEventFilter(self.discord_hover)
        # Add to social_layout later
        
        btn_telegram = QtWidgets.QPushButton()
        btn_telegram.setIcon(QtGui.QIcon(get_media_path("Telegram.png")))
        btn_telegram.setIconSize(QtCore.QSize(28, 28))
        btn_telegram.setStyleSheet("background: transparent; border: none;")
        btn_telegram.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_telegram.clicked.connect(lambda: __import__('winsound').Beep(1000, 4))
        btn_telegram.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://t.me/traderlaso1")))
        self.telegram_hover = ButtonHoverSoundFilter(btn_telegram)
        btn_telegram.installEventFilter(self.telegram_hover)
        
        social_layout = QtWidgets.QHBoxLayout()
        social_layout.setSpacing(0)
        social_layout.addWidget(btn_discord)
        social_layout.addWidget(btn_telegram)
        header_layout.addLayout(social_layout)
        header_layout.addWidget(self.btn_update)
        header_layout.addWidget(self.btn_main_logout)

        # Removed duplicate btn_update
        main_layout.addLayout(header_layout)
        
        self.update_timer = QtCore.QTimer(self)
        self.update_timer.timeout.connect(self.check_for_updates)
        self.update_timer.start(3000)

        self.bot_tabs = QtWidgets.QTabWidget()
        self.bot_tabs.setObjectName("OuterTabs")
        self.outer_hover_filter = HoverSoundFilter(self.bot_tabs.tabBar())
        self.bot_tabs.tabBar().installEventFilter(self.outer_hover_filter)
        self.bot_tabs.tabBar().setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        main_layout.addWidget(self.bot_tabs)

        self.panel_main = BotInstanceWidget("sub1", "Thợ săn EMA200 (Main)", self.env_files)
        self.panel_sub1 = BotInstanceWidget("sub1", "Bot Phụ 1 Sniper (Sub 1)", self.env_files)
        self.panel_sub2 = BotInstanceWidget("sub2", "Bot Mỏ Chim (Sub 2)", self.env_files)
        # self.panel_sub3 = BotInstanceWidget("sub3", "Bot SUB 3", self.env_files)
        
        self.bot_tabs.addTab(self.panel_main, "⚪ Bot EMA200")
        
        self.bot_tabs.currentChanged.connect(self.update_tab_icons)
        self.update_tab_icons(0)
        # self.bot_tabs.addTab(self.panel_sub1, "🔵 Bot SUB 1")
        self.bot_tabs.addTab(self.panel_sub2, "Bot SMC - OB")

    def check_for_updates(self):
        # Không tự động check liên tục nữa để tránh đơ máy
        pass

    def check_update_background(self):
        def check():
            try:
                import urllib.request, json
                from packaging import version
                url = "https://raw.githubusercontent.com/traderlaso1wolfcapital-creator/OKX_Trade_Kit/main/TLS1_Trading_App/version.json"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    remote_data = json.loads(response.read().decode('utf-8'))
                
                remote_version = remote_data.get("version", "1.0.0")
                local_version = APP_VERSION
                
                has_update = version.parse(remote_version) > version.parse(local_version)
                return has_update, remote_version, remote_data
            except Exception:
                return None, None, None
        
        self.update_worker = type('UpdateWorker', (QtCore.QThread,), {'run': lambda s: s.result_signal.emit(check()), 'result_signal': QtCore.pyqtSignal(tuple)})(self)
        self.update_worker.result_signal.connect(self.on_update_check_result)
        self.update_worker.start()

    def on_update_check_result(self, result):
        has_update, remote_version, remote_data = result
        if has_update is True:
            self.btn_update.setText(f"🚀 Cập nhật App (v{remote_version})")
            self.btn_update.setStyleSheet("""
                QPushButton { background-color: #3b82f6; color: white; border-radius: 4px; padding: 5px 15px; font-weight: bold; font-size: 13px; margin-right: 10px; }
                QPushButton:hover { background-color: #2563eb; }
            """)
            self.btn_update.setEnabled(True)
            self.remote_update_data = remote_data
        elif has_update is False:
            self.btn_update.setText(f"✅ Bản mới nhất (v{APP_VERSION})")
            self.btn_update.setStyleSheet("background-color: #333333; color: #aaaaaa; border-radius: 4px; padding: 5px 15px; font-weight: bold; font-size: 13px; margin-right: 10px;")
            self.btn_update.setEnabled(False)
        else:
            self.btn_update.setText("❌ Lỗi kiểm tra cập nhật")
            self.btn_update.setStyleSheet("background-color: #333333; color: gray; border-radius: 4px; padding: 5px 15px; font-weight: bold; font-size: 13px; margin-right: 10px;")
            self.btn_update.setEnabled(False)

    def run_update_app(self):
        url = "https://github.com/traderlaso1wolfcapital-creator/OKX_Trade_Kit/releases/latest"
        remote_version = None
        if hasattr(self, 'remote_update_data') and self.remote_update_data:
            remote_version = self.remote_update_data.get("version")
            if remote_version:
                url = f"https://github.com/traderlaso1wolfcapital-creator/OKX_Trade_Kit/releases/download/v{remote_version}/TLS1%20Trading%20Setup.exe"

        # Tự động tải ngầm nếu chạy file .exe trên Windows
        if os.name == 'nt' and getattr(sys, 'frozen', False) and remote_version:
            import urllib.request
            import subprocess
            
            download_url = f"https://github.com/traderlaso1wolfcapital-creator/OKX_Trade_Kit/releases/download/v{remote_version}/TLS1%20Trading%20Setup.exe"
            
            dlg = QtWidgets.QProgressDialog("Đang kết nối tải bản cập nhật...", "Hủy", 0, 100, self)
            dlg.setWindowTitle("Cập nhật tự động")
            dlg.setWindowModality(QtCore.Qt.WindowModality.WindowModal)
            dlg.setMinimumDuration(0)
            dlg.show()
            
            current_exe_path = sys.executable
            base_dir = os.path.dirname(current_exe_path)
            current_exe_name = os.path.basename(current_exe_path)
            
            new_exe_path = os.path.join(base_dir, "TLS1_Trading_Update.exe")
            bat_path = os.path.join(base_dir, "update_app.bat")
            
            def reporthook(blocknum, blocksize, totalsize):
                if dlg.wasCanceled():
                    raise Exception("Đã huỷ tải xuống.")
                if totalsize > 0:
                    percent = int(blocknum * blocksize * 100 / totalsize)
                    dlg.setLabelText(f"Đang tải bản cập nhật mới v{remote_version}... {percent}%")
                    dlg.setValue(percent)
                    QtWidgets.QApplication.processEvents()
                    
            try:
                urllib.request.urlretrieve(download_url, new_exe_path, reporthook)
                dlg.setValue(100)
                
                bat_content = f"""@echo off
echo Dang cap nhat phien ban moi... Vui long doi...
timeout /t 2 /nobreak >nul
del /f /q "{current_exe_name}"
rename "TLS1_Trading_Update.exe" "{current_exe_name}"
start "" "{current_exe_name}"
del /f /q "%~f0"
"""
                with open(bat_path, "w", encoding="utf-8") as f:
                    f.write(bat_content)
                
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                subprocess.Popen([bat_path], startupinfo=startupinfo)
                
                sys.exit(0)
            except Exception as e:
                if os.path.exists(new_exe_path):
                    try: os.remove(new_exe_path)
                    except: pass
                if "huỷ" in str(e).lower():
                    return
                QtWidgets.QMessageBox.critical(self, "Lỗi cập nhật", f"Tải xuống tự động thất bại: {str(e)}\n\nHệ thống sẽ mở trình duyệt để bạn tải thủ công.")
                QtGui.QDesktopServices.openUrl(QtCore.QUrl(url))
        else:
            # Fallback mở trình duyệt nếu chạy code hoặc trên Mac
            QtGui.QDesktopServices.openUrl(QtCore.QUrl(url))

    def closeEvent(self, event):
        for attr in ['panel_main', 'panel_sub1', 'panel_sub2', 'panel_sub3']:
            panel = getattr(self, attr, None)
            if panel and hasattr(panel, 'worker') and getattr(panel.worker, 'process', None):
                try:
                    panel.worker.process.kill()
                except:
                    pass
        event.accept()

    def apply_dark_theme(self):
        self.setStyleSheet("""
            QMainWindow { background-color: #121212; }
QToolTip { background-color: #111111; color: #ff8c00; border: 1px solid #ff8c00; padding: 5px; font-weight: bold; }
            QWidget { color: #e0e0e0; font-family: "Segoe UI"; font-size: 13px; }
            QMessageBox QLabel { color: #000000; font-weight: normal; }
            
            QTabWidget#OuterTabs::pane { border: 1px solid #2d2d2d; background-color: #151515; border-radius: 4px; }
            QTabWidget#OuterTabs > QTabBar::tab { background-color: #111111; border: 1px solid #2d2d2d; padding: 10px 20px; border-top-left-radius: 4px; border-top-right-radius: 4px; margin-right: 2px; font-size: 13px; }
            QTabWidget#OuterTabs > QTabBar::tab:selected { background-color: #151515; color: #ffaa00; font-weight: bold; border-bottom-color: #151515; }
            QTabWidget#OuterTabs > QTabBar::tab:hover { background-color: #2e2e2e; }

            QTabWidget#InnerTabs::pane { border: 1px solid #2d2d2d; background-color: #1a1a1a; border-radius: 4px; }
            QTabWidget#InnerTabs > QTabBar::tab { background-color: #111111; border: 1px solid #2d2d2d; padding: 8px 16px; border-top-left-radius: 4px; border-top-right-radius: 4px; margin-right: 2px; }
            QTabWidget#InnerTabs > QTabBar::tab:selected { background-color: #1a1a1a; color: #ff9900; font-weight: bold; border-bottom-color: #1a1a1a; }
            QTabWidget#InnerTabs > QTabBar::tab:hover { background-color: #2e2e2e; }

            QFrame#HeaderGroup { background-color: transparent; border: none; padding: 5px; margin-bottom: 5px; }
            QGroupBox { border: 1px solid #2d2d2d; margin-top: 10px; font-weight: bold; color: #ff9900; border-radius: 4px; }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; background-color: #1a1a1a; padding: 0 4px; margin-top: 2px; }
            
            QSpinBox, QDoubleSpinBox, QLineEdit, QComboBox {
                background-color: #252525;
                color: #ffffff;
                border: 1px solid #444444;
                border-radius: 4px;
                padding: 4px;
                min-width: 80px;
                max-width: 150px;
            }
            QComboBox QAbstractItemView {
                background-color: #1a1a1a;
                color: #ffffff;
                selection-background-color: #333333;
                selection-color: #ff9900;
                border: 1px solid #444444;
                outline: none;
            }
            QSpinBox::up-button, QDoubleSpinBox::up-button, QSpinBox::down-button, QDoubleSpinBox::down-button {
                background-color: #333333;
                width: 16px;
                border: 1px solid #222;
            }
            QSpinBox::up-button:hover, QDoubleSpinBox::up-button:hover, QSpinBox::down-button:hover, QDoubleSpinBox::down-button:hover {
                background-color: #ff9900;
            }
            QPushButton {
                background-color: #333333; border: 1px solid #444444; border-radius: 4px;
                padding: 8px 15px; font-weight: bold;
            }
            QPushButton:hover { background-color: #444444; border: 1px solid #ff9900; }
        """)

import subprocess
import hashlib
import uuid

def get_hwid():
    hwid_string = ""
    try:
        # Lấy UUID của bo mạch chủ
        hwid_string = subprocess.check_output('wmic csproduct get uuid', shell=True).decode().split('\n')[1].strip()
    except:
        pass
    if not hwid_string:
        # Dự phòng bằng địa chỉ MAC
        hwid_string = str(uuid.getnode())
        
    return "TLS-" + hashlib.md5(hwid_string.encode()).hexdigest()[:10].upper()

class HWIDAuthDialog(QtWidgets.QDialog):
    def __init__(self, hwid, custom_message="Tài khoản hợp lệ, nhưng CHƯA được cấp quyền sử dụng trên máy tính này.", parent=None):
        super().__init__(parent)
        self.setWindowTitle("Cần xác thực thiết bị")
        self.setFixedSize(450, 280)
        self.setStyleSheet("""
            QDialog { background-color: #1e1e1e; color: white; }
            QLabel { color: #cccccc; font-size: 14px; }
            QPushButton {
                font-weight: bold; border-radius: 4px; padding: 8px 15px; color: white; font-size: 13px;
            }
            QPushButton#BtnTele { background-color: #0088cc; }
            QPushButton#BtnTele:hover { background-color: #00aaff; }
            QPushButton#BtnMess { background-color: #0084ff; }
            QPushButton#BtnMess:hover { background-color: #3399ff; }
            QPushButton#BtnZalo { background-color: #0068ff; }
            QPushButton#BtnZalo:hover { background-color: #3388ff; }
            QPushButton#BtnDiscord { background-color: #5865F2; }
            QPushButton#BtnDiscord:hover { background-color: #7289DA; }
            QPushButton#BtnRelogin { background-color: #ff9900; color: black; }
            QPushButton#BtnRelogin:hover { background-color: #e68a00; }
            QPushButton#BtnClose { background-color: #444444; color: white; }
            QPushButton#BtnClose:hover { background-color: #666666; }
        """)
        
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        lbl_msg1 = QtWidgets.QLabel(custom_message)
        lbl_msg1.setWordWrap(True)
        layout.addWidget(lbl_msg1)
        
        hwid_layout = QtWidgets.QHBoxLayout()
        lbl_msg2 = QtWidgets.QLabel("Bước 1. Copy mã máy (HWID) của bạn: ")
        lbl_msg2.setStyleSheet("font-size: 12px; margin-left: 5px; color: #bbbbbb;")

        btn_hwid_val = QtWidgets.QPushButton(hwid)
        btn_hwid_val.setStyleSheet("background: transparent; color: #00ffff; font-weight: bold; font-size: 15px; border: none; padding: 0px;")
        btn_hwid_val.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_hwid_val.setToolTip("Click để tự động copy")
        
        def copy_auth_hwid():
            QtWidgets.QApplication.clipboard().setText(hwid)
            btn_hwid_val.setText("✅ Đã Copy!")
            QtCore.QTimer.singleShot(1500, lambda: btn_hwid_val.setText(hwid))
            
        btn_hwid_val.clicked.connect(copy_auth_hwid)
        
        hwid_layout.addWidget(lbl_msg2)
        hwid_layout.addWidget(btn_hwid_val)
        hwid_layout.addStretch()
        layout.addLayout(hwid_layout)
        
        lbl_msg3 = QtWidgets.QLabel("Bước 2. Gửi mã máy (HWID) cho Admin TLS1 để được cấp quyền truy cập:")
        lbl_msg3.setStyleSheet("font-size: 12px; margin-left: 5px; color: #bbbbbb;")
        lbl_msg3.setWordWrap(True)
        layout.addWidget(lbl_msg3)
        
        layout.addStretch()
        
        btn_layout = QtWidgets.QHBoxLayout()
        btn_tele = QtWidgets.QPushButton("Telegram")
        btn_tele.setObjectName("BtnTele")
        btn_tele.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_tele.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://t.me/baotran_tls1")))
        
        btn_mess = QtWidgets.QPushButton("Messenger")
        btn_mess.setObjectName("BtnMess")
        btn_mess.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_mess.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://www.facebook.com/baotran.tls1/")))
        
        btn_zalo = QtWidgets.QPushButton("Zalo")
        btn_zalo.setObjectName("BtnZalo")
        btn_zalo.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_zalo.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("zalo://conversation?phone=84377333096")))

        btn_discord = QtWidgets.QPushButton("Discord")
        btn_discord.setObjectName("BtnDiscord")
        btn_discord.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_discord.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://discord.gg/8NXaSCvZ6u")))
        
        btn_layout.addWidget(btn_tele)
        btn_layout.addWidget(btn_mess)
        btn_layout.addWidget(btn_zalo)
        btn_layout.addWidget(btn_discord)
        layout.addLayout(btn_layout)
        
        layout.addSpacing(15)

        btn_relogin = QtWidgets.QPushButton("Đăng Nhập")
        btn_relogin.setObjectName("BtnRelogin")
        btn_relogin.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_relogin.clicked.connect(self.accept)
        layout.addWidget(btn_relogin)

class LoginDialog(QtWidgets.QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Xác thực quyền truy cập")
        self.setFixedSize(400, 420)
        self.setStyleSheet("""
            QDialog { background-color: #1e1e1e; color: white; }
            QLabel { color: #cccccc; font-size: 14px; font-weight: bold; }
            QLineEdit { 
                background-color: #2b2b2b; color: white; border: 1px solid #444; 
                border-radius: 4px; padding: 8px; font-size: 14px;
            }
            QLineEdit:focus { border: 1px solid #ff9900; }
            QPushButton#BtnLogin {
                background-color: #ff9900; color: black; border: none; border-radius: 4px;
                padding: 8px 15px; font-weight: bold; font-size: 14px;
            }
            QPushButton#BtnLogin:hover { background-color: #e68a00; }
            QPushButton#BtnReg, QPushButton#BtnRef {
                background-color: transparent; color: #4DA2F0; border: 1px solid #4DA2F0; border-radius: 4px;
                padding: 6px; font-size: 12px; font-weight: bold;
            }
            QPushButton#BtnReg:hover, QPushButton#BtnRef:hover { background-color: #4DA2F0; color: black; }
        """)
        
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(10)
        
        self.lbl_banner = QtWidgets.QLabel()
        banner_path = os.path.join(PROJECT_DIR, "media", "banner.png")
        if getattr(sys, 'frozen', False):
            banner_path = os.path.join(sys._MEIPASS, "media", "banner.png")
            
        if os.path.exists(banner_path):
            pixmap = QtGui.QPixmap(banner_path)
            pixmap = pixmap.scaledToWidth(360, QtCore.Qt.TransformationMode.SmoothTransformation)
            self.lbl_banner.setPixmap(pixmap)
        else:
            self.lbl_banner.setText("TLS1 TRADING SYSTEM")
            self.lbl_banner.setStyleSheet("color: #ff9900; font-size: 20px; font-weight: 900; letter-spacing: 1px;")
        
        self.lbl_banner.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.lbl_banner)
        
        layout.addStretch()
        self.lbl_info = QtWidgets.QLabel("Nhập OKX UID của bạn:")
        self.lbl_info.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.lbl_info)
        
        self.input_uid = QtWidgets.QLineEdit()
        self.input_uid.setPlaceholderText("Ví dụ: 12345678")
        self.input_uid.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
        self.input_uid.setFixedWidth(360)
        self.input_uid.returnPressed.connect(self.check_login)
        layout.addWidget(self.input_uid, 0, QtCore.Qt.AlignmentFlag.AlignHCenter)
        
        self.btn_login = QtWidgets.QPushButton("Đăng Nhập")
        self.btn_login.setObjectName("BtnLogin")
        self.btn_login.setFixedWidth(360)
        self.btn_login.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_login.clicked.connect(self.check_login)
        layout.addWidget(self.btn_login, 0, QtCore.Qt.AlignmentFlag.AlignHCenter)

        layout.addStretch()
        
        layout.addSpacing(5)

        self.lbl_guide = QtWidgets.QLabel(
            "<p style='margin: 0 0 5px 0;'> ✅ ĐIỀU KIỆN ĐỂ SỬ DỤNG APP:</p>"
            "<p style='margin: 0 0 5px 0;'>1. Đăng ký tài khoản OKX dưới Link Ref của cộng đồng TLS1, mã ref: "
            "<a href='copy_ref' style='color: #00ffff; text-decoration: none; font-weight: bold;'>HoanPhiTLS1</a></p>"
            "<p style='margin: 0;'>2. Hoặc thực hiện chuyển Ref về TLS1 nếu đã có sẵn tài khoản OKX.</p>"
        )
        self.lbl_guide.setTextFormat(QtCore.Qt.TextFormat.RichText)
        self.lbl_guide.setTextInteractionFlags(QtCore.Qt.TextInteractionFlag.TextBrowserInteraction)
        self.lbl_guide.setOpenExternalLinks(False)
        self.lbl_guide.setWordWrap(True)
        self.lbl_guide.setStyleSheet("color: #aaaaaa; font-size: 11px; font-weight: normal; margin-top: 5px;")
        
        def handle_ref_click(link):
            if link == "copy_ref":
                QtWidgets.QApplication.clipboard().setText("HoanPhiTLS1")
                QtWidgets.QToolTip.showText(QtGui.QCursor.pos(), "✅ Đã Copy Mã Ref!", self.lbl_guide, QtCore.QRect(), 1500)

        self.lbl_guide.linkActivated.connect(handle_ref_click)
        layout.addWidget(self.lbl_guide)
        
        link_layout = QtWidgets.QHBoxLayout()
        link_layout.setSpacing(10)
        
        self.btn_reg = QtWidgets.QPushButton("Đăng ký OKX (VIP)")
        self.btn_reg.setObjectName("BtnReg")
        self.btn_reg.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_reg.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://www.okx.com/join/HoanPhiTLS1")))
        
        self.btn_ref = QtWidgets.QPushButton("Hướng dẫn chuyển Ref")
        self.btn_ref.setObjectName("BtnRef")
        self.btn_ref.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_ref.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://t.me/traderlaso1/6758")))
        
        link_layout.addWidget(self.btn_reg)
        link_layout.addWidget(self.btn_ref)
        
        layout.addLayout(link_layout)
        
        layout.addSpacing(5)
        
        contact_frame = QtWidgets.QFrame()
        contact_frame.setStyleSheet("QFrame { border: 1px solid #444; border-radius: 6px; background-color: #262626; padding: 2px; }")
        contact_layout = QtWidgets.QHBoxLayout(contact_frame)
        contact_layout.setContentsMargins(10, 5, 10, 5)
        contact_layout.setSpacing(15)
        
        lbl_contact = QtWidgets.QLabel("Liên hệ Admin:")
        lbl_contact.setStyleSheet("color: #aaaaaa; font-size: 11px; border: none; background: transparent;")
        
        def create_icon_btn(icon_name, url):
            btn = QtWidgets.QPushButton()
            btn.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
            btn.setStyleSheet("QPushButton { border: none; background: transparent; } QPushButton:hover { background-color: #444; border-radius: 4px; }")
            btn.setFixedSize(24, 24)
            if getattr(sys, 'frozen', False):
                icon_path = os.path.join(sys._MEIPASS, "media", icon_name)
            else:
                icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", icon_name)
                
            if os.path.exists(icon_path):
                btn.setIcon(QtGui.QIcon(icon_path))
                btn.setIconSize(QtCore.QSize(20, 20))
            else:
                btn.setText("O")
                btn.setStyleSheet("color: #888; border: none; background: transparent;")
            btn.clicked.connect(lambda _, u=url: QtGui.QDesktopServices.openUrl(QtCore.QUrl(u)))
            return btn
            
        btn_tele_icon = create_icon_btn("Telegram.png", "https://t.me/baotran_tls1")
        btn_mess_icon = create_icon_btn("Messenger.png", "https://www.facebook.com/baotran.tls1/")
        btn_zalo_icon = create_icon_btn("zalo.png", "zalo://conversation?phone=84377333096")
        
        contact_layout.addWidget(lbl_contact)
        contact_layout.addStretch()
        contact_layout.addWidget(btn_tele_icon)
        contact_layout.addWidget(btn_mess_icon)
        contact_layout.addWidget(btn_zalo_icon)
        
        btn_discord_icon = create_icon_btn("Discord.png", "https://discord.gg/8NXaSCvZ6u")
        contact_layout.addWidget(btn_discord_icon)
        
        layout.addWidget(contact_frame)
        
    def check_login(self):
        global IS_LOGGED_IN, CURRENT_USER, CURRENT_UID
        uid = self.input_uid.text().strip()
        
        # --- Backdoor dành riêng cho Admin ---
        if uid == "admtls12021":
            IS_LOGGED_IN = True
            CURRENT_USER = "Admin TLS1"
            CURRENT_UID = "admtls12021"
            self.logged_in_name = CURRENT_USER
            self.accept()
            return
        # -------------------------------------
        
        if not uid:
            QtWidgets.QMessageBox.warning(self, "Lỗi", "UID không được để trống!")
            return
            
        if not uid.isdigit():
            QtWidgets.QMessageBox.warning(self, "Lỗi", "UID chỉ bao gồm các chữ số!")
            return
            
        self.btn_login.setText("Đang kiểm tra...")
        self.btn_login.setEnabled(False)
        QtWidgets.QApplication.processEvents()
        
        try:
            import urllib.request
            import csv
            
            url = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
            
            reader = csv.reader(content.splitlines())
            next(reader, None)  # Bỏ qua dòng tiêu đề
            
            valid_uids = {}
            for row in reader:
                if row and len(row) >= 6 and row[0].strip().isdigit():
                    uid_str = row[0].strip()
                    discord_id = row[1].strip()
                    nickname = row[2].strip()
                    hwid = row[4].strip() # Cột E
                    status = row[5].strip().upper() # Cột F
                    valid_uids[uid_str] = {
                        "discord_id": discord_id,
                        "nickname": nickname,
                        "hwid": hwid,
                        "status": status
                    }
            
            user_info = valid_uids.get(uid)

            if user_info is not None:
                status = user_info.get('status', 'ON')
                if status == 'LOCK':
                    QtWidgets.QMessageBox.critical(self, "Tài khoản bị khóa", "Tài khoản UID này đã bị Admin khóa.\n\nVui lòng nhắn tin Admin để yêu cầu kiểm tra lại UID.")
                    self.btn_login.setText("Đăng Nhập")
                    self.btn_login.setEnabled(True)
                    return

                registered_hwid = user_info.get('hwid', "")
                current_hwid = get_hwid()
                
                if not registered_hwid or registered_hwid == "None":
                    res = HWIDAuthDialog(current_hwid, parent=self).exec()
                    if res == QtWidgets.QDialog.DialogCode.Accepted:
                        self.check_login()
                        return
                    self.btn_login.setText("Đăng Nhập")
                    self.btn_login.setEnabled(True)
                    return
                        
                elif registered_hwid != current_hwid:
                    msg = "Tài khoản UID này đã được cấp quyền cho máy tính khác!\n\nKhông thể dùng chung 1 tài khoản cho nhiều máy.\nNếu bạn đổi máy, vui lòng liên hệ Admin để reset Mã Thiết Bị."
                    res = HWIDAuthDialog(current_hwid, custom_message=msg, parent=self).exec()
                    if res == QtWidgets.QDialog.DialogCode.Accepted:
                        self.check_login()
                        return
                    self.btn_login.setText("Đăng Nhập")
                    self.btn_login.setEnabled(True)
                    return
                
                name = user_info.get('nickname', '') or user_info.get('discord_id', '') or "bạn"
                
                CURRENT_UID = uid
                
                self.logged_in_name = name
                self.accept()
            else:
                QtWidgets.QMessageBox.warning(
                    self, 
                    "Từ chối truy cập", 
                    "UID của bạn CHƯA đăng ký dưới Ref TLS1 hoặc chưa được Admin tạo trên hệ thống.\n\n"
                    "Vui lòng nhấn nút 'Đăng ký OKX' hoặc 'Hướng dẫn chuyển Ref' bên dưới để tham gia hệ thống."
                )
                self.btn_login.setText("Đăng Nhập")
                self.btn_login.setEnabled(True)
                
        except Exception as e:
            QtWidgets.QMessageBox.critical(self, "Lỗi kết nối", f"Không thể lấy dữ liệu từ hệ thống:\n{str(e)}\n\nVui lòng kiểm tra lại mạng!")
            self.btn_login.setText("Đăng Nhập")
            self.btn_login.setEnabled(True)

def main():
    try:
        import ctypes
        myappid = 'tls1.trading.app.v1'
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    except:
        pass

    app = QtWidgets.QApplication(sys.argv)
    app.setStyle("Fusion")
    
    if getattr(sys, 'frozen', False):
        global_logo = os.path.join(sys._MEIPASS, "media", "logo.ico")
    else:
        global_logo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "logo.ico")
    try:
        if os.path.exists(global_logo):
            app.setWindowIcon(QtGui.QIcon(global_logo))
    except Exception: pass

    window = MainWindow()
    
    blur_effect = QtWidgets.QGraphicsBlurEffect()
    blur_effect.setBlurRadius(5)
    window.setGraphicsEffect(blur_effect)
    
    window.show()

    def show_login():
        login = LoginDialog(window)
        if login.exec() == QtWidgets.QDialog.DialogCode.Accepted:
            window.setGraphicsEffect(None)
            QtWidgets.QApplication.processEvents()
            
            if hasattr(login, 'logged_in_name'):
                name = login.logged_in_name
                window.set_welcome_name(name)
                
                # Play meme sound
                try:
                    from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
                    from PyQt6.QtCore import QUrl
                    import os
                    
                    window.player = QMediaPlayer()
                    window.audio_output = QAudioOutput()
                    window.player.setAudioOutput(window.audio_output)
                    window.audio_output.setVolume(0.25)
                    
                    media_path_m4a = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "wow.m4a")
                    media_path_mp3 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "wow.mp3")
                    
                    if os.path.exists(media_path_m4a):
                        window.player.setSource(QUrl.fromLocalFile(media_path_m4a))
                    elif os.path.exists(media_path_mp3):
                        window.player.setSource(QUrl.fromLocalFile(media_path_mp3))
                        
                    def on_status_changed(status):
                        from PyQt6.QtMultimedia import QMediaPlayer
                        if status == QMediaPlayer.MediaStatus.LoadedMedia or status == QMediaPlayer.MediaStatus.BufferedMedia:
                            window.player.setPosition(500)
                            window.player.play()
                            try: window.player.mediaStatusChanged.disconnect(on_status_changed)
                            except: pass
                    
                    window.player.mediaStatusChanged.connect(on_status_changed)
                except Exception as e:
                    pass
                    
                msgBox = QtWidgets.QMessageBox(window)
                msgBox.setWindowTitle("Chào mừng")
                msgBox.setText(f"    Chào mừng \"{name}\" đã đến với TLS1 Trading App v{APP_VERSION}    ")
                msgBox.setIcon(QtWidgets.QMessageBox.Icon.NoIcon)
                msgBox.setStyleSheet("QMessageBox { background-color: #1e1e1e; } QLabel { color: #ffffff; font-size: 15px; } QPushButton { background-color: #ff9900; color: black; padding: 6px 20px; border-radius: 4px; font-weight: bold; } QPushButton:hover { background-color: #e68a00; }")
                msgBox.exec()
        else:
            sys.exit(0)

    # Đợi 800ms để biểu đồ và giao diện chính load xong hoàn toàn rồi mới hiện popup
    QtCore.QTimer.singleShot(800, show_login)

    sys.exit(app.exec())

if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == '--run-bot':
        strategy = sys.argv[2]
        env_file = sys.argv[3]
        os.environ["PYTHONUNBUFFERED"] = "1"
        try:
            sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
            sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
        except: pass
        
        try:
            import importlib.util
            def load_and_run(module_name, file_name, env):
                if getattr(sys, 'frozen', False):
                    app_dir = sys._MEIPASS
                else:
                    app_dir = os.path.dirname(os.path.abspath(__file__))
                sys.path.insert(0, app_dir)
                sys.argv = [file_name, env]
                file_path = os.path.join(app_dir, file_name)
                
                # If the file is not at the root (like bot_sub2.py in z_bot_sub2)
                if not os.path.exists(file_path):
                    # fallback to check in the specific z_ folder
                    fallback_folder = f"z_{module_name}" if "sys_" not in module_name else f"z_{module_name.replace('sys_', '')}"
                    file_path = os.path.join(app_dir, fallback_folder, file_name)
                    
                    if not getattr(sys, 'frozen', False) and not os.path.exists(file_path):
                        # For local development, bots are in the parent directory (OKX_Trade_Kit)
                        parent_dir = os.path.dirname(app_dir)
                        if parent_dir not in sys.path:
                            sys.path.insert(0, parent_dir)
                        file_path = os.path.join(parent_dir, file_name)
                        if not os.path.exists(file_path):
                            file_path = os.path.join(parent_dir, fallback_folder, file_name)
                
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = module
                spec.loader.exec_module(module)
                module.main()

            if strategy == "sub1":
                load_and_run("sys_bot_sub1", "sys_bot_sub1.py", env_file)
            elif strategy == "sub2":
                load_and_run("sys_bot_sub2", "sys_bot_sub2.py", env_file)

        except BaseException as e:
            import traceback
            print(f"CRITICAL ERROR IN BOT {strategy}: {e}\n{traceback.format_exc()}")
        sys.exit(0)
    else:
        main()

# z1 | Đẩy các nút social sang góc phải và thay icon logo 256 nét hơn cho app/taskbar


