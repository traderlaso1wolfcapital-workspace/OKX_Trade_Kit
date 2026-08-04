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

# I will use grep on the env file directly to extract it since I can't read it normally if I don't know the path. Wait, I can find the env path.
