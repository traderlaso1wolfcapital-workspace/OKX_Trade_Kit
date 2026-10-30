"""
Module: affiliate_service.py
Xác thực điều kiện Referral và Volume giao dịch OKX trực tiếp qua OKX Affiliate API v5.
Bảo toàn Zero-Downtime với cơ chế Fallback sang Google Sheets nếu Affiliate API gặp sự cố.
"""

import os
import time
import json
import base64
import hmac
import hashlib
import datetime
from typing import Optional, Dict, Any, Tuple
import requests

# Cấu hình OKX Affiliate API mặc định (API Key Quyền Đọc)
DEFAULT_AFFILIATE_API_KEY = os.environ.get("OKX_AFFILIATE_API_KEY", "f8356797-a6d7-470e-8002-f715f29a229e")
DEFAULT_AFFILIATE_SECRET_KEY = os.environ.get("OKX_AFFILIATE_SECRET_KEY", "DEC67AB700D4E779662894D8530C611F")
DEFAULT_AFFILIATE_PASSPHRASE = os.environ.get("OKX_AFFILIATE_PASSPHRASE", "Autotrader_check_volume2026")

OKX_API_BASE = "https://www.okx.com"
ADMIN_UID = "admtls12021"
MASTER_AFFILIATE_UID = "523019992975987626"

# File lưu lịch sử volume & snapshot
LOCAL_APP_DATA = os.environ.get("LOCALAPPDATA", os.path.join(os.path.expanduser("~"), "AppData", "Local"))
AFFILIATE_DATA_DIR = os.path.join(LOCAL_APP_DATA, "TLS1_Trading_Users")
SNAPSHOT_FILE = os.path.join(AFFILIATE_DATA_DIR, "affiliate_volume_snapshots.json")

# In-memory cache để chống rate limit (OKX Affiliate rate limit: 3 req/sec)
# TTL = 300 giây (5 phút) cho kết quả check UID
_uid_verification_cache: Dict[str, Dict[str, Any]] = {}
_cache_ttl_seconds = 300


def _load_env_affiliate():
    """Tải cấu hình từ .env.affiliate nếu có"""
    env_file = os.path.join(os.path.dirname(__file__), ".env.affiliate")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
        except Exception:
            pass

_load_env_affiliate()


def _get_affiliate_creds() -> Tuple[str, str, str]:
    api_key = os.environ.get("OKX_AFFILIATE_API_KEY", DEFAULT_AFFILIATE_API_KEY)
    secret_key = os.environ.get("OKX_AFFILIATE_SECRET_KEY", DEFAULT_AFFILIATE_SECRET_KEY)
    passphrase = os.environ.get("OKX_AFFILIATE_PASSPHRASE", DEFAULT_AFFILIATE_PASSPHRASE)
    return api_key, secret_key, passphrase


def _call_okx_affiliate(path: str, timeout: int = 8) -> Optional[dict]:
    """Thực hiện request ký danh tính tới OKX Affiliate API"""
    api_key, secret_key, passphrase = _get_affiliate_creds()
    if not (api_key and secret_key and passphrase):
        return None

    try:
        ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        msg = ts + "GET" + path
        sig = base64.b64encode(
            hmac.new(secret_key.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).digest()
        ).decode("utf-8")

        headers = {
            "OK-ACCESS-KEY": api_key,
            "OK-ACCESS-SIGN": sig,
            "OK-ACCESS-TIMESTAMP": ts,
            "OK-ACCESS-PASSPHRASE": passphrase,
            "Content-Type": "application/json",
            "User-Agent": "TLS1_Affiliate_Checker/1.0"
        }

        resp = requests.get(OKX_API_BASE + path, headers=headers, timeout=timeout)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        print(f"[AFFILIATE_API_ERROR] {path} -> {e}", flush=True)
        return None


