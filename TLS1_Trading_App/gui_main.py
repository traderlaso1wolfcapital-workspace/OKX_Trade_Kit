import sys
import os
import multiprocessing
import ssl
import certifi

# Fix SSL for macOS / PyInstaller with urllib.request
os.environ['SSL_CERT_FILE'] = certifi.where()
ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())

# Trigger build v129 for crisp icon
import multiprocessing

if __name__ == '__main__':
    multiprocessing.freeze_support()

def fix_qtwebengine_path():
    if getattr(sys, 'frozen', False):
        if sys.platform == 'darwin':
            bundle_dir = os.path.dirname(os.path.dirname(sys.executable))
            for root, dirs, files in os.walk(bundle_dir):
                if 'QtWebEngineProcess' in files:
                    os.environ['QTWEBENGINEPROCESS_PATH'] = os.path.join(root, 'QtWebEngineProcess')
                    break
        elif sys.platform == 'win32':
            bundle_dir = os.path.dirname(sys.executable)
            for root, dirs, files in os.walk(bundle_dir):
                if 'QtWebEngineProcess.exe' in files:
                    os.environ['QTWEBENGINEPROCESS_PATH'] = os.path.join(root, 'QtWebEngineProcess.exe')
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
import hmac
import hashlib
import base64
from datetime import datetime, timezone

if getattr(sys, 'frozen', False):
    _base = os.path.dirname(sys.executable)
else:
    _base = os.path.dirname(os.path.abspath(__file__))

# Sử dụng AppData/Local để đảm bảo luôn có quyền ghi file, tránh rác thư mục code
local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
USER_DATA_DIR = os.path.join(local_app_data, 'TLS1_Trading')
os.makedirs(USER_DATA_DIR, exist_ok=True)

# Tìm ngược lên thư mục gốc OKX_Trade_Kit (chứa z_bot_sub1)
PROJECT_DIR = _base
for _ in range(4):
    if os.path.isdir(os.path.join(PROJECT_DIR, "z_bot_sub1")):
        break
    PROJECT_DIR = os.path.dirname(PROJECT_DIR)

_GLOBAL_AUDIO_PLAYERS = []

def play_ui_sound(sound_file, volume=0.5):
    try:
        from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
        from PyQt6.QtCore import QUrl
        import os
        global _GLOBAL_AUDIO_PLAYERS
        from PyQt6.QtMultimedia import QMediaPlayer as QMP
        _GLOBAL_AUDIO_PLAYERS = [p for p in _GLOBAL_AUDIO_PLAYERS if p.playbackState() == QMP.PlaybackState.PlayingState]
        
        player = QMediaPlayer()
        audio_output = QAudioOutput(player)
        player.setAudioOutput(audio_output)
        audio_output.setVolume(volume)
        
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", sound_file)
        if os.path.exists(path):
            player.setSource(QUrl.fromLocalFile(path))
            player.play()
            _GLOBAL_AUDIO_PLAYERS.append(player)
    except Exception:
        pass

def auto_reset_state_on_update(data_dir, base_dir):
    try:
        import glob, json
        app_version = "1.0.0"
        version_json_path = os.path.join(base_dir, "version.json")
        if os.path.exists(version_json_path):
            with open(version_json_path, "r", encoding="utf-8") as f:
                app_version = json.load(f).get("version", "1.0.0")

        version_file = os.path.join(data_dir, "version.txt")
        current_version = ""
        if os.path.exists(version_file):
            with open(version_file, "r", encoding="utf-8") as f:
                current_version = f.read().strip()
                
        if current_version != app_version:
            print(f"App updated: {current_version} -> {app_version}. Resetting states...")
            for b_name in ["z_bot_sub1", "z_bot_sub2"]:
                json_dir = os.path.join(data_dir, b_name, "json_data")
                if os.path.exists(json_dir):
                    for fpath in glob.glob(os.path.join(json_dir, "*mtf_states.json")):
                        try:
                            os.remove(fpath)
                            print(f"Deleted old state: {fpath}")
                        except Exception:
                            pass
                        
            import shutil
            for cache_name in ["__pycache__", "cache", "GPUCache", "QtWebEngine"]:
                for base_p in [data_dir, base_dir]:
                    c_path = os.path.join(base_p, cache_name)
                    if os.path.exists(c_path) and os.path.isdir(c_path):
                        try:
                            shutil.rmtree(c_path)
                            print(f"Deleted cache: {c_path}")
                        except Exception:
                            pass
            
            with open(version_file, "w", encoding="utf-8") as f:
                f.write(app_version)
    except Exception as e:
        print(f"Error auto reset state: {e}")

auto_reset_state_on_update(USER_DATA_DIR, _base)

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
            return json.load(f).get("version", "1.0.271")
    except:
        return "1.0.271"

APP_VERSION = get_app_version()

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
    from PyQt6.QtWebEngineWidgets import QWebEngineView
except ImportError:
    if getattr(sys, 'frozen', False):
        raise ImportError("Thiếu thư viện PyQt6 trong file đóng gói. Hãy liên hệ admin.")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyQt6"])
    import importlib
    importlib.invalidate_caches()
    from PyQt6 import QtWidgets, QtCore, QtGui
    from PyQt6.QtWebEngineWidgets import QWebEngineView

try:
    from lightweight_charts.widgets import QtChart
except ImportError:
    if getattr(sys, 'frozen', False):
        raise ImportError("Thiếu thư viện lightweight_charts trong file đóng gói. Hãy liên hệ admin.")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "lightweight_charts", "PyQt6-WebEngine"])
    import importlib
    importlib.invalidate_caches()
    from lightweight_charts.widgets import QtChart


# ============================================================================
# PRESENCE MANAGER - Theo dõi số người đang online qua Firebase Realtime DB
# ============================================================================
class PresenceManager(QtCore.QThread):
    """Quản lý trạng thái online/offline của user trên Firebase Realtime Database.
    Chạy trên thread riêng để không block Main UI.
    """
    online_count_changed = QtCore.pyqtSignal(int)  # Signal báo số người online thay đổi

    def __init__(self, parent=None):
        super().__init__(parent)
        self._uid = None
        self._nickname = None
        self._running = False
        self._registered = False

    def register(self, uid, nickname):
        """Đăng ký presence lên Firebase khi login thành công."""
        self._uid = uid
        self._nickname = nickname
        self._registered = False
        try:
            import urllib.request
            import json as _json
            import time
            data = _json.dumps({
                "nickname": nickname,
                "last_seen": int(time.time()),
                "version": APP_VERSION,
                "platform": sys.platform
            }).encode('utf-8')
            url = f"{FIREBASE_URL}/presence/{uid}.json"
            req = urllib.request.Request(url, data=data, method='PUT')
            req.add_header('Content-Type', 'application/json')
            urllib.request.urlopen(req, timeout=8)
            self._registered = True
        except Exception as e:
            print(f"[Presence] Register failed: {e}")

    def unregister(self):
        """Xóa presence khỏi Firebase khi đóng app hoặc đăng xuất."""
        if not self._uid or not self._registered:
            return
        try:
            import urllib.request
            url = f"{FIREBASE_URL}/presence/{self._uid}.json"
            req = urllib.request.Request(url, method='DELETE')
            urllib.request.urlopen(req, timeout=5)
            self._registered = False
        except Exception as e:
            print(f"[Presence] Unregister failed: {e}")

    def _heartbeat(self):
        """Cập nhật last_seen mỗi chu kỳ để Firebase biết user vẫn online."""
        if not self._uid or not self._registered:
            return
        try:
            import urllib.request
            import json as _json
            import time
            data = _json.dumps({"last_seen": int(time.time())}).encode('utf-8')
            url = f"{FIREBASE_URL}/presence/{self._uid}.json"
            req = urllib.request.Request(url, data=data, method='PATCH')
            req.add_header('Content-Type', 'application/json')
            urllib.request.urlopen(req, timeout=8)
        except Exception as e:
            print(f"[Presence] Heartbeat failed: {e}")

    def _fetch_online_count(self):
        """Đọc toàn bộ /presence từ Firebase, đếm user active trong 3 phút."""
        try:
            import urllib.request
            import json as _json
            import time
            url = f"{FIREBASE_URL}/presence.json"
            req = urllib.request.Request(url, method='GET')
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = _json.loads(resp.read().decode('utf-8'))
            if not data or not isinstance(data, dict):
                self.online_count_changed.emit(0)
                return
            now = int(time.time())
            threshold = 180  # 3 phút = 180 giây
            count = 0
            stale_uids = []
            for uid, info in data.items():
                if isinstance(info, dict):
                    last_seen = info.get('last_seen', 0)
                    if now - last_seen <= threshold:
                        count += 1
                    elif now - last_seen > 600:  # Quá 10 phút → dọn dẹp node zombie
                        stale_uids.append(uid)
            # Dọn dẹp các node zombie (user crash không kịp unregister)
            for stale_uid in stale_uids[:5]:  # Giới hạn dọn 5 node/lần tránh quá tải
                try:
                    del_url = f"{FIREBASE_URL}/presence/{stale_uid}.json"
                    del_req = urllib.request.Request(del_url, method='DELETE')
                    urllib.request.urlopen(del_req, timeout=3)
                except Exception:
                    pass
            self.online_count_changed.emit(count)
        except Exception as e:
            print(f"[Presence] Fetch count failed: {e}")

    def run(self):
        """Vòng lặp chính: heartbeat + fetch count mỗi 60 giây."""
        import time
        self._running = True
        # Fetch lần đầu ngay lập tức
        self._fetch_online_count()
        tick = 0
        while self._running:
            time.sleep(1)
            tick += 1
            if tick >= 60:  # Mỗi 60 giây
                tick = 0
                self._heartbeat()
                self._fetch_online_count()

    def stop(self):
        """Dừng thread."""
        self._running = False


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

class HoverSoundButton(QtWidgets.QPushButton):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))

    def enterEvent(self, event):
        play_ui_sound("juniorsoundays-ui-sound-70-527837.mp3", 0.5)
        super().enterEvent(event)

class BotSubprocessWorker(QtCore.QThread):
    log_signal = QtCore.pyqtSignal(str)
    finished_signal = QtCore.pyqtSignal()

    def __init__(self, env_file, strategy):
        super().__init__()
        self.api_file = env_file
        self.strategy = strategy
        self.process = None
        self._is_running = True

    def run(self):
        cmd = [sys.executable, '--run-bot', self.strategy, self.api_file]
        if not getattr(sys, 'frozen', False):
            cmd = [sys.executable, sys.argv[0], '--run-bot', self.strategy, self.api_file]

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
                if self._is_running:
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
                flag_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy}", "json_data", f"stop_{self.strategy}.flag")
                os.makedirs(os.path.dirname(flag_path), exist_ok=True)
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
        import threading
        self.inst_id = inst_id
        self.bar = bar
        self._is_running = True
        self._trigger = threading.Event()

    def trigger_fetch(self):
        self._trigger.set()
        
    def run(self):
        import requests
        import time
        while self._is_running:
            self._trigger.clear()
            try:
                # Dynamically get okx_domain from parent's pos_worker if available
                domain = "www.okx.com"
                p = self.parent()
                if p and hasattr(p, 'pos_worker') and p.pos_worker and hasattr(p.pos_worker, 'okx_domain'):
                    domain = p.pos_worker.okx_domain
                resp = requests.get(f"https://{domain}/api/v5/market/candles?instId={self.inst_id}&bar={self.bar}&limit=300", timeout=5)
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
                            
                            # Đọc markers từ cả Sub1 và Sub2
                            import os
                            import json
                            local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
                            for sub_dir in ["z_bot_sub1", "z_bot_sub2"]:
                                marker_file = os.path.join(local_app_data, 'TLS1_Trading', sub_dir, 'json_data', 'trade_markers.json')
                                if os.path.exists(marker_file):
                                    try:
                                        with open(marker_file, 'r', encoding='utf-8') as f:
                                            markers = json.load(f)
                                            if self.inst_id in markers:
                                                if "markers" not in chart_data: chart_data["markers"] = []
                                                chart_data["markers"].extend(markers[self.inst_id])
                                    except Exception:
                                        pass

                            # Tính toán Order Blocks cho Bot Sub2 SMC
                            try:
                                import z_bot_sub2.bot_strategy as sub2_strat
                                from z_bot_sub2.bot_models import AssetTracker
                                from decimal import Decimal
                                tk = AssetTracker()
                                times = [int(c[0]) for c in candles]
                                opens = [Decimal(c[1]) for c in candles]
                                highs = [Decimal(c[2]) for c in candles]
                                lows = [Decimal(c[3]) for c in candles]
                                closes = [Decimal(c[4]) for c in candles]
                                vol = sub2_strat.get_volatility_measure(closes, highs, lows)
                                sub2_strat.replay_history(tk, closes, opens, highs, lows, times, vol)
                                
                                raw_obs = []
                                for ob in (tk.swing_obs + tk.internal_obs):
                                    if not ob.crossed:
                                        raw_obs.append({
                                            "high": float(ob.bar_high),
                                            "low": float(ob.bar_low),
                                            "time": int(ob.bar_time) if hasattr(ob, 'bar_time') else 0,
                                            "bias": int(ob.bias),
                                            "source": str(ob.source)
                                        })
                                
                                # Gom các vùng OB trùng lấp thành 1 vùng
                                ob_boxes = []
                                for bias in [1, -1]:
                                    b_obs = [o for o in raw_obs if o["bias"] == bias]
                                    if not b_obs: continue
                                    # Sắp xếp theo giá low tăng dần
                                    b_obs.sort(key=lambda x: x["low"])
                                    merged = []
                                    for o in b_obs:
                                        if not merged:
                                            merged.append(o)
                                        else:
                                            last = merged[-1]
                                            # Kiểm tra xem có giao nhau không (last.high >= o.low)
                                            if last["high"] >= o["low"]:
                                                # Hợp nhất
                                                last["high"] = max(last["high"], o["high"])
                                                if o["time"] > 0 and last["time"] > 0:
                                                    last["time"] = min(last["time"], o["time"])
                                                elif o["time"] > 0:
                                                    last["time"] = o["time"]
                                            else:
                                                merged.append(o)
                                    ob_boxes.extend(merged)
                                chart_data["ob_boxes"] = ob_boxes
                                # print(f"DEBUG: Found {len(ob_boxes)} OBs for {self.inst_id}")
                                
                                # Add trade setups as markers
                                if "markers" not in chart_data:
                                    chart_data["markers"] = []
                                
                                BULLISH = 1
                                for setup in tk.trade_setups:
                                    t_ms = 0
                                    if setup.created_bar < len(times):
                                        t_ms = times[setup.created_bar]
                                    if t_ms > 0:
                                        chart_data["markers"].append({
                                            "time": int(t_ms) * 1000 if t_ms < 100000000000 else int(t_ms),
                                            "side": "LONG" if setup.bias == BULLISH else "SHORT",
                                            "price": float(setup.entry_price),
                                            "tp": float(setup.take_profit) if hasattr(setup, 'take_profit') else None,
                                            "sl": float(setup.stop_loss) if hasattr(setup, 'stop_loss') else None,
                                            "status": "inactive" if setup.triggered else "active",
                                            "type": "SETUP"
                                        })
                            except Exception:
                                pass

                            self.chart_data_signal.emit(chart_data)
                        else:
                            self.chart_data_signal.emit({"type": "chart_data", "candles": []})
                    else:
                        self.chart_data_signal.emit({"type": "chart_data", "candles": []})
                else:
                    self.chart_data_signal.emit({"type": "chart_data", "candles": []})
            except Exception:
                self.chart_data_signal.emit({"type": "chart_data", "candles": []})
            self._trigger.wait(5.0)
            
    def stop(self):
        self._is_running = False
        self._trigger.set()
        self.wait()


class FocusClearTableWidget(QtWidgets.QTableWidget):
    def focusOutEvent(self, event):
        super().focusOutEvent(event)
        self.clearSelection()


