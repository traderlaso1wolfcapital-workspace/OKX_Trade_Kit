import os
import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
import logging
logger = logging.getLogger("tls1_app")
import json
import re
import time
import random
import asyncio
import subprocess
import hmac
import hashlib
import base64
import requests
import socket
import urllib3.util.connection as urllib3_cn
urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
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
security = HTTPBearer(auto_error=False)

PUBLIC_IP_CACHE = None

def get_public_ip():
    global PUBLIC_IP_CACHE
    if PUBLIC_IP_CACHE:
        return PUBLIC_IP_CACHE
    try:
        ip = requests.get('https://api.ipify.org', timeout=3).text.strip()
        if ip:
            PUBLIC_IP_CACHE = ip
            return ip
    except Exception:
        pass
    # Fallback nếu ipify không hoạt động
    try:
        ip = requests.get('https://ifconfig.me/ip', timeout=3).text.strip()
        if ip:
            PUBLIC_IP_CACHE = ip
            return ip
    except Exception:
        pass
    return ""

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

ADMIN_UID = "admtls12021"

def is_admin_uid(uid: str) -> bool:
    if not uid: return False
    clean = str(uid).strip().lower()
    return clean == ADMIN_UID

def kill_pid(pid: int):
    if not pid or pid <= 0:
        return
    try:
        import psutil
        parent = psutil.Process(pid)
        for child in parent.children(recursive=True):
            try: child.kill()
            except Exception: pass
        parent.kill()
    except Exception:
        try:
            import os, signal
            os.kill(pid, signal.SIGTERM)
        except Exception:
            pass

