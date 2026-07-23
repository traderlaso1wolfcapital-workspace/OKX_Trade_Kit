from typing import Any
from decimal import Decimal
import base64
import hashlib
import hmac
import json
import time
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

    def request(self, method: str, path: str, params: dict | None = None, body: list | dict | None = None, max_retries: int = 3) -> dict[str, Any]:
        last_err = None
        for attempt in range(max_retries):
            try:
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
                if resp.status_code == 429:
                    last_err = RuntimeError(f"HTTP 429 Rate Limit — retry {attempt+1}/{max_retries}")
                    time.sleep(1)
                    continue
                resp.raise_for_status()
                res_json = resp.json()
                if res_json.get("code") != "0":
                    err_code = res_json.get("code", "")
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
                    if err_code in ("50011", "50026"):
                        last_err = RuntimeError(f"OKX Rate Limit [{err_code}]: {err_msg} — retry {attempt+1}/{max_retries}")
                        time.sleep(1)
                        continue
                    raise RuntimeError(f"OKX Error [{err_code}]: {err_msg}")
                return res_json
            except (requests.exceptions.RequestException, json.JSONDecodeError, ValueError) as e:
                last_err = e
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                raise
        raise last_err if last_err else RuntimeError("OKX request failed after max retries")

    def fetch_positions(self, inst_id: str) -> list[dict]:
        return self.request("GET", "/api/v5/account/positions", params={"instType": "SWAP", "instId": inst_id})["data"]

    def fetch_spec(self, inst_id: str) -> dict[str, Decimal]:
        spec = self.request("GET", "/api/v5/public/instruments", params={"instType": "SWAP", "instId": inst_id})["data"][0]
        return {"ctVal": Decimal(spec["ctVal"]), "tickSz": Decimal(spec["tickSz"]), "lotSz": Decimal(spec["lotSz"]), "minSz": Decimal(spec["minSz"])}

# ==============================================================================
import aiohttp
import asyncio

class AsyncOKXRestCore(OKXRestCore):
    def __init__(self, api_key: str, secret: str, passphrase: str, is_demo: bool = False):
        super().__init__(api_key, secret, passphrase, is_demo)
        self.session = None

    async def init_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5))

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()

    async def request(self, method: str, path: str, params: dict | None = None, body: list | dict | None = None, max_retries: int = 3) -> dict[str, Any]:
        last_err = None
        for attempt in range(max_retries):
            try:
                await self.init_session()
                url = self.BASE_URL + path
                body_str = json.dumps(body) if body else ""
                if method.upper() == "GET" and params:
                    full_path = f"{path}?{'&'.join(f'{k}={v}' for k, v in params.items() if v is not None)}"
                    url = self.BASE_URL + full_path
                else: full_path = path
                
                async with self.session.request(
                    method, url, headers=self._make_headers(method, full_path, body_str), 
                    data=body_str if body and method.upper() != "GET" else None
                ) as resp:
                    if resp.status == 429:
                        last_err = RuntimeError(f"HTTP 429 Rate Limit — retry {attempt+1}/{max_retries}")
                        await asyncio.sleep(1)
                        continue
                    resp.raise_for_status()
                    res_json = await resp.json()
                    if res_json.get("code") != "0":
                        err_code = res_json.get("code", "")
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
                        if err_code in ("50011", "50026"):
                            last_err = RuntimeError(f"OKX Rate Limit [{err_code}]: {err_msg} — retry {attempt+1}/{max_retries}")
                            await asyncio.sleep(1)
                            continue
                        raise RuntimeError(f"OKX Error [{err_code}]: {err_msg}")
                    return res_json
            except (asyncio.TimeoutError, aiohttp.ClientError, json.JSONDecodeError, ValueError) as e:
                last_err = e
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                raise
        raise last_err if last_err else RuntimeError("OKX async request failed after max retries")

    async def fetch_positions(self, inst_id: str) -> list[dict]:
        res = await self.request("GET", "/api/v5/account/positions", params={"instType": "SWAP", "instId": inst_id})
        return res["data"]

    async def fetch_spec(self, inst_id: str) -> dict[str, Decimal]:
        res = await self.request("GET", "/api/v5/public/instruments", params={"instType": "SWAP", "instId": inst_id})
        spec = res["data"][0]
        return {"ctVal": Decimal(spec["ctVal"]), "tickSz": Decimal(spec["tickSz"]), "lotSz": Decimal(spec["lotSz"]), "minSz": Decimal(spec["minSz"])}
