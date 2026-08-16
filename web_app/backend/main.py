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
async def verify_uid(uid: str):
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

class LoginRequest(BaseModel):
    uid: str
    password: str = None
    
class CloseTicketRequest(BaseModel):
    ticket_id: str
    instId: str
    posSide: str
    pos: str
    upl: Optional[str] = None
    exitPx: Optional[str] = None

@app.post("/api/auth/login")
async def login_with_password(req: LoginRequest):
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

@app.get("/api/market/candles")
async def proxy_market_candles(instId: str, bar: str = "1H", limit: int = 300):
    """Proxy OKX candle API để tránh CORS trên mobile browser."""
    try:
        limit = int(limit)
        # Fetch first batch from market/candles (max 300)
        first_limit = min(limit, 300)
        url = f"https://www.okx.com/api/v5/market/candles?instId={instId}&bar={bar}&limit={first_limit}"
        resp = requests.get(url, timeout=10)
        data = resp.json()
        
        all_candles = []
        if data.get("code") == "0" and data.get("data"):
            all_candles.extend(data["data"])
            
            # If we need more, fetch from history-candles
            while len(all_candles) < limit:
                remain = limit - len(all_candles)
                fetch_count = min(remain, 100) # history-candles max is 100
                last_ts = all_candles[-1][0]
                h_url = f"https://www.okx.com/api/v5/market/history-candles?instId={instId}&bar={bar}&limit={fetch_count}&after={last_ts}"
                h_resp = requests.get(h_url, timeout=10)
                h_data = h_resp.json()
                if h_data.get("code") == "0" and h_data.get("data"):
                    all_candles.extend(h_data["data"])
                else:
                    break
        
        data["data"] = all_candles
        
        ob_boxes = []
        if data.get("code") == "0" and all_candles:
            candles = all_candles.copy()
            candles.reverse()  # Newest to oldest -> oldest to newest
            try:
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
                print(f"Error computing OBs: {e}")
        
        data['ob_boxes'] = ob_boxes
        return data
    except Exception as e:
        return {"code": "-1", "msg": str(e), "data": []}

@app.get("/api/market/ticker")
async def proxy_market_ticker(instId: str):
    """Proxy OKX ticker API để lấy giá BBO."""
    try:
        url = f"https://www.okx.com/api/v5/market/ticker?instId={instId}"
        resp = requests.get(url, timeout=5)
        return resp.json()
    except Exception as e:
        return {"code": "-1", "msg": str(e), "data": []}

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
async def get_bot_status(uid: str, strategy: str = "sub1"):
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
async def start_bot(uid: str, strategy: str = "sub1", env_file: str = ".api_sub1"):
    if not uid: raise HTTPException(status_code=400, detail="uid is required")
    if get_running_pid(uid, strategy) > 0:
        raise HTTPException(status_code=400, detail=f"Bot {strategy} is already running in background.")

    proc = get_nested(bot_processes, uid, strategy)
    if proc and proc.poll() is None:
        raise HTTPException(status_code=400, detail=f"Bot {strategy} is already running.")
        
    cmd = [sys.executable, XGUI_MAIN_PATH, "--run-bot", strategy, env_file]
    
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
        
        return {"message": f"Bot {strategy} started successfully.", "status": "RUNNING"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start bot: {e}")

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
async def get_bot_config(uid: str, strategy: str = "sub1"):
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
async def update_bot_config(update_data: ConfigUpdate, uid: str, strategy: str = "sub1"):
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

@app.get("/api/bot/credentials")
async def get_bot_credentials(uid: str, strategy: str = "sub1"):
    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}")
    env_file = f".api_{strategy}"
    env_path = os.path.join(config_dir, env_file)
    
    creds = {"api_key": "", "secret_key": "", "passphrase": ""}
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        v = v.strip("\"'")
                        if k == "OKX_API_KEY": creds["api_key"] = v
                        elif k == "OKX_SECRET_KEY": creds["secret_key"] = v
                        elif k == "OKX_PASSPHRASE": creds["passphrase"] = v
        except Exception:
            pass
    return creds

