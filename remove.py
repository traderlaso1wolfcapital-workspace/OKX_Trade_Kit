import re

fpath = r'd:\4. Trade Coin - TLS1\4. Cursor - IDE\TLS1_Company\zProjects\OKX_Trade_Kit\web_app\frontend\src\App.jsx'
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

target = r'''                <div style={{ textAlign: "center", marginTop: "5px", marginBottom: "-5px" }}>\n                  <button onClick={() => setIsRiskCollapsed(!isRiskCollapsed)} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "14px", padding: "0 15px" }}>\n                    {isRiskCollapsed \? "▼" : "▲"}\n                  </button>\n                </div>\n'''
new_content = re.sub(target, '', content)

if content != new_content:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Removed")
else:
    print("Not found")