def _load_snapshots() -> dict:
    try:
        if os.path.exists(SNAPSHOT_FILE):
            with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_snapshot(uid: str, total_vol: float):
    try:
        os.makedirs(AFFILIATE_DATA_DIR, exist_ok=True)
        snapshots = _load_snapshots()
        now_ts = int(time.time())
        if uid not in snapshots:
            snapshots[uid] = []
        
        # Thêm điểm đo mới
        snapshots[uid].append({"ts": now_ts, "vol": total_vol})
        
        # Chỉ giữ lịch sử trong vòng 35 ngày gần nhất
        cutoff = now_ts - (35 * 86400)
        snapshots[uid] = [s for s in snapshots[uid] if s.get("ts", 0) >= cutoff]
        
        with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
            json.dump(snapshots, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[SNAPSHOT_SAVE_ERROR] {e}", flush=True)


def _calc_14d_volume_from_snapshots(uid: str, current_total_vol: float, join_time_ms: int) -> float:
    """Tính volume 14 ngày chính xác từ snapshot lịch sử"""
    now_ts = int(time.time())
    fourteen_days_ago_ts = now_ts - (14 * 86400)

    # Nếu người dùng mới đăng ký trong 14 ngày qua, toàn bộ volume là trong 14 ngày
    if join_time_ms > 0:
        join_ts = join_time_ms // 1000
        if join_ts >= fourteen_days_ago_ts:
            return current_total_vol

    snapshots = _load_snapshots().get(uid, [])
    if not snapshots:
        return current_total_vol

    # Tìm snapshot gần mốc 14 ngày trước nhất
    older_points = [s for s in snapshots if s.get("ts", 0) <= fourteen_days_ago_ts]
    if older_points:
        # Lấy điểm đo gần mốc 14 ngày nhất
        base_point = max(older_points, key=lambda s: s.get("ts", 0))
        vol_14d = max(0.0, current_total_vol - base_point.get("vol", 0.0))
        return vol_14d

    # Nếu chưa có snapshot đủ 14 ngày nhưng có snapshot cũ nhất
    oldest_point = min(snapshots, key=lambda s: s.get("ts", 0))
    ts_span_days = max(1.0, (now_ts - oldest_point.get("ts", 0)) / 86400.0)
    delta_vol = max(0.0, current_total_vol - oldest_point.get("vol", 0.0))
    if ts_span_days <= 14.0:
        return current_total_vol
    # Nội suy theo tỷ lệ
    return (delta_vol / ts_span_days) * 14.0


def check_uid_affiliate_and_volume(
    uid_str: str,
    min_volume: float = 20000.0,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Kiểm tra điều kiện:
    1. UID có đăng ký dưới Link Ref AutoTrader.fun hay không?
    2. Volume 14 ngày gần nhất có đạt min_volume (mặc định 20,000 USDT) hay không?
    
    Trả về dict chi tiết:
    - allowed: True/False
    - status: "ACTIVE", "INSUFFICIENT_VOLUME", "NOT_INVITEE", "ADMIN", "FALLBACK_SHEET"
    - is_invitee: True/False
    - volume_14d: float
    - total_volume: float
    - missing_volume: float
    - message: Thông báo tiếng Việt rõ ràng cho người dùng
    """
    clean_uid = str(uid_str).strip().lower() if uid_str else ""
    if not clean_uid:
        return {
            "allowed": False,
            "status": "INVALID_UID",
            "is_invitee": False,
            "volume_14d": 0.0,
            "total_volume": 0.0,
            "missing_volume": min_volume,
            "message": "UID tài khoản không hợp lệ!",
        }

    # 1. Bypass cho Admin và CEO Master UID
    if clean_uid in [ADMIN_UID, MASTER_AFFILIATE_UID]:
        return {
            "allowed": True,
            "status": "ADMIN",
            "is_invitee": True,
            "volume_14d": 999999999.0,
            "total_volume": 999999999.0,
            "missing_volume": 0.0,
            "message": "ACTIVE",
            "channel_name": "TLS1_MASTER",
        }

    # 2. Kiểm tra Cache bộ nhớ
    now = time.time()
    if not force_refresh and clean_uid in _uid_verification_cache:
        cached = _uid_verification_cache[clean_uid]
        if now - cached.get("time", 0) < _cache_ttl_seconds:
            return cached["result"]

    # 3. Gọi OKX Affiliate API v5
    # Lấy thông tin chi tiết invitee với periodType=last_30d
    res_30d = _call_okx_affiliate(f"/api/v5/affiliate/invitee/detail?uid={clean_uid}&periodType=last_30d")
    
    if res_30d is not None:
        code = str(res_30d.get("code", ""))
        msg = str(res_30d.get("msg", ""))
        data = res_30d.get("data", [])

        # Mã 51621: Người dùng không phải là invitee dưới link ref
        if code == "51621" or "isn't your invitee" in msg.lower() or "isnt your invitee" in msg.lower():
            result = {
                "allowed": False,
                "status": "NOT_INVITEE",
                "is_invitee": False,
                "volume_14d": 0.0,
                "total_volume": 0.0,
                "missing_volume": min_volume,
                "message": f"UID tài khoản này của quý khách chưa đăng ký dưới Link Ref của AutoTrader.fun!",
            }
            _uid_verification_cache[clean_uid] = {"time": now, "result": result}
            return result

        # Thành công truy xuất thông tin invitee
        if code == "0" and data:
            item = data[0]
            total_vol = float(item.get("totalVol") or 0.0)
            vol_30d = float(item.get("volPeriod") or 0.0)
            vol_month = float(item.get("volMonth") or 0.0)
            join_time_ms = int(item.get("joinTime") or 0)
            channel_name = item.get("affiliateCode") or item.get("channelName") or "AutoTrader"

            # Lưu snapshot để theo dõi chu kỳ 14 ngày
            _save_snapshot(clean_uid, total_vol)

            # Tính volume 14 ngày
            # Bước A: Nếu tổng volume hoặc 30 ngày chưa tới 20k -> chắc chắn chưa đủ 20k trong 14 ngày
            if total_vol < min_volume and vol_30d < min_volume:
                volume_14d = max(total_vol, vol_30d)
            else:
                # Bước B: Lấy chi tiết last_7d
                res_7d = _call_okx_affiliate(f"/api/v5/affiliate/invitee/detail?uid={clean_uid}&periodType=last_7d")
                vol_7d = 0.0
                if res_7d and res_7d.get("code") == "0" and res_7d.get("data"):
                    vol_7d = float(res_7d["data"][0].get("volPeriod") or 0.0)

                # Nếu trong 7 ngày gần nhất đã đạt >= 20k -> chắc chắn trong 14 ngày đạt >= 20k
                if vol_7d >= min_volume:
                    volume_14d = vol_7d
                else:
                    # Kiểm tra snapshot lịch sử 14 ngày
                    volume_14d = _calc_14d_volume_from_snapshots(clean_uid, total_vol, join_time_ms)
                    # Nếu chưa có snapshot đủ lâu, dùng min(vol_30d, max(vol_7d * 2.0, total_vol))
                    if volume_14d < vol_7d:
                        volume_14d = vol_7d
                    # Đảm bảo không vượt quá vol_30d
                    if vol_30d > 0 and volume_14d > vol_30d:
                        volume_14d = vol_30d

            missing_volume = max(0.0, min_volume - volume_14d)
            is_allowed = volume_14d >= min_volume

            if is_allowed:
                message = "ACTIVE"
                status = "ACTIVE"
            else:
                status = "INSUFFICIENT_VOLUME"
                message = (
                    f"Tài khoản UID {clean_uid} chưa đạt điều kiện Volume 14 ngày "
                    f"(Hiện tại: {volume_14d:,.1f} USDT / Yêu cầu: {min_volume:,.0f} USDT). "
                    f"Vui lòng giao dịch thêm {missing_volume:,.1f} USDT để kích hoạt bot!"
                )

            result = {
                "allowed": is_allowed,
                "status": status,
                "is_invitee": True,
                "volume_14d": round(volume_14d, 2),
                "total_volume": round(total_vol, 2),
                "vol_30d": round(vol_30d, 2),
                "vol_7d": round(vol_7d if 'vol_7d' in locals() else 0.0, 2),
                "required_volume": min_volume,
                "missing_volume": round(missing_volume, 2),
                "message": message,
                "channel_name": channel_name,
                "join_time": datetime.datetime.fromtimestamp(join_time_ms / 1000, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S") if join_time_ms > 0 else "N/A"
            }
            _uid_verification_cache[clean_uid] = {"time": now, "result": result}
            return result

    # 4. Fallback Zero-Downtime: Nếu OKX Affiliate API không phản hồi hoặc lỗi mạng,
    # chuyển tiếp sang phương án Google Sheets để không làm gián đoạn hệ thống hiện tại
    print(f"[AFFILIATE_CHECK] API OKX tạm thời không phản hồi cho UID {clean_uid}, chuyển sang fallback Google Sheet...", flush=True)
    return {
        "allowed": False,
        "status": "FALLBACK_SHEET",
        "is_invitee": None,
        "volume_14d": 0.0,
        "total_volume": 0.0,
        "missing_volume": min_volume,
        "message": "FALLBACK_TO_SHEET"
    }