def verify_jwt(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None

uid_cache = {}

def check_uid_active_ref(uid_str: str) -> tuple[bool, str]:
    clean = str(uid_str).strip().lower() if uid_str else ""
    if not clean:
        return False, "UID rỗng"
    if is_admin_uid(clean):
        return True, "Admin"
    now = time.time()
    if clean in uid_cache and now - uid_cache[clean]["time"] < 300: # 5 minutes
        res = uid_cache[clean]["result"]
        if res.get("status") == "success":
            return True, "ACTIVE"
    try:
        url = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        content = resp.text
        reader = csv.reader(content.splitlines())
        next(reader, None) # skip header
        for row in reader:
            if row and len(row) >= 1 and row[0].strip().isdigit():
                if row[0].strip() == clean:
                    user_status = row[5].strip().upper() if len(row) > 5 else ""
                    if user_status in ["ACTIVE", "ON"]:
                        result = {"status": "success", "uid": clean}
                        uid_cache[clean] = {"time": now, "result": result}
                        return True, "ACTIVE"
                    else:
                        # Đã có UID trong bảng (đã đăng ký ref) nhưng chưa được bật ON
                        return False, "Vui lòng liên hệ Admin để kích hoạt."
        return False, "UID tài khoản này của quý khách chưa đăng ký dưới Link Ref của AutoTrader.fun!"
    except Exception as e:
        print(f"[REF CHECK ERROR] {e}", flush=True)
        return True, "Bypass on network error"

@app.get("/api/auth/verify")
def verify_uid(uid: str, jwt_data: Optional[dict] = Depends(verify_jwt)):
    clean_uid = str(uid).strip()
    if is_admin_uid(clean_uid):
        return {"status": "success", "uid": clean_uid}
    if not clean_uid or clean_uid in ["default", "guest", "undefined", "null"]:
        return {"status": "error", "message": "UID không hợp lệ!"}
    if jwt_data and jwt_data.get("uid"):
        if jwt_data["uid"] != clean_uid and not jwt_data.get("is_admin"):
            raise HTTPException(status_code=403, detail="Forbidden")
    is_ok, msg = check_uid_active_ref(clean_uid)
    if is_ok:
        return {"status": "success", "uid": clean_uid}
    return {"status": "error", "message": msg}


# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths Setup
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
# Vi tri moi: nam trong OKX_Trade_Kit/TLS1_Trading_Web/backend
OKX_TRADE_KIT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
XGUI_MAIN_PATH = os.path.join(OKX_TRADE_KIT_DIR, "xGui_main.py")
if OKX_TRADE_KIT_DIR not in sys.path:
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
    vol_unit: Optional[str] = None
    vol_usdt: Optional[float] = None
    vol_pct: Optional[float] = None
    use_dynamic_risk: Optional[bool] = None
    dynamic_risk_pct: Optional[float] = None
    scalping_tp_pct: Optional[float] = None
    scalping_sl_pct: Optional[float] = None
    ob_rr_ratio_trend: Optional[float] = None
    ob_rr_ratio_counter: Optional[float] = None
    strategy_config: Optional[Dict[str, Any]] = None
    enable_pyramid_dca: Optional[bool] = None
    enable_negative_dca: Optional[bool] = None
    altcoin_follow_btc: Optional[bool] = None
    enable_strategy_hedge: Optional[bool] = None
    enable_dynamic_ema200_tp: Optional[bool] = None

class CredentialsUpdate(BaseModel):
    api_key: str
    secret_key: str
    passphrase: str
    okx_uid: Optional[str] = None

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
    is_limit: Optional[bool] = False

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
            if row and len(row) >= 1 and row[0].strip().isdigit():
                if row[0].strip() == uid:
                    user_status = row[5].strip().upper() if len(row) > 5 else ""
                    is_valid = True
                    break
                    
        if not is_valid:
            return {"status": "error", "message": "UID tài khoản này của quý khách chưa đăng ký dưới Link Ref của AutoTrader.fun!"}
            
        if user_status not in ["ACTIVE", "ON"]:
            return {"status": "error", "message": "Vui lòng liên hệ Admin để kích hoạt."}
            
        # Xác thực hoặc thiết lập mật khẩu bảo vệ tài khoản User
        res = check_or_set_account_password(uid, req.password, is_admin=False)
        if res.get("status") == "success":
            res["token"] = create_jwt_token(uid, is_admin=False)
        return res
                
    except Exception as e:
        return {"status": "error", "message": f"Lỗi máy chủ kiểm tra UID: {str(e)}"}

@app.post("/api/auth/logout")
def logout_account(uid: str):
    clean_uid = uid.strip().lower() if uid else ""
    if clean_uid in uid_cache:
        del uid_cache[clean_uid]
    if not clean_uid or clean_uid in ["default", "guest", "undefined", "null"]:
        return {"status": "success", "message": "Đã đăng xuất khỏi thiết bị hiện tại."}

    # 1. Dừng toàn bộ bot đang chạy của UID này & huỷ lệnh Limit chờ
    for strategy in ["sub1", "sub2", "sub3"]:
        try:
            _cancel_unfilled_limit_orders(clean_uid, strategy, None, action_name="LOGOUT")
        except Exception:
            pass
        flag_dir = _get_flag_dir(clean_uid, strategy)
        if os.path.exists(flag_dir):
            try:
                with open(os.path.join(flag_dir, f"stop_{strategy}.flag"), "w") as f:
                    f.write("1")
                with open(os.path.join(flag_dir, f"dry_run_{strategy}.flag"), "w") as f:
                    f.write("1")
                act_flag = os.path.join(flag_dir, f"activate_{strategy}.flag")
                if os.path.exists(act_flag):
                    os.remove(act_flag)
            except Exception:
                pass
        proc = get_nested(bot_processes, clean_uid, strategy)
        pid = get_running_pid(clean_uid, strategy)
        if proc or pid > 0:
            if proc:
                try:
                    import psutil
                    parent = psutil.Process(proc.pid)
                    for child in parent.children(recursive=True):
                        child.kill()
                    parent.kill()
                except Exception:
                    try: proc.kill()
                    except Exception: pass
            if pid > 0:
                kill_pid(pid)
            del_nested(bot_processes, clean_uid, strategy)

    # 2. Làm sạch thư mục dữ liệu của DUY NHẤT UID này (bảo toàn các UID khác)
    data_dir = get_user_data_dir(clean_uid)
    if os.path.exists(data_dir):
        acc_file = os.path.join(data_dir, "accounts.json")
        try:
            with open(acc_file, "w", encoding="utf-8") as f:
                json.dump([], f, indent=4, ensure_ascii=False)
        except Exception:
            pass
        for root, dirs, files in os.walk(data_dir):
            for file in files:
                if file.startswith(".api_") or file.startswith(".running_account_") or file.startswith(".auth_"):
                    try:
                        os.remove(os.path.join(root, file))
                    except Exception:
                        pass

    return {"status": "success", "message": "Đã đăng xuất thành công và dọn sạch dữ liệu tài khoản."}

@app.post("/api/auth/okx/callback")
@limiter.limit("5/minute")
def okx_oauth_callback(request: Request, req: OAuthCallbackRequest):
    uid = req.uid.strip() if req.uid else ""
    client_id = os.environ.get("OKX_OAUTH_CLIENT_ID", "6038d061f79a421ea44b3d1777bbef5dBRWpzwlb")
    client_secret = os.environ.get("OKX_OAUTH_CLIENT_SECRET", "")
    
    if not client_secret:
        return {"status": "error", "message": "Server chưa được cấu hình OKX_OAUTH_CLIENT_SECRET. Hãy thiết lập biến môi trường này cho máy chủ."}
        
    try:
        # Lấy IP server để debug và whitelist
        server_ip = get_public_ip()
        
        url = "https://www.okx.com/v5/users/oauth/token"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        
        # redirect_uri BẮT BUỘC phải khớp chính xác với URI đã dùng khi authorization
        redirect_uri = "https://autotrader.fun/okx-callback"
        
        payload = {
            "grant_type": "authorization_code",
            "code": req.code,
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        
        try:
            data = resp.json()
        except ValueError:
            return {"status": "error", "message": f"Lỗi server khi gọi OKX. Status: {resp.status_code}. Response: {resp.text[:200]}"}
        
        # 1. Lấy access_token
        access_token = data.get("access_token")
        if not access_token:
            err_code = data.get("code", "")
            err_msg = data.get("msg", data.get("error_description", ""))
            print(f"[OKX OAuth] Token exchange FAILED. Server IP: {server_ip} | Error code: {err_code} | Error: {err_msg} | Full response: {data}")
            return {"status": "error", "message": f"Không thể lấy access_token từ OKX: {err_msg or data} (Error code: {err_code}, Server IP: {server_ip})", "raw": data}
            
        auth_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
        
        # 2. Xóa API Key cũ (nếu có) để tránh lỗi 50116 (bỏ qua kết quả lỗi)
        import secrets
        import string
        
        delete_url = "https://www.okx.com/api/v5/users/oauth/delete-apikey"
        try:
            requests.post(delete_url, headers=auth_headers, timeout=5)
        except Exception:
            pass
            
        # 3. Tạo Fast API Key mới
        alphabet = string.ascii_letters + string.digits
        generated_passphrase = ''.join(secrets.choice(alphabet) for _ in range(16)) + "!1A" # Đảm bảo đủ điều kiện passphrase
        
        create_url = "https://www.okx.com/api/v5/users/oauth/apikey"
        create_payload = {
            "label": f"TLS1_{int(time.time())}",
            "passphrase": generated_passphrase,
            "perm": "read_only,trade"
        }
        
        server_ip = get_public_ip()
        if server_ip:
            create_payload["ip"] = server_ip
            
        create_resp = requests.post(create_url, json=create_payload, headers=auth_headers, timeout=10)
        try:
            create_data = create_resp.json()
        except ValueError:
            return {"status": "error", "message": f"Lỗi parse JSON khi tạo API Key. Status: {create_resp.status_code}. Response: {create_resp.text[:200]}"}
            
        if str(create_data.get("code")) == "0" and create_data.get("data"):
            api_data = create_data["data"][0]
            api_key = api_data.get("apiKey")
            secret_key = api_data.get("secretKey")
            # OKX có thể không trả về passphrase, ta sẽ dùng cái vừa sinh ra
            passphrase = api_data.get("passphrase", generated_passphrase)
            
            if api_key and secret_key and passphrase:
                # 1. Quét thông tin tài khoản từ OKX TRƯỚC TIÊN
                acc_info = detect_okx_account_info(api_key, secret_key, passphrase)
                detected_name = acc_info["detected_name"] if acc_info else "Tài khoản OKX"
                main_uid = str(acc_info.get("main_uid", "")).strip() if acc_info else ""
                is_main = acc_info["is_main"] if acc_info else False
                
                # 2. Xác định UID sở hữu: Dùng Master UID từ OKX làm danh tính người dùng
                if not main_uid:
                    return {"status": "error", "message": "Không thể lấy thông tin UID từ OKX. Vui lòng thử lại!"}
                
                # Nếu là Admin thì giữ nguyên session admin, còn lại luôn lấy Master UID từ OKX làm danh tính người dùng
                if is_admin_uid(uid):
                    target_uid = uid
                else:
                    target_uid = main_uid
                uid = target_uid
                
                # 3. Kết nối API OKX thành công: Luôn cho phép kết nối để xem số dư, biểu đồ và lưu cấu hình
                # (Cơ chế đối chiếu Ref sẽ được kích hoạt chặt chẽ khi người dùng bấm Khởi động Bot)

                # 4. Lưu thông tin API DUY NHẤT vào thư mục của UID này (Tách biệt tuyệt đối từng tài khoản phụ)
                api_uid = str(acc_info.get("api_uid", "")).strip() if acc_info else ""
                base_dir = get_user_data_dir(uid)
                os.makedirs(base_dir, exist_ok=True)
                acc_file = os.path.join(base_dir, "accounts.json")
                existing_accounts = []
                if os.path.exists(acc_file):
                    try:
                        with open(acc_file, "r", encoding="utf-8") as rf:
                            loaded = json.load(rf)
                            if isinstance(loaded, list):
                                existing_accounts = loaded
                    except Exception:
                        pass

                # Xác định Account ID thông minh - TUYỆT ĐỐI không ghi đè tài khoản khác
                acc = None
                # Bước 1: Ưu tiên tìm tài khoản đã tồn tại có cùng OKX UID (re-authorization / refresh key)
                if api_uid:
                    for a in existing_accounts:
                        if a.get("okx_uid") and str(a.get("okx_uid")).strip() == api_uid:
                            acc = a.get("id")
                            break

                # Bước 2: Nếu chưa tìm thấy theo okx_uid, kiểm tra req.account_id gửi lên
                if not acc and req.account_id and req.account_id.strip():
                    req_acc = req.account_id.strip()
                    matched_req = next((a for a in existing_accounts if a.get("id") == req_acc), None)
                    if matched_req:
                        existing_acc_okx = str(matched_req.get("okx_uid", "")).strip()
                        # Chỉ cho phép gán nếu tài khoản này chưa có okx_uid hoặc trùng khớp okx_uid
                        if not existing_acc_okx or existing_acc_okx == api_uid:
                            acc = req_acc
                    else:
                        acc = req_acc

                # Bước 3: Nếu vẫn chưa có ID, đây là tài khoản mới -> Tự động sinh ID duy nhất
                if not acc:
                    existing_ids = {a.get("id") for a in existing_accounts if a.get("id")}
                    if is_main:
                        candidate_id = "main"
                        if candidate_id in existing_ids:
                            candidate_id = f"main_{api_uid[-4:] if len(api_uid) >= 4 else int(time.time())}"
                        acc = candidate_id
                    else:
                        clean_sfx = api_uid[-4:] if len(api_uid) >= 4 else str(int(time.time()))[-4:]
                        candidate_id = f"sub_{clean_sfx}"
                        counter = 1
                        while candidate_id in existing_ids:
                            candidate_id = f"sub_{clean_sfx}_{counter}"
                            counter += 1
                        acc = candidate_id

                # Lưu credentials vào các thư mục định danh của tài khoản này
                _save_env_file(os.path.join(base_dir, f".api_{acc}"), api_key, secret_key, passphrase, is_demo=False, main_uid=main_uid, is_main=is_main, api_uid=api_uid)
                _save_env_file(os.path.join(base_dir, f"accounts/{acc}", f".api_{acc}"), api_key, secret_key, passphrase, is_demo=False, main_uid=main_uid, is_main=is_main, api_uid=api_uid)
                _save_env_file(os.path.join(base_dir, f"bots/{acc}", f".api_{acc}"), api_key, secret_key, passphrase, is_demo=False, main_uid=main_uid, is_main=is_main, api_uid=api_uid)

                # Nếu có strategy chỉ định, kiểm tra an toàn trước khi ghi
                if req.strategy:
                    strat_dir = os.path.join(base_dir, f"bots/{req.strategy}")
                    os.makedirs(strat_dir, exist_ok=True)
                    _save_env_file(os.path.join(strat_dir, f".api_{acc}"), api_key, secret_key, passphrase, is_demo=False, main_uid=main_uid, is_main=is_main, api_uid=api_uid)
                    running_acc_file = os.path.join(strat_dir, f".running_account_{req.strategy}")
                    current_running = ""
                    if os.path.exists(running_acc_file):
                        try:
                            with open(running_acc_file, "r") as rf:
                                current_running = rf.read().strip()
                        except: pass
                    if not current_running or current_running == acc:
                        _save_env_file(os.path.join(strat_dir, f".api_{req.strategy}"), api_key, secret_key, passphrase, is_demo=False, main_uid=main_uid, is_main=is_main, api_uid=api_uid)

                # Cập nhật hoặc lưu vào accounts.json của chính UID này
                fast_api_label = acc_info.get("label", "") if acc_info else ""
                updated_accounts = sync_account_name_in_storage(uid, acc, detected_name, api_label=fast_api_label, is_main=is_main, okx_uid=api_uid)
                
                return {
                    "status": "success",
                    "message": f"Kết nối OKX Fast Connect thành công: {detected_name}!",
                    "detected_name": detected_name,
                    "detected_uid": uid,
                    "account_id": acc,
                    "is_main": is_main,
                    "accounts": updated_accounts
                }
        
        return {"status": "error", "message": f"Tạo API Key thất bại: {create_data.get('msg', create_data)}", "raw": create_data}
            
    except Exception as e:
        return {"status": "error", "message": f"Lỗi server khi gọi OKX: {str(e)}"}

async def log_reader_task(stream, uid, strategy):
    """Đọc stdout/stderr của tiến trình bot và đẩy vào ring buffer (deque) riêng biệt của UID"""
    if uid not in bot_log_queues: bot_log_queues[uid] = {}
    if strategy not in bot_log_queues[uid]: bot_log_queues[uid][strategy] = deque(maxlen=400)
    log_deque = bot_log_queues[uid][strategy]
    last_cf_warn_time = 0.0
    in_html_block = False  # Cờ theo dõi đang ở trong khối HTML nhiều dòng
    try:
        while True:
            line = await asyncio.to_thread(stream.readline)
            if not line: break
            line_str = line.decode("utf-8", errors="replace").rstrip("\n")

            # 🛡️ TÁCH BIỆT LOGS: Nếu là dòng log của Quỹ FX (TradeLocker / E8) -> chuyển hướng sang Quỹ FX, không trộn vào OKX
            is_tl_log = any(keyword in line_str for keyword in [
                "[TRADELOCKER", "TRADELOCKER E8 DISPATCH", "[DRY-RUN TradeLocker]", 
                "TradeLockerManager", "[QUỸ FX]", "E8 DISPATCH"
            ])
            if is_tl_log:
                try:
                    from tradelocker_service import TradeLockerManager
                    TradeLockerManager.log_event(uid, line_str)
                except Exception:
                    pass
                continue

            # 🛡️ LỌC BỎ TOÀN BỘ KHỐI HTML CLOUDFLARE NHIỀU DÒNG (502/504 Bad Gateway / Error Pages):
            lower_line = line_str.lower().strip()

            # Phát hiện dòng mở đầu khối HTML
            if not in_html_block:
                html_start_tags = ["<!doctype html", "<html", "<head>", "<body"]
                if any(tag in lower_line for tag in html_start_tags):
                    in_html_block = True

            # Nếu đang trong khối HTML -> loại bỏ dòng này và kiểm tra kết thúc
            if in_html_block:
                # Kiểm tra dòng kết thúc khối HTML
                if "</html>" in lower_line or "</body>" in lower_line:
                    in_html_block = False
                # Chỉ in 1 cảnh báo mạng gọn gàng duy nhất mỗi 15 giây
                now_t = time.time()
                if (now_t - last_cf_warn_time) > 15.0:
                    last_cf_warn_time = now_t
                    warn_line = "⚠️ [KẾT NỐI MẠNG] Máy chủ OKX phản hồi chậm qua Cloudflare (502/504). Bot đang tự động giữ kết nối và thử lại..."
                    log_deque.append(warn_line)
                    if uid in active_connections and strategy in active_connections[uid]:
                        for connection in list(active_connections[uid][strategy]):
                            try: await connection.send_text(warn_line)
                            except Exception: pass
                continue

            # Lọc thêm các dòng HTML lẻ không nằm trong khối (cloudflare ray id, cf-error, ...)
            is_cf_stray = (
                lower_line.startswith("<") or
                lower_line.startswith("<!--") or
                any(tag in lower_line for tag in [
                    "cloudflare", "ray id:", "cf-error", "502 bad gateway", "504 gateway time-out",
                    "<script", "<style", "</script", "</style", "<div", "</div", "<span", "</span",
                    "<meta", "<link ", "<title", "</title", "<p ", "</p>", "<img ", "<br",
                    "class=\"", "id=\"", "window._cf_", "cf-ray", "data-cf", "cferror", "error code 52"
                ])
            )
            if is_cf_stray:
                continue

            log_deque.append(line_str)
            # CHỈ phát sóng cho các kết nối thuộc CHÍNH UID này và chiến thuật này
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
        # Chuẩn hóa bar timeframe cho OKX (phút viết thường: 1m, 5m; giờ/ngày viết hoa: 1H, 4H, 1D)
        b_low = str(bar).strip().lower()
        if b_low in ["1m", "3m", "5m", "15m", "30m"]:
            bar = b_low
        elif b_low in ["1h", "2h", "4h", "6h", "12h", "1d", "1w"]:
            bar = b_low.upper()
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
    creds = {"api_key": "", "secret_key": "", "passphrase": "", "is_demo": False, "main_uid": "", "is_main": False, "api_uid": ""}
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
                        elif k in ("OKX_MAIN_UID", "OKX_UID"): creds["main_uid"] = v
                        elif k == "OKX_IS_MAIN": creds["is_main"] = (v.lower() == "true")
                        elif k == "OKX_API_UID": creds["api_uid"] = v
        except Exception:
            pass
    return creds

def _get_master_uid(uid: str = None, target_acc: str = None) -> str:
    """Quét và lấy số UID của tài khoản chính (Master UID) từ các file .api thuộc UID được chỉ định."""
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return ""
    # Tìm trong file .api của chính user data directory đó
    u_dir = get_user_data_dir(uid)
    if os.path.exists(u_dir):
        if target_acc:
            specific_paths = [
                os.path.join(u_dir, f".api_{target_acc}"),
                os.path.join(u_dir, f"bots/{target_acc}", f".api_{target_acc}"),
                os.path.join(u_dir, f"accounts/{target_acc}", f".api_{target_acc}"),
                os.path.join(u_dir, f"bots/sub1", f".api_{target_acc}"),
                os.path.join(u_dir, f"bots/sub2", f".api_{target_acc}"),
                os.path.join(u_dir, f"bots/sub3", f".api_{target_acc}"),
            ]
            for p in specific_paths:
                if os.path.exists(p):
                    c = _parse_env_file(p)
                    if c.get("main_uid"):
                        return str(c["main_uid"]).strip()
        for root, dirs, files in os.walk(u_dir):
            for f in files:
                if f.startswith(".api_"):
                    c = _parse_env_file(os.path.join(root, f))
                    if c.get("main_uid"):
                        return str(c["main_uid"]).strip()
    if uid.isdigit() and len(uid) >= 8:
        return uid
    return ""

def _evolution_has_capital(fpath: str) -> bool:
    """Trả về True nếu file evolution data đã có wallet_stats với von_goc > 0."""
    try:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        ws = data.get("wallet_stats", {})
        return float(ws.get("von_goc", 0)) > 0
    except Exception:
        return False

def _get_okx_creds(uid: str, strategy: str = "sub1", account_id: str = None):
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return "", "", "", False
    primary_dir = get_user_data_dir(uid)

    # Khi chỉ định rõ account_id:
    if account_id and account_id.strip():
        target_acc = account_id.strip()

        # Tìm thêm tên gợi nhớ (label) của account_id trong accounts.json nếu có
        acc_names = []
        acc_file = os.path.join(primary_dir, "accounts.json")
        if os.path.exists(acc_file):
            try:
                with open(acc_file, "r", encoding="utf-8") as f:
                    acc_list = json.load(f)
                    if isinstance(acc_list, list):
                        for a in acc_list:
                            if a.get("id") == target_acc and a.get("name"):
                                acc_names.append(a.get("name").strip())
            except Exception:
                pass

        candidate_paths = [
            os.path.join(primary_dir, f"bots/{target_acc}", f".api_{target_acc}"),
            os.path.join(primary_dir, f"accounts/{target_acc}", f".api_{target_acc}"),
            os.path.join(primary_dir, f"bots/{strategy}", f".api_{target_acc}"),
            os.path.join(primary_dir, f".api_{target_acc}"),
        ]
        for aname in acc_names:
            if aname != target_acc:
                candidate_paths.extend([
                    os.path.join(primary_dir, f"bots/{aname}", f".api_{aname}"),
                    os.path.join(primary_dir, f"accounts/{aname}", f".api_{aname}"),
                    os.path.join(primary_dir, f"bots/{strategy}", f".api_{aname}"),
                    os.path.join(primary_dir, f".api_{aname}"),
                ])
        if target_acc in ["botEMA200", ".api_botEMA200"] or any(n in ["botEMA200"] for n in acc_names):
            candidate_paths.extend([
                os.path.join(primary_dir, ".api_botEMA200"),
                os.path.join(primary_dir, "bots/sub1", ".api_botEMA200"),
                os.path.join(primary_dir, ".api_sub1"),
                os.path.join(primary_dir, "bots/sub1", ".api_sub1")
            ])

        for p in candidate_paths:
            if os.path.exists(p):
                c = _parse_env_file(p)
                if c.get("api_key") and c.get("secret_key") and c.get("passphrase"):
                    return c["api_key"], c["secret_key"], c["passphrase"], c.get("is_demo", False)
        return "", "", "", False

    # Khi không truyền account_id: Tuyệt đối không tự động nạp key của tài khoản khác
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
        "Content-Type": "application/json"
    }
    if is_demo:
        headers["x-simulated-trading"] = "1"
    if method_upper == "GET":
        return requests.get(base_url + path, headers=headers, timeout=timeout)
    elif method_upper == "POST":
        return requests.post(base_url + path, headers=headers, data=body, timeout=timeout)
    elif method_upper == "DELETE":
        return requests.delete(base_url + path, headers=headers, data=body, timeout=timeout)
    else:
        return requests.request(method_upper, base_url + path, headers=headers, data=body, timeout=timeout)


def _save_env_file(fpath: str, api_key: str, secret_key: str, passphrase: str, is_demo: bool = False, main_uid: str = "", is_main: bool = None, api_uid: str = ""):
    os.makedirs(os.path.dirname(fpath), exist_ok=True)
    lines = []
    if os.path.exists(fpath):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception:
            pass
    # Đảm bảo lưu Plaintext cho các file bot (.api_sub1, .api_sub2, ...) để tiến trình bot độc lập (sys_bot_*.py) đọc trực tiếp được không bị lỗi ENC:
    clean_api_key = decrypt_value(api_key)
    clean_secret_key = decrypt_value(secret_key)
    clean_passphrase = decrypt_value(passphrase)
    keys = {
        "OKX_API_KEY": clean_api_key,
        "OKX_SECRET_KEY": clean_secret_key,
        "OKX_PASSPHRASE": clean_passphrase,
        "OKX_IS_DEMO": "True" if is_demo else "False",
    }
    if main_uid:
        keys["OKX_MAIN_UID"] = str(main_uid)
    if is_main is not None:
        keys["OKX_IS_MAIN"] = "True" if is_main else "False"
    if api_uid:
        keys["OKX_API_UID"] = str(api_uid)
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

def detect_okx_account_info(api_key: str, secret_key: str, passphrase: str, is_demo: bool = False):
    """
    Quét thông tin tài khoản trên OKX từ API Key:
    - uid, mainUid
    - label (tên tài khoản phụ hoặc note API Key)
    - is_main (True nếu là tài khoản chính, False nếu là tài khoản phụ)
    - detected_name: Tên tài khoản chuẩn quét từ sàn OKX
    """
    try:
        clean_api_key = decrypt_value(api_key)
        clean_secret_key = decrypt_value(secret_key)
        clean_passphrase = decrypt_value(passphrase)
        resp = _okx_signed_request("GET", "/api/v5/account/config", "", clean_api_key, clean_secret_key, clean_passphrase, is_demo, timeout=8)
        if resp.status_code == 200:
            res_data = resp.json()
            if str(res_data.get("code")) == "0" and len(res_data.get("data", [])) > 0:
                cfg = res_data["data"][0]
                api_uid = str(cfg.get("uid", "")).strip()
                main_uid = str(cfg.get("mainUid", "")).strip()
                label = str(cfg.get("label", "")).strip()
                acctLv = str(cfg.get("acctLv", "")).strip()
                if acctLv == "1":
                    raise Exception("Tài khoản đang ở chế độ Simple (Đơn giản). Hãy đổi sang chế độ Ký quỹ (Single-currency hoặc Multi-currency) trên OKX để trade Futures.")
                is_main = (api_uid == main_uid) if (api_uid and main_uid) else False

                posMode = str(cfg.get("posMode", "")).strip()
                if posMode != "long_short_mode":
                    try:
                        sw_body = json.dumps({"posMode": "long_short_mode"})
                        sw_resp = _okx_signed_request("POST", "/api/v5/account/set-position-mode", sw_body, clean_api_key, clean_secret_key, clean_passphrase, is_demo, timeout=5)
                        if sw_resp.status_code == 200 and str(sw_resp.json().get("code")) == "0":
                            posMode = "long_short_mode"
                            print(f"[DETECT OKX ACC] Đã tự động chuyển tài khoản {api_uid} sang Chế độ phòng hộ (long_short_mode)!", flush=True)
                    except Exception: pass

                detected_name = ""
                if label and not label.startswith("TLS1_"):
                    # Tên mã API người dùng tự đặt thủ công (ví dụ: Bot-m15)
                    detected_name = label
                elif label and label.startswith("TLS1_"):
                    # Mã API Fast Connect (OAuth): TLS1_1790574999 -> lấy 4 số cuối của mã API
                    suffix = re.sub(r"\D", "", label.replace("TLS1_", ""))
                    last4 = suffix[-4:] if len(suffix) >= 4 else suffix
                    detected_name = f"#{last4}" if last4 else "Fast API"
                elif is_main:
                    detected_name = f"Tài khoản chính ({main_uid[-4:]})" if main_uid else "Tài khoản chính"
                else:
                    detected_name = f"#{api_uid[-4:]}" if api_uid else "Tài khoản phụ"

                return {
                    "status": "ok",
                    "api_uid": api_uid,
                    "main_uid": main_uid,
                    "is_main": is_main,
                    "label": label,
                    "detected_name": detected_name
                }
    except Exception as e:
        print(f"[DETECT OKX ACC ERROR] {e}", flush=True)
    return None

def sync_account_name_in_storage(uid: str, target_acc: str, detected_name: str, force_rename: bool = False, api_label: str = "", is_main: bool = None, okx_uid: str = ""):
    """
    Cập nhật hoặc đặt tên cho tài khoản trong accounts.json:
    - Nếu tài khoản chưa được tạo bằng dấu + với tên thủ công riêng (is_manual != True),
      hoặc tên hiện tại đang là tên mặc định (Tài khoản 1, sub1, ...), hoặc force_rename == True
      -> Tự động đặt tên cho tài khoản theo tên quét được trên sàn OKX.
    - Định danh chính xác theo okx_uid, tuyệt đối không ghi đè lên tài khoản phụ khác.
    - Lưu thuộc tính is_main (True nếu là tài khoản chính, False nếu là tài khoản phụ).
    - Trả về danh sách accounts mới nhất.
    """
    if not detected_name or not detected_name.strip():
        detected_name = target_acc

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

    found = False
    clean_okx_uid = str(okx_uid).strip() if okx_uid else ""

    # 1. Ưu tiên tuyệt đối tìm theo OKX UID nếu có (Định danh chuẩn xác tài khoản sàn OKX)
    if clean_okx_uid:
        for acc in accounts:
            if acc.get("okx_uid") and str(acc.get("okx_uid")).strip() == clean_okx_uid:
                found = True
                acc["name"] = detected_name
                if api_label:
                    acc["api_label"] = api_label
                if is_main is not None:
                    acc["is_main"] = bool(is_main)
                acc["okx_uid"] = clean_okx_uid
                target_acc = acc.get("id", target_acc)
                break

    # 2. Nếu chưa tìm thấy theo OKX UID, tìm theo Account ID (target_acc)
    if not found:
        for acc in accounts:
            if acc.get("id") == target_acc:
                # 🛡️ BẢO VỆ CHỐNG ĐÈ: Nếu tài khoản này đã có okx_uid khác thì bỏ qua, không được ghi đè!
                existing_okx = str(acc.get("okx_uid", "")).strip()
                if existing_okx and clean_okx_uid and existing_okx != clean_okx_uid:
                    continue
                found = True
                is_manual = acc.get("is_manual", False)
                current_name = acc.get("name", "").strip()
                is_generic = (not is_manual) or (current_name in ["Tài khoản 1", "Tài khoản 2", "Tài khoản 3", "sub1", "sub2", "sub3"]) or current_name.startswith("Tài khoản ")
                if is_generic or force_rename:
                    acc["name"] = detected_name
                    if api_label:
                        acc["api_label"] = api_label
                if clean_okx_uid:
                    acc["okx_uid"] = clean_okx_uid
                if is_main is not None:
                    acc["is_main"] = bool(is_main)
                break

    # 3. Nếu chưa từng tồn tại tài khoản nào cùng OKX UID hoặc cùng ID thì mới tạo mới
    if not found:
        new_acc = {
            "id": target_acc,
            "name": detected_name,
            "is_manual": False
        }
        if clean_okx_uid:
            new_acc["okx_uid"] = clean_okx_uid
        if api_label:
            new_acc["api_label"] = api_label
        if is_main is not None:
            new_acc["is_main"] = bool(is_main)
        accounts.append(new_acc)

    # 4. Tự động khử trùng lặp (Deduplicate) AN TOÀN theo ID và OKX UID (Bảo toàn 100% các tài khoản khác nhau)
    deduped = []
    seen_ids = set()
    seen_okx_uids = set()
    for a in accounts:
        aid = a.get("id", "")
        a_okx = str(a.get("okx_uid", "")).strip() if a.get("okx_uid") else ""
        if not aid or aid in seen_ids:
            continue
        if a_okx and a_okx in seen_okx_uids:
            continue
        seen_ids.add(aid)
        if a_okx:
            seen_okx_uids.add(a_okx)
        deduped.append(a)
    accounts = deduped

    try:
        with open(acc_file, "w", encoding="utf-8") as f:
            json.dump(accounts, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[SAVE ACCOUNTS ERROR] {e}", flush=True)

    return accounts

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
            except (OSError, IOError, ValueError):
                pass
        except (OSError, IOError, ValueError):
            pass
    return 0

def _get_flag_dir(uid: str, strategy: str) -> str:
    return os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")

def _is_shadow_mode(uid: str, strategy: str) -> bool:
    """Trả về True nếu bot đang chạy ngầm (dry_run=True) hoặc đã dừng"""
    data_dir = get_user_data_dir(uid)
    acc_name = strategy
    
    running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
    if os.path.exists(running_acc_file):
        try:
            with open(running_acc_file, "r") as f:
                content = f.read().strip()
                if content:
                    acc_name = content
        except (OSError, IOError, ValueError):
            pass

    flag_dir = _get_flag_dir(uid, strategy)

    # 1. Kiểm tra cờ dừng trước tiên (nếu có stop flag thì chắc chắn là shadow/dừng)
    for name in [strategy, acc_name]:
        if os.path.exists(os.path.join(flag_dir, f"stop_{name}.flag")):
            return True

    # 2. Kiểm tra cờ kích hoạt trực tiếp (Live mode)
    for name in [strategy, acc_name]:
        if os.path.exists(os.path.join(flag_dir, f"activate_{name}.flag")):
            return False

    # 3. Kiểm tra cờ dry_run do bot engine ghi ra
    for name in [strategy, acc_name]:
        flag_path = os.path.join(flag_dir, f"dry_run_{name}.flag")
        if os.path.exists(flag_path):
            try:
                with open(flag_path, "r") as f:
                    return f.read().strip() == "1"
            except (OSError, IOError, ValueError):
                pass

    return True

@app.get("/api/bot/status")
def get_bot_status(uid: str, strategy: str = "sub1"):
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return {"status": "STOPPED", "uptime": 0, "strategy": strategy, "dry_run": True, "active_accounts": {}}
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
        # CHỈ ĐƯỢC TÍNH LÀ ACTIVE KHI BOT THỰC SỰ ĐANG CHẠY LIVE (KHÔNG PHẢI SHADOW / STOPPED)
        if (s_pid > 0 or (s_proc and s_proc.poll() is None)) and not _is_shadow_mode(uid, strat):
            running_acc_file = os.path.join(data_dir, f"bots/{strat}", f".running_account_{strat}")
            if os.path.exists(running_acc_file):
                try:
                    with open(running_acc_file, "r") as f:
                        acc = f.read().strip()
                        if acc:
                            active_accounts[strat] = acc
                except (OSError, IOError, ValueError): pass

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
                    custom_env["BOT_USER_UID"] = uid
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
    if target_acc in ["e8_prop", "e8"]:
        return await tradelocker_start_bot(uid, strategy=strategy)

    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)

    # ── KHÓA ĐỘC QUYỀN SÀN COIN OKX: 1 TÀI KHOẢN CHỈ ĐƯỢC CHẠY 1 BOT DUY NHẤT ──
    data_dir = get_user_data_dir(uid)
    strat_labels = {"sub1": "EMA200 Bot", "sub2": "SMC Bot", "sub3": "Liquidation Bot"}
    for other_strat in ["sub1", "sub2", "sub3"]:
        if other_strat == strategy:
            continue
        o_pid = get_running_pid(uid, other_strat)
        o_proc = get_nested(bot_processes, uid, other_strat)
        o_alive = (o_pid > 0) or (o_proc and o_proc.poll() is None)
        if o_alive and not _is_shadow_mode(uid, other_strat):
            o_acc_file = os.path.join(data_dir, f"bots/{other_strat}", f".running_account_{other_strat}")
            if os.path.exists(o_acc_file):
                try:
                    with open(o_acc_file, "r", encoding="utf-8") as f:
                        o_acc = f.read().strip()
                    if o_acc and (o_acc == target_acc or o_acc.replace("#", "") == target_acc.replace("#", "")):
                        other_bot_name = strat_labels.get(other_strat, other_strat)
                        this_bot_name = strat_labels.get(strategy, strategy)
                        raise HTTPException(
                            status_code=400,
                            detail=f"⚠️ Tài khoản OKX '{target_acc}' đang chạy độc quyền bởi {other_bot_name}!\n\nTheo nguyên tắc an toàn vốn, mỗi tài khoản chỉ được chạy duy nhất 1 phương pháp Bot. Vui lòng chọn tài khoản phụ khác cho {this_bot_name} hoặc bấm DỪNG BOT bên {other_bot_name} trước!"
                        )
                except HTTPException:
                    raise
                except Exception as e:
                    print(f"[EXCLUSIVE_LOCK_OKX] Lỗi kiểm tra: {e}", flush=True)

    # ── HỖ TRỢ CHẾ ĐỘ QUỸ PROP FIRM (TRADELOCKER / E8) ──
    tradelocker_cfg = TradeLockerManager.load_user_config(uid, get_user_base_dir, fernet)
    is_prop_mode = bool(tradelocker_cfg and tradelocker_cfg.get("account_id"))

    if not (api_key and secret_key and passphrase) and is_prop_mode:
        fallback_path = os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}", f".api_{strategy}")
        if os.path.exists(fallback_path):
            fb_c = _parse_env_file(fallback_path)
            if fb_c.get("api_key") and fb_c.get("secret_key") and fb_c.get("passphrase"):
                api_key, secret_key, passphrase, is_demo = fb_c["api_key"], fb_c["secret_key"], fb_c["passphrase"], fb_c.get("is_demo", False)

    if not (api_key and secret_key and passphrase):
        raise HTTPException(status_code=400, detail=f"Cần cấu hình API Key cho tài khoản '{target_acc}' trước khi khởi động Bot {strategy}!")

    # ── ĐỐI CHIẾU REF GOOGLE SHEETS & KHÓA GIAO DỊCH TÀI KHOẢN CHÍNH KHI KHỞI ĐỘNG BOT ──
    # Miễn trừ đối với Admin (admtls12021) và chế độ Quỹ FX (đánh Quỹ độc lập)
    if not is_admin_uid(uid) and not is_prop_mode:
        acc_info = None
        try:
            acc_info = detect_okx_account_info(api_key, secret_key, passphrase, is_demo)
        except Exception as e:
            print(f"[START_BOT] Lỗi quét thông tin OKX: {e}", flush=True)

        # 🛡️ KHÓA GIAO DỊCH TRÊN TÀI KHOẢN CHÍNH (MASTER ACCOUNT):
        is_main_account = False
        if acc_info and acc_info.get("is_main"):
            is_main_account = True
        else:
            target_env = os.path.join(data_dir, f".api_{target_acc}")
            c_env = _parse_env_file(target_env) if os.path.exists(target_env) else {}
            if c_env.get("is_main"):
                is_main_account = True
            else:
                acc_file = os.path.join(data_dir, "accounts.json")
                if os.path.exists(acc_file):
                    try:
                        with open(acc_file, "r", encoding="utf-8") as af:
                            acc_list = json.load(af)
                        for a in acc_list:
                            if a.get("id") == target_acc and (a.get("is_main") is True or str(a.get("name", "")).startswith("Tài khoản chính")):
                                is_main_account = True
                                break
                    except Exception:
                        pass

        if is_main_account:
            raise HTTPException(
                status_code=400,
                detail="🛡️ BẢO VỆ TÀI SẢN: Bot KHÔNG CHO PHÉP giao dịch trên Tài khoản chính (Master Account)!\n\nĐể đảm bảo an toàn vốn tuyệt đối, quý khách vui lòng:\n1. Tạo Tài khoản phụ (Sub-account) trên sàn OKX.\n2. Chuyển số vốn bạn muốn chạy bot vào Tài khoản phụ đó.\n3. Kết nối API của Tài khoản phụ để Chạy Bot.\n\n💡 Tài khoản chính chỉ dùng để quản lý vốn và xác thực bản quyền Ref."
            )

        master_uid = _get_master_uid(uid, target_acc)
        if acc_info and acc_info.get("main_uid"):
            master_uid = str(acc_info["main_uid"]).strip()
            _save_env_file(os.path.join(data_dir, f".api_{target_acc}"), api_key, secret_key, passphrase, is_demo, main_uid=master_uid, is_main=False)

        if not master_uid and uid.isdigit() and len(uid) >= 8:
            master_uid = uid

        if not master_uid or not is_admin_uid(master_uid):
            if not master_uid:
                raise HTTPException(
                    status_code=403,
                    detail="UID tài khoản này của quý khách chưa đăng ký dưới Link Ref của AutoTrader.fun!"
                )
            is_ref, ref_msg = check_uid_active_ref(master_uid)
            if not is_ref:
                print(f"[START_BOT REF BLOCKED] Master UID: {master_uid}. Chi tiết: {ref_msg}", flush=True)
                raise HTTPException(
                    status_code=403,
                    detail=ref_msg or "Vui lòng liên hệ Admin để kích hoạt."
                )

    # Đồng bộ API key đã chọn vào các file env của bot
    data_dir = get_user_data_dir(uid)
    clean_target = target_acc.replace("#", "").strip()
    clean_no_under = clean_target.replace("_", "").strip()
    strat_env_file = f".api_{clean_target}" if clean_target and clean_target != strategy else f".api_{strategy}"
    strat_env_path = os.path.join(data_dir, f"bots/{strategy}", strat_env_file)
    _save_env_file(strat_env_path, api_key, secret_key, passphrase, is_demo)
    _save_env_file(os.path.join(data_dir, strat_env_file), api_key, secret_key, passphrase, is_demo)
    for env_variant in [f".api_{strategy}", f".api_{target_acc}", f".api_{clean_no_under}"]:
        _save_env_file(os.path.join(data_dir, f"bots/{strategy}", env_variant), api_key, secret_key, passphrase, is_demo)

    flag_dir = _get_flag_dir(uid, strategy)
    os.makedirs(flag_dir, exist_ok=True)
    acc_name = clean_target if clean_target and clean_target != strategy else strategy

    # 🧹 Dọn sạch toàn bộ lệnh Limit cũ chưa khớp trên OKX để bot đặt lại theo logic mới (bảo lưu 100% TP/SL)
    canceled_orders = _cancel_unfilled_limit_orders(uid, strategy, target_acc, action_name="START BOT") if not is_prop_mode else 0

    # 🛡️ TỰ ĐỘNG CHUYỂN SANG CHẾ ĐỘ PHÒNG HỘ (HEDGE MODE) CHO OKX
    if not is_prop_mode and api_key and secret_key and passphrase:
        try:
            clean_ak = decrypt_value(api_key)
            clean_sk = decrypt_value(secret_key)
            clean_pp = decrypt_value(passphrase)
            
            # 1. Gửi lệnh tự động chuyển sang Chế độ phòng hộ
            sw_body = json.dumps({"posMode": "long_short_mode"})
            sw_resp = _okx_signed_request("POST", "/api/v5/account/set-position-mode", sw_body, clean_ak, clean_sk, clean_pp, is_demo, timeout=5)
            if sw_resp.status_code == 200 and str(sw_resp.json().get("code")) == "0":
                print(f"[START_BOT] Đã tự động chuyển tài khoản sang Chế độ phòng hộ (long_short_mode)!", flush=True)

            # 2. Quét kiểm tra trạng thái posMode thực tế
            cfg_resp = _okx_signed_request("GET", "/api/v5/account/config", "", clean_ak, clean_sk, clean_pp, is_demo, timeout=5)
            if cfg_resp.status_code == 200:
                cfg_data = cfg_resp.json()
                if str(cfg_data.get("code")) == "0" and len(cfg_data.get("data", [])) > 0:
                    current_pos_mode = str(cfg_data["data"][0].get("posMode", "")).strip()
                    if current_pos_mode != "long_short_mode":
                        # OKX từ chối tự chuyển do tài khoản đang vướng vị thế mở dở dang trên sàn
                        raise HTTPException(
                            status_code=400,
                            detail="⚠️ Tài khoản OKX đang ở Chế độ Một Chiều (Net Mode). Hệ thống đã tự động gửi lệnh chuyển sang Chế độ Phòng Hộ nhưng sàn OKX từ chối do tài khoản đang còn vị thế mở dở dang. Vui lòng đóng hết các vị thế cũ trên OKX, chuyển sang Chế độ Phòng Hộ (Hedge Mode) rồi mới bấm Khởi Động Bot!"
                        )
        except HTTPException:
            raise
        except Exception as e:
            print(f"[START_BOT] Lỗi kiểm tra/chuyển Chế độ phòng hộ: {e}", flush=True)

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
            acc_flag_names = {strategy, acc_name, target_acc, target_acc.replace("#", ""), target_acc.replace("#", "").replace("_", "")}
            for nm in acc_flag_names:
                stop_flag = os.path.join(flag_dir, f"stop_{nm}.flag")
                if os.path.exists(stop_flag):
                    try: os.remove(stop_flag)
                    except: pass
                try:
                    with open(os.path.join(flag_dir, f"activate_{nm}.flag"), "w") as f:
                        f.write("1")
                    with open(os.path.join(flag_dir, f"dry_run_{nm}.flag"), "w") as f:
                        f.write("0")
                except: pass
            set_nested(bot_start_times, uid, strategy, time.time())
            clean_info = f" (Đã dọn {canceled_orders} lệnh Limit cũ)" if canceled_orders > 0 else ""
            return {"status": "success", "message": f"⚡ Bot đã được KÍCH HOẠT!{clean_info} Lệnh thật sẽ được đặt lên OKX theo nến hiện tại.", "canceled_count": canceled_orders}

    # Process chưa chạy — spawn mới (bắt đầu ở DRY_RUN, ngay sau đó activate)
    try:
        with open(running_acc_file, "w") as f:
            f.write(target_acc)
    except: pass

    cmd = [sys.executable, XGUI_MAIN_PATH, "--run-bot", strategy, strat_env_file]
    try:
        acc_flag_names = {strategy, acc_name, target_acc, target_acc.replace("#", ""), target_acc.replace("#", "").replace("_", "")}
        # Xoá stop/kill flag cũ
        for nm in acc_flag_names:
            for fname in [f"stop_{nm}.flag", f"kill_{nm}.flag"]:
                fp = os.path.join(flag_dir, fname)
                if os.path.exists(fp):
                    try: os.remove(fp)
                    except: pass

        # Viết flag Kích hoạt & Tắt Shadow mode ngay lập tức trước khi chạy process
        # để UI không bị giật (flicker) trạng thái "Dừng" trong 2 giây đầu.
        for nm in acc_flag_names:
            try:
                with open(os.path.join(flag_dir, f"activate_{nm}.flag"), "w") as f:
                    f.write("1")
                with open(os.path.join(flag_dir, f"dry_run_{nm}.flag"), "w") as f:
                    f.write("0")
            except: pass

        custom_env = os.environ.copy()
        custom_env["PYTHONPATH"] = OKX_TRADE_KIT_DIR
        custom_env["LOCALAPPDATA"] = get_user_base_dir(uid)
        custom_env["BOT_USER_UID"] = uid
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
        
    # 3. Cập nhật mốc VỐN GỐC mới vào đúng file dữ liệu tiến hóa của tài khoản này
    evo_files = [
        os.path.join(data_dir, f"bots/{strategy}/json_data", f"{target_acc}_du_lieu_tien_hoa.json"),
        os.path.join(data_dir, f"bots/{strategy}/json_data", f"{target_acc}_evolution_data.json"),
        os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}/json_data", f"{target_acc}_du_lieu_tien_hoa.json"),
    ]
    if target_acc == strategy:
        evo_files.extend([
            os.path.join(data_dir, f"bots/{strategy}/json_data", f"{strategy}_du_lieu_tien_hoa.json"),
            os.path.join(data_dir, f"bots/{strategy}/json_data", f"{strategy}_evolution_data.json"),
            os.path.join(OKX_TRADE_KIT_DIR, f"bots/{strategy}/json_data", f"{strategy}_du_lieu_tien_hoa.json"),
        ])
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
            # 🎯 Reset toàn bộ chỉ số Hiệu suất, Winrate và M/M (MAE/MFE)
            for k in list(evo_data.keys()):
                if k != "wallet_stats":
                    evo_data[k] = {"tong_lenh_dong": 0, "lenh_thang": 0, "lenh_thua": 0, "lich_su_mae": [], "lich_su_mfe": []}
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
        "message": f"✅ Đã Reset Vốn Gốc & Hiệu suất (Win / MM) thành công!\nTổng vốn quét thực tế từ sàn OKX: {total_equity:,.2f} USDT"
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
    """Dừng bot hoàn toàn (Clean Process Shutdown). Hủy toàn bộ limit chưa khớp trên sàn, bảo lưu 100% TP/SL."""
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    if target_acc in ["e8_prop", "e8"]:
        return tradelocker_stop_bot(uid)

    acc_name = strategy
    flag_dir = _get_flag_dir(uid, strategy)
    os.makedirs(flag_dir, exist_ok=True)

    # 1. Quét và Hủy toàn bộ lệnh Limit chưa khớp trên sàn OKX (bảo lưu 100% TP/SL của các vị thế đang chạy)
    canceled_orders = _cancel_unfilled_limit_orders(uid, strategy, target_acc, action_name="STOP BOT")

    # 2. Xóa running_account_{strategy}
    data_dir = get_user_data_dir(uid)
    running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
    if os.path.exists(running_acc_file):
        try: os.remove(running_acc_file)
        except: pass

    # 3. Dọn dẹp cờ flag
    for fname in [f"stop_{acc_name}.flag", f"activate_{acc_name}.flag", f"dry_run_{acc_name}.flag"]:
        fp = os.path.join(flag_dir, fname)
        if os.path.exists(fp):
            try: os.remove(fp)
            except: pass

    # 4. KILL HOÀN TOÀN TIẾN TRÌNH PYTHON CŨ (Giải phóng 100% RAM, chấm dứt triệt để Shadow Mode ngầm)
    proc = get_nested(bot_processes, uid, strategy)
    pid = get_running_pid(uid, strategy)
    if proc or pid > 0:
        if proc:
            try:
                import psutil
                parent = psutil.Process(proc.pid)
                for child in parent.children(recursive=True):
                    try: child.kill()
                    except: pass
                parent.kill()
            except:
                try: proc.kill()
                except: pass
        elif pid > 0:
            try:
                import psutil
                parent = psutil.Process(pid)
                for child in parent.children(recursive=True):
                    try: child.kill()
                    except: pass
                parent.kill()
            except: pass
        del_nested(bot_processes, uid, strategy)

    # 5. Dọn sạch queue logs cũ trong RAM
    if uid in bot_log_queues and strategy in bot_log_queues[uid]:
        bot_log_queues[uid][strategy].clear()

    msg = f"Bot {strategy} đã dừng hoàn toàn! Đã giải phóng RAM và hủy {canceled_orders} lệnh Limit chờ. Vị thế và TP/SL vẫn chạy an toàn 100% trên sàn OKX."
    return {"message": msg, "status": "STOPPED", "canceled_count": canceled_orders}

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
        custom_env["BOT_USER_UID"] = uid
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

