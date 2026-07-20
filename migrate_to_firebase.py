import urllib.request
import csv
import json

GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
FIREBASE_URL = "https://botvip-e5772-default-rtdb.asia-southeast1.firebasedatabase.app"

def migrate():
    print("Đang tải dữ liệu từ Google Sheets...")
    req = urllib.request.Request(GOOGLE_SHEET_CSV_URL, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read().decode('utf-8')
    except Exception as e:
        print(f"Lỗi tải Google Sheets: {e}")
        return

    reader = csv.reader(content.splitlines())
    next(reader, None) # Bỏ qua dòng tiêu đề
    
    users = {}
    count = 0
    for row in reader:
        if row and len(row) >= 2 and row[0].strip().isdigit():
            uid_str = row[0].strip()
            discord_id = row[1].strip() if len(row) > 1 else ""
            nickname = row[2].strip() if len(row) > 2 else ""
            hwid = row[3].strip() if len(row) > 3 else ""
            
            # Xử lý chuỗi rỗng và giá trị "None"
            if hwid.lower() == "none":
                hwid = ""
                
            users[uid_str] = {
                "discord_id": discord_id,
                "nickname": nickname,
                "hwid": hwid
            }
            count += 1
            
    print(f"Đã đọc được {count} UID từ Google Sheets.")
    print("Đang tải lên Firebase...")
    
    # Upload to Firebase using PUT request to /users.json
    upload_url = f"{FIREBASE_URL}/users.json"
    data = json.dumps(users).encode('utf-8')
    
    upload_req = urllib.request.Request(upload_url, data=data, method='PUT', headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(upload_req, timeout=15) as response:
            print("✅ Tải lên thành công! Toàn bộ dữ liệu đã nằm trên Firebase.")
    except Exception as e:
        print(f"❌ Lỗi tải lên Firebase: {e}")

if __name__ == "__main__":
    migrate()
