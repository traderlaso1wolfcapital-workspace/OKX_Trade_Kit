import os
import sys
from dotenv import load_dotenv

# Tải biến môi trường từ file .env nếu có
load_dotenv()
import json
import time
import asyncio
import subprocess
import hmac
import hashlib
import base64
import requests
import csv
import jwt
import bcrypt
from cryptography.fernet import Fernet
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from collections import deque
from typing import Optional, List, Dict, Union, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title="TLS1 Trading Web Backend", version="1.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

LOCAL_APP_DATA = os.environ.get("LOCALAPPDATA", os.path.join(os.path.expanduser("~"), "AppData", "Local"))
MASTER_KEY_FILE = os.path.join(LOCAL_APP_DATA, "TLS1_Trading_Users", ".master_key")

def _get_or_create_master_key():
    os.makedirs(os.path.dirname(MASTER_KEY_FILE), exist_ok=True)
    if not os.path.exists(MASTER_KEY_FILE):
        key = Fernet.generate_key()
        with open(MASTER_KEY_FILE, "wb") as f:
            f.write(key)
        return key
    with open(MASTER_KEY_FILE, "rb") as f:
        return f.read().strip()

MASTER_KEY = _get_or_create_master_key()
fernet = Fernet(MASTER_KEY)
JWT_SECRET = MASTER_KEY.decode('utf-8')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