def _resolve_bot_config_path(config_dir: str, strategy: str, target_acc: Optional[str]) -> tuple[str, bool]:
    """Trả về (config_path, is_specific_account) chuẩn xác cho từng tài khoản riêng biệt."""
    acc = (target_acc or "").strip()
    if not acc or acc == strategy:
        return os.path.join(config_dir, f"{strategy}_global_config.json"), False
    
    clean_acc = acc.replace("#", "").strip()
    clean_no_under = clean_acc.replace("_", "").strip()
    candidates = [
        os.path.join(config_dir, f"{clean_acc}_global_config.json"),
        os.path.join(config_dir, f"{clean_no_under}_global_config.json"),
        os.path.join(config_dir, f"{acc}_global_config.json")
    ]
    for p in candidates:
        if os.path.exists(p):
            return p, True
    # Mặc định file mới sẽ tạo theo clean_acc
    return os.path.join(config_dir, f"{clean_acc}_global_config.json"), True

@app.get("/api/bot/config")
def get_bot_config(uid: str, strategy: str = "sub1", account_id: Optional[str] = None):
    # Đọc cấu hình JSON riêng cho từng tài khoản
    config_dir = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data")
    os.makedirs(config_dir, exist_ok=True)
    target_acc = account_id.strip() if (account_id and account_id.strip()) else ""
    config_path, is_specific_acc = _resolve_bot_config_path(config_dir, strategy, target_acc)

    if not os.path.exists(config_path):
        # Mặc định cấu hình chuẩn xác cho người dùng mới (chuẩn hóa theo yêu cầu CEO)
        default_cfg = None
        if not default_cfg:
            if strategy == "sub2":
                default_cfg = {
                    "ENABLED_TFS": {},
                    "ENABLED_COINS": ["XAU", "BTC", "ETH"],
                    "POSITION_VOLUME_HIGH_CONFIDENCE": 0.4,
                    "VOL_UNIT": "USDT",
                    "POSITION_VOLUME_USDT": 0.4,
                    "POSITION_VOLUME_PCT": 0.1,
                    "USE_DYNAMIC_RISK": False,
                    "DYNAMIC_RISK_PCT": 0.001,
                    "OB_RR_RATIO_TREND": 5.0,
                    "OB_RR_RATIO_COUNTER": 1.0,
                    "SCALPING_TP_PCT": 0.05,
                    "SCALPING_SL_PCT": 0.01,
                    "ENABLE_TF_VOLUME_MULTIPLIER": False,
                    "ENABLE_STRATEGY_MAIN": True,
                    "ENABLE_STRATEGY_SMC": True,
                    "ENABLE_PYRAMID_DCA": False,
                    "ENABLE_NEGATIVE_DCA": False,
                    "ENABLE_MULTITF_GRID": True,
                    "ENABLE_STRATEGY_HEDGE": False,
                    "ENABLE_DYNAMIC_EMA200_TP": False,
                    "ALTCOIN_FOLLOW_BTC_EMA": False,
                    "ENTRY_OFFSET_PCT": 0.05,
                    "DCA_GAP_PCT": 0.20,
                    "CONFLUENCE_PCT": 0.23,
                    "ACCUM_CANDLES": 60,
                    "ETH_VOL_MULT": 1.30,
                    "ETH_VOLATILITY_FACTOR": 1.30
                }
            else:
                default_cfg = {
                    "ENABLED_TFS": {},
                    "ENABLED_COINS": ["XAU", "BTC", "ETH"],
                    "POSITION_VOLUME_HIGH_CONFIDENCE": 0.4,
                    "VOL_UNIT": "USDT",
                    "POSITION_VOLUME_USDT": 0.4,
                    "POSITION_VOLUME_PCT": 0.1,
                    "USE_DYNAMIC_RISK": False,
                    "DYNAMIC_RISK_PCT": 0.001,
                    "SCALPING_TP_PCT": 0.008,
                    "SCALPING_SL_PCT": 0.008,
                    "ENABLE_TF_VOLUME_MULTIPLIER": False,
                    "ENABLE_STRATEGY_MAIN": True,
                    "ENABLE_PYRAMID_DCA": False,
                    "ENABLE_NEGATIVE_DCA": False,
                    "ENABLE_MULTITF_GRID": True,
                    "ENABLE_STRATEGY_HEDGE": False,
                    "ENABLE_DYNAMIC_EMA200_TP": False,
                    "ALTCOIN_FOLLOW_BTC_EMA": False,
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
            cfg["POSITION_VOLUME_HIGH_CONFIDENCE"] = 0.4
            dirty = True
        if "VOL_UNIT" not in cfg:
            cfg["VOL_UNIT"] = "USDT"
            dirty = True
        if "POSITION_VOLUME_USDT" not in cfg:
            cfg["POSITION_VOLUME_USDT"] = float(cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", 0.4))
            dirty = True
        if "POSITION_VOLUME_PCT" not in cfg:
            cfg["POSITION_VOLUME_PCT"] = 0.1
            dirty = True
        if strategy == "sub2":
            if "OB_RR_RATIO_TREND" not in cfg or float(cfg.get("OB_RR_RATIO_TREND", 0)) in (0.6, 1.5):
                cfg["OB_RR_RATIO_TREND"] = 5.0
                dirty = True
            if "OB_RR_RATIO_COUNTER" not in cfg or float(cfg.get("OB_RR_RATIO_COUNTER", 0)) in (0.6, 1.5):
                cfg["OB_RR_RATIO_COUNTER"] = 1.0
                dirty = True
            if cfg.get("SCALPING_TP_PCT") in (0.006, 0.015) or "SCALPING_TP_PCT" not in cfg:
                cfg["SCALPING_TP_PCT"] = float(cfg["OB_RR_RATIO_TREND"]) / 100.0
                dirty = True
            if cfg.get("SCALPING_SL_PCT") in (0.006, 0.015) or "SCALPING_SL_PCT" not in cfg:
                cfg["SCALPING_SL_PCT"] = float(cfg["OB_RR_RATIO_COUNTER"]) / 100.0
                dirty = True
        else:
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
            cfg["ALTCOIN_FOLLOW_BTC_EMA"] = False
            dirty = True
        if "ENABLE_PYRAMID_DCA" not in cfg:
            cfg["ENABLE_PYRAMID_DCA"] = False
            dirty = True
        if "ENABLE_NEGATIVE_DCA" not in cfg:
            cfg["ENABLE_NEGATIVE_DCA"] = False
            dirty = True
        if "ENABLE_STRATEGY_HEDGE" not in cfg:
            cfg["ENABLE_STRATEGY_HEDGE"] = False
            dirty = True
        if "ENABLE_DYNAMIC_EMA200_TP" not in cfg:
            cfg["ENABLE_DYNAMIC_EMA200_TP"] = False
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
    target_acc = account_id.strip() if (account_id and account_id.strip()) else ""
    config_path, is_specific_acc = _resolve_bot_config_path(config_dir, strategy, target_acc)
    
    cfg = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception:
            cfg = {}
    elif is_specific_acc:
        strat_path = os.path.join(config_dir, f"{strategy}_global_config.json")
        if os.path.exists(strat_path):
            try:
                with open(strat_path, "r", encoding="utf-8") as sf:
                    cfg = json.load(sf)
            except Exception:
                cfg = {}
            
    if update_data.enabled_tfs is not None:
        cfg["ENABLED_TFS"] = update_data.enabled_tfs
    if update_data.enabled_coins is not None:
        cfg["ENABLED_COINS"] = update_data.enabled_coins
    if update_data.vol_unit is not None:
        cfg["VOL_UNIT"] = update_data.vol_unit
    if update_data.vol_usdt is not None:
        cfg["POSITION_VOLUME_USDT"] = update_data.vol_usdt
    if update_data.vol_pct is not None:
        cfg["POSITION_VOLUME_PCT"] = update_data.vol_pct
    if update_data.use_dynamic_risk is not None:
        cfg["USE_DYNAMIC_RISK"] = update_data.use_dynamic_risk
    if update_data.dynamic_risk_pct is not None:
        cfg["DYNAMIC_RISK_PCT"] = update_data.dynamic_risk_pct
    if update_data.position_volume is not None:
        cfg["POSITION_VOLUME_HIGH_CONFIDENCE"] = update_data.position_volume
        if update_data.vol_unit == "USDT" or cfg.get("VOL_UNIT") == "USDT":
            cfg["POSITION_VOLUME_USDT"] = update_data.position_volume
        elif update_data.vol_unit in ("LOT", "PERCENT") or cfg.get("VOL_UNIT") in ("LOT", "PERCENT"):
            cfg["POSITION_VOLUME_PCT"] = update_data.position_volume
    if update_data.scalping_tp_pct is not None:
        cfg["SCALPING_TP_PCT"] = update_data.scalping_tp_pct
        cfg["TP_TARGET_OPTIMAL"] = str(update_data.scalping_tp_pct)
        if strategy == "sub2":
            cfg["OB_RR_RATIO_TREND"] = float(round(update_data.scalping_tp_pct * 100, 2))
    if update_data.scalping_sl_pct is not None:
        cfg["SCALPING_SL_PCT"] = update_data.scalping_sl_pct
        if strategy == "sub2":
            cfg["OB_RR_RATIO_COUNTER"] = float(round(update_data.scalping_sl_pct * 100, 2))
    if update_data.ob_rr_ratio_trend is not None:
        cfg["OB_RR_RATIO_TREND"] = update_data.ob_rr_ratio_trend
        if strategy == "sub2":
            cfg["SCALPING_TP_PCT"] = update_data.ob_rr_ratio_trend / 100.0
    if update_data.ob_rr_ratio_counter is not None:
        cfg["OB_RR_RATIO_COUNTER"] = update_data.ob_rr_ratio_counter
        if strategy == "sub2":
            cfg["SCALPING_SL_PCT"] = update_data.ob_rr_ratio_counter / 100.0
    if update_data.strategy_config is not None:
        for k, v in update_data.strategy_config.items():
            cfg[k] = v
            
    if strategy == "sub1":
        cfg["ENABLE_STRATEGY_MAIN"] = True
    cfg["SL_TARGET_OPTIMAL"] = str(update_data.scalping_sl_pct) if update_data.scalping_sl_pct is not None else cfg.get("SL_TARGET_OPTIMAL", "0.006")
    if update_data.enable_pyramid_dca is not None:
        cfg["ENABLE_PYRAMID_DCA"] = update_data.enable_pyramid_dca
    if update_data.enable_negative_dca is not None:
        cfg["ENABLE_NEGATIVE_DCA"] = update_data.enable_negative_dca
    if update_data.altcoin_follow_btc is not None:
        cfg["ALTCOIN_FOLLOW_BTC_EMA"] = update_data.altcoin_follow_btc
        cfg["ALTCOIN_FOLLOW_BTC"] = update_data.altcoin_follow_btc
    if update_data.enable_strategy_hedge is not None:
        cfg["ENABLE_STRATEGY_HEDGE"] = update_data.enable_strategy_hedge
    if update_data.enable_dynamic_ema200_tp is not None:
        cfg["ENABLE_DYNAMIC_EMA200_TP"] = update_data.enable_dynamic_ema200_tp
    
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4, ensure_ascii=False)

        # Nếu là tài khoản cụ thể, lưu đồng bộ vào các định dạng tên biến thể (kèm & không kèm #)
        if is_specific_acc:
            clean_acc = target_acc.replace("#", "").strip()
            clean_no_under = clean_acc.replace("_", "").strip()
            for alias_name in [f"{clean_acc}_global_config.json", f"{clean_no_under}_global_config.json", f"{target_acc}_global_config.json"]:
                alias_path = os.path.join(config_dir, alias_name)
                if alias_path != config_path:
                    try:
                        with open(alias_path, "w", encoding="utf-8") as af:
                            json.dump(cfg, af, indent=4, ensure_ascii=False)
                    except Exception:
                        pass

        # Quét trên sàn và huỷ toàn bộ limit chờ vào lệnh nếu bot KHÔNG chạy (bảo lưu 100% TP/SL)
        is_running = (get_running_pid(uid, strategy) > 0) or (get_nested(bot_processes, uid, strategy) and get_nested(bot_processes, uid, strategy).poll() is None)
        canceled_orders = 0
        if not is_running:
            canceled_orders = _cancel_unfilled_limit_orders(uid, strategy, target_acc, action_name="RELOAD CONFIG")

        return {"message": "Config updated successfully.", "config": cfg, "canceled_count": canceled_orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {e}")

_okx_account_balances_cache = {}

def _get_single_account_balance(uid: str, aid: str) -> float:
    key = f"{uid}:{aid}"
    now = time.time()
    cached = _okx_account_balances_cache.get(key)
    if cached and (now - cached["ts"] < 40) and cached.get("balance", 0) > 0:
        return cached["balance"]
    try:
        api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, "sub1", aid)
        if not api_key:
            return cached["balance"] if cached else 0.0
        resp = _okx_signed_request("GET", "/api/v5/account/balance?ccy=USDT", "", api_key, secret_key, passphrase, is_demo, timeout=5.0)
        if resp.status_code == 200:
            res_j = resp.json()
            if res_j.get("code") == "0" and res_j.get("data"):
                bdata = res_j["data"][0]
                teq = bdata.get("totalEq")
                bal_val = 0.0
                if teq:
                    bal_val = round(float(teq), 2)
                else:
                    for d in bdata.get("details", []):
                        if d.get("ccy") == "USDT":
                            bal_val = round(float(d.get("eq", d.get("cashBal", 0.0))), 2)
                            break
                if bal_val > 0:
                    _okx_account_balances_cache[key] = {"balance": bal_val, "ts": now}
                    return bal_val
                elif cached and cached.get("balance", 0) > 0:
                    return cached["balance"]
                else:
                    _okx_account_balances_cache[key] = {"balance": bal_val, "ts": now}
                    return bal_val
    except Exception:
        pass
    return cached["balance"] if cached else 0.0

@app.get("/api/bot/accounts")
def get_bot_accounts(uid: str):
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return []
    data_dir = get_user_data_dir(uid)
    acc_file = os.path.join(data_dir, "accounts.json")
    if os.path.exists(acc_file):
        try:
            with open(acc_file, "r", encoding="utf-8") as f:
                accounts = json.load(f)
                if isinstance(accounts, list):
                    # Tự động khử trùng lặp (Deduplicate) AN TOÀN theo ID và OKX UID
                    deduped = []
                    seen_ids = set()
                    seen_okx_uids = set()
                    has_duplicate = False
                    for a in accounts:
                        aid = a.get("id", "")
                        a_okx = str(a.get("okx_uid", "")).strip() if a.get("okx_uid") else ""
                        if aid and aid not in seen_ids and (not a_okx or a_okx not in seen_okx_uids):
                            seen_ids.add(aid)
                            if a_okx:
                                seen_okx_uids.add(a_okx)
                            if "is_main" not in a:
                                if a.get("name", "").startswith("Tài khoản chính") or a.get("id") == "main":
                                    a["is_main"] = True
                                else:
                                    t_env = os.path.join(data_dir, f".api_{aid}")
                                    if os.path.exists(t_env):
                                        c_env = _parse_env_file(t_env)
                                        a["is_main"] = c_env.get("is_main", False)
                                        if not a.get("okx_uid") and c_env.get("api_uid"):
                                            a["okx_uid"] = c_env["api_uid"]
                                    else:
                                        a["is_main"] = False
                            elif not a.get("okx_uid"):
                                t_env = os.path.join(data_dir, f".api_{aid}")
                                if os.path.exists(t_env):
                                    c_env = _parse_env_file(t_env)
                                    if c_env.get("api_uid"):
                                        a["okx_uid"] = c_env["api_uid"]
                            deduped.append(a)
                        else:
                            has_duplicate = True
                    if has_duplicate:
                        try:
                            with open(acc_file, "w", encoding="utf-8") as wf:
                                json.dump(deduped, wf, indent=4, ensure_ascii=False)
                        except Exception:
                            pass

                    # Gắn số dư live/cached cho từng tài khoản OKX
                    try:
                        import concurrent.futures
                        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(deduped) or 1, 5)) as executor:
                            future_to_acc = {executor.submit(_get_single_account_balance, uid, a.get("id", "")): a for a in deduped}
                            for future in concurrent.futures.as_completed(future_to_acc, timeout=5.0):
                                acc_item = future_to_acc[future]
                                try:
                                    bal = future.result()
                                    if bal > 0 or "balance" not in acc_item:
                                        acc_item["balance"] = bal
                                        acc_item["totalEq"] = bal
                                        acc_item["availBal"] = bal
                                except Exception:
                                    pass
                    except Exception:
                        pass

                    return deduped
        except Exception:
            pass

    return []

