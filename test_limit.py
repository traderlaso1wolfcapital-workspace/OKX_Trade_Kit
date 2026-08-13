import requests
res = requests.get("https://www.okx.com/api/v5/market/candles?instId=BTC-USDT-SWAP&bar=4H&limit=1500")
print(res.status_code)
print(res.text)