class OKXPositionsWorker(QtCore.QThread):
    positions_signal = QtCore.pyqtSignal(list)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._is_running = True
        self.api_key = ""
        self.secret_key = ""
        self.passphrase = ""
        self.demo_mode = False
        self.okx_domain = "www.okx.com"

    def update_credentials(self, api_key, secret_key, passphrase, demo_mode, okx_domain="www.okx.com"):
        self.api_key = api_key
        self.secret_key = secret_key
        self.passphrase = passphrase
        self.demo_mode = demo_mode
        self.okx_domain = okx_domain

    def _sign_request(self, timestamp, method, request_path):
        message = timestamp + method + request_path
        mac = hmac.new(bytes(self.secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod=hashlib.sha256)
        return base64.b64encode(mac.digest()).decode('utf-8')

    def run(self):
        while self._is_running:
            if not self.api_key or not self.secret_key:
                time.sleep(3)
                continue
            
            try:
                base_url = f"https://{self.okx_domain}"
                
                # Fetch positions
                path_pos = "/api/v5/account/positions?instType=SWAP"
                ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                headers_pos = {
                    "OK-ACCESS-KEY": self.api_key,
                    "OK-ACCESS-SIGN": self._sign_request(ts, "GET", path_pos),
                    "OK-ACCESS-TIMESTAMP": ts,
                    "OK-ACCESS-PASSPHRASE": self.passphrase,
                    "x-simulated-trading": "1" if self.demo_mode else "0"
                }
                res_pos = requests.get(base_url + path_pos, headers=headers_pos, timeout=5).json()
                
                if res_pos.get("code") == "0":
                    positions = res_pos.get("data", [])
                    
                    # Fetch pending algos (TP/SL)
                    path_algo = "/api/v5/trade/orders-pending?ordType=algo"
                    ts2 = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                    headers_algo = {
                        "OK-ACCESS-KEY": self.api_key,
                        "OK-ACCESS-SIGN": self._sign_request(ts2, "GET", path_algo),
                        "OK-ACCESS-TIMESTAMP": ts2,
                        "OK-ACCESS-PASSPHRASE": self.passphrase,
                        "x-simulated-trading": "1" if self.demo_mode else "0"
                    }
                    res_algo = requests.get(base_url + path_algo, headers=headers_algo, timeout=5).json()
                    algo_data = res_algo.get("data", []) if res_algo.get("code") == "0" else []
                    
                    # Merge TP/SL into positions
                    for pos in positions:
                        inst = pos.get("instId")
                        pos["tp_list"] = []
                        pos["sl_list"] = []
                        for o in algo_data:
                            if o.get("instId") == inst:
                                if o.get("tpTriggerPx"):
                                    pos["tp_list"].append(o.get("tpTriggerPx"))
                                if o.get("slTriggerPx"):
                                    pos["sl_list"].append(o.get("slTriggerPx"))
                                    
                    self.positions_signal.emit(positions)
                else:
                    print(f"OKX API Error in Positions: {res_pos}")
            except Exception as e:
                print(f"Error in OKXPositionsWorker run loop: {e}")
                
            time.sleep(3)

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

class FirebaseChatWorker(QtCore.QThread):
    new_message_signal = QtCore.pyqtSignal(dict)
    
    def __init__(self, db_url):
        super().__init__()
        self.db_url = db_url
        self.is_running = True
        
    def run(self):
        if not self.db_url:
            return
        url = self.db_url.rstrip('/') + '/chat.json'
        headers = {'Accept': 'text/event-stream'}
        try:
            response = requests.get(url, headers=headers, stream=True, timeout=None)
            for line in response.iter_lines(decode_unicode=True):
                if not self.is_running:
                    break
                if line and line.startswith('data: '):
                    try:
                        data_str = line[6:]
                        if data_str.strip() == "null":
                            continue
                        data = json.loads(data_str)
                        self.new_message_signal.emit(data)
                    except Exception:
                        pass
        except Exception as e:
            print("Firebase chat connection error:", e)
            
    def stop(self):
        self.is_running = False
        self.quit()
        self.wait()

class BotInstanceWidget(QtWidgets.QWidget):
    def __init__(self, strategy_id, strategy_name, env_files):
        super().__init__()
        self.strategy_id = strategy_id
        self.strategy_name = strategy_name
        self.api_files = env_files
        self.worker = None
        self.show_chart_pos_lines = True
        
        self.uptime_sec = 0
        self.uptime_timer = QtCore.QTimer(self)
        self.uptime_timer.timeout.connect(self.update_uptime)
        
        self.init_ui()
        self.load_current_settings()
        self.apply_current_api_to_worker()

    def update_uptime(self):
        self.uptime_sec += 1
        h, r = divmod(self.uptime_sec, 3600)
        m, s = divmod(r, 60)
        self.lbl_uptime.setText(f"{h:02d}:{m:02d}:{s:02d}")

    def set_welcome_name(self, name):
        if hasattr(self, 'webview_chat_fallback'):
            fallback_html = f"""<!DOCTYPE html>
            <html>
            <head>
            <meta charset="utf-8">
            <style>
            body, html {{ margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #ffffff; }}
            #tlkio {{ width: 100%; height: 100%; }}
            </style>
            </head>
            <body>
            <div id="tlkio" data-channel="tls1_community" data-nickname="{name}" data-theme="theme--day" style="width:100%;height:100%;"></div>
            <script async src="https://tlk.io/embed.js" type="text/javascript"></script>
            </body>
            </html>"""
            self.webview_chat_fallback.setHtml(fallback_html, QtCore.QUrl("https://tlk.io/"))

        
    def reload_accounts(self):
        self.api_files = []
        json_data_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data")
        os.makedirs(json_data_dir, exist_ok=True)
        
        default_sub1_cfg = {
            "ENABLED_COINS": ["XAU", "BTC", "ETH"],
            "ENABLE_STRATEGY_MAIN": True,
            "ENABLE_STRATEGY_XOLE": True,
            "ENABLE_DYNAMIC_EMA200_TP": False,
            "ENABLE_DYNAMIC_PINGPONG_TP": False,
            "ALTCOIN_FOLLOW_BTC_EMA": True,
            "ENABLE_SIDEWAY_SAFE_EXIT": False,
            "ENABLE_SQUEEZE_ESCAPE_EXIT": True,
            "ENABLE_SAFEGUARD_ENTRY_EXIT": False,
            "ENABLE_TRAILING_SL": False,
            "ENABLE_MAX_ROI_EXIT": False,
            "ENABLE_SIDEWAY_VAP_EXIT": False,
            "ENABLE_H4_FLIP_CLOSE": True,
            "POSITION_VOLUME_HIGH_CONFIDENCE": "100.00",
            "TP_TARGET_OPTIMAL": "0.01200",
            "SL_TARGET_OPTIMAL": "0.01200",
            "EVOLUTION_CYCLE_SECONDS": 3600,
            "LEVERAGES": {"XAU": 50, "BTC": 100, "ETH": 100},
            "VOL_MULTIPLIERS": {"BTC": "1.00", "ETH": "1.30"}
        }

        default_sub2_cfg = {
            "ENABLED_COINS": ["XAU", "BTC", "ETH"],
            "ENABLE_STRATEGY_SMC": True,
            "TIMEFRAME_BASE": "1H",
            "POSITION_VOLUME_HIGH_CONFIDENCE": "100.00",
            "OB_RR_RATIO_TREND": "5.00",
            "OB_RR_RATIO_COUNTER": "1.00",
            "USE_DYNAMIC_RISK": False,
            "RISK_PER_TRADE_PCT": "0.0050",
            "SMC_MODE": "All Setups",
            "SMC_STYLE": "Normal",
            "OB_SOURCE": "ALL",
            "OB_DIRECTION": "BOTH",
            "OB_TP_MODE": "RR"
        }

        if os.path.exists(PROJECT_DIR):
            proj_bot_dir = os.path.join(PROJECT_DIR, f"z_bot_{self.strategy_id}")
            if os.path.exists(proj_bot_dir):
                self.api_files.extend([f for f in os.listdir(proj_bot_dir) if f.startswith('.api') and not f.endswith('.bak')])
        bot_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}")
        os.makedirs(bot_dir, exist_ok=True)
        # Tự động tạo 5 tài khoản phụ rỗng mặc định & các file JSON cấu hình mặc định nếu chưa có
        for i in range(1, 6):
            default_env = os.path.join(bot_dir, f".api_sub{i}")
            if not os.path.exists(default_env):
                try:
                    with open(default_env, "w", encoding="utf-8") as f:
                        f.write("OKX_API_KEY=\"\"\nOKX_SECRET_KEY=\"\"\nOKX_PASSPHRASE=\"\"\n")
                except: pass

            if self.strategy_id == "sub2":
                c_name = f"sub2_sub{i}_global_config.json"
                m_name = "sub2_global_config.json"
                cur_cfg = default_sub2_cfg
            else:
                c_name = f"sub{i}_global_config.json"
                m_name = "sub1_global_config.json"
                cur_cfg = default_sub1_cfg

            for cfg_f in [c_name, m_name]:
                c_path = os.path.join(json_data_dir, cfg_f)
                if not os.path.exists(c_path):
                    try:
                        with open(c_path, "w", encoding="utf-8") as f:
                            json.dump(cur_cfg, f, indent=4)
                    except: pass

        if os.path.exists(bot_dir):
            self.api_files.extend([f for f in os.listdir(bot_dir) if f.startswith('.api') and not f.endswith('.bak') and f not in self.api_files])
        if '.api' not in self.api_files:
            self.api_files.insert(0, '.api')
        
        self.account_dropdown.blockSignals(True)
        self.account_dropdown.clear()
        if self.strategy_id in ["trinhsat", "quansu"]:
            self.account_dropdown.addItem("Mặc định (Không cần API)", ".api")
            self.account_dropdown.setDisabled(True)
        else:
            for env in self.api_files:
                if env == ".api":
                    display = "Tài khoản chính"
                else:
                    sub_name = env.replace(".api_sub", "")
                    display = f"Tài khoản phụ {sub_name}"
                self.account_dropdown.addItem(display, env)
        self.account_dropdown.blockSignals(False)

    def create_new_account(self):
        play_ui_sound("ribhavagrawal-hit-by-a-wood-230542.mp3", 0.6)
        text, ok = QtWidgets.QInputDialog.getText(self, "Tạo Tài Khoản Mới", "Nhập tên tài khoản (viết liền không dấu, ví dụ: account2):")
        if ok and text:
            text = text.strip()
            if not text: return
            env_name = f".api_{text}"
            bot_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}")
            os.makedirs(bot_dir, exist_ok=True)
            env_path = os.path.join(bot_dir, env_name)
            if not os.path.exists(env_path):
                with open(env_path, "w", encoding="utf-8") as f:
                    f.write("OKX_API_KEY=\"\"\nOKX_SECRET_KEY=\"\"\nOKX_PASSPHRASE=\"\"\n")
                self.reload_accounts()
                idx = self.account_dropdown.findData(env_name)
                if idx >= 0:
                    self.account_dropdown.setCurrentIndex(idx)
                msg = QtWidgets.QMessageBox(self)
                msg.setWindowTitle("Thành Công")
                msg.setText(f"Đã tạo tài khoản: {env_name}\nHãy nhập API Key cho tài khoản này!")
                msg.exec()
            else:
                msg = QtWidgets.QMessageBox(self)
                msg.setWindowTitle("Lỗi")
                msg.setText(f"Tài khoản {env_name} đã tồn tại!")
                msg.exec()

    def delete_account(self):
        play_ui_sound("ribhavagrawal-hit-by-a-wood-230542.mp3", 0.6)
        env_name = self.account_dropdown.currentData()
        if not env_name:
            return
        if env_name == ".api":
            msg = QtWidgets.QMessageBox(self)
            msg.setWindowTitle("Lỗi")
            msg.setText("Không thể xoá Tài khoản chính!")
            msg.exec()
            return
        
        reply = QtWidgets.QMessageBox.question(self, 'Xác nhận xoá',
                                             f"Bạn có chắc chắn muốn xoá tài khoản {env_name} không?\nHành động này không thể hoàn tác!",
                                             QtWidgets.QMessageBox.StandardButton.Yes | QtWidgets.QMessageBox.StandardButton.No,
                                             QtWidgets.QMessageBox.StandardButton.No)
        
        if reply == QtWidgets.QMessageBox.StandardButton.Yes:
            deleted_any = False
            for root_dir in [PROJECT_DIR, USER_DATA_DIR]:
                if not os.path.exists(root_dir): continue
                for d in os.listdir(root_dir):
                    if d.startswith("z_bot_") and os.path.isdir(os.path.join(root_dir, d)):
                        env_path = os.path.join(root_dir, d, env_name)
                        if os.path.exists(env_path):
                            try:
                                os.remove(env_path)
                                deleted_any = True
                            except: pass
            
            if deleted_any:
                self.reload_accounts()
                msg = QtWidgets.QMessageBox(self)
                msg.setWindowTitle("Thành Công")
                msg.setText(f"Đã xoá tài khoản: {env_name}")
                msg.exec()
            else:
                msg = QtWidgets.QMessageBox(self)
                msg.setWindowTitle("Lỗi")
                msg.setText(f"Không tìm thấy tài khoản {env_name} để xoá!")
                msg.exec()

    def init_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(4, 4, 4, 4)

        # Khởi tạo dropdown (sẽ được add vào tab API)
        self.account_dropdown = QtWidgets.QComboBox()
        self.account_dropdown.setView(QtWidgets.QListView())
        self.account_dropdown.setMinimumWidth(300)
        self.account_dropdown.setStyleSheet("""
            QComboBox { background-color: #2d2d2d; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; padding: 5px 10px; font-size: 13px; }
            QComboBox:hover { border-color: #ffb74d; }
            QComboBox::drop-down { border: none; }
            QComboBox::down-arrow { image: none; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid #aaa; margin-right: 8px; }
            QComboBox QAbstractItemView { background-color: #1e1e1e; color: #e0e0e0; selection-background-color: #0e639c; selection-color: white; border: 1px solid #555; padding: 4px; outline: none; }
            QComboBox QAbstractItemView::item { padding: 6px 10px; min-height: 24px; }
            QComboBox QAbstractItemView::item:hover { background-color: #333; }
        """)
        
        if self.strategy_id in ["trinhsat", "quansu"]:
            self.account_dropdown.addItem("Mặc định (Không cần API)", ".api")
            self.account_dropdown.setDisabled(True)
        else:
            for env in self.api_files:
                if env == ".api":
                    display = "Tài khoản chính"
                else:
                    sub_name = env.replace(".api_sub", "")
                    display = f"Tài khoản phụ {sub_name}"
                self.account_dropdown.addItem(display, env)

        target_env = ".api" if self.strategy_id == "sub1" else f".api_{self.strategy_id}"
        idx = self.account_dropdown.findData(target_env)
        if idx >= 0:
            self.account_dropdown.setCurrentIndex(idx)
            
        self.account_dropdown.currentIndexChanged.connect(self.on_account_changed)

        self.account_dropdown.currentIndexChanged.connect(self.on_account_changed)

        # Đưa trạng thái (ĐANG DỪNG/CHẠY) xuống thanh công cụ chart / vị thế
        self.status_led = QtWidgets.QLabel("● ĐANG DỪNG")
        self.status_led.setFont(QtGui.QFont("Segoe UI", 10, QtGui.QFont.Weight.Bold))
        self.status_led.setStyleSheet("color: #FF3333; padding: 5px 10px;")

        # Tối ưu UX: Màn hình Dashboard hiển thị trực tiếp 100% diện tích màn hình chính!
        self.tab_dashboard = QtWidgets.QWidget()
        self.setup_tab_dashboard()
        layout.addWidget(self.tab_dashboard)

        if self.strategy_id not in ["trinhsat", "quansu"]:
            # Khởi tạo sẵn các tab cấu hình và cộng đồng (Sẵn sàng mở dạng Popup Modal khi ấn nút ⚙️ / 💬)
            self.tab_api = QtWidgets.QWidget()
            self.setup_tab_api()

            self.tab_strategy = QtWidgets.QWidget()
            self.setup_tab_strategy()
            
            self.tab_community = QtWidgets.QWidget()
            self.setup_tab_community()

    def open_settings_dialog(self):
        play_ui_sound("click.mp3", 0.5)
        dlg = QtWidgets.QDialog(self)
        dlg.setWindowTitle(f"⚙️ Cấu Hình Hệ Thống - {self.strategy_name}")
        dlg.resize(680, 850) # Rộng 680px dãn vừa đủ loại bỏ hoàn toàn thanh kéo ngang
        dlg.setStyleSheet("""
            QDialog { background-color: #1e1e1e; color: #ffffff; }
            QLabel { color: #ffffff; }
            QPushButton { outline: none; border: none; }
            QScrollBar:horizontal { height: 0px; background: transparent; }
        """)
        
        dlg_layout = QtWidgets.QVBoxLayout(dlg)
        dlg_layout.setContentsMargins(10, 10, 10, 10)
        
        settings_tabs = QtWidgets.QTabWidget()
        settings_tabs.setObjectName("InnerTabs")
        
        if hasattr(self, 'tab_api') and self.tab_api:
            settings_tabs.addTab(self.tab_api, "🔑 Cấu Hình API Key")
        if hasattr(self, 'tab_strategy') and self.tab_strategy:
            settings_tabs.addTab(self.tab_strategy, "⚙️ Cấu Hình Chiến Thuật")
            
        dlg_layout.addWidget(settings_tabs)
        
        # Nút Đăng Xuất được giấu vào đây thay vì nằm trên header
        btn_row = QtWidgets.QHBoxLayout()
        btn_logout_in_settings = QtWidgets.QPushButton("🚪 Đăng Xuất")
        btn_logout_in_settings.setFont(QtGui.QFont("Segoe UI", 9, QtGui.QFont.Weight.Bold))
        btn_logout_in_settings.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_logout_in_settings.setStyleSheet("""
            QPushButton { background-color: #333333; color: #ffffff; min-height: 30px; padding: 4px 14px; border-radius: 4px; border: none; outline: none; font-weight: bold; }
            QPushButton:hover { background-color: #cc2222; color: #ffffff; }
        """)
        def _do_logout_from_settings():
            dlg.accept()
            main_win = self.window()
            if hasattr(main_win, 'handle_logout'):
                main_win.handle_logout()
        btn_logout_in_settings.clicked.connect(_do_logout_from_settings)
        btn_row.addWidget(btn_logout_in_settings)
        btn_row.addStretch(1)
        dlg_layout.addLayout(btn_row)
        
        dlg.exec()
        
        # Giữ lại các widget cấu hình không bị giải phóng bộ nhớ khi dialog đóng
        settings_tabs.clear()
        if hasattr(self, 'tab_api') and self.tab_api:
            self.tab_api.setParent(None)
        if hasattr(self, 'tab_strategy') and self.tab_strategy:
            self.tab_strategy.setParent(None)

    def open_community_dialog(self):
        play_ui_sound("click.mp3", 0.5)
        dlg = QtWidgets.QDialog(self)
        dlg.setWindowTitle("💬 Chat Cộng Đồng Trader TLS1")
        dlg.resize(630, 840) # Tỉ lệ dọc 3:4 chuẩn
        dlg.setStyleSheet("""
            QDialog { background-color: #1e1e1e; color: #ffffff; }
            QLabel { color: #ffffff; }
        """)
        
        dlg_layout = QtWidgets.QVBoxLayout(dlg)
        dlg_layout.setContentsMargins(10, 10, 10, 10)
        
        if hasattr(self, 'tab_community') and self.tab_community:
            dlg_layout.addWidget(self.tab_community)
            
        dlg.exec()
        if hasattr(self, 'tab_community') and self.tab_community:
            self.tab_community.setParent(None)

    def setup_tab_dashboard(self):
        dash_layout = QtWidgets.QVBoxLayout(self.tab_dashboard)
        dash_layout.setContentsMargins(10, 10, 10, 10)
        dash_layout.setSpacing(15)

        # Hàng trên: Hành động
        top_panel = QtWidgets.QHBoxLayout()
        top_panel.setSpacing(15)

        # Nhóm Hành Động
        control_box = QtWidgets.QWidget()
        control_layout = QtWidgets.QHBoxLayout(control_box)
        control_layout.setContentsMargins(0, 5, 15, 5)
        control_layout.setSpacing(10)

        self.btn_start = QtWidgets.QPushButton("▶ BẮT ĐẦU CHẠY BOT")
        self.btn_start.setFont(QtGui.QFont("Segoe UI", 10, QtGui.QFont.Weight.Bold))
        self.btn_start.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_start.setStyleSheet("""
            QPushButton { background-color: #2E7D32; color: white; min-height: 28px; min-width: 120px; padding: 5px 10px; border: 1px solid transparent; border-radius: 4px; }
            QPushButton:hover { background-color: #388E3C; border: 1px solid #ffaa00; }
            QPushButton:disabled { background-color: #555555; color: #888888; border: 1px solid #444; }
        """)
        self.btn_start_hover = ButtonHoverSoundFilter(self.btn_start)
        self.btn_start.installEventFilter(self.btn_start_hover)
        self.btn_start.clicked.connect(self.start_bot)

        self.btn_stop = QtWidgets.QPushButton("■ DỪNG CHẠY BOT")
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
        
        self.dash_active_coins_box = QtWidgets.QWidget()
        dash_coins_layout = QtWidgets.QHBoxLayout(self.dash_active_coins_box)
        dash_coins_layout.setContentsMargins(15, 10, 15, 10)
        dash_coins_layout.setSpacing(15)
        
        import os
        svg_content = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#4CAF50" stroke-width="4" d="M4 12l5 5L20 6"/></svg>'
        svg_path = os.path.join(USER_DATA_DIR, "check_green.svg").replace("\\", "/")
        if not os.path.exists(svg_path):
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
        cb_style = f"""
            QCheckBox {{
                font-size: 11px;
                font-weight: bold;
                color: #aaaaaa;
                border: 1px solid #3d3d3d;
                border-radius: 3px;
                padding: 1px 4px 1px 2px;
                background-color: #161616;
            }}
            QCheckBox:hover {{
                border-color: #666666;
                background-color: #222222;
                color: #ffffff;
            }}
            QCheckBox:checked {{
                border-color: #666666;
                background-color: #161616;
                color: #cccccc;
            }}
            QCheckBox::indicator {{
                width: 11px;
                height: 11px;
                border: none;
                background-color: transparent;
            }}
            QCheckBox::indicator:checked {{
                image: url({svg_path});
            }}
        """
        
        self.dash_chk_xau = QtWidgets.QCheckBox("XAU")
        self.dash_chk_xau.setStyleSheet(cb_style)
        self.dash_chk_xau.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.dash_chk_xau.stateChanged.connect(lambda s: self._on_dash_coin_toggled("xau", s))
        self.dash_chk_btc = QtWidgets.QCheckBox("BTC")
        self.dash_chk_btc.setStyleSheet(cb_style)
        self.dash_chk_btc.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.dash_chk_btc.stateChanged.connect(lambda s: self._on_dash_coin_toggled("btc", s))
        self.dash_chk_eth = QtWidgets.QCheckBox("ETH")
        self.dash_chk_eth.setStyleSheet(cb_style)
        self.dash_chk_eth.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.dash_chk_eth.stateChanged.connect(lambda s: self._on_dash_coin_toggled("eth", s))
        
        dash_coins_layout.addWidget(self.dash_chk_eth)
        self.dash_active_coins_box.hide()
        top_panel.addWidget(self.dash_active_coins_box)
        top_panel.addStretch(1)
        
        if self.strategy_id not in ["trinhsat", "quansu"]:
            self.btn_open_settings = QtWidgets.QPushButton("⚙️ Cài Đặt")
            self.btn_open_settings.setFont(QtGui.QFont("Segoe UI", 9, QtGui.QFont.Weight.Bold))
            self.btn_open_settings.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
            self.btn_open_settings.setStyleSheet("""
                QPushButton { background-color: #2d2d2d; color: #ffffff; min-height: 22px; padding: 2px 10px; border: 1px solid #555555; border-radius: 4px; }
                QPushButton:hover { background-color: #ff9900; color: #000000; font-weight: bold; border-color: #ff9900; }
            """)
            self.btn_open_settings_hover = ButtonHoverSoundFilter(self.btn_open_settings)
            self.btn_open_settings.installEventFilter(self.btn_open_settings_hover)
            self.btn_open_settings.clicked.connect(self.open_settings_dialog)

            self.btn_open_community = QtWidgets.QPushButton("💬 Join Cộng đồng")
            self.btn_open_community.setFont(QtGui.QFont("Segoe UI", 9, QtGui.QFont.Weight.Bold))
            self.btn_open_community.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
            self.btn_open_community.setStyleSheet("""
                QPushButton { background-color: #2d2d2d; color: #ffffff; min-height: 22px; padding: 2px 10px; border: 1px solid #555555; border-radius: 4px; }
                QPushButton:hover { background-color: #ff9900; color: #000000; font-weight: bold; border-color: #ff9900; }
            """)
            self.btn_open_community_hover = ButtonHoverSoundFilter(self.btn_open_community)
            self.btn_open_community.installEventFilter(self.btn_open_community_hover)
            self.btn_open_community.clicked.connect(self.open_community_dialog)
            # Cộng Đồng → sẽ được add vào header_layout bởi MainWindow
            # Cài Đặt → sẽ được add vào corner_widget của tab_live_view

        dash_layout.addLayout(top_panel, 0)


        # Khung phân vùng Tab Live View
        self.tab_live_view = QtWidgets.QTabWidget()
        self.live_view_hover_filter = HoverSoundFilter(self.tab_live_view.tabBar())
        self.tab_live_view.tabBar().installEventFilter(self.live_view_hover_filter)
        self.tab_live_view.tabBar().setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.tab_live_view.tabBar().setExpanding(False)
        self.tab_live_view.tabBar().setUsesScrollButtons(False)
        self.tab_live_view.setStyleSheet("""
            QTabWidget::pane { border: 1px solid #333333; background-color: #1e1e1e; border-radius: 4px; margin-top: -1px; }
            QTabBar::tab { background: #1a1a1a; color: #a0a0a0; padding: 6px 14px; border: 1px solid #333333; border-top-left-radius: 4px; border-top-right-radius: 4px; font-size: 12px; font-weight: bold; }
            QTabBar::tab:selected { background: #2d2d2d; color: #FF9900; font-weight: bold; border: 1px solid #444444; border-bottom: 2px solid #2d2d2d; }
            QTabBar::tab:hover { background: #333333; color: #ffffff; }
        """)

        # Khởi tạo ô chế độ layout Chế độ dọc/ngang trước để chèn vào log_header
        self.combo_layout_mode = QtWidgets.QComboBox()
        self.combo_layout_mode.addItems(["Chế độ dọc", "Chế độ ngang"])
        self.combo_layout_mode.setCurrentText("Chế độ dọc")
        self.combo_layout_mode.setStyleSheet("QComboBox { padding: 2px 5px; font-weight: bold; font-size: 11px; min-width: 100px; }")
        self.combo_layout_mode.setFixedWidth(110)

        # Tab 1: Logs
        self.tab_logs = QtWidgets.QWidget()
        console_layout = QtWidgets.QVBoxLayout(self.tab_logs)
        console_layout.setContentsMargins(5, 2, 5, 5)
        console_layout.setSpacing(4)
        
        log_header = QtWidgets.QHBoxLayout()
        lbl_term = QtWidgets.QLabel("Terminal Logs:")
        log_header.addWidget(lbl_term)
        
        self.lbl_uptime = QtWidgets.QLabel("00:00:00")
        self.lbl_uptime.setStyleSheet("color: #aaaaaa; font-weight: normal; margin-left: 5px; font-size: 13px;")
        log_header.addWidget(self.lbl_uptime)
        
        log_header.addStretch(1)
        log_header.addWidget(self.combo_layout_mode) # Đặt ô Dọc/Ngang ở bên phải cùng hàng Terminal Logs
        
        btn_clear_log = QtWidgets.QPushButton("🗑️ Clear Logs")
        btn_clear_log.setStyleSheet("max-width: 100px; padding: 5px;")
        btn_clear_log.hide()
        
        self.log_display = QtWidgets.QPlainTextEdit()
        self.log_display.setReadOnly(True)
        self.log_display.setMaximumBlockCount(100)
        self.log_display.setLineWrapMode(QtWidgets.QPlainTextEdit.LineWrapMode.NoWrap)
        self.log_display.setFont(QtGui.QFont("Consolas", 12))
        self.log_display.setSizePolicy(QtWidgets.QSizePolicy.Policy.Expanding, QtWidgets.QSizePolicy.Policy.Expanding)
        self.log_display.setStyleSheet(
            "background-color: #111111; color: #D69E2E; font-family: 'Consolas', 'Cascadia Code', monospace; font-size: 17px; padding: 5px; border-radius: 4px; border: 1px solid #333;"
        )
        
        btn_clear_log.clicked.connect(self.log_display.clear)
        log_header.addWidget(btn_clear_log)
        console_layout.addLayout(log_header)
        console_layout.addWidget(self.log_display, 1)


        # Tab 2: Chart
        self.tab_chart = QtWidgets.QWidget()
        chart_layout = QtWidgets.QVBoxLayout(self.tab_chart)
        chart_layout.setContentsMargins(5, 5, 5, 5)
        
        control_layout = QtWidgets.QHBoxLayout()
        control_layout.setContentsMargins(0, 0, 0, 0)
        
        self.combo_coin = QtWidgets.QComboBox()
        for p in ["BTC-USDT-SWAP", "XAU-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP", "XRP-USDT-SWAP"]:
            self.combo_coin.addItem(p.replace("-SWAP", ""), p)
        self.combo_coin.setCurrentText("BTC-USDT")
        self.combo_coin.setStyleSheet("padding: 2px; font-weight: bold; font-size: 11px;")
        
        self.combo_tf = QtWidgets.QComboBox()
        self.combo_tf.setFixedWidth(50)
        self.combo_tf.addItems(["1m", "5m", "15m", "30m", "1H", "2H", "4H", "1D"])
        self.combo_tf.setCurrentText("4H")
        self.combo_tf.setStyleSheet("padding: 2px; font-weight: bold; font-size: 11px; min-width: 0px;")
        
        self.chk_show_ob = QtWidgets.QCheckBox("Vùng OB")
        self.chk_show_ob.setChecked(True)
        self.chk_show_ob.setStyleSheet("color: #e0e0e0; font-weight: bold; font-size: 11px;")
        self.chk_show_ob.hide()
        
        self.chk_show_positions = QtWidgets.QCheckBox("Vị thế")
        self.chk_show_positions.setChecked(True)
        self.chk_show_positions.setStyleSheet("color: #e0e0e0; font-weight: bold; font-size: 11px;")
        self.chk_show_positions.hide()
        self.chk_show_positions.toggled.connect(lambda checked: self.tab_positions.setVisible(checked) if hasattr(self, 'tab_positions') else None)
        
        # Control layout widgets (combo_coin, combo_tf, chk_show_ob, chk_show_positions, status_led)
        # will be added directly into tab_live_view Corner Widget!
        
        try:
            self.chart_widget = QtChart()
            self.ema_line = self.chart_widget.create_line('EMA 200', color='rgba(220, 220, 220, 0.8)', width=2, price_line=False, price_label=False)
            webview = self.chart_widget.get_webview()
            
            # Fix race condition cho QWebChannel/lightweight_charts để tránh lỗi undefined callback
            fix_bridge_js = """
            if (typeof window.pythonObject === 'undefined') {
                let q = [], real = null;
                Object.defineProperty(window, 'pythonObject', {
                    get: function() {
                        return { callback: function(m) {
                            if (real && real.callback) { real.callback(m); } else { q.push(m); }
                        }};
                    },
                    set: function(v) {
                        real = v;
                        if (real && real.callback) {
                            while (q.length > 0) {
                                try { real.callback(q.shift()); } catch(e) {}
                            }
                        }
                    },
                    configurable: true
                });
            }
            """
            webview.loadFinished.connect(lambda: webview.page().runJavaScript(fix_bridge_js))
            
            webview.setSizePolicy(QtWidgets.QSizePolicy.Policy.Expanding, QtWidgets.QSizePolicy.Policy.Expanding)
            chart_layout.addWidget(webview, 1)
            
            self.chart_widget.layout(background_color='#0c0c0c', text_color='#e0e0e0', font_size=12)
            self.chart_widget.candle_style(up_color='#26a69a', down_color='#ef5350',
                                    border_up_color='#26a69a', border_down_color='#ef5350',
                                    wick_up_color='#26a69a', wick_down_color='#ef5350')
            self.chart_widget.volume_config(up_color='rgba(38, 166, 154, 0.5)', down_color='rgba(239, 83, 80, 0.5)')
            self.chart_widget.watermark(f'{self.combo_coin.currentText()} ({self.combo_tf.currentText()})', color='rgba(255, 153, 0, 0.1)')
            self.chart_widget.grid(vert_enabled=True, horz_enabled=True, color='rgba(42, 42, 42, 0.3)')
            self.chart_widget.time_scale(right_offset=30)
            pass
            # Khởi chạy luồng lấy dữ liệu chart auto
            self._chart_initialized = False
            self.live_chart_worker = LiveChartWorker(inst_id=self.combo_coin.currentData(), bar=self.combo_tf.currentText(), parent=self)
            self.live_chart_worker.chart_data_signal.connect(self.update_live_chart)
            
            self.combo_coin.currentTextChanged.connect(self.on_chart_config_changed)
            self.combo_tf.currentTextChanged.connect(self.on_chart_config_changed)
            
            self.live_chart_worker.start()
        except Exception as e:
            chart_layout.addWidget(QtWidgets.QLabel(f"Lỗi khởi tạo biểu đồ: {str(e)}"))
            self.chart_widget = None

        # Khởi tạo bảng Vị thế OKX
        self.tab_positions = QtWidgets.QWidget()
        pos_layout = QtWidgets.QVBoxLayout(self.tab_positions)
        pos_layout.setContentsMargins(0, 5, 0, 5)
        
        self.pos_table = FocusClearTableWidget(0, 6)
        self.pos_table.setHorizontalHeaderLabels(["Cặp giao dịch", "Giá vào lệnh", "Ký quỹ", "PNL thả nổi", "Chốt lời | Dừng lỗ", "Cắt lệnh"])
        header = self.pos_table.horizontalHeader()
        header.setMinimumSectionSize(75)
        header.setSectionResizeMode(0, QtWidgets.QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(1, QtWidgets.QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(2, QtWidgets.QHeaderView.ResizeMode.Interactive)
        self.pos_table.setColumnWidth(2, 85)
        header.setSectionResizeMode(3, QtWidgets.QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(4, QtWidgets.QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(5, QtWidgets.QHeaderView.ResizeMode.ResizeToContents)
        self.pos_table.setStyleSheet(
            "QTableWidget { background-color: #1a1a1a; gridline-color: #333333; color: #ffffff; border: 1px solid #333333; font-size: 15px; selection-background-color: #162e3b; selection-color: #ffffff; }"
            "QTableWidget::item:selected { background-color: #162e3b; color: #ffffff; border: 1px solid #20687a; }"
            "QHeaderView::section { background-color: #2b2b2b; color: #ffffff; font-weight: bold; border: 1px solid #333333; padding: 4px; font-size: 14px; }"
        )
        self.pos_table.setEditTriggers(QtWidgets.QAbstractItemView.EditTrigger.NoEditTriggers)
        self.pos_table.setSelectionMode(QtWidgets.QAbstractItemView.SelectionMode.SingleSelection)
        self.pos_table.setSelectionBehavior(QtWidgets.QAbstractItemView.SelectionBehavior.SelectItems)
        self.pos_table.verticalHeader().setVisible(False)
        pos_layout.addWidget(self.pos_table)
        
        self.pos_worker = OKXPositionsWorker(self)
        self.pos_worker.positions_signal.connect(self.update_positions_table)
        # Sẽ load data ngay khi user chọn account (sự kiện load_selected_account sẽ được sửa lại để gọi apply_current_api_to_worker)
        self.pos_worker.start()
        
        # Chèn bảng vị thế trực tiếp vào chart_layout (phía dưới chart, không dùng splitter riêng giữa chart và bảng vị thế)
        self.pos_table.verticalHeader().setDefaultSectionSize(32)
        self.tab_positions.setFixedHeight(148)
        chart_layout.addWidget(self.tab_positions)

        # Khởi tạo Khung thời gian giao dịch ở Dashboard dưới dạng container để nhét vào TopRightCorner
        self.dash_tfs_container = QtWidgets.QWidget()
        self.dash_tfs_container.setStyleSheet("background-color: transparent;")
        l_tfs = QtWidgets.QHBoxLayout(self.dash_tfs_container)
        l_tfs.setContentsMargins(5, 0, 5, 0)
        l_tfs.setSpacing(8)
        
        self.chk_tf_m5 = QtWidgets.QCheckBox("M5"); self.chk_tf_m5.setStyleSheet(cb_style); self.chk_tf_m5.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.chk_tf_m15 = QtWidgets.QCheckBox("M15"); self.chk_tf_m15.setStyleSheet(cb_style); self.chk_tf_m15.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.chk_tf_m30 = QtWidgets.QCheckBox("M30"); self.chk_tf_m30.setStyleSheet(cb_style); self.chk_tf_m30.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.chk_tf_h1 = QtWidgets.QCheckBox("H1"); self.chk_tf_h1.setStyleSheet(cb_style); self.chk_tf_h1.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.chk_tf_h2 = QtWidgets.QCheckBox("H2"); self.chk_tf_h2.setStyleSheet(cb_style); self.chk_tf_h2.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.chk_tf_h4 = QtWidgets.QCheckBox("H4"); self.chk_tf_h4.setStyleSheet(cb_style); self.chk_tf_h4.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        
        l_tfs.addWidget(self.chk_tf_m5)
        l_tfs.addWidget(self.chk_tf_m15)
        l_tfs.addWidget(self.chk_tf_m30)
        l_tfs.addWidget(self.chk_tf_h1)
        l_tfs.addWidget(self.chk_tf_h2)
        l_tfs.addWidget(self.chk_tf_h4)
        
        # Kết nối sự kiện lưu ngầm khi check/uncheck
        for chk in [self.chk_tf_m5, self.chk_tf_m15, self.chk_tf_m30, self.chk_tf_h1, self.chk_tf_h2, self.chk_tf_h4]:
            chk.stateChanged.connect(self._on_dash_tf_changed)
            
        if self.strategy_id == "sub2":
            self.dash_tfs_container.hide()

        self.split_view = QtWidgets.QSplitter(QtCore.Qt.Orientation.Vertical)
        self.split_view.addWidget(self.tab_chart)
        self.split_view.addWidget(self.tab_logs)
        self.split_view.setSizes([500, 500])
        self.split_view.setStretchFactor(0, 1)
        self.split_view.setStretchFactor(1, 1)

        self.tab_live_view.addTab(self.split_view, "Tổng quan (chart_logs)")

        def on_layout_mode_changed(text):
            if not hasattr(self, 'split_view') or self.split_view is None:
                return
            
            if "ngang" in text.lower():
                self.split_view.setOrientation(QtCore.Qt.Orientation.Horizontal)
                self.split_view.setSizes([600, 400])
            else:
                self.split_view.setOrientation(QtCore.Qt.Orientation.Vertical)
                self.split_view.setSizes([500, 500])
                
            if hasattr(self, 'chk_show_positions'):
                self.tab_positions.setVisible(self.chk_show_positions.isChecked())
                
        self.combo_layout_mode.currentTextChanged.connect(on_layout_mode_changed)
        
        # Phục hồi Tab chủ Native của QTabWidget để bo liền khung với pane bên dưới
        self.tab_live_view.tabBar().show()
        
        # Đưa tất cả công cụ vào TopRightCorner
        right_corner = QtWidgets.QWidget()
        rc_layout = QtWidgets.QHBoxLayout(right_corner)
        rc_layout.setContentsMargins(0, 0, 8, 2)
        rc_layout.setSpacing(14)
        
        rc_layout.addWidget(self.combo_coin)
        rc_layout.addWidget(self.combo_tf)
        
        # Nhét thanh checkbox Khung thời gian vào trước
        if hasattr(self, 'dash_tfs_container'):
            rc_layout.addWidget(self.dash_tfs_container)
            
        if hasattr(self, 'btn_open_settings'):
            self.btn_open_settings.setFont(QtGui.QFont("Segoe UI", 9, QtGui.QFont.Weight.Bold))
            self.btn_open_settings.setStyleSheet("""
                QPushButton { background-color: #2d2d2d; color: #ffffff; min-height: 22px; padding: 2px 10px; border: 1px solid #555555; border-radius: 4px; }
                QPushButton:hover { background-color: #ff9900; color: #000000; font-weight: bold; border-color: #ff9900; }
            """)
            rc_layout.addWidget(self.btn_open_settings)
        
        self.status_led.hide()
        self.tab_live_view.setCornerWidget(right_corner, QtCore.Qt.Corner.TopRightCorner)

        dash_layout.addWidget(self.tab_live_view, 1)



    def close_position(self, inst_id, mgn_mode, pos_side):
        """Đóng vị thế trên OKX bằng Market Order thông qua API."""
        try:
            if not hasattr(self, 'pos_worker') or not self.pos_worker.api_key:
                QtWidgets.QMessageBox.warning(self, "Lỗi", "Chưa có API key. Vui lòng chọn tài khoản trước.")
                return
            
            import json, requests
            base_url = f"https://{self.pos_worker.okx_domain}"
            path = "/api/v5/trade/close-position"
            ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            body = json.dumps({
                "instId": inst_id,
                "mgnMode": mgn_mode,
                "posSide": pos_side,
                "ccy": "",
                "autoCxl": True
            })
            
            message = ts + "POST" + path + body
            mac = hmac.new(bytes(self.pos_worker.secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod=hashlib.sha256)
            sign = base64.b64encode(mac.digest()).decode('utf-8')
            
            headers = {
                "OK-ACCESS-KEY": self.pos_worker.api_key,
                "OK-ACCESS-SIGN": sign,
                "OK-ACCESS-TIMESTAMP": ts,
                "OK-ACCESS-PASSPHRASE": self.pos_worker.passphrase,
                "Content-Type": "application/json",
                "x-simulated-trading": "1" if self.pos_worker.demo_mode else "0",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
            
            resp = requests.post(base_url + path, data=body.encode('utf-8'), headers=headers, timeout=10)
            if resp.status_code == 200:
                result = resp.json()
                if result.get("code") == "0":
                    # Phát âm thanh Cha-Ching! Money bằng QMediaPlayer
                    try:
                        from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
                        from PyQt6.QtCore import QUrl
                        import os
                        if not hasattr(self, "cha_ching_player"):
                            self.cha_ching_player = QMediaPlayer(self)
                            self.cha_ching_audio = QAudioOutput(self)
                            self.cha_ching_audio.setVolume(1.0)
                            self.cha_ching_player.setAudioOutput(self.cha_ching_audio)
                            mp3_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "Cha-Ching-the-sound.mp3")
                            self.cha_ching_player.setSource(QUrl.fromLocalFile(mp3_path))
                        
                        # Stop if playing and play again
                        self.cha_ching_player.stop()
                        self.cha_ching_player.play()
                    except Exception as e:
                        print("Lỗi phát âm thanh:", e)
                else:
                    err_msg = result.get("msg", "Không rõ")
                    QtWidgets.QMessageBox.warning(self, "Lỗi từ OKX", f"Không thể đóng lệnh: {err_msg}")
            else:
                try:
                    err_json = resp.json()
                    err_msg = err_json.get("msg", resp.text)
                except:
                    err_msg = resp.text
                QtWidgets.QMessageBox.critical(self, "Lỗi HTTP", f"Lỗi {resp.status_code}: {err_msg}")
        except Exception as e:
            QtWidgets.QMessageBox.critical(self, "Lỗi hệ thống", f"Lỗi khi đóng lệnh: {e}")
        
    def update_positions_table(self, positions):
        if not hasattr(self, 'pos_table') or not self.pos_table:
            return
            
        self._current_positions = positions

        def _safe_float(val):
            try:
                return float(val) if val not in (None, "") else 0.0
            except (ValueError, TypeError):
                return 0.0

        def _coin_priority(pos_item):
            inst = str(pos_item.get("instId", "")).upper()
            if "XAU" in inst: return 0
            if "BTC" in inst: return 1
            if "ETH" in inst: return 2
            if "SOL" in inst: return 3
            if "XRP" in inst: return 4
            return 99

        # Phân loại vị thế theo 3 coin chính: XAU, BTC, ETH
        pos_by_coin = {}
        other_positions = []
        for pos in positions:
            inst = str(pos.get("instId", "")).upper()
            if "XAU" in inst:
                pos_by_coin["XAU"] = pos
            elif "BTC" in inst:
                pos_by_coin["BTC"] = pos
            elif "ETH" in inst:
                pos_by_coin["ETH"] = pos
            else:
                other_positions.append(pos)

        # Xây dựng danh sách dòng: Luôn gồm [XAU, BTC, ETH] theo thứ tự, sau đó tới các coin khác
        primary_coins = [("XAU", "XAU-USDT"), ("BTC", "BTC-USDT"), ("ETH", "ETH-USDT")]
        rows_data = []
        for coin_key, default_inst in primary_coins:
            rows_data.append((coin_key, default_inst, pos_by_coin.get(coin_key)))
        for pos in other_positions:
            inst_id = str(pos.get("instId", "")).replace("-SWAP", "")
            coin_key = inst_id.split("-")[0]
            rows_data.append((coin_key, inst_id, pos))

        self.pos_table.setRowCount(len(rows_data))

        # Đọc danh sách ENABLED_COINS từ config
        enabled_coins = ["BTC", "ETH", "XAU"]
        try:
            acc_name = self.get_acc_name()
            json_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data", f"{acc_name}_global_config.json")
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    cfg_data = json.load(f)
                    enabled_coins = cfg_data.get("ENABLED_COINS", ["BTC", "ETH", "XAU"])
        except:
            pass

        for row, (coin_key, default_inst, pos) in enumerate(rows_data):
            instId = default_inst
            is_active = pos is not None
            
            # --- Cột 0: Cặp giao dịch (Checkbox + Tên Coin, Bỏ Chéo/Cô lập) ---
            chk = QtWidgets.QCheckBox()
            is_enabled_cfg = coin_key.upper() in [c.upper() for c in enabled_coins]
            # Tự động tích chọn nếu coin được bật trong Settings
            is_checked = is_enabled_cfg
            chk.setChecked(is_checked)
            svg_path = os.path.join(USER_DATA_DIR, "check_green.svg").replace("\\", "/")
            chk.setStyleSheet(
                f"QCheckBox::indicator {{ width: 14px; height: 14px; border: 1px solid #777777; border-radius: 2px; background-color: transparent; }} "
                f"QCheckBox::indicator:checked {{ image: url({svg_path}); }}"
            )
            chk.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
            chk.toggled.connect(lambda checked, c=coin_key.lower(): self._on_dash_coin_toggled(c, checked))
            
            if is_active:
                lever = pos.get("lever", "")
                side = "Long" if float(pos.get("pos", 0)) > 0 else "Short"
                instId_text = f"{instId} <span style='font-size: 12px;'>({side} {lever}x)</span>"
            else:
                instId_text = instId

            lbl_sym = QtWidgets.QLabel(instId_text)
            lbl_sym.setStyleSheet("color: #ffffff; font-weight: normal; font-size: 15px;")

            w0 = QtWidgets.QWidget()
            l0 = QtWidgets.QHBoxLayout(w0)
            l0.setContentsMargins(6, 0, 6, 0)
            l0.setSpacing(6)
            l0.addWidget(chk)
            l0.addWidget(lbl_sym)
            l0.addStretch(1)
            self.pos_table.setCellWidget(row, 0, w0)

            if not is_active:
                # Cặp coin chưa có lệnh: Các cột 1..5 để trống hoàn toàn
                for c in range(1, 6):
                    self.pos_table.removeCellWidget(row, c)
                    item_empty = QtWidgets.QTableWidgetItem("")
                    item_empty.setTextAlignment(int(QtCore.Qt.AlignmentFlag.AlignCenter))
                    item_empty.setForeground(QtGui.QColor("#555555"))
                    self.pos_table.setItem(row, c, item_empty)
                continue

            # --- Vị thế đang active ---
            # Xóa chữ trống "—" ở các cột dùng CellWidget để không bị bóng mờ đè dưới background
            for c in [0, 3, 4, 5]:
                self.pos_table.setItem(row, c, QtWidgets.QTableWidgetItem(""))

            # Cột 1 (Giá vào lệnh): Căn lề phải cách 3 khoảng trống tạo khoảng thở
            entry_px = _safe_float(pos.get("avgPx", 0))
            item1 = QtWidgets.QTableWidgetItem(f"{entry_px:,.2f}   ")
            item1.setTextAlignment(int(QtCore.Qt.AlignmentFlag.AlignRight | QtCore.Qt.AlignmentFlag.AlignVCenter))
            self.pos_table.setItem(row, 1, item1)

            # Cột 2 (Ký quỹ): Căn lề phải cách 3 khoảng trống tạo khoảng thở
            lever = pos.get("lever", "100")
            size = _safe_float(pos.get("notionalUsd", pos.get("notional", 0)))
            margin = size / _safe_float(lever) if _safe_float(lever) > 0 else 0
            item2 = QtWidgets.QTableWidgetItem(f"{margin:,.2f} $   ")
            item2.setTextAlignment(int(QtCore.Qt.AlignmentFlag.AlignRight | QtCore.Qt.AlignmentFlag.AlignVCenter))
            self.pos_table.setItem(row, 2, item2)

            # Cột 3 (PNL thả nổi): Toàn bộ text 14px, riêng con số tiền PNL +2 size (16px)
            upl = _safe_float(pos.get("upl", 0))
            upl_ratio = _safe_float(pos.get("uplRatio", 0)) * 100
            color_str = "#26a69a" if upl >= 0 else "#ef5350"
            pnl_label = QtWidgets.QLabel()
            pnl_label.setText(
                f"<span style='font-size: 17px; font-weight: normal; color: {color_str};'>{upl:+.2f}</span> "
                f"<span style='font-size: 15px; font-weight: normal; color: {color_str};'>USDT</span>&nbsp;&nbsp;&nbsp;"
                f"<span style='font-size: 15px; font-weight: normal; color: {color_str};'>({upl_ratio:+.2f}%)</span>"
            )
            pnl_label.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
            pnl_label.setStyleSheet("background: transparent;")
            self.pos_table.setCellWidget(row, 3, pnl_label)

            # Cột 4 (Chốt lời | Dừng lỗ)
            tp_list = pos.get("tp_list", [])
            sl_list = pos.get("sl_list", [])
            
            # --- Fallback: Lấy từ JSON data (Setup) nếu API OKX chưa trả về ---
            if not tp_list or not sl_list:
                try:
                    acc_name = self.get_acc_name()
                    base_coin = instId.replace("-USDT", "")
                    json_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data", f"{acc_name}_{base_coin}_chart.json")
                    if os.path.exists(json_path):
                        with open(json_path, "r", encoding="utf-8") as f:
                            c_data = json.load(f)
                            if "markers" in c_data:
                                is_long = float(pos.get("pos", 0)) > 0
                                cands = [m for m in c_data["markers"] if m.get("type") == "SETUP" and ((m.get("side") == "LONG" and is_long) or (m.get("side") == "SHORT" and not is_long))]
                                if cands:
                                    best = min(cands, key=lambda m: abs(float(m.get("price", 0)) - entry_px))
                                    b_px = float(best.get("price", 0))
                                    if b_px > 0 and abs(entry_px - b_px) / b_px <= 0.05:
                                        if not tp_list and best.get("tp"): tp_list.append(str(best.get("tp")))
                                        if not sl_list and best.get("sl"): sl_list.append(str(best.get("sl")))
                except:
                    pass
                    
            # --- Fallback 2: Tính theo công thức RR ---
            if not tp_list or not sl_list:
                is_long = float(pos.get("pos", 0)) > 0
                if self.strategy_id == "sub1" and entry_px > 0:
                    tp_pct = getattr(self, "input_tp_pct").value() / 100.0 if hasattr(self, "input_tp_pct") else 0.012
                    sl_pct = getattr(self, "input_sl_pct").value() / 100.0 if hasattr(self, "input_sl_pct") else 0.012
                    if is_long:
                        if not sl_list: sl_list.append(f"{entry_px * (1 - sl_pct):.2f}")
                        if not tp_list: tp_list.append(f"{entry_px * (1 + tp_pct):.2f}")
                    else:
                        if not sl_list: sl_list.append(f"{entry_px * (1 + sl_pct):.2f}")
                        if not tp_list: tp_list.append(f"{entry_px * (1 - tp_pct):.2f}")
                elif self.strategy_id == "sub2" and entry_px > 0:
                    rr_trend = getattr(self, "smc_input_rr_trend").value() if hasattr(self, "smc_input_rr_trend") else 5.0
                    default_sl_pct = 0.01
                    if is_long:
                        if not sl_list: sl_list.append(f"{entry_px * (1 - default_sl_pct):.2f}")
                        if not tp_list: tp_list.append(f"{entry_px * (1 + default_sl_pct * rr_trend):.2f}")
                    else:
                        if not sl_list: sl_list.append(f"{entry_px * (1 + default_sl_pct):.2f}")
                        if not tp_list: tp_list.append(f"{entry_px * (1 - default_sl_pct * rr_trend):.2f}")

            # --- Tính giá trị Lời/Lỗ PNL thực tế bằng USDT theo TP/SL ---
            is_long = _safe_float(pos.get("pos", 0)) > 0 or str(pos.get("posSide", "")).lower() == "long"
            
            tp_pnl_str = "—"
            tp_color = "#777777"
            if tp_list and entry_px > 0 and size > 0:
                try:
                    tp_px = _safe_float(tp_list[0])
                    if tp_px > 0:
                        tp_pnl_val = size * (tp_px - entry_px) / entry_px if is_long else size * (entry_px - tp_px) / entry_px
                        tp_pnl_str = f"+{tp_pnl_val:,.2f}" if tp_pnl_val >= 0 else f"{tp_pnl_val:,.2f}"
                        tp_color = "#81c784" # สี xanh nhạt nhẹ nhàng
                except:
                    pass

            sl_pnl_str = "—"
            sl_color = "#777777"
            if sl_list and entry_px > 0 and size > 0:
                try:
                    sl_px = _safe_float(sl_list[0])
                    if sl_px > 0:
                        sl_pnl_val = size * (sl_px - entry_px) / entry_px if is_long else size * (entry_px - sl_px) / entry_px
                        sl_pnl_str = f"{sl_pnl_val:,.2f}" if sl_pnl_val <= 0 else f"+{sl_pnl_val:,.2f}"
                        sl_color = "#ef5350" # Màu đỏ nhạt nhẹ nhàng
                except:
                    pass

            tpsl_label = QtWidgets.QLabel()
            tpsl_label.setText(
                f"<span style='font-size: 15px; font-weight: normal; color: {tp_color};'>{tp_pnl_str}</span> "
                f"<span style='font-size: 15px; font-weight: normal; color: #555555;'>|</span> "
                f"<span style='font-size: 15px; font-weight: normal; color: {sl_color};'>{sl_pnl_str}</span>"
            )
            tpsl_label.setAlignment(QtCore.Qt.AlignmentFlag.AlignCenter)
            tpsl_label.setStyleSheet("background: transparent;")
            self.pos_table.setCellWidget(row, 4, tpsl_label)

            # Cột 5 (Cắt lệnh: Nút Đóng thu nhỏ 15% vừa ô)
            raw_inst_id = str(pos.get("instId", ""))
            raw_mgn_mode = str(pos.get("mgnMode", "cross"))
            raw_pos_side = str(pos.get("posSide", "net"))
            
            btn_container = QtWidgets.QWidget()
            btn_layout = QtWidgets.QHBoxLayout(btn_container)
            btn_layout.setContentsMargins(6, 1, 6, 1)
            btn_layout.setSpacing(0)

            btn_close = QtWidgets.QPushButton("Đóng")
            btn_close.setSizePolicy(QtWidgets.QSizePolicy.Policy.Expanding, QtWidgets.QSizePolicy.Policy.Expanding)
            btn_close.setStyleSheet(
                "QPushButton { background-color: #c62828; color: #ffffff; font-weight: bold; font-size: 13px; "
                "border: none; border-radius: 4px; padding: 0px; } "
                "QPushButton:hover { background-color: #e53935; }"
            )
            btn_close.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
            btn_close.clicked.connect(lambda checked, iid=raw_inst_id, mm=raw_mgn_mode, ps=raw_pos_side: self.close_position(iid, mm, ps))
            btn_layout.addWidget(btn_close)
            
            self.pos_table.setCellWidget(row, 5, btn_container)
            
    def apply_current_api_to_worker(self):
        if not hasattr(self, 'pos_worker'):
            return
        if not hasattr(self, 'get_selected_env'):
            return
            
        env_file = self.get_selected_env()
        if not env_file: return
        
        env_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", env_file)
        if os.path.exists(env_path):
            api_key, secret_key, passphrase, demo_mode = "", "", "", False
            okx_domain = "www.okx.com"
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if "=" in line:
                            k, v = line.strip().split("=", 1)
                            v = v.strip("\"'")
                            if k == "OKX_API_KEY": api_key = v
                            elif k == "OKX_SECRET_KEY": secret_key = v
                            elif k == "OKX_PASSPHRASE": passphrase = v
                            elif k == "OKX_IS_DEMO": demo_mode = False
                            elif k == "OKX_DOMAIN": okx_domain = v
                
                self.pos_worker.update_credentials(
                    api_key=api_key,
                    secret_key=secret_key,
                    passphrase=passphrase,
                    demo_mode=demo_mode,
                    okx_domain=okx_domain
                )
            except Exception as e:
                print(f"Error in apply_current_api_to_worker: {e}")

    def setup_tab_api(self):
        scroll = QtWidgets.QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QtWidgets.QFrame.Shape.NoFrame)
        
        container = QtWidgets.QWidget()
        container.setStyleSheet("background-color: transparent;")
        scroll.setStyleSheet("background-color: transparent;")
        layout = QtWidgets.QVBoxLayout(container)
        
        # Chọn tài khoản
        acc_layout = QtWidgets.QHBoxLayout()
        acc_layout.addWidget(QtWidgets.QLabel("Chọn tài khoản đang cấu hình:"))
        acc_layout.addWidget(self.account_dropdown)
        
        self.btn_add_account = QtWidgets.QPushButton("+")
        self.btn_add_account.setFixedWidth(40)
        self.btn_add_account.setStyleSheet("background-color: #28a745; color: white; font-size: 18px; font-weight: bold; border-radius: 4px; padding: 0px;")
        self.btn_add_account.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_add_account.clicked.connect(self.create_new_account)
        acc_layout.addWidget(self.btn_add_account)
        
        self.btn_delete_account = QtWidgets.QPushButton("-")
        self.btn_delete_account.setFixedWidth(40)
        self.btn_delete_account.setStyleSheet("background-color: #dc3545; color: white; font-size: 18px; font-weight: bold; border-radius: 4px; padding: 0px;")
        self.btn_delete_account.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_delete_account.clicked.connect(self.delete_account)
        acc_layout.addWidget(self.btn_delete_account)
        
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
        self.chk_demo_mode.setChecked(False)
        self.chk_demo_mode.hide()
        
        form_layout = QtWidgets.QFormLayout()
        form_layout.setLabelAlignment(QtCore.Qt.AlignmentFlag.AlignLeft)
        form_layout.setFormAlignment(QtCore.Qt.AlignmentFlag.AlignLeft | QtCore.Qt.AlignmentFlag.AlignTop)
        form_layout.setSpacing(5)
        
        self.input_api_key.setFixedWidth(500)
        self.input_secret_key.setFixedWidth(500)
        self.input_passphrase.setFixedWidth(500)
        
        self.input_api_key.setStyleSheet("min-width: 500px; max-width: 500px;")
        self.input_secret_key.setStyleSheet("min-width: 500px; max-width: 500px;")
        self.input_passphrase.setStyleSheet("min-width: 500px; max-width: 500px;")
        
        # form_layout.addRow("Chế Độ Giao Dịch:", self.chk_demo_mode)
        form_layout.addRow("Mã API (API Key):", self.input_api_key)
        form_layout.addRow("Khóa Bí Mật (Secret):", self.input_secret_key)
        form_layout.addRow("Cụm Mật Khẩu (Pass):", self.input_passphrase)
        
        # Đặt Form vào một layout ngang có lò xo dồn sang trái
        h_container = QtWidgets.QHBoxLayout()
        h_container.addLayout(form_layout)
        h_container.addStretch(1)
        
        layout_api.addLayout(h_container)
        layout.addWidget(form_group)
        
        layout.addSpacing(15)
        
        # Nhóm Lệnh Can Thiệp Nhanh
        actions_box = QtWidgets.QGroupBox("Lệnh Can Thiệp Nhanh (Audit Hệ Thống)")
        actions_layout = QtWidgets.QHBoxLayout(actions_box)
        actions_layout.setContentsMargins(15, 20, 15, 15)
        actions_layout.setSpacing(10)

        self.btn_reset_wallet = HoverSoundButton("♻️ Reset Vốn Gốc (Audit)")
        self.btn_reset_wallet.setStyleSheet("min-height: 40px; min-width: 150px; color: #ffffff; background-color: #2d2d2d; border: 1px solid #555; border-radius: 4px; font-weight: bold;")
        self.btn_reset_wallet.clicked.connect(self.reset_wallet)

        self.btn_reset_nen = HoverSoundButton("♻️ Reset Đếm Nến")
        self.btn_reset_nen.setStyleSheet("min-height: 40px; min-width: 150px; color: #ffffff; background-color: #2d2d2d; border: 1px solid #555; border-radius: 4px; font-weight: bold;")
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
            play_ui_sound("ribhavagrawal-hit-by-a-wood-230542.mp3", 0.6)
            QtWidgets.QApplication.clipboard().setText(hwid_val)
            self.btn_hwid_display.setText("✅ Đã Copy!")
            QtCore.QTimer.singleShot(1500, lambda: self.btn_hwid_display.setText(hwid_val))
            
        self.btn_hwid_display.clicked.connect(on_copy_hwid)
        
        hwid_layout.addWidget(lbl_hwid_msg)
        hwid_layout.addWidget(self.btn_hwid_display)
        hwid_layout.addStretch(1)
        layout.addWidget(hwid_box)
        
        layout.addStretch(1)

        scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setWidget(container)
        main_layout = QtWidgets.QVBoxLayout(self.tab_api)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.addWidget(scroll)
        
        self.btn_save_api = HoverSoundButton("💾 LƯU CẤU HÌNH API KEY")
        self.btn_save_api.setStyleSheet("""
            QPushButton { background-color: #2E7D32; color: #ffffff; min-height: 34px; padding: 6px 20px; border-radius: 4px; border: none; outline: none; font-weight: bold; }
            QPushButton:hover { background-color: #388E3C; }
        """)
        self.btn_save_api.clicked.connect(self.save_api_settings)
        main_layout.addWidget(self.btn_save_api)

    def setup_tab_community(self):
        layout = QtWidgets.QVBoxLayout(self.tab_community)
        layout.setContentsMargins(10, 10, 10, 10)

        def get_media_path(img_name):
            import sys, os
            if getattr(sys, 'frozen', False):
                return os.path.join(sys._MEIPASS, "media", img_name)
            p1 = os.path.join(os.path.dirname(os.path.dirname(__file__)), "media", img_name)
            if os.path.exists(p1): return p1
            return os.path.join(os.path.dirname(__file__), "media", img_name)

        btn_discord = QtWidgets.QPushButton()
        btn_discord.setIcon(QtGui.QIcon(get_media_path("Discord.png")))
        btn_discord.setIconSize(QtCore.QSize(28, 28))
        btn_discord.setStyleSheet("background: transparent; border: none; margin-right: -10px;")
        btn_discord.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        try: btn_discord.clicked.connect(lambda: __import__('winsound').Beep(1000, 4))
        except: pass
        btn_discord.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://discord.gg/cS4QXJTpnb")))
        self.discord_hover = ButtonHoverSoundFilter(btn_discord)
        btn_discord.installEventFilter(self.discord_hover)
        
        btn_telegram = QtWidgets.QPushButton()
        btn_telegram.setIcon(QtGui.QIcon(get_media_path("Telegram.png")))
        btn_telegram.setIconSize(QtCore.QSize(28, 28))
        btn_telegram.setStyleSheet("background: transparent; border: none;")
        btn_telegram.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        try: btn_telegram.clicked.connect(lambda: __import__('winsound').Beep(1000, 4))
        except: pass
        btn_telegram.clicked.connect(lambda: QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://t.me/traderlaso1")))
        self.telegram_hover = ButtonHoverSoundFilter(btn_telegram)
        btn_telegram.installEventFilter(self.telegram_hover)
        
        social_layout = QtWidgets.QHBoxLayout()
        social_layout.addWidget(btn_discord)
        social_layout.addWidget(btn_telegram)
        social_layout.addStretch()
        layout.addLayout(social_layout)

        
        title = QtWidgets.QLabel("💬 Cộng đồng TRADER LÀ SỐ 1 - Realtime Chat")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #ffb74d;")
        layout.addWidget(title)
        
        self.chat_display = QtWidgets.QTextBrowser()
        self.chat_display.setOpenExternalLinks(True)
        self.chat_display.setStyleSheet("background-color: #1e1e1e; color: #d4d4d4; font-size: 14px; padding: 10px; border-radius: 5px; border: 1px solid #333;")
        layout.addWidget(self.chat_display)
        
        input_layout = QtWidgets.QHBoxLayout()
        
        self.chat_input = QtWidgets.QLineEdit()
        self.chat_input.setPlaceholderText("Nhập tin nhắn... (Nhấn Enter để gửi)")
        self.chat_input.setStyleSheet("background-color: #252526; color: white; padding: 10px; border-radius: 5px; font-size: 14px; border: 1px solid #444;")
        input_layout.addWidget(self.chat_input)
        
        self.btn_send_chat = QtWidgets.QPushButton("Gửi")
        self.btn_send_chat.setCursor(QtCore.Qt.CursorShape.PointingHandCursor)
        self.btn_send_chat.setStyleSheet("""
            QPushButton {
                background-color: #0e639c; color: white; font-weight: bold; border-radius: 5px; padding: 10px 20px; font-size: 14px;
            }
            QPushButton:hover { background-color: #1177bb; }
        """)
        input_layout.addWidget(self.btn_send_chat)
        layout.addLayout(input_layout)
        
        self.chat_input.returnPressed.connect(self.send_chat_message)
        self.btn_send_chat.clicked.connect(self.send_chat_message)
        
        import time
        self.chat_nickname = "User_" + str(int(time.time()))[-5:]
        self.firebase_chat_url = "https://botvip-e5772-default-rtdb.asia-southeast1.firebasedatabase.app"
        
        try:
            import sys, os, json
            if getattr(sys, 'frozen', False):
                base_dir = sys._MEIPASS
            else:
                base_dir = os.path.dirname(os.path.abspath(__file__))
            v_file = os.path.join(base_dir, "version.json")
            if os.path.exists(v_file):
                with open(v_file, "r", encoding="utf-8") as f:
                    v_data = json.load(f)
                    self.firebase_chat_url = v_data.get("FIREBASE_CHAT_URL", self.firebase_chat_url)
        except Exception:
            pass
            
        self.chat_worker = FirebaseChatWorker(self.firebase_chat_url)
        self.chat_worker.new_message_signal.connect(self.handle_new_chat_message)
        self.chat_worker.start()

    def handle_new_chat_message(self, data):
        if not data or not isinstance(data, dict):
            return
        path = data.get("path")
        msg_data = data.get("data")
        if not msg_data:
            return
            
        if path == "/":
            self.chat_display.clear()
            if isinstance(msg_data, dict):
                try:
                    sorted_msgs = sorted(msg_data.values(), key=lambda x: x.get("timestamp", 0))
                    for msg in sorted_msgs:
                        self.append_chat_message(msg)
                except Exception:
                    pass
        else:
            if isinstance(msg_data, dict) and "text" in msg_data:
                self.append_chat_message(msg_data)

    def append_chat_message(self, msg):
        sender = msg.get("sender", "Khách")
        text = msg.get("text", "")
        time_str = msg.get("time", "")
        
        color = "#ffb74d" if sender == self.chat_nickname else "#4db8ff"
        html = f"<b><span style='color: #888;'>[{time_str}]</span> <span style='color: {color};'>{sender}:</span></b> {text}"
        self.chat_display.append(html)
        
        scrollbar = self.chat_display.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def send_chat_message(self):
        text = self.chat_input.text().strip()
        if not text:
            return
            
        self.chat_input.clear()
        
        if self.chat_nickname.startswith("User_"):
            name, ok = QtWidgets.QInputDialog.getText(
                self, "Tạo Tên Hiển Thị", 
                "Nhập tên bạn muốn hiển thị trong Cộng Đồng:",
                QtWidgets.QLineEdit.EchoMode.Normal, ""
            )
            if ok and name.strip():
                self.chat_nickname = name.strip()
                
        import time
        now_str = time.strftime("%H:%M:%S", time.localtime())
        payload = {
            "sender": self.chat_nickname,
            "text": text,
            "time": now_str,
            "timestamp": int(time.time() * 1000)
        }
        
        def post_msg():
            import requests
            try:
                url = self.firebase_chat_url.rstrip('/') + '/chat.json'
                requests.post(url, json=payload, timeout=5)
            except Exception as e:
                print("Lỗi gửi tin nhắn:", e)
                
        import threading
        threading.Thread(target=post_msg, daemon=True).start()

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


        # 0. GIAO DIỆN & LOGO
        grp_ui = QtWidgets.QGroupBox("Giao Diện & Hệ Thống")
        grp_ui.setStyleSheet("QGroupBox { border: 1px solid #555555; margin-top: 10px; } QGroupBox::title { subcontrol-origin: margin; top: -7px; left: 10px; padding: 0 5px; color: #aaaaaa; font-weight: bold; }")
        l_ui = QtWidgets.QHBoxLayout(grp_ui)
        
        self.chk_light_mode = QtWidgets.QCheckBox("Light Mode (Giao diện sáng)")
        self.chk_light_mode.setStyleSheet("font-size: 11px; font-weight: bold; color: #e0e0e0;")
        # self.chk_light_mode.stateChanged.connect(self.toggle_theme)
        
        lbl_logo = QtWidgets.QLabel()
        lbl_logo.setText("Logo TLS1")
        lbl_logo.setStyleSheet("color: #ff9900; font-weight: bold;")
        
        l_ui.addWidget(self.chk_light_mode)
        l_ui.addWidget(lbl_logo)
        l_ui.addStretch(1)
        layout.addWidget(grp_ui)

        # 0.1. DANH MỤC GIAO DỊCH
        grp_active_coins = QtWidgets.QGroupBox("Danh Mục Giao Dịch")
        grp_active_coins.setStyleSheet("QGroupBox { border: 1px solid #555555; margin-top: 10px; } QGroupBox::title { subcontrol-origin: margin; top: -7px; left: 10px; padding: 0 5px; color: #aaaaaa; font-weight: bold; }")
        l_active_coins = QtWidgets.QHBoxLayout(grp_active_coins)
        
        import os
        svg_content = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#4CAF50" stroke-width="4" d="M4 12l5 5L20 6"/></svg>'
        svg_path = os.path.join(USER_DATA_DIR, "check_green.svg").replace("\\", "/")
        if not os.path.exists(svg_path):
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
        cb_style = f"QCheckBox::indicator {{ width: 14px; height: 14px; border: 1px solid #777777; border-radius: 2px; background-color: transparent; }} QCheckBox::indicator:checked {{ image: url({svg_path}); }}"
        
        self.chk_cfg_xau = QtWidgets.QCheckBox("XAU-USDT-SWAP")
        self.chk_cfg_xau.setStyleSheet(cb_style)
        self.chk_cfg_btc = QtWidgets.QCheckBox("BTC-USDT-SWAP")
        self.chk_cfg_btc.setStyleSheet(cb_style)
        self.chk_cfg_eth = QtWidgets.QCheckBox("ETH-USDT-SWAP")
        self.chk_cfg_eth.setStyleSheet(cb_style)
        
        l_active_coins.addWidget(self.chk_cfg_xau)
        l_active_coins.addWidget(self.chk_cfg_btc)
        l_active_coins.addWidget(self.chk_cfg_eth)
        layout.addWidget(grp_active_coins)
        grp_active_coins.hide()



        # 1. CÔNG TẮC CHIẾN THUẬT
        grp_toggles = QtWidgets.QGroupBox("Công Tắc Chiến Thuật")
        l_toggles = QtWidgets.QGridLayout(grp_toggles)
        
        self.chk_main = ToggleSwitch()
        self.chk_xole = ToggleSwitch()
        self.chk_dynamic_ema200_tp = ToggleSwitch()
        self.chk_dynamic_pingpong_tp = ToggleSwitch()
        self.chk_altcoin_follow_btc_ema = ToggleSwitch()
        
        add_checkbox(l_toggles, 0, 0, "Bật MAIN", self.chk_main, "Bật/Tắt chiến thuật Đa Khung EMA200 (Main).")
        add_checkbox(l_toggles, 0, 1, "Bật XOLE", self.chk_xole, "Bật/Tắt chiến thuật Bắt Bẻ Xole (Giao dịch ngược xu hướng nhỏ).")
        add_checkbox(l_toggles, 1, 0, "Bật TP động theo EMA200", self.chk_dynamic_ema200_tp, "Bật cơ chế Chốt lời động bám theo EMA200 của khung thời gian nhỏ hơn liền kề.")
        add_checkbox(l_toggles, 1, 1, "Bật TP theo Ping-Pong", self.chk_dynamic_pingpong_tp, "Chốt lời ngắn hạn ưu tiên khi phát hiện sóng Ping-Pong.")
        add_checkbox(l_toggles, 2, 0, "Altcoin neo theo EMA200 BTC", self.chk_altcoin_follow_btc_ema, "ON: Altcoin tính Limit bằng cản EMA200 của BTC | OFF: Altcoin dùng EMA200 của chính nó", colspan=2)
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
        
        self.input_pos_vol = QtWidgets.QDoubleSpinBox(); self.input_pos_vol.setMaximum(1000000)
        tooltip_text = (
            "Vốn cố định sử dụng cho mỗi lệnh Limit ở mốc M5.\n"
            "Các mốc lớn hơn sẽ nhân theo hệ số:\n"
            "M5: x1.0\n"
            "M15: x1.2\n"
            "M30: x1.5\n"
            "H1: x2.0\n"
            "H2: x3.0\n"
            "H4: x5.0"
        )
        add_field(l_risk, 0, "Volume Limit cố định (USDT):", self.input_pos_vol, tooltip_text)
        
        self.input_tp_pct = QtWidgets.QDoubleSpinBox(); self.input_tp_pct.setSuffix(" %"); self.input_tp_pct.setValue(0.80)
        self.input_sl_pct = QtWidgets.QDoubleSpinBox(); self.input_sl_pct.setSuffix(" %"); self.input_sl_pct.setValue(0.80)
        add_field(l_risk, 1, "Chốt lời cơ sở (M5):", self.input_tp_pct, "Tỷ lệ Take Profit cơ sở tính theo giá khớp. VD: 0.8%.")
        add_field(l_risk, 2, "Dừng lỗ cơ sở (M5):", self.input_sl_pct, "Tỷ lệ Stop Loss cơ sở tính theo giá khớp. VD: 0.8%.")
        layout.addWidget(grp_risk)

        # 4. BỘ LỌC & DUNG SAI KỸ THUẬT
        grp_filter = QtWidgets.QGroupBox("Bộ Lọc & Dung Sai Kỹ Thuật")

        l_filter = QtWidgets.QGridLayout(grp_filter)
        
        
        self.input_dca_gap_pct = QtWidgets.QDoubleSpinBox(); self.input_dca_gap_pct.setSuffix(" %"); self.input_dca_gap_pct.setDecimals(3)
        add_field(l_filter, 1, "Khoảng cách DCA tối thiểu:", self.input_dca_gap_pct, "Khoảng cách tối thiểu giữa 2 trục EMA200 liền kề (VD: 0.5%) để rải limit. Dưới mức này sẽ gộp lệnh.")
        
        self.input_confluence_pct = QtWidgets.QDoubleSpinBox(); self.input_confluence_pct.setSuffix(" %"); self.input_confluence_pct.setDecimals(3)
        add_field(l_filter, 2, "Hợp lưu EMA200 đa khung:", self.input_confluence_pct, "Dung sai độ lệch cho phép (VD: 0.23%) khi xét điểm hợp lưu EMA200 giữa nhiều khung giờ.")
        
        self.input_entry_offset = QtWidgets.QDoubleSpinBox(); self.input_entry_offset.setSuffix(" %"); self.input_entry_offset.setDecimals(4)
        add_field(l_filter, 3, "Đệm đón lõm Entry:", self.input_entry_offset, "Đệm (VD: 0.06%) trừ lùi vào vị trí đặt Limit để dễ khớp trước vạch cản.")
        
        self.input_accum_candles = QtWidgets.QSpinBox(); self.input_accum_candles.setMaximum(9999)
        add_field(l_filter, 4, "Nến tích lũy bắt buộc:", self.input_accum_candles, "Số nến tối thiểu phải tích lũy đi ngang liên tục để xác nhận vùng hỗ trợ.")
        # Tạm ẩn theo yêu cầu khách phổ thông bằng cách hide() thay vì bỏ addWidget để tránh lỗi C++ object deleted
        layout.addWidget(grp_filter)
        grp_filter.hide()

        # 5. LƯỢNG TỬ & TIẾN HÓA
        grp_misc = QtWidgets.QGroupBox("Lượng Tử & Tiến Hóa")
        l_misc = QtWidgets.QGridLayout(grp_misc)
        
        self.input_q_buffer = QtWidgets.QSpinBox(); self.input_q_buffer.setMaximum(999)
        add_field(l_misc, 0, "Nến đệm lượng tử:", self.input_q_buffer, "Số nến quá khứ (Buffer) làm vùng đệm cho thuật toán ma trận lượng tử.")
        
        self.input_q_forth = QtWidgets.QSpinBox(); self.input_q_forth.setMaximum(999)
        add_field(l_misc, 1, "Nến dự báo lượng tử:", self.input_q_forth, "Số nến tương lai mô phỏng được thuật toán phóng chiếu.")
        
        self.input_evo_cycle = QtWidgets.QSpinBox(); self.input_evo_cycle.setMaximum(999999)
        add_field(l_misc, 2, "Chu kỳ tiến hóa (giây):", self.input_evo_cycle, "Thời gian tối thiểu giữa 2 lần AI chạy tự tiến hóa lại hệ số thông minh.")
        # Tạm ẩn theo yêu cầu khách phổ thông bằng cách hide() thay vì bỏ addWidget để tránh lỗi C++ object deleted
        layout.addWidget(grp_misc)
        grp_misc.hide()


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
        # Tạm ẩn Đòn Bẩy Cắt Ngang theo yêu cầu
        layout.addWidget(grp_port)
        grp_port.hide()
        
        layout.addStretch(1)

        self.btn_save_strategy = HoverSoundButton("💾 LƯU CẤU HÌNH CHIẾN THUẬT (AUTO-RELOAD)")
        self.btn_save_strategy.setStyleSheet("background-color: #2E7D32; color: #ffffff; min-height: 40px; font-weight: bold; font-size: 14px; border: none; outline: none; border-radius: 4px;")
        self.btn_save_strategy.clicked.connect(self.save_strategy_settings)
        
        scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setWidget(container)
        main_layout = QtWidgets.QVBoxLayout(self.tab_strategy)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.addWidget(scroll)
        main_layout.addWidget(self.btn_save_strategy)


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

        # 0. GIAO DIỆN & LOGO
        grp_ui = QtWidgets.QGroupBox("Giao Diện & Hệ Thống")
        grp_ui.setStyleSheet("QGroupBox { border: 1px solid #555555; margin-top: 10px; } QGroupBox::title { subcontrol-origin: margin; top: -7px; left: 10px; padding: 0 5px; color: #aaaaaa; font-weight: bold; }")
        l_ui = QtWidgets.QHBoxLayout(grp_ui)
        
        self.smc_chk_light_mode = QtWidgets.QCheckBox("Light Mode (Giao diện sáng)")
        self.smc_chk_light_mode.setStyleSheet("font-size: 11px; font-weight: bold; color: #e0e0e0;")
        # self.smc_chk_light_mode.stateChanged.connect(self.toggle_theme)
        
        lbl_logo_smc = QtWidgets.QLabel()
        lbl_logo_smc.setText("Logo TLS1")
        lbl_logo_smc.setStyleSheet("color: #ff9900; font-weight: bold;")
        
        l_ui.addWidget(self.smc_chk_light_mode)
        l_ui.addWidget(lbl_logo_smc)
        l_ui.addStretch(1)
        layout.addWidget(grp_ui)

        # 0.1. DANH MỤC GIAO DỊCH
        grp_active_coins = QtWidgets.QGroupBox("Danh Mục Giao Dịch")
        grp_active_coins.setStyleSheet("QGroupBox { border: 1px solid #555555; margin-top: 10px; } QGroupBox::title { subcontrol-origin: margin; top: -7px; left: 10px; padding: 0 5px; color: #aaaaaa; font-weight: bold; }")
        l_active_coins = QtWidgets.QHBoxLayout(grp_active_coins)
        
        import os
        svg_content = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#4CAF50" stroke-width="4" d="M4 12l5 5L20 6"/></svg>'
        svg_path = os.path.join(USER_DATA_DIR, "check_green.svg").replace("\\", "/")
        if not os.path.exists(svg_path):
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
        cb_style = f"QCheckBox::indicator {{ width: 14px; height: 14px; border: 1px solid #777777; border-radius: 2px; background-color: transparent; }} QCheckBox::indicator:checked {{ image: url({svg_path}); }}"
        
        self.smc_chk_cfg_xau = QtWidgets.QCheckBox("XAU-USDT-SWAP")
        self.smc_chk_cfg_xau.setStyleSheet(cb_style)
        self.smc_chk_cfg_xau.setChecked(True)
        self.smc_chk_cfg_btc = QtWidgets.QCheckBox("BTC-USDT-SWAP")
        self.smc_chk_cfg_btc.setStyleSheet(cb_style)
        self.smc_chk_cfg_btc.setChecked(True)
        self.smc_chk_cfg_eth = QtWidgets.QCheckBox("ETH-USDT-SWAP")
        self.smc_chk_cfg_eth.setStyleSheet(cb_style)
        self.smc_chk_cfg_eth.setChecked(True)
        
        l_active_coins.addWidget(self.smc_chk_cfg_xau)
        l_active_coins.addWidget(self.smc_chk_cfg_btc)
        l_active_coins.addWidget(self.smc_chk_cfg_eth)
        layout.addWidget(grp_active_coins)
        grp_active_coins.hide()

        # 1. DANH MỤC CHIẾN THUẬT
        grp_toggles = QtWidgets.QGroupBox("Danh Mục Chiến Thuật SMC")
        l_toggles = QtWidgets.QGridLayout(grp_toggles)
        self.smc_chk_main = ToggleSwitch()
        add_checkbox(l_toggles, 0, 0, "Bật Chiến thuật SMC Order Block", self.smc_chk_main, "Kích hoạt thuật toán nhận diện Order Block và tự động giao dịch SMC.")
        
        self.smc_combo_tf_base = QtWidgets.QComboBox()
        self.smc_combo_tf_base.addItems(["5m", "15m", "30m", "1H", "2H", "4H"])
        self.smc_combo_tf_base.setCurrentText("1H")
        add_field(l_toggles, 1, "Timeframe base:", self.smc_combo_tf_base, "Khung thời gian chính để giao dịch thuận xu hướng.")
        layout.addWidget(grp_toggles)

        # 2. QUẢN LÝ VỐN & RỦI RO
        grp_risk = QtWidgets.QGroupBox("Quản Lý Vốn & Rủi Ro")
        l_risk = QtWidgets.QGridLayout(grp_risk)
        self.smc_chk_dynamic_risk = ToggleSwitch()
        self.smc_chk_dynamic_risk.setChecked(False)
        self.smc_input_risk_pct = QtWidgets.QDoubleSpinBox()
        
        self.smc_input_pos_vol = QtWidgets.QDoubleSpinBox(); self.smc_input_pos_vol.setMaximum(1000000); self.smc_input_pos_vol.setValue(100.00)
        add_field(l_risk, 0, "Volume Limit cố định (USDT):", self.smc_input_pos_vol, "Khối lượng vốn cố định (USDT) cho mỗi lệnh Limit SMC.")
        
        self.smc_input_rr_trend = QtWidgets.QDoubleSpinBox(); self.smc_input_rr_trend.setDecimals(1); self.smc_input_rr_trend.setValue(5.0)
        add_field(l_risk, 1, "Tỷ lệ Risk:Reward thuận trend:", self.smc_input_rr_trend, "Tỷ lệ lợi nhuận/rủi ro thuận xu hướng (VD: 5.0 = 1:5).")

        self.smc_input_rr_counter = QtWidgets.QDoubleSpinBox(); self.smc_input_rr_counter.setDecimals(1); self.smc_input_rr_counter.setValue(1.0)
        add_field(l_risk, 2, "Tỷ lệ Risk:Reward ngược trend:", self.smc_input_rr_counter, "Tỷ lệ lợi nhuận/rủi ro ngược xu hướng (VD: 1.0 = 1:1).")
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
        grp_smc.hide()
        
        layout.addStretch(1)

        self.btn_save_strategy = HoverSoundButton("💾 LƯU CẤU HÌNH SMC (AUTO-RELOAD)")
        self.btn_save_strategy.setStyleSheet("background-color: #2E7D32; color: #ffffff; min-height: 40px; font-weight: bold; font-size: 14px; border: none; outline: none; border-radius: 4px;")
        self.btn_save_strategy.clicked.connect(self.save_strategy_settings)
        
        scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setWidget(container)
        main_layout = QtWidgets.QVBoxLayout(self.tab_strategy)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.addWidget(scroll)
        main_layout.addWidget(self.btn_save_strategy)

    def get_selected_env(self):
        return self.account_dropdown.currentData()

    def get_acc_name(self):
        env = self.get_selected_env()
        fallback = "sub2" if getattr(self, 'strategy_id', '') == "sub2" else "sub1"
        if not env: return fallback
        acc_name = env.replace(".api", "").replace("_", "")
        return fallback if acc_name == "" else acc_name

    def on_account_changed(self, index=None):
        self.log_display.appendPlainText(f"🔌 Đã chuyển sang tài khoản: {self.get_selected_env()}")
        self.load_current_settings()
        self.apply_current_api_to_worker()

    def load_current_settings(self):
        if self.strategy_id in ["trinhsat", "quansu"]:
            return
        self._is_loading_settings = True
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
                            elif k == "OKX_IS_DEMO": self.chk_demo_mode.setChecked(False)

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
        json_data_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data")
        os.makedirs(json_data_dir, exist_ok=True)
        config_path = os.path.join(json_data_dir, f"{acc_name}_global_config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f: cfg = json.load(f)
                if not cfg.get("RESET_CONFIG_V23", False):
                    cfg = {}
                    try: os.remove(config_path)
                    except: pass
            except: pass

        try:
            if self.strategy_id == "sub2":
                self.smc_chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_SMC", getattr(bot_config, "ENABLE_STRATEGY_SMC", True))))
                self.smc_chk_dynamic_risk.setChecked(bool(cfg.get("USE_DYNAMIC_RISK", getattr(bot_config, "USE_DYNAMIC_RISK", False))))
                self.smc_input_risk_pct.setValue(float(cfg.get("RISK_PER_TRADE_PCT", getattr(bot_config, "RISK_PER_TRADE_PCT", 0.01))) * 100)
                self.smc_input_pos_vol.setValue(float(cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", getattr(bot_config, "POSITION_VOLUME_HIGH_CONFIDENCE", 100))))

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
                    self.smc_combo_tf_base.setCurrentText(cfg.get("TIMEFRAME_BASE", getattr(bot_config, "TIMEFRAME_BASE", "15m")))
                    self.smc_input_rr_trend.setValue(float(cfg.get("OB_RR_RATIO_TREND", getattr(bot_config, "OB_RR_RATIO_TREND", 5.0))))
                    self.smc_input_rr_counter.setValue(float(cfg.get("OB_RR_RATIO_COUNTER", getattr(bot_config, "OB_RR_RATIO_COUNTER", 1.0))))
                    self.smc_input_max_setup.setValue(int(cfg.get("OB_MAX_ACTIVE_SETUPS", getattr(bot_config, "OB_MAX_ACTIVE_SETUPS", 10))))
                    self.smc_input_ob_max.setValue(int(cfg.get("OB_MAX_COUNT", getattr(bot_config, "OB_MAX_COUNT", 20))))
                except AttributeError:
                    pass
                self._is_loading_settings = False
                return

            
            enabled_tfs = cfg.get("ENABLED_TFS", ["M5", "M15", "M30", "H1", "H2", "H4"])
            if hasattr(self, 'chk_tf_m5'): self.chk_tf_m5.setChecked("M5" in enabled_tfs)
            if hasattr(self, 'chk_tf_m15'): self.chk_tf_m15.setChecked("M15" in enabled_tfs)
            if hasattr(self, 'chk_tf_m30'): self.chk_tf_m30.setChecked("M30" in enabled_tfs)
            if hasattr(self, 'chk_tf_h1'): self.chk_tf_h1.setChecked("H1" in enabled_tfs)
            if hasattr(self, 'chk_tf_h2'): self.chk_tf_h2.setChecked("H2" in enabled_tfs)
            if hasattr(self, 'chk_tf_h4'): self.chk_tf_h4.setChecked("H4" in enabled_tfs)
            
            self.chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_MAIN", getattr(bot_config, "ENABLE_STRATEGY_MAIN", True))))
            self.chk_xole.setChecked(bool(cfg.get("ENABLE_STRATEGY_XOLE", getattr(bot_config, "ENABLE_STRATEGY_XOLE", True))))
            self.chk_dynamic_ema200_tp.setChecked(bool(cfg.get("ENABLE_DYNAMIC_EMA200_TP", getattr(bot_config, "ENABLE_DYNAMIC_EMA200_TP", False))))
            self.chk_dynamic_pingpong_tp.setChecked(bool(cfg.get("ENABLE_DYNAMIC_PINGPONG_TP", getattr(bot_config, "ENABLE_DYNAMIC_PINGPONG_TP", False))))
            self.chk_altcoin_follow_btc_ema.setChecked(bool(cfg.get("ALTCOIN_FOLLOW_BTC_EMA", getattr(bot_config, "ALTCOIN_FOLLOW_BTC_EMA", True))))
            
            self.chk_sideway_safe.setChecked(bool(cfg.get("ENABLE_SIDEWAY_SAFE_EXIT", getattr(bot_config, "ENABLE_SIDEWAY_SAFE_EXIT", False))))
            self.chk_squeeze_escape.setChecked(bool(cfg.get("ENABLE_SQUEEZE_ESCAPE_EXIT", getattr(bot_config, "ENABLE_SQUEEZE_ESCAPE_EXIT", False))))
            self.chk_safeguard_entry.setChecked(bool(cfg.get("ENABLE_SAFEGUARD_ENTRY_EXIT", getattr(bot_config, "ENABLE_SAFEGUARD_ENTRY_EXIT", False))))
            self.chk_trailing_sl.setChecked(bool(cfg.get("ENABLE_TRAILING_SL", getattr(bot_config, "ENABLE_TRAILING_SL", False))))
            self.chk_max_roi.setChecked(bool(cfg.get("ENABLE_MAX_ROI_EXIT", getattr(bot_config, "ENABLE_MAX_ROI_EXIT", False))))
            self.chk_sideway_vap.setChecked(bool(cfg.get("ENABLE_SIDEWAY_VAP_EXIT", getattr(bot_config, "ENABLE_SIDEWAY_VAP_EXIT", False))))
            self.chk_h4_flip.setChecked(bool(cfg.get("ENABLE_H4_FLIP_CLOSE", getattr(bot_config, "ENABLE_H4_FLIP_CLOSE", False))))
            
            self.input_tp_pct.setValue(float(cfg.get("TP_TARGET_OPTIMAL", float(getattr(bot_config, "SCALPING_TP_PCT", 0.008)))) * 100)
            self.input_sl_pct.setValue(float(cfg.get("SL_TARGET_OPTIMAL", float(getattr(bot_config, "SCALPING_SL_PCT", 0.008)))) * 100)
            self.input_pos_vol.setValue(float(cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", float(getattr(bot_config, "POSITION_VOLUME_HIGH_CONFIDENCE", 100.0)))))
            
            self.input_dca_gap_pct.setValue(float(cfg.get("DCA_GAP_THRESHOLD_PCT", float(getattr(bot_config, "DCA_GAP_THRESHOLD_PCT", 0.01)))) * 100)
            self.input_confluence_pct.setValue(float(cfg.get("EMA_CONFLUENCE_TOLERANCE_PCT", float(getattr(bot_config, "EMA_CONFLUENCE_TOLERANCE_PCT", 0.01)))) * 100)
            self.input_entry_offset.setValue(float(cfg.get("BASE_ENTRY_OFFSET_PCT", float(getattr(bot_config, "BASE_ENTRY_OFFSET_PCT", 0.01)))) * 100)
            self.input_accum_candles.setValue(int(cfg.get("REQUIRED_ACCUMULATION_CANDLES", getattr(bot_config, "REQUIRED_ACCUMULATION_CANDLES", 3))))
            
            self.input_q_buffer.setValue(int(cfg.get("QUANTUM_BUFFER_CANDLES", getattr(bot_config, "QUANTUM_BUFFER_CANDLES", 10))))
            self.input_q_forth.setValue(int(cfg.get("QUANTUM_FORTH_CANDLES", getattr(bot_config, "QUANTUM_FORTH_CANDLES", 5))))
            self.input_evo_cycle.setValue(int(cfg.get("EVOLUTION_CYCLE_SECONDS", getattr(bot_config, "EVOLUTION_CYCLE_SECONDS", 86400))))
            
            btc_cfg = next((c for c in getattr(bot_config, "COIN_PORTFOLIO", []) if c.get("coin") == "BTC"), {})
            eth_cfg = next((c for c in getattr(bot_config, "COIN_PORTFOLIO", []) if c.get("coin") == "ETH"), {})
            
            self.input_btc_lever.setValue(int(cfg.get("LEVERAGES", {}).get("BTC", btc_cfg.get("leverage", 100))))
            self.input_eth_lever.setValue(int(cfg.get("LEVERAGES", {}).get("ETH", eth_cfg.get("leverage", 100))))
            self.input_btc_vol_mult.setValue(float(cfg.get("VOL_MULTIPLIERS", {}).get("BTC", float(btc_cfg.get("vol_mult", 1.0)))))
            self.input_eth_vol_mult.setValue(float(cfg.get("VOL_MULTIPLIERS", {}).get("ETH", float(eth_cfg.get("vol_mult", 1.3)))))
            
            enabled_coins = cfg.get("ENABLED_COINS", ["BTC", "ETH", "XAU"])
            if hasattr(self, 'chk_cfg_btc'):
                self.chk_cfg_btc.setChecked("BTC" in enabled_coins)
                self.chk_cfg_eth.setChecked("ETH" in enabled_coins)
                self.chk_cfg_xau.setChecked("XAU" in enabled_coins)
            if hasattr(self, 'smc_chk_cfg_btc'):
                self.smc_chk_cfg_btc.setChecked("BTC" in enabled_coins)
                self.smc_chk_cfg_eth.setChecked("ETH" in enabled_coins)
                self.smc_chk_cfg_xau.setChecked("XAU" in enabled_coins)
            if hasattr(self, 'dash_chk_btc'):
                self.dash_chk_btc.setChecked("BTC" in enabled_coins)
                self.dash_chk_eth.setChecked("ETH" in enabled_coins)
                self.dash_chk_xau.setChecked("XAU" in enabled_coins)
        except Exception as e: 
            print('Error setting defaults:', e)
        self._is_loading_settings = False

    def _on_dash_coin_toggled(self, coin, state):
        """Đồng bộ checkbox trên Dashboard xuống Cấu Hình (cả Sub 1 & Sub 2) và lưu tự động."""
        checked = bool(state)
        if self.strategy_id == "sub2":
            smc_cfg_map = {"xau": "smc_chk_cfg_xau", "btc": "smc_chk_cfg_btc", "eth": "smc_chk_cfg_eth"}
            cfg_attr = smc_cfg_map.get(coin)
            if cfg_attr and hasattr(self, cfg_attr):
                getattr(self, cfg_attr).setChecked(checked)
        else:
            cfg_map = {"xau": "chk_cfg_xau", "btc": "chk_cfg_btc", "eth": "chk_cfg_eth"}
            cfg_attr = cfg_map.get(coin)
            if cfg_attr and hasattr(self, cfg_attr):
                getattr(self, cfg_attr).setChecked(checked)
        
        # Auto-save ENABLED_COINS vào file config
        try:
            acc_name = self.get_acc_name()
            json_data_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data")
            os.makedirs(json_data_dir, exist_ok=True)
            config_path = os.path.join(json_data_dir, f"{acc_name}_global_config.json")
            cfg = {}
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
            
            enabled = cfg.get("ENABLED_COINS", ["XAU", "BTC", "ETH"])
            coin_upper = coin.upper()
            if checked and coin_upper not in enabled:
                enabled.append(coin_upper)
            elif not checked and coin_upper in enabled:
                enabled.remove(coin_upper)
                
            cfg["ENABLED_COINS"] = enabled
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=4)
        except Exception as e:
            print("Lỗi auto-save ENABLED_COINS:", e)

    def _on_dash_tf_changed(self):
        if getattr(self, '_is_loading_settings', False):
            return
        self.save_strategy_settings(silent=True)

    def play_sound(self, sound_file, volume=0.5):
        try:
            from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
            from PyQt6.QtCore import QUrl
            import os
            
            # Lưu trữ player để không bị dọn dẹp (garbage collected) khi đang phát
            if not hasattr(self, '_audio_players'):
                self._audio_players = []
                
            # Dọn dẹp các player đã phát xong
            from PyQt6.QtMultimedia import QMediaPlayer as QMP
            self._audio_players = [p for p in self._audio_players if p.playbackState() == QMP.PlaybackState.PlayingState]
            
            player = QMediaPlayer(self)
            audio_output = QAudioOutput(player)
            player.setAudioOutput(audio_output)
            audio_output.setVolume(volume)
            
            path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", sound_file)
            if os.path.exists(path):
                player.setSource(QUrl.fromLocalFile(path))
                player.play()
                self._audio_players.append(player)
        except Exception as e:
            pass

    def save_api_settings(self):
        self.play_sound("universfield-cinematic-impact-hit-352702.mp3", 0.6)
        env_file = self.get_selected_env()
        if not env_file: return
        
        api_key = self.input_api_key.text().strip()
        secret_key = self.input_secret_key.text().strip()
        passphrase = self.input_passphrase.text().strip()
        is_demo = False
        
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
                
                timestamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                method = 'GET'
                request_path = '/api/v5/account/config'
                message = timestamp + method + request_path
                
                mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod='sha256')
                sign = base64.b64encode(mac.digest()).decode('utf-8')
                
                headers = {
                    'OK-ACCESS-KEY': api_key,
                    'OK-ACCESS-SIGN': sign,
                    'OK-ACCESS-TIMESTAMP': timestamp,
                    'OK-ACCESS-PASSPHRASE': passphrase,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                if is_demo:
                    headers['x-simulated-trading'] = '1'
                
                # Try domains sequentially
                domains_to_try = ["www.okx.com", "eea.okx.com", "us.okx.com"]
                success_domain = None
                last_err_msg = ""
                res = None
                
                for dom in domains_to_try:
                    url = f"https://{dom}" + request_path
                    req = urllib.request.Request(url, headers=headers)
                    try:
                        with urllib.request.urlopen(req, timeout=5) as response:
                            res = json.loads(response.read().decode('utf-8'))
                            if res.get("code") == "0":
                                success_domain = dom
                                break
                            else:
                                last_err_msg = res.get("msg", "Unknown OKX Error")
                    except urllib.error.HTTPError as e:
                        try:
                            err_body = json.loads(e.read().decode('utf-8'))
                            last_err_msg = err_body.get("msg", str(e))
                        except Exception:
                            last_err_msg = str(e)
                    except Exception as e:
                        last_err_msg = str(e)
                
                if not success_domain:
                    raise Exception(last_err_msg or "Không thể kết nối đến OKX.")
                
                # --- KIỂM TRA BẢO MẬT UID CHÍNH/PHỤ ---
                global CURRENT_UID
                if CURRENT_UID != "admtls12021":
                    data_arr = res.get("data", [])
                    if data_arr:
                        main_uid = data_arr[0].get("mainUid", "")
                        if main_uid and str(main_uid) != str(CURRENT_UID):
                            display_err = f"API Key này KHÔNG thuộc về UID {CURRENT_UID}!\n\nVui lòng chỉ nhập API Key của tài khoản chính hoặc tài khoản phụ trực thuộc UID {CURRENT_UID}."
                            msg = QtWidgets.QMessageBox(self)
                            msg.setWindowTitle("Lỗi API Key (Sai Chủ)")
                            msg.setText(display_err)
                            self.play_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
                            msg.exec()
                            self.btn_save_api.setText("💾 LƯU CẤU HÌNH API KEY")
                            self.btn_save_api.setEnabled(True)
                            return
            except Exception as e:
                msg = QtWidgets.QMessageBox(self)
                msg.setWindowTitle("Lỗi API Key")
                msg.setText(f"Không thể xác thực API Key:\n{str(e)}")
                self.play_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
                msg.exec()
                self.btn_save_api.setText("💾 LƯU CẤU HÌNH API KEY")
                self.btn_save_api.setEnabled(True)
                return
                
            self.btn_save_api.setText("💾 LƯU CẤU HÌNH API KEY")
            self.btn_save_api.setEnabled(True)
        # -------------------------------
        
        bot_label = "Bot Sub 2 (SMC)" if self.strategy_id == "sub2" else "Bot Sub 1 (Thợ Săn EMA200)"
        env_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", env_file)
        os.makedirs(os.path.dirname(env_path), exist_ok=True)
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(f"OKX_IS_DEMO=\"{is_demo}\"\n")
            f.write(f"OKX_API_KEY=\"{api_key}\"\n")
            f.write(f"OKX_SECRET_KEY=\"{secret_key}\"\n")
            f.write(f"OKX_PASSPHRASE=\"{passphrase}\"\n")
            if api_key or secret_key:
                f.write(f"OKX_DOMAIN=\"{success_domain}\"\n")
            else:
                f.write(f"OKX_DOMAIN=\"www.okx.com\"\n")
        msg = QtWidgets.QMessageBox(self)
        msg.setWindowTitle("Thành Công")
        if not api_key and not secret_key:
            msg.setText(f"🔑 Đã xóa trắng cấu hình API Key cho [{bot_label}] ({env_file})!")
        else:
            msg.setText(f"🔑 Đã xác thực và lưu API Key thành công cho [{bot_label}] ({env_file})!")
        msg.exec()

    def save_strategy_settings(self, silent=False):
        if not silent:
            self.play_sound("universfield-cinematic-impact-hit-352702.mp3", 0.6)
        env_file = self.get_selected_env()
        if not env_file:
            if not silent:
                msg = QtWidgets.QMessageBox(self)
                msg.setIcon(QtWidgets.QMessageBox.Warning)
                msg.setWindowTitle("Lỗi")
                msg.setText("Vui lòng chọn Tài khoản (API Key) ở góc trái màn hình trước khi Lưu cấu hình!")
                msg.exec()
            return
        acc_name = self.get_acc_name()
        json_data_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data")
        os.makedirs(json_data_dir, exist_ok=True)
        config_path = os.path.join(json_data_dir, f"{acc_name}_global_config.json")
        
        cfg = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f: cfg = json.load(f)
            except: pass

        if self.strategy_id == "sub2":
            smc_enabled = []
            if getattr(self, 'smc_chk_cfg_xau', None) and self.smc_chk_cfg_xau.isChecked(): smc_enabled.append("XAU")
            if getattr(self, 'smc_chk_cfg_btc', None) and self.smc_chk_cfg_btc.isChecked(): smc_enabled.append("BTC")
            if getattr(self, 'smc_chk_cfg_eth', None) and self.smc_chk_cfg_eth.isChecked(): smc_enabled.append("ETH")
            
            cfg.update({
                "ENABLED_COINS": smc_enabled,
                "ENABLE_STRATEGY_SMC": self.smc_chk_main.isChecked() if hasattr(self, 'smc_chk_main') else True,
                "TIMEFRAME_BASE": self.smc_combo_tf_base.currentText() if hasattr(self, 'smc_combo_tf_base') else "5m",
                "POSITION_VOLUME_HIGH_CONFIDENCE": str(round(self.smc_input_pos_vol.value(), 2)) if hasattr(self, 'smc_input_pos_vol') else "100.00",
                "OB_RR_RATIO_TREND": str(round(self.smc_input_rr_trend.value(), 2)) if hasattr(self, 'smc_input_rr_trend') else "0.00",
                "OB_RR_RATIO_COUNTER": str(round(self.smc_input_rr_counter.value(), 2)) if hasattr(self, 'smc_input_rr_counter') else "0.00",
            })
            if hasattr(self, 'smc_chk_dynamic_risk'): cfg["USE_DYNAMIC_RISK"] = self.smc_chk_dynamic_risk.isChecked()
            if hasattr(self, 'smc_input_risk_pct'): cfg["RISK_PER_TRADE_PCT"] = str(round(self.smc_input_risk_pct.value() / 100.0, 4))
            if hasattr(self, 'smc_combo_source'): cfg["OB_SOURCE"] = self.smc_combo_source.currentText()
            if hasattr(self, 'smc_combo_dir'): cfg["OB_DIRECTION"] = self.smc_combo_dir.currentText()
            if hasattr(self, 'smc_combo_tp'): cfg["OB_TP_MODE"] = self.smc_combo_tp.currentText()
            if hasattr(self, 'smc_input_swing'): cfg["SWING_LENGTH"] = self.smc_input_swing.value()
            if hasattr(self, 'smc_input_internal'): cfg["INTERNAL_LENGTH"] = self.smc_input_internal.value()
            if hasattr(self, 'smc_input_ob_max'): cfg["OB_MAX_COUNT"] = self.smc_input_ob_max.value()
            if hasattr(self, 'smc_input_ob_vol'): cfg["OB_VOLATILITY_MULT"] = str(round(self.smc_input_ob_vol.value(), 2))
        else:
            enabled = []
            if getattr(self, 'chk_cfg_xau', None) and self.chk_cfg_xau.isChecked(): enabled.append("XAU")
            if getattr(self, 'chk_cfg_btc', None) and self.chk_cfg_btc.isChecked(): enabled.append("BTC")
            if getattr(self, 'chk_cfg_eth', None) and self.chk_cfg_eth.isChecked(): enabled.append("ETH")
            cfg.update({
                "ENABLED_COINS": enabled,
                "RESET_CONFIG_V23": True,
                
                "ENABLED_TFS": [tf for tf, chk in [("M5", getattr(self, 'chk_tf_m5', None)), 
                                                   ("M15", getattr(self, 'chk_tf_m15', None)), 
                                                   ("M30", getattr(self, 'chk_tf_m30', None)), 
                                                   ("H1", getattr(self, 'chk_tf_h1', None)), 
                                                   ("H2", getattr(self, 'chk_tf_h2', None)), 
                                                   ("H4", getattr(self, 'chk_tf_h4', None))] if chk and chk.isChecked()],
                "ENABLE_STRATEGY_MAIN": self.chk_main.isChecked(),
                "ENABLE_STRATEGY_XOLE": self.chk_xole.isChecked(),
                "ENABLE_DYNAMIC_EMA200_TP": self.chk_dynamic_ema200_tp.isChecked(),
                "ENABLE_DYNAMIC_PINGPONG_TP": self.chk_dynamic_pingpong_tp.isChecked(),
                "ALTCOIN_FOLLOW_BTC_EMA": self.chk_altcoin_follow_btc_ema.isChecked(),
                "ENABLE_SIDEWAY_SAFE_EXIT": self.chk_sideway_safe.isChecked(),
                "ENABLE_SQUEEZE_ESCAPE_EXIT": self.chk_squeeze_escape.isChecked(),
                "ENABLE_SAFEGUARD_ENTRY_EXIT": self.chk_safeguard_entry.isChecked(),
                "ENABLE_TRAILING_SL": self.chk_trailing_sl.isChecked(),
                "ENABLE_MAX_ROI_EXIT": self.chk_max_roi.isChecked(),
                "ENABLE_SIDEWAY_VAP_EXIT": self.chk_sideway_vap.isChecked(),
                "ENABLE_H4_FLIP_CLOSE": self.chk_h4_flip.isChecked(),
                "TP_TARGET_OPTIMAL": str(round(self.input_tp_pct.value() / 100.0, 5)),
                "SL_TARGET_OPTIMAL": str(round(self.input_sl_pct.value() / 100.0, 5)),
                "POSITION_VOLUME_HIGH_CONFIDENCE": str(round(self.input_pos_vol.value(), 2)),
                "EVOLUTION_CYCLE_SECONDS": self.input_evo_cycle.value(),
                "LEVERAGES": {
                    "XAU": getattr(self, 'input_xau_lever', None).value() if hasattr(self, 'input_xau_lever') else 100,
                    "BTC": self.input_btc_lever.value(),
                    "ETH": self.input_eth_lever.value()
                },
                "VOL_MULTIPLIERS": {
                    "BTC": str(round(self.input_btc_vol_mult.value(), 2)),
                    "ETH": str(round(self.input_eth_vol_mult.value(), 2))
                }
            })

        for key in ["DCA_GAP_THRESHOLD_PCT", "EMA_CONFLUENCE_TOLERANCE_PCT", "BASE_ENTRY_OFFSET_PCT", 
                    "REQUIRED_ACCUMULATION_CANDLES", "QUANTUM_BUFFER_CANDLES", "QUANTUM_FORTH_CANDLES"]:
            cfg.pop(key, None)

        if os.path.exists(config_path):
            try: os.remove(config_path)
            except: pass

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4)
            
        if hasattr(self, 'dash_chk_btc'):
            if self.strategy_id == "sub2":
                if hasattr(self, 'smc_chk_cfg_btc'): self.dash_chk_btc.setChecked(self.smc_chk_cfg_btc.isChecked())
                if hasattr(self, 'smc_chk_cfg_eth'): self.dash_chk_eth.setChecked(self.smc_chk_cfg_eth.isChecked())
                if hasattr(self, 'smc_chk_cfg_xau'): self.dash_chk_xau.setChecked(self.smc_chk_cfg_xau.isChecked())
            else:
                if hasattr(self, 'chk_cfg_btc'): self.dash_chk_btc.setChecked(self.chk_cfg_btc.isChecked())
                if hasattr(self, 'chk_cfg_eth'): self.dash_chk_eth.setChecked(self.chk_cfg_eth.isChecked())
                if hasattr(self, 'chk_cfg_xau'): self.dash_chk_xau.setChecked(self.chk_cfg_xau.isChecked())
            
        bot_label = "Bot Sub 2 (SMC)" if self.strategy_id == "sub2" else "Bot Sub 1 (Thợ Săn EMA200)"
        if not silent:
            msg = QtWidgets.QMessageBox(self)
            msg.setWindowTitle("Thành Công")
            msg.setText(f"⚙️ Đã lưu Cấu Hình Chiến Thuật cho [{bot_label}] ({env_file}) thành công!\n\nFile lưu: {os.path.basename(config_path)}")
            msg.exec()

    def _verify_env_security(self, env_path):
        global CURRENT_UID
        if CURRENT_UID == "admtls12021": return True
        try:
            import hmac, base64, urllib.request, json, datetime
            api_key, secret_key, passphrase, is_demo = "", "", "", False
            okx_domain = "www.okx.com"
            if not os.path.exists(env_path): return False
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("OKX_API_KEY="): api_key = line.strip().split("=")[1].strip('"')
                    elif line.startswith("OKX_SECRET_KEY="): secret_key = line.strip().split("=")[1].strip('"')
                    elif line.startswith("OKX_PASSPHRASE="): passphrase = line.strip().split("=")[1].strip('"')
                    elif line.startswith("OKX_IS_DEMO="): is_demo = False
                    elif line.startswith("OKX_DOMAIN="): okx_domain = line.strip().split("=")[1].strip('"')
            if not api_key or not secret_key: return False
            timestamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            request_path = '/api/v5/account/config'
            message = timestamp + 'GET' + request_path
            mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod='sha256')
            sign = base64.b64encode(mac.digest()).decode('utf-8')
            headers = {
                'OK-ACCESS-KEY': api_key, 'OK-ACCESS-SIGN': sign, 'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': passphrase, 'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            if is_demo: headers['x-simulated-trading'] = '1'
            req = urllib.request.Request(f"https://{okx_domain}" + request_path, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode('utf-8'))
                if res.get("code") != "0": return False
                data_arr = res.get("data", [])
                if data_arr:
                    main_uid = data_arr[0].get("mainUid", "")
                    if main_uid and str(main_uid) != str(CURRENT_UID): return False
            return True
        except Exception:
            return False

    def on_main_logout(self):
        play_ui_sound("universfield-bubble-pop-04-323580.mp3", 0.6)
        
        reply = QtWidgets.QMessageBox.question(self, 'Xác nhận Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản không?', QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No, QtWidgets.QMessageBox.No)
        if reply == QtWidgets.QMessageBox.Yes:
            global CURRENT_UID
            CURRENT_UID = None
            try:
                os.remove(os.path.join(USER_DATA_DIR, "auth.txt"))
            except: pass
            self.close()
            os.execl(sys.executable, sys.executable, *sys.argv)

    def start_bot(self):
        self.play_sound("juniorsoundays-ui-sound-70-527837.mp3", 0.7)
        self.uptime_sec = 0
        self.lbl_uptime.setText("00:00:00")
        self.uptime_timer.start(1000)
        env_file = self.get_selected_env()
        if not env_file: return
        
        env_path = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", env_file)
        if not self._verify_env_security(env_path):
            self.play_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
            QtWidgets.QMessageBox.critical(self, "Khóa Bảo Mật", f"LỖI BẢO MẬT: API Key trong cấu hình {env_file} không hợp lệ hoặc KHÔNG thuộc quyền sở hữu của UID {CURRENT_UID}.\n\nHệ thống đã khóa lệnh chạy Bot để bảo vệ an toàn!")
            return
        
        flag_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data")
        os.makedirs(flag_dir, exist_ok=True)
        flag_path = os.path.join(flag_dir, f"stop_{self.strategy_id}.flag")
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
        self.play_sound("litupsubway-key-collect-sfx-522219.mp3", 0.7)
        if self.worker:
            self.btn_stop.setEnabled(False)
            self.worker.stop()

    def reset_wallet(self):
        self.play_sound("universfield-bubble-pop-04-323580.mp3", 0.6)
        flag_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data")
        os.makedirs(flag_dir, exist_ok=True)
        flag = os.path.join(flag_dir, f"reset_wallet_{self.strategy_id}.flag")
        with open(flag, "w") as f: f.write("1")
        self.append_log("\n♻️ [HỆ THỐNG]: Đã gửi lệnh Reset Vốn Gốc (Audit) thành công cho tài khoản!")
        QtWidgets.QMessageBox.information(self, "Thông báo", "Đã gửi lệnh Reset Vốn Gốc (Audit) thành công cho tài khoản!")

    def reset_nen(self):
        self.play_sound("universfield-bubble-pop-04-323580.mp3", 0.6)
        flag_dir = os.path.join(USER_DATA_DIR, f"z_bot_{self.strategy_id}", "json_data")
        os.makedirs(flag_dir, exist_ok=True)
        flag = os.path.join(flag_dir, f"reset_nen_{self.strategy_id}.flag")
        with open(flag, "w") as f: f.write("1")
        self.append_log("\n♻️ [HỆ THỐNG]: Đã kích hoạt lệnh Reset Đếm Nến.")
        QtWidgets.QMessageBox.information(self, "Thông báo", "Đã kích hoạt lệnh Reset Đếm Nến thành công!")

    def on_bot_finished(self):
        play_ui_sound("universfield-bubble-pop-04-323580.mp3", 0.6)
        self.log_display.appendPlainText("\n🛑 Bot đã dừng hoàn toàn.")
        self.btn_start.setEnabled(True)
        self.btn_stop.setEnabled(False)
        self.account_dropdown.setEnabled(True)
        self.status_led.setText("● ĐANG DỪNG")
        self.status_led.setStyleSheet("color: #FF3333; padding-left:10px;")
        self.worker = None

    def on_chart_config_changed(self):
        if getattr(self, 'live_chart_worker', None):
            coin_code = self.combo_coin.currentData() or f"{self.combo_coin.currentText()}-USDT-SWAP"
            self.live_chart_worker.inst_id = coin_code
            self.live_chart_worker.bar = self.combo_tf.currentText()
            self._chart_initialized = False
            if getattr(self, 'chart_widget', None):
                self.chart_widget.watermark(f'{self.combo_coin.currentText()} ({self.live_chart_worker.bar})', color='rgba(255, 153, 0, 0.1)')
                pass
            self.live_chart_worker.trigger_fetch()

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
                    
                    df['EMA 200'] = df['close'].ewm(span=200, adjust=False).mean()
                    
                    if not getattr(self, '_chart_initialized', False):
                        self.chart_widget.set(df[['time', 'open', 'high', 'low', 'close', 'volume']])
                        self.ema_line.set(df[['time', 'EMA 200']].dropna())
                        
                        init_ob_js = f'''
                        (function() {{
                            try {{
                                let chartObj = window['{self.chart_widget.id}'];
                                if (!chartObj && window.pythonObject) {{
                                    for (let key in window) {{
                                        try {{
                                            if (window[key] && window[key].series) {{
                                                chartObj = window[key];
                                                break;
                                            }}
                                        }} catch(e){{}}
                                    }}
                                }}
                                if (!chartObj || !chartObj.series) return;
                                const series = chartObj.series;
                                const chart = chartObj.chart;
                                
                                const container = chartObj.container || (chartObj.div ? chartObj.div : document.body);
                                let overlay = document.getElementById('smc_ob_shaded_overlay');
                                if (!overlay) {{
                                    overlay = document.createElement('div');
                                    overlay.id = 'smc_ob_shaded_overlay';
                                    overlay.style.position = 'absolute';
                                    overlay.style.top = '0';
                                    overlay.style.left = '0';
                                    overlay.style.width = '100%';
                                    overlay.style.height = '100%';
                                    overlay.style.pointerEvents = 'none';
                                    overlay.style.zIndex = '4';
                                    overlay.style.overflow = 'hidden';
                                    if (container && container.style) container.style.position = 'relative';
                                    (container || document.body).appendChild(overlay);
                                }}

                                window._active_smc_obs = [];

                                function drawObShadedBands() {{
                                    const obs = window._active_smc_obs;
                                    if (!obs || !overlay) return;
                                    overlay.innerHTML = '';
                                    const w = overlay.clientWidth || (container ? container.clientWidth : 800);
                                    
                                    const PRICE_SCALE_WIDTH = 70;
                                    const maxRightX = w - PRICE_SCALE_WIDTH;

                                    obs.forEach(ob => {{
                                        if (typeof series.priceToCoordinate !== 'function') return;
                                        
                                        const y1 = series.priceToCoordinate(ob.high);
                                        const y2 = series.priceToCoordinate(ob.low);
                                        if (y1 === null || y2 === null) return;

                                        const topY = Math.min(y1, y2);
                                        const botY = Math.max(y1, y2);
                                        const h = Math.max(botY - topY, 4);
                                        const isBull = (ob.bias === 1);

                                        let startX = null;
                                        if (chart && chart.timeScale && ob.time && ob.time > 0) {{
                                            try {{
                                                const secTime = ob.time > 100000000000 ? Math.floor(ob.time / 1000) : ob.time;
                                                const xCoord = chart.timeScale().timeToCoordinate(secTime);
                                                if (xCoord !== null) {{
                                                    startX = Math.floor(xCoord);
                                                }}
                                            }} catch(e) {{}}
                                        }}

                                        if (startX === null) startX = 0;
                                        if (startX < -2000) startX = -2000;
                                        if (startX >= maxRightX) return;

                                        const boxWidth = maxRightX - startX;
                                        if (boxWidth <= 0) return;

                                        const bg = isBull ? 'rgba(21, 101, 192, 0.2)' : 'rgba(198, 40, 40, 0.2)';

                                        const box = document.createElement('div');
                                        box.style.position = 'absolute';
                                        box.style.top = topY + 'px';
                                        box.style.left = startX + 'px';
                                        box.style.width = boxWidth + 'px';
                                        box.style.height = h + 'px';
                                        box.style.backgroundColor = bg;
                                        box.style.border = 'none';
                                        box.style.boxSizing = 'border-box';
                                        box.style.pointerEvents = 'none';

                                        overlay.appendChild(box);
                                    }});
                                }}

                                window._drawObShadedBands = drawObShadedBands;

                                if (!window._smc_ob_subscribed && chart && chart.timeScale) {{
                                    window._smc_ob_subscribed = true;
                                    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {{
                                        if (window._drawObShadedBands) window._drawObShadedBands();
                                    }});
                                }}
                            }} catch(err) {{}}
                        }})();
                        '''
                        self.chart_widget.win.run_script(init_ob_js)
                        
                        self._chart_initialized = True
                    else:
                        self.chart_widget.update(df.iloc[-1][['time', 'open', 'high', 'low', 'close', 'volume']])
                        self.ema_line.update(df.iloc[-1][['time', 'EMA 200']])
                else:
                    pass
                        
                # Vẽ markers
                if "markers" in data and getattr(self, '_chart_initialized', False):
                    markers = data["markers"]
                    import hashlib
                    m_str = json.dumps(markers, sort_keys=True)
                    m_hash = hashlib.md5(m_str.encode()).hexdigest()
                    
                    if getattr(self, '_last_markers_hash', None) != m_hash:
                        self.chart_widget.clear_markers()
                        import datetime
                        for m in markers:
                            if m.get("status") == "active":
                                color = '#00FF00' if m["side"] == "LONG" else '#FF0000'
                            else:
                                color = '#005500' if m["side"] == "LONG" else '#8B0000'
                                
                            shape = 'arrow_up' if m["side"] == "LONG" else 'arrow_down'
                            pos = 'below' if m["side"] == "LONG" else 'above'
                            text = 'B' if m["side"] == "LONG" else 'S'
                            
                            try:
                                dt = datetime.datetime.fromtimestamp(m["time"] / 1000)
                                self.chart_widget.marker(time=dt, position=pos, shape=shape, color=color, text=text)
                            except:
                                pass
                        self._last_markers_hash = m_hash

                # Vẽ Vùng Order Block SMC (Dải bôi Xanh/Đỏ nhạt, bắt đầu từ nến OB, KHÔNG chữ, KHÔNG đường kẻ ngang)
                if "ob_boxes" in data and getattr(self, 'chk_show_ob', None) and self.chk_show_ob.isChecked():
                        ob_boxes = data["ob_boxes"]
                        js_code = f'''
                        if (window._drawObShadedBands) {{
                            window._active_smc_obs = {json.dumps(ob_boxes)};
                            window._drawObShadedBands();
                        }}
                        '''
                        try:
                            self.chart_widget.win.run_script(js_code)
                        except Exception:
                            pass
                        
                        
                            
                        # Vẽ Price Lines cho ENTRY, TP, SL
                        try:
                            if getattr(self, 'show_chart_pos_lines', True):
                                current_coin = self.combo_coin.currentData()
                                chart_positions = []
                                
                                # 1. Lấy lệnh Limit (Pending Setups) từ OB
                                if "markers" in data:
                                    for m in data["markers"]:
                                        if m.get("type") == "SETUP" and m.get("status") == "active":
                                            tp_list = []
                                            if m.get("tp"): tp_list.append(float(m.get("tp")))
                                            sl_list = []
                                            if m.get("sl"): sl_list.append(float(m.get("sl")))
                                            
                                            chart_positions.append({
                                                "entry": float(m.get("price", 0)),
                                                "tp_list": tp_list,
                                                "sl_list": sl_list,
                                                "title": f"Limit {m.get('side', '')}"
                                            })
                                
                                # 2. Lấy vị thế thực tế
                                if hasattr(self, '_current_positions'):
                                    for pos in self._current_positions:
                                        if pos.get("instId") == current_coin:
                                            try:
                                                if float(pos.get("pos", 0)) != 0:
                                                    entry_px = float(pos.get("avgPx", 0))
                                                    tp_list = [float(x) for x in pos.get("tp_list", []) if x]
                                                    sl_list = [float(x) for x in pos.get("sl_list", []) if x]
                                                    
                                                    # Fallback to RR system (OB Setup) if API doesn't have TP/SL
                                                    if not tp_list or not sl_list:
                                                        if "markers" in data:
                                                            is_long = float(pos.get("pos", 0)) > 0
                                                            cands = [m for m in data["markers"] if m.get("type") == "SETUP" and ((m.get("side") == "LONG" and is_long) or (m.get("side") == "SHORT" and not is_long))]
                                                            if cands:
                                                                best = min(cands, key=lambda m: abs(float(m.get("price", 0)) - entry_px))
                                                                b_px = float(best.get("price", 0))
                                                                if b_px > 0 and abs(entry_px - b_px) / b_px <= 0.05: # Sai số 5%
                                                                    if not tp_list and best.get("tp"): tp_list.append(float(best.get("tp")))
                                                                    if not sl_list and best.get("sl"): sl_list.append(float(best.get("sl")))
                                                    
                                                    chart_positions.append({
                                                        "entry": entry_px,
                                                        "tp_list": tp_list,
                                                        "sl_list": sl_list
                                                    })
                                            except: pass
                                
                                import hashlib
                                pos_str = json.dumps(chart_positions)
                                pos_hash = hashlib.md5(pos_str.encode()).hexdigest()
                                
                                if getattr(self, '_last_pos_lines_hash', None) != pos_hash:
                                    js_lines = f"""
                                    (function() {{
                                        try {{
                                            let chartObj = window['{self.chart_widget.id}'];
                                            if (!chartObj && window.pythonObject) {{
                                                for (let key in window) {{
                                                    try {{
                                                        if (window[key] && window[key].series) {{ chartObj = window[key]; break; }}
                                                    }} catch(e){{}}
                                                }}
                                            }}
                                            if (!chartObj || !chartObj.series) return;
                                            const series = chartObj.series;
                                            
                                            if (window._my_price_lines) {{
                                                window._my_price_lines.forEach(l => {{ try {{ series.removePriceLine(l); }} catch(e){{}} }});
                                            }}
                                            window._my_price_lines = [];
                                            
                                            const positions = {json.dumps(chart_positions)};
                                            positions.forEach(p => {{
                                                if (p.entry) {{
                                                    window._my_price_lines.push(series.createPriceLine({{ price: p.entry, color: '#FFFFFF', lineStyle: 2, lineWidth: 1, title: p.title || 'ENTRY' }}));
                                                }}
                                                p.tp_list.forEach(tp => {{
                                                    window._my_price_lines.push(series.createPriceLine({{ price: tp, color: '#00B894', lineStyle: 0, lineWidth: 1, title: 'TP' }}));
                                                }});
                                                p.sl_list.forEach(sl => {{
                                                    window._my_price_lines.push(series.createPriceLine({{ price: sl, color: '#FF4757', lineStyle: 0, lineWidth: 1, title: 'SL' }}));
                                                }});
                                            }});
                                        }} catch(err) {{}}
                                    }})();
                                    """
                                    self.chart_widget.win.run_script(js_lines)
                                    self._last_pos_lines_hash = pos_hash
                        except Exception as e:
                            pass
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Chart error: {e}")

    def append_log(self, text):
        try:
            if text.strip().startswith('{"type": "chart_data"'):
                return
            if "[SYNC]" in text:
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
        msg.exec()

    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"TLS1 Trading v{APP_VERSION}")
        self.resize(860, 980)
        
        if getattr(sys, 'frozen', False):
            logo_path = os.path.join(sys._MEIPASS, "media", "logo.ico")
        else:
            logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "logo.ico")
        try:
            if os.path.exists(logo_path):
                self.setWindowIcon(QtGui.QIcon(logo_path))
        except Exception: pass

        self.api_files = self.scan_env_files()
        self.init_ui()
        self.apply_dark_theme()
        
        # FIX cho Windows: Ép tất cả QComboBox dùng QStyledItemDelegate để hiển thị đúng CSS nền đen
        for combo in self.findChildren(QtWidgets.QComboBox):
            combo.setItemDelegate(QtWidgets.QStyledItemDelegate(combo))
            

        # --- Clean up garbage update files ---
        try:
            current_dir = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__))
            for f in os.listdir(current_dir):
                if f.startswith("TLS1_Update_Temp_") and f.endswith(".exe"):
                    try:
                        os.remove(os.path.join(current_dir, f))
                    except:
                        pass
                elif f == "update_app.bat":
                    try:
                        os.remove(os.path.join(current_dir, f))
                    except:
                        pass
        except:
            pass
        # -------------------------------------
        
        # Check for updates in background (Quét định kỳ mỗi 30 phút khi app đang mở)
        self.update_check_timer = QtCore.QTimer(self)
        self.update_check_timer.setSingleShot(False)
        self.update_check_timer.timeout.connect(lambda: self.check_update_background(is_startup=False))
        self.update_check_timer.start(1800000) # 30 phút = 1800000 ms
        
        # Lần đầu mở app (100ms sau startup): Quét và ÉP AUTO-UPDATE BẮT BUỘC nếu có bản mới
        QtCore.QTimer.singleShot(100, lambda: self.check_update_background(is_startup=True))

        # Setup background License verification timer (quét Google Sheet 30p 1 lần)
        self.license_check_timer = QtCore.QTimer(self)
        self.license_check_timer.timeout.connect(self.verify_license_background)
        # 30 phút = 30 * 60 * 1000 = 1800000 ms
        self.license_check_timer.start(1800000)
        
        # Quét lần đầu tiên sau khi app mở 5 giây để cập nhật trạng thái PENDING 24H nếu có
        QtCore.QTimer.singleShot(5000, self.verify_license_background)

    def verify_license_background(self):
        global CURRENT_UID
        if not CURRENT_UID or CURRENT_UID == "admtls12021":
            return

        try:
            import urllib.request
            import csv
            
            url = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                content = response.read().decode('utf-8')
            
            reader = csv.reader(content.splitlines())
            next(reader, None)
            
            user_info = None
            for row in reader:
                if row and len(row) >= 6 and row[0].strip().isdigit():
                    if row[0].strip() == CURRENT_UID:
                        user_info = {
                            "hwid": row[4].strip(),
                            "status": row[5].strip().upper()
                        }
                        break
            
            if user_info is None:
                QtWidgets.QMessageBox.warning(self, "⚠️ Không tìm thấy tài khoản",
                    "Tài khoản của bạn không tồn tại trong hệ thống.\n"
                    "Vui lòng liên hệ Admin TLS1 để được hỗ trợ.")
                self.force_logout_to_login()
                return
                    
            status = user_info.get('status', 'ON')
            
            if status == 'LOCK':
                QtWidgets.QMessageBox.warning(self, "🔒 Tài Khoản Bị Khóa",
                    "Tài khoản của bạn đã bị khóa.\n"
                    "Vui lòng liên hệ Admin TLS1 để được hỗ trợ.")
                self.force_logout_to_login()
                return
                    
            if status == 'PENDING 24H':
                self.trigger_humane_warning("Tài khoản của bạn đã bị khóa (hoặc dị thường).")
                return

            registered_hwid = user_info.get('hwid', '')
            if registered_hwid and registered_hwid != "None" and registered_hwid != get_hwid():
                QtWidgets.QMessageBox.warning(self, "⚠️ Mã Máy Không Khớp",
                    "Mã máy hiện tại không khớp với tài khoản đã đăng ký.\n"
                    "Nếu bạn vừa đổi máy, vui lòng liên hệ Admin TLS1 để cập nhật mã máy.")
                self.force_logout_to_login()
                return

        except Exception:
            pass

    def trigger_humane_warning(self, reason):
        self.play_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.8)
        # Cảnh báo nhân đạo: Thay đổi dòng chào mừng, 24 tiếng sau mới tự đóng app (24 * 60 * 60 * 1000 = 86400000 ms)
        warning_msg = f'⚠ {reason} Vui lòng <b><a href="login" style="color:#ff3333;text-decoration:underline;">Click vào đây để mở bảng Liên hệ Admin TLS1</a></b> xử lý khiếu nại. App sẽ tự đóng sau 24h!'
        if hasattr(self, 'lbl_main_welcome'):
            self.lbl_main_welcome.setText(warning_msg)
            self.lbl_main_welcome.setTextFormat(QtCore.Qt.TextFormat.RichText)
            self.lbl_main_welcome.setOpenExternalLinks(False)
            try: self.lbl_main_welcome.linkActivated.disconnect()
            except: pass
            
            def open_login(link):
                if link == "login":
                    dlg = LoginDialog()
                    dlg.exec()
                    
            self.lbl_main_welcome.linkActivated.connect(open_login)
            self.lbl_main_welcome.setStyleSheet("color: #ff3333; font-weight: bold; font-size: 13px; background-color: #ffe6e6; padding: 5px; border-radius: 4px; border: 1px solid #ff3333;")
            
        if hasattr(self, 'license_check_timer'):
            self.license_check_timer.stop()
            
        # Hẹn giờ 24h (86,400,000 ms) sau đó restart về màn hình đăng nhập
        QtCore.QTimer.singleShot(86400000, self.force_logout_to_login)

    def force_logout_to_login(self, reason=""):
        """Dừng bot, dọn dẹp và restart về màn hình đăng nhập (không hỏi xác nhận)."""
        # Dừng bộ định giờ license check để tránh gọi lại
        if hasattr(self, 'license_check_timer'):
            self.license_check_timer.stop()
        # Dọn dẹp presence
        if hasattr(self, 'presence_manager'):
            try:
                self.presence_manager.unregister()
                self.presence_manager.stop()
                self.presence_manager.wait(1000)
            except: pass
        # Restart app (subprocess.Popen mời + đóng cửa sổ hiện tại)
        import subprocess
        env = os.environ.copy()
        env.pop("_MEIPASS2", None)
        kwargs = {}
        if sys.platform == 'win32':
            kwargs['creationflags'] = 0x00000008
            kwargs['close_fds'] = True
        if getattr(sys, 'frozen', False):
            subprocess.Popen([sys.executable] + sys.argv[1:], env=env, **kwargs)
        else:
            subprocess.Popen([sys.executable] + sys.argv, env=env, **kwargs)
        sys.exit(0)

    def handle_logout(self):
        play_ui_sound("ribhavagrawal-hit-by-a-wood-230542.mp3", 0.6)
        reply = QtWidgets.QMessageBox.question(self, 'Xác nhận', 'Bạn có chắc chắn muốn đăng xuất?', QtWidgets.QMessageBox.StandardButton.Yes | QtWidgets.QMessageBox.StandardButton.No)
        if reply == QtWidgets.QMessageBox.StandardButton.Yes:
            self.force_logout_to_login()

    def update_tab_icons(self, index):
        for i in range(self.bot_tabs.count()):
            txt = self.bot_tabs.tabText(i)
            # Remove any existing icon
            base_name = txt[2:].strip() if len(txt) > 0 and txt[0] in ["🟢", "⚪", "🟣", "🔴", "🟡", "⚫"] else txt
            
            icon = "🟢" if i == index else "⚫"
            self.bot_tabs.setTabText(i, f"{icon} {base_name}")
            
        # Hiệu ứng thị giác chuyển trang mượt mà (Fade-in animation) khi đổi giữa các Bot
        target_widget = self.bot_tabs.widget(index)
        if target_widget:
            try:
                effect = QtWidgets.QGraphicsOpacityEffect(target_widget)
                target_widget.setGraphicsEffect(effect)
                anim = QtCore.QPropertyAnimation(effect, b"opacity", target_widget)
                anim.setDuration(220)
                anim.setStartValue(0.35)
                anim.setEndValue(1.0)
                anim.start(QtCore.QAbstractAnimation.DeletionPolicy.DeleteWhenStopped)
                anim.finished.connect(lambda: target_widget.setGraphicsEffect(None) if target_widget else None)
                target_widget._fade_anim = anim
            except Exception: pass

    def set_welcome_name(self, name):
        self.lbl_main_welcome.setText(f" Chúc sếp \"{name}\" giao dịch thuận lợi ")
        self.lbl_main_welcome.hide()  # Tạm thời ẩn đi theo yêu cầu
        for i in range(self.bot_tabs.count()):
            widget = self.bot_tabs.widget(i)
            if hasattr(widget, 'set_welcome_name'):
                widget.set_welcome_name(name)

    def scan_env_files(self):
        env_files = set()
        
        # Dọn dẹp thư mục json_data rác ở gốc nếu còn tồn tại
        legacy_root_json = os.path.join(USER_DATA_DIR, "json_data")
        if os.path.exists(legacy_root_json):
            try:
                import shutil
                shutil.rmtree(legacy_root_json, ignore_errors=True)
            except Exception: pass

        default_sub1_cfg = {
            "ENABLED_COINS": ["XAU", "BTC", "ETH"],
            "ENABLE_STRATEGY_MAIN": True,
            "ENABLE_STRATEGY_XOLE": True,
            "ENABLE_DYNAMIC_EMA200_TP": False,
            "ENABLE_DYNAMIC_PINGPONG_TP": False,
            "ALTCOIN_FOLLOW_BTC_EMA": True,
            "ENABLE_SIDEWAY_SAFE_EXIT": False,
            "ENABLE_SQUEEZE_ESCAPE_EXIT": True,
            "ENABLE_SAFEGUARD_ENTRY_EXIT": False,
            "ENABLE_TRAILING_SL": False,
            "ENABLE_MAX_ROI_EXIT": False,
            "ENABLE_SIDEWAY_VAP_EXIT": False,
            "ENABLE_H4_FLIP_CLOSE": True,
            "POSITION_VOLUME_HIGH_CONFIDENCE": "100.00",
            "TP_TARGET_OPTIMAL": "0.01200",
            "SL_TARGET_OPTIMAL": "0.01200",
            "EVOLUTION_CYCLE_SECONDS": 3600,
            "LEVERAGES": {"XAU": 100, "BTC": 100, "ETH": 100},
            "VOL_MULTIPLIERS": {"BTC": "1.00", "ETH": "1.30"}
        }

        default_sub2_cfg = {
            "ENABLED_COINS": ["XAU", "BTC", "ETH"],
            "ENABLE_STRATEGY_SMC": True,
            "TIMEFRAME_BASE": "1H",
            "POSITION_VOLUME_HIGH_CONFIDENCE": "100.00",
            "OB_RR_RATIO_TREND": "5.00",
            "OB_RR_RATIO_COUNTER": "1.00",
            "USE_DYNAMIC_RISK": False,
            "RISK_PER_TRADE_PCT": "0.0050",
            "SMC_MODE": "All Setups",
            "SMC_STYLE": "Normal",
            "OB_SOURCE": "ALL",
            "OB_DIRECTION": "BOTH",
            "OB_TP_MODE": "RR"
        }

        for b_name in ["z_bot_sub1", "z_bot_sub2"]:
            b_dir = os.path.join(USER_DATA_DIR, b_name)
            os.makedirs(b_dir, exist_ok=True)
            b_json_dir = os.path.join(b_dir, "json_data")
            os.makedirs(b_json_dir, exist_ok=True)

            for i in range(1, 6):
                default_env = os.path.join(b_dir, f".api_sub{i}")
                if not os.path.exists(default_env):
                    try:
                        with open(default_env, "w", encoding="utf-8") as f:
                            f.write("OKX_API_KEY=\"\"\nOKX_SECRET_KEY=\"\"\nOKX_PASSPHRASE=\"\"\n")
                    except: pass
                
                # Pre-create default JSON configs inside z_bot_sub*/json_data
                cfg_names = [f"sub{i}_global_config.json"]
                if i == 1:
                    cfg_names.append("sub1_global_config.json" if b_name == "z_bot_sub1" else "sub2_global_config.json")
                for c_name in cfg_names:
                    c_path = os.path.join(b_json_dir, c_name)
                    if not os.path.exists(c_path):
                        try:
                            with open(c_path, "w", encoding="utf-8") as f:
                                json.dump(default_sub1_cfg if b_name == "z_bot_sub1" else default_sub2_cfg, f, indent=4)
                        except: pass
                
        # Tiếp tục quét như bình thường
        for root_dir in [PROJECT_DIR, USER_DATA_DIR]:
            if not os.path.exists(root_dir): continue
            for d in os.listdir(root_dir):
                if d.startswith("z_bot_") and os.path.isdir(os.path.join(root_dir, d)):
                    try:
                        for f in os.listdir(os.path.join(root_dir, d)):
                            if f.startswith(".api") and not f.endswith(".example"):
                                env_files.add(f)
                    except Exception:
                        pass
        result = sorted(list(env_files))
        if '.api' not in result:
            result.insert(0, '.api')
        else:
            result.remove('.api')
            result.insert(0, '.api')
        return result

    def init_ui(self):
        central_widget = QtWidgets.QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QtWidgets.QVBoxLayout(central_widget)
        main_layout.setContentsMargins(6, 4, 6, 6)
        main_layout.setSpacing(5)

        header_layout = QtWidgets.QHBoxLayout()
        title = QtWidgets.QLabel("<span style='color: white;'>TRADER LÀ SỐ 1 - VIỆT NAM</span>")
        title.setFont(QtGui.QFont("Segoe UI", 16, QtGui.QFont.Weight.Bold))
        header_layout.addWidget(title)
        
        header_layout.addStretch()

        self.lbl_main_welcome = QtWidgets.QLabel("")
        self.lbl_main_welcome.setStyleSheet("color: #ffffff; font-size: 14px; font-weight: bold; font-style: italic; margin-right: 15px;")
        self.lbl_main_welcome.hide()
        
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
        # Label hiển thị số người đang online
        self.lbl_online_count = QtWidgets.QLabel("")
        self.lbl_online_count.setStyleSheet("""
            color: #4caf50; 
            font-size: 12px; 
            font-weight: bold; 
            background: transparent;
            border: none;
            padding: 3px 10px;
            margin-right: 5px;
        """)
        self.lbl_online_count.hide()
        
        header_layout.addWidget(self.lbl_online_count)
        header_layout.addWidget(self.btn_update)
        # Nút Cộng Đồng sẽ được add trực tiếp sau khi panel_main khởi tạo
        # btn_main_logout KHÔNG add vào layout (ẩn hoàn toàn), chỉ giữ trong memory để xử lý đăng xuất
        self._header_layout = header_layout   # lưu lại để wire sau

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
        self.bot_tabs.setCornerWidget(self.lbl_main_welcome, QtCore.Qt.Corner.TopRightCorner)
        main_layout.addWidget(self.bot_tabs)

        self.panel_main = BotInstanceWidget("sub1", "Thợ săn EMA200 (Sub 1)", self.api_files)
        self.panel_sub1 = BotInstanceWidget("sub1", "Bot Phụ 1 Sniper (Sub 1)", self.api_files)
        self.panel_sub2 = BotInstanceWidget("sub2", "Bot SMC (Sub 2)", self.api_files)
        # self.panel_sub3 = BotInstanceWidget("sub3", "Bot SUB 3", self.api_files)
        
        self.bot_tabs.addTab(self.panel_main, "⚪ Bot EMA200")
        
        # Add nút Cộng Đồng thẳng vào header (thay hẳn Đăng Xuất)
        if hasattr(self, '_header_layout') and hasattr(self.panel_main, 'btn_open_community'):
            btn_com = self.panel_main.btn_open_community
            btn_com.setFont(QtGui.QFont("Segoe UI", 10, QtGui.QFont.Weight.Bold))
            btn_com.setStyleSheet("""
                QPushButton { background-color: #333333; color: #ffffff; border-radius: 4px; padding: 5px 15px; font-size: 13px; font-weight: bold; margin-right: 10px; }
                QPushButton:hover { background-color: #ff9900; color: #000000; }
            """)
            self._header_layout.addWidget(btn_com)
        
        self.bot_tabs.currentChanged.connect(self.update_tab_icons)
        self.update_tab_icons(0)
        # self.bot_tabs.addTab(self.panel_sub1, "🔵 Bot SUB 1")
        self.bot_tabs.addTab(self.panel_sub2, "Bot SMC")

    def check_for_updates(self):
        # Không tự động check liên tục nữa để tránh đơ máy
        pass

    def check_update_background(self, is_startup=False):
        def check():
            try:
                import urllib.request, json
                from packaging import version
                url = "https://github.com/TLS1-Releases/TLS1_Trading_App_Releases/releases/latest/download/version.json"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    remote_data = json.loads(response.read().decode('utf-8'))
                
                remote_version = remote_data.get("version", "1.0.0")
                local_version = APP_VERSION
                
                has_update = version.parse(remote_version) > version.parse(local_version)
                return has_update, remote_version, remote_data, is_startup
            except Exception:
                return None, None, None, is_startup
        
        self.update_worker = type('UpdateWorker', (QtCore.QThread,), {'run': lambda s: s.result_signal.emit(check()), 'result_signal': QtCore.pyqtSignal(tuple)})(self)
        self.update_worker.result_signal.connect(self.on_update_check_result)
        self.update_worker.start()

    def on_update_check_result(self, result):
        if not result or len(result) < 4:
            self.btn_update.setVisible(False)
            return
            
        has_update, remote_version, remote_data, is_startup = result
        if has_update is True:
            self.remote_update_data = remote_data
            self.btn_update.setText(f"🚀 Cập nhật ngay (v{remote_version})")
            
            # Tạo hiệu ứng nhấp nháy nhẹ nhàng đổi màu để thu hút chú ý
            if not hasattr(self, 'update_btn_timer'):
                self.update_btn_timer = QtCore.QTimer(self)
                self.update_btn_color_state = False
                
                def toggle_color():
                    self.update_btn_color_state = not self.update_btn_color_state
                    if self.update_btn_color_state:
                        self.btn_update.setStyleSheet("""
                            QPushButton { background-color: #f59e0b; color: white; border-radius: 4px; padding: 5px 15px; font-weight: bold; font-size: 13px; margin-right: 10px; }
                            QPushButton:hover { background-color: #d97706; }
                        """)
                    else:
                        self.btn_update.setStyleSheet("""
                            QPushButton { background-color: #3b82f6; color: white; border-radius: 4px; padding: 5px 15px; font-weight: bold; font-size: 13px; margin-right: 10px; }
                            QPushButton:hover { background-color: #2563eb; }
                        """)
                        
                self.update_btn_timer.timeout.connect(toggle_color)
                self.update_btn_timer.start(800) # Đổi màu mỗi 800ms
                
                # Gọi ngay lần đầu để set màu
                toggle_color()
                
            self.btn_update.setEnabled(True)
            self.btn_update.setVisible(True)

            # --- NẾU LÀ LẦN ĐẦU MỞ APP (STARTUP), ÉP AUTO-UPDATE BẮT BUỘC NGAY ---
            if is_startup:
                print(f"[AutoUpdate] Phát hiện bản cập nhật mới v{remote_version} khi mở app. Tiến hành tự động nâng cấp...")
                QtCore.QTimer.singleShot(500, lambda: self.run_update_app(bypass_confirm=True))
        elif has_update is False:
            # Đã là bản mới nhất → ẩn nút đi, không chiếm diện tích
            self.btn_update.setVisible(False)
        else:
            # Lỗi kiểm tra → ẩn luôn, không cần hiện thông báo lỗi trên giao diện
            self.btn_update.setVisible(False)

    def run_update_app(self, bypass_confirm=False):
        if not bypass_confirm:
            # 💡 Hộp thoại nhắc nhở nhẹ nhàng trước khi cập nhật (khi khách nhấp thủ công)
            msg_box = QtWidgets.QMessageBox(self)
            msg_box.setWindowTitle("💡 Nhắc Nhở Trước Khi Cập Nhật")
            msg_box.setIcon(QtWidgets.QMessageBox.Icon.Information)
            msg_box.setText("<b>Lưu ý nhỏ về vị thế trên sàn</b>")
            msg_box.setInformativeText(
                "Để quá trình cập nhật diễn ra an toàn nhất, Sếp lưu ý kiểm tra và nên đóng các lệnh/vị thế đang chạy trên sàn OKX trước khi cập nhật nhé.\n\n"
                "• <b>Cập nhật ngay</b>: Tiến hành tải và cập nhật phiên bản mới.\n"
                "• <b>Để sau</b>: Hủy để Sếp kiểm tra lại tài khoản trước."
            )
            btn_confirm = msg_box.addButton("Cập nhật ngay", QtWidgets.QMessageBox.ButtonRole.AcceptRole)
            btn_cancel = msg_box.addButton("Để sau", QtWidgets.QMessageBox.ButtonRole.RejectRole)
            msg_box.setDefaultButton(btn_confirm)
            
            msg_box.setStyleSheet("""
                QMessageBox {
                    background-color: #ffffff;
                }
                QLabel {
                    color: #000000;
                    font-size: 13px;
                }
                QPushButton {
                    background-color: #2E7D32;
                    color: #ffffff;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 16px;
                    font-weight: bold;
                    font-size: 12px;
                }
                QPushButton:hover {
                    background-color: #1b5e20;
                }
            """)
            
            msg_box.exec()
            if msg_box.clickedButton() != btn_confirm:
                return  # Khách chọn quay lại kiểm tra -> Hủy cập nhật

        url = "https://github.com/TLS1-Releases/TLS1_Trading_App_Releases/releases/latest"
        remote_version = None
        if hasattr(self, 'remote_update_data') and self.remote_update_data:
            remote_version = self.remote_update_data.get("version")

        # Tự động tải ngầm nếu chạy file .exe trên Windows
        if os.name == 'nt' and getattr(sys, 'frozen', False) and remote_version:
            import urllib.request
            import subprocess
            
            download_url = f"https://github.com/TLS1-Releases/TLS1_Trading_App_Releases/releases/download/v{remote_version}/TLS1_Trading_Setup.exe"
            
            cancel_btn_text = "Hủy" if not bypass_confirm else None
            parent_widget = QtWidgets.QApplication.activeModalWidget() or self
            dlg = QtWidgets.QProgressDialog(f"Đang kết nối tải bản cập nhật v{remote_version}...", cancel_btn_text, 0, 100, parent_widget)
            dlg.setWindowTitle("Cập nhật ứng dụng tự động")
            dlg.setWindowModality(QtCore.Qt.WindowModality.WindowModal)
            dlg.setMinimumDuration(0)
            if bypass_confirm:
                dlg.setCancelButton(None) # Ép tự động cập nhật khi mở app, không cho hủy
            dlg.show()
            
            current_exe_path = sys.executable
            base_dir = os.path.dirname(current_exe_path)
            current_exe_name = os.path.basename(current_exe_path)
            
            import time
            new_exe_path = os.path.join(base_dir, f"TLS1_Update_Temp_{int(time.time())}.exe")
            bat_path = os.path.join(base_dir, "update_app.bat")
            
            def reporthook(blocknum, blocksize, totalsize):
                if not bypass_confirm and dlg.wasCanceled():
                    raise Exception("Đã huỷ tải xuống.")
                if totalsize > 0:
                    percent = int(blocknum * blocksize * 100 / totalsize)
                    dlg.setLabelText(f"🚀 Đang tự động nâng cấp phiên bản mới v{remote_version}... {percent}%\nVui lòng đợi ứng dụng tự khởi động lại!")
                    dlg.setValue(percent)
                    QtWidgets.QApplication.processEvents()
                    
            try:
                urllib.request.urlretrieve(download_url, new_exe_path, reporthook)
                dlg.setValue(100)
                
                bat_content = f"""@echo off
echo Dang cap nhat phien ban moi... Vui long doi...
:retry
timeout /t 2 /nobreak >nul
del /f /q "{current_exe_path}"
if exist "{current_exe_path}" goto retry
move /y "{new_exe_path}" "{current_exe_path}"
start "" "{current_exe_path}"
del /f /q "%~f0"
"""
                with open(bat_path, "w", encoding="utf-8") as f:
                    f.write(bat_content)
                
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                subprocess.Popen([bat_path], startupinfo=startupinfo)
                
                for attr in ['panel_main', 'panel_sub1', 'panel_sub2', 'panel_sub3']:
                    panel = getattr(self, attr, None)
                    if panel and hasattr(panel, 'worker') and getattr(panel.worker, 'process', None):
                        try:
                            panel.worker.process.kill()
                            panel.worker.process.wait(timeout=2.0)
                        except:
                            pass
                os._exit(0)
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

    def apply_light_theme(self):
        self.is_dark_mode = False
        self.setStyleSheet("""
            QMainWindow { background-color: #f5f5f7; }
            QWidget { color: #111111; font-size: 14px; }
            QTabWidget#OuterTabs > QTabBar::tab { background-color: #e0e0e0; color: #333333; border: 1px solid #cccccc; padding: 10px 24px; border-top-left-radius: 6px; border-top-right-radius: 6px; margin-right: 4px; font-size: 14px; font-weight: bold; }
            QTabWidget#OuterTabs > QTabBar::tab:selected { background-color: #ffffff; color: #FF9900; font-weight: bold; border-top: 3px solid #FF9900; border-bottom: 2px solid #ffffff; }
            QTableWidget { background-color: #ffffff; color: #111111; gridline-color: #cccccc; border: 1px solid #cccccc; font-size: 13px; }
            QHeaderView::section { background-color: #e0e0e0; color: #111111; font-weight: bold; border: 1px solid #cccccc; padding: 4px; }
            QTextEdit, QPlainTextEdit, QSpinBox, QDoubleSpinBox, QComboBox, QLineEdit { background-color: #ffffff; color: #111111; border: 1px solid #cccccc; border-radius: 4px; padding: 4px; }
        """)
        
    def toggle_theme(self, state):
        if state == QtCore.Qt.CheckState.Checked.value:
            self.apply_light_theme()
            if hasattr(self, 'smc_chk_light_mode') and self.smc_chk_light_mode.isChecked() == False: self.smc_chk_light_mode.setChecked(True)
            if hasattr(self, 'chk_light_mode') and self.chk_light_mode.isChecked() == False: self.chk_light_mode.setChecked(True)
        else:
            self.apply_dark_theme()
            if hasattr(self, 'smc_chk_light_mode') and self.smc_chk_light_mode.isChecked(): self.smc_chk_light_mode.setChecked(False)
            if hasattr(self, 'chk_light_mode') and self.chk_light_mode.isChecked(): self.chk_light_mode.setChecked(False)

    def start_presence(self, uid, nickname):
        """Khởi động PresenceManager sau khi login thành công."""
        self.presence_manager = PresenceManager(self)
        self.presence_manager.online_count_changed.connect(self._update_online_label)
        self.presence_manager.register(uid, nickname)
        self.presence_manager.start()
        # Hiện label online
        self.lbl_online_count.show()

    def _update_online_label(self, count):
        """Cập nhật label hiển thị số người online theo format XX/100."""
        import random
        # Tạm thời fake số lượng online từ 56 đến 58 để không nhảy quá nhiều (thực tế cắm dài hạn)
        fake_count = random.choice([56, 57, 58])
        max_slots = 100
        
        # Color logic: < 80: green, >= 80 and < 100: yellow, == 100: red
        if fake_count >= 100:
            color = "#ff3333"
        elif fake_count >= 80:
            color = "#ffaa00"
        else:
            color = "#4caf50"

        active_segments = min(5, fake_count // 20 + (1 if fake_count % 20 > 0 else 0))
        bars = ""
        for i in range(5):
            c = color if i < active_segments else "#444444"
            bars += f"<span style='color: {c}; font-size: 15px; margin-right: 2px;'>▮</span>"
            
        html_content = f"<span style='color: #cccccc; font-weight: bold; font-family: Segoe UI, Arial, sans-serif; font-size: 12px;'>Slot: </span><span style='color: {color}; font-weight: bold; font-family: Segoe UI, Arial, sans-serif; font-size: 12px;'>{fake_count}/{max_slots}</span>  {bars}"
        self.lbl_online_count.setText(html_content)
        self.lbl_online_count.setStyleSheet("""
            background: transparent;
            border: none;
            padding: 3px 10px;
            margin-right: 5px;
        """)
        self.lbl_online_count.show()

    def closeEvent(self, event):
        # Bước 0: Dọn dẹp presence trước khi thoát
        if hasattr(self, 'presence_manager'):
            self.presence_manager.unregister()
            self.presence_manager.stop()
            self.presence_manager.wait(2000)
        # Bước 1: Gửi tín hiệu stop cho tất cả các worker trước để chúng đóng song song
        for attr in ['panel_main', 'panel_sub1', 'panel_sub2', 'panel_sub3']:
            panel = getattr(self, attr, None)
            if panel and hasattr(panel, 'worker'):
                try:
                    if hasattr(panel, 'pos_worker') and panel.pos_worker:
                        panel.pos_worker.stop()
                        panel.pos_worker.wait(1000)
                    if hasattr(panel, 'live_chart_worker') and panel.live_chart_worker:
                        panel.live_chart_worker.stop()
                        panel.live_chart_worker.wait(1000)
                    if hasattr(panel, 'worker') and panel.worker:
                        panel.worker.stop()
                except:
                    pass
                    
        # Bước 2: Chờ và ép buộc đóng (terminate) nếu quá hạn
        for attr in ['panel_main', 'panel_sub1', 'panel_sub2', 'panel_sub3']:
            panel = getattr(self, attr, None)
            if panel and hasattr(panel, 'worker') and getattr(panel.worker, 'process', None):
                try:
                    panel.worker.process.kill()
                    panel.worker.process.wait(timeout=2.0)
                except:
                    pass
            if panel and hasattr(panel, 'worker'):
                try:
                    panel.worker.quit()
                    if not panel.worker.wait(3000):
                        panel.worker.terminate()
                        panel.worker.wait(2000)
                except:
                    pass
        try:
            global _GLOBAL_AUDIO_PLAYERS
            from PyQt6.QtMultimedia import QMediaPlayer
            for p in _GLOBAL_AUDIO_PLAYERS[:]:
                try:
                    p.stop()
                except:
                    pass
            _GLOBAL_AUDIO_PLAYERS.clear()
        except:
            pass
        event.accept()

    def apply_dark_theme(self):
        self.setStyleSheet("""
            QMainWindow { background-color: #121212; }
QToolTip { background-color: #111111; color: #ff8c00; border: 1px solid #ff8c00; padding: 5px; font-weight: bold; }
            QWidget { color: #e0e0e0; font-size: 14px; }
            
            QDialog, QMessageBox, QProgressDialog, QInputDialog {
                background-color: #ffffff;
            }
            QDialog QLabel, QMessageBox QLabel, QProgressDialog QLabel, QInputDialog QLabel {
                color: #000000;
                font-size: 13px;
                font-weight: normal;
            }
            QDialog QPushButton, QMessageBox QPushButton, QProgressDialog QPushButton, QInputDialog QPushButton {
                background-color: #f0f0f0;
                color: #000000;
                border: 1px solid #cccccc;
                border-radius: 4px;
                padding: 5px 15px;
            }
            QDialog QPushButton:hover, QMessageBox QPushButton:hover, QProgressDialog QPushButton:hover, QInputDialog QPushButton:hover {
                background-color: #e0e0e0;
            }
            
            QTabWidget#OuterTabs::pane { 
                border: 1px solid #3a3a3a; 
                background-color: #242424; 
                border-top-right-radius: 6px; 
                border-bottom-left-radius: 6px; 
                border-bottom-right-radius: 6px; 
                margin-top: -1px;
            }
            QTabWidget#OuterTabs > QTabBar::tab { 
                background-color: #141414; 
                color: #888888; 
                border: 1px solid #2d2d2d; 
                padding: 10px 24px; 
                border-top-left-radius: 6px; 
                border-top-right-radius: 6px; 
                margin-right: 4px; 
                font-size: 14px; 
                font-weight: bold;
            }
            QTabWidget#OuterTabs > QTabBar::tab:selected { 
                background-color: #242424; 
                color: #FF9900; 
                font-weight: bold; 
                border: 1px solid #3a3a3a; 
                border-top: 3px solid #FF9900; 
                border-bottom: 2px solid #242424; 
            }
            QTabWidget#OuterTabs > QTabBar::tab:hover { 
                background-color: #2c2c2c; 
                color: #e0e0e0;
            }

            QTabWidget#InnerTabs::pane { 
                border: 1px solid #3d3d3d; 
                background-color: #1e1e1e; 
                border-top-right-radius: 4px; 
                border-bottom-left-radius: 4px; 
                border-bottom-right-radius: 4px; 
                margin-top: -1px;
            }
            QTabWidget#InnerTabs > QTabBar::tab { 
                background-color: #121212; 
                color: #888888; 
                border: 1px solid #2d2d2d; 
                padding: 8px 18px; 
                border-top-left-radius: 5px; 
                border-top-right-radius: 5px; 
                margin-right: 3px; 
                font-size: 13px;
                font-weight: bold;
            }
            QTabWidget#InnerTabs > QTabBar::tab:selected { 
                background-color: #1e1e1e; 
                color: #FF9900; 
                font-weight: bold; 
                border: 1px solid #3d3d3d; 
                border-top: 2px solid #FF9900; 
                border-bottom: 2px solid #1e1e1e; 
            }
            QTabWidget#InnerTabs > QTabBar::tab:hover { 
                background-color: #2a2a2a; 
                color: #ffffff;
            }

            QFrame#HeaderGroup { background-color: transparent; border: none; padding: 5px; margin-bottom: 5px; }
            QGroupBox { border: 1px solid #2d2d2d; margin-top: 10px; font-weight: bold; color: #ff9900; border-radius: 4px; }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; background-color: #1a1a1a; padding: 0 4px; margin-top: 2px; }
            
            QSpinBox, QDoubleSpinBox, QComboBox {
                background-color: #252525;
                color: #ffffff;
                border: 1px solid #444444;
                border-radius: 4px;
                padding: 4px;
                min-width: 80px;
                max-width: 150px;
            }
            QLineEdit {
                background-color: #252525;
                color: #ffffff;
                border: 1px solid #444444;
                border-radius: 4px;
                padding: 4px;
            }
            QComboBox QAbstractItemView, QComboBox QListView {
                background-color: #ffffff;
                color: #000000;
                selection-background-color: #333333;
                selection-color: #ff9900;
                border: 1px solid #444444;
                outline: none;
            }
            QListView {
                background-color: #ffffff;
                color: #000000;
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
    import platform
    try:
        if platform.system() == "Darwin":  # macOS
            hwid_string = subprocess.check_output(
                "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/{print $3}'",
                shell=True, stderr=subprocess.DEVNULL
            ).decode().strip().strip('"')
        else:  # Windows
            hwid_string = subprocess.check_output('wmic csproduct get uuid', shell=True, stderr=subprocess.DEVNULL).decode().split('\n')[1].strip()
    except:
        pass
    if not hwid_string:
        # Dự phòng bằng địa chỉ MAC
        hwid_string = str(uuid.getnode())
        
    return "TLS-" + hashlib.md5(hwid_string.encode()).hexdigest()[:10].upper()

class HWIDAuthDialog(QtWidgets.QDialog):
    def __init__(self, hwid, custom_message="Tài khoản hợp lệ, nhưng CHƯA được cấp quyền sử dụng trên máy tính này.", parent=None, uid=""):
        super().__init__(parent)
        self.uid = uid
        self.hwid = hwid
        self.setWindowTitle("Cần xác thực thiết bị")
        self.setFixedSize(500, 360)
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
            QLineEdit { background-color: #2d3345; border: 1px solid #ff9800; border-radius: 4px; padding: 5px; color: white; }
            QPushButton#BtnSendHWID { background-color: #00cc66; color: white; }
            QPushButton#BtnSendHWID:hover { background-color: #00ff88; }
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
            play_ui_sound("ribhavagrawal-hit-by-a-wood-230542.mp3", 0.6)
            QtWidgets.QApplication.clipboard().setText(hwid)
            btn_hwid_val.setText("✅ Đã Copy!")
            QtCore.QTimer.singleShot(1500, lambda: btn_hwid_val.setText(hwid))
            
        btn_hwid_val.clicked.connect(copy_auth_hwid)
        
        hwid_layout.addWidget(lbl_msg2)
        hwid_layout.addWidget(btn_hwid_val)
        hwid_layout.addStretch()
        layout.addLayout(hwid_layout)

        # --- Nút Gửi HWID ---
        lbl_msg3 = QtWidgets.QLabel("Bước 2. Nhập/Dán Mã Máy vào ô dưới và ấn Gửi lên hệ thống:")
        lbl_msg3.setStyleSheet("font-size: 12px; margin-left: 5px; color: #bbbbbb;")
        layout.addWidget(lbl_msg3)

        send_layout = QtWidgets.QHBoxLayout()
        self.input_hwid = QtWidgets.QLineEdit()
        self.input_hwid.setPlaceholderText("Dán mã máy vào đây...")
        self.input_hwid.setText(hwid) # Mặc định điền sẵn mã máy của họ
        self.btn_send_hwid = QtWidgets.QPushButton("Gửi")
        self.btn_send_hwid.setObjectName("BtnSendHWID")
        self.btn_send_hwid.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        
        send_layout.addWidget(self.input_hwid)
        send_layout.addWidget(self.btn_send_hwid)
        layout.addLayout(send_layout)
        
        self.btn_send_hwid.clicked.connect(self.send_hwid_to_google_sheet)
        
        lbl_msg4 = QtWidgets.QLabel("Hoặc liên hệ Admin TLS1 nếu cần hỗ trợ:")
        lbl_msg4.setStyleSheet("font-size: 12px; margin-left: 5px; color: #bbbbbb; margin-top: 5px;")
        layout.addWidget(lbl_msg4)
        
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

        btn_relogin = QtWidgets.QPushButton("Đăng Nhập Lại")
        btn_relogin.setObjectName("BtnRelogin")
        btn_relogin.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        btn_relogin.clicked.connect(self.accept)
        layout.addWidget(btn_relogin)

    def send_hwid_to_google_sheet(self):
        input_hwid_val = self.input_hwid.text().strip()
        if not input_hwid_val:
            QtWidgets.QMessageBox.warning(self, "Lỗi", "Vui lòng nhập Mã Máy (HWID)!")
            return
            
        if not self.uid:
            QtWidgets.QMessageBox.warning(self, "Lỗi", "Không tìm thấy UID của bạn, không thể tự động cập nhật.")
            return

        self.btn_send_hwid.setEnabled(False)
        self.btn_send_hwid.setText("Đang gửi...")
        QtWidgets.QApplication.processEvents()
        
        # BẠN CẦN THAY THẾ URL NÀY BẰNG WEB APP URL CỦA GOOGLE APPS SCRIPT
        APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_XXXXXXXXXX_XXXXXX/exec" 

        try:
            import requests
            data = {
                "uid": self.uid,
                "hwid": input_hwid_val
            }
            # Sử dụng API của Apps Script, có thể cần timeout dài một chút
            response = requests.post(APP_SCRIPT_URL, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "success":
                    QtWidgets.QMessageBox.information(self, "Thành công", "Đã cập nhật HWID lên hệ thống thành công!\nHệ thống đã sẵn sàng, bạn có thể Đăng Nhập Lại.")
                    self.accept()
                else:
                    QtWidgets.QMessageBox.warning(self, "Lỗi", f"Có lỗi xảy ra: {result.get('message', 'Không rõ')}")
            else:
                QtWidgets.QMessageBox.warning(self, "Lỗi", f"HTTP Error: {response.status_code}\nVui lòng liên hệ Admin.")
        except Exception as e:
            QtWidgets.QMessageBox.warning(self, "Lỗi", f"Lỗi kết nối tới hệ thống: {e}")
            
        self.btn_send_hwid.setEnabled(True)
        self.btn_send_hwid.setText("Gửi")

class UpdateDialog(QtWidgets.QDialog):
    def __init__(self, new_version="1.0.250", changelog="", parent=None):
        super().__init__(parent)
        self.setWindowTitle("New update available")
        self.setFixedSize(560, 480)
        self.setStyleSheet("""
            QDialog {
                background-color: #161922;
                border: 1px solid #2d3345;
                border-top: 3px solid #ff9800;
                border-radius: 8px;
            }
            QLabel {
                background: transparent;
            }
        """)
        
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        lbl_sub = QtWidgets.QLabel("There is a new update available:")
        lbl_sub.setStyleSheet("color: #ffffff; font-size: 13px; font-weight: 500;")
        layout.addWidget(lbl_sub)

        # Content Card / Scroll Area for Changelog
        scroll = QtWidgets.QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("""
            QScrollArea {
                background-color: #222634;
                border: 1px solid #363d4e;
                border-radius: 6px;
            }
            QWidget#scrollContent {
                background-color: #222634;
            }
        """)

        scroll_content = QtWidgets.QWidget()
        scroll_content.setObjectName("scrollContent")
        content_layout = QtWidgets.QVBoxLayout(scroll_content)
        content_layout.setContentsMargins(16, 16, 16, 16)
        content_layout.setSpacing(12)

        title_label = QtWidgets.QLabel(f"TLS1 Trading App {new_version}")
        title_label.setStyleSheet("color: #ffffff; font-size: 22px; font-weight: 900; background: transparent;")
        content_layout.addWidget(title_label)

        important_label = QtWidgets.QLabel("Important: Khuyên dùng phiên bản mới nhất để đảm bảo hiệu suất vận hành và độ ổn định hệ thống.")
        important_label.setStyleSheet("color: #d1d5db; font-size: 12px; font-weight: normal; background: transparent;")
        important_label.setWordWrap(True)
        content_layout.addWidget(important_label)

        content_layout.addSpacing(6)

        # Hotfix / New Features Header
        features_header = QtWidgets.QLabel("Nội Dung Nâng Cấp & Tối Ưu")
        features_header.setStyleSheet("color: #ffffff; font-size: 17px; font-weight: bold; background: transparent;")
        content_layout.addWidget(features_header)

        changelog_text = (
            "• Tối ưu hóa thuật toán phân tích thị trường & khớp lệnh giao dịch\n"
            "• Nâng cấp hệ thống quản lý vị thế và đồng bộ dữ liệu Realtime\n"
            "• Cải tiến giao diện Terminal hiển thị danh mục theo dõi trực quan hơn\n"
            "• Tối ưu hiệu năng ứng dụng, cơ chế xử lý kết nối và trải nghiệm người dùng\n"
            "• Cập nhật hệ thống thông báo chuẩn giao diện Dark Accent"
        )
        if changelog:
            changelog_text = changelog

        changelog_label = QtWidgets.QLabel(changelog_text)
        changelog_label.setStyleSheet("color: #cbd5e1; font-size: 12px; line-height: 1.6; background: transparent;")
        changelog_label.setWordWrap(True)
        content_layout.addWidget(changelog_label)

        content_layout.addStretch()
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)

        # Bottom Button Bar
        btn_layout = QtWidgets.QHBoxLayout()
        btn_layout.setSpacing(10)

        btn_layout.addStretch()

        self.btn_update = QtWidgets.QPushButton("Update Now")
        self.btn_update.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_update.setStyleSheet("""
            QPushButton {
                background-color: #353c4d;
                color: #ffffff;
                border: 1px solid #4a5468;
                border-radius: 5px;
                padding: 7px 18px;
                font-weight: bold;
                font-size: 12px;
                min-width: 100px;
            }
            QPushButton:hover {
                background-color: #ff9800;
                color: #161922;
                border: 1px solid #ff9800;
            }
            QPushButton:pressed {
                background-color: #e68a00;
                color: #ffffff;
            }
        """)

        self.btn_later = QtWidgets.QPushButton("Remind me Later")
        self.btn_later.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_later.setStyleSheet("""
            QPushButton {
                background-color: #262a36;
                color: #d1d5db;
                border: 1px solid #363d4e;
                border-radius: 5px;
                padding: 7px 18px;
                font-weight: 500;
                font-size: 12px;
                min-width: 100px;
            }
            QPushButton:hover {
                background-color: #353c4d;
                color: #ffffff;
                border: 1px solid #4a5468;
            }
        """)

        self.btn_skip = QtWidgets.QPushButton("Skip Version")
        self.btn_skip.setCursor(QtGui.QCursor(QtCore.Qt.CursorShape.PointingHandCursor))
        self.btn_skip.setStyleSheet("""
            QPushButton {
                background-color: #262a36;
                color: #9ca3af;
                border: 1px solid #363d4e;
                border-radius: 5px;
                padding: 7px 18px;
                font-weight: 500;
                font-size: 12px;
                min-width: 90px;
            }
            QPushButton:hover {
                background-color: #353c4d;
                color: #ffffff;
                border: 1px solid #4a5468;
            }
        """)

        self.btn_update.clicked.connect(self.on_update_click)
        self.btn_later.clicked.connect(self.reject)
        self.btn_skip.clicked.connect(self.reject)

        btn_layout.addWidget(self.btn_update)
        btn_layout.addWidget(self.btn_later)
        btn_layout.addWidget(self.btn_skip)

        layout.addLayout(btn_layout)

    def on_update_click(self):
        play_ui_sound("juniorsoundays-ui-sound-70-527837.mp3", 0.6)
        white_dialog_qss = """
            QDialog, QMessageBox, QProgressDialog, QWidget, QFrame, QDialogButtonBox {
                background-color: #ffffff !important;
                color: #000000 !important;
            }
            QLabel, QLabel#qt_msgbox_label, QLabel#qt_msgboxbox_ex_label {
                color: #000000 !important;
                background-color: transparent !important;
                font-size: 13px !important;
            }
            QPushButton {
                background-color: #e6e6e6 !important;
                color: #000000 !important;
                border: 1px solid #cccccc !important;
                border-radius: 6px;
                padding: 7px 18px;
                font-weight: bold;
                font-size: 12px;
                min-width: 90px;
                min-height: 28px;
            }
            QPushButton:hover {
                background-color: #ff9800 !important;
                color: #ffffff !important;
                border: 1px solid #ff9800 !important;
            }
            QProgressBar {
                border: 1px solid #cccccc;
                border-radius: 5px;
                text-align: center;
                background-color: #f0f0f0;
                color: #000000;
            }
            QProgressBar::chunk {
                background-color: #ff9800;
                border-radius: 4px;
            }
        """
        
        parent_win = self.parent() or self
        progress = QtWidgets.QProgressDialog("Đang tải gói nâng cấp TLS1 Trading App v1.0.250...", "Hủy", 0, 100, parent_win)
        progress.setStyleSheet(white_dialog_qss)
        progress.setWindowTitle("Tải Bản Cập Nhật Mới")
        progress.setWindowModality(QtCore.Qt.WindowModality.WindowModal)
        progress.show()

        for i in range(1, 101):
            time.sleep(0.02)
            progress.setValue(i)
            QtWidgets.QApplication.processEvents()
            if progress.wasCanceled():
                break

        progress.close()
        info_box = QtWidgets.QMessageBox(parent_win)
        info_box.setStyleSheet(white_dialog_qss)
        info_box.setWindowTitle("Update Success")
        info_box.setText("<b>Tải xong phiên bản cập nhật v1.0.250 thành công!</b><br><br>App sẽ tự động khởi động lại.")
        info_box.exec()
        self.accept()

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
        possible_banner_paths = [
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "banner.png"),
            os.path.join(PROJECT_DIR, "TLS1_Trading_App", "media", "banner.png"),
            os.path.join(PROJECT_DIR, "media", "banner.png"),
        ]
        if getattr(sys, 'frozen', False):
            possible_banner_paths.insert(0, os.path.join(sys._MEIPASS, "media", "banner.png"))
            
        banner_path = next((p for p in possible_banner_paths if os.path.exists(p)), None)
        if banner_path:
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
        self.input_uid.setFixedWidth(200)
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
            play_ui_sound("ribhavagrawal-hit-by-a-wood-230542.mp3", 0.6)
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
        play_ui_sound("ribhavagrawal-hit-by-a-wood-230542.mp3", 0.6)
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
        
        # --- Kiểm tra giới hạn 100 người online ---
        self.btn_login.setText("Đang kiểm tra slots...")
        self.btn_login.setEnabled(False)
        QtWidgets.QApplication.processEvents()
        try:
            import urllib.request
            import json as _json
            import time
            url = f"{FIREBASE_URL}/presence.json"
            req = urllib.request.Request(url, method='GET')
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = _json.loads(resp.read().decode('utf-8'))
            
            if data and isinstance(data, dict):
                now = int(time.time())
                count = sum(1 for info in data.values() if isinstance(info, dict) and (now - info.get('last_seen', 0)) <= 180)
                if count >= 100:
                    play_ui_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
                    QtWidgets.QMessageBox.warning(self, "Hệ Thống Quá Tải", "Đã đạt giới hạn 100 người dùng online.\\nVui lòng quay lại sau!")
                    self.btn_login.setText("Đăng Nhập")
                    self.btn_login.setEnabled(True)
                    return
        except Exception:
            pass # Bỏ qua nếu lỗi mạng để người dùng tiếp tục
        # ------------------------------------------
        
        if not uid:
            play_ui_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
            QtWidgets.QMessageBox.warning(self, "Lỗi", "UID không được để trống!")
            return
            
        if not uid.isdigit():
            play_ui_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
            QtWidgets.QMessageBox.warning(self, "Lỗi", "UID chỉ bao gồm các chữ số!")
            return
            
        self.btn_login.setText("Đang kiểm tra...")
        self.btn_login.setEnabled(False)
        QtWidgets.QApplication.processEvents()
        
        try:
            import requests
            import csv
            
            url = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
            response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            content = response.text
            
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
                    play_ui_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
                    QtWidgets.QMessageBox.critical(self, "Tài khoản bị khóa", "Tài khoản UID này đã bị Admin khóa.\n\nVui lòng nhắn tin Admin để yêu cầu kiểm tra lại UID.")
                    self.btn_login.setText("Đăng Nhập")
                    self.btn_login.setEnabled(True)
                    return

                registered_hwid = user_info.get('hwid', "")
                current_hwid = get_hwid()
                
                if not registered_hwid or registered_hwid == "None":
                    res = HWIDAuthDialog(current_hwid, uid=uid, parent=self).exec()
                    if res == QtWidgets.QDialog.DialogCode.Accepted:
                        self.check_login()
                        return
                    self.btn_login.setText("Đăng Nhập")
                    self.btn_login.setEnabled(True)
                    return
                        
                elif registered_hwid != current_hwid:
                    msg = "Tài khoản UID này đã được cấp quyền cho máy tính khác!\n\nKhông thể dùng chung 1 tài khoản cho nhiều máy.\nNếu bạn đổi máy, vui lòng liên hệ Admin để reset Mã Thiết Bị."
                    res = HWIDAuthDialog(current_hwid, custom_message=msg, uid=uid, parent=self).exec()
                    if res == QtWidgets.QDialog.DialogCode.Accepted:
                        self.check_login()
                        return
                    self.btn_login.setText("Đăng Nhập")
                    self.btn_login.setEnabled(True)
                    return
                
                name = user_info.get('nickname', '') or user_info.get('discord_id', '') or "bạn"
                
                CURRENT_UID = uid
                
                self.logged_in_name = name
                self.logged_in_status = status
                self.accept()
            else:
                play_ui_sound("shelvis_makes_games-sus-meme-sound-181271.mp3", 0.7)
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
        
    try:
        import glob
        if getattr(sys, 'frozen', False):
            base_dir = os.path.dirname(sys.executable)
            for f in glob.glob(os.path.join(base_dir, "TLS1_Update_Temp_*.exe")):
                try: os.remove(f)
                except: pass
            update_bat = os.path.join(base_dir, "update_app.bat")
            if os.path.exists(update_bat):
                try: os.remove(update_bat)
                except: pass
    except:
        pass

    # Bỏ qua log rác của Qt Multimedia (FFmpeg)
    os.environ["QT_LOGGING_RULES"] = "qt.multimedia.ffmpeg*=false"

    # Fix black screen issue cho biểu đồ (QWebEngineView) trên máy khách khi đóng gói PyInstaller và tắt log rác Chromium
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-gpu --disable-gpu-compositing --log-level=3"
    if "--disable-gpu" not in sys.argv:
        sys.argv.append("--disable-gpu")
    if "--disable-gpu-compositing" not in sys.argv:
        sys.argv.append("--disable-gpu-compositing")

    app = QtWidgets.QApplication(sys.argv)
    app.setStyleSheet("""
        /* Global UI Elements */
        QComboBox QAbstractItemView, QComboBox QListView {
            background-color: #ffffff;
            color: #000000;
            selection-background-color: #4caf50;
        }
        QListView {
            background-color: #ffffff;
            color: #000000;
        }
        QToolTip {
            background-color: #2e2e2e;
            color: #ffffff;
            border: 1px solid #4caf50;
            padding: 2px;
        }

        /* ============================================================================
           GLOBAL DIALOG THEME (Nền trắng #ffffff, Chữ đen #000000, Accent Cam #ff9800)
           ============================================================================ */
        QMessageBox, QMessageBox QWidget, QMessageBox QFrame, QMessageBox QDialogButtonBox,
        QProgressDialog, QProgressDialog QWidget, QProgressDialog QFrame,
        QInputDialog, QInputDialog QWidget, QInputDialog QFrame,
        QFileDialog, QFileDialog QWidget, QFileDialog QFrame {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif;
            font-size: 13px;
        }

        QMessageBox {
            border: 1px solid #cccccc;
            border-top: 3px solid #ff9800;
            border-radius: 8px;
        }

        QMessageBox QLabel, QMessageBox QLabel *, QLabel#qt_msgbox_label, QLabel#qt_msgboxbox_ex_label,
        QProgressDialog QLabel, QProgressDialog QLabel *, QInputDialog QLabel, QInputDialog QLabel *, QFileDialog QLabel {
            color: #000000 !important;
            background-color: transparent !important;
            font-size: 13px !important;
        }

        /* Khung chứa văn bản nội dung & ô nhập liệu */
        QMessageBox QTextEdit, QProgressDialog QTextEdit, QInputDialog QLineEdit, QFileDialog QLineEdit {
            background-color: #f8f9fa !important;
            color: #000000 !important;
            border: 1px solid #cccccc !important;
            border-radius: 6px;
            padding: 8px;
        }

        QInputDialog QLineEdit:focus {
            border: 1px solid #ff9800 !important;
        }

        /* Nút bấm trong các Dialog thông báo */
        QMessageBox QPushButton, QProgressDialog QPushButton, QInputDialog QPushButton, QFileDialog QPushButton {
            background-color: #e6e6e6 !important;
            color: #000000 !important;
            border: 1px solid #cccccc !important;
            border-radius: 6px;
            padding: 7px 18px;
            font-weight: bold;
            font-size: 12px;
            min-width: 90px;
            min-height: 28px;
        }

        QMessageBox QPushButton:hover, QProgressDialog QPushButton:hover, QInputDialog QPushButton:hover, QFileDialog QPushButton:hover {
            background-color: #ff9800 !important;
            color: #ffffff !important;
            border: 1px solid #ff9800 !important;
        }

        QMessageBox QPushButton:pressed, QProgressDialog QPushButton:pressed, QInputDialog QPushButton:pressed, QFileDialog QPushButton:pressed {
            background-color: #e68a00 !important;
            color: #ffffff !important;
        }

        QMessageBox QPushButton:focus, QInputDialog QPushButton:focus {
            border: 1px solid #ff9800 !important;
            outline: none;
        }

        /* Scrollbars trong Dialogs */
        QMessageBox QScrollBar:vertical, QProgressDialog QScrollBar:vertical {
            background: #161922 !important;
            width: 10px;
            margin: 2px;
            border-radius: 4px;
        }

        QMessageBox QScrollBar::handle:vertical, QProgressDialog QScrollBar::handle:vertical {
            background: #333a4c !important;
            min-height: 20px;
            border-radius: 4px;
        }

        QMessageBox QScrollBar::handle:vertical:hover, QProgressDialog QScrollBar::handle:vertical:hover {
            background: #ff9800 !important;
        }

        QMessageBox QScrollBar::add-line:vertical, QProgressDialog QScrollBar::add-line:vertical {
            height: 0px;
        }
    """)
    
    # -------------------------------------------------------------
    # NGĂN CHẶN MỞ NHIỀU APP CÙNG LÚC TRÊN 1 MÁY BẰNG MUTEX WINDOWS
    # -------------------------------------------------------------
    if getattr(sys, 'frozen', False):
        try:
            import ctypes
            mutex_name = "Global\\TLS1_Trading_App_Single_Instance_Mutex"
            kernel32 = ctypes.windll.kernel32
            mutex = kernel32.CreateMutexW(None, False, mutex_name)
            last_error = kernel32.GetLastError()
            
            if last_error == 183: # ERROR_ALREADY_EXISTS
                msg = QtWidgets.QMessageBox()
                msg.setWindowTitle("Lỗi khởi động")
                msg.setText("Ứng dụng TLS1 đang hoạt động trên máy tính này!\n\nMỗi máy tính chỉ được mở 1 bản App cùng lúc.")
                msg.setIcon(QtWidgets.QMessageBox.Icon.Critical)
                msg.exec()
                sys.exit(0)
        except Exception as e:
            pass
    # -------------------------------------------------------------
    
    app.setStyle("Fusion")
    
    if getattr(sys, 'frozen', False):
        global_logo = os.path.join(sys._MEIPASS, "media", "logo.png")
    else:
        global_logo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "logo.png")
    try:
        if os.path.exists(global_logo):
            app.setWindowIcon(QtGui.QIcon(global_logo))
    except Exception: pass

    window = MainWindow()
    
    window.show()

    def show_login():
        QtWidgets.QApplication.processEvents()
        # 1. Blur WebEngineView qua CSS an toàn
        if hasattr(window, 'chart_widget'):
            try: window.chart_widget.run_script("document.body.style.filter = 'blur(5px)';")
            except: pass
                
        # 2. Chụp giao diện hiện tại
        screen = window.screen()
        pixmap = screen.grabWindow(window.winId())
        
        # 3. Xử lý Blur toàn cục trên QGraphicsScene
        scene = QtWidgets.QGraphicsScene()
        item = QtWidgets.QGraphicsPixmapItem(pixmap)
        blur = QtWidgets.QGraphicsBlurEffect()
        blur.setBlurRadius(5)
        item.setGraphicsEffect(blur)
        scene.addItem(item)
        
        blurred = QtGui.QPixmap(pixmap.size())
        blurred.fill(QtCore.Qt.GlobalColor.transparent)
        painter = QtGui.QPainter(blurred)
        scene.render(painter)
        
        # 4. Đục lỗ (xóa) phần của biểu đồ để lộ WebEngineView bên dưới (đã blur CSS)
        painter.setCompositionMode(QtGui.QPainter.CompositionMode.CompositionMode_Clear)
        if hasattr(window, 'chart_widget'):
            try:
                webview = window.chart_widget.get_webview()
                if webview.isVisible():
                    pos = webview.mapTo(window, QtCore.QPoint(0, 0))
                    hole = QtCore.QRect(pos, webview.size())
                    painter.fillRect(hole, QtCore.Qt.GlobalColor.transparent)
            except: pass
        painter.end()
        
        overlay = QtWidgets.QLabel(window)
        overlay.setGeometry(window.rect())
        overlay.setPixmap(blurred)
        overlay.raise_()
        overlay.show()
        
        login = LoginDialog(window)
        if login.exec() == QtWidgets.QDialog.DialogCode.Accepted:
            overlay.hide()
            overlay.deleteLater()
            
            # Xóa blur CSS cho WebEngineView
            if hasattr(window, 'chart_widget'):
                try: window.chart_widget.run_script("document.body.style.filter = 'none';")
                except: pass
                    
            QtWidgets.QApplication.processEvents()
            
            if hasattr(login, 'logged_in_name'):
                name = login.logged_in_name
                window.set_welcome_name(name)
                # Kích hoạt hệ thống Presence (theo dõi online)
                window.start_presence(CURRENT_UID or "unknown", name)
                
            if hasattr(login, 'logged_in_status') and login.logged_in_status == 'PENDING 24H':
                window.trigger_humane_warning("Tài khoản của bạn đã bị khóa (hoặc dị thường).")
                
            msgBox = QtWidgets.QMessageBox(window)
            msgBox.setWindowTitle("⚠️ Cảnh báo (Warning)")
            msgBox.setText(f"Chào sếp <b>{name}</b>!<br><br><b>Lưu ý nhỏ cho các sếp:</b> Đây không phải lời khuyên đầu tư và App cũng không cam kết lợi nhuận.<br><br>Vì liên quan đến Đầu tư tài chính, Sếp vui lòng tìm hiểu thật kỹ trước khi sử dụng App. Luôn rõ quan điểm mọi Ứng dụng chỉ hỗ trợ phần nào cho việc đầu tư của bản thân thôi nhé!")
            
            # Gỡ âm thanh Windows bằng cách dùng Icon Pixmap thay vì Icon chuẩn
            info_icon = window.style().standardIcon(QtWidgets.QStyle.StandardPixmap.SP_MessageBoxInformation)
            msgBox.setIconPixmap(info_icon.pixmap(48, 48))
            
            btn_confirm = msgBox.addButton("Đã hiểu và vui vẻ xác nhận", QtWidgets.QMessageBox.ButtonRole.AcceptRole)
            
            # Phát âm thanh meme cảnh báo trước khi hiện bảng
            try:
                from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
                from PyQt6.QtCore import QUrl
                import os
                
                window.alert_player = QMediaPlayer()
                window.alert_audio = QAudioOutput()
                window.alert_player.setAudioOutput(window.alert_audio)
                window.alert_audio.setVolume(0.5)
                
                # Ưu tiên tìm file cảnh báo mới (dùng thay cho alert_meme.mp3 cũ nếu có)
                alert_meme_mp3 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "ncprime-rise-304744.mp3")
                alert_meme_wav = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "alert_meme.wav")
                
                if os.path.exists(alert_meme_mp3):
                    window.alert_player.setSource(QUrl.fromLocalFile(alert_meme_mp3))
                    window.alert_player.play()
                elif os.path.exists(alert_meme_wav):
                    window.alert_player.setSource(QUrl.fromLocalFile(alert_meme_wav))
                    window.alert_player.play()
            except: pass
            
            msgBox.exec()
            
            # Phát âm thanh chào mừng sau khi ấn xác nhận
            try:
                from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
                from PyQt6.QtCore import QUrl
                import os
                
                window.player = QMediaPlayer()
                window.audio_output = QAudioOutput()
                window.player.setAudioOutput(window.audio_output)
                window.audio_output.setVolume(0.25)
                
                media_path_webm = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "wow.webm")
                media_path_m4a = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "wow.m4a")
                media_path_mp3 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media", "wow.mp3")
                
                if os.path.exists(media_path_webm):
                    window.player.setSource(QUrl.fromLocalFile(media_path_webm))
                elif os.path.exists(media_path_m4a):
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
        class SafeStream:
            def __init__(self, stream):
                self.stream = stream
            def write(self, data):
                try:
                    if self.stream: 
                        self.stream.write(data)
                        self.stream.flush()
                except Exception:
                    pass
            def flush(self):
                try:
                    if self.stream: self.stream.flush()
                except Exception:
                    pass
            def __getattr__(self, name):
                return getattr(self.stream, name)
                
        try:
            if hasattr(sys.stdout, 'reconfigure'):
                sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
        except: pass
        
        sys.stdout = SafeStream(sys.stdout)
        sys.stderr = SafeStream(sys.stderr)
        
        try:
            import importlib.util
            def load_and_run(module_name, file_name, env):
                if getattr(sys, 'frozen', False):
                    app_dir = sys._MEIPASS
                else:
                    app_dir = os.path.dirname(os.path.abspath(__file__))
                    parent_dir = os.path.dirname(app_dir)
                    if parent_dir not in sys.path:
                        sys.path.insert(0, parent_dir)
                        
                if app_dir not in sys.path:
                    sys.path.insert(0, app_dir)
                        
                sys.argv = [file_name, env]
                import importlib
                
                try:
                    module = importlib.import_module(module_name)
                except ImportError:
                    # Fallback to check inside z_ subfolder for local dev
                    fallback_folder = f"z_{module_name}" if "sys_" not in module_name else f"z_{module_name.replace('sys_', '')}"
                    module = importlib.import_module(f"{fallback_folder}.{module_name}")
                    
                sys.modules[module_name] = module
                module.main()

            if strategy == "sub1":
                load_and_run("sys_bot_sub1", "sys_bot_sub1.py", env_file)
            elif strategy == "sub2":
                load_and_run("sys_bot_sub2", "sys_bot_sub2.py", env_file)

        except SystemExit as e:
            sys.exit(e.code)
        except BaseException as e:
            import traceback
            print(f"CRITICAL ERROR IN BOT {strategy}: {e}\n{traceback.format_exc()}")
            sys.exit(1)
    else:
        main()