@app.post("/api/bot/accounts")
def create_bot_account(req: AccountCreate, uid: str):
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập hoặc kết nối tài khoản OKX trước khi tạo thêm tài khoản!")

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
    new_acc = {"id": acc_id, "name": clean_name, "is_manual": True}
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
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập hoặc kết nối tài khoản!")
    if not account_id or not account_id.strip():
        raise HTTPException(status_code=400, detail="Account ID cannot be empty")
        
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
            
    # 1. Nếu tài khoản bị xoá đang là tài khoản đang chạy của bot, dừng tiến trình bot ngay
    for strategy in ["sub1", "sub2", "sub3"]:
        running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
        is_running_this = False
        if os.path.exists(running_acc_file):
            try:
                with open(running_acc_file, "r") as f:
                    cur_acc = f.read().strip()
                    if cur_acc == account_id or cur_acc.replace("#", "") == account_id.replace("#", ""):
                        is_running_this = True
            except: pass
            
        if is_running_this:
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
            try: os.remove(running_acc_file)
            except: pass

        # 2. Xóa hàng đợi log trong bộ nhớ để không bắn log cũ lên client
        if uid in bot_log_queues and strategy in bot_log_queues[uid]:
            bot_log_queues[uid][strategy].clear()

    # 3. Xoá file .api credentials của tài khoản này để ngắt quyền truy cập
    # Lưu ý: BẢO LƯU file {account_id}_evolution_data.json và dữ liệu thống kê trong Profile riêng
    # để bảo toàn lịch sử PNL/Winrate, chỉ reset khi người dùng bấm nút "RESET Vốn Gốc (Audit)"
    paths_to_remove = [
        os.path.join(data_dir, f"bots/{account_id}", f".api_{account_id}"),
        os.path.join(data_dir, f"accounts/{account_id}", f".api_{account_id}"),
        os.path.join(data_dir, f".api_{account_id}")
    ]
    
    for strategy in ["sub1", "sub2", "sub3"]:
        paths_to_remove.append(
            os.path.join(data_dir, f"bots/{strategy}", f".api_{account_id}")
        )
    
    for p in paths_to_remove:
        if os.path.exists(p):
            try: os.remove(p)
            except Exception: pass
        
    # Lọc bỏ account
    accounts = [a for a in accounts if a.get("id") != account_id]
        
    if os.path.exists(data_dir):
        with open(acc_file, "w", encoding="utf-8") as f:
            json.dump(accounts, f, indent=4, ensure_ascii=False)
        
    return {"message": "Account deleted successfully", "accounts": accounts}

@app.get("/api/bot/credentials")
def get_bot_credentials(uid: str, strategy: str = "sub1", account_id: str = None):
    if not uid or uid in ["default", "guest", "undefined", "null"] or not account_id or not account_id.strip():
        return {
            "api_key": "",
            "secret_key": "",
            "passphrase": "",
            "okx_uid": "",
            "detected_uid": "",
            "main_uid": ""
        }
    target_acc = account_id.strip()
    api_key, secret_key, passphrase, _ = _get_okx_creds(uid, strategy, target_acc)
    main_uid = _get_master_uid(uid, target_acc)
    return {
        "api_key": api_key,
        "secret_key": secret_key,
        "passphrase": passphrase,
        "okx_uid": main_uid,
        "detected_uid": main_uid,
        "main_uid": main_uid
    }