@app.post("/api/bot/credentials")
async def update_bot_credentials(creds: CredentialsUpdate, uid: str, strategy: str = "sub1"):
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

        resp = requests.get(base_url + path_cfg, headers=headers, timeout=5)
        if resp.status_code == 200:
            res_data = resp.json()
            if res_data.get("code") == "0" and len(res_data.get("data", [])) > 0:
                api_uid = res_data["data"][0].get("uid")
                main_uid = res_data["data"][0].get("mainUid")
                # Chấp nhận nếu UID của API trùng với UID đăng nhập (tài khoản chính hoặc sub-account tự đăng nhập)
                # Hoặc nếu API là của sub-account và mainUid của nó trùng với UID đăng nhập
                if api_uid != uid and main_uid != uid:
                    raise HTTPException(status_code=400, detail="API Key không thuộc về tài khoản OKX của bạn (UID không khớp)!")
            else:
                 raise HTTPException(status_code=400, detail="API Key không hợp lệ (OKX từ chối).")
        else:
            raise HTTPException(status_code=400, detail="Lỗi kết nối OKX API. Vui lòng kiểm tra lại Key, Secret, Passphrase.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi hệ thống khi kiểm tra API Key: {str(e)}")

    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}")
    os.makedirs(config_dir, exist_ok=True)
    env_path = os.path.join(config_dir, f".api_{strategy}")
    
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    # Modify or add keys
    keys = {
        "OKX_API_KEY": creds.api_key,
        "OKX_SECRET_KEY": creds.secret_key,
        "OKX_PASSPHRASE": creds.passphrase,
    }
    
    new_lines = []
    found_keys = set()
    for line in lines:
        stripped = line.strip()
        if "=" in stripped:
            k, _ = stripped.split("=", 1)
            if k in keys:
                new_lines.append(f"{k}={keys[k]}\n")
                found_keys.add(k)
                continue
        new_lines.append(line)
        
    for k, v in keys.items():
        if k not in found_keys:
            new_lines.append(f"{k}={v}\n")
            
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        return {"message": "Credentials updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write credentials: {e}")

