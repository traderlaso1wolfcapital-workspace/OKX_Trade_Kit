import requests
try:
    ip = requests.get("https://api.ipify.org", timeout=5).text.strip()
    print("IP:", ip)
except Exception as e:
    print("Error:", e)
