import os
import json
import time
from datetime import datetime, timezone
import requests
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal

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
                err_msg = resp.text
                try:
                    err_json = resp.json()
                    err_msg = err_json.get("message") or err_json.get("error") or resp.text
                except Exception:
                    pass
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
            return False, [], f"Lỗi lấy tài khoản ({resp.status_code}): {resp.text}"
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
            return False, {}, f"Lỗi lấy trạng thái tài khoản: {resp.text}"
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
                res_data = resp.json()
                order_id = res_data.get("d", {}).get("orderId")
                return True, {"orderId": order_id, "data": res_data}, f"Đã đặt lệnh TradeLocker thành công! Mã lệnh: {order_id}"
            else:
                err_text = resp.text
                try:
                    err_json = resp.json()
                    err_text = err_json.get("message") or resp.text
                except:
                    pass
                return False, {}, f"TradeLocker từ chối ({resp.status_code}): {err_text}"
        except Exception as e:
            return False, {}, f"Lỗi gửi lệnh TradeLocker: {str(e)}"

    def get_positions(self) -> Tuple[bool, List[Any], str]:
        """Lấy danh sách các vị thế đang mở"""
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
                
                if cols and raw_positions and isinstance(raw_positions[0], list):
                    dict_positions = []
                    for row in raw_positions:
                        row_dict = {}
                        for idx, col in enumerate(cols):
                            if idx < len(row):
                                row_dict[col] = row[idx]
                        dict_positions.append(row_dict)
                    return True, dict_positions, "OK"
                
                return True, raw_positions, "OK"
            return False, [], f"Lỗi lấy vị thế ({resp.status_code}): {resp.text}"
        except Exception as e:
            return False, [], str(e)

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
            err_msg = resp.text
            try:
                err_msg = resp.json().get("message") or resp.text
            except Exception:
                pass
            return False, f"Lỗi đóng vị thế ({resp.status_code}): {err_msg}"
        except Exception as e:
            return False, f"Lỗi mạng: {str(e)}"

    def get_orders(self) -> Tuple[bool, List[Any], str]:
        """Lấy danh sách các lệnh chờ (Pending/Limit)"""
        if not self._ensure_authenticated():
            return False, [], "Chưa xác thực TradeLocker"
        url = f"{self.base_url}/trade/accounts/{self.account_id}/orders"
        try:
            resp = requests.get(url, headers=self._get_headers(include_acc_num=True), timeout=10)
            if resp.status_code == 200:
                orders = resp.json().get("d", {}).get("orders", [])
                return True, orders, "OK"
            return False, [], f"Lỗi lấy danh sách lệnh ({resp.status_code}): {resp.text}"
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
            err_msg = resp.text
            try:
                err_msg = resp.json().get("message") or resp.text
            except Exception:
                pass
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
            err_msg = resp.text
            try:
                err_msg = resp.json().get("message") or resp.text
            except Exception:
                pass
            return False, f"Lỗi hủy lệnh ({resp.status_code}): {err_msg}"
        except Exception as e:
            return False, f"Lỗi mạng: {str(e)}"


# ==============================================================================
# Trình Quản Lý Đa Người Dùng (Multi-Tenant Manager)
# ==============================================================================