def create_jwt_token(uid: str, is_admin: bool = False):
    payload = {
        "uid": uid,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def encrypt_value(val: str) -> str:
    if not val: return val
    if val.startswith("ENC:"): return val
    return "ENC:" + fernet.encrypt(val.encode('utf-8')).decode('utf-8')

def decrypt_value(val: str) -> str:
    if not val: return val
    if val.startswith("ENC:"):
        try:
            return fernet.decrypt(val[4:].encode('utf-8')).decode('utf-8')
        except Exception:
            return ""
    return val

def is_admin_uid(uid: str) -> bool:
    if not uid: return False
    clean = str(uid).strip().lower()
    return clean == "admtls12021"

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

uid_cache = {}

@app.get("/api/auth/verify")
def verify_uid(uid: str, jwt_data: dict = Depends(verify_jwt)):
    if jwt_data["uid"] != uid and not jwt_data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    clean = str(uid).strip().lower() if uid else ""
    if is_admin_uid(clean):
        return {"status": "success", "message": "Admin login successful", "uid": uid}
        
    now = time.time()
    if clean in uid_cache and now - uid_cache[clean]["time"] < 300: # 5 minutes
        return uid_cache[clean]["result"]

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
                        result = {"status": "success", "uid": uid}
                        uid_cache[clean] = {"time": now, "result": result}
                        return result
                    else:
                        return {"status": "error", "message": f"Tài khoản đang bị khóa ({user_status})"}
        return {"status": "error", "message": "UID không tồn tại hoặc chưa đăng ký!"}
    except Exception as e:
        return {"status": "error", "message": f"Lỗi máy chủ kiểm tra UID: {str(e)}"}


# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
    strategy_config: Optional[Dict[str, Any]] = None

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

class OAuthCallbackRequest(BaseModel):
    code: str
    account_id: str
    uid: str
    strategy: str = "sub1"

def check_or_set_account_password(uid: str, password: Optional[str], is_admin: bool):
    clean = uid.lower()
    auth_dir = get_user_base_dir(clean)
    auth_file = os.path.join(auth_dir, "admin_auth.json" if is_admin else "user_auth.json")
    
    # 1. Chưa từng tạo mật khẩu: yêu cầu thiết lập mật khẩu bảo vệ
    if not os.path.exists(auth_file):
        if not password:
            account_type = "Admin" if is_admin else "tài khoản"
            return {
                "status": "require_create_password",
                "message": f"Lần đầu đăng nhập {account_type} [{uid}]! Vui lòng thiết lập mật khẩu bảo vệ để đăng nhập an toàn trên mọi thiết bị."
            }
        
        pwd = password.strip()
        if len(pwd) < 4:
            return {"status": "error", "message": "Mật khẩu phải có tối thiểu 4 ký tự!"}
        
        pwd_hash = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        os.makedirs(auth_dir, exist_ok=True)
        auth_data = {
            "uid": clean,
            "password_hash": pwd_hash,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        with open(auth_file, "w", encoding="utf-8") as f:
            json.dump(auth_data, f, indent=2)
        
        return {"status": "success", "message": "Thiết lập mật khẩu bảo vệ thành công!", "uid": uid}
    
    # 2. Đã có mật khẩu: yêu cầu nhập đúng mật khẩu
    else:
        if not password:
            account_type = "Admin" if is_admin else "tài khoản"
            return {
                "status": "require_password",
                "message": f"Vui lòng nhập mật khẩu cho {account_type} [{uid}]:"
            }
        
        try:
            with open(auth_file, "r", encoding="utf-8") as f:
                auth_data = json.load(f)
        except Exception as e:
            return {"status": "error", "message": f"Lỗi đọc file xác thực: {str(e)}"}
        
        saved_hash = auth_data.get("password_hash", "")
        
        if len(saved_hash) == 64 and not saved_hash.startswith("$2b$"):
            # Old SHA256 hash backward compatibility
            input_hash = hashlib.sha256(password.strip().encode("utf-8")).hexdigest()
            is_valid = (input_hash == saved_hash)
            if is_valid:
                new_hash = bcrypt.hashpw(password.strip().encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                auth_data["password_hash"] = new_hash
                with open(auth_file, "w", encoding="utf-8") as f:
                    json.dump(auth_data, f, indent=2)
        else:
            try:
                is_valid = bcrypt.checkpw(password.strip().encode("utf-8"), saved_hash.encode("utf-8"))
            except Exception:
                is_valid = False
        
        if not is_valid:
            return {"status": "error", "message": "Mật khẩu không chính xác! Vui lòng thử lại."}
        
        return {"status": "success", "message": "Đăng nhập thành công!", "uid": uid}

@app.post("/api/auth/login")
@limiter.limit("5/minute")
def login_with_password(request: Request, req: LoginRequest):
    uid = req.uid.strip() if req.uid else ""
    clean = uid.lower()
    if clean == "admtls12021":
        if not req.password:
            return {
                "status": "require_password",
                "message": "Vui lòng nhập mật khẩu cho Admin [admtls12021]:"
            }
        if req.password == "admtls12021@":
            return {"status": "success", "message": "Đăng nhập Admin thành công!", "uid": uid, "token": create_jwt_token(uid, is_admin=True)}
        return {"status": "error", "message": "Mật khẩu Admin không chính xác! Vui lòng thử lại."}

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
            
        # Xác thực hoặc thiết lập mật khẩu bảo vệ tài khoản User
        res = check_or_set_account_password(uid, req.password, is_admin=False)
        if res.get("status") == "success":
            res["token"] = create_jwt_token(uid, is_admin=False)
        return res
                
    except Exception as e:
        return {"status": "error", "message": f"Lỗi máy chủ kiểm tra UID: {str(e)}"}

@app.post("/api/auth/okx/callback")
@limiter.limit("5/minute")
def okx_oauth_callback(request: Request, req: OAuthCallbackRequest):
    uid = req.uid.strip() if req.uid else ""
    client_id = os.environ.get("OKX_OAUTH_CLIENT_ID", "6038d061f79a421ea44b3d1777bbef5dBRWpzwlb")
    client_secret = os.environ.get("OKX_OAUTH_CLIENT_SECRET", "")
    
    if not client_secret:
        return {"status": "error", "message": "Server chưa được cấu hình OKX_OAUTH_CLIENT_SECRET. Hãy thiết lập biến môi trường này cho máy chủ."}
        
    try:
        url = "https://www.okx.com/oauth2/v1/token"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
        
        # Origin có thể dùng để check redirect_uri
        origin = request.headers.get("origin")
        if not origin:
            # Fallback nếu gọi từ localhost test
            origin = "http://localhost:5173" if request.client.host == "127.0.0.1" else f"{request.url.scheme}://{request.url.netloc}"
            
        payload = {
            "grant_type": "authorization_code",
            "code": req.code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": f"{origin}/okx-callback"
        }
        
        resp = requests.post(url, data=payload, headers=headers, timeout=10)
        data = resp.json()
        
        if "access_token" in data or "apiKey" in data or "api_key" in data:
            # Tùy thuộc vào loại app (Trading/Broker), credentials có thể nằm sẵn trong payload
            api_key = data.get("apiKey") or data.get("api_key")
            secret_key = data.get("secretKey") or data.get("secret_key")
            passphrase = data.get("passphrase")
            
            if api_key and secret_key and passphrase:
                acc = req.account_id if req.account_id else req.strategy
                base_dir = get_user_data_dir(uid)
                fpath = os.path.join(base_dir, f"bots/{req.strategy}", f".api_{acc}")
                _save_env_file(fpath, api_key, secret_key, passphrase, is_demo=False)
                
                return {"status": "success", "message": "Kết nối OKX Fast Connect thành công!"}
            else:
                return {"status": "error", "message": "Không tìm thấy API Key trong phản hồi OKX. Đảm bảo App OKX là loại Trading/Broker.", "raw": data}
        else:
            return {"status": "error", "message": f"OKX trả về lỗi: {data.get('error_description') or data.get('msg') or data}", "raw": data}
            
    except Exception as e:
        return {"status": "error", "message": f"Lỗi server khi gọi OKX: {str(e)}"}

async def log_reader_task(stream, uid, strategy):
    """Đọc stdout/stderr của tiến trình bot và đẩy vào ring buffer (deque)"""
    if uid not in bot_log_queues: bot_log_queues[uid] = {}
    if strategy not in bot_log_queues[uid]: bot_log_queues[uid][strategy] = deque(maxlen=400)
    log_deque = bot_log_queues[uid][strategy]
    try:
        while True:
            line = await asyncio.to_thread(stream.readline)
            if not line: break
            line_str = line.decode("utf-8", errors="replace").rstrip("\n")
            log_deque.append(line_str)
            if uid in active_connections and strategy in active_connections[uid]:
                for connection in list(active_connections[uid][strategy]):
                    try: await connection.send_text(line_str)
                    except Exception: pass
    except Exception as e:
        log_deque.append(f"[SYSTEM ERROR] Log reader task failed: {e}")

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
_bg_fetch_tasks = set()

def _background_fill_candles(instId: str, bar: str, pool_key: tuple, target_limit: int = 2500):
    """Luồng nền (Pha 2): Âm thầm cào nốt nến lịch sử cũ hơn lấp đầy 2500 nến vào RAM không block giao diện."""
    try:
        while True:
            curr = _historical_pool.get(pool_key)
            if not curr or len(curr) >= target_limit:
                break
            remain = target_limit - len(curr)
            fetch_count = min(remain, 100)
            last_ts = curr[-1][0]
            h_url = f"https://www.okx.com/api/v5/market/history-candles?instId={instId}&bar={bar}&limit={fetch_count}&after={last_ts}"
            h_resp = _okx_session.get(h_url, timeout=6)
            h_data = h_resp.json()
            if h_data.get("code") == "0" and h_data.get("data"):
                curr.extend(h_data["data"])
                _historical_pool[pool_key] = curr
                time.sleep(0.08)  # Nhịp nghỉ tránh bị OKX rate-limit
            else:
                break
    except Exception:
        pass
    finally:
        _bg_fetch_tasks.discard(pool_key)

def compute_ob_boxes(all_candles):
    """Tính toán Order Blocks từ dữ liệu nến."""
    ob_boxes = []
    if not all_candles:
        return ob_boxes
    try:
        candles = all_candles.copy()
        candles.reverse()  # Newest to oldest -> oldest to newest
        n = len(candles)
        if n < 5:
            return ob_boxes
            
        times = [int(c[0]) for c in candles]
        opens = [Decimal(c[1]) for c in candles]
        highs = [Decimal(c[2]) for c in candles]
        lows = [Decimal(c[3]) for c in candles]
        closes = [Decimal(c[4]) for c in candles]
        
        atr_period = 14
        tr_list = []
        for i in range(1, n):
            tr = max(highs[i] - lows[i], abs(highs[i] - closes[i-1]), abs(lows[i] - closes[i-1]))
            tr_list.append(tr)
            
        if len(tr_list) >= atr_period:
            atr = sum(tr_list[-atr_period:]) / Decimal(atr_period)
        else:
            atr = sum(tr_list) / Decimal(len(tr_list)) if tr_list else Decimal("100")
            
        # Tìm FVG và OB
        recent_count = min(n, 150)
        start_idx = n - recent_count
        raw_obs = []
        for i in range(max(2, start_idx), n - 1):
            # Bullish FVG & Bullish OB
            if lows[i+1] > highs[i-1]:
                gap = lows[i+1] - highs[i-1]
                if gap >= atr * Decimal("0.2"):
                    for j in range(i, max(-1, i - 4), -1):
                        if closes[j] < opens[j]:
                            raw_obs.append({
                                "bias": 1,
                                "time": times[j],
                                "high": float(highs[j]),
                                "low": float(lows[j]),
                                "candle_idx": j
                            })
                            break
            # Bearish FVG & Bearish OB
            elif highs[i+1] < lows[i-1]:
                gap = lows[i-1] - highs[i+1]
                if gap >= atr * Decimal("0.2"):
                    for j in range(i, max(-1, i - 4), -1):
                        if closes[j] > opens[j]:
                            raw_obs.append({
                                "bias": -1,
                                "time": times[j],
                                "high": float(highs[j]),
                                "low": float(lows[j]),
                                "candle_idx": j
                            })
                            break
                            
        # Lọc bỏ các OB đã bị giá đâm thủng qua (mitigated / lấp hết)
        unmitigated_obs = []
        for ob in raw_obs:
            j = ob.get("candle_idx", 0)
            ob_low = Decimal(str(ob["low"]))
            ob_high = Decimal(str(ob["high"]))
            is_pierced = False
            for k in range(j + 1, n):
                if ob["bias"] == 1 and closes[k] < ob_low:
                    is_pierced = True
                    break
                elif ob["bias"] == -1 and closes[k] > ob_high:
                    is_pierced = True
                    break
            if not is_pierced:
                unmitigated_obs.append(ob)

        # Lọc và gộp các vùng OB đè nhau
        for bias in [1, -1]:
            biased = [o for o in unmitigated_obs if o["bias"] == bias]
            biased.sort(key=lambda x: x["low"])
            merged = []
            for o in biased:
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
    except Exception:
        pass
    return ob_boxes

@app.get("/api/market/candles")
def proxy_market_candles(instId: str, bar: str = "1H", limit: int = 2500):
    """Proxy OKX candle API với cơ chế 2 Pha Tức Thì (0.15s Pha 1 + Nền Pha 2 lấp đầy 2500 nến)."""
    try:
        limit = int(limit)
        now = time.time()
        cache_key = f"{instId}_{bar}_{limit}"
        cached = _okx_cache.get(cache_key)
        if cached and (now - cached["time"] < 4):
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

        # TRƯỜNG HỢP 1: Đã có sẵn pool trong RAM >= 300 nến
        # Cập nhật nhanh 100 nến mới nhất (~0.08s)
        if cached_pool and len(cached_pool) >= 300:
            try:
                url = f"https://www.okx.com/api/v5/market/candles?instId={instId}&bar={bar}&limit=100"
                resp = _okx_session.get(url, timeout=4)
                d = resp.json()
                if d.get("code") == "0" and d.get("data"):
                    new_candles = d["data"]
                    merged_dict = {c[0]: c for c in cached_pool}
                    for c in new_candles:
                        merged_dict[c[0]] = c
                    all_candles = sorted(merged_dict.values(), key=lambda x: int(x[0]), reverse=True)
                    _historical_pool[pool_key] = all_candles
                else:
                    all_candles = cached_pool
            except Exception:
                all_candles = cached_pool

            # Nếu pool chưa đủ 2500 nến và chưa có task chạy ngầm -> kích hoạt Pha 2 chạy ngầm
            if len(all_candles) < limit and pool_key not in _bg_fetch_tasks:
                _bg_fetch_tasks.add(pool_key)
                threading.Thread(target=_background_fill_candles, args=(instId, bar, pool_key, limit), daemon=True).start()

        # TRƯỜNG HỢP 2: Pool chưa có hoặc < 300 nến (Lần đầu mở Coin / TF mới)
        # PHA 1 (Tức thì ~0.15s): Chỉ gọi đúng 1 request OKX lấy 300 nến mới nhất
        if not all_candles:
            url = f"https://www.okx.com/api/v5/market/candles?instId={instId}&bar={bar}&limit=300"
            resp = _okx_session.get(url, timeout=5)
            data = resp.json()
            if data.get("code") == "0" and data.get("data"):
                all_candles = data["data"]
                _historical_pool[pool_key] = all_candles

                # PHA 2 (Chạy ngầm): Kích hoạt Thread nền cào nốt các nến cũ lùi về sau tới 2500 nến
                if limit > 300 and pool_key not in _bg_fetch_tasks:
                    _bg_fetch_tasks.add(pool_key)
                    threading.Thread(target=_background_fill_candles, args=(instId, bar, pool_key, limit), daemon=True).start()

        ob_boxes = compute_ob_boxes(all_candles)
        res_data = {
            "code": "0",
            "msg": "",
            "data": all_candles[:limit],
            "ob_boxes": ob_boxes
        }
        _okx_cache[cache_key] = {"time": now, "data": res_data}
        return res_data
    except Exception as e:
        return {"code": "-1", "msg": str(e), "data": []}

def _warmup_backend_candles():
    """Tự động nạp sẵn nến các khung giờ chính cho BTC, ETH, XAU ngay khi khởi động."""
    import time
    time.sleep(1.0)
    top_coins = ["BTC-USDT-SWAP", "ETH-USDT-SWAP", "XAU-USDT-SWAP"]
    top_bars = ["5m", "15m", "30m", "1H", "4H"]
    for c in top_coins:
        for b in top_bars:
            try:
                proxy_market_candles(instId=c, bar=b, limit=300)
                time.sleep(0.04)
            except Exception:
                pass
    try:
        proxy_market_candles(instId="CRYPTOCAP:USDT.D", bar="1H", limit=300)
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
                        if k == "OKX_API_KEY": creds["api_key"] = decrypt_value(v)
                        elif k == "OKX_SECRET_KEY": creds["secret_key"] = decrypt_value(v)
                        elif k == "OKX_PASSPHRASE": creds["passphrase"] = decrypt_value(v)
                        elif k == "OKX_IS_DEMO": creds["is_demo"] = (v.lower() == "true")
        except Exception:
            pass
    return creds

def _get_okx_creds(uid: str, strategy: str = "sub1", account_id: str = None):
    data_dir = get_user_data_dir(uid)
    
    # Khi chỉ định rõ account_id: TUYỆT ĐỐI KHÔNG fallback sang strategy hay tài khoản khác!
    if account_id and account_id.strip():
        target_acc = account_id.strip()
        candidate_paths = [
            os.path.join(data_dir, f"bots/{target_acc}", f".api_{target_acc}"),
            os.path.join(data_dir, f"accounts/{target_acc}", f".api_{target_acc}"),
            os.path.join(data_dir, f"bots/{strategy}", f".api_{target_acc}"),
            os.path.join(data_dir, f".api_{target_acc}"),
            os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}", f".api_{target_acc}"),
            os.path.join(OKX_TRADE_KIT_DIR, f".api_{target_acc}"),
        ]
        # Chỉ kiểm tra .api_botEMA200 nếu chính account_id đó là "sub1" hoặc ".api_botEMA200"
        if target_acc in ["sub1", ".api_botEMA200"]:
            candidate_paths.extend([
                os.path.join(OKX_TRADE_KIT_DIR, ".api_botEMA200"),
                os.path.join(data_dir, ".api_botEMA200")
            ])
            
        for p in candidate_paths:
            if os.path.exists(p):
                c = _parse_env_file(p)
                if c["api_key"] and c["secret_key"] and c["passphrase"]:
                    return c["api_key"], c["secret_key"], c["passphrase"], c["is_demo"]
        return "", "", "", False

    # Khi không truyền account_id (lấy mặc định của bot/strategy)
    target_acc = strategy
    candidate_paths = [
        os.path.join(data_dir, f"bots/{strategy}", f".api_{strategy}"),
        os.path.join(data_dir, f".api_{strategy}"),
        os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}", f".api_{strategy}"),
        os.path.join(OKX_TRADE_KIT_DIR, f".api_{strategy}"),
    ]
    if strategy == "sub1":
        candidate_paths.append(os.path.join(OKX_TRADE_KIT_DIR, ".api_botEMA200"))
        candidate_paths.append(os.path.join(data_dir, ".api_botEMA200"))
        
    for p in candidate_paths:
        if os.path.exists(p):
            c = _parse_env_file(p)
            if c["api_key"] and c["secret_key"] and c["passphrase"]:
                return c["api_key"], c["secret_key"], c["passphrase"], c["is_demo"]
                
    return "", "", "", False

def _okx_signed_request(method: str, path: str, body_str: str, api_key: str, secret_key: str, passphrase: str, is_demo: bool = False, timeout: int = 10):
    base_url = "https://www.okx.com"
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    method_upper = method.upper()
    body = body_str if (body_str and method_upper == "POST") else ""
    message = ts + method_upper + path + body
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
    if method_upper == "GET":
        return requests.get(base_url + path, headers=headers, timeout=timeout)
    elif method_upper == "POST":
        return requests.post(base_url + path, headers=headers, data=body, timeout=timeout)
    elif method_upper == "DELETE":
        return requests.delete(base_url + path, headers=headers, data=body, timeout=timeout)
    else:
        return requests.request(method_upper, base_url + path, headers=headers, data=body, timeout=timeout)


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
        "OKX_API_KEY": encrypt_value(api_key),
        "OKX_SECRET_KEY": encrypt_value(secret_key),
        "OKX_PASSPHRASE": encrypt_value(passphrase),
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
    data_dir = get_user_data_dir(uid)
    acc_name = strategy
    
    # Lấy tài khoản đang chạy hiện tại của strategy này
    running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
    if os.path.exists(running_acc_file):
        try:
            with open(running_acc_file, "r") as f:
                content = f.read().strip()
                if content:
                    acc_name = content
        except:
            pass

    pid_file = os.path.join(data_dir, f"bots/{strategy}", "json_data", f"{acc_name}.pid")
    
    # Fallback nếu dùng tên strategy mặc định
    if not os.path.exists(pid_file):
        pid_file = os.path.join(data_dir, f"bots/{strategy}", "json_data", f"{strategy}.pid")

    if os.path.exists(pid_file):
        try:
            with open(pid_file, "r") as f:
                pid = int(f.read().strip())
            # Nếu có thư viện psutil, kiểm tra xem pid có thực sự đang chạy không
            try:
                import psutil
                if psutil.pid_exists(pid):
                    _ = psutil.Process(pid)
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

def _get_flag_dir(uid: str, strategy: str) -> str:
    return os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")

def _is_shadow_mode(uid: str, strategy: str) -> bool:
    """Trả về True nếu bot đang chạy ngầm (dry_run=True)"""
    acc_name = strategy
    flag = os.path.join(_get_flag_dir(uid, strategy), f"dry_run_{acc_name}.flag")
    if os.path.exists(flag):
        try:
            return open(flag).read().strip() == "1"
        except:
            pass
    return True  # mặc định nếu chưa có file — coi như shadow

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

    # Calculate active_accounts
    data_dir = get_user_data_dir(uid)
    active_accounts = {}
    for strat in ["sub1", "sub2", "sub3"]:
        s_proc = get_nested(bot_processes, uid, strat)
        s_pid = get_running_pid(uid, strat)
        if s_pid > 0 or (s_proc and s_proc.poll() is None):
            running_acc_file = os.path.join(data_dir, f"bots/{strat}", f".running_account_{strat}")
            if os.path.exists(running_acc_file):
                try:
                    with open(running_acc_file, "r") as f:
                        acc = f.read().strip()
                        if acc:
                            active_accounts[strat] = acc
                except: pass

    if is_running:
        # Phân biệt RUNNING (live) vs SHADOW (dry-run)
        shadow = _is_shadow_mode(uid, strategy)
        return {
            "status": "SHADOW" if shadow else "RUNNING",
            "uptime": uptime,
            "strategy": strategy,
            "dry_run": shadow,
            "active_accounts": active_accounts
        }
    return {"status": "STOPPED", "uptime": 0, "strategy": strategy, "dry_run": True, "active_accounts": active_accounts}

@app.on_event("startup")
async def auto_resume_bots():
    print("[SYSTEM] Bắt đầu tự động khôi phục các bot đang chạy...")
    base_dir = os.path.join(LOCAL_APP_DATA, "TLS1_Trading_Users")
    if not os.path.exists(base_dir): return
    try:
        for uid in os.listdir(base_dir):
            user_dir = os.path.join(base_dir, uid, "TLS1_Trading", "bots")
            if not os.path.exists(user_dir): continue
            for strategy in os.listdir(user_dir):
                strat_dir = os.path.join(user_dir, strategy)
                flag_dir = os.path.join(strat_dir, "json_data")
                if not os.path.exists(flag_dir): continue
                
                kill_flag = os.path.join(flag_dir, f"kill_{strategy}.flag")
                if os.path.exists(kill_flag): continue
                
                activate_flag = os.path.join(flag_dir, f"activate_{strategy}.flag")
                stop_flag = os.path.join(flag_dir, f"stop_{strategy}.flag")
                
                if os.path.exists(activate_flag) or os.path.exists(stop_flag):
                    strat_env_file = f".api_{strategy}"
                    if not os.path.exists(os.path.join(strat_dir, strat_env_file)): continue
                    
                    print(f"[SYSTEM] Tự động khởi động lại bot {strategy} cho user {uid}")
                    cmd = [sys.executable, XGUI_MAIN_PATH, "--run-bot", strategy, strat_env_file]
                    custom_env = os.environ.copy()
                    custom_env["PYTHONPATH"] = OKX_TRADE_KIT_DIR
                    custom_env["LOCALAPPDATA"] = get_user_base_dir(uid)
                    custom_env["PYTHONUNBUFFERED"] = "1"
                    custom_env["PYTHONIOENCODING"] = "utf-8"
                    
                    try:
                        new_proc = subprocess.Popen(
                            cmd, cwd=OKX_TRADE_KIT_DIR,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            env=custom_env,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                        )
                        set_nested(bot_processes, uid, strategy, new_proc)
                        set_nested(bot_start_times, uid, strategy, time.time())
                        if uid not in bot_log_queues: bot_log_queues[uid] = {}
                        bot_log_queues[uid][strategy] = deque(maxlen=400)
                        loop = asyncio.get_event_loop()
                        loop.create_task(log_reader_task(new_proc.stdout, uid, strategy))
                    except Exception as e:
                        print(f"[SYSTEM] Lỗi khi tự động khởi động bot {strategy} (UID: {uid}): {e}")
    except Exception as e:
        print(f"[SYSTEM] Lỗi quét thư mục auto_resume_bots: {e}")

def _cancel_unfilled_limit_orders(uid: str, strategy: str, account_id: str = None, action_name: str = "BOT") -> int:
    """Quét và hủy toàn bộ lệnh Limit chưa khớp trên OKX, bảo lưu 100% TP/SL."""
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    canceled_orders = 0
    if api_key and secret_key and passphrase:
        try:
            resp = _okx_signed_request("GET", "/api/v5/trade/orders-pending?instType=SWAP", "", api_key, secret_key, passphrase, is_demo)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                # Chỉ hủy các lệnh Limit mở vị thế chưa khớp, TUYỆT ĐỐI không hủy lệnh đóng vị thế (reduceOnly)
                to_cancel = [
                    {"instId": o["instId"], "ordId": o["ordId"]}
                    for o in data
                    if o.get("ordType") == "limit" and str(o.get("reduceOnly", "")).lower() != "true"
                ]
                if to_cancel:
                    for i in range(0, len(to_cancel), 20):
                        batch = to_cancel[i:i+20]
                        _okx_signed_request("POST", "/api/v5/trade/cancel-batch-orders", json.dumps(batch), api_key, secret_key, passphrase, is_demo)
                    canceled_orders = len(to_cancel)
                    print(f"🧹 [{action_name}] Đã hủy thành công {canceled_orders} lệnh Limit chưa khớp trên OKX cho {target_acc}. Bảo lưu 100% TP/SL!", flush=True)
                else:
                    print(f"ℹ️ [{action_name}] Không có lệnh Limit chờ nào cần hủy trên OKX cho {target_acc}.", flush=True)
        except Exception as e:
            print(f"⚠️ [{action_name}] Lỗi dọn dẹp lệnh Limit trên OKX: {e}", flush=True)
    return canceled_orders

@app.post("/api/bot/start")
async def start_bot(uid: str, strategy: str = "sub1", env_file: str = None, account_id: str = None):
    if not uid: raise HTTPException(status_code=400, detail="uid is required")

    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    if not (api_key and secret_key and passphrase):
        raise HTTPException(status_code=400, detail=f"Cần cấu hình API Key cho tài khoản '{target_acc}' trước khi khởi động Bot {strategy}!")

    # Đồng bộ API key đã chọn vào các file env của bot
    data_dir = get_user_data_dir(uid)
    strat_env_file = f".api_{strategy}"
    strat_env_path = os.path.join(data_dir, f"bots/{strategy}", strat_env_file)
    _save_env_file(strat_env_path, api_key, secret_key, passphrase, is_demo)
    _save_env_file(os.path.join(data_dir, strat_env_file), api_key, secret_key, passphrase, is_demo)
    _save_env_file(os.path.join(data_dir, f"bots/{strategy}", f".api_{target_acc}"), api_key, secret_key, passphrase, is_demo)

    flag_dir = _get_flag_dir(uid, strategy)
    os.makedirs(flag_dir, exist_ok=True)
    acc_name = strategy

    # 🧹 Dọn sạch toàn bộ lệnh Limit cũ chưa khớp trên OKX để bot đặt lại theo logic mới (bảo lưu 100% TP/SL)
    canceled_orders = _cancel_unfilled_limit_orders(uid, strategy, target_acc, action_name="START BOT")

    proc = get_nested(bot_processes, uid, strategy)
    pid = get_running_pid(uid, strategy)
    process_alive = (pid > 0) or (proc and proc.poll() is None)

    running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
    current_running_acc = ""
    if os.path.exists(running_acc_file):
        with open(running_acc_file, "r") as f:
            current_running_acc = f.read().strip()

    if process_alive:
        if current_running_acc != target_acc:
            # Tài khoản thay đổi -> KILL process để khởi động lại với API key mới
            if proc:
                try:
                    import psutil
                    parent = psutil.Process(proc.pid)
                    for child in parent.children(recursive=True): child.kill()
                    parent.kill()
                except: proc.kill()
            elif pid > 0:
                try:
                    import psutil
                    parent = psutil.Process(pid)
                    for child in parent.children(recursive=True): child.kill()
                    parent.kill()
                except: pass
            del_nested(bot_processes, uid, strategy)
            process_alive = False
        else:
            # Process đang chạy và cùng tài khoản -> chỉ cần kích hoạt bằng flag
            stop_flag = os.path.join(flag_dir, f"stop_{acc_name}.flag")
            if os.path.exists(stop_flag):
                try: os.remove(stop_flag)
                except: pass
            try:
                with open(os.path.join(flag_dir, f"activate_{acc_name}.flag"), "w") as f:
                    f.write("1")
                with open(os.path.join(flag_dir, f"dry_run_{acc_name}.flag"), "w") as f:
                    f.write("0")
                set_nested(bot_start_times, uid, strategy, time.time())
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Lỗi ghi activate flag: {e}")
            clean_info = f" (Đã dọn {canceled_orders} lệnh Limit cũ)" if canceled_orders > 0 else ""
            return {"status": "success", "message": f"⚡ Bot đã được KÍCH HOẠT!{clean_info} Lệnh thật sẽ được đặt lên OKX theo nến hiện tại.", "canceled_count": canceled_orders}

    # Process chưa chạy — spawn mới (bắt đầu ở DRY_RUN, ngay sau đó activate)
    try:
        with open(running_acc_file, "w") as f:
            f.write(target_acc)
    except: pass

    cmd = [sys.executable, XGUI_MAIN_PATH, "--run-bot", strategy, strat_env_file]
    try:
        # Xoá stop/kill flag cũ
        for fname in [f"stop_{acc_name}.flag", f"kill_{acc_name}.flag"]:
            fp = os.path.join(flag_dir, fname)
            if os.path.exists(fp):
                try: os.remove(fp)
                except: pass

        # Viết flag Kích hoạt & Tắt Shadow mode ngay lập tức trước khi chạy process
        # để UI không bị giật (flicker) trạng thái "Dừng" trong 2 giây đầu.
        try:
            with open(os.path.join(flag_dir, f"activate_{acc_name}.flag"), "w") as f:
                f.write("1")
            with open(os.path.join(flag_dir, f"dry_run_{acc_name}.flag"), "w") as f:
                f.write("0")
        except: pass

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
        bot_log_queues[uid][strategy] = deque(maxlen=400)
        loop = asyncio.get_event_loop()
        loop.create_task(log_reader_task(new_proc.stdout, uid, strategy))

        clean_info = f" (Đã dọn {canceled_orders} lệnh Limit cũ)" if canceled_orders > 0 else ""
        return {"status": "success", "message": f"Đã khởi động và kích hoạt Bot thành công!{clean_info}", "canceled_count": canceled_orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/bot/reset_capital")
def reset_capital(uid: str, strategy: str = "sub1", account_id: str = None):
    if not uid: raise HTTPException(status_code=400, detail="uid is required")
    
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    data_dir = get_user_data_dir(uid)
    
    # 1. Lấy API credentials của tài khoản được chỉ định
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    if not api_key or not secret_key or not passphrase:
        raise HTTPException(
            status_code=400,
            detail=f"Tài khoản [{target_acc}] chưa có API Key OKX! Vui lòng nhập và lưu API Key trước khi thực hiện Reset Vốn Gốc."
        )
        
    # 2. Quét trực tiếp số dư thực tế từ sàn OKX qua API v5
    try:
        resp = _okx_signed_request(
            method="GET",
            path="/api/v5/account/balance",
            body_str="",
            api_key=api_key,
            secret_key=secret_key,
            passphrase=passphrase,
            is_demo=is_demo,
            timeout=10
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Sàn OKX từ chối (HTTP {resp.status_code}): {resp.text}")
            
        res_json = resp.json()
        if res_json.get("code") != "0":
            err_msg = res_json.get("msg", "Lỗi không xác định từ sàn OKX")
            raise HTTPException(status_code=400, detail=f"Sàn OKX báo lỗi ({res_json.get('code')}): {err_msg}")
            
        bal_data = res_json.get("data", [{}])[0]
        total_eq_str = bal_data.get("totalEq", "0")
        total_equity = float(total_eq_str) if total_eq_str else 0.0
        
        # Nếu totalEq chưa có giá trị, quét chi tiết số dư USDT
        if total_equity <= 0:
            for detail in bal_data.get("details", []):
                if detail.get("ccy") == "USDT":
                    total_equity = float(detail.get("eq", detail.get("cashBal", 0.0)))
                    break
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn số dư OKX: {str(e)}")
        
    # 3. Cập nhật mốc VỐN GỐC mới vào toàn bộ các file dữ liệu tiến hóa
    evo_files = [
        os.path.join(data_dir, f"bots/{strategy}/json_data", f"{target_acc}_du_lieu_tien_hoa.json"),
        os.path.join(data_dir, f"bots/{strategy}/json_data", f"{strategy}_du_lieu_tien_hoa.json"),
        os.path.join(data_dir, f"bots/{strategy}/json_data", f"{target_acc}_evolution_data.json"),
        os.path.join(data_dir, f"bots/{strategy}/json_data", f"{strategy}_evolution_data.json"),
        os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}/json_data", f"{target_acc}_du_lieu_tien_hoa.json"),
        os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}/json_data", f"{strategy}_du_lieu_tien_hoa.json"),
    ]
    for evo_file in evo_files:
        try:
            os.makedirs(os.path.dirname(evo_file), exist_ok=True)
            evo_data = {}
            if os.path.exists(evo_file):
                try:
                    with open(evo_file, "r", encoding="utf-8") as f:
                        evo_data = json.load(f)
                except Exception:
                    evo_data = {}
            evo_data["wallet_stats"] = {
                "von_goc": round(total_equity, 2),
                "von_hien_tai": round(total_equity, 2),
                "loi_nhuan": 0.0,
                "tang_truong": 0.0,
                "last_reset_ts": time.time()
            }
            with open(evo_file, "w", encoding="utf-8") as f:
                json.dump(evo_data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    # 4. Ghi cờ flag cho bot process ngầm nhận biết và đồng bộ ngay
    flag_dir = os.path.join(data_dir, f"bots/{strategy}", "json_data")
    os.makedirs(flag_dir, exist_ok=True)
    for flag_name in [f"reset_wallet_{strategy}.flag", f"reset_wallet_{target_acc}.flag"]:
        try:
            with open(os.path.join(flag_dir, flag_name), "w") as f:
                f.write("1")
        except Exception:
            pass

    return {
        "status": "success",
        "total_equity": round(total_equity, 2),
        "account": target_acc,
        "message": f"✅ Đã Reset Vốn Gốc thành công!\nTổng vốn quét thực tế từ sàn OKX: {total_equity:,.2f} USDT"
    }

@app.post("/api/bot/reset_nen")
def reset_nen(uid: str, strategy: str = "sub1"):
    if not uid: raise HTTPException(status_code=400, detail="uid is required")
    if not is_admin_uid(uid):
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
async def stop_bot(uid: str, strategy: str = "sub1", account_id: str = None):
    """Dừng bot (chuyển về Shadow mode). Hủy toàn bộ limit chưa khớp trên sàn, bảo lưu 100% TP/SL."""
    acc_name = strategy
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    flag_dir = _get_flag_dir(uid, strategy)
    os.makedirs(flag_dir, exist_ok=True)

    # 1. Ghi stop flag & dry_run flag TRƯỚC TIÊN → để tiến trình bot chuyển ngay về DRY_RUN ngầm, cấm đặt lệnh mới
    try:
        with open(os.path.join(flag_dir, f"stop_{acc_name}.flag"), "w") as f:
            f.write("stop")
        with open(os.path.join(flag_dir, f"dry_run_{acc_name}.flag"), "w") as f:
            f.write("1")
    except Exception:
        pass

    # Xóa activate flag nếu có (tránh race condition)
    activate_flag = os.path.join(flag_dir, f"activate_{acc_name}.flag")
    if os.path.exists(activate_flag):
        try: os.remove(activate_flag)
        except: pass

    # Đợi 0.5s để tiến trình bot nhận cờ DRY_RUN và không nhảy vào EMERGENCY RE-PLACE
    await asyncio.sleep(0.5)

    # 2. Quét và Hủy toàn bộ lệnh Limit chưa khớp trên sàn OKX (giữ nguyên TP/SL)
    canceled_orders = _cancel_unfilled_limit_orders(uid, strategy, target_acc, action_name="STOP BOT")

    msg = f"Bot {strategy} đã dừng! Toàn bộ lệnh Limit chưa khớp đã được hủy ({canceled_orders} lệnh). TP/SL của các vị thế đang chạy được giữ nguyên 100%."
    return {"message": msg, "status": "SHADOW", "canceled_count": canceled_orders}

@app.post("/api/bot/shadow/start")
async def start_shadow_bot(uid: str, strategy: str = "sub1", account_id: str = None):
    """
    Khởi động Shadow Bot nếu chưa chạy. Gọi khi app load để warm-up EMA/nến ngầm.
    Nếu process đã alive — không làm gì.
    """
    if not uid: raise HTTPException(status_code=400, detail="uid is required")

    pid = get_running_pid(uid, strategy)
    proc = get_nested(bot_processes, uid, strategy)
    if pid > 0 or (proc and proc.poll() is None):
        return {"status": "already_running", "message": "Shadow bot đang chạy rồi."}

    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    if not (api_key and secret_key and passphrase):
        return {"status": "no_credentials", "message": "Chưa có API Key — bỏ qua khởi động Shadow Bot."}

    data_dir = get_user_data_dir(uid)
    strat_env_file = f".api_{strategy}"
    strat_env_path = os.path.join(data_dir, f"bots/{strategy}", strat_env_file)
    _save_env_file(strat_env_path, api_key, secret_key, passphrase, is_demo)
    _save_env_file(os.path.join(data_dir, strat_env_file), api_key, secret_key, passphrase, is_demo)
    _save_env_file(os.path.join(data_dir, f"bots/{strategy}", f".api_{target_acc}"), api_key, secret_key, passphrase, is_demo)

    flag_dir = _get_flag_dir(uid, strategy)
    os.makedirs(flag_dir, exist_ok=True)
    # Xóa kill flag cũ
    kill_flag = os.path.join(flag_dir, f"kill_{strategy}.flag")
    if os.path.exists(kill_flag):
        try: os.remove(kill_flag)
        except: pass

    cmd = [sys.executable, XGUI_MAIN_PATH, "--run-bot", strategy, strat_env_file]
    try:
        custom_env = os.environ.copy()
        custom_env["PYTHONPATH"] = OKX_TRADE_KIT_DIR
        custom_env["LOCALAPPDATA"] = get_user_base_dir(uid)
        custom_env["PYTHONUNBUFFERED"] = "1"
        custom_env["PYTHONIOENCODING"] = "utf-8"

        new_proc = subprocess.Popen(
            cmd, cwd=OKX_TRADE_KIT_DIR,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            env=custom_env,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        set_nested(bot_processes, uid, strategy, new_proc)
        set_nested(bot_start_times, uid, strategy, time.time())
        if uid not in bot_log_queues: bot_log_queues[uid] = {}
        bot_log_queues[uid][strategy] = deque(maxlen=400)
        loop = asyncio.get_event_loop()
        loop.create_task(log_reader_task(new_proc.stdout, uid, strategy))
        return {"status": "success", "message": "Shadow Bot đã được khởi động (chạy ngầm)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bot/config")
def get_bot_config(uid: str, strategy: str = "sub1"):
    # Đọc cấu hình JSON
    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")
    os.makedirs(config_dir, exist_ok=True)
    config_path = os.path.join(config_dir, f"{strategy}_global_config.json")
    if not os.path.exists(config_path):
        # Mặc định cấu hình chuẩn xác cho người dùng mới (khớp 100% hình 1)
        default_cfg = {
            "ENABLED_TFS": {},
            "ENABLED_COINS": ["XAU", "BTC", "ETH"],
            "POSITION_VOLUME_HIGH_CONFIDENCE": 1.0,
            "SCALPING_TP_PCT": 0.008,
            "SCALPING_SL_PCT": 0.008,
            "ENABLE_TF_VOLUME_MULTIPLIER": False,
            "ENABLE_STRATEGY_MAIN": True,
            "ENABLE_PYRAMID_DCA": False,
            "ENABLE_NEGATIVE_DCA": False,
            "ENABLE_MULTITF_GRID": True,
            "ENABLE_STRATEGY_HEDGE": False,
            "ENABLE_DYNAMIC_EMA200_TP": False,
            "ALTCOIN_FOLLOW_BTC_EMA": True,
            "ENTRY_OFFSET_PCT": 0.05,
            "DCA_GAP_PCT": 0.20,
            "CONFLUENCE_PCT": 0.23,
            "ACCUM_CANDLES": 60,
            "ETH_VOL_MULT": 1.30,
            "ETH_VOLATILITY_FACTOR": 1.30
        }
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(default_cfg, f, indent=4, ensure_ascii=False)
        except Exception:
            pass
        return default_cfg
        
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        dirty = False
        # Migration: chuyển ENABLED_TFS từ list sang dict (TF mặc định OFF cho từng coin)
        if "ENABLED_TFS" not in cfg or isinstance(cfg.get("ENABLED_TFS"), list):
            cfg["ENABLED_TFS"] = {}
            dirty = True
        if "POSITION_VOLUME_HIGH_CONFIDENCE" not in cfg:
            cfg["POSITION_VOLUME_HIGH_CONFIDENCE"] = 1.0
            dirty = True
        if "SCALPING_TP_PCT" not in cfg:
            cfg["SCALPING_TP_PCT"] = 0.008
            dirty = True
        if "SCALPING_SL_PCT" not in cfg:
            cfg["SCALPING_SL_PCT"] = 0.008
            dirty = True
        if "ENABLE_TF_VOLUME_MULTIPLIER" not in cfg:
            cfg["ENABLE_TF_VOLUME_MULTIPLIER"] = False
            dirty = True
        if "ENABLE_MULTITF_GRID" not in cfg:
            cfg["ENABLE_MULTITF_GRID"] = True
            dirty = True
        if "ALTCOIN_FOLLOW_BTC_EMA" not in cfg:
            cfg["ALTCOIN_FOLLOW_BTC_EMA"] = True
            dirty = True
        if dirty:
            try:
                with open(config_path, "w", encoding="utf-8") as f:
                    json.dump(cfg, f, indent=4, ensure_ascii=False)
            except Exception:
                pass
        return cfg
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read config: {e}")

@app.post("/api/bot/config")
def update_bot_config(update_data: ConfigUpdate, uid: str, strategy: str = "sub1", account_id: str = None):
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
    if update_data.strategy_config is not None:
        for k, v in update_data.strategy_config.items():
            cfg[k] = v
            
    if strategy == "sub1":
        cfg["ENABLE_STRATEGY_MAIN"] = True
    
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4, ensure_ascii=False)

        # Quét trên sàn và huỷ toàn bộ limit chờ vào lệnh để bắt đầu chu trình chạy bot mới (bảo lưu 100% TP/SL)
        target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
        canceled_orders = _cancel_unfilled_limit_orders(uid, strategy, target_acc, action_name="RELOAD CONFIG")

        return {"message": "Config updated successfully.", "config": cfg, "canceled_count": canceled_orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e}")

@app.get("/api/bot/accounts")
def get_bot_accounts(uid: str):
    data_dir = get_user_data_dir(uid)
    acc_file = os.path.join(data_dir, "accounts.json")
    if os.path.exists(acc_file):
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                accounts = json.load(f)
                if isinstance(accounts, list):
                    return accounts
        except Exception:
            pass
    return []

@app.post("/api/bot/accounts")
def create_bot_account(req: AccountCreate, uid: str):
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Tên tài khoản không được để trống!")
    
    data_dir = get_user_data_dir(uid)
    os.makedirs(data_dir, exist_ok=True)
    acc_file = os.path.join(data_dir, "accounts.json")
    
    accounts = []
    if os.path.exists(acc_file):
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
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
    
    # Khởi tạo file .api rỗng tuyệt đối cho tài khoản mới - TUYỆT ĐỐI không kế thừa key cũ
    try:
        with open(os.path.join(bot_dir, f".api_{acc_id}"), "w", encoding="utf-8") as f:
            f.write('OKX_API_KEY=""\nOKX_SECRET_KEY=""\nOKX_PASSPHRASE=""\nOKX_IS_DEMO="False"\n')
    except Exception:
        pass
    
    with open(acc_file, "w", encoding="utf-8") as f:
        json.dump(accounts, f, indent=4, ensure_ascii=False)
        
    return {"message": "Account created successfully", "account": new_acc, "accounts": accounts}

@app.delete("/api/bot/accounts/{account_id}")
def delete_bot_account(account_id: str, uid: str):
    data_dir = get_user_data_dir(uid)
    acc_file = os.path.join(data_dir, "accounts.json")
    
    accounts = []
    if os.path.exists(acc_file):
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    accounts = loaded
        except Exception:
            pass
            
    # Xoá file .api và file dữ liệu tín hiệu của tài khoản này
    paths_to_remove = [
        os.path.join(data_dir, f"bots/{account_id}", f".api_{account_id}"),
        os.path.join(data_dir, f"accounts/{account_id}", f".api_{account_id}"),
        os.path.join(data_dir, f".api_{account_id}"),
        os.path.join(OKX_TRADE_KIT_DIR, f".api_{account_id}")
    ]
    
    for strategy in ["sub1", "sub2", "sub3"]:
        paths_to_remove.extend([
            os.path.join(data_dir, f"bots/{strategy}", f".api_{account_id}"),
            os.path.join(data_dir, f"bots/{strategy}/json_data", f"{account_id}_du_lieu_tien_hoa.json"),
            os.path.join(data_dir, f"bots/{strategy}/json_data", f"{account_id}_evolution_data.json"),
            os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}/json_data", f"{account_id}_du_lieu_tien_hoa.json"),
            os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}/json_data", f"{account_id}_evolution_data.json")
        ])
    
    for p in paths_to_remove:
        if os.path.exists(p):
            try: os.remove(p)
            except Exception: pass
        
    # Lọc bỏ account
    accounts = [a for a in accounts if a.get("id") != account_id]
        
    with open(acc_file, "w", encoding="utf-8") as f:
        json.dump(accounts, f, indent=4, ensure_ascii=False)
        
    return {"message": "Account deleted successfully", "accounts": accounts}