@app.delete("/api/bot/credentials")
def delete_bot_credentials(uid: str, strategy: str = "sub1", account_id: str = None):
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return {"status": "ok", "deleted": False}
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

    # If the user deletes API key of the running account -> KILL bot
    running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
    if os.path.exists(running_acc_file):
        with open(running_acc_file, "r") as f:
            current_running = f.read().strip()
        if current_running == target_acc:
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
                cfg = res_data["data"][0]
                api_uid = str(cfg.get("uid", "")).strip()
                main_uid = str(cfg.get("mainUid", "")).strip()
                label = str(cfg.get("label", "")).strip()
                acctLv = str(cfg.get("acctLv", "")).strip()
                
                if acctLv == "1":
                    raise HTTPException(status_code=400, detail="Tài khoản đang ở chế độ Simple (Đơn giản). Hãy đổi sang chế độ Ký quỹ (Single-currency hoặc Multi-currency) trên OKX để trade Futures.")

                is_main = (api_uid == main_uid) if (api_uid and main_uid) else False
                print(f"[API CHECK] API UID={api_uid}, mainUid={main_uid}, label={label}, is_main={is_main}, login UID={uid}, acctLv={acctLv}", flush=True)

                # 🛡️ TỰ ĐỘNG CHUYỂN SANG CHẾ ĐỘ PHÒNG HỘ (HEDGE MODE) KHI LƯU API KEY
                posMode = str(cfg.get("posMode", "")).strip()
                if posMode != "long_short_mode":
                    try:
                        sw_path = "/api/v5/account/set-position-mode"
                        sw_body = json.dumps({"posMode": "long_short_mode"})
                        sw_ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
                        sw_msg = sw_ts + "POST" + sw_path + sw_body
                        sw_mac = hmac.new(bytes(creds.secret_key, encoding='utf8'), bytes(sw_msg, encoding='utf-8'), digestmod=hashlib.sha256)
                        sw_sign = base64.b64encode(sw_mac.digest()).decode('utf-8')
                        sw_headers = {
                            "OK-ACCESS-KEY": creds.api_key,
                            "OK-ACCESS-SIGN": sw_sign,
                            "OK-ACCESS-TIMESTAMP": sw_ts,
                            "OK-ACCESS-PASSPHRASE": creds.passphrase,
                            "Content-Type": "application/json"
                        }
                        sw_resp = requests.post(base_url + sw_path, data=sw_body, headers=sw_headers, timeout=5)
                        if sw_resp.status_code == 200 and str(sw_resp.json().get("code")) == "0":
                            print(f"[API CHECK] Đã tự động chuyển tài khoản {api_uid} sang Chế độ phòng hộ (long_short_mode)!", flush=True)
                    except Exception: pass

                # Xác định UID chính (Master UID) từ OKX
                owner_uid = str(main_uid).strip() if main_uid else str(api_uid).strip()
                if not owner_uid:
                    owner_uid = creds.okx_uid.strip() if (creds.okx_uid and creds.okx_uid.strip()) else uid

                # Cho phép kết nối API bình thường (xem số dư, biểu đồ, lưu cấu hình)
                # Việc chặn và kiểm tra Ref Google Sheet diễn ra khi người dùng bấm Khởi động Bot

                # Quét và nhận diện tên tài khoản từ sàn OKX
                detected_name = ""
                if label and not label.startswith("TLS1_"):
                    # Tên mã API người dùng tự đặt (ví dụ: Bot-m15)
                    detected_name = label
                elif label and label.startswith("TLS1_"):
                    # Fast Connect API: TLS1_1790574999 -> lấy 4 số cuối của mã API
                    suffix = re.sub(r"\D", "", label.replace("TLS1_", ""))
                    last4 = suffix[-4:] if len(suffix) >= 4 else suffix
                    detected_name = f"#{last4}" if last4 else "Fast API"
                elif is_main:
                    detected_name = f"Tài khoản chính ({owner_uid[-4:]})" if owner_uid else "Tài khoản chính"
                else:
                    detected_name = f"#{api_uid[-4:]}" if api_uid else "Tài khoản phụ"
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

    # Lưu dữ liệu ĐỘC QUYỀN vào thư mục của owner_uid (TUYỆT ĐỐI KHÔNG lưu sang default hay OKX_TRADE_KIT_DIR)
    u_data_dir = get_user_data_dir(owner_uid)
    os.makedirs(os.path.join(u_data_dir, f"bots/{target_acc}"), exist_ok=True)
    os.makedirs(os.path.join(u_data_dir, f"accounts/{target_acc}"), exist_ok=True)
    _save_env_file(os.path.join(u_data_dir, f"bots/{target_acc}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
    _save_env_file(os.path.join(u_data_dir, f"accounts/{target_acc}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
    _save_env_file(os.path.join(u_data_dir, f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
    _save_env_file(os.path.join(u_data_dir, f"bots/{strategy}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
    if strategy:
        _save_env_file(os.path.join(u_data_dir, f"bots/{strategy}", f".api_{strategy}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)

    if uid and uid != owner_uid:
        session_data_dir = get_user_data_dir(uid)
        os.makedirs(os.path.join(session_data_dir, f"bots/{target_acc}"), exist_ok=True)
        os.makedirs(os.path.join(session_data_dir, f"accounts/{target_acc}"), exist_ok=True)
        _save_env_file(os.path.join(session_data_dir, f"bots/{target_acc}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
        _save_env_file(os.path.join(session_data_dir, f"accounts/{target_acc}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
        _save_env_file(os.path.join(session_data_dir, f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
        _save_env_file(os.path.join(session_data_dir, f"bots/{strategy}", f".api_{target_acc}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
        if strategy:
            _save_env_file(os.path.join(session_data_dir, f"bots/{strategy}", f".api_{strategy}"), creds.api_key, creds.secret_key, creds.passphrase, main_uid=owner_uid, is_main=is_main, api_uid=api_uid)
        sync_account_name_in_storage(uid, target_acc, detected_name, api_label=label, is_main=is_main, okx_uid=api_uid)
        
    # Đồng bộ tên quét được từ sàn OKX vào accounts.json của riêng UID này
    updated_accounts = sync_account_name_in_storage(owner_uid, target_acc, detected_name, api_label=label, is_main=is_main, okx_uid=api_uid)

    data_dir = get_user_data_dir(owner_uid)
    running_acc_file = os.path.join(data_dir, f"bots/{strategy}", f".running_account_{strategy}")
    if os.path.exists(running_acc_file):
        with open(running_acc_file, "r") as f:
            current_running = f.read().strip()
        if current_running == target_acc:
            # Người dùng đổi API key của chính tài khoản đang chạy -> KILL bot để nạp lại
            proc = get_nested(bot_processes, owner_uid, strategy)
            pid = get_running_pid(owner_uid, strategy)
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
                del_nested(bot_processes, owner_uid, strategy)

    # ── AUTO RESET VỐN GỐC KHI LẦN ĐẦU LƯU API KEY CHO TÀI KHOẢN MỚI ──
    primary_data_dir = get_user_data_dir(owner_uid)
    evo_check_paths = [
        os.path.join(primary_data_dir, f"bots/{strategy}/json_data", f"{target_acc}_du_lieu_tien_hoa.json"),
        os.path.join(primary_data_dir, f"bots/{strategy}/json_data", f"{strategy}_du_lieu_tien_hoa.json"),
    ]
    has_existing_capital_data = any(
        os.path.exists(p) and _evolution_has_capital(p) for p in evo_check_paths
    )

    auto_reset_equity = None
    if not has_existing_capital_data:
        try:
            bal_resp = _okx_signed_request(
                method="GET",
                path="/api/v5/account/balance",
                body_str="",
                api_key=creds.api_key,
                secret_key=creds.secret_key,
                passphrase=creds.passphrase,
                is_demo=False,
                timeout=10,
            )
            if bal_resp.status_code == 200:
                bal_json = bal_resp.json()
                if bal_json.get("code") == "0":
                    bal_data = bal_json.get("data", [{}])[0]
                    total_eq_str = bal_data.get("totalEq", "0")
                    total_equity_auto = float(total_eq_str) if total_eq_str else 0.0
                    if total_equity_auto <= 0:
                        for det in bal_data.get("details", []):
                            if det.get("ccy") == "USDT":
                                total_equity_auto = float(det.get("eq", det.get("cashBal", 0.0)))
                                break
                    if total_equity_auto > 0:
                        auto_reset_equity = round(total_equity_auto, 2)
                        evo_write_paths = [
                            os.path.join(primary_data_dir, f"bots/{strategy}/json_data", f"{target_acc}_du_lieu_tien_hoa.json"),
                            os.path.join(primary_data_dir, f"bots/{strategy}/json_data", f"{strategy}_du_lieu_tien_hoa.json"),
                        ]
                        wallet_block = {
                            "von_goc": auto_reset_equity,
                            "von_hien_tai": auto_reset_equity,
                            "loi_nhuan": 0.0,
                            "tang_truong": 0.0,
                            "last_reset_ts": time.time(),
                            "account_id": target_acc,
                        }
                        for evo_p in evo_write_paths:
                            try:
                                os.makedirs(os.path.dirname(evo_p), exist_ok=True)
                                evo_data = {}
                                if os.path.exists(evo_p):
                                    try:
                                        with open(evo_p, "r", encoding="utf-8") as ef:
                                            evo_data = json.load(ef)
                                    except Exception:
                                        evo_data = {}
                                evo_data["wallet_stats"] = wallet_block
                                with open(evo_p, "w", encoding="utf-8") as ef:
                                    json.dump(evo_data, ef, indent=2, ensure_ascii=False)
                            except Exception:
                                pass
                        flag_dir = os.path.join(primary_data_dir, f"bots/{strategy}", "json_data")
                        os.makedirs(flag_dir, exist_ok=True)
                        for flag_name in [f"reset_wallet_{strategy}.flag", f"reset_wallet_{target_acc}.flag"]:
                            try:
                                with open(os.path.join(flag_dir, flag_name), "w") as ff:
                                    ff.write("1")
                            except Exception:
                                pass
                        print(f"[AUTO_CAPITAL_INIT] Tài khoản [{target_acc}] lần đầu lưu API Key → Vốn gốc tự động: {auto_reset_equity:,.2f} USDT", flush=True)
        except Exception as auto_err:
            print(f"[AUTO_CAPITAL_INIT] Lỗi quét vốn gốc tự động cho [{target_acc}]: {auto_err}", flush=True)

    return {
        "message": "Credentials updated successfully.",
        "status": "ok",
        "detected_uid": owner_uid,
        "detected_name": detected_name,
        "is_main": is_main,
        "accounts": updated_accounts,
        "auto_capital_init": auto_reset_equity,
    }

OKX_CT_VAL_CACHE = {
    "BTC-USDT-SWAP": 0.01,
    "ETH-USDT-SWAP": 0.1,
    "XAU-USDT-SWAP": 0.01,
    "XAG-USDT-SWAP": 1.0,
    "CL-USDT-SWAP": 0.1,
    "SOL-USDT-SWAP": 1.0,
    "DOGE-USDT-SWAP": 100.0,
    "XRP-USDT-SWAP": 100.0,
    "ADA-USDT-SWAP": 100.0,
    "BNB-USDT-SWAP": 0.01,
    "AVAX-USDT-SWAP": 1.0,
    "LINK-USDT-SWAP": 1.0,
    "DOT-USDT-SWAP": 1.0,
    "NEAR-USDT-SWAP": 1.0,
    "SUI-USDT-SWAP": 1.0,
    "LTC-USDT-SWAP": 1.0,
    "TRX-USDT-SWAP": 1000.0,
    "HYPE-USDT-SWAP": 1.0,
    "ZEC-USDT-SWAP": 0.1,
    "PEPE-USDT-SWAP": 10000000.0,
    "SHIB-USDT-SWAP": 1000000.0,
}

def _get_okx_contract_val(inst_id: str) -> float:
    if not inst_id:
        return 1.0
    inst_id_upper = inst_id.strip().upper()
    if inst_id_upper in OKX_CT_VAL_CACHE:
        return OKX_CT_VAL_CACHE[inst_id_upper]
    try:
        url = f"https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId={inst_id_upper}"
        resp = requests.get(url, timeout=2.0).json()
        if resp.get("code") == "0" and resp.get("data"):
            val = float(resp["data"][0].get("ctVal", 1.0))
            if val > 0:
                OKX_CT_VAL_CACHE[inst_id_upper] = val
                return val
    except Exception:
        pass
    return 1.0

_okx_positions_cache = {}

@app.get("/api/bot/positions")
def get_bot_positions(uid: str, strategy: str = "sub1", account_id: str = None):
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return []
    if not account_id or not account_id.strip():
        return []
    target_acc = account_id.strip()
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)

    # Nếu chưa nhập API Key, trả về rỗng (tránh hiển thị rác từ trade_markers cũ)
    if not (api_key and secret_key and passphrase):
        return []

    cache_key = f"{uid}:{strategy}:{target_acc}"
    now = time.time()
    cached_entry = _okx_positions_cache.get(cache_key)

    raw_positions = []
    algo_data = []
    raw_pending_orders = []
    pos_fetched = False
    pending_fetched = False

    try:
        # 1. Fetch positions from OKX (độc lập, timeout 5s)
        try:
            resp = _okx_signed_request("GET", "/api/v5/account/positions?instType=SWAP", "", api_key, secret_key, passphrase, is_demo, timeout=5)
            if resp.status_code == 200:
                res_pos = resp.json()
                if res_pos.get("code") == "0":
                    raw_positions = res_pos.get("data", [])
                    pos_fetched = True
                else:
                    print(f"[OKX] Positions error: {res_pos.get('code')} - {res_pos.get('msg')}")
        except Exception as e_pos:
            print(f"[OKX] Lỗi lấy live positions: {e_pos}")

        # 2. Fetch algo orders (TP/SL)
        try:
            resp_algo = _okx_signed_request("GET", "/api/v5/trade/orders-algo-pending?ordType=conditional", "", api_key, secret_key, passphrase, is_demo, timeout=4)
            if resp_algo.status_code == 200:
                res_algo = resp_algo.json()
                if res_algo.get("code") == "0":
                    algo_data = res_algo.get("data", [])
        except Exception:
            pass

        # 3. LẤY TRỰC TIẾP LỆNH LIMIT CHỜ KHỚP ĐANG TREO TRÊN SÀN OKX (Độc lập, không bị đứt đoạn theo positions)
        try:
            resp_pending = _okx_signed_request("GET", "/api/v5/trade/orders-pending", "", api_key, secret_key, passphrase, is_demo, timeout=5)
            if resp_pending.status_code == 200:
                res_pending = resp_pending.json()
                if res_pending.get("code") == "0":
                    raw_pending_orders = res_pending.get("data", [])
                    pending_fetched = True
                elif res_pending.get("code") in ["51000", "51001"]:
                    resp_pending2 = _okx_signed_request("GET", "/api/v5/trade/orders-pending?instType=SWAP", "", api_key, secret_key, passphrase, is_demo, timeout=4)
                    if resp_pending2.status_code == 200 and resp_pending2.json().get("code") == "0":
                        raw_pending_orders = resp_pending2.json().get("data", [])
                        pending_fetched = True
            else:
                resp_pending2 = _okx_signed_request("GET", "/api/v5/trade/orders-pending?instType=SWAP", "", api_key, secret_key, passphrase, is_demo, timeout=4)
                if resp_pending2.status_code == 200 and resp_pending2.json().get("code") == "0":
                    raw_pending_orders = resp_pending2.json().get("data", [])
                    pending_fetched = True
        except Exception as e_pend:
            print(f"[OKX] Lỗi lấy live orders-pending: {e_pend}")

        # Chống giật lag: Nếu lỗi kết nối tạm thời / rate-limit 50011, tái sử dụng dữ liệu từ cache
        if not pending_fetched and cached_entry:
            raw_pending_orders = cached_entry.get("raw_pending", [])
        if not pos_fetched and cached_entry:
            raw_positions = cached_entry.get("raw_positions", [])

        formatted_positions = []
        
        # Read trade_markers for virtual tickets
        markers = {}
        positions_path = os.path.join(get_user_data_dir(uid), f"bots/{strategy}", "json_data", "trade_markers.json")
        if os.path.exists(positions_path):
            for _ in range(5):
                try:
                    with open(positions_path, "r", encoding="utf-8") as f:
                        markers = json.load(f)
                    break
                except Exception:
                    time.sleep(0.05)

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
            inst_id = f"{coin.upper()}-USDT-SWAP"
            for side in ["long", "short"]:
                side_items = [i for i in items if i.get("side", "").lower() == side and i.get("status") == "active"]
                if side_items and (inst_id, side) not in okx_pos_map:
                    for item in side_items: item["status"] = "closed"
                    dirty_markers = True

        if dirty_markers:
            for _ in range(5):
                try:
                    with open(positions_path, "w", encoding="utf-8") as f:
                        json.dump(markers, f)
                    break
                except Exception:
                    time.sleep(0.05)

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

        # ĐỊNH DẠNG CÁC LỆNH LIMIT CHỜ KHỚP TRÊN SÀN OKX
        formatted_limit_orders = []
        for o in raw_pending_orders:
            ord_type = str(o.get("ordType", "")).lower()
            # Nhận mọi loại lệnh limit: limit, post_only (maker limit), fok, ioc
            if ord_type not in ["limit", "post_only", "fok", "ioc"]:
                continue
            ord_id = o.get("ordId")
            inst_id = o.get("instId", "")
            coin = inst_id.split("-")[0] if "-" in inst_id else inst_id
            pos_side = o.get("posSide", "net").lower()
            side = o.get("side", "").lower()
            if pos_side == "net" or not pos_side:
                pos_side = "long" if side == "buy" else "short"

            px = o.get("px") or o.get("avgPx") or "0"
            sz_raw = float(o.get("sz", 0) or 0)
            acc_fill = float(o.get("accFillSz", 0) or 0)
            rem_sz = sz_raw - acc_fill
            if rem_sz <= 0 and sz_raw > 0:
                continue
            sz_str = f"{rem_sz:g}" if rem_sz > 0 else (o.get("sz") or "0")

            lever = o.get("lever")
            f_lev = float(lever) if (lever and float(lever) > 0) else 100.0

            ct_val = _get_okx_contract_val(inst_id)
            try:
                f_px = float(px)
                f_sz = float(sz_str)
                # Ký quỹ chuẩn OKX: (Số hợp đồng * ctVal * Giá) / Đòn bẩy
                est_margin = (f_sz * ct_val * f_px) / f_lev if f_lev > 0 else 0.0
                margin_str = f"{est_margin:.2f}"
            except Exception:
                margin_str = "0.00"

            c_tf = ""
            for item in markers.get(coin, []):
                if item.get("order_id") == ord_id or (item.get("status") == "pending" and item.get("side", "").lower() == pos_side):
                    c_tf = item.get("tf", "").upper()
                    break

            formatted_limit_orders.append({
                "ticket_id": f"ord_{ord_id}",
                "order_id": ord_id,
                "is_limit": True,
                "is_aggregate": False,
                "is_child": False,
                "status": "Chờ khớp (Limit)",
                "instId": inst_id,
                "posSide": pos_side,
                "side": side,
                "pos": sz_str,
                "margin": margin_str,
                "avgPx": px,
                "lastPx": px,
                "roi": "0.00",
                "upl": "0.00",
                "tp": "---",
                "sl": "---",
                "lever": str(int(f_lev)),
                "tf": c_tf,
                "cTime": int(o.get("cTime") or 0)
            })

        # Sắp xếp các lệnh Limit theo thời gian tạo mới nhất
        formatted_limit_orders.sort(key=lambda x: x.get("cTime", 0), reverse=True)

        final_result = formatted_positions + formatted_limit_orders
        _okx_positions_cache[cache_key] = {
            "result": final_result,
            "raw_positions": raw_positions,
            "raw_pending": raw_pending_orders,
            "ts": now
        }
        return final_result
    except Exception as e:
        print(f"Error fetching OKX positions: {e}")
        if cached_entry and (now - cached_entry.get("ts", 0) < 45):
            return cached_entry.get("result", [])

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
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return []
    # Nếu chưa nhập API Key, trả về rỗng (tránh hiển thị tín hiệu từ trade_markers cũ sau khi xoá API)
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, _ = _get_okx_creds(uid, strategy, target_acc)
    if not (api_key and secret_key and passphrase) and not is_admin_uid(uid):
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
def close_virtual_ticket(req: CloseTicketRequest, uid: str, strategy: str = "sub1", account_id: str = None):
    # 1. Call OKX API to execute close position on exchange FIRST
    target_acc = account_id.strip() if (account_id and account_id.strip()) else strategy
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)

    if not (api_key and secret_key and passphrase):
        raise HTTPException(status_code=400, detail=f"Chưa cấu hình API Key cho tài khoản {target_acc}! Vui lòng nhập API Key trong mục Cài Đặt.")

    if api_key and secret_key and passphrase:
        try:
            inst_id = req.instId if req.instId.endswith("-SWAP") else f"{req.instId}-SWAP"
            pos_side = req.posSide.lower()
            base_url = "https://www.okx.com"
            order_side = "sell" if pos_side == "long" else "buy"
            path_order = "/api/v5/trade/order"
            
            ticket_vol = float(req.pos)
            ticket_id = getattr(req, "ticket_id", "")
            is_limit = bool(getattr(req, "is_limit", False) or ticket_id.startswith("ord_"))

            # ── 1. NẾU LÀ LỆNH LIMIT ĐANG CHỜ KHỚP ──> GỌI HỦY LỆNH TRÊN SÀN OKX
            if is_limit or ticket_id.startswith("ord_"):
                clean_ord_id = ticket_id.replace("ord_", "")
                cancel_payload = json.dumps([{"instId": inst_id, "ordId": clean_ord_id}])
                c_resp = _okx_signed_request("POST", "/api/v5/trade/cancel-batch-orders", cancel_payload, api_key, secret_key, passphrase, is_demo)
                if c_resp.status_code == 200 and c_resp.json().get("code") == "0":
                    print(f"🧹 [OKX] Đã hủy lệnh Limit #{clean_ord_id} ({inst_id}) thành công trên sàn!", flush=True)
                    # Cập nhật cache ngay lập tức
                    for ck in list(_okx_positions_cache.keys()):
                        if ck.startswith(f"{uid}:"):
                            c_ent = _okx_positions_cache[ck]
                            c_ent["raw_pending"] = [o for o in c_ent.get("raw_pending", []) if str(o.get("ordId")) != str(clean_ord_id)]
                            c_ent["result"] = [p for p in c_ent.get("result", []) if str(p.get("order_id")) != str(clean_ord_id) and str(p.get("ticket_id")) != f"ord_{clean_ord_id}"]
                    return {"status": "success", "message": f"Đã hủy lệnh Limit #{clean_ord_id} thành công!"}
                else:
                    err_msg = c_resp.json().get("msg") if c_resp.status_code == 200 else f"HTTP {c_resp.status_code}"
                    raise HTTPException(status_code=400, detail=f"OKX từ chối hủy lệnh: {err_msg}")
            
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
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        return {"status": "error", "message": "No account selected", "availBal": 0, "totalEq": 0, "balance": 0}
    if not account_id or not account_id.strip():
        return {"status": "error", "message": "No account selected", "availBal": 0, "totalEq": 0, "balance": 0}
    target_acc = account_id.strip()
    api_key, secret_key, passphrase, is_demo = _get_okx_creds(uid, strategy, target_acc)
    if not api_key:
        return {"status": "error", "message": "No OKX Credentials", "availBal": 0, "totalEq": 0, "balance": 0}
    
    key = f"{uid}:{target_acc}"
    cached = _okx_account_balances_cache.get(key)
    
    path = f"/api/v5/account/balance?ccy={ccy}"
    try:
        resp = _okx_signed_request("GET", path, "", api_key, secret_key, passphrase, is_demo, timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "0" and len(data.get("data", [])) > 0:
                bdata = data["data"][0]
                total_eq = float(bdata.get("totalEq", 0) or 0)
                details = bdata.get("details", [])
                avail_bal = 0.0
                if details:
                    for d in details:
                        if d.get("ccy") == ccy:
                            avail_bal = float(d.get("availBal", 0) or 0)
                            if total_eq == 0:
                                total_eq = float(d.get("eq", d.get("cashBal", 0)) or 0)
                            break
                    if avail_bal == 0 and details:
                        avail_bal = float(details[0].get("availBal", 0) or 0)
                
                final_bal = total_eq if total_eq > 0 else avail_bal
                if final_bal > 0:
                    _okx_account_balances_cache[key] = {"balance": round(final_bal, 2), "ts": time.time()}
                return {
                    "status": "success",
                    "availBal": avail_bal if avail_bal > 0 else final_bal,
                    "totalEq": round(final_bal, 2),
                    "balance": round(final_bal, 2)
                }
    except Exception:
        pass
        
    if cached and cached.get("balance", 0) > 0:
        c_bal = cached["balance"]
        return {"status": "success", "availBal": c_bal, "totalEq": c_bal, "balance": c_bal, "cached": True}
        
    return {"status": "error", "message": "Failed to fetch balance", "availBal": 0, "totalEq": 0, "balance": 0}

@app.get("/api/bot/balance")
def api_get_bot_balance(uid: str, account_id: str = "", strategy: str = "sub1", ccy: str = "USDT"):
    return get_account_balance(uid=uid, strategy=strategy, account_id=account_id, ccy=ccy)

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
    if not uid or uid in ["default", "guest", "undefined", "null"]:
        await websocket.send_text("ℹ️ Vui lòng kết nối tài khoản OKX để bắt đầu sử dụng và xem logs bot.")
        try:
            while True:
                await websocket.receive_text()
        except Exception:
            pass
        return

    if uid not in active_connections: active_connections[uid] = {}
    if strategy not in active_connections[uid]: active_connections[uid][strategy] = []
    active_connections[uid][strategy].append(websocket)
    
    await websocket.send_text(f"🔄 Đã kết nối với TLS1 Trading Web Terminal Server ({strategy})...")
    
    # Chỉ gửi ring buffer của chính UID này, TUYỆT ĐỐI không fallback sang UID của người khác
    target_queue = None
    if uid in bot_log_queues and strategy in bot_log_queues[uid] and len(bot_log_queues[uid][strategy]) > 0:
        target_queue = bot_log_queues[uid][strategy]

    if target_queue:
        recent_logs = list(target_queue)
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

bot_data_tasks = {}

async def get_state_payload(uid: str, strategy: str, acc: str):
    if not acc or not acc.strip():
        try:
            status_data = await asyncio.to_thread(get_bot_status, uid, strategy)
        except Exception:
            status_data = {"status": "STOPPED", "uptime": 0}
        return {
            "type": "bot_data",
            "strategy": strategy,
            "account_id": "",
            "status": status_data,
            "positions": [],
            "balance": {"status": "error", "availBal": 0, "totalEq": 0, "balance": 0},
            "closed_positions": []
        }
    try:
        status_data = await asyncio.to_thread(get_bot_status, uid, strategy)
    except Exception:
        status_data = {"status": "STOPPED", "uptime": 0}
    try:
        pos_data = await asyncio.to_thread(get_bot_positions, uid, strategy, acc)
    except Exception:
        pos_data = []
    try:
        # Chuẩn hóa thứ tự tham số: uid, strategy, account_id (acc), ccy ("USDT")
        bal_data = await asyncio.to_thread(get_account_balance, uid, strategy, acc, "USDT")
    except Exception:
        key = f"{uid}:{acc}"
        cached = _okx_account_balances_cache.get(key)
        c_bal = cached.get("balance", 0) if cached else 0
        bal_data = {"status": "success" if c_bal > 0 else "error", "availBal": c_bal, "totalEq": c_bal, "balance": c_bal}
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

async def bg_push_for_uid_strategy(uid: str, strategy: str):
    while True:
        try:
            await asyncio.sleep(2.0)
            conns = bot_data_connections.get(uid, {}).get(strategy, [])
            if not conns:
                break
                
            unique_accs = {c["acc"] for c in conns}
            payloads = {}
            for acc in unique_accs:
                payloads[acc] = await get_state_payload(uid, strategy, acc)
                
            for c in list(conns):
                try:
                    await c["ws"].send_text(json.dumps(payloads[c["acc"]]))
                except Exception:
                    pass
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(1.0)
    bot_data_tasks.pop((uid, strategy), None)

@app.websocket("/ws/bot_data/{uid}/{strategy}")
async def websocket_bot_data(websocket: WebSocket, uid: str, strategy: str):
    await websocket.accept()
    if uid not in bot_data_connections: bot_data_connections[uid] = {}
    if strategy not in bot_data_connections[uid]: bot_data_connections[uid][strategy] = []
    
    conn_obj = {"ws": websocket, "acc": ""}
    bot_data_connections[uid][strategy].append(conn_obj)
    
    if (uid, strategy) not in bot_data_tasks or bot_data_tasks[(uid, strategy)].done():
        bot_data_tasks[(uid, strategy)] = asyncio.create_task(bg_push_for_uid_strategy(uid, strategy))

    init_data = await get_state_payload(uid, strategy, "")
    await websocket.send_text(json.dumps(init_data))
    
    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                if msg.get("action") in ["refresh", "switch_account"]:
                    conn_obj["acc"] = str(msg.get("account_id") or "").strip()
                    payload = await get_state_payload(uid, strategy, conn_obj["acc"])
                    await websocket.send_text(json.dumps(payload))
            except Exception:
                pass
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if conn_obj in bot_data_connections.get(uid, {}).get(strategy, []):
            bot_data_connections[uid][strategy].remove(conn_obj)
        if not bot_data_connections.get(uid, {}).get(strategy, []):
            task = bot_data_tasks.pop((uid, strategy), None)
            if task: task.cancel()

# --- REVIEW & RATINGS SYSTEM (SHOPEE STYLE) ---
REVIEWS_FILE = os.path.join(os.path.dirname(__file__), "../../user_data/reviews.json")

def _init_default_reviews():
    return [
        {
            "id": "rev_1",
            "username": "User ****8912",
            "user_key": "seed_1",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 5,
            "date": "12/08/2026",
            "comment": "Đúng mô tả chất lượng, bot bắt râu quét thanh khoản rất bén. Tỷ lệ hit TP cao, drawdown cực thấp.",
            "seller_reply": None,
            "likes": 18
        },
        {
            "id": "rev_2",
            "username": "User ****4a7b",
            "user_key": "seed_2",
            "bot_strategy": "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
            "rating": 5,
            "date": "10/08/2026",
            "comment": "Bot SMC đánh theo Order Block rất kỷ luật. Tránh được bão giá đợt tin CPI vừa rồi. 5 sao cho team phát triển!",
            "seller_reply": None,
            "likes": 12
        },
        {
            "id": "rev_3",
            "username": "User ****90c1",
            "user_key": "seed_3",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 5,
            "date": "08/08/2026",
            "comment": "Bắt sóng hồi EMA200 nến 15m mượt mà, gồng lãi tự động trailing limit rất thông minh.",
            "seller_reply": None,
            "likes": 15
        },
        {
            "id": "rev_4",
            "username": "User ****123f",
            "user_key": "seed_4",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 4,
            "date": "05/08/2026",
            "comment": "Bot chạy ổn áp, nếu có thêm thông báo Telegram báo râu quét tức thì nữa thì hoàn hảo 10/10.",
            "seller_reply": None,
            "likes": 9
        },
        {
            "id": "rev_5",
            "username": "User ****55d8",
            "user_key": "seed_5",
            "bot_strategy": "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
            "rating": 5,
            "date": "01/08/2026",
            "comment": "Chạy song song 3 bot thấy bot SMC lợi nhuận ổn định nhất. Anh em nên chia vốn theo tỷ lệ 1-2% rủi ro, đừng tham all-in là ngủ ngon.",
            "seller_reply": None,
            "likes": 11
        },
        {
            "id": "rev_6",
            "username": "User ****77e2",
            "user_key": "seed_6",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 5,
            "date": "28/07/2026",
            "comment": "Giao diện web trực quan, xem được biểu đồ đa khung thời gian và trạng thái lệnh theo thời gian thực rất tiện.",
            "seller_reply": None,
            "likes": 8
        },
        {
            "id": "rev_7",
            "username": "User ****9381",
            "user_key": "seed_7",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 5,
            "date": "25/07/2026",
            "comment": "Hôm qua lúc 2h sáng BTC giật râu quét long short cả 2 đầu, sáng dậy thấy bot cắn đúng đáy râu rồi TP ngọt lịm. Đỡ phải thức đêm canh lệnh bạc cả tóc.",
            "seller_reply": None,
            "likes": 16
        },
        {
            "id": "rev_8",
            "username": "User ****2204",
            "user_key": "seed_8",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 4,
            "date": "22/07/2026",
            "comment": "Đánh nến H1 rất chắc tay, ít khi bị dính false break. Có điều thị trường sideway biên hẹp thì vào lệnh hơi ít, phải kiên nhẫn.",
            "seller_reply": None,
            "likes": 7
        },
        {
            "id": "rev_9",
            "username": "User ****6619",
            "user_key": "seed_9",
            "bot_strategy": "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
            "rating": 5,
            "date": "19/07/2026",
            "comment": "Ban đầu nạp test 500u xem thế nào, chạy được 3 tuần thấy R:R toàn 1:2 với 1:3 chuẩn chỉ quá nên quyết định nâng vốn lên 3000u. Quản lý lệnh rất đàng hoàng.",
            "seller_reply": None,
            "likes": 21
        },
        {
            "id": "rev_10",
            "username": "User ****8832",
            "user_key": "seed_10",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 5,
            "date": "16/07/2026",
            "comment": "Cái quả Dynamic Trailing Limit đỉnh thật sự. Giá rướn thêm là bot tự dời điểm chốt lời theo, không bị tình trạng chốt non tức tưởi như mấy bot thông thường.",
            "seller_reply": None,
            "likes": 14
        },
        {
            "id": "rev_11",
            "username": "User ****3105",
            "user_key": "seed_11",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 4,
            "date": "14/07/2026",
            "comment": "Đợt bão tin Non-Farm vừa rồi dính 1 lệnh SL ở khung M5. May mà tỷ lệ rủi ro để 1% nên không xi nhê gì. Khuyên anh em mới chơi nên tắt M5 chỉ để H1 trở lên khi có tin giật mạnh.",
            "seller_reply": None,
            "likes": 10
        },
        {
            "id": "rev_12",
            "username": "User ****7048",
            "user_key": "seed_12",
            "bot_strategy": "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
            "rating": 5,
            "date": "11/07/2026",
            "comment": "Vừa rút lãi tháng đầu tiên về tiêu. Cảm giác không bị tâm lý fomo bấm lệnh tay nó nhẹ đầu hẳn anh em ạ. Tks team hỗ trợ nhiệt tình từ lúc chuyển Ref.",
            "seller_reply": None,
            "likes": 13
        },
        {
            "id": "rev_13",
            "username": "User ****4491",
            "user_key": "seed_13",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 5,
            "date": "08/07/2026",
            "comment": "Khen nhất quả bot tự dọn dẹp lệnh Limit cũ khi bật lại. Không bị rác sàn hay kẹt margin. Cơ chế kiểm soát lệnh rất chặt.",
            "seller_reply": None,
            "likes": 6
        },
        {
            "id": "rev_14",
            "username": "User ****1976",
            "user_key": "seed_14",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 4,
            "date": "05/07/2026",
            "comment": "Bắt altcoin ETH với SOL cực nhạy. Nhưng con PEPE biến động điên quá nhiều khi râu quét dài ngoằng, anh em chơi memecoin nên giảm đòn bẩy xuống x3 x5 thôi.",
            "seller_reply": None,
            "likes": 8
        },
        {
            "id": "rev_15",
            "username": "User ****5820",
            "user_key": "seed_15",
            "bot_strategy": "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
            "rating": 5,
            "date": "02/07/2026",
            "comment": "Thuật toán tìm vùng Order Block chuẩn phết, chạm đúng mép khối OB là bật lên như lò xo. Tỷ lệ thắng cỡ 70-75% mà R:R đẹp.",
            "seller_reply": None,
            "likes": 17
        },
        {
            "id": "rev_16",
            "username": "User ****6013",
            "user_key": "seed_16",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 5,
            "date": "29/06/2026",
            "comment": "Từ ngày cắm bot này vào OKX thì giải phóng được bao nhiêu thời gian. Vừa làm việc chính vừa để bot tự chạy kiếm thêm tiền cafe bỉm sữa.",
            "seller_reply": None,
            "likes": 19
        },
        {
            "id": "rev_17",
            "username": "User ****3728",
            "user_key": "seed_17",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 5,
            "date": "26/06/2026",
            "comment": "Tính năng Macro Sync Altcoin theo BTC hay vãi, BTC đang đâm đầu thì bot tự động khóa không cho Long Altcoin bừa bãi, cứu bao nhiêu bàn thua trông thấy.",
            "seller_reply": None,
            "likes": 12
        },
        {
            "id": "rev_18",
            "username": "User ****9402",
            "user_key": "seed_18",
            "bot_strategy": "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
            "rating": 4,
            "date": "23/06/2026",
            "comment": "Chạy trên PWA điện thoại mượt, xem biểu đồ tradingview tiện. Mong team ra thêm hướng dẫn chi tiết cách tinh chỉnh hệ số Internal Length cho người mới.",
            "seller_reply": None,
            "likes": 5
        },
        {
            "id": "rev_19",
            "username": "User ****8254",
            "user_key": "seed_19",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 5,
            "date": "20/06/2026",
            "comment": "Đã giới thiệu cho 2 ông bạn cùng hội trade vào ref của TLS1. Cả 2 ông đều khen bot bắt râu khét lẹt. Đáng đồng tiền bát gạo.",
            "seller_reply": None,
            "likes": 11
        },
        {
            "id": "rev_20",
            "username": "User ****1567",
            "user_key": "seed_20",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 5,
            "date": "17/06/2026",
            "comment": "DCA Dương (Pyramid) lúc bắt đúng trend ăn đậm thật. Lệnh trước có lãi mới nhồi lệnh sau, không bao giờ nhồi khi âm nên tài khoản rất an toàn.",
            "seller_reply": None,
            "likes": 14
        },
        {
            "id": "rev_21",
            "username": "User ****4983",
            "user_key": "seed_21",
            "bot_strategy": "Bot 3: Săn Thanh Khoản (Liquidation)",
            "rating": 4,
            "date": "14/06/2026",
            "comment": "Hôm đầu cài đặt chưa quen bấm nhầm khối lượng xém tí toát mồ hôi, may mà nhắn hỗ trợ được chỉ lại cách set vốn cố định USDT. Giờ thì chạy mượt rồi.",
            "seller_reply": None,
            "likes": 6
        },
        {
            "id": "rev_22",
            "username": "User ****7639",
            "user_key": "seed_22",
            "bot_strategy": "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
            "rating": 5,
            "date": "11/06/2026",
            "comment": "Hệ số trượt giá Max Slippage chuẩn giúp lệnh khớp không bị lệch giá nhiều lúc biến động lớn. Rất ưng bụng độ hoàn thiện của hệ thống.",
            "seller_reply": None,
            "likes": 9
        },
        {
            "id": "rev_23",
            "username": "User ****2810",
            "user_key": "seed_23",
            "bot_strategy": "Bot 1: Sóng Hồi EMA200 (Pullback)",
            "rating": 5,
            "date": "08/06/2026",
            "comment": "Tổng kết 1 tháng chạy bot: Lãi ròng 18.5%, max drawdown chỉ 4.2%. Quá mỹ mãn cho một con bot chạy tự động 24/7.",
            "seller_reply": None,
            "likes": 24
        }
    ]

def _load_reviews():
    try:
        os.makedirs(os.path.dirname(REVIEWS_FILE), exist_ok=True)
        if os.path.exists(REVIEWS_FILE):
            with open(REVIEWS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"[REVIEWS] Error loading reviews: {e}")
    default_data = _init_default_reviews()
    try:
        with open(REVIEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    return default_data

def _save_reviews(data):
    try:
        os.makedirs(os.path.dirname(REVIEWS_FILE), exist_ok=True)
        with open(REVIEWS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[REVIEWS] Error saving reviews: {e}")
        return False

def _apply_reviews_buff(reviews: list) -> bool:
    """
    Tự động buff lượt 'Hữu ích' (likes) ngẫu nhiên cho các đánh giá:
    - Tần suất: Mỗi 300 - 500 giây (+1 lượt hữu ích).
    - Giới hạn tối đa: Không vượt quá 80% tổng số lượng đánh giá hiện có.
    """
    if not reviews:
        return False
    
    total_count = len(reviews)
    max_likes = max(1, int(total_count * 0.8))
    now = time.time()
    changed = False

    for rev in reviews:
        current_likes = rev.get("likes", 0)
        if current_likes >= max_likes:
            if "next_buff_ts" in rev:
                rev.pop("next_buff_ts", None)
                changed = True
            continue

        next_ts = rev.get("next_buff_ts")
        if not next_ts:
            # Khởi tạo thời điểm buff ngẫu nhiên ban đầu từ 300 đến 500 giây
            rev["next_buff_ts"] = now + random.randint(300, 500)
            changed = True
        elif now >= next_ts:
            rev["likes"] = current_likes + 1
            if rev["likes"] < max_likes:
                rev["next_buff_ts"] = now + random.randint(300, 500)
            else:
                rev.pop("next_buff_ts", None)
            changed = True

    if changed:
        _save_reviews(reviews)
    return changed

async def _reviews_buff_worker():
    """Chạy ngầm định kỳ 60s để kiểm tra và tự động buff lượt hữu ích cho đánh giá."""
    while True:
        try:
            await asyncio.sleep(60)
            reviews = _load_reviews()
            _apply_reviews_buff(reviews)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[REVIEWS BUFF WORKER] Error: {e}")

@app.on_event("startup")
async def startup_reviews_buff():
    asyncio.create_task(_reviews_buff_worker())

class ReviewSubmitRequest(BaseModel):
    api_key: Optional[str] = ""
    user_id: Optional[str] = ""
    bot_strategy: str
    rating: int
    comment: str

@app.get("/api/reviews")
async def get_reviews():
    reviews = _load_reviews()
    _apply_reviews_buff(reviews)
    return {"status": "success", "data": reviews}

@app.post("/api/reviews")
async def submit_review(req: ReviewSubmitRequest):
    api_key_clean = (req.api_key or "").strip()
    user_id_clean = (req.user_id or "").strip()
    user_key = api_key_clean or user_id_clean or "guest_anonymous"
    
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Số sao đánh giá phải từ 1 đến 5 sao.")
    if not req.comment or len(req.comment.strip()) < 5:
        raise HTTPException(status_code=400, detail="Nội dung đánh giá cần tối thiểu 5 ký tự.")
    if not req.bot_strategy:
        raise HTTPException(status_code=400, detail="Vui lòng chọn chiến lược bot cần đánh giá.")
        
    reviews = _load_reviews()
    
    # Kiểm tra giới hạn: Mỗi API Key chỉ được đánh giá tối đa 2 lần trên cùng 1 bot
    user_reviews_for_bot = [
        r for r in reviews 
        if r.get("user_key") == user_key and r.get("bot_strategy") == req.bot_strategy
    ]
    if len(user_reviews_for_bot) >= 2:
        raise HTTPException(
            status_code=400, 
            detail=f"Tài khoản của bạn đã gửi tối đa 2 đánh giá cho '{req.bot_strategy}'."
        )
        
    # Tạo tên viết tắt (masked name) dạng 'User ****1234'
    if api_key_clean and len(api_key_clean) >= 6:
        clean_key = "".join(c for c in api_key_clean if c.isalnum())
        masked_name = f"User ****{clean_key[-4:]}"
    elif user_id_clean:
        clean_uid = "".join(c for c in user_id_clean if c.isalnum())
        masked_name = f"User ****{clean_uid[-4:]}"
    else:
        masked_name = f"User ****{str(int(time.time()))[-4:]}"
        
    new_rev = {
        "id": f"rev_{int(time.time() * 1000)}",
        "username": masked_name,
        "user_key": user_key,
        "bot_strategy": req.bot_strategy,
        "rating": req.rating,
        "date": datetime.now().strftime("%d/%m/%Y"),
        "comment": req.comment.strip(),
        "seller_reply": None,
        "likes": 0,
        "next_buff_ts": time.time() + random.randint(300, 500)
    }
    
    reviews.insert(0, new_rev)
    _save_reviews(reviews)
    return {"status": "success", "message": "Đánh giá thành công!", "data": reviews}

@app.post("/api/reviews/like")
async def like_review(review_id: str):
    reviews = _load_reviews()
    found = False
    max_likes = max(1, int(len(reviews) * 0.8))
    for r in reviews:
        if r.get("id") == review_id:
            r["likes"] = r.get("likes", 0) + 1
            if r["likes"] >= max_likes:
                r.pop("next_buff_ts", None)
            found = True
            break
    if found:
        _save_reviews(reviews)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá.")


# ==============================================================================
# TRADELOCKER / E8 MARKETS PROP FIRM INTEGRATION
# ==============================================================================
from tradelocker_service import TradeLockerManager, TradeLockerClient, _safe_float

class TradeLockerConnectReq(BaseModel):
    uid: str
    email: Optional[str] = ""
    password: str
    server: str = "E8"
    environment: Optional[str] = "https://demo.tradelocker.com"
    platform: Optional[str] = "tradelocker"
    login: Optional[str] = None
    firm: Optional[str] = None
    fund_size: Optional[float] = 5000.0
    risk_per_trade: Optional[float] = 25.0
    daily_drawdown_limit: Optional[float] = 125.0
    daily_profit_cap: Optional[float] = 100.0
    enabled_symbols: Optional[List[str]] = ["XAU", "BTC", "ETH"]
    is_enabled: Optional[bool] = True

class TradeLockerConfigReq(BaseModel):
    uid: str
    account_id: Optional[str] = None
    fund_size: Optional[float] = 5000.0
    risk_per_trade: Optional[float] = 25.0
    daily_drawdown_limit: Optional[float] = 125.0
    daily_profit_cap: Optional[float] = 100.0
    enabled_symbols: Optional[List[str]] = ["XAU", "BTC", "ETH"]
    is_enabled: Optional[bool] = True
    fixed_lot: Optional[float] = 0.01

class TradeLockerSelectReq(BaseModel):
    uid: str
    account_id: str
    strategy: Optional[str] = None

@app.post("/api/tradelocker/connect")
def tradelocker_connect(req: TradeLockerConnectReq, jwt_data: Optional[dict] = Depends(verify_jwt)):
    clean_uid = req.uid.strip()
    if not clean_uid:
        raise HTTPException(status_code=400, detail="UID không được để trống")
    if jwt_data and jwt_data.get("uid") and jwt_data["uid"] != clean_uid and not jwt_data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # 🔵 HỖ TRỢ NỀN TẢNG CHÍNH METATRADER 5 (MT5 / PLATFORM 5)
    if req.platform == "mt5":
        acc_num = str(req.login or req.email).strip()
        if not acc_num or not req.password:
            raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ Số tài khoản (Login) và Mật khẩu MT5")

        # Thử kết nối kiểm tra thông tin tài khoản MT5
        verified_balance = req.fund_size or 5000.0
        try:
            from mt5_service import MT5HubManager, MT5_AVAILABLE
            if MT5_AVAILABLE and acc_num.isdigit():
                client = MT5HubManager.get_or_create_client(int(acc_num), req.password, req.server or "E8Markets-Demo")
                ok, msg = client.connect()
                if ok and client.account_info:
                    verified_balance = client.account_info.get("balance", verified_balance)
                elif not ok and ("Mã lỗi" in msg or "thất bại" in msg):
                    print(f"[MT5] Cảnh báo kết nối: {msg}", flush=True)
        except Exception as e:
            print(f"[MT5] Lỗi kết nối MT5: {e}", flush=True)

        srv_up = (req.server or "").upper()
        if req.firm:
            firm_label = req.firm
        elif "VANTAGE" in srv_up:
            firm_label = "Vantage"
        elif "EXNESS" in srv_up:
            firm_label = "Exness"
        elif "ICMARKETS" in srv_up or "IC MARKETS" in srv_up:
            firm_label = "ICMarkets"
        elif "XM" in srv_up:
            firm_label = "XM"
        elif "E8" in srv_up:
            firm_label = "E8"
        elif "5" in srv_up or "FIVE" in srv_up:
            firm_label = "The5ers"
        elif "FTMO" in srv_up:
            firm_label = "FTMO"
        else:
            firm_label = req.server or "MT5"
        config = {
            "platform": "mt5",
            "email": req.email or f"{acc_num}@mt5",
            "password": req.password,
            "server": req.server or "E8Markets-Demo",
            "firm": firm_label,
            "name": f"{firm_label} MT5 #{acc_num}",
            "environment": "mt5",
            "fund_size": verified_balance,
            "risk_per_trade": req.risk_per_trade or 25.0,
            "daily_drawdown_limit": req.daily_drawdown_limit or 125.0,
            "daily_profit_cap": req.daily_profit_cap or 100.0,
            "enabled_symbols": req.enabled_symbols or ["XAU", "BTC", "ETH"],
            "is_enabled": req.is_enabled if req.is_enabled is not None else True,
            "account_id": acc_num,
            "acc_num": acc_num,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        acc_id = TradeLockerManager.upsert_account(clean_uid, config, get_user_base_dir, fernet)
        return {
            "status": "success",
            "account_id": acc_id,
            "name": config["name"],
            "balance": verified_balance,
            "currency": "USD"
        }

    try:
        client = TradeLockerClient(
            email=req.email,
            password=req.password,
            server=req.server,
            environment=req.environment
        )
        ok, msg = client.authenticate()
        if not ok:
            raise HTTPException(status_code=400, detail=msg)

        ok, accounts, acc_msg = client.get_accounts()
        if not ok or not accounts:
            raise HTTPException(status_code=400, detail=f"Không tìm thấy tài khoản TradeLocker nào ({acc_msg})")

        ok_state, state_data, _ = client.get_account_state()
        try:
            client.load_instruments()
        except Exception:
            pass

        # Xác định tên Quỹ chuẩn
        srv_up = (req.server or "").upper()
        firm_label = "E8" if "E8" in srv_up else ("The5ers" if "5" in srv_up else ("FTMO" if "FTMO" in srv_up else req.server))

        config = {
            "email": req.email,
            "password": req.password,
            "server": req.server,
            "firm": firm_label,
            "name": f"{firm_label} Demo #{client.account_id}",
            "environment": req.environment,
            "fund_size": req.fund_size or 5000.0,
            "risk_per_trade": req.risk_per_trade or 25.0,
            "daily_drawdown_limit": req.daily_drawdown_limit or 125.0,
            "daily_profit_cap": req.daily_profit_cap or 100.0,
            "enabled_symbols": req.enabled_symbols or ["XAU", "BTC", "ETH"],
            "is_enabled": req.is_enabled if req.is_enabled is not None else True,
            "account_id": client.account_id,
            "acc_num": client.acc_num,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        acc_id = TradeLockerManager.upsert_account(clean_uid, config, get_user_base_dir, fernet)

        return {
            "status": "success",
            "message": f"Kết nối tài khoản Quỹ {firm_label} (#{client.account_id}) thành công!",
            "id": acc_id,
            "account_id": client.account_id,
            "acc_num": client.acc_num,
            "name": config["name"],
            "server": req.server,
            "firm": firm_label,
            "balance": (state_data or {}).get("balance", client.account_balance),
            "equity": (state_data or {}).get("equity", client.account_balance),
            "currency": "USD"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[TradeLocker] Error in connect: {e}")
        logger.error(f"[TradeLocker] Error in connect: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Lỗi khi kết nối Quỹ: {str(e)}")

@app.get("/api/tradelocker/accounts")
def tradelocker_get_all_accounts(uid: str, jwt_data: Optional[dict] = Depends(verify_jwt)):
    clean_uid = uid.strip()
    if not clean_uid:
        raise HTTPException(status_code=400, detail="UID không được để trống")
    if jwt_data and jwt_data.get("uid") and jwt_data["uid"] != clean_uid and not jwt_data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    accounts, active_id = TradeLockerManager.load_raw_data(clean_uid, get_user_base_dir, fernet)
    safe_list = []
    for a in accounts:
        # Lấy số dư live nếu có client
        bal = a.get("fund_size", 5000.0)
        eq = bal
        try:
            cl = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=a.get("id"))
            if cl and cl.account_balance:
                bal = cl.account_balance
                eq = cl.account_balance
        except Exception:
            pass

        safe_list.append({
            "id": a.get("id"),
            "name": a.get("name", f"{a.get('server')} Demo #{a.get('account_id')}"),
            "server": a.get("server", "E8"),
            "firm": a.get("firm", a.get("server", "E8")),
            "account_id": a.get("account_id"),
            "acc_num": a.get("acc_num", a.get("account_id")),
            "email": a.get("email"),
            "balance": bal,
            "equity": eq,
            "fund_size": a.get("fund_size", 5000.0),
            "risk_per_trade": a.get("risk_per_trade", 25.0),
            "daily_loss_limit": a.get("daily_drawdown_limit", 125.0),
            "daily_profit_cap": a.get("daily_profit_cap", 100.0),
            "enabled_symbols": a.get("enabled_symbols", ["XAU", "BTC", "ETH"]),
            "is_enabled": a.get("is_enabled", True),
            "fixed_lot": a.get("fixed_lot", 0.01),
            "is_active": a.get("id") == active_id
        })
    bot_map, running_bots = TradeLockerManager.get_prop_bindings(clean_uid, get_user_base_dir)
    return {
        "status": "success",
        "accounts": safe_list,
        "active_id": active_id,
        "bot_prop_map": bot_map,
        "running_prop_bots": running_bots
    }

@app.post("/api/tradelocker/select_account")
def tradelocker_select_account(req: TradeLockerSelectReq, jwt_data: Optional[dict] = Depends(verify_jwt)):
    clean_uid = req.uid.strip()
    if not clean_uid:
        raise HTTPException(status_code=400, detail="UID không được để trống")
    if jwt_data and jwt_data.get("uid") and jwt_data["uid"] != clean_uid and not jwt_data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    ok = TradeLockerManager.select_active_account(clean_uid, req.account_id, get_user_base_dir, fernet)
    if not ok:
        raise HTTPException(status_code=400, detail="Không tìm thấy tài khoản Quỹ")

    # Nếu có truyền strategy (ví dụ sub1, sub2), lưu liên kết độc quyền
    if req.strategy:
        bot_map, _ = TradeLockerManager.get_prop_bindings(clean_uid, get_user_base_dir)
        bot_map[req.strategy] = req.account_id
        TradeLockerManager.save_prop_bindings(clean_uid, bot_prop_map=bot_map, user_base_dir_fn=get_user_base_dir)

    return {"status": "success", "active_id": req.account_id, "strategy": req.strategy}

@app.get("/api/tradelocker/account")
def tradelocker_get_account(uid: str, account_id: Optional[str] = None, jwt_data: Optional[dict] = Depends(verify_jwt)):
    clean_uid = uid.strip()
    if not clean_uid:
        raise HTTPException(status_code=400, detail="UID không được để trống")
    if jwt_data and jwt_data.get("uid") and jwt_data["uid"] != clean_uid and not jwt_data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    cfg = TradeLockerManager.load_user_config(clean_uid, get_user_base_dir, fernet, account_id=account_id)
    if not cfg:
        return {"status": "not_connected", "is_connected": False}

    client = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=account_id)
    if not client:
        return {"status": "not_connected", "is_connected": False}

    ok, state, msg = client.get_account_state()
    if not ok:
        return {
            "status": "error",
            "is_connected": True,
            "message": msg,
            "id": cfg.get("id"),
            "name": cfg.get("name"),
            "account_id": cfg.get("account_id"),
            "email": cfg.get("email")
        }

    fund_size = float(cfg.get("fund_size", 5000.0))
    balance = float(state.get("balance", fund_size))
    equity = float(state.get("equity", fund_size))
    profit = equity - fund_size

    profit_target = fund_size * 0.08
    static_loss_limit = fund_size * 0.08
    loss_level = fund_size - static_loss_limit
    daily_loss_limit = float(cfg.get("daily_drawdown_limit", 125.0))
    daily_profit_cap = float(cfg.get("daily_profit_cap", 100.0))

    return {
        "status": "success",
        "is_connected": True,
        "id": cfg.get("id"),
        "name": cfg.get("name", f"{cfg.get('server', 'E8')} Demo #{client.account_id}"),
        "account_id": client.account_id,
        "acc_num": client.acc_num,
        "email": cfg.get("email"),
        "server": cfg.get("server", "E8"),
        "firm": cfg.get("firm", cfg.get("server", "E8")),
        "environment": cfg.get("environment"),
        "balance": balance,
        "equity": equity,
        "free_margin": state.get("free_margin", balance),
        "pnl": state.get("pnl", 0.0),
        "profit": profit,
        "profit_target": profit_target,
        "fund_size": fund_size,
        "loss_level": loss_level,
        "static_loss_limit": static_loss_limit,
        "daily_loss_limit": daily_loss_limit,
        "daily_profit_cap": daily_profit_cap,
        "risk_per_trade": cfg.get("risk_per_trade", 25.0),
        "fixed_lot": cfg.get("fixed_lot", 0.01),
        "enabled_symbols": cfg.get("enabled_symbols", ["XAU", "BTC", "ETH"]),
        "is_enabled": cfg.get("is_enabled", True)
    }

@app.post("/api/tradelocker/config")
def tradelocker_update_config(req: TradeLockerConfigReq, jwt_data: Optional[dict] = Depends(verify_jwt)):
    clean_uid = req.uid.strip()
    if not clean_uid:
        raise HTTPException(status_code=400, detail="UID không được để trống")
    if jwt_data and jwt_data.get("uid") and jwt_data["uid"] != clean_uid and not jwt_data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    cfg = TradeLockerManager.load_user_config(clean_uid, get_user_base_dir, fernet, account_id=req.account_id)
    if not cfg:
        raise HTTPException(status_code=400, detail="Chưa có cấu hình Quỹ TradeLocker. Vui lòng kết nối tài khoản trước.")

    if req.fund_size is not None: cfg["fund_size"] = req.fund_size
    if req.risk_per_trade is not None: cfg["risk_per_trade"] = req.risk_per_trade
    if req.daily_drawdown_limit is not None: cfg["daily_drawdown_limit"] = req.daily_drawdown_limit
    if req.daily_profit_cap is not None: cfg["daily_profit_cap"] = req.daily_profit_cap
    if req.enabled_symbols is not None: cfg["enabled_symbols"] = req.enabled_symbols
    if req.is_enabled is not None: cfg["is_enabled"] = req.is_enabled
    if req.fixed_lot is not None: cfg["fixed_lot"] = round(float(req.fixed_lot), 2)
    cfg["updated_at"] = datetime.now(timezone.utc).isoformat()

    TradeLockerManager.save_user_config(clean_uid, cfg, get_user_base_dir, fernet, account_id=req.account_id)
    return {"status": "success", "message": "Đã lưu cài đặt Quỹ thành công!"}

@app.post("/api/tradelocker/disconnect")
def tradelocker_disconnect(uid: str, account_id: Optional[str] = None, jwt_data: Optional[dict] = Depends(verify_jwt)):
    clean_uid = uid.strip()
    if not clean_uid:
        raise HTTPException(status_code=400, detail="UID không được để trống")
    if jwt_data and jwt_data.get("uid") and jwt_data["uid"] != clean_uid and not jwt_data.get("is_admin"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if account_id:
        TradeLockerManager.delete_account(clean_uid, account_id, get_user_base_dir, fernet)
        return {"status": "success", "message": f"Đã xóa tài khoản Quỹ {account_id}."}
    else:
        file_path = TradeLockerManager.get_user_creds_file(clean_uid, get_user_base_dir)
        if os.path.exists(file_path):
            try: os.remove(file_path)
            except Exception: pass
        TradeLockerManager.remove_client(clean_uid)
        return {"status": "success", "message": "Đã ngắt kết nối toàn bộ tài khoản Quỹ."}

@app.post("/api/tradelocker/reset_capital")
def tradelocker_reset_capital(uid: str = "default", account_id: Optional[str] = None):
    clean_uid = uid.strip() if uid else "default"
    ok, bal, msg = TradeLockerManager.reset_capital(clean_uid, get_user_base_dir, fernet, account_id=account_id)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {
        "status": "success",
        "total_equity": round(bal, 2),
        "account": account_id or "default",
        "message": f"✅ {msg}"
    }

@app.post("/api/tradelocker/cancel_all_orders")
def tradelocker_cancel_all_orders(uid: str = "default", account_id: Optional[str] = None):
    clean_uid = uid.strip() if uid else "default"
    ok, canceled_count, msg = TradeLockerManager.cancel_all_pending_orders(clean_uid, get_user_base_dir, fernet, account_id=account_id)
    return {
        "status": "success" if ok else "error",
        "canceled_count": canceled_count,
        "message": msg
    }

class TradeLockerCloseReq(BaseModel):
    position_id: str
    uid: Optional[str] = "default"
    qty: Optional[float] = None
    account_id: Optional[str] = None
    is_limit: Optional[bool] = False

# Bộ đệm chống giật / flicker cho Bảng vị thế Quỹ FX (lưu trữ danh sách gần nhất khi mạng chập chờn hoặc timeout)
_prop_positions_cache: Dict[str, Dict[str, Any]] = {}

@app.get("/api/tradelocker/debug_positions")
def tradelocker_debug_positions(uid: str = "default", account_id: Optional[str] = None):
    clean_uid = uid.strip() if uid else "default"
    client = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=account_id)
    if not client:
        return {"error": "no client"}
    if not client.account_id or not client.acc_num:
        client.get_accounts()
    url = f"{client.base_url}/trade/accounts/{client.account_id}/positions"
    import requests
    resp = requests.get(url, headers=client._get_headers(include_acc_num=True), timeout=10)
    return {"status_code": resp.status_code, "text": resp.text, "account_id": client.account_id, "acc_num": client.acc_num}

@app.get("/api/tradelocker/positions")
def tradelocker_get_positions(uid: str = "default", account_id: Optional[str] = None):
    clean_uid = uid.strip() if uid else "default"
    cache_key = f"{clean_uid}:{account_id or 'active'}"
    now = time.time()

    # 🛡️ 3-Giây Cache Throttle: Ngăn chặn 100% việc frontend poll dồn dập gây HTTP 429 Too Many Requests từ TradeLocker
    cached_recent = _prop_positions_cache.get(cache_key)
    if cached_recent and (now - cached_recent.get("time", 0) < 3.0):
        return cached_recent.get("data", [])

    try:
        # 0. Kiểm tra nếu tài khoản là nền tảng MT5
        raw_accounts, active_id = TradeLockerManager.load_raw_data(clean_uid, get_user_base_dir, fernet)
        target_acc_id = account_id or active_id
        target_cfg = next((a for a in raw_accounts if a.get("id") == target_acc_id or a.get("account_id") == target_acc_id), None)
        if target_cfg and target_cfg.get("platform") == "mt5":
            try:
                from mt5_service import MT5HubManager, MT5_AVAILABLE
                acc_num = int(target_cfg.get("account_id") or target_cfg.get("login") or 0)
                if acc_num > 0:
                    mt5_cli = MT5HubManager.get_or_create_client(acc_num, target_cfg.get("password", ""), target_cfg.get("server", "E8Markets-Demo"))
                    return mt5_cli.get_positions() + mt5_cli.get_orders()
            except Exception as e:
                print(f"[MT5_POSITIONS] Error: {e}", flush=True)
                return []

        client = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=account_id)
        if not client:
            return []

        if not client.account_id or not client.acc_num:
            client.get_accounts()

        # 1. Lấy danh sách Vị thế đang mở (Active Positions)
        ok_pos, raw_positions, msg_pos = client.get_positions()

        # 2. Lấy danh sách Lệnh chờ (Pending Limit Orders)
        ok_ord, raw_orders, msg_ord = client.get_orders()

        # 🛡️ CƠ CHẾ CHỐNG FLICKER / GIẬT RỖNG:
        # Nếu cả 2 lệnh lấy positions và orders đều thất bại (lỗi mạng, Cloudflare timeout, token hết hạn):
        # TUYỆT ĐỐI KHÔNG TRẢ VỀ RỖNG [] làm biến mất vị thế của người dùng!
        if not ok_pos and not ok_ord:
            cached = _prop_positions_cache.get(cache_key)
            if cached and (now - cached.get("time", 0) < 90):
                print(f"[TradeLocker] Network glitch for {clean_uid}, using cache ({len(cached['data'])} items): {msg_pos}")
                return cached["data"]
            return []

        cached = _prop_positions_cache.get(cache_key)

        inst_cache = client.instruments_cache
        if not inst_cache:
            client.load_instruments()
            inst_cache = client.instruments_cache

        id_to_name = {}
        for name, item in (inst_cache or {}).items():
            tid = item.get("tradableInstrumentId")
            if tid:
                id_to_name[tid] = name
                id_to_name[str(tid)] = name

        mapped_list = []

        # A. PARSE ACTIVE POSITIONS (VỊ THẾ ĐANG CHẠY)
        if ok_pos:
            for p in raw_positions:
                if isinstance(p, list):
                    cols = client.get_positions_columns() if hasattr(client, "get_positions_columns") else [
                        "id", "tradableInstrumentId", "routeId", "side", "qty", "price",
                        "stopLoss", "takeProfit", "moment", "pnl", "trailingOffset"
                    ]
                    p = {cols[i]: p[i] for i in range(min(len(cols), len(p)))}
                pos_id = str(p.get("id") or p.get("positionId") or "")
                tradable_id = p.get("tradableInstrumentId")
                raw_sym = id_to_name.get(tradable_id) or id_to_name.get(str(tradable_id)) or p.get("symbol") or "BTCUSD+"
                
                clean_name = raw_sym.upper().replace("+", "")
                if "BTC" in clean_name:
                    inst_id = "BTC-USDT-SWAP"
                    display_pair = "BTC-USDT"
                elif "ETH" in clean_name:
                    inst_id = "ETH-USDT-SWAP"
                    display_pair = "ETH-USDT"
                elif "XAU" in clean_name or "GOLD" in clean_name:
                    inst_id = "XAU-USDT-SWAP"
                    display_pair = "XAU-USDT"
                else:
                    inst_id = f"{clean_name}-SWAP"
                    display_pair = clean_name

                raw_side = str(p.get("side", "buy")).lower()
                pos_side = "long" if raw_side in ("buy", "long") else "short"
                qty = float(p.get("qty") or p.get("openQty") or 0.0)
                avg_px = float(p.get("avgPrice") or p.get("openPrice") or p.get("price") or 0.0)
                cur_px = float(p.get("lastPrice") or p.get("currentPrice") or avg_px)
                upl = float(p.get("unrealizedPl") or p.get("pnl") or 0.0)
                
                margin = float(p.get("margin") or p.get("initialMargin") or (avg_px * qty if qty > 0 else 1.0))
                roi = round((upl / margin * 100.0), 2) if margin > 0 else 0.0

                mapped_list.append({
                    "ticket_id": pos_id,
                    "position_id": pos_id,
                    "instId": inst_id,
                    "coin": display_pair,
                    "posSide": pos_side,
                    "side": pos_side,
                    "pos": str(qty),
                    "lots": qty,
                    "avgPx": str(avg_px),
                    "lastPx": str(cur_px),
                    "upl": str(round(upl, 2)),
                    "uplRatio": f"{roi:+.2f}%",
                    "roi": roi,
                    "margin": str(round(margin, 2)),
                    "stopLoss": p.get("stopLoss"),
                    "takeProfit": p.get("takeProfit"),
                    "platform": "tradelocker",
                    "is_prop": True,
                    "is_limit": False,
                    "is_child": False
                })
        elif cached and cached.get("positions"):
            mapped_list.extend(cached.get("positions", []))

        # B. PARSE PENDING ORDERS (LỆNH LIMIT / STOP ĐANG CHỜ KHỚP TRÊN SÀN)
        if ok_ord and raw_orders:
            for o in raw_orders:
                if isinstance(o, list):
                    cols = client.get_orders_columns() if hasattr(client, "get_orders_columns") else [
                        "id", "tradableInstrumentId", "routeId", "qty", "side", "type",
                        "status", "filledQty", "avgPrice", "price", "stopPrice", "validity",
                        "expireDate", "createdDate", "lastModified", "isOpen", "positionId",
                        "stopLoss", "stopLossType", "takeProfit", "takeProfitType", "strategyId"
                    ]
                    o = {cols[i]: o[i] for i in range(min(len(cols), len(o)))}

                # Bỏ qua các lệnh đã kết thúc (filled, closed, cancelled, rejected, expired)
                status_raw = str(o.get("status") or "").lower()
                if status_raw in ("filled", "closed", "cancelled", "canceled", "rejected", "expired"):
                    continue

                order_id = str(o.get("id") or o.get("orderId") or "")
                tradable_id = o.get("tradableInstrumentId")
                raw_sym = id_to_name.get(tradable_id) or id_to_name.get(str(tradable_id)) or o.get("symbol") or "BTCUSD+"

                clean_name = raw_sym.upper().replace("+", "")
                if "BTC" in clean_name:
                    inst_id = "BTC-USDT-SWAP"
                    display_pair = "BTC-USDT"
                elif "ETH" in clean_name:
                    inst_id = "ETH-USDT-SWAP"
                    display_pair = "ETH-USDT"
                elif "XAU" in clean_name or "GOLD" in clean_name:
                    inst_id = "XAU-USDT-SWAP"
                    display_pair = "XAU-USDT"
                else:
                    inst_id = f"{clean_name}-SWAP"
                    display_pair = clean_name

                raw_side = str(o.get("side", "buy")).lower()
                pos_side = "long" if raw_side in ("buy", "long") else "short"
                qty = _safe_float(o.get("qty"))
                price = _safe_float(o.get("price"))
                ord_type = str(o.get("type") or "LIMIT").upper()
                margin = _safe_float(o.get("margin")) or (price * qty if qty > 0 else 1.0)

                mapped_list.append({
                    "ticket_id": f"ord_{order_id}",
                    "position_id": order_id,
                    "order_id": order_id,
                    "instId": inst_id,
                    "coin": display_pair,
                    "posSide": pos_side,
                    "side": pos_side,
                    "pos": str(qty),
                    "lots": qty,
                    "avgPx": str(price),
                    "lastPx": str(price),
                    "upl": "0.00",
                    "uplRatio": "0.00%",
                    "roi": 0.0,
                    "margin": str(round(margin, 2)),
                    "stopLoss": o.get("stopLoss"),
                    "takeProfit": o.get("takeProfit"),
                    "platform": "tradelocker",
                    "is_prop": True,
                    "is_limit": True,
                    "order_type": ord_type,
                    "status": "Pending Limit",
                    "is_child": False
                })
        elif not ok_ord and cached and cached.get("orders"):
            mapped_list.extend(cached.get("orders", []))

        # Lưu trữ cache hợp lệ
        _prop_positions_cache[cache_key] = {
            "data": mapped_list,
            "positions": [m for m in mapped_list if not m.get("is_limit")],
            "orders": [m for m in mapped_list if m.get("is_limit")],
            "time": now
        }
        return mapped_list

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[TradeLocker] Exception in tradelocker_get_positions: {e}")
        cached = _prop_positions_cache.get(cache_key)
        if cached and (now - cached.get("time", 0) < 90):
            return cached["data"]
        return []

@app.post("/api/tradelocker/positions/close")
def tradelocker_close_position(req: TradeLockerCloseReq):
    clean_uid = req.uid.strip() if req.uid else "default"

    # Kiểm tra nếu là tài khoản MT5
    raw_accounts, active_id = TradeLockerManager.load_raw_data(clean_uid, get_user_base_dir, fernet)
    target_acc_id = req.account_id or active_id
    target_cfg = next((a for a in raw_accounts if a.get("id") == target_acc_id or a.get("account_id") == target_acc_id), None)
    if target_cfg and target_cfg.get("platform") == "mt5":
        try:
            from mt5_service import MT5HubManager
            acc_num = int(target_cfg.get("account_id") or target_cfg.get("login") or 0)
            client = MT5HubManager.get_or_create_client(acc_num, target_cfg.get("password", ""), target_cfg.get("server", "E8Markets-Demo"))
            clean_ticket = req.position_id.replace("ord_", "")
            ticket_int = int(clean_ticket)
            ok, msg = client.close_position(ticket_int)
            if ok:
                return {"status": "success", "message": msg}
            raise HTTPException(status_code=400, detail=msg)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lỗi đóng lệnh MT5: {e}")

    client = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=req.account_id)
    if not client:
        raise HTTPException(status_code=400, detail="Chưa kết nối Quỹ TradeLocker")

    target_id = req.position_id
    if target_id.startswith("ord_"):
        target_id = target_id.replace("ord_", "")

    cache_key = f"{clean_uid}:{req.account_id or 'active'}"

    # 1. Nếu là lệnh Limit đang chờ (hoặc có tiền tố ord_) -> Thử hủy lệnh trước
    if req.is_limit or req.position_id.startswith("ord_"):
        ok_cancel, cancel_msg = client.cancel_order(target_id)
        if ok_cancel:
            if cache_key in _prop_positions_cache:
                _prop_positions_cache[cache_key]["data"] = [p for p in _prop_positions_cache[cache_key]["data"] if str(p.get("position_id")) != target_id and str(p.get("ticket_id")) != req.position_id]
            TradeLockerManager.log_event(clean_uid, f"🧹 [TRADELOCKER] Đã hủy lệnh Limit #{target_id} thành công")
            return {"status": "success", "message": cancel_msg}

    # 2. Đóng vị thế thật (Active Position)
    ok, msg = client.close_position(target_id, qty=req.qty)
    if ok:
        if cache_key in _prop_positions_cache:
            _prop_positions_cache[cache_key]["data"] = [p for p in _prop_positions_cache[cache_key]["data"] if str(p.get("position_id")) != target_id and str(p.get("ticket_id")) != req.position_id]
        TradeLockerManager.log_event(clean_uid, f"🧹 [TRADELOCKER] Đã đóng vị thế ticket #{target_id} thành công")
        return {"status": "success", "message": msg}

    # 3. Fallback: Nếu close position thất bại, thử gọi cancel_order lần cuối đề phòng là orderId
    ok_cancel, cancel_msg = client.cancel_order(target_id)
    if ok_cancel:
        if cache_key in _prop_positions_cache:
            _prop_positions_cache[cache_key]["data"] = [p for p in _prop_positions_cache[cache_key]["data"] if str(p.get("position_id")) != target_id and str(p.get("ticket_id")) != req.position_id]
        TradeLockerManager.log_event(clean_uid, f"🧹 [TRADELOCKER] Đã hủy lệnh #{target_id} thành công")
        return {"status": "success", "message": cancel_msg}

    raise HTTPException(status_code=400, detail=msg or cancel_msg)

@app.get("/api/tradelocker/bot/status")
def tradelocker_get_bot_status(uid: str = "default", strategy: str = "sub1"):
    clean_uid = uid.strip() if uid else "default"
    is_running = TradeLockerManager.is_strategy_bot_running(clean_uid, strategy=strategy, user_base_dir_fn=get_user_base_dir, fernet_instance=fernet)
    bot_map, running_bots = TradeLockerManager.get_prop_bindings(clean_uid, get_user_base_dir)
    return {
        "status": "RUNNING" if is_running else "STOPPED",
        "is_running": is_running,
        "strategy": strategy,
        "bot_prop_map": bot_map,
        "running_prop_bots": running_bots
    }

@app.post("/api/tradelocker/bot/start")
async def tradelocker_start_bot(uid: str, strategy: str = "sub1", account_id: Optional[str] = None):
    clean_uid = uid.strip() if uid else "default"
    
    # 1. Xác định tài khoản Quỹ đích cho strategy này
    bot_map, running_bots = TradeLockerManager.get_prop_bindings(clean_uid, get_user_base_dir)
    target_acc = account_id or bot_map.get(strategy)
    if not target_acc:
        _, active_id = TradeLockerManager.load_raw_data(clean_uid, get_user_base_dir, fernet)
        target_acc = active_id

    if not target_acc:
        raise HTTPException(status_code=400, detail="Chưa chọn tài khoản Quỹ cho Bot này. Vui lòng kết nối Quỹ trước khi chạy!")

    # 2. KHÓA ĐỘC QUYỀN: 1 Tài khoản Quỹ chỉ chạy 1 Bot duy nhất
    can_start, lock_err = TradeLockerManager.can_start_prop_bot(clean_uid, strategy, target_acc, get_user_base_dir, fernet)
    if not can_start:
        raise HTTPException(status_code=400, detail=lock_err)

    client = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=target_acc)
    if not client:
        raise HTTPException(status_code=400, detail=f"Không khởi tạo được client cho tài khoản Quỹ #{target_acc}. Vui lòng kiểm tra lại kết nối!")
    
    # Đảm bảo Shadow Bot hoặc Engine Bot đang chạy ngầm để tính toán nến/EMA và gửi tín hiệu cho TradeLocker
    pid = get_running_pid(clean_uid, strategy)
    proc = get_nested(bot_processes, clean_uid, strategy)
    process_alive = (pid > 0) or (proc and proc.poll() is None)
    if not process_alive:
        await start_shadow_bot(clean_uid, strategy=strategy)

    # 🧹 DỌN SẠCH LỆNH LIMIT CŨ TRƯỚC KHI KÍCH HOẠT (CHUẨN LOGIC OKX: BẢO LƯU 100% VỊ THẾ ĐANG CHẠY & TP/SL)
    canceled_start = 0
    try:
        ok_pos, positions, _ = client.get_positions()
        has_open_positions = bool(ok_pos and positions)

        if not has_open_positions:
            # Nếu KHÔNG CÓ vị thế mở: Dọn sạch 100% lệnh Limit cũ trong 1 thao tác duy nhất
            ok_all, _ = client.cancel_all_orders()
            if ok_all:
                canceled_start = 1
        else:
            # Nếu CÓ vị thế mở: Quét từng lệnh để bảo vệ 100% TP/SL của các vị thế đó
            ok_ord, orders, _ = client.get_orders()
            if ok_ord and orders:
                for o in orders:
                    o_dict = o if isinstance(o, dict) else {}
                    o_status = str(o_dict.get("status") or "").lower()
                    if o_status in ("cancelled", "canceled", "filled", "rejected", "expired"):
                        continue
                    if o_dict.get("positionId"):
                        continue
                    o_id = str(o_dict.get("id") or "")
                    if o_id:
                        ok_c, _ = client.cancel_order(o_id)
                        if ok_c:
                            canceled_start += 1
        cache_key = f"{clean_uid}:{target_acc or 'active'}"
        if cache_key in _prop_positions_cache:
            _prop_positions_cache[cache_key]["data"] = [p for p in _prop_positions_cache[cache_key].get("data", []) if not p.get("is_limit")]
            _prop_positions_cache[cache_key]["orders"] = []
        if canceled_start > 0:
            TradeLockerManager.log_event(clean_uid, f"🧹 [TRADELOCKER] Đã quét sạch lệnh Limit cũ trước khi khởi động bot (bảo lưu 100% vị thế mở)")
    except Exception as e:
        print(f"[TRADELOCKER START CLEANUP ERR]: {e}")

    TradeLockerManager.set_strategy_bot_running(clean_uid, strategy, True, account_id=target_acc, user_base_dir_fn=get_user_base_dir, fernet_instance=fernet)
    strat_labels = {"sub1": "EMA200 Bot", "sub2": "SMC Bot", "sub3": "Liquidation Bot"}
    strat_name = strat_labels.get(strategy, strategy)
    clean_info = " (Đã dọn dẹp lệnh Limit cũ)" if canceled_start > 0 else ""
    return {"status": "success", "message": f"⚡ {strat_name} cho Quỹ #{target_acc} đã được KÍCH HOẠT độc quyền!{clean_info}"}

@app.post("/api/tradelocker/bot/stop")
def tradelocker_stop_bot(uid: str, strategy: str = "sub1"):
    clean_uid = uid.strip() if uid else "default"
    TradeLockerManager.set_strategy_bot_running(clean_uid, strategy, False, user_base_dir_fn=get_user_base_dir, fernet_instance=fernet)

    # 🧹 DỌN SẠCH LỆNH LIMIT CHỜ KHI DỪNG BOT (CHUẨN LOGIC OKX, BẢO LƯU 100% VỊ THẾ MỞ & TP/SL)
    canceled_count = 0
    try:
        bot_map, _ = TradeLockerManager.get_prop_bindings(clean_uid, get_user_base_dir)
        target_acc = bot_map.get(strategy)
        if not target_acc:
            _, active_id = TradeLockerManager.load_raw_data(clean_uid, get_user_base_dir, fernet)
            target_acc = active_id
        client = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=target_acc)
        if client:
            ok_pos, positions, _ = client.get_positions()
            has_open_positions = bool(ok_pos and positions)

            if not has_open_positions:
                # Nếu KHÔNG CÓ vị thế mở: Dọn sạch 100% lệnh Limit chờ trên sàn
                ok_all, _ = client.cancel_all_orders()
                if ok_all:
                    canceled_count = 1
            else:
                # Nếu CÓ vị thế mở: Quét từng lệnh để bảo vệ 100% TP/SL của các vị thế đó
                ok_ord, orders, _ = client.get_orders()
                if ok_ord and orders:
                    for o in orders:
                        o_dict = o if isinstance(o, dict) else {}
                        o_status = str(o_dict.get("status") or "").lower()
                        if o_status in ("cancelled", "canceled", "filled", "rejected", "expired"):
                            continue
                        if o_dict.get("positionId"):
                            continue
                        o_id = str(o_dict.get("id") or "")
                        if o_id:
                            ok_c, _ = client.cancel_order(o_id)
                            if ok_c:
                                canceled_count += 1
            cache_key = f"{clean_uid}:{target_acc or 'active'}"
            if cache_key in _prop_positions_cache:
                _prop_positions_cache[cache_key]["data"] = [p for p in _prop_positions_cache[cache_key].get("data", []) if not p.get("is_limit")]
                _prop_positions_cache[cache_key]["orders"] = []
            if canceled_count > 0:
                TradeLockerManager.log_event(clean_uid, f"🧹 [TRADELOCKER] Đã quét và dọn sạch lệnh Limit chờ khi dừng bot (bảo lưu 100% vị thế mở)")
    except Exception as e:
        print(f"[TRADELOCKER STOP CLEANUP ERR]: {e}")

    strat_labels = {"sub1": "EMA200 Bot", "sub2": "SMC Bot", "sub3": "Liquidation Bot"}
    strat_name = strat_labels.get(strategy, strategy)
    clean_msg = " (Đã dọn dẹp lệnh Limit chờ trên sàn)" if canceled_count > 0 else ""
    return {"status": "success", "message": f"{strat_name} cho Quỹ đã dừng!{clean_msg}"}

@app.post("/api/tradelocker/orders/cancel_all")
def tradelocker_cancel_all_orders(uid: str = "default", account_id: Optional[str] = None):
    clean_uid = uid.strip() if uid else "default"
    client = TradeLockerManager.get_client(clean_uid, get_user_base_dir, fernet, account_id=account_id)
    if not client:
        raise HTTPException(status_code=400, detail="Chưa kết nối Quỹ TradeLocker")

    canceled_count = 0
    ok_pos, positions, _ = client.get_positions()
    has_open_positions = bool(ok_pos and positions)

    if not has_open_positions:
        ok_all, _ = client.cancel_all_orders()
        if ok_all:
            canceled_count = 1
    else:
        ok_ord, orders, _ = client.get_orders()
        if ok_ord and orders:
            for o in orders:
                o_dict = o if isinstance(o, dict) else {}
                o_status = str(o_dict.get("status") or "").lower()
                if o_status in ("cancelled", "canceled", "filled", "rejected", "expired"):
                    continue
                # BẢO VỆ TUYỆT ĐỐI TP/SL CỦA VỊ THẾ ĐANG CHẠY:
                if o_dict.get("positionId"):
                    continue
                o_id = str(o_dict.get("id") or "")
                if o_id:
                    ok_c, _ = client.cancel_order(o_id)
                    if ok_c:
                        canceled_count += 1

    cache_key = f"{clean_uid}:{account_id or 'active'}"
    if cache_key in _prop_positions_cache:
        _prop_positions_cache[cache_key]["data"] = [p for p in _prop_positions_cache[cache_key].get("data", []) if not p.get("is_limit")]
        _prop_positions_cache[cache_key]["orders"] = []

    TradeLockerManager.log_event(clean_uid, f"🧹 [TRADELOCKER] Đã quét và hủy sạch {canceled_count} lệnh Limit chờ trên sàn (bảo lưu 100% vị thế mở)")
    return {"status": "success", "canceled_count": canceled_count, "message": f"Đã hủy sạch {canceled_count} lệnh Limit chờ!"}

@app.get("/api/tradelocker/logs")
def tradelocker_get_logs(uid: str = "default"):
    clean_uid = uid.strip() if uid else "default"
    return TradeLockerManager.get_logs_payload(clean_uid, get_user_base_dir, fernet)

@app.websocket("/ws/tradelocker/logs/{uid}")
async def websocket_tradelocker_logs(websocket: WebSocket, uid: str):
    await websocket.accept()
    clean_uid = uid.strip() if (uid and uid not in ["default", "guest", "undefined", "null"]) else "default"
    
    if clean_uid not in TradeLockerManager._subscribers:
        TradeLockerManager._subscribers[clean_uid] = []
    TradeLockerManager._subscribers[clean_uid].append(websocket)
    
    try:
        # Gửi bảng Dashboard ban đầu của Quỹ FX
        dash_lines = TradeLockerManager.get_dashboard_lines(clean_uid, get_user_base_dir, fernet)
        for line in dash_lines:
            await websocket.send_text(line)
        
        # Gửi ring buffer các log sự kiện gần nhất
        recent = TradeLockerManager.get_recent_logs(clean_uid)
        for l in recent:
            await websocket.send_text(l)
            
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if clean_uid in TradeLockerManager._subscribers and websocket in TradeLockerManager._subscribers[clean_uid]:
            TradeLockerManager._subscribers[clean_uid].remove(websocket)

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

# 🌉 TỰ ĐỘNG KÍCH HOẠT CẦU NỐI CỔNG 5173 -> 8080 (PORT BRIDGE)
# Đảm bảo Cloudflare Tunnel / Client kết nối vào cổng 5173 (cổng Vite cũ) hay 8080 (cổng FastAPI mới)
# đều hoạt động 100%, triệt tiêu hoàn toàn lỗi 502 Bad Gateway do sai cổng.
async def _start_port_bridge():
    backend_port = int(os.environ.get("PORT", 8080))
    if backend_port == 5173:
        return
    async def _handle_bridge_conn(reader, writer):
        try:
            remote_reader, remote_writer = await asyncio.open_connection('127.0.0.1', backend_port)
            async def _pipe(src, dst):
                try:
                    while True:
                        data = await src.read(65536)
                        if not data: break
                        dst.write(data)
                        await dst.drain()
                except Exception: pass
                finally:
                    try: dst.close()
                    except Exception: pass
            await asyncio.gather(_pipe(reader, remote_writer), _pipe(remote_reader, writer))
        except Exception: pass
        finally:
            try: writer.close()
            except Exception: pass

    try:
        bridge_server = await asyncio.start_server(_handle_bridge_conn, '0.0.0.0', 5173)
        print(f"[PORT BRIDGE] ✅ Cổng 5173 đã kích hoạt làm cầu nối thông suốt sang {backend_port} (Hỗ trợ kép cả 2 cổng 5173 & 8080)!", flush=True)
    except OSError:
        pass
    except Exception as e:
        print(f"[PORT BRIDGE] Cổng 5173 không khả dụng: {e}", flush=True)

@app.on_event("startup")
async def startup_bridge_task():
    asyncio.create_task(_start_port_bridge())

if __name__ == "__main__":
    import uvicorn
    is_prod = os.environ.get("NODE_ENV") == "production"
    port = int(os.environ.get("PORT", 8080))
    if is_prod:
        uvicorn.run(app, host="0.0.0.0", port=port)
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

# z7737 | Tự động hóa Port Bridge 5173 -> 8080, sửa lỗi ModuleNotFoundError requests/tradelocker_service, và tối ưu hóa Uvicorn production chạy qua PM2

# z20260813 | Added auto-delete for trade history older than 30 days to free up memory

# z7719 | Sửa lỗi close-position khi đóng vị thế lẻ (do dùng int()) và bổ sung cảnh báo 400 khi khối lượng khả dụng bị khóa bởi TP/SL trên OKX.

# z7720 | Nâng cấp deque 400 dòng lưu trữ logs, sửa lỗi logs thiếu thông tin, và bổ sung WebSocket /ws/bot_data streaming trạng thái/vị thế/số dư thời gian thực.
# z7721 | Update default margin/volume settings to 1.0
# z7722 | Implemented bcrypt for password hashing and automatic migration from SHA256
# z7723 | Update OKX OAuth Fast API endpoint and hide closed_positions if API is deleted
# z7724 | Fix logic error where deleting API Key did not kill the bot process, and removed /account from OAuth URL.
# z7725 | Fix OKX OAuth Fast API token exchange endpoint from /oauth2/v1/token to /v5/users/oauth/token and use JSON payload
# z7726 | Add redirect_uri to OAuth token exchange payload (required by OAuth2 spec), improve get_public_ip with fallback and no-cache-empty, add detailed error logging with server IP
# z7727 | Fix check_uid_active_ref to accept "ON" status as well as "ACTIVE" for admin/users in Google Sheets CSV
# z7728 | Optimize Uvicorn reload parameter for production by checking NODE_ENV
# z7729 | Khắc phục triệt để lỗi rò rỉ và điều khiển chéo tài khoản giữa các user: cô lập 100% data, credentials, positions, logs và websocket theo OKX main_uid; loại bỏ hoàn toàn fallback default và hardcoded UID.
# z7730 | Tự động chuyển đổi session sang OKX Master UID khi người dùng Fast Connect / thêm API Key thành công, loại bỏ lỗi chặn nhầm session cũ không khớp UID.
# z7731 | Tích hợp toàn diện TradeLocker API cho quỹ E8 Markets: module tradelocker_service, các endpoint kết nối, quản lý số dư, tính toán Lot size và giám sát Drawdown/Profit Cap.
# z7732 | Tách riêng hoàn toàn trạng thái chạy và bảng vị thế giữa Sàn OKX và Quỹ FX (TradeLocker): bổ sung API bot status/start/stop cho TradeLocker, đảm bảo OKX và Quỹ FX có thể chạy đồng thời độc lập không xung đột.
# z7733 | Tách biệt hoàn toàn hệ thống Logs giữa Sàn OKX và Quỹ FX: chuyển hướng log TradeLocker trong log_reader_task không cho lẫn vào OKX, bổ sung REST API /api/tradelocker/logs và WebSocket /ws/tradelocker/logs.
# z7734 | Hỗ trợ lưu trữ và đồng bộ tham số fixed_lot cho cấu hình Quỹ TradeLocker qua endpoint REST API
# z7735 | Khắc phục triệt để lỗi TradeLocker không hiển thị vị thế trên web (chuẩn hóa ma trận list sang dict), lọc rác HTML 502/504 Cloudflare trong log OKX, và truyền BOT_USER_UID đồng bộ vào shadow bot
# z7736 | Triệt tiêu 100% rác HTML Cloudflare: mở rộng bộ lọc regex và token Cloudflare trong log_reader_task ngăn không cho bất kỳ fragment nào lọt vào OKX log stream
