# -*- coding: utf-8 -*-
"""
TLS1 Company - MetaTrader 5 (MT5) Hub Service
Dịch vụ Quản lý & Kết nối MT5 tập trung qua Python API
Hỗ trợ cắm chung nhiều tài khoản Quỹ (E8 Markets, The 5%ers, FTMO) trên 1 VPS Windows.
"""

import os
import sys
import time
import json
import logging
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from decimal import Decimal

# Khởi tạo logger
logger = logging.getLogger("TLS1_MT5_Service")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s][MT5_HUB] %(message)s", datefmt="%H:%M:%S"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Kiểm tra thư viện MetaTrader5
MT5_AVAILABLE = False
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    mt5 = None
    logger.warning("Thư viện MetaTrader5 chưa được cài đặt. MT5 Service sẽ chạy ở chế độ Mô phỏng / Mock.")

class MT5Client:
    """
    Quản lý phiên làm việc của 1 tài khoản MT5 cụ thể qua Python API.
    Hỗ trợ kết nối, kiểm tra số dư, quản lý vị thế và đặt lệnh cho Quỹ FX.
    """
    def __init__(self, login: int, password: str, server: str, path: Optional[str] = None):
        self.login = int(login)
        self.password = str(password).strip()
        self.server = str(server).strip()
        self.path = path  # Đường dẫn tới terminal64.exe (nếu dùng multi-instance)
        self.is_connected = False
        self.account_info: Dict[str, Any] = {}
        self.last_sync_time = 0
        self._lock = threading.Lock()

    def connect(self) -> Tuple[bool, str]:
        """Khởi tạo và đăng nhập vào terminal MT5"""
        if not MT5_AVAILABLE:
            self.is_connected = True
            self.account_info = {
                "login": self.login,
                "server": self.server,
                "balance": 5000.0,
                "equity": 5000.0,
                "currency": "USD",
                "leverage": 100,
                "company": "Mock MT5 Server"
            }
            return True, "Kết nối MT5 thành công (Chế độ mô phỏng)"

        with self._lock:
            try:
                # 1. Khởi tạo terminal MT5
                init_params = {"portable": True} if self.path else {}
                if self.path and os.path.exists(self.path):
                    init_ok = mt5.initialize(self.path, **init_params)
                else:
                    init_ok = mt5.initialize()

                if not init_ok:
                    err = mt5.last_error()
                    return False, f"Không thể khởi động Terminal MT5: {err}"

                # 2. Đăng nhập vào tài khoản Quỹ
                login_ok = mt5.login(login=self.login, password=self.password, server=self.server)
                if not login_ok:
                    err = mt5.last_error()
                    return False, f"Đăng nhập MT5 thất bại (Mã lỗi {err[0]}): {err[1]}. Vui lòng kiểm tra lại Số tài khoản, Mật khẩu và Máy chủ!"

                # 3. Lấy thông tin tài khoản
                info = mt5.account_info()
                if info is None:
                    return False, "Đăng nhập thành công nhưng không lấy được Account Info!"

                self.account_info = {
                    "login": info.login,
                    "server": info.server,
                    "balance": float(info.balance),
                    "equity": float(info.equity),
                    "profit": float(info.profit),
                    "margin": float(info.margin),
                    "margin_free": float(info.margin_free),
                    "margin_level": float(info.margin_level) if info.margin > 0 else 0.0,
                    "currency": info.currency,
                    "leverage": info.leverage,
                    "company": info.company,
                    "name": info.name
                }
                self.is_connected = True
                self.last_sync_time = time.time()
                logger.info(f"✅ Đã kết nối MT5 #{self.login} trên Server [{self.server}] | Balance: ${info.balance} {info.currency}")
                return True, "Kết nối MT5 thành công"
            except Exception as e:
                logger.error(f"Lỗi ngoại lệ khi kết nối MT5 #{self.login}: {e}")
                return False, f"Lỗi kết nối MT5: {e}"

    def ensure_active(self) -> bool:
        """Đảm bảo tài khoản này đang active trên MT5"""
        if not MT5_AVAILABLE:
            return True
        with self._lock:
            try:
                info = mt5.account_info()
                if info and info.login == self.login:
                    return True
                # Nếu đang là tài khoản khác, switch login sang tài khoản này
                return mt5.login(login=self.login, password=self.password, server=self.server)
            except:
                return False

    def get_positions(self) -> List[Dict[str, Any]]:
        """Lấy danh sách vị thế đang mở của tài khoản MT5"""
        if not MT5_AVAILABLE:
            return []

        if not self.ensure_active():
            return []

        with self._lock:
            try:
                positions = mt5.positions_get()
                if positions is None:
                    return []

                res = []
                for p in positions:
                    side = "BUY" if p.type == mt5.ORDER_TYPE_BUY else "SELL"
                    res.append({
                        "id": str(p.ticket),
                        "ticket": p.ticket,
                        "symbol": p.symbol,
                        "side": side,
                        "volume": float(p.volume),
                        "price": float(p.price_open),
                        "price_current": float(p.price_current),
                        "sl": float(p.sl) if p.sl else None,
                        "tp": float(p.tp) if p.tp else None,
                        "profit": float(p.profit),
                        "swap": float(p.swap),
                        "time": datetime.fromtimestamp(p.time, timezone.utc).isoformat(),
                        "comment": p.comment,
                        "platform": "MT5"
                    })
                return res
            except Exception as e:
                logger.error(f"Lỗi lấy vị thế MT5 #{self.login}: {e}")
                return []

    def get_orders(self) -> List[Dict[str, Any]]:
        """Lấy danh sách lệnh chờ Pending Limit/Stop của tài khoản MT5"""
        if not MT5_AVAILABLE:
            return []

        if not self.ensure_active():
            return []

        with self._lock:
            try:
                orders = mt5.orders_get()
                if orders is None:
                    return []

                res = []
                for o in orders:
                    # Phân loại lệnh chờ
                    order_type_str = "PENDING"
                    side = "BUY"
                    if o.type == mt5.ORDER_TYPE_BUY_LIMIT:
                        order_type_str = "BUY_LIMIT"
                        side = "BUY"
                    elif o.type == mt5.ORDER_TYPE_SELL_LIMIT:
                        order_type_str = "SELL_LIMIT"
                        side = "SELL"
                    elif o.type == mt5.ORDER_TYPE_BUY_STOP:
                        order_type_str = "BUY_STOP"
                        side = "BUY"
                    elif o.type == mt5.ORDER_TYPE_SELL_STOP:
                        order_type_str = "SELL_STOP"
                        side = "SELL"

                    res.append({
                        "id": str(o.ticket),
                        "ticket": o.ticket,
                        "symbol": o.symbol,
                        "side": side,
                        "order_type": order_type_str,
                        "volume": float(o.volume_current),
                        "price": float(o.price_open),
                        "sl": float(o.sl) if o.sl else None,
                        "tp": float(o.tp) if o.tp else None,
                        "is_limit": True,
                        "status": "Pending Limit",
                        "time": datetime.fromtimestamp(o.time_setup, timezone.utc).isoformat(),
                        "comment": o.comment,
                        "platform": "MT5"
                    })
                return res
            except Exception as e:
                logger.error(f"Lỗi lấy lệnh chờ MT5 #{self.login}: {e}")
                return []

    def send_market_order(self, symbol: str, action: str, volume: float, sl: Optional[float] = None, tp: Optional[float] = None, comment: str = "TLS1 Bot") -> Tuple[bool, str, Optional[int]]:
        """
        Bắn lệnh thị trường (BUY / SELL) trực tiếp vào MT5
        """
        if not MT5_AVAILABLE:
            logger.info(f"[MOCK MT5] Đặt lệnh {action} {symbol} Lot: {volume} SL: {sl} TP: {tp}")
            return True, "Lệnh đặt thành công (Mô phỏng)", 999999

        if not self.ensure_active():
            return False, "Không thể kích hoạt phiên MT5 của tài khoản này", None

        with self._lock:
            try:
                # 1. Chuẩn hóa tên Symbol trên MT5 (ví dụ XAUUSD, XAUUSD.raw, XAUUSDm, BTCUSD...)
                target_symbol = self._resolve_symbol(symbol)
                if not target_symbol:
                    return False, f"Không tìm thấy cặp {symbol} trên máy chủ MT5!", None

                # Đảm bảo symbol đã được thêm vào Market Watch
                if not mt5.symbol_select(target_symbol, True):
                    return False, f"Không thể chọn symbol {target_symbol} vào Market Watch", None

                tick = mt5.symbol_info_tick(target_symbol)
                if tick is None:
                    return False, f"Không lấy được giá thị trường của {target_symbol}", None

                is_buy = action.upper() in ["BUY", "LONG"]
                order_type = mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL
                price = tick.ask if is_buy else tick.bid

                # 2. Xây dựng Request chuẩn MetaTrader 5
                request = {
                    "action": mt5.TRADE_ACTION_DEAL,
                    "symbol": target_symbol,
                    "volume": float(volume),
                    "type": order_type,
                    "price": price,
                    "deviation": 20,
                    "magic": 100701,  # TLS1 Magic Number nhận diện
                    "comment": str(comment)[:31],
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": mt5.ORDER_FILLING_IOC,
                }
                if sl is not None and sl > 0:
                    request["sl"] = float(sl)
                if tp is not None and tp > 0:
                    request["tp"] = float(tp)

                # 3. Gửi lệnh
                result = mt5.order_send(request)
                if result is None:
                    err = mt5.last_error()
                    return False, f"order_send trả về None: {err}", None

                if result.retcode != mt5.TRADE_RETCODE_DONE:
                    return False, f"MT5 từ chối lệnh (RetCode {result.retcode}): {result.comment}", None

                logger.info(f"🎯 [MT5 SUCCESS] Đã mở lệnh #{result.order} {action} {volume} lot {target_symbol} @ {price}")
                return True, f"Khớp lệnh MT5 thành công #{result.order}", result.order
            except Exception as e:
                logger.error(f"Lỗi khi gửi lệnh MT5: {e}")
                return False, f"Ngoại lệ khi gửi lệnh MT5: {e}", None

    def close_position(self, ticket: int) -> Tuple[bool, str]:
        """Đóng vị thế MT5 theo Ticket"""
        if not MT5_AVAILABLE:
            return True, f"Đã đóng lệnh #{ticket} (Mô phỏng)"

        if not self.ensure_active():
            return False, "Không thể kích hoạt phiên MT5"

        with self._lock:
            try:
                positions = mt5.positions_get(ticket=ticket)
                if not positions or len(positions) == 0:
                    return False, f"Không tìm thấy vị thế #{ticket} trên MT5"

                pos = positions[0]
                tick = mt5.symbol_info_tick(pos.symbol)
                if tick is None:
                    return False, f"Không lấy được giá {pos.symbol}"

                is_buy = (pos.type == mt5.ORDER_TYPE_BUY)
                close_type = mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY
                close_price = tick.bid if is_buy else tick.ask

                req = {
                    "action": mt5.TRADE_ACTION_DEAL,
                    "position": ticket,
                    "symbol": pos.symbol,
                    "volume": pos.volume,
                    "type": close_type,
                    "price": close_price,
                    "deviation": 20,
                    "magic": 100701,
                    "comment": "TLS1 Close",
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": mt5.ORDER_FILLING_IOC,
                }
                res = mt5.order_send(req)
                if res and res.retcode == mt5.TRADE_RETCODE_DONE:
                    return True, f"Đã đóng vị thế #{ticket}"
                return False, f"Lỗi đóng vị thế: {res.comment if res else mt5.last_error()}"
            except Exception as e:
                return False, f"Lỗi đóng vị thế MT5: {e}"

    def _resolve_symbol(self, raw_symbol: str) -> Optional[str]:
        """
        Tự động tìm kiếm mã giao dịch phù hợp trên sàn MT5
        Ví dụ: XAU -> XAUUSD, XAUUSD.raw, XAUUSDm, GOLD...
        """
        if not MT5_AVAILABLE:
            return raw_symbol

        clean = raw_symbol.upper().replace("/", "").replace("-", "")
        # Các biến thể thường gặp
        candidates = [clean]
        if "XAU" in clean or "GOLD" in clean:
            candidates.extend(["XAUUSD", "XAUUSD.raw", "XAUUSDm", "XAUUSD+", "GOLD"])
        elif "BTC" in clean:
            candidates.extend(["BTCUSD", "BTCUSD.raw", "BTCUSDm", "BTCUSDT"])
        elif "ETH" in clean:
            candidates.extend(["ETHUSD", "ETHUSD.raw", "ETHUSDm", "ETHUSDT"])
        elif "EUR" in clean and "USD" in clean:
            candidates.extend(["EURUSD", "EURUSD.raw", "EURUSDm", "EURUSD+"])

        all_symbols = mt5.symbols_get()
        if not all_symbols:
            return candidates[0]

        available = {s.name.upper(): s.name for s in all_symbols}
        for cand in candidates:
            if cand.upper() in available:
                return available[cand.upper()]

        # Tìm kiếm mờ (Fuzzy search)
        for name_up, orig_name in available.items():
            if clean in name_up:
                return orig_name

        return candidates[0]