@app.get("/api/bot/positions")
async def get_bot_positions(uid: str, strategy: str = "sub1"):
    # 1. Thử đọc Credentials từ file cấu hình .env (.api_sub1, .api_sub2...)
    api_key = ""
    secret_key = ""
    passphrase = ""
    is_demo = False
    
    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}")
    env_file = f".api_{strategy}"
    env_path = os.path.join(config_dir, env_file)
    
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
        except Exception:
            pass

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

                    # Create a map of OKX positions by instId
                    okx_pos_map = {}
                    for pos in raw_positions:
                        okx_pos_map[pos.get("instId")] = pos

                    # Sync and build tickets
                    dirty_markers = False
                    for coin, items in markers.items():
                        inst_id = f"{coin}-USDT-SWAP"
                        okx_pos = okx_pos_map.get(inst_id)
                        
                        has_active = any(i.get("status") == "active" for i in items)
                        if has_active and not okx_pos:
                            # Auto-sync: OKX closed but local still active
                            for item in items:
                                if item.get("status") == "active":
                                    item["status"] = "closed"
                            dirty_markers = True
                        elif has_active and okx_pos:
                            # Split into virtual tickets
                            tp_px = "---"
                            sl_px = "---"
                            for o in algo_data:
                                if o.get("instId") == inst_id:
                                    if o.get("tpTriggerPx"): tp_px = o.get("tpTriggerPx")
                                    if o.get("slTriggerPx"): sl_px = o.get("slTriggerPx")
                            
                            total_pos = abs(float(okx_pos.get("pos", 1)))
                            m_str = okx_pos.get("margin", "")
                            if not m_str or float(m_str) == 0:
                                m_str = okx_pos.get("imr", "0")
                            total_margin = float(m_str)
                            avg_px = float(okx_pos.get("avgPx", 0))
                            last_px = float(okx_pos.get("last", avg_px)) if okx_pos.get("last") else avg_px
                            pos_side = okx_pos.get("posSide", "long").lower()
                            leverage = float(okx_pos.get("lever", 1))
                            if pos_side == "net":
                                pos_val = float(okx_pos.get("pos", 0))
                                pos_side = "long" if pos_val > 0 else "short"
                            
                            # --- AUTO-CLEANUP TRÙNG LỆNH (ZOMBIE TICKETS) ---
                            active_items = [i for i in items if i.get("status") == "active" and i.get("side", "").lower() == pos_side]
                            total_active_vol = sum(abs(float(i.get("volume", 0))) for i in active_items)
                            
                            if total_active_vol > total_pos + 0.0001:
                                # Bot bị crash/restart nên tạo ra marker trùng lặp.
                                # Ta giữ lại các marker mới nhất sao cho tổng volume vừa đủ bằng total_pos.
                                active_items.sort(key=lambda x: x.get("time", 0), reverse=True)
                                acc_vol = 0
                                for i in active_items:
                                    vol = abs(float(i.get("volume", 0)))
                                    if acc_vol + 0.0001 >= total_pos:
                                        # Đã đủ volume, các lệnh còn lại là rác
                                        i["status"] = "closed"
                                        dirty_markers = True
                                    else:
                                        acc_vol += vol
                                        # Nếu cộng thêm lệnh này mà bị lố total_pos, ta cắt gọn volume của lệnh này lại
                                        if acc_vol > total_pos + 0.0001:
                                            i["volume"] = vol - (acc_vol - total_pos)
                                            acc_vol = total_pos
                                            dirty_markers = True
                            
                            # Tính lại total_active_vol sau khi cleanup
                            total_active_vol = sum(abs(float(i.get("volume", 0))) for i in items if i.get("status") == "active" and i.get("side", "").lower() == pos_side)
                            actual_total_vol = max(total_pos, total_active_vol)
                            if actual_total_vol == 0: actual_total_vol = 1
                            
                            for item in items:
                                if item.get("status") == "active" and item.get("side", "").lower() == pos_side:
                                    t_vol = abs(float(item.get("volume", 0)))
                                    if t_vol == 0: t_vol = total_pos # fallback
                                    
                                    ratio = t_vol / actual_total_vol
                                    t_margin = total_margin * ratio
                                    
                                    t_entry = float(item.get("price", avg_px))
                                    
                                    # Calculate ROI for this specific ticket
                                    if pos_side == "long":
                                        roi_val = ((last_px - t_entry) / t_entry) * 100 * leverage
                                    else:
                                        roi_val = ((t_entry - last_px) / t_entry) * 100 * leverage
                                        
                                    upl_val = t_margin * (roi_val / 100)
                                    
                                    formatted_positions.append({
                                        "ticket_id": item.get("ticket_id", f"#{item.get('time', '')}"),
                                        "instId": inst_id,
                                        "posSide": pos_side,
                                        "pos": str(t_vol),
                                        "margin": f"{t_margin:.2f}",
                                        "avgPx": str(t_entry),
                                        "lastPx": str(last_px),
                                        "roi": f"{roi_val:.2f}",
                                        "upl": f"{upl_val:.4f}",
                                        "tp": tp_px,
                                        "sl": sl_px,
                                        "lever": str(int(leverage)),
                                        "tf": item.get("tf", "")
                                    })
                                    
                    # If any markers were auto-closed, save to file
                    if dirty_markers:
                        try:
                            with open(positions_path, "w", encoding="utf-8") as f:
                                json.dump(markers, f)
                        except Exception: pass
                        
                    # If we don't have any markers but have OKX positions (e.g. manual trades), show them as 1 ticket
                    for inst_id, okx_pos in okx_pos_map.items():
                        coin = inst_id.split("-")[0]
                        if coin not in markers or not any(i.get("status") == "active" for i in markers[coin]):
                            avg_px = float(okx_pos.get("avgPx", 0))
                            last_px = float(okx_pos.get("last", avg_px)) if okx_pos.get("last") else avg_px
                            
                            pos_side = okx_pos.get("posSide", "long").lower()
                            pos_val = float(okx_pos.get("pos", 0))
                            if pos_side == "net":
                                pos_side = "long" if pos_val > 0 else "short"
                                
                            formatted_positions.append({
                                "ticket_id": "#MANUAL",
                                "instId": inst_id,
                                "posSide": pos_side,
                                "pos": str(abs(pos_val)),
                                "margin": okx_pos.get("margin") or okx_pos.get("imr") or "0",
                                "avgPx": str(avg_px),
                                "lastPx": str(last_px),
                                "roi": okx_pos.get("uplRatio", "0.00"),
                                "upl": okx_pos.get("upl", "0.00"),
                                "tp": "---",
                                "sl": "---",
                                "lever": okx_pos.get("lever", "100"),
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
            for item in items:
                if item.get("status") == "active":
                    mock_positions.append({
                        "ticket_id": item.get("ticket_id", f"#{item.get('time', '')}"),
                        "instId": f"{coin}-USDT-SWAP",
                        "posSide": item.get("side", "long").lower(),
                        "pos": str(item.get("volume", "1.0")),
                        "margin": "0.00",
                        "avgPx": str(item.get("price")),
                        "lastPx": str(item.get("price")),
                        "roi": "0.00",
                        "upl": "0.00",
                        "tp": "---",
                        "sl": "---",
                        "lever": "100",
                        "tf": item.get("tf", "")
                    })
        return mock_positions
    except Exception:
        return []

@app.get("/api/bot/closed_positions")
async def get_closed_positions(uid: str, strategy: str = "sub1"):
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
async def close_virtual_ticket(req: CloseTicketRequest, uid: str, strategy: str = "sub1"):
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
            
            # Calculate dynamic closing size based on ticket percentage
            positions_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", "trade_markers.json")
            target_coin = inst_id.split("-")[0]
            total_active_vol = 0.0
            ticket_vol = float(req.pos)
            
            if os.path.exists(positions_path):
                try:
                    with open(positions_path, "r", encoding="utf-8") as f:
                        markers = json.load(f)
                    if target_coin in markers:
                        total_active_vol = sum(float(i.get("volume", 0)) for i in markers[target_coin] if i.get("status") == "active" and i.get("side", "").lower() == pos_side)
                except: pass
                
            percentage = 1.0
            if total_active_vol > 0 and ticket_vol <= total_active_vol:
                percentage = ticket_vol / total_active_vol
                
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
                            okx_pos_vol = abs(p_val)
                    elif p_side == pos_side:
                        okx_pos_vol = abs(p_val)
            
            if okx_pos_vol > 0:
                if ticket_vol >= total_active_vol - 0.0001:
                    close_sz_val = okx_pos_vol
                else:
                    # Detect decimals precision directly from OKX's 'pos' string to match lotSz
                    pos_str = "0"
                    for p in pos_data.get("data", []):
                        p_side = p.get("posSide", "long").lower()
                        p_val = float(p.get("pos", 0))
                        if (p_side == "net" and ((pos_side == "long" and p_val > 0) or (pos_side == "short" and p_val < 0))) or (p_side == pos_side):
                            pos_str = str(p.get("pos", "0")).replace("-", "")
                            
                    decimals = len(pos_str.split(".")[1]) if "." in pos_str else 0
                    
                    if decimals == 0:
                        close_sz_val = max(1, int(okx_pos_vol * percentage))
                    else:
                        close_sz_val = round(okx_pos_vol * percentage, decimals)
                        if close_sz_val <= 0:
                            close_sz_val = 1 / (10**decimals) # Fallback to min tick size
                            
                    # Prevent partial close from accidentally closing 100% due to min size rounding
                    if close_sz_val >= okx_pos_vol - (1e-9):
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Lỗi: Vị thế trên OKX quá nhỏ ({okx_pos_vol}) nên không thể chia nhỏ để đóng từng phần! Vui lòng đóng toàn bộ vị thế hoặc tăng Volume."
                        )
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

def _get_okx_creds(uid: str, strategy: str):
    import os
    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}")
    env_path = os.path.join(config_dir, f".api_{strategy}")
    api_key, secret_key, passphrase, is_demo = "", "", "", False
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
        except Exception:
            pass
    return api_key, secret_key, passphrase, is_demo

def _okx_signed_request(method, path, body_str, api_key, secret_key, passphrase, is_demo):
    domain = "www.okx.com"
    base_url = f"https://{domain}"
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    message = ts + method + path + body_str
    mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod=hashlib.sha256)
    signature = base64.b64encode(mac.digest()).decode('utf-8')
    headers = {
        "OK-ACCESS-KEY": api_key,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": ts,
        "OK-ACCESS-PASSPHRASE": passphrase,
        "Content-Type": "application/json"
    }
    if is_demo:
        headers["x-simulated-trading"] = "1"
    
    if method == "GET":
        return requests.get(base_url + path, headers=headers, timeout=5)
    else:
        return requests.post(base_url + path, headers=headers, data=body_str, timeout=5)

@app.get("/api/account/balance")
async def get_account_balance(uid: str, strategy: str = "sub1", ccy: str = "USDT"):
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy)
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
async def place_manual_order(req: OrderRequest, uid: str, strategy: str = "sub1"):
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy)
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
