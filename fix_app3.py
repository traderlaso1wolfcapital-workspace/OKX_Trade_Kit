import sys
import re

path = r'd:\4. Trade Coin - TLS1\4. Cursor - IDE\TLS1_Company\zProjects\OKX_Trade_Kit\web_app\frontend\src\App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

helper = """  const availableAccountsForTab = accounts.filter(acc => {
    return !Object.entries(activeBotAccounts).some(([bot, accountId]) => {
      return bot !== activeBotTab && accountId === acc.id;
    });
  });
  const getEffectiveAccount = () => {
    if (botAccountMap[activeBotTab] && availableAccountsForTab.some(a => a.id === botAccountMap[activeBotTab])) {
      return botAccountMap[activeBotTab];
    }
    return availableAccountsForTab.length > 0 ? availableAccountsForTab[0].id : "";
  };
  const effectiveAccId = getEffectiveAccount();
"""

insertion_point = """  const [botAccountMap, setBotAccountMap] = useState(() => {
    const saved = localStorage.getItem("tls1_bot_accounts");
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return {};
  });"""

if 'const effectiveAccId' not in content:
    content = content.replace(insertion_point, insertion_point + "\n" + helper)

# Fallbacks
target_fallback = 'botAccountMap[activeBotTab] || (accounts.length > 0 ? accounts[0].id : "")'
content = content.replace(target_fallback, 'effectiveAccId')

# Fix fetchPositions definition again because my previous script overrode it! Wait! Did it?
# In fix_app2.py I updated fetchPositions to use effectiveAccId but it was already using it? 
# No, wait, earlier I checked and `fetchPositions` was already using effectiveAccId! But wait, how could it use effectiveAccId if effectiveAccId was NOT DEFINED?!
# Ah! When I reverted `App.jsx`, I lost the definition of `effectiveAccId`, but maybe my `fix_app2.py` didn't restore it! So it was throwing ReferenceError!
# Let's ensure this script runs perfectly.

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied effectiveAccId fixes via python script")