class MT5HubManager:
    """
    Trình điều phối trung tâm trên VPS Windows:
    Quản lý hàng loạt tài khoản MT5 của các khách hàng khác nhau.
    """
    _clients: Dict[str, MT5Client] = {}
    _lock = threading.Lock()

    @classmethod
    def get_or_create_client(cls, login: int, password: str, server: str) -> MT5Client:
        key = f"{server}_{login}"
        with cls._lock:
            if key not in cls._clients:
                cls._clients[key] = MT5Client(login=login, password=password, server=server)
            return cls._clients[key]

    @classmethod
    def dispatch_bot_signal(cls, login: int, password: str, server: str, symbol: str, side: str, risk_usd: float = 25.0, fixed_lot: float = 0.01, sl_price: Optional[float] = None, tp_price: Optional[float] = None, comment: str = "TLS1 Bot") -> Tuple[bool, str]:
        """
        Nhận tín hiệu từ Engine Bot TLS1 -> Tự động tính Lot an toàn -> Bắn vào MT5 của khách
        """
        client = cls.get_or_create_client(login, password, server)
        if not client.is_connected:
            ok, msg = client.connect()
            if not ok:
                return False, f"Không thể kết nối tài khoản MT5 #{login}: {msg}"

        # 1. Tính toán Lot tối ưu
        lot = fixed_lot if fixed_lot and fixed_lot > 0 else 0.01

        # 2. Gửi lệnh
        ok, msg, order_id = client.send_market_order(
            symbol=symbol,
            action=side,
            volume=lot,
            sl=sl_price,
            tp=tp_price,
            comment=comment
        )
        return ok, msg
