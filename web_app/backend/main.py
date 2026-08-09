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
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

def get_user_data_dir(uid: str) -> str:
    safe_uid = "".join(c for c in uid if c.isalnum() or c in ('_', '-'))
    if not safe_uid: safe_uid = "default"
    return os.path.join(LOCAL_APP_DATA, "TLS1_Trading_Users", safe_uid)

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
    enabled_tfs: List[str]

class CredentialsUpdate(BaseModel):
    api_key: str
    secret_key: str
    passphrase: str

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

def get_running_pid(uid: str, strategy: str) -> int:
    pid_file = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", f"{strategy}.pid")
    if os.path.exists(pid_file):
        try:
            with open(pid_file, "r") as f:
                pid = int(f.read().strip())
            if psutil.pid_exists(pid):
                p = psutil.Process(pid)
                if "python" in p.name().lower():
                    return pid
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
        custom_env["LOCALAPPDATA"] = get_user_data_dir(uid)
            
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
            "ENABLED_TFS": ["M5", "M15", "M30", "H1", "H2", "H4"]
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
            
    cfg["ENABLED_TFS"] = update_data.enabled_tfs
    
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
                "x-simulated-trading": "1" if is_demo else "0"
            }
            
            resp = requests.get(base_url + path_pos, headers=headers, timeout=4)
            if resp.status_code == 200:
                res_pos = resp.json()
                if res_pos.get("code") == "0":
                    raw_positions = res_pos.get("data", [])
                    
                    # Fetch thêm TP/SL algo để đính vào vị thế
                    path_algo = "/api/v5/trade/orders-pending?ordType=algo"
                    ts2 = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                    message2 = ts2 + "GET" + path_algo
                    mac2 = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message2, encoding='utf-8'), digestmod=hashlib.sha256)
                    signature2 = base64.b64encode(mac2.digest()).decode('utf-8')
                    
                    headers2 = {
                        "OK-ACCESS-KEY": api_key,
                        "OK-ACCESS-SIGN": signature2,
                        "OK-ACCESS-TIMESTAMP": ts2,
                        "OK-ACCESS-PASSPHRASE": passphrase,
                        "x-simulated-trading": "1" if is_demo else "0"
                    }
                    resp_algo = requests.get(base_url + path_algo, headers=headers2, timeout=4)
                    algo_data = []
                    if resp_algo.status_code == 200:
                        res_algo = resp_algo.json()
                        if res_algo.get("code") == "0":
                            algo_data = res_algo.get("data", [])
                            
                    formatted_positions = []
                    for pos in raw_positions:
                        inst = pos.get("instId")
                        tp_px = "---"
                        sl_px = "---"
                        for o in algo_data:
                            if o.get("instId") == inst:
                                if o.get("tpTriggerPx"): tp_px = o.get("tpTriggerPx")
                                if o.get("slTriggerPx"): sl_px = o.get("slTriggerPx")
                                
                        avg_px = float(pos.get("avgPx", 0))
                        last_px = float(pos.get("last", avg_px)) if pos.get("last") else avg_px
                        pos_side = pos.get("posSide", "long")
                        upl = float(pos.get("upl", 0))
                        
                        # Dùng uplRatio từ OKX API — chính xác hơn tự tính
                        upl_ratio = pos.get("uplRatio", "")
                        if upl_ratio and upl_ratio not in ("", "0", None):
                            roi = f"{float(upl_ratio) * 100:.2f}"
                        else:
                            # Fallback tính tay nếu OKX không trả uplRatio
                            roi = "0.00"
                            if avg_px > 0:
                                leverage = float(pos.get("lever", 1))
                                if pos_side == "long":
                                    roi = f"{((last_px - avg_px) / avg_px) * 100 * leverage:.2f}"
                                else:
                                    roi = f"{((avg_px - last_px) / avg_px) * 100 * leverage:.2f}"
                                    
                        formatted_positions.append({
                            "instId": inst,
                            "posSide": pos_side,
                            "pos": pos.get("pos"),
                            "margin": pos.get("margin") or pos.get("imr") or "0",
                            "avgPx": pos.get("avgPx"),
                            "lastPx": str(last_px),
                            "roi": roi,
                            "upl": pos.get("upl"),
                            "tp": tp_px,
                            "sl": sl_px,
                            "lever": pos.get("lever", "100"),
                        })
                    return formatted_positions
        except Exception:
            pass

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
                        "instId": f"{coin}-USDT-SWAP",
                        "posSide": item.get("side", "long").lower(),
                        "pos": "1.0 (MOCK)",
                        "margin": "100.00",
                        "avgPx": str(item.get("price")),
                        "lastPx": str(item.get("price")),
                        "roi": "0.00",
                        "upl": "0.00",
                        "tp": "---",
                        "sl": "---"
                    })
        return mock_positions
    except Exception:
        return []

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