class TradeLockerManager:
    _clients: Dict[str, TradeLockerClient] = {}

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
    def save_raw_data(cls, uid: str, accounts: List[Dict[str, Any]], active_id: str, user_base_dir_fn = None, fernet_instance = None) -> bool:
        """
        Lưu danh sách tài khoản Quỹ vào file JSON, mã hóa an toàn mật khẩu.
        """
        if not user_base_dir_fn:
            user_base_dir_fn = cls._get_default_user_base_dir
        if not fernet_instance:
            fernet_instance = cls._get_default_fernet()

        file_path = cls.get_user_creds_file(uid, user_base_dir_fn)
        try:
            safe_accounts = []
            for acc in accounts:
                item = dict(acc)
                item["password"] = cls._encrypt_password(item.get("password", ""), fernet_instance)
                safe_accounts.append(item)

            payload = {
                "active_id": active_id,
                "accounts": safe_accounts,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            return True
        except Exception:
            return False

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
        Xóa 1 tài khoản Quỹ cụ thể.
        """
        accounts, active_id = cls.load_raw_data(uid, user_base_dir_fn, fernet_instance)
        new_accounts = [a for a in accounts if a.get("id") != account_id]
        
        client_key = f"{uid}:{account_id}"
        if client_key in cls._clients:
            del cls._clients[client_key]
        if uid in cls._clients:
            del cls._clients[uid]

        if not new_accounts:
            file_path = cls.get_user_creds_file(uid, user_base_dir_fn)
            if os.path.exists(file_path):
                try: os.remove(file_path)
                except Exception: pass
            return True

        new_active = active_id if any(a.get("id") == active_id for a in new_accounts) else new_accounts[0]["id"]
        return cls.save_raw_data(uid, new_accounts, new_active, user_base_dir_fn, fernet_instance)

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
        return cls.save_user_config(uid, cfg, user_base_dir_fn, fernet_instance)

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
        fernet_instance = None
    ) -> Tuple[bool, str]:
        """
        Bộ điều phối tín hiệu chiến lược từ Bot sang tài khoản Quỹ TradeLocker (E8 Markets)
        Tích hợp đầy đủ Cầu Dao An Toàn (Circuit Breaker) và Tự Động Tính Lot Size.
        Chạy ĐỘC LẬP: Chỉ đặt lệnh khi bot Quỹ FX đang BẬT (is_bot_running=True).
        """
        if not user_base_dir_fn:
            user_base_dir_fn = cls._get_default_user_base_dir
        if not fernet_instance:
            fernet_instance = cls._get_default_fernet()

        cfg = cls.load_user_config(uid, user_base_dir_fn, fernet_instance)
        if not cfg or not cfg.get("is_enabled", True):
            return False, "TradeLocker chưa được kích hoạt hoặc chưa kết nối"

        # 🛑 KIỂM TRA TRẠNG THÁI CHẠY BOT QUỸ FX:
        if not cfg.get("is_bot_running", False):
            return False, "Bot Quỹ FX đang DỪNG — Bỏ qua đặt lệnh Quỹ"

        # Kiểm tra mã giao dịch có được bật đánh Quỹ không
        enabled_syms = cfg.get("enabled_symbols", ["XAU", "BTC", "ETH"])
        clean_base = symbol.upper().replace("-", "").replace("_", "").replace("USDT", "").replace("USD", "").replace("SWAP", "")
        if clean_base not in [s.upper() for s in enabled_syms]:
            return False, f"Mã {symbol} ({clean_base}) không nằm trong danh sách bật trade quỹ"

        client = cls.get_client(uid, user_base_dir_fn, fernet_instance)
        if not client:
            return False, "Không khởi tạo được TradeLocker client"

        # Giám sát Cầu dao bảo vệ tài khoản Quỹ (Circuit Breaker)
        ok_state, state, _ = client.get_account_state()
        if ok_state:
            fund_size = float(cfg.get("fund_size", 5000.0))
            equity = float(state.get("equity", fund_size))
            
            # 1. Chặn Static Drawdown (8%)
            loss_level = fund_size - (fund_size * 0.08)
            if equity <= loss_level:
                return False, f"🚨 CẦU DAO KÍCH HOẠT: Equity (${equity:.2f}) chạm ngưỡng vi phạm Static Drawdown (${loss_level:.2f})!"

            # 2. Chặn Daily Drawdown (2.5%) - Tự ngắt sớm ở 80% mốc lỗ ngày để bảo vệ an toàn tuyệt đối
            daily_loss_limit = float(cfg.get("daily_drawdown_limit", 125.0))
            current_loss = fund_size - equity
            if current_loss >= daily_loss_limit * 0.8:
                return False, f"🚨 CẦU DAO KÍCH HOẠT: Mức lỗ hiện tại (${current_loss:.2f}) tiệm cận ngưỡng Daily Drawdown (${daily_loss_limit:.2f})!"

            # 3. Chốt lãi trần ngày (Daily Profit Cap)
            daily_profit_cap = float(cfg.get("daily_profit_cap", 100.0))
            profit = equity - fund_size
            if profit >= daily_profit_cap * 0.95:
                return False, f"⏳ CẦU DAO CHỐT LÃI: Đã đạt trần lãi ngày (${profit:.2f} / ${daily_profit_cap:.2f}), bảo toàn kết quả thi."

        # Tính Lot Size theo Risk
        risk_usd = float(cfg.get("risk_per_trade", 25.0))
        fallback_sl = (price * 0.99) if side.lower() in ("buy", "long") else (price * 1.01)
        lot = client.calculate_lot(clean_base, risk_usd=risk_usd, entry_price=price, sl_price=sl_price or fallback_sl)

        # Khi Quỹ FX bot đang chạy (is_bot_running == True), luôn đặt lệnh thật lên sàn TradeLocker
        # (Không bị ảnh hưởng bởi cờ dry_run của sàn OKX)
        if dry_run and not cfg.get("is_bot_running", False):
            print(f"🌑 [DRY-RUN TradeLocker] Bỏ qua đặt lệnh thật (Shadow Mode): {side.upper()} {lot} Lot {clean_base}")
            return True, f"Chế độ Shadow Mode (Dry-run): Sẽ đặt {side.upper()} {lot} Lot {clean_base}"

        order_type = "limit" if price and price > 0 else "market"
        # Nếu là lệnh Limit, hủy các lệnh Limit chờ cũ của mã này trước khi đặt lệnh mới
        if order_type == "limit":
            try:
                inst_info = client.resolve_instrument(clean_base)
                if inst_info:
                    client.cancel_all_orders(tradable_instrument_id=inst_info.get("tradableInstrumentId"))
            except Exception:
                pass

        # Đặt lệnh sang TradeLocker
        ok, res, msg = client.place_order(
            symbol=clean_base,
            side=side,
            qty=lot,
            order_type=order_type,
            price=price,
            stop_loss=sl_price,
            take_profit=tp_price
        )
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
        dry_run: bool = False
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
                    dry_run=dry_run
                )
                if ok:
                    print(f"🏆 [TRADELOCKER E8 DISPATCH] {msg}", flush=True)
                else:
                    if "chưa được kích hoạt" not in msg and "không nằm trong danh sách" not in msg:
                        print(f"⚠️ [TRADELOCKER E8 DISPATCH THẤT BẠI]: {msg}", flush=True)
            except Exception as e:
                print(f"⚠️ [TRADELOCKER E8 DISPATCH LỖI]: {e}", flush=True)

        t = threading.Thread(target=_worker, daemon=True, name="TL_Dispatch_Worker")
        t.start()
