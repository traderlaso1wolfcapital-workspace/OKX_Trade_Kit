import json
import time
import hmac
import base64
import os
import urllib.request
from dotenv import load_dotenv

# Use the OKX_Trade_Kit root env if it exists, or user config
load_dotenv(".env")
API_KEY = os.getenv("OKX_API_KEY")
SECRET_KEY = os.getenv("OKX_SECRET_KEY")
PASSWORD = os.getenv("OKX_PASSWORD")

if not API_KEY:
    print("No API key found in .env, checking .agents/TLS1_Trading_App/App_Release/.env")
    load_dotenv(".agents/TLS1_Trading_App/App_Release/.env")
    API_KEY = os.getenv("OKX_API_KEY")
    SECRET_KEY = os.getenv("OKX_SECRET_KEY")
    PASSWORD = os.getenv("OKX_PASSWORD")

def get_okx_positions():
    if not API_KEY: return "NO API KEY"
    timestamp = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    method = 'GET'
    request_path = '/api/v5/account/positions'
    message = timestamp + method + request_path
    mac = hmac.new(bytes(SECRET_KEY, encoding='utf8'), bytes(message, encoding='utf-8'), digestmod='sha256')
    sign = base64.b64encode(mac.digest()).decode('utf-8')

    req = urllib.request.Request("https://www.okx.com" + request_path)
    req.add_header('OK-ACCESS-KEY', API_KEY)
    req.add_header('OK-ACCESS-SIGN', sign)
    req.add_header('OK-ACCESS-TIMESTAMP', timestamp)
    req.add_header('OK-ACCESS-PASSPHRASE', PASSWORD)
    req.add_header('Content-Type', 'application/json')
    try:
        res = urllib.request.urlopen(req)
        return json.loads(res.read())
    except Exception as e:
        return str(e)

print(json.dumps(get_okx_positions(), indent=2))
