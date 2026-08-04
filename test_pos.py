import requests
import json
import time
import hmac
import base64
import os
from datetime import datetime, timezone

def sign_request(secret_key, timestamp, method, request_path, body=""):
    message = str(timestamp) + str(method.upper()) + str(request_path) + str(body)
    mac = hmac.new(bytes(secret_key, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod='sha256')
    return base64.b64encode(mac.digest()).decode('utf-8')

api_key = ""
secret_key = ""
passphrase = ""

# I will find the active env from global config
import json
with open("/Users/tiodev/Desktop/OKX_Trade_Kit/global_config.json") as f:
    g = json.load(f)
    print("global config:", g)

# I can just read it from the App_Release/.env since I can't find it easily without checking the app logic
with open("/Users/tiodev/Desktop/OKX_Trade_Kit/TLS1_Trading_App/App_Release/.env", "r") as f:
    for line in f:
        if "=" in line:
            k, v = line.strip().split("=", 1)
            v = v.strip("\"'")
            if k == "OKX_API_KEY": api_key = v
            elif k == "OKX_SECRET_KEY": secret_key = v
            elif k == "OKX_PASSPHRASE": passphrase = v

base_url = "https://www.okx.com"

# test position
path_pos = "/api/v5/account/positions?instType=SWAP"
ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
headers_pos = {
    "OK-ACCESS-KEY": api_key,
    "OK-ACCESS-SIGN": sign_request(secret_key, ts, "GET", path_pos),
    "OK-ACCESS-TIMESTAMP": ts,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "x-simulated-trading": "1"
}

res_pos = requests.get(base_url + path_pos, headers=headers_pos, timeout=5).json()
print("Positions Response:", json.dumps(res_pos, indent=2))