@app.get("/api/bot/credentials")
def get_bot_credentials(uid: str, strategy: str = "sub1", account_id: str = None):
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, _ = _get_okx_creds(uid, strategy, target_acc)
    return {"api_key": api_key, "secret_key": secret_key, "passphrase": passphrase}

@app.delete("/api/bot/credentials")
def delete_bot_credentials(uid: str, strategy: str = "sub1", account_id: str = None):
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    data_dir = get_user_data_dir(uid)
    
    paths_to_remove = [
        os.path.join(data_dir, f"bots/{target_acc}", f".api_{target_acc}"),
        os.path.join(data_dir, f"bots/{strategy}", f".api_{target_acc}"),
        os.path.join(data_dir, f"accounts/{target_acc}", f".api_{target_acc}"),
        os.path.join(data_dir, f".api_{target_acc}")
    ]
    
    deleted_any = False
    for p in paths_to_remove:
        if os.path.exists(p):
            try:
                os.remove(p)
                deleted_any = True
            except: pass
            
    return {"status": "ok", "deleted": deleted_any}

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
                # Phân quyền Admin: Miễn trừ kiểm tra khớp UID chủ sở hữu (cho mọi Admin có cú pháp admtls12021_xxx)
                if not is_admin_uid(uid):
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
        print("[API CHECK] OKX API Timeout!", flush=True)
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
        
    running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
    if os.path.exists(running_acc_file):
        with open(running_acc_file, "r") as f:
            current_running = f.read().strip()
        if current_running == target_acc:
            # Người dùng đổi API key của chính tài khoản đang chạy -> KILL bot để nạp lại
            proc = get_nested(bot_processes, uid, strategy)
            pid = get_running_pid(uid, strategy)
            if proc or pid > 0:
                if proc:
                    try:
                        import psutil
                        parent = psutil.Process(proc.pid)
                        for child in parent.children(recursive=True): child.kill()
                        parent.kill()
                    except: proc.kill()
                elif pid > 0:
                    try:
                        import psutil
                        parent = psutil.Process(pid)
                        for child in parent.children(recursive=True): child.kill()
                        parent.kill()
                    except: pass
                del_nested(bot_processes, uid, strategy)

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
                                
                                # Tìm TF tương ứng từ active_items nếu có
                                c_tf = ""
                                if idx < len(active_items):
                                    c_tf = active_items[idx].get("tf", "").upper()
                                    
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
                                    "tf": c_tf
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
def get_closed_positions(uid: str, strategy: str = "sub1", account_id: str = None):
    # Nếu chưa nhập API Key, trả về rỗng (tránh hiển thị tín hiệu từ trade_markers cũ sau khi xoá API)
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, _ = _get_okx_creds(uid, strategy, target_acc)
    if not (api_key and secret_key and passphrase) and uid != ADMIN_UID:
        return []

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
            
            # Tự động xử lý tài khoản ở chế độ Long/Short mode (yêu cầu posSide)
            err_msg = str(data.get("msg", ""))
            err_code = str(data.get("code", ""))
            if "posside" in err_msg.lower() or err_code in ["51000", "51008", "51023", "51119", "51167"]:
                if req.reduceOnly:
                    fallback_pos_side = "short" if req.side.lower() == "buy" else "long"
                else:
                    fallback_pos_side = "long" if req.side.lower() == "buy" else "short"
                
                order_data["posSide"] = fallback_pos_side
                body_str2 = json.dumps(order_data)
                resp2 = _okx_signed_request("POST", path, body_str2, api_key, secret_key, passphrase, is_demo)
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    if data2.get("code") == "0":
                        return {"status": "success", "data": data2.get("data")}
                    else:
                        return {"status": "error", "message": data2.get("msg")}
            
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
    
    # Gửi toàn bộ các dòng gần nhất từ ring buffer (đầy đủ dashboard mới nhất, không bị mất dòng)
    if uid in bot_log_queues and strategy in bot_log_queues[uid]:
        recent_logs = list(bot_log_queues[uid][strategy])
        for log_line in recent_logs:
            try:
                await websocket.send_text(log_line)
            except Exception:
                break
        
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        if uid in active_connections and strategy in active_connections[uid] and websocket in active_connections[uid][strategy]:
            active_connections[uid][strategy].remove(websocket)

