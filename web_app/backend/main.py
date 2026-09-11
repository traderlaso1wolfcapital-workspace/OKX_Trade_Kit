import os
import sys
import json
import time
import asyncio
import subprocess
import psutil
import hmac
import hashlib
import base64
import requests
import csv
from datetime import datetime, timezone
from typing import Optional, List, Dict, Union
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title="TLS1 Trading Web Backend", version="1.0.0")

@app.get("/api/auth/verify")
def verify_uid(uid: str):
    if uid == "admtls12021":
        return {"status": "success", "message": "Admin login successful", "uid": uid}
    try:
        url = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        content = resp.text
        
        reader = csv.reader(content.splitlines())
        next(reader, None) # skip header
        
        for row in reader:
            if row and len(row) >= 6 and row[0].strip().isdigit():
                if row[0].strip() == uid:
                    user_status = row[5].strip().upper()
                    if user_status == "ACTIVE":
                        return {"status": "success", "uid": uid}
                    else:
                        return {"status": "error", "message": f"Tài khoản đang bị khóa ({user_status})"}
        return {"status": "error", "message": "UID không tồn tại hoặc chưa đăng ký!"}
    except Exception as e:
        return {"status": "error", "message": f"Lỗi máy chủ kiểm tra UID: {str(e)}"}


# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths Setup
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Vi tri moi: nam trong OKX_Trade_Kit/TLS1_Trading_Web/backend
OKX_TRADE_KIT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
XGUI_MAIN_PATH = os.path.join(OKX_TRADE_KIT_DIR, "xGui_main.py")
sys.path.append(OKX_TRADE_KIT_DIR)


# AppData path của TLS1_Trading
LOCAL_APP_DATA = os.environ.get("LOCALAPPDATA", os.path.join(os.path.expanduser("~"), "AppData", "Local"))

def get_user_base_dir(uid: str) -> str:
    safe_uid = "".join(c for c in uid if c.isalnum() or c in ('_', '-'))
    if not safe_uid: safe_uid = "default"
    return os.path.join(LOCAL_APP_DATA, "TLS1_Trading_Users", safe_uid)

def get_user_data_dir(uid: str) -> str:
    return os.path.join(get_user_base_dir(uid), "TLS1_Trading")

# Trạng thái tiến trình bot (hỗ trợ multi-tenant)
# Nested dictionaries: dict[uid][strategy]
bot_processes = {}
bot_start_times = {}
bot_log_queues = {}
active_connections = {}

def get_nested(d: dict, k1: str, k2: str, default=None):
    return d.get(k1, {}).get(k2, default)

def set_nested(d: dict, k1: str, k2: str, val):
    if k1 not in d: d[k1] = {}
    d[k1][k2] = val

def del_nested(d: dict, k1: str, k2: str):
    if k1 in d and k2 in d[k1]:
        del d[k1][k2]

class ConfigUpdate(BaseModel):
    enabled_tfs: Optional[Union[List[str], Dict[str, List[str]]]] = None
    enabled_coins: Optional[List[str]] = None
    position_volume: Optional[float] = None
    scalping_tp_pct: Optional[float] = None
    scalping_sl_pct: Optional[float] = None

class CredentialsUpdate(BaseModel):
    api_key: str
    secret_key: str
    passphrase: str

class AccountCreate(BaseModel):
    name: str
    id: Optional[str] = None

class LoginRequest(BaseModel):
    uid: str
    password: str = None
    passphrase: str = None
    
class CloseTicketRequest(BaseModel):
    ticket_id: str
    instId: str
    posSide: str
    pos: str
    upl: Optional[str] = None
    exitPx: Optional[str] = None

@app.post("/api/auth/login")
def login_with_password(req: LoginRequest):
    uid = req.uid
    pwd = req.password
    if uid == "admtls12021":
        return {"status": "success", "message": "Admin login successful", "uid": uid}
    try:
        url = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        content = resp.text
        
        reader = csv.reader(content.splitlines())
        next(reader, None) # skip header
        
        is_valid = False
        user_status = ""
        for row in reader:
            if row and len(row) >= 6 and row[0].strip().isdigit():
                if row[0].strip() == uid:
                    user_status = row[5].strip().upper()
                    is_valid = True
                    break
                    
        if not is_valid:
            return {"status": "error", "message": "UID không tồn tại hoặc chưa đăng ký!"}
            
        if user_status not in ["ACTIVE", "ON"]:
            return {"status": "error", "message": f"Tài khoản đang bị khóa ({user_status})"}
            
        # Check if user has saved API keys
        user_dir = get_user_data_dir(uid)
        saved_keys = []
        saved_phrases = []
        for strategy in ["sub1", "sub2"]:
            env_path = os.path.join(user_dir, f"bots/{strategy}/.api_{strategy}")
            if os.path.exists(env_path):
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            if "OKX_API_KEY=" in line or "OKX_SECRET_KEY=" in line:
                                val = line.strip().split("=", 1)[1].strip("\"'")
                                if val: saved_keys.append(val)
                            elif "OKX_PASSPHRASE=" in line:
                                val = line.strip().split("=", 1)[1].strip("\"'")
                                if val: saved_phrases.append(val)
                except:
                    pass
                    
        if saved_keys or saved_phrases:
            phrase = req.passphrase
            if not phrase:
                return {"status": "require_password"}
            if phrase not in saved_phrases:
                return {"status": "error", "message": "Sai Passphrase!"}

        return {"status": "success", "uid": uid}
                
    except Exception as e:
        return {"status": "error", "message": f"Lỗi máy chủ kiểm tra UID: {str(e)}"}

async def log_reader_task(stream, uid, strategy):
    """Đọc stdout/stderr của tiến trình bot và đẩy vào Queue"""
    if uid not in bot_log_queues: bot_log_queues[uid] = {}
    if strategy not in bot_log_queues[uid]: bot_log_queues[uid][strategy] = asyncio.Queue()
    queue = bot_log_queues[uid][strategy]
    try:
        while True:
            line = await asyncio.to_thread(stream.readline)
            if not line: break
            line_str = line.decode("utf-8", errors="replace").rstrip("\n")
            await queue.put(line_str)
            if uid in active_connections and strategy in active_connections[uid]:
                for connection in active_connections[uid][strategy]:
                    try: await connection.send_text(line_str)
                    except: pass
    except Exception as e:
        await queue.put(f"[SYSTEM ERROR] Log reader task failed: {e}")

# Cache for USDT.D candles to avoid spamming websocket
_tv_cache = {}

