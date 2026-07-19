from typing import Any
from decimal import Decimal
import base64
import hashlib
import hmac
import json
import requests
from datetime import datetime, timezone

# ==============================================================================
class OKXRestCore:
    def __init__(self, api_key: str, secret: str, passphrase: str, is_demo: bool = False):
        self.api_key = api_key
        self.secret = secret
        self.passphrase = passphrase
        self.is_demo = is_demo
        self.BASE_URL = "https://www.okx.com"

    def _make_headers(self, method: str, path: str, body: str = "") -> dict[str, str]:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        payload = ts + method.upper() + path + body
        sig = base64.b64encode(hmac.new(self.secret.encode(), payload.encode(), hashlib.sha256).digest()).decode()
        headers = {
            "OK-ACCESS-KEY": self.api_key, 
            "OK-ACCESS-SIGN": sig, 
            "OK-ACCESS-TIMESTAMP": ts, 
            "OK-ACCESS-PASSPHRASE": self.passphrase, 
            "Content-Type": "application/json"
        }
        if self.is_demo:
            headers["x-simulated-trading"] = "1"
        return headers

    def request(self, method: str, path: str, params: dict | None = None, body: dict | None = None) -> dict[str, Any]:
        url = self.BASE_URL + path
        body_str = json.dumps(body) if body else ""
        if method.upper() == "GET" and params:
            full_path = f"{path}?{'&'.join(f'{k}={v}' for k, v in params.items() if v is not None)}"
            url = self.BASE_URL + full_path
        else: full_path = path
        resp = requests.request(
            method, url, headers=self._make_headers(method, full_path, body_str), 
            data=body_str if body and method.upper() != "GET" else None, timeout=5
        )
        resp.raise_for_status()
        res_json = resp.json()
        if res_json.get("code") != "0": 
            err_msg = res_json.get("msg", "")
            if "data" in res_json and res_json["data"]:
                details = []
                for item in res_json["data"]:
                    s_code = item.get("sCode", "0")
                    s_msg = item.get("sMsg", "")
                    if s_code != "0" and s_code != "":
                        details.append(f"({s_code}: {s_msg})")
                if details:
                    err_msg += " Details: " + "; ".join(details)
            raise RuntimeError(f"OKX Error [{res_json.get('code')}]: {err_msg}")
        return res_json

    def fetch_positions(self, inst_id: str) -> list[dict]:
        return self.request("GET", "/api/v5/account/positions", params={"instType": "SWAP", "instId": inst_id})["data"]

    def fetch_spec(self, inst_id: str) -> dict[str, Decimal]:
        spec = self.request("GET", "/api/v5/public/instruments", params={"instType": "SWAP", "instId": inst_id})["data"][0]
        return {"ctVal": Decimal(spec["ctVal"]), "tickSz": Decimal(spec["tickSz"]), "lotSz": Decimal(spec["lotSz"]), "minSz": Decimal(spec["minSz"])}

