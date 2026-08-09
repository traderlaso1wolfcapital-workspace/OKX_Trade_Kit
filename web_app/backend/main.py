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

# AppData path của TLS1_Trading
LOCAL_APP_DATA = os.environ.get("LOCALAPPDATA", os.path.join(os.path.expanduser("~"), "AppData", "Local"))
USER_DATA_DIR = os.path.join(LOCAL_APP_DATA, "TLS1_Trading")

# Trạng thái tiến trình bot (hỗ trợ nhiều tab/sub)
bot_processes = {}
bot_start_times = {}
bot_log_queues = {} # strategy -> Queue

# WebSockets clients per strategy
active_connections = {} # strategy -> List[WebSocket]

class ConfigUpdate(BaseModel):
    enabled_tfs: List[str]

class CredentialsUpdate(BaseModel):
    api_key: str
    secret_key: str
    passphrase: str

async def log_reader_task(stream, strategy):
    """Đọc stdout/stderr của tiến trình bot và đẩy vào Queue"""
    if strategy not in bot_log_queues:
        bot_log_queues[strategy] = asyncio.Queue()
    queue = bot_log_queues[strategy]
    try:
        while True:
            # stream from subprocess.Popen is blocking, so use to_thread
            line = await asyncio.to_thread(stream.readline)
            if not line:
                break
            line_str = line.decode("utf-8", errors="replace").rstrip("\n")
            await queue.put(line_str)
            
            # Gửi cho các WS đang active của strategy này
            if strategy in active_connections:
                for connection in active_connections[strategy]:
                    try:
                        await connection.send_text(line_str)
                    except Exception:
                        pass
    except Exception as e:
        await queue.put(f"[SYSTEM ERROR] Log reader task failed: {e}")

@app.get("/api/market/candles")
async def proxy_market_candles(instId: str, bar: str = "1H", limit: int = 300):
    """Proxy OKX candle API để tránh CORS trên mobile browser."""
    try:
        url = f"https://www.okx.com/api/v5/market/candles?instId={instId}&bar={bar}&limit={limit}"
        resp = requests.get(url, timeout=10)
        return resp.json()
    except Exception as e:
        return {"code": "-1", "msg": str(e), "data": []}

def get_running_pid(strategy: str) -> int:
    pid_file = os.path.join(USER_DATA_DIR, f"bots/{strategy}", "json_data", f"{strategy}.pid")
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
async def get_bot_status(strategy: str = "sub1"):
    proc = bot_processes.get(strategy)
    is_running = False
    uptime = 0
    
    pid = get_running_pid(strategy)
    if pid > 0:
        is_running = True
        # Nếu process ngầm vẫn sống mà bot_processes không có thì set uptime mặc định hoặc estimate
        uptime = int(time.time() - bot_start_times.get(strategy, time.time()))
    elif proc and proc.poll() is None:
        is_running = True
        uptime = int(time.time() - bot_start_times.get(strategy, time.time()))
    else:
        if strategy in bot_processes:
            del bot_processes[strategy]
            
    return {
        "status": "RUNNING" if is_running else "STOPPED",
        "uptime": uptime,
        "strategy": strategy
    }

@app.post("/api/bot/start")
async def start_bot(strategy: str = "sub1", env_file: str = ".api_sub1"):
    if get_running_pid(strategy) > 0:
        raise HTTPException(status_code=400, detail=f"Bot {strategy} is already running in background.")

    proc = bot_processes.get(strategy)
    if proc and proc.poll() is None:
        raise HTTPException(status_code=400, detail=f"Bot {strategy} is already running.")
        
    cmd = [sys.executable, XGUI_MAIN_PATH, "--run-bot", strategy, env_file]
    
    try:
        flag_dir = os.path.join(USER_DATA_DIR, f"bots/{strategy}", "json_data")
        os.makedirs(flag_dir, exist_ok=True)
        flag_path = os.path.join(flag_dir, f"stop_{strategy}.flag")
        if os.path.exists(flag_path):
            os.remove(flag_path)
            
        new_proc = subprocess.Popen(
            cmd,
            cwd=OKX_TRADE_KIT_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        
        bot_processes[strategy] = new_proc
        bot_start_times[strategy] = time.time()
        
        # Reset queue log
        bot_log_queues[strategy] = asyncio.Queue()
        
        loop = asyncio.get_event_loop()
        loop.create_task(log_reader_task(new_proc.stdout, strategy))
        
        return {"message": f"Bot {strategy} started successfully.", "status": "RUNNING"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start bot: {e}")

@app.post("/api/bot/stop")
async def stop_bot(strategy: str = "sub1"):
    proc = bot_processes.get(strategy)
    
    flag_path = os.path.join(USER_DATA_DIR, f"bots/{strategy}", "json_data", f"stop_{strategy}.flag")
    try:
        os.makedirs(os.path.dirname(flag_path), exist_ok=True)
        with open(flag_path, "w") as f:
            f.write("stop")
    except Exception:
        pass
        
    pid = get_running_pid(strategy)
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
        del bot_processes[strategy]
    return {"message": f"Bot {strategy} stopped successfully.", "status": "STOPPED"}

@app.get("/api/bot/config")
async def get_bot_config(strategy: str = "sub1"):
    # Đọc cấu hình JSON
    config_path = os.path.join(USER_DATA_DIR, f"bots/{strategy}", "json_data", f"{strategy}_global_config.json")
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
async def update_bot_config(update_data: ConfigUpdate, strategy: str = "sub1"):
    config_dir = os.path.join(USER_DATA_DIR, f"bots/{strategy}", "json_data")
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
async def get_bot_credentials(strategy: str = "sub1"):
    config_dir = os.path.join(USER_DATA_DIR, f"bots/{strategy}")
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
async def update_bot_credentials(creds: CredentialsUpdate, strategy: str = "sub1"):
    config_dir = os.path.join(USER_DATA_DIR, f"bots/{strategy}")
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
async def get_bot_positions(strategy: str = "sub1"):
    # 1. Thử đọc Credentials từ file cấu hình .env (.api_sub1, .api_sub2...)
    api_key = ""
    secret_key = ""
    passphrase = ""
    is_demo = False
    
    config_dir = os.path.join(USER_DATA_DIR, f"bots/{strategy}")
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
    positions_path = os.path.join(USER_DATA_DIR, f"bots/{strategy}", "json_data", "trade_markers.json")
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

@app.websocket("/ws/logs/{strategy}")
async def websocket_logs(websocket: WebSocket, strategy: str):
    await websocket.accept()
    if strategy not in active_connections:
        active_connections[strategy] = []
    active_connections[strategy].append(websocket)
    
    # Gửi thông điệp chào mừng
    await websocket.send_text(f"🔄 Đã kết nối với TLS1 Trading Web Terminal Server ({strategy})...")
    
    # Đọc tối đa 100 dòng từ hàng đợi log_queue để hiển thị cho client vừa kết nối
    temp_list = []
    if strategy in bot_log_queues:
        q = bot_log_queues[strategy]
        size = min(q.qsize(), 100)
        for _ in range(size):
            try:
                val = q.get_nowait()
                temp_list.append(val)
                q.put_nowait(val) # Bỏ lại
            except Exception:
                break
                
    for log_line in temp_list:
        await websocket.send_text(log_line)
        
    try:
        while True:
            # Giữ kết nối mở, client gửi ping/pong
            await websocket.receive_text()
    except WebSocketDisconnect:
        if strategy in active_connections and websocket in active_connections[strategy]:
            active_connections[strategy].remove(websocket)
    except Exception:
        if strategy in active_connections and websocket in active_connections[strategy]:
            active_connections[strategy].remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