def fetch_tradingview_candles(symbol: str = "CRYPTOCAP:USDT.D", bar: str = "1H", limit: int = 300):
    now = time.time()
    cache_key = f"{symbol}_{bar}_{limit}"
    cached = _tv_cache.get(cache_key)
    if cached and (now - cached["time"] < 15):
        return cached["data"]
        
    try:
        import websocket
        import ssl
        import re
        import random
        import string

        tf_map = {
            '1m': '1', '5m': '5', '15m': '15', '30m': '30',
            '1H': '60', '2H': '120', '4H': '240', '1D': '1D'
        }
        res_bar = tf_map.get(bar, '60')
        session_id = 'cs_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        chart_id = 'sds_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        
        ws = websocket.create_connection(
            'wss://data.tradingview.com/socket.io/websocket',
            sslopt={'cert_reqs': ssl.CERT_NONE},
            headers={'Origin': 'https://www.tradingview.com'},
            timeout=5
        )
        def send(m): ws.send('~m~' + str(len(m)) + '~m~' + m)
        send(json.dumps({'m': 'set_auth_token', 'p': ['unauthorized_user_token']}))
        send(json.dumps({'m': 'chart_create_session', 'p': [session_id, '']}))
        send(json.dumps({'m': 'resolve_symbol', 'p': [session_id, chart_id, symbol]}))
        send(json.dumps({'m': 'create_series', 'p': [session_id, 's1', 's1', chart_id, res_bar, limit]}))
        
        raw_candles = []
        for _ in range(25):
            try:
                res = ws.recv()
                if '~h~' in res:
                    ws.send(res)
                    continue
                msgs = re.split(r'~m~\d+~m~', res)
                for m in msgs:
                    if not m: continue
                    d = json.loads(m)
                    if d.get('m') == 'timescale_update':
                        s1 = d['p'][1].get('s1')
                        if s1 and 's' in s1:
                            raw_candles = s1['s']
                            break
                if raw_candles: break
            except Exception: break
        ws.close()
        
        out = []
        for item in reversed(raw_candles):
            v = item.get('v', [])
            if len(v) >= 5:
                ts_ms = str(int(v[0] * 1000))
                o = str(v[1])
                h = str(v[2])
                l = str(v[3])
                c = str(v[4])
                vol = str(v[5]) if len(v) > 5 else '0'
                out.append([ts_ms, o, h, l, c, vol])
                
        if out:
            _tv_cache[cache_key] = {"time": now, "data": out}
            return out
    except Exception as e:
        print(f"[TV CANDLES ERROR] {e}")
        
    if cached:
        return cached["data"]
_okx_session = requests.Session()
_okx_cache = {}
_historical_pool = {}

def compute_ob_boxes(all_candles):
    """Tính toán Order Blocks từ dữ liệu nến."""
    ob_boxes = []
    if not all_candles:
        return ob_boxes
    try:
        candles = all_candles.copy()
        candles.reverse()  # Newest to oldest -> oldest to newest
        import bots.sub2.bot_strategy as sub2_strat
        from bots.sub2.bot_models import AssetTracker
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
        
        for bias in [1, -1]:
            b_obs = [o for o in raw_obs if o["bias"] == bias]
            if not b_obs: continue
            b_obs.sort(key=lambda x: x["low"])
            merged = []
            for o in b_obs:
                if not merged:
                    merged.append(o)
                else:
                    last = merged[-1]
                    if last["high"] >= o["low"]:
                        last["high"] = max(last["high"], o["high"])
                        if o["time"] > 0 and last["time"] > 0:
                            last["time"] = min(last["time"], o["time"])
                        elif o["time"] > 0:
                            last["time"] = o["time"]
                    else:
                        merged.append(o)
            ob_boxes.extend(merged)
    except Exception as e:
        pass
    return ob_boxes

@app.get("/api/market/candles")
def proxy_market_candles(instId: str, bar: str = "1H", limit: int = 1500):
    """Proxy OKX candle API với cơ chế Sliding Window Pool 1500 nến & Cache siêu tốc."""
    try:
        limit = int(limit)
        now = time.time()
        cache_key = f"{instId}_{bar}_{limit}"
        cached = _okx_cache.get(cache_key)
        if cached and (now - cached["time"] < 6):
            return cached["data"]

        # Hỗ trợ USDT.D từ TradingView
        if "USDT.D" in instId.upper() or "USDTD" in instId.upper():
            candles = fetch_tradingview_candles("CRYPTOCAP:USDT.D", bar=bar, limit=min(limit, 300))
            res_obj = {
                "code": "0",
                "data": candles,
                "msg": "",
                "ob_boxes": []
            }
            _okx_cache[cache_key] = {"time": now, "data": res_obj}
            return res_obj

        pool_key = (instId, bar)
        cached_pool = _historical_pool.get(pool_key)
        all_candles = []

        # Nếu đã có sẵn pool nến lịch sử trong RAM: chỉ cần fetch 100 nến mới nhất để update (cực nhanh ~0.08s)
        if cached_pool and len(cached_pool) >= min(limit, 1000):
            try:
                url = f"https://www.okx.com/api/v5/market/candles?instId={instId}&bar={bar}&limit=100"
                resp = _okx_session.get(url, timeout=5)
                d = resp.json()
                if d.get("code") == "0" and d.get("data"):
                    new_candles = d["data"]
                    merged_dict = {c[0]: c for c in cached_pool}
                    for c in new_candles:
                        merged_dict[c[0]] = c
                    all_candles = sorted(merged_dict.values(), key=lambda x: int(x[0]), reverse=True)[:limit]
                    _historical_pool[pool_key] = all_candles
            except Exception:
                all_candles = cached_pool[:limit]

        # Nếu chưa có trong pool: fetch toàn bộ lịch sử nến với Session tái sử dụng kết nối
        if not all_candles:
            first_limit = min(limit, 300)
            url = f"https://www.okx.com/api/v5/market/candles?instId={instId}&bar={bar}&limit={first_limit}"
            resp = _okx_session.get(url, timeout=6)
            data = resp.json()
            if data.get("code") == "0" and data.get("data"):
                all_candles.extend(data["data"])
                while len(all_candles) < limit:
                    remain = limit - len(all_candles)
                    fetch_count = min(remain, 100)
                    last_ts = all_candles[-1][0]
                    h_url = f"https://www.okx.com/api/v5/market/history-candles?instId={instId}&bar={bar}&limit={fetch_count}&after={last_ts}"
                    h_resp = _okx_session.get(h_url, timeout=6)
                    h_data = h_resp.json()
                    if h_data.get("code") == "0" and h_data.get("data"):
                        all_candles.extend(h_data["data"])
                    else:
                        break
            _historical_pool[pool_key] = all_candles

        ob_boxes = compute_ob_boxes(all_candles)
        res_data = {
            "code": "0",
            "msg": "",
            "data": all_candles,
            "ob_boxes": ob_boxes
        }
        _okx_cache[cache_key] = {"time": now, "data": res_data}
        return res_data
    except Exception as e:
        return {"code": "-1", "msg": str(e), "data": []}

def _warmup_backend_candles():
    import time
    import threading
    time.sleep(1.5)
    for p, b in [("BTC-USDT-SWAP", "1H"), ("ETH-USDT-SWAP", "1H"), ("XAU-USDT-SWAP", "1H"), ("CRYPTOCAP:USDT.D", "1H")]:
        try:
            proxy_market_candles(instId=p, bar=b, limit=1500)
        except Exception:
            pass

import threading
threading.Thread(target=_warmup_backend_candles, daemon=True).start()

@app.get("/api/market/ticker")
def proxy_market_ticker(instId: str):
    """Proxy OKX ticker API để lấy giá BBO."""
    try:
        url = f"https://www.okx.com/api/v5/market/ticker?instId={instId}"
        resp = requests.get(url, timeout=5)
        return resp.json()
    except Exception as e:
        return {"code": "-1", "msg": str(e), "data": []}

def _parse_env_file(fpath: str):
    creds = {"api_key": "", "secret_key": "", "passphrase": "", "is_demo": False}
    if os.path.exists(fpath):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        v = v.strip("\"'")
                        if k == "OKX_API_KEY": creds["api_key"] = v
                        elif k == "OKX_SECRET_KEY": creds["secret_key"] = v
                        elif k == "OKX_PASSPHRASE": creds["passphrase"] = v
                        elif k == "OKX_IS_DEMO": creds["is_demo"] = (v.lower() == "true")
        except Exception:
            pass
    return creds