bot_data_connections = {}

@app.websocket("/ws/bot_data/{uid}/{strategy}")
async def websocket_bot_data(websocket: WebSocket, uid: str, strategy: str):
    await websocket.accept()
    if uid not in bot_data_connections: bot_data_connections[uid] = {}
    if strategy not in bot_data_connections[uid]: bot_data_connections[uid][strategy] = []
    bot_data_connections[uid][strategy].append(websocket)
    
    current_acc = [strategy]
    
    async def get_state_payload():
        acc = current_acc[0]
        try:
            status_data = await asyncio.to_thread(get_bot_status, uid, strategy)
        except Exception:
            status_data = {"status": "STOPPED", "uptime": 0}
        try:
            pos_data = await asyncio.to_thread(get_bot_positions, uid, strategy, acc)
        except Exception:
            pos_data = []
        try:
            bal_data = await asyncio.to_thread(get_account_balance, uid, strategy, "USDT", acc)
        except Exception:
            bal_data = {"status": "error", "availBal": 0}
        try:
            closed_data = await asyncio.to_thread(get_closed_positions, uid, strategy)
        except Exception:
            closed_data = []
            
        return {
            "type": "bot_data",
            "strategy": strategy,
            "account_id": acc,
            "status": status_data,
            "positions": pos_data if isinstance(pos_data, list) else [],
            "balance": bal_data,
            "closed_positions": closed_data if isinstance(closed_data, list) else []
        }

    # Gửi snapshot ban đầu
    init_data = await get_state_payload()
    await websocket.send_text(json.dumps(init_data))
    
    is_active = True
    
    async def bg_push():
        while is_active:
            try:
                await asyncio.sleep(2.0)
                if not is_active: break
                payload = await get_state_payload()
                await websocket.send_text(json.dumps(payload))
            except (asyncio.CancelledError, WebSocketDisconnect):
                break
            except Exception:
                await asyncio.sleep(1.0)
                
    bg_task = asyncio.create_task(bg_push())
    
    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                if msg.get("action") == "refresh":
                    if msg.get("account_id"):
                        current_acc[0] = str(msg["account_id"]).strip()
                    payload = await get_state_payload()
                    await websocket.send_text(json.dumps(payload))
                elif msg.get("action") == "switch_account":
                    if msg.get("account_id"):
                        current_acc[0] = str(msg["account_id"]).strip()
                        payload = await get_state_payload()
                        await websocket.send_text(json.dumps(payload))
            except Exception:
                pass
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        is_active = False
        bg_task.cancel()
        if uid in bot_data_connections and strategy in bot_data_connections[uid] and websocket in bot_data_connections[uid][strategy]:
            bot_data_connections[uid][strategy].remove(websocket)

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
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

# z20260813 | Added auto-delete for trade history older than 30 days to free up memory

# z7719 | Sửa lỗi close-position khi đóng vị thế lẻ (do dùng int()) và bổ sung cảnh báo 400 khi khối lượng khả dụng bị khóa bởi TP/SL trên OKX.

# z7720 | Nâng cấp deque 400 dòng lưu trữ logs, sửa lỗi logs thiếu thông tin, và bổ sung WebSocket /ws/bot_data streaming trạng thái/vị thế/số dư thời gian thực.
# z7721 | Update default margin/volume settings to 1.0
# z7722 | Implemented bcrypt for password hashing and automatic migration from SHA256
# z7723 | Update OKX OAuth Fast API endpoint and hide closed_positions if API is deleted
