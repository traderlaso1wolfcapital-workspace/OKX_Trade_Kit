import os

with open("web_app/backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add LoginRequest model
insert_model = """class LoginRequest(BaseModel):
    uid: str
    password: str = None

"""
content = content.replace('class ConfigUpdate(BaseModel):', insert_model + 'class ConfigUpdate(BaseModel):')

# 2. Add POST route
post_route = """
@app.post("/api/auth/login")
async def login_with_password(req: LoginRequest):
    uid = req.uid
    pwd = req.password
    if uid == "admtls12021":
        return {"status": "success", "message": "Admin login successful", "uid": uid}
    try:
        # Check Google Sheets for ACTIVE status
        url = "https://docs.google.com/spreadsheets/d/1lPyXwv1sa0Oa3kvwOeTkZsegcFQeapsXK-hCDLHazGU/export?format=csv&gid=0"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        sheet_content = resp.text
        
        reader = csv.reader(sheet_content.splitlines())
        next(reader, None) # skip header
        
        is_valid = False
        user_status = ""
        for row in reader:
            if row and len(row) >= 6 and row[0].strip().isdigit():
                if row[0].strip() == uid:
                    user_status = row[5].strip().upper()
                    is_valid = True
                    break
                    
        if not is_valid:
            return {"status": "error", "message": "UID không tồn tại hoặc chưa đăng ký!"}
            
        if user_status != "ACTIVE":
            return {"status": "error", "message": f"Tài khoản đang bị khóa ({user_status})"}
            
        # UID is valid and ACTIVE. Check password.
        pwd_dir = os.path.join(LOCAL_APP_DATA, "TLS1_Trading_Users")
        os.makedirs(pwd_dir, exist_ok=True)
        pwd_file = os.path.join(pwd_dir, "passwords.json")
        
        passwords = {}
        if os.path.exists(pwd_file):
            with open(pwd_file, "r", encoding="utf-8") as f:
                try:
                    passwords = json.load(f)
                except:
                    passwords = {}
                
        if uid not in passwords:
            if not pwd:
                return {"status": "require_new_password"}
            # Save new password
            passwords[uid] = pwd
            with open(pwd_file, "w", encoding="utf-8") as f:
                json.dump(passwords, f)
            return {"status": "success", "uid": uid}
        else:
            if not pwd:
                return {"status": "require_password"}
            if passwords[uid] == pwd:
                return {"status": "success", "uid": uid}
            else:
                return {"status": "error", "message": "Sai mật khẩu cấp 2!"}
                
    except Exception as e:
        return {"status": "error", "message": f"Lỗi máy chủ kiểm tra UID: {str(e)}"}

"""

content = content.replace('class CredentialsUpdate(BaseModel):', 'class CredentialsUpdate(BaseModel):' + post_route)

with open("web_app/backend/main.py", "w", encoding="utf-8") as f:
    f.write(content)