def _get_okx_creds(uid: str, strategy: str = "sub1", account_id: str = None):
    data_dir = get_user_data_dir(uid)
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    
    candidate_paths = [
        os.path.join(data_dir, f"bots/{target_acc}", f".api_{target_acc}"),
        os.path.join(data_dir, f"accounts/{target_acc}", f".api_{target_acc}"),
        os.path.join(data_dir, f"bots/{strategy}", f".api_{target_acc}"),
        os.path.join(data_dir, f".api_{target_acc}"),
        os.path.join(data_dir, f"bots/{strategy}", f".api_{strategy}"),
        os.path.join(data_dir, f".api_{strategy}"),
        os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}", f".api_{strategy}"),
        os.path.join(OKX_TRADE_KIT_DIR, f".api_{target_acc}"),
        os.path.join(OKX_TRADE_KIT_DIR, f".api_{strategy}"),
    ]
    if strategy == "sub1" or target_acc == "sub1":
        candidate_paths.append(os.path.join(OKX_TRADE_KIT_DIR, ".api_botEMA200"))
        candidate_paths.append(os.path.join(data_dir, ".api_botEMA200"))
        
    for p in candidate_paths:
        if os.path.exists(p):
            c = _parse_env_file(p)
            if c["api_key"] and c["secret_key"] and c["passphrase"]:
                return c["api_key"], c["secret_key"], c["passphrase"], c["is_demo"]
                
    return "", "", "", False

def _save_env_file(fpath: str, api_key: str, secret_key: str, passphrase: str, is_demo: bool = False):
    os.makedirs(os.path.dirname(fpath), exist_ok=True)
    lines = []
    if os.path.exists(fpath):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception:
            pass
    keys = {
        "OKX_API_KEY": api_key,
        "OKX_SECRET_KEY": secret_key,
        "OKX_PASSPHRASE": passphrase,
        "OKX_IS_DEMO": "True" if is_demo else "False",
    }
    new_lines = []
    found_keys = set()
    for line in lines:
        stripped = line.strip()
        if "=" in stripped:
            k, _ = stripped.split("=", 1)
            if k in keys:
                new_lines.append(f"{k}=\"{keys[k]}\"\n")
                found_keys.add(k)
                continue
        new_lines.append(line)
    for k, v in keys.items():
        if k not in found_keys:
            new_lines.append(f"{k}=\"{v}\"\n")
    try:
        with open(fpath, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"[ENV SAVE ERROR] Failed to save {fpath}: {e}", flush=True)

def get_running_pid(uid: str, strategy: str) -> int:
    pid_file = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", f"{strategy}.pid")
    if os.path.exists(pid_file):
        try:
            with open(pid_file, "r") as f:
                pid = int(f.read().strip())
            # Nếu có thư viện psutil, kiểm tra xem pid có thực sự đang chạy không
            try:
                import psutil
                if psutil.pid_exists(pid):
                    p = psutil.Process(pid)
                    # Chỉ cần tiến trình tồn tại (vì lock file này là do chính bot tạo ra)
                    return pid
            except ImportError:
                # Nếu không có psutil (chạy trên môi trường server không cài đủ), fallback là tin tưởng file pid
                return pid
            except Exception:
                pass
        except:
            pass
    return 0

@app.get("/api/bot/status")
def get_bot_status(uid: str, strategy: str = "sub1"):
    proc = get_nested(bot_processes, uid, strategy)
    is_running = False
    uptime = 0
    
    pid = get_running_pid(uid, strategy)
    if pid > 0:
        is_running = True
        uptime = int(time.time() - get_nested(bot_start_times, uid, strategy, time.time()))
    elif proc and proc.poll() is None:
        is_running = True
        uptime = int(time.time() - get_nested(bot_start_times, uid, strategy, time.time()))
    else:
        del_nested(bot_processes, uid, strategy)
            
    return {
        "status": "RUNNING" if is_running else "STOPPED",
        "uptime": uptime,
        "strategy": strategy
    }

