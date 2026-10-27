import os
import json
import time
import socket
import threading
from datetime import datetime, timezone
import requests
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal
from collections import deque

# 🛡️ BYPASS ISP SINKHOLE: Tránh router/nhà mạng phân giải demo.tradelocker.com về 127.0.0.1
_orig_getaddrinfo = socket.getaddrinfo
def _tradelocker_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if host and "tradelocker.com" in str(host):
        try:
            res = _orig_getaddrinfo(host, port, family, type, proto, flags)
            if all(r[4][0] in ("127.0.0.1", "::1", "localhost") for r in res):
                return _orig_getaddrinfo("104.18.28.67", port, family, type, proto, flags)
            return res
        except Exception:
            return _orig_getaddrinfo("104.18.28.67", port, family, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _tradelocker_getaddrinfo

# Môi trường mặc định của TradeLocker
DEFAULT_DEMO_ENV = "https://demo.tradelocker.com/backend-api"
DEFAULT_LIVE_ENV = "https://live.tradelocker.com/backend-api"

class TradeLockerClient:
    def __init__(self, email: str, password: str, server: str = "E8", environment: str = "https://demo.tradelocker.com"):
        self.email = email.strip()
        self.password = password.strip()
        self.server = server.strip()
        # Chuẩn hóa base_url
        env_clean = environment.strip().rstrip("/")
        if not env_clean.endswith("/backend-api"):
            self.base_url = f"{env_clean}/backend-api"
        else:
            self.base_url = env_clean

        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expiry: float = 0
        self.account_id: Optional[str] = None
        self.acc_num: Optional[str] = None
        self.account_balance: float = 0.0
        self.instruments_cache: Dict[str, Dict[str, Any]] = {}
        self.instruments_cache_time: float = 0
        self._positions_columns: List[str] = []

    @staticmethod
    def _clean_error_text(resp) -> str:
        """Lọc sạch chuỗi lỗi từ TradeLocker/Cloudflare, loại bỏ tuyệt đối các thẻ HTML hoặc trang lỗi nhiều dòng"""
        if resp is None:
            return "Không có phản hồi từ máy chủ"
        status_code = getattr(resp, "status_code", 0)

        # 1. Thử parse JSON trước để lấy message chuẩn
        try:
            err_json = resp.json()
            if isinstance(err_json, dict):
                msg = (
                    err_json.get("errMsg") or 
                    err_json.get("message") or 
                    err_json.get("error") or 
                    err_json.get("description") or
                    err_json.get("code")
                )
                if msg:
                    return str(msg).strip()
        except Exception:
            pass

        # 2. Lấy raw text và kiểm tra xem có phải HTML / Cloudflare không
        raw_text = getattr(resp, "text", "") or ""
        lower = raw_text.lower()

        is_html = any(tag in lower for tag in [
            "<!doctype html", "<html", "<head", "<body", "cloudflare", "ray id:",
            "cf-error", "502 bad gateway", "504 gateway", "500 internal server error",
            "<script", "<style", "<title", "error code 52"
        ])

        if is_html or raw_text.strip().startswith("<"):
            import re
            title_match = re.search(r"<title>(.*?)</title>", raw_text, re.IGNORECASE)
            title_text = title_match.group(1).strip() if title_match else ""
            if title_text:
                return f"Lỗi Cloudflare ({status_code}): {title_text}"
            return f"Máy chủ TradeLocker phản hồi HTTP {status_code} qua Cloudflare (Bad Gateway / Timeout)"

        # 3. Đảm bảo text không có dòng trống / nhiều dòng
        clean = " ".join(raw_text.split())
        return clean[:150] if clean else f"HTTP {status_code}"

    def authenticate(self) -> Tuple[bool, str]:
        """Đăng nhập lấy JWT access token"""
        auth_url = f"{self.base_url}/auth/jwt/token"
        clean_server = (self.server or "E8").replace("-Live", "").strip()
        payload = {
            "email": self.email,
            "password": self.password,
            "server": clean_server
        }
        try:
            resp = requests.post(auth_url, json=payload, timeout=12)
            if resp.status_code in (200, 201):
                data = resp.json()
                self.access_token = data.get("accessToken")
                self.refresh_token = data.get("refreshToken")
                self.token_expiry = time.time() + 3000  # Token hiệu lực ~ 1 giờ
                return True, "Đăng nhập TradeLocker thành công!"
            else:
                err_msg = self._clean_error_text(resp)
                return False, f"Lỗi đăng nhập TradeLocker ({resp.status_code}): {err_msg}"
        except Exception as e:
            return False, f"Lỗi kết nối máy chủ TradeLocker: {str(e)}"

    def _ensure_authenticated(self) -> bool:
        if not self.access_token or time.time() >= self.token_expiry:
            ok, _ = self.authenticate()
            return ok
        return True

    def _get_headers(self, include_acc_num: bool = True) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        if include_acc_num and self.acc_num:
            headers["accNum"] = str(self.acc_num)
        return headers

    def get_accounts(self) -> Tuple[bool, List[Dict[str, Any]], str]:
        """Lấy danh sách tất cả các tài khoản của user và thiết lập account mặc định"""
        if not self._ensure_authenticated():
            return False, [], "Chưa xác thực TradeLocker"

        url = f"{self.base_url}/auth/jwt/all-accounts"
        try:
            resp = requests.get(url, headers=self._get_headers(include_acc_num=False), timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                accounts = data.get("accounts", [])
                if accounts:
                    # Tự động gán tài khoản đầu tiên
                    first_acc = accounts[0]
                    self.account_id = str(first_acc.get("id"))
                    self.acc_num = str(first_acc.get("accNum", "1"))
                    try:
                        self.account_balance = float(first_acc.get("accountBalance", 0))
                    except:
                        pass
                return True, accounts, "OK"
            return False, [], f"Lỗi lấy tài khoản ({resp.status_code}): {self._clean_error_text(resp)}"
        except Exception as e:
            return False, [], f"Lỗi kết nối: {str(e)}"

    def get_account_state(self) -> Tuple[bool, Dict[str, Any], str]:
        """Lấy trạng thái chi tiết của tài khoản (Balance, Equity, PnL)"""
        if not self._ensure_authenticated():
            return False, {}, "Chưa xác thực"
        if not self.account_id or not self.acc_num:
            ok, accounts, msg = self.get_accounts()
            if not ok or not self.account_id:
                return False, {}, msg or "Không tìm thấy tài khoản"

        url = f"{self.base_url}/trade/accounts/{self.account_id}/state"
        try:
            resp = requests.get(url, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code == 200:
                res_json = resp.json()
                details = res_json.get("d", {}).get("accountDetailsData", [])
                # Theo cấu trúc TradeLocker:
                # [0]: Balance, [1]: Equity, [4]: Free Margin, [11]: Margin Level%
                balance = float(details[0]) if len(details) > 0 else self.account_balance
                equity = float(details[1]) if len(details) > 1 else balance
                free_margin = float(details[4]) if len(details) > 4 else balance
                pnl = equity - balance

                self.account_balance = balance
                return True, {
                    "account_id": self.account_id,
                    "acc_num": self.acc_num,
                    "balance": balance,
                    "equity": equity,
                    "free_margin": free_margin,
                    "pnl": pnl
                }, "OK"
            return False, {}, f"Lỗi lấy trạng thái tài khoản ({resp.status_code}): {self._clean_error_text(resp)}"
        except Exception as e:
            return False, {}, str(e)

    def load_instruments(self) -> Tuple[bool, Dict[str, Dict[str, Any]], str]:
        """Tải và lập chỉ mục danh sách các mã giao dịch (Instruments)"""
        if not self._ensure_authenticated():
            return False, {}, "Chưa xác thực"
        if not self.account_id or not self.acc_num:
            self.get_accounts()

        # Cache trong 1 giờ
        now = time.time()
        if self.instruments_cache and (now - self.instruments_cache_time < 3600):
            return True, self.instruments_cache, "OK"

        url = f"{self.base_url}/trade/accounts/{self.account_id}/instruments"
        try:
            resp = requests.get(url, headers=self._get_headers(include_acc_num=True), timeout=15)
            if resp.status_code == 200:
                data = resp.json().get("d", {}).get("instruments", [])
                cache = {}
                for inst in data:
                    name = inst.get("name", "")
                    routes = inst.get("routes", [])
                    trade_route_id = None
                    for r in routes:
                        if r.get("type") == "TRADE":
                            trade_route_id = r.get("id")
                            break

                    cache[name.upper()] = {
                        "id": inst.get("id"),
                        "tradableInstrumentId": inst.get("tradableInstrumentId"),
                        "tradeRouteId": trade_route_id,
                        "name": name,
                        "description": inst.get("description", ""),
                        "type": inst.get("type", "")
                    }
                self.instruments_cache = cache
                self.instruments_cache_time = now
                return True, cache, "OK"
            return False, {}, f"Lỗi tải instruments ({resp.status_code})"
        except Exception as e:
            return False, {}, str(e)

    def resolve_instrument(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Khớp mã giao dịch từ hệ thống (VD: BTCUSDT, XAU, BTC) sang TradeLocker (BTCUSD+, XAUUSD+)
        """
        if not self.instruments_cache:
            self.load_instruments()

        clean = symbol.upper().replace("-", "").replace("_", "").replace("SWAP", "").replace("PERP", "")
        clean_base = clean.replace("USDT", "").replace("USD", "")

        # Ưu tiên tìm khớp chính xác
        candidates = [
            f"{clean_base}USD+",
            f"{clean_base}USDT+",
            f"{clean_base}USD",
            clean,
            f"{clean}+"
        ]

        # Trường hợp đặc biệt: XAU -> Vàng
        if clean_base in ("XAU", "GOLD"):
            candidates.insert(0, "XAUUSD+")
            candidates.insert(1, "GOLD+")

        for cand in candidates:
            if cand in self.instruments_cache:
                return self.instruments_cache[cand]

        # Tìm gần đúng
        for name, info in self.instruments_cache.items():
            if clean_base in name and ("USD" in name or "+" in name):
                return info

        return None

    def calculate_lot(self, symbol: str, risk_usd: float, entry_price: float, sl_price: float) -> float:
        """
        Tính số Lot an toàn dựa trên số tiền rủi ro (Risk USD) và khoảng cách Stop Loss
        """
        if entry_price <= 0 or sl_price <= 0 or risk_usd <= 0:
            return 0.01

        sl_distance = abs(entry_price - sl_price)
        if sl_distance <= 0:
            return 0.01

        clean_sym = symbol.upper()
        # Vàng (XAUUSD+): 1 Lot = 100 oz. Khoảng cách giá 1$ trên 1 Lot = 100$
        if "XAU" in clean_sym or "GOLD" in clean_sym:
            # Risk = Lot * SL_Distance * 100  -> Lot = Risk / (SL_Distance * 100)
            lot = risk_usd / (sl_distance * 100.0)
        # Crypto (BTCUSD+, ETHUSD+): 1 Lot = 1 Coin. Khoảng cách giá = SL_Distance
        elif "BTC" in clean_sym or "ETH" in clean_sym or "SOL" in clean_sym:
            lot = risk_usd / sl_distance
        # Forex (EURUSD+, GBPUSD+): 1 Lot = 100,000 units. 1 pip (0.0001) = 10$
        else:
            pips = sl_distance / 0.0001
            lot = risk_usd / (pips * 10.0) if pips > 0 else 0.01

        # Làm tròn theo bước 0.01 Lot, tối thiểu 0.01 Lot
        lot = round(max(0.01, lot), 2)
        return lot

    def place_order(
        self,
        symbol: str,
        side: str,
        qty: float,
        order_type: str = "market",
        price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> Tuple[bool, Dict[str, Any], str]:
        """
        Đặt lệnh lên TradeLocker qua OpenAPI Post_Order
        """
        if not self._ensure_authenticated():
            return False, {}, "Chưa xác thực TradeLocker"

        inst_info = self.resolve_instrument(symbol)
        if not inst_info:
            return False, {}, f"Không tìm thấy mã giao dịch phù hợp cho '{symbol}' trên TradeLocker E8"

        tradable_id = inst_info.get("tradableInstrumentId")
        route_id = inst_info.get("tradeRouteId")
        if not tradable_id or not route_id:
            return False, {}, f"Không lấy được routeId hoặc tradableInstrumentId cho {symbol}"

        side_clean = side.lower().strip()
        if side_clean not in ("buy", "sell"):
            side_clean = "buy" if "long" in side_clean else "sell"

        type_clean = order_type.lower().strip()
        validity = "IOC" if type_clean == "market" else "GTC"

        payload: Dict[str, Any] = {
            "tradableInstrumentId": tradable_id,
            "routeId": route_id,
            "qty": float(qty),
            "side": side_clean,
            "type": type_clean,
            "validity": validity,
            "strategyId": "AutoTrader_TLS1"
        }

        if type_clean == "limit":
            if not price or price <= 0:
                return False, {}, "Lệnh Limit bắt buộc phải có giá (price)"
            payload["price"] = float(price)

        if stop_loss and stop_loss > 0:
            payload["stopLoss"] = float(stop_loss)
            payload["stopLossType"] = "absolute"

        if take_profit and take_profit > 0:
            payload["takeProfit"] = float(take_profit)
            payload["takeProfitType"] = "absolute"

        url = f"{self.base_url}/trade/accounts/{self.account_id}/orders"
        try:
            resp = requests.post(url, json=payload, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code in (200, 201):
                try:
                    res_data = resp.json()
                except Exception:
                    res_data = {}

                # 1. Kiểm tra trạng thái "s" và dữ liệu trả về từ TradeLocker
                status_flag = str(res_data.get("s", "")).lower().strip()
                d_obj = res_data.get("d") if isinstance(res_data.get("d"), dict) else {}
                
                # 2. Tìm mã orderId trong mọi cấu trúc trả về khả dĩ
                order_id = (
                    d_obj.get("orderId") or 
                    d_obj.get("id") or 
                    res_data.get("orderId") or 
                    res_data.get("id")
                )

                # 3. Lấy thông báo lỗi chi tiết nếu bị từ chối
                err_detail = (
                    res_data.get("errMsg") or 
                    res_data.get("message") or 
                    d_obj.get("errMsg") or 
                    d_obj.get("message") or 
                    d_obj.get("rejectReason") or
                    d_obj.get("description")
                )

                # Nếu TradeLocker báo lỗi (s == error) hoặc không sinh được order_id -> Xử lý THẤT BẠI
                if status_flag in ("error", "fail") or not order_id:
                    err_msg = err_detail or res_data.get("code") or self._clean_error_text(resp) or "Không nhận được mã lệnh từ sàn"
                    return False, {"data": res_data}, f"TradeLocker từ chối ({err_msg})"

                order_id_str = str(order_id)
                return True, {"orderId": order_id_str, "data": res_data}, f"Đã đặt lệnh TradeLocker thành công! Mã lệnh: {order_id_str}"
            else:
                err_text = self._clean_error_text(resp)
                return False, {}, f"TradeLocker từ chối ({resp.status_code}): {err_text}"
        except Exception as e:
            return False, {}, f"Lỗi gửi lệnh TradeLocker: {str(e)}"

    def get_positions_columns(self) -> List[str]:
        """Lấy danh sách các cột của bảng Positions từ TradeLocker /trade/config hoặc dùng fallback chuẩn"""
        if self._positions_columns:
            return self._positions_columns

        # Schema cột chuẩn của TradeLocker OpenAPI
        fallback_cols = [
            "id", "tradableInstrumentId", "routeId", "side", "qty", "price",
            "stopLoss", "takeProfit", "moment", "pnl", "trailingOffset"
        ]

        if not self._ensure_authenticated():
            return fallback_cols

        try:
            url = f"{self.base_url}/trade/config"
            resp = requests.get(url, headers=self._get_headers(include_acc_num=True), timeout=8)
            if resp.status_code == 200:
                cfg_data = resp.json().get("d", {})
                pos_cfg = cfg_data.get("positionsConfig", {})
                cols_meta = pos_cfg.get("columns", [])
                extracted = []
                for c in cols_meta:
                    if isinstance(c, dict) and "id" in c:
                        extracted.append(c["id"])
                    elif isinstance(c, str):
                        extracted.append(c)
                if extracted:
                    self._positions_columns = extracted
                    return self._positions_columns
        except Exception:
            pass

        self._positions_columns = fallback_cols
        return self._positions_columns

    def get_positions(self) -> Tuple[bool, List[Any], str]:
        """Lấy danh sách các vị thế đang mở (chuẩn hóa ma trận mảng thành danh sách Dict)"""
        if not self._ensure_authenticated():
            return False, [], "Chưa xác thực"
        if not self.account_id or not self.acc_num:
            ok, accounts, msg = self.get_accounts()
            if not ok or not self.account_id:
                return False, [], msg or "Không tìm thấy tài khoản"

        url = f"{self.base_url}/trade/accounts/{self.account_id}/positions"
        try:
            resp = requests.get(url, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code == 200:
                res_json = resp.json()
                data_obj = res_json.get("d", {})
                raw_positions = data_obj.get("positions", [])
                cols = data_obj.get("columns", [])
                if not cols:
                    cols = self.get_positions_columns()
                
                if raw_positions and isinstance(raw_positions[0], list):
                    dict_positions = []
                    for row in raw_positions:
                        row_dict = {}
                        for idx, col in enumerate(cols):
                            if idx < len(row):
                                row_dict[col] = row[idx]
                        dict_positions.append(row_dict)
                    return True, dict_positions, "OK"
                
                return True, raw_positions, "OK"
            return False, [], f"Lỗi lấy vị thế ({resp.status_code}): {self._clean_error_text(resp)}"
        except Exception as e:
            return False, [], str(e)

    def modify_position(self, position_id: str, stop_loss: Optional[float] = None, take_profit: Optional[float] = None) -> Tuple[bool, str]:
        """Sửa TP/SL cho vị thế đang mở trên TradeLocker"""
        if not self._ensure_authenticated():
            return False, "Chưa xác thực TradeLocker"
        url = f"{self.base_url}/trade/positions/{position_id}"
        payload: Dict[str, Any] = {}
        if stop_loss is not None:
            payload["stopLoss"] = float(stop_loss) if stop_loss > 0 else None
        if take_profit is not None:
            payload["takeProfit"] = float(take_profit) if take_profit > 0 else None
        try:
            resp = requests.patch(url, json=payload, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code in (200, 204):
                return True, f"Đã cập nhật TP/SL cho vị thế #{position_id} thành công"
            err_msg = self._clean_error_text(resp)
            return False, f"Lỗi sửa vị thế ({resp.status_code}): {err_msg}"
        except Exception as e:
            return False, f"Lỗi mạng sửa vị thế: {str(e)}"

    def close_position(self, position_id: str, qty: Optional[float] = None) -> Tuple[bool, str]:
        """Đóng vị thế theo positionId"""
        if not self._ensure_authenticated():
            return False, "Chưa xác thực TradeLocker"
        url = f"{self.base_url}/trade/positions/{position_id}"
        try:
            params = {}
            if qty and qty > 0:
                params["qty"] = str(qty)
            resp = requests.delete(url, params=params, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code in (200, 204):
                return True, f"Đã đóng vị thế {position_id} thành công"
            err_msg = self._clean_error_text(resp)
            return False, f"Lỗi đóng vị thế ({resp.status_code}): {err_msg}"
        except Exception as e:
            return False, f"Lỗi mạng: {str(e)}"

    def get_orders(self) -> Tuple[bool, List[Any], str]:
        """Lấy danh sách các lệnh chờ (Pending/Limit) - tự động chuẩn hóa ma trận mảng thành List[Dict]"""
        if not self._ensure_authenticated():
            return False, [], "Chưa xác thực TradeLocker"
        url = f"{self.base_url}/trade/accounts/{self.account_id}/orders"
        try:
            resp = requests.get(url, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code == 200:
                d_obj = resp.json().get("d", {})
                orders = d_obj.get("orders", [])
                cols = d_obj.get("columns", [])
                if not cols:
                    cols = [
                        "id", "tradableInstrumentId", "routeId", "side", "qty", "price",
                        "stopLoss", "takeProfit", "status", "type", "created", "modified"
                    ]
                if orders and isinstance(orders[0], list):
                    dict_orders = []
                    for row in orders:
                        row_dict = {}
                        for idx, col in enumerate(cols):
                            if idx < len(row):
                                row_dict[col] = row[idx]
                        dict_orders.append(row_dict)
                    return True, dict_orders, "OK"
                return True, orders, "OK"
            return False, [], f"Lỗi lấy danh sách lệnh ({resp.status_code}): {self._clean_error_text(resp)}"
        except Exception as e:
            return False, [], str(e)

    def cancel_order(self, order_id: str) -> Tuple[bool, str]:
        """Hủy 1 lệnh chờ theo orderId"""
        if not self._ensure_authenticated():
            return False, "Chưa xác thực TradeLocker"
        url = f"{self.base_url}/trade/orders/{order_id}"
        try:
            resp = requests.delete(url, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code in (200, 204):
                return True, f"Đã hủy lệnh {order_id} thành công"
            err_msg = self._clean_error_text(resp)
            return False, f"Lỗi hủy lệnh ({resp.status_code}): {err_msg}"
        except Exception as e:
            return False, f"Lỗi mạng: {str(e)}"

    def cancel_all_orders(self, tradable_instrument_id: Optional[str] = None) -> Tuple[bool, str]:
        """Hủy toàn bộ lệnh chờ (hoặc theo mã instrument)"""
        if not self._ensure_authenticated():
            return False, "Chưa xác thực TradeLocker"
        url = f"{self.base_url}/trade/accounts/{self.account_id}/orders"
        try:
            params = {}
            if tradable_instrument_id:
                params["tradableInstrumentId"] = str(tradable_instrument_id)
            resp = requests.delete(url, params=params, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code in (200, 204):
                return True, "Đã hủy tất cả lệnh chờ thành công"
            err_msg = self._clean_error_text(resp)
            return False, f"Lỗi hủy lệnh ({resp.status_code}): {err_msg}"
        except Exception as e:
            return False, f"Lỗi mạng: {str(e)}"


# ==============================================================================
# Trình Quản Lý Đa Người Dùng (Multi-Tenant Manager)
# ==============================================================================

class TradeLockerManager:
    _clients: Dict[str, TradeLockerClient] = {}
    _log_queues: Dict[str, Any] = {}
    _subscribers: Dict[str, List[Any]] = {}
    _symbol_cooldowns: Dict[str, float] = {}
    _dispatch_lock: threading.Lock = threading.Lock()

    @classmethod
    def _get_default_user_base_dir(cls, uid: str) -> str:
        safe_uid = "".join(c for c in uid if c.isalnum() or c in ('_', '-'))
        if not safe_uid: safe_uid = "default"
        local_app = os.environ.get("LOCALAPPDATA", "")
        if local_app:
            if os.path.basename(local_app) == safe_uid:
                return local_app
            if os.path.basename(local_app) == "TLS1_Trading_Users":
                return os.path.join(local_app, safe_uid)
        base = os.environ.get("LOCALAPPDATA", os.path.join(os.path.expanduser("~"), "AppData", "Local"))
        return os.path.join(base, "TLS1_Trading_Users", safe_uid)

    @classmethod
    def _get_default_fernet(cls):
        try:
            from cryptography.fernet import Fernet
            local_app = os.environ.get("LOCALAPPDATA", "")
            candidates = [
                os.path.join(local_app, ".master_key"),
                os.path.join(os.path.dirname(local_app), ".master_key"),
                os.path.join(os.path.expanduser("~"), "AppData", "Local", "TLS1_Trading_Users", ".master_key")
            ]
            for p in candidates:
                if os.path.exists(p):
                    with open(p, "rb") as f:
                        key = f.read().strip()
                        if key:
                            return Fernet(key)
        except Exception:
            pass
        return None

    @classmethod
    def get_user_creds_file(cls, uid: str, user_base_dir_fn = None) -> str:
        if not user_base_dir_fn:
            user_base_dir_fn = cls._get_default_user_base_dir
        base_dir = user_base_dir_fn(uid)
        os.makedirs(base_dir, exist_ok=True)
        return os.path.join(base_dir, "tradelocker_config.json")

    @classmethod
    def _decrypt_password(cls, pwd: str, fernet_instance = None) -> str:
        if not fernet_instance:
            fernet_instance = cls._get_default_fernet()
        if pwd and pwd.startswith("ENC:") and fernet_instance:
            try:
                return fernet_instance.decrypt(pwd[4:].encode("utf-8")).decode("utf-8")
            except Exception:
                return pwd
        return pwd

    @classmethod
    def _encrypt_password(cls, pwd: str, fernet_instance = None) -> str:
        if not fernet_instance:
            fernet_instance = cls._get_default_fernet()
        if pwd and not pwd.startswith("ENC:") and fernet_instance:
            try:
                return "ENC:" + fernet_instance.encrypt(pwd.encode("utf-8")).decode("utf-8")
            except Exception:
                return pwd
        return pwd

    @classmethod
    def load_raw_data(cls, uid: str, user_base_dir_fn = None, fernet_instance = None) -> Tuple[List[Dict[str, Any]], str]:
        """
        Đọc toàn bộ danh sách tài khoản Quỹ của user.
        Tự động chuẩn hóa file cấu hình cũ (1 tài khoản phẳng) thành cấu trúc Multi-Prop Firm.
        """
        if not user_base_dir_fn:
            user_base_dir_fn = cls._get_default_user_base_dir
        if not fernet_instance:
            fernet_instance = cls._get_default_fernet()

        file_path = cls.get_user_creds_file(uid, user_base_dir_fn)
        if not os.path.exists(file_path):
            if uid != "default":
                default_path = cls.get_user_creds_file("default", user_base_dir_fn)
                if os.path.exists(default_path):
                    file_path = default_path
            if not os.path.exists(file_path):
                return [], ""

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw = json.load(f)

            # Trường hợp 1: File đã ở dạng Multi-Account
            if isinstance(raw, dict) and "accounts" in raw and isinstance(raw["accounts"], list):
                accounts = []
                for acc in raw["accounts"]:
                    item = dict(acc)
                    item["password"] = cls._decrypt_password(item.get("password", ""), fernet_instance)
                    accounts.append(item)
                active_id = raw.get("active_id", "")
                if not active_id and accounts:
                    active_id = accounts[0].get("id", "")
                return accounts, active_id

            # Trường hợp 2: File cũ (Object đơn 1 tài khoản)
            if isinstance(raw, dict) and (raw.get("email") or raw.get("account_id")):
                single = dict(raw)
                single["password"] = cls._decrypt_password(single.get("password", ""), fernet_instance)
                server = single.get("server", "E8")
                acc_id = str(single.get("account_id") or "1")
                custom_id = f"{server.lower()}_{acc_id}"
                single["id"] = custom_id
                single["firm"] = server
                single["name"] = f"{server} Demo #{acc_id}"
                return [single], custom_id

            return [], ""
        except Exception:
            return [], ""

    @classmethod
    def save_raw_data(cls, uid: str, accounts: List[Dict[str, Any]], active_id: str, user_base_dir_fn = None, fernet_instance = None, bot_prop_map: Optional[Dict[str, str]] = None) -> bool:
        """
        Lưu danh sách tài khoản Quỹ vào file JSON, mã hóa an toàn mật khẩu.
        """
        if not user_base_dir_fn:
            user_base_dir_fn = cls._get_default_user_base_dir
        if not fernet_instance:
            fernet_instance = cls._get_default_fernet()

        file_path = cls.get_user_creds_file(uid, user_base_dir_fn)
        try:
            existing_data = {}
            if os.path.exists(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8") as rf:
                        existing_data = json.load(rf)
                except Exception:
                    existing_data = {}

            safe_accounts = []
            for acc in accounts:
                item = dict(acc)
                item["password"] = cls._encrypt_password(item.get("password", ""), fernet_instance)
                safe_accounts.append(item)

            payload = {
                "active_id": active_id,
                "bot_prop_map": bot_prop_map if bot_prop_map is not None else existing_data.get("bot_prop_map", {}),
                "running_prop_bots": existing_data.get("running_prop_bots", {}),
                "accounts": safe_accounts,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            return True
        except Exception:
            return False

    @classmethod
    def get_prop_bindings(cls, uid: str, user_base_dir_fn = None) -> Tuple[Dict[str, str], Dict[str, bool]]:
        """Lấy bản đồ gán bot_prop_map (Strategy -> Prop Account ID) và running_prop_bots (Strategy -> True/False)"""
        file_path = cls.get_user_creds_file(uid, user_base_dir_fn)
        if not os.path.exists(file_path):
            if uid != "default":
                default_path = cls.get_user_creds_file("default", user_base_dir_fn)
                if os.path.exists(default_path):
                    file_path = default_path
            if not os.path.exists(file_path):
                return {}, {}
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            bot_map = raw.get("bot_prop_map", {}) if isinstance(raw, dict) else {}
            running_bots = raw.get("running_prop_bots", {}) if isinstance(raw, dict) else {}
            return bot_map, running_bots
        except Exception:
            return {}, {}

    @classmethod
    def save_prop_bindings(cls, uid: str, bot_prop_map: Optional[Dict[str, str]] = None, running_prop_bots: Optional[Dict[str, bool]] = None, user_base_dir_fn = None) -> bool:
        """Cập nhật bản đồ gán bot_prop_map và trạng thái chạy running_prop_bots"""
        file_path = cls.get_user_creds_file(uid, user_base_dir_fn)
        try:
            raw = {}
            if os.path.exists(file_path):
                with open(file_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
            if not isinstance(raw, dict):
                raw = {}
            if bot_prop_map is not None:
                raw["bot_prop_map"] = bot_prop_map
            if running_prop_bots is not None:
                raw["running_prop_bots"] = running_prop_bots
            raw["updated_at"] = datetime.now(timezone.utc).isoformat()
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(raw, f, indent=2, ensure_ascii=False)
            return True
        except Exception:
            return False

    @classmethod
    def can_start_prop_bot(cls, uid: str, strategy: str, target_acc_id: str, user_base_dir_fn = None, fernet_instance = None) -> Tuple[bool, str]:
        """
        Kiểm tra khóa độc quyền: 1 Tài khoản Quỹ chỉ được chạy duy nhất 1 phương pháp Bot.
        Nếu tài khoản Quỹ này đang chạy ở một bot khác -> Chặn lại và báo lý do rõ ràng.
        """
        bot_map, running_bots = cls.get_prop_bindings(uid, user_base_dir_fn)
        accounts, _ = cls.load_raw_data(uid, user_base_dir_fn, fernet_instance)

        target_name = target_acc_id
        for acc in accounts:
            if acc.get("id") == target_acc_id:
                target_name = acc.get("name") or f"Quỹ #{acc.get('account_id') or target_acc_id}"
                break

        strat_labels = {
            "sub1": "EMA200 Bot",
            "sub2": "SMC Bot",
            "sub3": "Liquidation Bot"
        }

        # Quét kiểm tra xem có bot khác đang chạy với tài khoản Quỹ này không
        for other_strat, is_running in running_bots.items():
            if other_strat != strategy and is_running:
                other_acc = bot_map.get(other_strat)
                if other_acc == target_acc_id:
                    other_label = strat_labels.get(other_strat, other_strat)
                    return False, f"Tài khoản {target_name} đang được chạy bởi {other_label}! Mỗi tài khoản Quỹ chỉ được chạy duy nhất 1 phương pháp Bot để tránh xung đột lệnh. Vui lòng dừng bot ở {other_label} hoặc chọn tài khoản Quỹ khác."

        return True, ""

    @classmethod
    def is_strategy_bot_running(cls, uid: str, strategy: str = "sub1", user_base_dir_fn = None, fernet_instance = None) -> bool:
        """Kiểm tra xem Bot Quỹ cho Strategy cụ thể có đang chạy hay không"""
        _, running_bots = cls.get_prop_bindings(uid, user_base_dir_fn)
        if strategy in running_bots:
            return bool(running_bots[strategy])
        return cls.is_bot_running(uid, user_base_dir_fn, fernet_instance)

    @classmethod
    def set_strategy_bot_running(cls, uid: str, strategy: str, running: bool, account_id: Optional[str] = None, user_base_dir_fn = None, fernet_instance = None) -> bool:
        """Bật/Tắt Bot Quỹ độc quyền cho từng Strategy (sub1, sub2, sub3)"""
        bot_map, running_bots = cls.get_prop_bindings(uid, user_base_dir_fn)
        if account_id:
            bot_map[strategy] = account_id
        running_bots[strategy] = bool(running)

        # Cập nhật is_bot_running tổng thể (True nếu có ít nhất 1 bot strategy đang chạy)
        any_running = any(running_bots.values())
        cfg = cls.load_user_config(uid, user_base_dir_fn, fernet_instance) or {}
        cfg["is_bot_running"] = any_running
        cls.save_user_config(uid, cfg, user_base_dir_fn, fernet_instance)

        saved = cls.save_prop_bindings(uid, bot_prop_map=bot_map, running_prop_bots=running_bots, user_base_dir_fn=user_base_dir_fn)
        strat_labels = {"sub1": "EMA200 Bot", "sub2": "SMC Bot", "sub3": "Liquidation Bot"}
        strat_name = strat_labels.get(strategy, strategy)
        target_acc_label = bot_map.get(strategy, account_id or "Active")
        if saved:
            if running:
                cls.log_event(uid, f"🚀 [QUỸ FX] Đã khởi động {strat_name} độc quyền cho Quỹ #{target_acc_label}")
            else:
                cls.log_event(uid, f"🛑 [QUỸ FX] Đã dừng {strat_name} cho Quỹ #{target_acc_label}")
        return saved

    @classmethod
    def load_user_config(cls, uid: str, user_base_dir_fn = None, fernet_instance = None, account_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Tương thích 100% với hàm cũ: Trả về tài khoản Quỹ active (hoặc theo account_id cụ thể).
        """
        accounts, active_id = cls.load_raw_data(uid, user_base_dir_fn, fernet_instance)
        if not accounts:
            return None

        target_id = account_id or active_id
        for acc in accounts:
            if acc.get("id") == target_id:
                return acc
        return accounts[0]

    @classmethod
    def save_user_config(cls, uid: str, config: Dict[str, Any], user_base_dir_fn = None, fernet_instance = None, account_id: Optional[str] = None) -> bool:
        """
        Tương thích hàm cũ: Cập nhật tài khoản Quỹ active (hoặc theo account_id).
        """
        accounts, active_id = cls.load_raw_data(uid, user_base_dir_fn, fernet_instance)
        target_id = account_id or config.get("id") or active_id
        
        found = False
        for i, acc in enumerate(accounts):
            if acc.get("id") == target_id:
                accounts[i] = {**acc, **config}
                found = True
                break
        
        if not found:
            new_acc = dict(config)
            if "id" not in new_acc:
                server = new_acc.get("server", "E8")
                acc_num = str(new_acc.get("account_id") or len(accounts) + 1)
                new_acc["id"] = f"{server.lower()}_{acc_num}"
            accounts.append(new_acc)
            active_id = new_acc["id"]

        return cls.save_raw_data(uid, accounts, active_id, user_base_dir_fn, fernet_instance)

    @classmethod
    def upsert_account(cls, uid: str, acc_data: Dict[str, Any], user_base_dir_fn = None, fernet_instance = None) -> str:
        """
        Thêm mới hoặc cập nhật 1 tài khoản Quỹ, tự động set làm active.
        """
        accounts, _ = cls.load_raw_data(uid, user_base_dir_fn, fernet_instance)
        server = acc_data.get("server", "E8")
        acc_num = str(acc_data.get("account_id") or "")
        
        acc_id = acc_data.get("id") or f"{server.lower()}_{acc_num}"
        acc_data["id"] = acc_id
        if not acc_data.get("name"):
            acc_data["name"] = f"{server} Demo #{acc_num}"
        acc_data["firm"] = server

        found = False
        for i, existing in enumerate(accounts):
            if existing.get("id") == acc_id or (existing.get("server") == server and str(existing.get("account_id")) == acc_num):
                accounts[i] = {**existing, **acc_data, "id": acc_id}
                found = True
                break
        if not found:
            accounts.append(acc_data)

        cls.save_raw_data(uid, accounts, acc_id, user_base_dir_fn, fernet_instance)
        return acc_id

    @classmethod
    def select_active_account(cls, uid: str, account_id: str, user_base_dir_fn = None, fernet_instance = None) -> bool:
        """
        Chọn tài khoản Quỹ đang hoạt động cho Bot.
        """
        accounts, _ = cls.load_raw_data(uid, user_base_dir_fn, fernet_instance)
        if any(a.get("id") == account_id for a in accounts):
            return cls.save_raw_data(uid, accounts, account_id, user_base_dir_fn, fernet_instance)
        return False

    @classmethod
    def delete_account(cls, uid: str, account_id: str, user_base_dir_fn = None, fernet_instance = None) -> bool:
        """
        Xóa 1 tài khoản Quỹ cụ thể với so sánh linh hoạt (soft-match) và dọn sạch cả thư mục default để không bị hồi sinh.
        """
        target = str(account_id).strip()
        def is_target(a):
            a_id = str(a.get("id") or "").strip()
            a_acc = str(a.get("account_id") or "").strip()
            a_num = str(a.get("acc_num") or "").strip()
            return target in (a_id, a_acc, a_num, f"e8_{target}", f"prop_e8_{target}", f"e8_{a_acc}") or a_acc == target or a_id == target

        accounts, active_id = cls.load_raw_data(uid, user_base_dir_fn, fernet_instance)
        new_accounts = [a for a in accounts if not is_target(a)]

        for k in list(cls._clients.keys()):
            if k.startswith(f"{uid}:") or k == uid:
                del cls._clients[k]

        bot_map, running_bots = cls.get_prop_bindings(uid, user_base_dir_fn)
        for st in list(bot_map.keys()):
            if bot_map[st] == target or is_target({"id": bot_map[st], "account_id": bot_map[st]}):
                del bot_map[st]

        new_active = ""
        if new_accounts:
            new_active = active_id if any(a.get("id") == active_id for a in new_accounts) else new_accounts[0].get("id", "")

        # Luôn ghi lại file rỗng cho UID này thay vì xóa file, để load_raw_data không bao giờ fallback về default
        cls.save_raw_data(uid, new_accounts, new_active, user_base_dir_fn, fernet_instance, bot_prop_map=bot_map)

        # Xóa đồng thời nếu tài khoản này có trong thư mục default
        if uid != "default":
            def_accounts, def_active = cls.load_raw_data("default", user_base_dir_fn, fernet_instance)
            new_def = [a for a in def_accounts if not is_target(a)]
            new_def_active = def_active if any(a.get("id") == def_active for a in new_def) else (new_def[0].get("id", "") if new_def else "")
            cls.save_raw_data("default", new_def, new_def_active, user_base_dir_fn, fernet_instance)

        return True

    @classmethod
    def get_client(cls, uid: str, user_base_dir_fn = None, fernet_instance = None, account_id: Optional[str] = None) -> Optional[TradeLockerClient]:
        cfg = cls.load_user_config(uid, user_base_dir_fn, fernet_instance, account_id=account_id)
        if not cfg or not cfg.get("email") or not cfg.get("password"):
            return None

        acc_id = cfg.get("id") or account_id or "default"
        cache_key = f"{uid}:{acc_id}"
        if cache_key in cls._clients:
            return cls._clients[cache_key]

        client = TradeLockerClient(
            email=cfg["email"],
            password=cfg["password"],
            server=cfg.get("server", "E8"),
            environment=cfg.get("environment", "https://demo.tradelocker.com")
        )
        cls._clients[cache_key] = client
        cls._clients[uid] = client
        return client

    @classmethod
    def remove_client(cls, uid: str, account_id: Optional[str] = None):
        if account_id:
            cls._clients.pop(f"{uid}:{account_id}", None)
        else:
            to_del = [k for k in cls._clients if k == uid or k.startswith(f"{uid}:")]
            for k in to_del:
                cls._clients.pop(k, None)

    @classmethod
    def log_event(cls, uid: str, message: str):
        """Ghi log sự kiện riêng biệt cho Quỹ FX (TradeLocker) và đẩy tới WebSocket subscribers"""
        clean_uid = uid.strip() if (uid and uid not in ["guest", "undefined", "null"]) else "default"
        if clean_uid not in cls._log_queues:
            cls._log_queues[clean_uid] = deque(maxlen=300)
        
        now_str = datetime.now().strftime("%H:%M:%S")
        is_formatted = (
            message.startswith("[") or message.startswith("⏳") or 
            message.startswith("🏆") or message.startswith("⚠️") or 
            message.startswith("🚀") or message.startswith("🛑") or 
            message.startswith("🔑") or message.startswith("🧹") or 
            message.startswith("🌑") or message.startswith("✅") or
            message.startswith("ℹ️") or message.startswith("🛡️")
        )
        formatted_msg = message if is_formatted else f"[{now_str}] {message}"
        cls._log_queues[clean_uid].append(formatted_msg)

        # Lưu đồng thời vào queue 'default' để giao diện web luôn nhận được bất kể phiên login
        if clean_uid != "default":
            if "default" not in cls._log_queues:
                cls._log_queues["default"] = deque(maxlen=300)
            cls._log_queues["default"].append(formatted_msg)

        # Gửi tới toàn bộ subscribers của clean_uid và default
        all_subs = list(cls._subscribers.get(clean_uid, []))
        if clean_uid != "default":
            for s in cls._subscribers.get("default", []):
                if s not in all_subs:
                    all_subs.append(s)

        if all_subs:
            try:
                import asyncio
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = None

                for ws in all_subs:
                    try:
                        if loop and loop.is_running():
                            loop.create_task(ws.send_text(formatted_msg))
                    except Exception:
                        pass
            except Exception:
                pass
        else:
            # 📢 Nếu KHÔNG có WebSocket subscribers (tiến trình con của bot), print ra stdout kèm tag [TRADELOCKER]
            # để main.py (tiến trình cha uvicorn) đọc được qua stdout và broadcast tới trình duyệt!
            tag = "[TRADELOCKER]"
            out_line = formatted_msg if tag in formatted_msg else f"{tag} {formatted_msg}"
            print(out_line, flush=True)

    @classmethod
    def get_recent_logs(cls, uid: str) -> List[str]:
        """Lấy danh sách log sự kiện gần nhất của Quỹ FX"""
        clean_uid = uid.strip() if (uid and uid not in ["guest", "undefined", "null"]) else "default"
        if clean_uid in cls._log_queues and len(cls._log_queues[clean_uid]) > 0:
            return list(cls._log_queues[clean_uid])
        if "default" in cls._log_queues:
            return list(cls._log_queues["default"])
        return []

    @classmethod
    def get_dashboard_lines(cls, uid: str, user_base_dir_fn = None, fernet_instance = None) -> List[str]:
        """Tạo bảng Dashboard Snapshot chuyên biệt cho Quỹ FX (E8 Markets)"""
        clean_uid = uid.strip() if (uid and uid not in ["guest", "undefined", "null"]) else "default"
        client = cls.get_client(clean_uid, user_base_dir_fn, fernet_instance)
        if not client and clean_uid != "default":
            client = cls.get_client("default", user_base_dir_fn, fernet_instance)
        cfg = cls.load_user_config(clean_uid, user_base_dir_fn, fernet_instance) or {}
        if not cfg and clean_uid != "default":
            cfg = cls.load_user_config("default", user_base_dir_fn, fernet_instance) or {}
        if client:
            if not client.access_token or client.account_balance <= 0:
                try:
                    if client._ensure_authenticated():
                        client.get_accounts()
                except Exception:
                    pass

        is_running = cfg.get("is_bot_running", False)
        risk_usd = float(cfg.get("risk_per_trade", 25.0))
        acc_num = client.acc_num if (client and client.acc_num) else (cfg.get("acc_num") or cfg.get("email") or "Chưa kết nối")
        server = client.server if (client and client.server) else cfg.get("server", "E8")
        bal = float(client.account_balance) if (client and client.account_balance > 0) else float(cfg.get("fund_size", 5000.0))
        status_str = "🟢 RUNNING (ĐANG HOẠT ĐỘNG)" if is_running else "🛑 STOPPED (ĐÃ DỪNG)"
        conn_str = "✅ ĐÃ KẾT NỐI" if (client and client.access_token) else "⚪ CHƯA KẾT NỐI"

        return [
            "=" * 78,
            "             🏆 HỆ THỐNG GIAO DỊCH QUỸ FX - TRADELOCKER (E8 MARKETS)",
            "=" * 78,
            f" Tài khoản Quỹ : {str(acc_num):<18} | Máy chủ   : {str(server)}",
            f" Số dư Quỹ     : ${bal:,.2f} USD{'':<10} | Risk/Lệnh : ${risk_usd:,.2f} USD",
            f" Trạng thái Bot: {status_str:<26} | Kết nối API: {conn_str}",
            "=" * 78,
        ]

    @classmethod
    def get_logs_payload(cls, uid: str, user_base_dir_fn = None, fernet_instance = None) -> Dict[str, Any]:
        """Gói dữ liệu hoàn chỉnh gồm Dashboard & Event logs cho Quỹ FX"""
        clean_uid = uid.strip() if (uid and uid not in ["guest", "undefined", "null"]) else "default"
        events = list(cls._log_queues.get(clean_uid, []))
        if not events and clean_uid != "default":
            events = list(cls._log_queues.get("default", []))
        return {
            "status": "success",
            "dashboardLines": cls.get_dashboard_lines(clean_uid, user_base_dir_fn, fernet_instance),
            "eventLogs": events[::-1]
        }

    @classmethod
    def is_bot_running(cls, uid: str, user_base_dir_fn = None, fernet_instance = None) -> bool:
        """Kiểm tra trạng thái chạy Bot Quỹ FX (TradeLocker) của người dùng"""
        cfg = cls.load_user_config(uid, user_base_dir_fn, fernet_instance)
        if not cfg:
            return False
        return bool(cfg.get("is_bot_running", False))

    @classmethod
    def set_bot_running(cls, uid: str, running: bool, user_base_dir_fn = None, fernet_instance = None) -> bool:
        """Bật/Tắt trạng thái chạy Bot Quỹ FX (TradeLocker) độc lập với Sàn OKX"""
        cfg = cls.load_user_config(uid, user_base_dir_fn, fernet_instance) or {}
        cfg["is_bot_running"] = bool(running)
        saved = cls.save_user_config(uid, cfg, user_base_dir_fn, fernet_instance)
        if saved:
            if running:
                cls.log_event(uid, "🚀 [TRADELOCKER] Đã khởi động Bot Quỹ FX (TradeLocker - E8 Markets)")
            else:
                cls.log_event(uid, "🛑 [TRADELOCKER] Đã dừng Bot Quỹ FX (TradeLocker - E8 Markets)")
        return saved

    @classmethod
    def dispatch_signal_to_tradelocker(
        cls,
        uid: str,
        symbol: str,
        side: str,
        price: float,
        sl_price: Optional[float] = None,
        tp_price: Optional[float] = None,
        dry_run: bool = False,
        user_base_dir_fn = None,
        fernet_instance = None,
        strategy: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Bộ điều phối tín hiệu chiến lược từ Bot sang tài khoản Quỹ TradeLocker (E8 Markets)
        Tích hợp đầy đủ:
        1. Thread-safe lock (_dispatch_lock) triệt tiêu hoàn toàn race-condition giữa các khung đa thời gian
        2. Chống Spam / Khóa Cooldown (45s per symbol) cập nhật tức thì dưới lock
        3. Quy tắc an toàn Quỹ: Mỗi coin chỉ 1 vị thế (Chặn mở thêm lệnh khi đã có vị thế, bảo vệ tài khoản Netting)
        4. Chống Spam hủy/đặt lại lệnh Limit: Giữ nguyên lệnh chờ nếu đã có lệnh cùng chiều với giá lệch < 0.2%
        5. Tự động tính SL/TP fallback theo tỷ lệ cấu hình (mặc định 1.2%)
        6. Tự động vá SL/TP cho các vị thế đang trần (naked positions)
        7. Cầu Dao An Toàn ngắt sớm (Circuit Breakers: Static DD 8%, Daily DD 2.5%, Daily Profit Cap)
        8. Khóa Độc Quyền Bot: Mỗi tài khoản Quỹ chỉ chạy duy nhất 1 phương pháp Bot (EMA200 / SMC)
        """
        with cls._dispatch_lock:
            clean_uid = uid.strip() if (uid and uid not in ["guest", "undefined", "null"]) else "default"
            if not user_base_dir_fn:
                user_base_dir_fn = cls._get_default_user_base_dir
            if not fernet_instance:
                fernet_instance = cls._get_default_fernet()

            # 🛑 KIỂM TRA TRẠNG THÁI CHẠY BOT QUỸ THEO STRATEGY ĐỘC LẬP:
            bot_map, running_bots = cls.get_prop_bindings(clean_uid, user_base_dir_fn)
            target_acc_id = None
            if strategy:
                if not running_bots.get(strategy, False):
                    return False, f"Bot Quỹ cho chiến lược {strategy} đang DỪNG — Bỏ qua đặt lệnh Quỹ"
                target_acc_id = bot_map.get(strategy)
            else:
                cfg_all = cls.load_user_config(clean_uid, user_base_dir_fn, fernet_instance)
                if not cfg_all or not cfg_all.get("is_bot_running", False):
                    return False, "Bot Quỹ FX đang DỪNG — Bỏ qua đặt lệnh Quỹ"

            cfg = cls.load_user_config(clean_uid, user_base_dir_fn, fernet_instance, account_id=target_acc_id)
            if not cfg or not cfg.get("is_enabled", True):
                return False, f"Tài khoản Quỹ {target_acc_id or 'mặc định'} chưa được kích hoạt hoặc chưa kết nối"

            # Kiểm tra mã giao dịch có được bật đánh Quỹ không
            enabled_syms = cfg.get("enabled_symbols", ["XAU", "BTC", "ETH"])
            clean_base = symbol.upper().replace("-", "").replace("_", "").replace("USDT", "").replace("USD", "").replace("SWAP", "")
            if clean_base not in [s.upper() for s in enabled_syms]:
                return False, f"Mã {symbol} ({clean_base}) không nằm trong danh sách bật trade quỹ của tài khoản {target_acc_id or 'mặc định'}"

            # ⏳ KHÓA COOLDOWN CHỐNG BẮN LIÊN TỤC (Tối thiểu 45s mỗi mã):
            now_time = time.time()
            last_time = cls._symbol_cooldowns.get(clean_base, 0.0)
            elapsed = now_time - last_time
            if elapsed < 45.0:
                msg_cool = f"⏳ [TRADELOCKER] Cooldown {clean_base}: Vừa xử lý lệnh cách đây {int(elapsed)}s (< 45s) — Bỏ qua tránh spam"
                cls.log_event(clean_uid, msg_cool)
                return False, msg_cool

            # Cập nhật cooldown ngay dưới lock để chặn ngay các luồng đồng thời tiếp theo
            cls._symbol_cooldowns[clean_base] = now_time

            client = cls.get_client(clean_uid, user_base_dir_fn, fernet_instance, account_id=target_acc_id)
            if not client:
                return False, f"Không khởi tạo được TradeLocker client cho tài khoản {target_acc_id or 'mặc định'}"

            # 🛡️ KIỂM TRA VỊ THẾ ĐANG MỞ (POSITION SAFETY CHECK):
            # Quy tắc an toàn Quỹ: Mỗi coin chỉ duy nhất 1 vị thế!
            # Nếu ĐÃ CÓ BẤT KỲ VỊ THẾ NÀO của clean_base (dù BUY hay SELL):
            # Tuyệt đối KHÔNG mở thêm lệnh mới để bảo vệ tài khoản Netting và tránh vi phạm quy định quỹ.
            side_clean = "buy" if side.lower() in ("buy", "long") else "sell"
            ok_pos, positions, _ = client.get_positions()
            if ok_pos and positions:
                for p in positions:
                    p_dict = p if isinstance(p, dict) else {}
                    if not p_dict and isinstance(p, list):
                        cols = client.get_positions_columns()
                        p_dict = {cols[i]: p[i] for i in range(min(len(cols), len(p)))}

                    pos_sym = str(p_dict.get("symbol") or "")
                    pos_inst_id = p_dict.get("tradableInstrumentId")

                    inst_match = False
                    if pos_sym and clean_base in pos_sym.upper():
                        inst_match = True
                    elif pos_inst_id:
                        resolved = client.resolve_instrument(clean_base)
                        if resolved and resolved.get("tradableInstrumentId") == pos_inst_id:
                            inst_match = True

                    if inst_match:
                        p_side = str(p_dict.get("side", "")).lower()
                        pos_id = str(p_dict.get("id") or "")

                        # 🏥 Tự động vá SL/TP cho các vị thế đang trần (naked position)
                        cur_sl = p_dict.get("stopLoss")
                        cur_tp = p_dict.get("takeProfit")
                        if (not cur_sl or float(cur_sl) <= 0) and pos_id:
                            pos_px = float(p_dict.get("price") or price or 0.0)
                            if pos_px > 0:
                                sl_pct = float(cfg.get("sl_percent") or 1.2) / 100.0
                                tp_pct = float(cfg.get("tp_percent") or 1.2) / 100.0
                                heal_sl = round(pos_px * (1.0 - sl_pct) if p_side == "buy" else pos_px * (1.0 + sl_pct), 2)
                                heal_tp = round(pos_px * (1.0 + tp_pct) if p_side == "buy" else pos_px * (1.0 - tp_pct), 2)
                                ok_mod, mod_msg = client.modify_position(pos_id, stop_loss=heal_sl, take_profit=heal_tp)
                                if ok_mod:
                                    cls.log_event(clean_uid, f"🛡️ [TRADELOCKER] Đã tự động cài SL={heal_sl} | TP={heal_tp} bảo vệ vị thế #{pos_id} ({clean_base})")

                        # Dọn dẹp các lệnh Limit chờ cũ của mã này để tránh vô tình khớp thêm
                        try:
                            inst_info = client.resolve_instrument(clean_base)
                            if inst_info:
                                client.cancel_all_orders(tradable_instrument_id=inst_info.get("tradableInstrumentId"))
                        except Exception:
                            pass

                        msg_has_pos = f"ℹ️ [TRADELOCKER] Đã có vị thế {p_side.upper()} {clean_base} (Ticket #{pos_id}) đang mở trên Quỹ — Không đặt thêm lệnh mới để bảo vệ an toàn."
                        cls.log_event(clean_uid, msg_has_pos)
                        return False, msg_has_pos

            # Giám sát Cầu dao bảo vệ tài khoản Quỹ (Circuit Breaker)
            ok_state, state, _ = client.get_account_state()
            if ok_state:
                fund_size = float(cfg.get("fund_size", 5000.0))
                equity = float(state.get("equity", fund_size))

                # 1. Chặn Static Drawdown (8%)
                loss_level = fund_size - (fund_size * 0.08)
                if equity <= loss_level:
                    msg_cb = f"🚨 CẦU DAO KÍCH HOẠT: Equity (${equity:.2f}) chạm ngưỡng vi phạm Static Drawdown (${loss_level:.2f})!"
                    cls.log_event(clean_uid, msg_cb)
                    return False, msg_cb

                # 2. Chặn Daily Drawdown (2.5%) - Tự ngắt sớm ở 80% mốc lỗ ngày để bảo vệ an toàn tuyệt đối
                daily_loss_limit = float(cfg.get("daily_drawdown_limit", 125.0))
                current_loss = fund_size - equity
                if current_loss >= daily_loss_limit * 0.8:
                    msg_cb = f"🚨 CẦU DAO KÍCH HOẠT: Mức lỗ hiện tại (${current_loss:.2f}) tiệm cận ngưỡng Daily Drawdown (${daily_loss_limit:.2f})!"
                    cls.log_event(clean_uid, msg_cb)
                    return False, msg_cb

                # 3. Chốt lãi trần ngày (Daily Profit Cap)
                daily_profit_cap = float(cfg.get("daily_profit_cap", 100.0))
                profit = equity - fund_size
                if profit >= daily_profit_cap * 0.95:
                    msg_cb = f"⏳ CẦU DAO CHỐT LÃI: Đã đạt trần lãi ngày (${profit:.2f} / ${daily_profit_cap:.2f}), bảo toàn kết quả thi."
                    cls.log_event(clean_uid, msg_cb)
                    return False, msg_cb

            # Xác định khối lượng Lot (Fixed Lot mặc định an toàn: 0.01 Lot)
            fixed_lot = float(cfg.get("fixed_lot") or 0.01)
            lot = round(max(0.01, fixed_lot), 2)

            if dry_run and not cfg.get("is_bot_running", False):
                print(f"🌑 [DRY-RUN TradeLocker] Bỏ qua đặt lệnh thật (Shadow Mode): {side.upper()} {lot} Lot {clean_base}")
                return True, f"Chế độ Shadow Mode (Dry-run): Sẽ đặt {side.upper()} {lot} Lot {clean_base}"

            order_type = "limit" if price and price > 0 else "market"

            # 🛡️ KIỂM TRA LỆNH CHỜ (PENDING LIMIT ORDERS CHỐNG SPAM HỦY/ĐẶT LẠI):
            # Nếu là lệnh Limit, kiểm tra xem đã có lệnh Limit cùng chiều với mức giá gần tương đương chưa (< 0.2%)
            if order_type == "limit":
                inst_info = client.resolve_instrument(clean_base)
                tid = inst_info.get("tradableInstrumentId") if inst_info else None

                existing_matched = False
                if tid:
                    ok_ord, orders, _ = client.get_orders()
                    if ok_ord and orders:
                        for o in orders:
                            o_dict = o if isinstance(o, dict) else {}
                            if not o_dict and isinstance(o, list):
                                o_cols = ["id", "tradableInstrumentId", "routeId", "side", "qty", "price", "stopLoss", "takeProfit", "status", "type"]
                                o_dict = {o_cols[i]: o[i] for i in range(min(len(o_cols), len(o)))}

                            o_tid = o_dict.get("tradableInstrumentId")
                            if str(o_tid) == str(tid):
                                o_side = str(o_dict.get("side", "")).lower()
                                o_px = float(o_dict.get("price") or 0.0)
                                o_id = str(o_dict.get("id") or "")

                                # Nếu cùng chiều và giá chênh lệch < 0.2%: GIỮ NGUYÊN LỆNH CHỜ, KHÔNG HỦY VÀ KHÔNG ĐẶT LẠI!
                                if o_side == side_clean and o_px > 0 and price > 0:
                                    diff_pct = abs(o_px - price) / price
                                    if diff_pct < 0.002:  # < 0.2%
                                        existing_matched = True
                                        msg_exist = f"ℹ️ [TRADELOCKER] Lệnh Limit {side_clean.upper()} {lot} Lot {clean_base} @{o_px} đã tồn tại (Order #{o_id}, lệch {diff_pct*100:.2f}%) — Giữ nguyên lệnh chờ, không spam hủy/đặt lại."
                                        cls.log_event(clean_uid, msg_exist)
                                        return True, msg_exist

                # Nếu không có lệnh tương đương -> Hủy lệnh cũ để cập nhật mức giá mới
                if not existing_matched and tid:
                    try:
                        ok_cancel, cancel_msg = client.cancel_all_orders(tradable_instrument_id=tid)
                        if ok_cancel:
                            cls.log_event(clean_uid, f"🧹 [TRADELOCKER] Đã hủy lệnh chờ cũ {clean_base} để cập nhật giá mới @{price}")
                    except Exception as e:
                        cls.log_event(clean_uid, f"⚠️ [TRADELOCKER] Lỗi hủy lệnh chờ cũ {clean_base}: {e}")

            # 🎯 TỰ ĐỘNG BỔ SUNG SL & TP BẮT BUỘC (MẶC ĐỊNH THEO TỶ LỆ CÀI ĐẶT CỦA USER HOẶC 1.2%):
            ref_px = float(price) if price and price > 0 else 0.0
            if ref_px <= 0:
                try:
                    inst_meta = client.resolve_instrument(clean_base)
                    if inst_meta:
                        tid = inst_meta.get("tradableInstrumentId")
                        q_res = client.get_quotes([tid]) if hasattr(client, "get_quotes") else {}
                        if q_res and tid in q_res:
                            ref_px = float(q_res[tid].get("ask") or q_res[tid].get("bid") or 0.0)
                except Exception:
                    pass

            sl_pct_cfg = float(cfg.get("sl_percent") or 1.2) / 100.0
            tp_pct_cfg = float(cfg.get("tp_percent") or 1.2) / 100.0
            final_sl = float(sl_price) if sl_price and sl_price > 0 else None
            final_tp = float(tp_price) if tp_price and tp_price > 0 else None

            if ref_px > 0:
                if not final_sl or final_sl <= 0:
                    final_sl = round(ref_px * (1.0 - sl_pct_cfg) if side_clean == "buy" else ref_px * (1.0 + sl_pct_cfg), 2)
                if not final_tp or final_tp <= 0:
                    final_tp = round(ref_px * (1.0 + tp_pct_cfg) if side_clean == "buy" else ref_px * (1.0 - tp_pct_cfg), 2)

            # Log trước khi đặt lệnh để trace
            cls.log_event(clean_uid, f"🚀 [TRADELOCKER] Đang đặt lệnh {order_type.upper()} {side.upper()} {lot} Lot {clean_base} @{price} SL={final_sl} TP={final_tp}...")

            # Đặt lệnh sang TradeLocker kèm SL và TP đầy đủ
            ok, res, msg = client.place_order(
                symbol=clean_base,
                side=side,
                qty=lot,
                order_type=order_type,
                price=price,
                stop_loss=final_sl,
                take_profit=final_tp
            )
            sl_tp_tag = f" [SL: {final_sl} | TP: {final_tp}]" if (final_sl and final_tp) else ""
            if ok:
                order_id = res.get("orderId") or res.get("id") or "N/A"
                cls.log_event(clean_uid, f"🏆 [TRADELOCKER] Đặt lệnh {side.upper()} {lot} Lot {clean_base}{sl_tp_tag} thành công (Ticket #{order_id})")
            else:
                cls.log_event(clean_uid, f"⚠️ [TRADELOCKER] Đặt lệnh {side.upper()} {lot} Lot {clean_base}{sl_tp_tag} thất bại: {msg}")
                if res:
                    cls.log_event(clean_uid, f"⚠️ [TRADELOCKER DEBUG] Raw response: {res}")
            return ok, msg

    @classmethod
    def dispatch_signal_async(
        cls,
        uid: str,
        symbol: str,
        side: str,
        price: float,
        sl_price: Optional[float] = None,
        tp_price: Optional[float] = None,
        dry_run: bool = False,
        strategy: Optional[str] = None
    ):
        """Chạy dispatch sang TradeLocker trong luồng ngầm daemon không gây block bot loop"""
        import threading
        def _worker():
            try:
                ok, msg = cls.dispatch_signal_to_tradelocker(
                    uid=uid,
                    symbol=symbol,
                    side=side,
                    price=price,
                    sl_price=sl_price,
                    tp_price=tp_price,
                    dry_run=dry_run,
                    strategy=strategy
                )
                strat_tag = f"[{strategy.upper()}]" if strategy else "[ALL]"
                if ok:
                    print(f"🏆 [TRADELOCKER E8 DISPATCH] {strat_tag} {msg}", flush=True)
                else:
                    if "chưa được kích hoạt" not in msg and "không nằm trong danh sách" not in msg and "đang DỪNG" not in msg:
                        print(f"⚠️ [TRADELOCKER E8 DISPATCH THẤT BẠI] {strat_tag}: {msg}", flush=True)
            except Exception as e:
                print(f"⚠️ [TRADELOCKER E8 DISPATCH LỖI]: {e}", flush=True)

        t = threading.Thread(target=_worker, daemon=True, name=f"TL_Dispatch_{strategy or 'Worker'}")
        t.start()

# z1956 | Khắc phục triệt để lỗi spam lệnh TradeLocker: kiểm tra vị thế mở cùng chiều, khóa cooldown 45s, tự động tính SL/TP bắt buộc và tự động vá SL/TP cho các vị thế đang trần
# z1957 | Bổ sung logging chi tiết cho dispatch TradeLocker: log cancel_all_orders, log trước khi đặt lệnh, log raw response khi thất bại để chẩn đoán lỗi lệnh bị hủy/mất
# z1958 | Triệt tiêu lỗi spam hủy/đặt lại limit order và lỗi netting đóng vị thế: đồng bộ hóa thread-lock _dispatch_lock, IPC stdout log forwarding, giữ nguyên limit order đang chờ nếu lệch < 0.2%, chặn 100% rác HTML Cloudflare qua _clean_error_text
# z1959 | Bổ sung import threading ở top file giải quyết triệt để NameError khi khởi tạo TradeLockerManager._dispatch_lock