@app.post("/api/bot/start")
async def start_bot(uid: str, strategy: str = "sub1", env_file: str = None, account_id: str = None):
    if not uid: raise HTTPException(status_code=400, detail="uid is required")
    if get_running_pid(uid, strategy) > 0:
        raise HTTPException(status_code=400, detail=f"Bot {strategy} is already running in background.")

    proc = get_nested(bot_processes, uid, strategy)
    if proc and proc.poll() is None:
        raise HTTPException(status_code=400, detail=f"Bot {strategy} is already running.")
        
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    if not (api_key and secret_key and passphrase):
        raise HTTPException(status_code=400, detail=f"Cần cấu hình API Key cho tài khoản '{target_acc}' trước khi khởi động Bot {strategy}!")
        
    # Đồng bộ API key đã chọn vào các file env của bot để sys_bot_{strategy}.py đọc được ngay
    data_dir = get_user_data_dir(uid)
    strat_env_file = f".api_{strategy}"
    strat_env_path = os.path.join(data_dir, f"bots/{strategy}", strat_env_file)
    _save_env_file(strat_env_path, api_key, secret_key, passphrase, is_demo)
    _save_env_file(os.path.join(data_dir, strat_env_file), api_key, secret_key, passphrase, is_demo)
    _save_env_file(os.path.join(data_dir, f"bots/{strategy}", f".api_{target_acc}"), api_key, secret_key, passphrase, is_demo)

    cmd = [sys.executable, XGUI_MAIN_PATH, "--run-bot", strategy, strat_env_file]
    
    try:
        flag_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")
        os.makedirs(flag_dir, exist_ok=True)
        flag_path = os.path.join(flag_dir, f"stop_{strategy}.flag")
        if os.path.exists(flag_path):
            os.remove(flag_path)
            
        custom_env = os.environ.copy()
        custom_env["PYTHONPATH"] = OKX_TRADE_KIT_DIR
        custom_env["LOCALAPPDATA"] = get_user_base_dir(uid)
        custom_env["PYTHONUNBUFFERED"] = "1"
        custom_env["PYTHONIOENCODING"] = "utf-8"
            
        new_proc = subprocess.Popen(
            cmd,
            cwd=OKX_TRADE_KIT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=custom_env,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        
        set_nested(bot_processes, uid, strategy, new_proc)
        set_nested(bot_start_times, uid, strategy, time.time())
        
        if uid not in bot_log_queues: bot_log_queues[uid] = {}
        bot_log_queues[uid][strategy] = asyncio.Queue()
        
        loop = asyncio.get_event_loop()
        loop.create_task(log_reader_task(new_proc.stdout, uid, strategy))
        
        return {"status": "success", "message": "Đã khởi động Bot thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bot/reset_capital")
def reset_capital(uid: str, strategy: str = "sub1"):
    if not uid: raise HTTPException(status_code=400, detail="uid is required")
    
    flag_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")
    os.makedirs(flag_dir, exist_ok=True)
    
    # acc_name corresponds to the strategy name (e.g. sub1)
    acc_name = strategy
    flag_path = os.path.join(flag_dir, f"reset_wallet_{acc_name}.flag")
    
    try:
        with open(flag_path, "w") as f:
            f.write("1")
        return {"status": "success", "message": "Đã gửi lệnh Reset Vốn Gốc (Audit) đến Bot."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo cờ reset: {e}")

@app.post("/api/bot/reset_nen")
def reset_nen(uid: str, strategy: str = "sub1"):
    if not uid: raise HTTPException(status_code=400, detail="uid is required")
    if uid.strip() != "admtls12021":
        raise HTTPException(status_code=403, detail="Chức năng này chỉ dành riêng cho Quản trị viên (Admin)!")
    
    flag_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")
    os.makedirs(flag_dir, exist_ok=True)
    flag_path = os.path.join(flag_dir, f"reset_nen_{strategy}.flag")
    try:
        with open(flag_path, "w") as f:
            f.write("1")
        return {"status": "success", "message": "Đã gửi lệnh Reset Đếm Nến thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo cờ reset nến: {e}")

@app.post("/api/bot/stop")
async def stop_bot(uid: str, strategy: str = "sub1"):
    proc = get_nested(bot_processes, uid, strategy)
    
    flag_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", f"stop_{strategy}.flag")
    try:
        os.makedirs(os.path.dirname(flag_path), exist_ok=True)
        with open(flag_path, "w") as f:
            f.write("stop")
    except Exception:
        pass
        
    pid = get_running_pid(uid, strategy)
    if pid > 0 and not proc:
        try:
            p = psutil.Process(pid)
            p.terminate()
            p.wait(timeout=2.0)
        except psutil.TimeoutExpired:
            p.kill()
        except Exception:
            pass
            
    if proc and proc.poll() is None:
        try:
            for _ in range(15):
                if proc.poll() is not None:
                    break
                await asyncio.sleep(0.2)
                
            if proc.poll() is None:
                proc.terminate()
                await asyncio.sleep(1.0)
                if proc.poll() is None:
                    proc.kill()
        except Exception:
            pass
            
    if strategy in bot_processes:
        del_nested(bot_processes, uid, strategy)
    return {"message": f"Bot {strategy} stopped successfully.", "status": "STOPPED"}

@app.get("/api/bot/config")
def get_bot_config(uid: str, strategy: str = "sub1"):
    # Đọc cấu hình JSON
    config_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", f"{strategy}_global_config.json")
    if not os.path.exists(config_path):
        # Mặc định cấu hình nếu chưa tồn tại
        return {
            "ENABLED_TFS": ["M5", "M15", "M30", "H1", "H2", "H4"],
            "ENABLED_COINS": ["BTC", "ETH", "XAU"]
        }
        
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        return cfg
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")

@app.post("/api/bot/config")
def update_bot_config(update_data: ConfigUpdate, uid: str, strategy: str = "sub1"):
    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")
    os.makedirs(config_dir, exist_ok=True)
    config_path = os.path.join(config_dir, f"{strategy}_global_config.json")
    
    cfg = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception:
            cfg = {}
            
    if update_data.enabled_tfs is not None:
        cfg["ENABLED_TFS"] = update_data.enabled_tfs
    if update_data.enabled_coins is not None:
        cfg["ENABLED_COINS"] = update_data.enabled_coins
    if update_data.position_volume is not None:
        cfg["POSITION_VOLUME_HIGH_CONFIDENCE"] = update_data.position_volume
    if update_data.scalping_tp_pct is not None:
        cfg["SCALPING_TP_PCT"] = update_data.scalping_tp_pct
    if update_data.scalping_sl_pct is not None:
        cfg["SCALPING_SL_PCT"] = update_data.scalping_sl_pct
    
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4, ensure_ascii=False)
        return {"message": "Config updated successfully.", "config": cfg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e}")

@app.get("/api/bot/accounts")
def get_bot_accounts(uid: str):
    data_dir = get_user_data_dir(uid)
    acc_file = os.path.join(data_dir, "accounts.json")
    default_accounts = [{"id": "sub1", "name": "Tài khoản phụ"}]
    if os.path.exists(acc_file):
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                accounts = json.load(f)
                if isinstance(accounts, list) and len(accounts) > 0:
                    cleaned = [
                        {"id": "sub1", "name": "Tài khoản phụ"} if a.get("id") == "sub1" else a
                        for a in accounts
                        if not (a.get("id") == "sub2" and a.get("name") in ["Tài khoản phụ 2", "Tài khoản 2"])
                    ]
                    if not any(a.get("id") == "sub1" for a in cleaned):
                        cleaned.insert(0, {"id": "sub1", "name": "Tài khoản phụ"})
                    return cleaned
        except Exception:
            pass
    return default_accounts

@app.post("/api/bot/accounts")
def create_bot_account(req: AccountCreate, uid: str):
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Tên tài khoản không được để trống!")
    
    data_dir = get_user_data_dir(uid)
    os.makedirs(data_dir, exist_ok=True)
    acc_file = os.path.join(data_dir, "accounts.json")
    
    accounts = [{"id": "sub1", "name": "Tài khoản phụ"}]
    if os.path.exists(acc_file):
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list) and len(loaded) > 0:
                    accounts = loaded
        except Exception:
            pass
            
    if any(a.get("name", "").lower() == clean_name.lower() for a in accounts):
        raise HTTPException(status_code=400, detail=f"Tài khoản '{clean_name}' đã tồn tại!")
        
    acc_id = req.id if req.id else f"sub_{int(time.time() * 1000)}"
    new_acc = {"id": acc_id, "name": clean_name}
    accounts.append(new_acc)
    
    bot_dir = os.path.join(data_dir, f"bots/{acc_id}")
    os.makedirs(bot_dir, exist_ok=True)
    
    with open(acc_file, "w", encoding="utf-8") as f:
        json.dump(accounts, f, indent=4, ensure_ascii=False)
        
    return {"message": "Account created successfully", "account": new_acc, "accounts": accounts}

@app.delete("/api/bot/accounts/{account_id}")
def delete_bot_account(account_id: str, uid: str):
    data_dir = get_user_data_dir(uid)
    acc_file = os.path.join(data_dir, "accounts.json")
    
    accounts = [{"id": "sub1", "name": "Tài khoản phụ"}]
    if os.path.exists(acc_file):
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list) and len(loaded) > 0:
                    accounts = loaded
        except Exception:
            pass
            
    # Xoá file .api nếu có
    env_path = os.path.join(data_dir, f"bots/{account_id}", f".api_{account_id}")
    if os.path.exists(env_path):
        try: os.remove(env_path)
        except Exception: pass
        
    # Lọc bỏ account
    remaining = [a for a in accounts if a.get("id") != account_id]
    if len(remaining) == 0:
        accounts = [{"id": "sub1", "name": "Tài khoản phụ"}]
    else:
        accounts = remaining
        
    with open(acc_file, "w", encoding="utf-8") as f:
        json.dump(accounts, f, indent=4, ensure_ascii=False)
        
    return {"message": "Account deleted successfully", "accounts": accounts}

@app.get("/api/bot/credentials")
def get_bot_credentials(uid: str, strategy: str = "sub1", account_id: str = None):
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, _ = _get_okx_creds(uid, strategy, target_acc)
    return {"api_key": api_key, "secret_key": secret_key, "passphrase": passphrase}

@app.post("/api/bot/credentials")
def update_bot_credentials(req: CredentialsUpdate, uid: str, strategy: str = "sub1", account_id: str = None):
    creds = req
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    # Xác thực API Key với OKX
    try:
        domain = "www.okx.com"
        base_url = f"https://{domain}"
        path_cfg = "/api/v5/account/config"
        ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        message = ts + "GET" + path_cfg
        mac = hmac.new(bytes(creds.secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod=hashlib.sha256)
        signature = base64.b64encode(mac.digest()).decode('utf-8')

        headers = {
            "OK-ACCESS-KEY": creds.api_key,
            "OK-ACCESS-SIGN": signature,
            "OK-ACCESS-TIMESTAMP": ts,
            "OK-ACCESS-PASSPHRASE": creds.passphrase,
        }

        print(f"[API CHECK] Validating API Key for UID={uid}, strategy={strategy}, account={target_acc}", flush=True)
        resp = requests.get(base_url + path_cfg, headers=headers, timeout=10)
        print(f"[API CHECK] OKX Response status={resp.status_code}", flush=True)
        
        if resp.status_code == 200:
            res_data = resp.json()
            print(f"[API CHECK] OKX Response code={res_data.get('code')}, msg={res_data.get('msg', '')}", flush=True)
            if res_data.get("code") == "0" and len(res_data.get("data", [])) > 0:
                api_uid = res_data["data"][0].get("uid")
                main_uid = res_data["data"][0].get("mainUid")
                print(f"[API CHECK] API UID={api_uid}, mainUid={main_uid}, login UID={uid}", flush=True)
                # 1. Chặn tuyệt đối không cho dùng API Key của tài khoản chính (api_uid == uid)
                if str(api_uid) == str(uid):
                    raise HTTPException(status_code=400, detail=f"BẢO VỆ TÀI SẢN: Bot KHÔNG CHẤP NHẬN API Key của Tài khoản chính (UID: {uid}). Vui lòng tạo Tài Khoản Phụ (Sub-account) trên OKX và dùng API Key của tài khoản phụ đó để kết nối!")
                
                # 2. Phải là tài khoản phụ thuộc về tài khoản chính đang đăng nhập
                if str(main_uid) != str(uid):
                    raise HTTPException(status_code=400, detail=f"API Key này KHÔNG thuộc về tài khoản OKX của bạn (UID API: {api_uid}, UID đăng nhập: {uid})!")
            else:
                okx_msg = res_data.get("msg", "Không rõ lỗi")
                raise HTTPException(status_code=400, detail=f"API Key không hợp lệ. OKX phản hồi: {okx_msg}")
        else:
            try:
                err_data = resp.json()
                okx_msg = err_data.get("msg", resp.text[:200])
            except:
                okx_msg = resp.text[:200]
            print(f"[API CHECK] OKX Error: status={resp.status_code}, body={okx_msg}", flush=True)
            raise HTTPException(status_code=400, detail=f"Lỗi kết nối OKX API (HTTP {resp.status_code}): {okx_msg}")
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        print(f"[API CHECK] OKX API Timeout!", flush=True)
        raise HTTPException(status_code=400, detail="Kết nối đến OKX API bị timeout. Vui lòng thử lại.")
    except requests.exceptions.ConnectionError as e:
        print(f"[API CHECK] OKX Connection Error: {e}", flush=True)
        raise HTTPException(status_code=400, detail="Không thể kết nối đến máy chủ OKX. Kiểm tra kết nối mạng của server.")
    except Exception as e:
        print(f"[API CHECK] Unexpected error: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=400, detail=f"Lỗi hệ thống khi kiểm tra API Key: {str(e)}")

    data_dir = get_user_data_dir(uid)
    _save_env_file(os.path.join(data_dir, f"bots/{target_acc}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase)
    _save_env_file(os.path.join(data_dir, f"accounts/{target_acc}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase)
    _save_env_file(os.path.join(data_dir, f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase)
    _save_env_file(os.path.join(data_dir, f"bots/{strategy}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase)
    if strategy:
        _save_env_file(os.path.join(data_dir, f"bots/{strategy}", f".api_{strategy}"), creds.api_key, creds.secret_key, creds.passphrase)
        
    return {"message": "Credentials updated successfully."}

@app.get("/api/bot/positions")
def get_bot_positions(uid: str, strategy: str = "sub1", account_id: str = None):
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)

    # Nếu chưa nhập API Key, trả về rỗng (tránh hiển thị rác từ trade_markers cũ)
    if not (api_key and secret_key and passphrase):
        return []

    # 2. Nếu có credentials, gọi OKX API thật
    if api_key and secret_key and passphrase:
        try:
            domain = "www.okx.com"
            base_url = f"https://{domain}"
            path_pos = "/api/v5/account/positions?instType=SWAP"
            ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            # Ký số
            message = ts + "GET" + path_pos
            mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod=hashlib.sha256)
            signature = base64.b64encode(mac.digest()).decode('utf-8')
            
            headers = {
                "OK-ACCESS-KEY": api_key,
                "OK-ACCESS-SIGN": signature,
                "OK-ACCESS-TIMESTAMP": ts,
                "OK-ACCESS-PASSPHRASE": passphrase,
            }
            if is_demo:
                headers["x-simulated-trading"] = "1"
            
            resp = requests.get(base_url + path_pos, headers=headers, timeout=4)
            if resp.status_code == 200:
                res_pos = resp.json()
                if res_pos.get("code") == "0":
                    raw_positions = res_pos.get("data", [])
                    
                    # Fetch thêm TP/SL algo để đính vào vị thế
                    path_algo = "/api/v5/trade/orders-algo-pending"
                    ts2 = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                    message2 = ts2 + "GET" + path_algo
                    mac2 = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message2, encoding='utf-8'), digestmod=hashlib.sha256)
                    signature2 = base64.b64encode(mac2.digest()).decode('utf-8')
                    
                    headers2 = {
                        "OK-ACCESS-KEY": api_key,
                        "OK-ACCESS-SIGN": signature2,
                        "OK-ACCESS-TIMESTAMP": ts2,
                        "OK-ACCESS-PASSPHRASE": passphrase,
                    }
                    if is_demo:
                        headers2["x-simulated-trading"] = "1"
                    resp_algo = requests.get(base_url + path_algo, headers=headers2, timeout=4)
                    algo_data = []
                    if resp_algo.status_code == 200:
                        res_algo = resp_algo.json()
                        if res_algo.get("code") == "0":
                            algo_data = res_algo.get("data", [])
                            
                    formatted_positions = []
                    
                    # Read trade_markers for virtual tickets
                    markers = {}
                    positions_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", "trade_markers.json")
                    if os.path.exists(positions_path):
                        try:
                            with open(positions_path, "r", encoding="utf-8") as f:
                                markers = json.load(f)
                        except Exception: pass

                    # Group OKX positions by instId and posSide (handling native OKX split positions)
                    okx_pos_map = {}
                    for pos in raw_positions:
                        instId = pos.get("instId")
                        posSide = pos.get("posSide", "long").lower()
                        if posSide == "net":
                            posSide = "long" if float(pos.get("pos", 0)) > 0 else "short"
                        
                        key = (instId, posSide)
                        if key not in okx_pos_map:
                            okx_pos_map[key] = []
                        okx_pos_map[key].append(pos)

                    # Auto-sync: Clean up zombie virtual tickets in trade_markers if OKX position is closed
                    dirty_markers = False
                    for coin, items in markers.items():
                        inst_id = f"{coin}-USDT-SWAP"
                        for side in ["long", "short"]:
                            side_items = [i for i in items if i.get("side", "").lower() == side and i.get("status") == "active"]
                            if side_items and (inst_id, side) not in okx_pos_map:
                                for item in side_items: item["status"] = "closed"
                                dirty_markers = True

                    if dirty_markers:
                        try:
                            with open(positions_path, "w", encoding="utf-8") as f:
                                json.dump(markers, f)
                        except Exception: pass

                    # Build formatted positions
                    for key, items_okx in okx_pos_map.items():
                        inst_id, pos_side = key
                        coin = inst_id.split("-")[0]
                        
                        total_pos = sum(abs(float(i.get("pos", 0))) for i in items_okx)
                        if total_pos == 0: continue
                        
                        total_margin = sum(float(i.get("margin") or i.get("imr") or "0") for i in items_okx)
                        avg_px = sum(float(i.get("avgPx", 0)) * abs(float(i.get("pos", 0))) for i in items_okx) / total_pos if total_pos > 0 else 0
                        
                        first_okx = items_okx[0]
                        # Use OKX's native 'last' price, fallback to markPx, then avgPx
                        last_px = float(first_okx.get("last") or first_okx.get("markPx") or avg_px)
                        leverage = float(first_okx.get("lever", 1))
                        
                        # Use OKX's native UPL and uplRatio directly (much more accurate)
                        total_upl = sum(float(i.get("upl", 0)) for i in items_okx)
                        total_upl_ratio = float(first_okx.get("uplRatio", 0)) * 100 if len(items_okx) == 1 else (total_upl / total_margin * 100 if total_margin > 0 else 0)
                        
                        tp_px = "---"
                        sl_px = "---"
                        for o in algo_data:
                            if o.get("instId") == inst_id:
                                if o.get("tpTriggerPx"): tp_px = o.get("tpTriggerPx")
                                if o.get("slTriggerPx"): sl_px = o.get("slTriggerPx")
                                
                        # Get matching virtual tickets to extract the 'tf' labels
                        active_items = [i for i in markers.get(coin, []) if i.get("side", "").lower() == pos_side and i.get("status") == "active"]
                        active_tfs = []
                        for item in active_items:
                            tf = item.get("tf", "").upper()
                            if tf and tf not in active_tfs:
                                active_tfs.append(tf)
                        
                        active_tfs = sorted(active_tfs, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t,0))
                        tf_str = " ".join(active_tfs).lower() if active_tfs else ""
                        
                        parent_id = f"AGG_{inst_id}_{pos_side}"
                        
                        # Add Aggregated Row (Total Position)
                        formatted_positions.append({
                            "ticket_id": parent_id if len(items_okx) > 1 else (active_items[-1].get("ticket_id") if active_items else "#MANUAL"),
                            "is_aggregate": True,
                            "instId": inst_id,
                            "posSide": pos_side,
                            "pos": str(total_pos),
                            "margin": f"{total_margin:.2f}",
                            "avgPx": str(avg_px),
                            "lastPx": str(last_px),
                            "roi": f"{total_upl_ratio:.2f}",
                            "upl": f"{total_upl:.4f}",
                            "tp": tp_px,
                            "sl": sl_px,
                            "lever": str(int(leverage)),
                            "tf": tf_str,
                            "children_count": len(items_okx) if len(items_okx) > 1 else 0
                        })
                        
                        # Add Child Rows (Synthesize from bot's trade_markers.json if OKX returns aggregated)
                        if len(items_okx) == 1 and len(active_items) > 1:
                            # Update parent children count
                            formatted_positions[-1]["children_count"] = len(active_items)
                            
                            for idx, item in enumerate(active_items):
                                c_pos = abs(float(item.get("sz", 0)))
                                c_avg_px = float(item.get("px", 0))
                                # Estimate margin based on proportion of total_pos
                                c_margin = float(total_margin) * (c_pos / float(total_pos)) if float(total_pos) > 0 else 0
                                
                                if c_avg_px > 0:
                                    if pos_side == "long":
                                        c_roi = ((last_px - c_avg_px) / c_avg_px) * 100 * leverage
                                    else:
                                        c_roi = ((c_avg_px - last_px) / c_avg_px) * 100 * leverage
                                    c_upl = c_margin * (c_roi / 100)
                                else:
                                    c_roi = 0
                                    c_upl = 0
                                
                                formatted_positions.append({
                                    "ticket_id": item.get("ticket_id", f"CHILD_{idx}_{inst_id}"),
                                    "is_child": True,
                                    "parent_id": parent_id,
                                    "instId": inst_id,
                                    "posSide": pos_side,
                                    "pos": str(c_pos),
                                    "margin": f"{c_margin:.2f}",
                                    "avgPx": str(c_avg_px),
                                    "lastPx": str(last_px),
                                    "roi": f"{c_roi:.2f}",
                                    "upl": f"{c_upl:.4f}",
                                    "tp": tp_px,
                                    "sl": sl_px,
                                    "lever": str(int(leverage)),
                                    "tf": item.get("tf", "").upper()
                                })

                        # Add Child Rows (Native Split Positions)
                        if len(items_okx) > 1:
                            for idx, i_okx in enumerate(items_okx):
                                c_pos = abs(float(i_okx.get("pos", 0)))
                                c_margin = float(i_okx.get("margin") or i_okx.get("imr") or "0")
                                c_avg_px = float(i_okx.get("avgPx", 0))
                                
                                # Use OKX native values directly
                                c_upl = float(i_okx.get("upl", 0))
                                c_roi = float(i_okx.get("uplRatio", 0)) * 100
                                
                                formatted_positions.append({
                                    "ticket_id": i_okx.get("posId", f"CHILD_{idx}_{inst_id}"),
                                    "is_child": True,
                                    "parent_id": parent_id,
                                    "instId": inst_id,
                                    "posSide": pos_side,
                                    "pos": str(c_pos),
                                    "margin": f"{c_margin:.2f}",
                                    "avgPx": str(c_avg_px),
                                    "lastPx": str(last_px),
                                    "roi": f"{c_roi:.2f}",
                                    "upl": f"{c_upl:.4f}",
                                    "tp": tp_px,
                                    "sl": sl_px,
                                    "lever": str(int(leverage)),
                                    "tf": ""
                                })

                    return formatted_positions
                else:
                    print(f"OKX Fetch Position Error: {res_pos}", flush=True)
        except Exception as e:
            print(f"Error fetching OKX positions: {e}")

    # 3. Fallback: Đọc các vị thế từ trade_markers.json
    positions_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", "trade_markers.json")
    if not os.path.exists(positions_path):
        return []
    try:
        with open(positions_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        mock_positions = []
        for coin, items in data.items():
            inst_id = f"{coin}-USDT-SWAP"
            for side in ["long", "short"]:
                active_items = [i for i in items if i.get("side", "").lower() == side and i.get("status") == "active"]
                if not active_items: continue
                
                total_pos = sum(float(i.get("volume", "1.0")) for i in active_items)
                if total_pos == 0: continue
                avg_px = sum(float(i.get("price", 0)) * float(i.get("volume", "1.0")) for i in active_items) / total_pos
                
                parent_id = f"AGG_{inst_id}_{side}_MOCK"
                
                active_tfs = []
                for item in active_items:
                    tf = item.get("tf", "").upper()
                    if tf and tf not in active_tfs:
                        active_tfs.append(tf)
                active_tfs = sorted(active_tfs, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t,0))
                
                mock_positions.append({
                    "ticket_id": parent_id if len(active_items) > 1 else active_items[-1].get("ticket_id", "#MOCK"),
                    "is_aggregate": True,
                    "instId": inst_id,
                    "posSide": side,
                    "pos": str(total_pos),
                    "margin": "0.00",
                    "avgPx": str(avg_px),
                    "lastPx": str(avg_px),
                    "roi": "0.00",
                    "upl": "0.00",
                    "tp": "---",
                    "sl": "---",
                    "lever": "100",
                    "tf": " ".join(active_tfs).lower(),
                    "children_count": len(active_items) if len(active_items) > 1 else 0
                })
                
                if len(active_items) > 1:
                    for idx, item in enumerate(active_items):
                        mock_positions.append({
                            "ticket_id": item.get("ticket_id", f"CHILD_{idx}_{inst_id}"),
                            "is_child": True,
                            "parent_id": parent_id,
                            "instId": inst_id,
                            "posSide": side,
                            "pos": str(item.get("volume", "1.0")),
                            "margin": "0.00",
                            "avgPx": str(item.get("price")),
                            "lastPx": str(item.get("price")),
                            "roi": "0.00",
                            "upl": "0.00",
                            "tp": "---",
                            "sl": "---",
                            "lever": "100",
                            "tf": item.get("tf", "").upper()
                        })
        return mock_positions
    except Exception:
        return []

@app.get("/api/bot/closed_positions")
def get_closed_positions(uid: str, strategy: str = "sub1"):
    positions_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", "trade_markers.json")
    if not os.path.exists(positions_path):
        return []
    try:
        with open(positions_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        closed_positions = []
        current_time_ms = int(time.time() * 1000)
        thirty_days_ms = 30 * 24 * 60 * 60 * 1000
        dirty = False
        
        for coin in list(data.keys()):
            items = data[coin]
            valid_items = []
            for item in items:
                marker_time = item.get("close_time") if item.get("status") == "closed" and item.get("close_time") else item.get("time", current_time_ms)
                if current_time_ms - marker_time <= thirty_days_ms:
                    valid_items.append(item)
                    if item.get("status") == "closed":
                        closed_positions.append({
                            "ticket_id": item.get("ticket_id", f"#{item.get('time', '')}"),
                            "instId": f"{coin}-USDT",
                            "posSide": item.get("side", "long").lower(),
                            "pos": str(item.get("volume", "0")),
                            "entryPx": str(item.get("price", "0")),
                            "exitPx": str(item.get("exit_price", "0")),
                            "pnl": str(item.get("pnl", "0")),
                            "closeTime": item.get("close_time", item.get("time", 0)),
                            "tf": item.get("tf", "")
                        })
                else:
                    dirty = True
            if len(valid_items) != len(items):
                data[coin] = valid_items
                
        if dirty:
            try:
                with open(positions_path, "w", encoding="utf-8") as f:
                    json.dump(data, f)
            except Exception: pass
            
        # Sắp xếp mới nhất lên trên
        closed_positions.sort(key=lambda x: x["closeTime"], reverse=True)
        return closed_positions
    except Exception:
        return []

@app.post("/api/bot/positions/close_ticket")
def close_virtual_ticket(req: CloseTicketRequest, uid: str, strategy: str = "sub1"):
    # 1. Call OKX API to execute close position on exchange FIRST
    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}")
    env_file = f".api_{strategy}"
    env_path = os.path.join(config_dir, env_file)
    
    api_key, secret_key, passphrase = "", "", ""
    is_demo = False
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        v = v.strip("\"'")
                        if k == "OKX_API_KEY": api_key = v
                        elif k == "OKX_SECRET_KEY": secret_key = v
                        elif k == "OKX_PASSPHRASE": passphrase = v
                        elif k == "OKX_IS_DEMO": is_demo = (v.lower() == "true")
        except Exception: pass

    if not (api_key and secret_key and passphrase):
        raise HTTPException(status_code=400, detail=f"Chưa cấu hình API Key cho tài khoản {strategy}! Vui lòng nhập API Key trong mục Cài Đặt.")

    if api_key and secret_key and passphrase:
        try:
            inst_id = req.instId if req.instId.endswith("-SWAP") else f"{req.instId}-SWAP"
            pos_side = req.posSide.lower()
            base_url = "https://www.okx.com"
            order_side = "sell" if pos_side == "long" else "buy"
            path_order = "/api/v5/trade/order"
            
            ticket_vol = float(req.pos)
            ticket_id = getattr(req, "ticket_id", "")
            
            # Fetch current position from OKX to know the real total size
            import requests as req_lib
            path_pos = f"/api/v5/account/positions?instId={inst_id}"
            ts_pos = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            mac_pos = hmac.new(bytes(secret_key, encoding='utf8'), bytes(ts_pos + "GET" + path_pos, encoding='utf-8'), digestmod=hashlib.sha256)
            headers_pos = {
                "OK-ACCESS-KEY": api_key,
                "OK-ACCESS-SIGN": base64.b64encode(mac_pos.digest()).decode('utf-8'),
                "OK-ACCESS-TIMESTAMP": ts_pos,
                "OK-ACCESS-PASSPHRASE": passphrase,
                "x-simulated-trading": "1" if is_demo else "0"
            }
            try:
                resp_pos = req_lib.get(base_url + path_pos, headers=headers_pos, timeout=6)
                pos_data = resp_pos.json()
            except:
                pos_data = {}
            
            okx_pos_vol = 0
            if pos_data.get("code") == "0" and pos_data.get("data"):
                for p in pos_data["data"]:
                    p_side = p.get("posSide", "long").lower()
                    p_val = float(p.get("pos", 0))
                    if p_side == "net":
                        if (pos_side == "long" and p_val > 0) or (pos_side == "short" and p_val < 0):
                            okx_pos_vol += abs(p_val)
                    elif p_side == pos_side:
                        okx_pos_vol += abs(p_val)
            
            if ticket_id.startswith("AGG_") or ticket_id.startswith("#MANUAL") or ticket_vol >= okx_pos_vol - 1e-9:
                close_sz_val = okx_pos_vol
            else:
                close_sz_val = ticket_vol
                
            close_sz_str = f"{close_sz_val:.10g}" # Format without trailing zeros

            if okx_pos_vol > 0 and close_sz_val >= okx_pos_vol - (1e-9):
                path_order = "/api/v5/trade/close-position"
                order_payload = {
                    "instId": inst_id,
                    "mgnMode": "cross",
                    "posSide": pos_side
                }
            else:
                path_order = "/api/v5/trade/order"
                order_payload = {
                    "instId": inst_id,
                    "tdMode": "cross",
                    "side": order_side,
                    "ordType": "market",
                    "sz": close_sz_str,
                    "posSide": pos_side
                }
                
            print(f"Sending OKX order to {path_order}: {order_payload}", flush=True)
            body_str = json.dumps(order_payload)
            ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            message = ts + "POST" + path_order + body_str
            mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod=hashlib.sha256)
            signature = base64.b64encode(mac.digest()).decode('utf-8')
            
            headers = {
                "OK-ACCESS-KEY": api_key,
                "OK-ACCESS-SIGN": signature,
                "OK-ACCESS-TIMESTAMP": ts,
                "OK-ACCESS-PASSPHRASE": passphrase,
                "x-simulated-trading": "1" if is_demo else "0",
                "Content-Type": "application/json"
            }
            
            resp = req_lib.post(base_url + path_order, headers=headers, data=body_str, timeout=6)
            res_json = resp.json()
            
            # Fallback for Net Mode
            if res_json.get("code") != "0":
                err_msg = res_json.get("msg", "")
                if "posSide" in err_msg or res_json.get("code") in ["51000", "51008", "51023", "51167", "51119", "1"]:
                    order_payload["posSide"] = "net"
                    if path_order == "/api/v5/trade/order":
                        order_payload["reduceOnly"] = True
                    body_str = json.dumps(order_payload)
                    ts2 = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                    message = ts2 + "POST" + path_order + body_str
                    mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod=hashlib.sha256)
                    headers["OK-ACCESS-SIGN"] = base64.b64encode(mac.digest()).decode('utf-8')
                    headers["OK-ACCESS-TIMESTAMP"] = ts2
                    resp2 = req_lib.post(base_url + path_order, headers=headers, data=body_str, timeout=6)
                    res_json = resp2.json()

            if res_json.get("code") != "0":
                err_code = str(res_json.get("code"))
                err_detail = res_json.get("msg") or "Lỗi đóng vị thế trên OKX"
                print(f"OKX API Error Response: {res_json}", flush=True)
                
                # 51167/51119: Position not found. 
                # 51023: If close-position, position might not exist. If order, availPos is locked!
                if path_order == "/api/v5/trade/order" and err_code == "51023":
                    raise HTTPException(
                        status_code=400, 
                        detail="Lỗi: Không thể đóng từng phần do khối lượng đang bị khóa bởi lệnh chờ (TP/SL). Vui lòng Đóng tất cả hoặc hủy lệnh chờ trước!"
                    )
                elif err_code in ["51023", "51167", "51119"]:
                    print(f"Vị thế {req.instId} không tồn tại hoặc đã bị đóng trước đó.", flush=True)
                else:
                    raise HTTPException(status_code=400, detail=f"Lỗi sàn OKX: {err_detail} ({err_code})")

        except HTTPException:
            raise
        except Exception as e:
            print(f"Error executing close position on OKX: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi gọi API OKX: {str(e)}")

    # 2. Update trade_markers.json to mark as closed ONLY IF API SUCCEEDED
    positions_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", "trade_markers.json")
    coin = req.instId.split("-")[0]
    ticket_closed = False
    
    if os.path.exists(positions_path):
        try:
            with open(positions_path, "r", encoding="utf-8") as f:
                markers = json.load(f)
                
            if coin in markers:
                for item in markers[coin]:
                    if item.get("ticket_id") == req.ticket_id and item.get("status") == "active":
                        item["status"] = "closed"
                        item["close_time"] = int(time.time() * 1000)
                        
                        # Use provided UI values if available, otherwise fetch ticker
                        if req.exitPx and req.upl:
                            try:
                                item["exit_price"] = float(req.exitPx)
                                item["pnl"] = float(req.upl)
                            except Exception: pass
                        
                        if "exit_price" not in item or item["exit_price"] == 0:
                            try:
                                import requests as req_lib_tick
                                res = req_lib_tick.get(f"https://www.okx.com/api/v5/market/ticker?instId={coin}-USDT-SWAP", timeout=3).json()
                                if res.get("code") == "0" and res.get("data"):
                                    exit_px = float(res["data"][0]["last"])
                                    item["exit_price"] = exit_px
                                    ep = float(item.get("price", exit_px))
                                    side = item.get("side", "long").lower()
                                    if side == "long":
                                        item["pnl"] = (exit_px - ep) / ep * 100.0
                                    else:
                                        item["pnl"] = (ep - exit_px) / ep * 100.0
                            except Exception:
                                item["exit_price"] = 0
                                item["pnl"] = 0
                        ticket_closed = True
                        break
                        
            if ticket_closed:
                with open(positions_path, "w", encoding="utf-8") as f:
                    json.dump(markers, f)
        except Exception as e:
            print(f"Error updating markers: {e}")

    return {"status": "success", "message": f"Đã đóng vị thế {req.instId} thành công"}

class OrderRequest(BaseModel):
    instId: str
    tdMode: str
    side: str
    ordType: str
    sz: str
    px: str = ""
    slTriggerPx: str = ""
    tpTriggerPx: str = ""
    reduceOnly: bool = False

@app.get("/api/account/balance")
def get_account_balance(uid: str, strategy: str = "sub1", account_id: str = None, ccy: str = "USDT"):
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    if not api_key:
        return {"status": "error", "message": "No OKX Credentials"}
    
    path = f"/api/v5/account/balance?ccy={ccy}"
    try:
        resp = _okx_signed_request("GET", path, "", api_key, secret_key, passphrase, is_demo)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "0" and len(data.get("data", [])) > 0:
                details = data["data"][0]["details"]
                if details:
                    avail_bal = details[0].get("availBal", "0")
                    return {"status": "success", "availBal": avail_bal}
        return {"status": "error", "message": resp.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/trade/order")
def place_manual_order(req: OrderRequest, uid: str, strategy: str = "sub1", account_id: str = None):
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    if not api_key:
        return {"status": "error", "message": "No OKX Credentials"}
    
    path = "/api/v5/trade/order"
    
    order_data = {
        "instId": req.instId,
        "tdMode": req.tdMode,
        "side": req.side,
        "ordType": req.ordType,
        "sz": req.sz,
    }
    if req.reduceOnly:
        order_data["reduceOnly"] = True
    
    if req.px and req.ordType != "market":
        order_data["px"] = req.px
        
    if req.slTriggerPx:
        order_data["slTriggerPx"] = req.slTriggerPx
        order_data["slOrdPx"] = "-1" # Market SL
    if req.tpTriggerPx:
        order_data["tpTriggerPx"] = req.tpTriggerPx
        order_data["tpOrdPx"] = "-1" # Market TP
        
    body_str = json.dumps(order_data)
    
    try:
        resp = _okx_signed_request("POST", path, body_str, api_key, secret_key, passphrase, is_demo)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "0":
                return {"status": "success", "data": data.get("data")}
            else:
                return {"status": "error", "message": data.get("msg")}
        return {"status": "error", "message": resp.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/logs/{uid}/{strategy}")
async def websocket_logs(websocket: WebSocket, uid: str, strategy: str):
    await websocket.accept()
    if uid not in active_connections: active_connections[uid] = {}
    if strategy not in active_connections[uid]: active_connections[uid][strategy] = []
    active_connections[uid][strategy].append(websocket)
    
    await websocket.send_text(f"🔄 Đã kết nối với TLS1 Trading Web Terminal Server ({strategy}) cho user {uid}...")
    
    temp_list = []
    if uid in bot_log_queues and strategy in bot_log_queues[uid]:
        q = bot_log_queues[uid][strategy]
        size = min(q.qsize(), 100)
        for _ in range(size):
            try:
                val = q.get_nowait()
                temp_list.append(val)
                q.put_nowait(val)
            except Exception:
                break
                
    for log_line in temp_list:
        await websocket.send_text(log_line)
        
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        if uid in active_connections and strategy in active_connections[uid] and websocket in active_connections[uid][strategy]:
            active_connections[uid][strategy].remove(websocket)

# --- SERVE FRONTEND (REACT) ---
frontend_dist_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

# z20260813 | Added auto-delete for trade history older than 30 days to free up memory

# z7719 | Sửa lỗi close-position khi đóng vị thế lẻ (do dùng int()) và bổ sung cảnh báo 400 khi khối lượng khả dụng bị khóa bởi TP/SL trên OKX.
