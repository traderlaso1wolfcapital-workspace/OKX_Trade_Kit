    const handleCallback = async () => {
      if (window.location.pathname === "/okx-callback") {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const stateParam = urlParams.get("state");
        const errorParam = urlParams.get("error");
        const errorMsg = urlParams.get("error_msg");
        
        let callbackUid = currentUid;
        let callbackAcc = effectiveAccId;
        let callbackStrat = activeBotTab || "sub1";
        
        if (stateParam) {
           try {
              // stateParam might already be decoded by URLSearchParams
              const decodedState = decodeURIComponent(stateParam);
              const parsedState = JSON.parse(decodedState);
              if (parsedState.uid) callbackUid = parsedState.uid;
              if (parsedState.acc) callbackAcc = parsedState.acc;
              if (parsedState.strat) callbackStrat = parsedState.strat;
           } catch (e) {
              console.error("Failed to parse state", e);
              alert("Lỗi đọc dữ liệu trạng thái OKX. Vui lòng thử lại.\nChi tiết: " + e.message);
           }
        }

        if (errorParam) {
           alert("❌ OKX từ chối kết nối: " + (errorMsg || errorParam));
           window.history.replaceState({}, document.title, "/");
           return;
        }

        if (code && callbackUid) {
          try {
            let acc = callbackAcc;
            const strat = callbackStrat;

            if (!acc) {
              acc = `sub_${Date.now()}`;
              const cleanName = "Tài khoản 1";
              const newAcc = { id: acc, name: cleanName };

              setAccounts(prev => {
                const next = [...prev, newAcc];
                localStorage.setItem("tls1_accounts", JSON.stringify(next));
                return next;
              });
              setSelectedAccount(acc);
              setBotAccountMap(prev => {
                const next = { ...prev, [strat]: acc };
                localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
                return next;
              });

              try {
                await fetch(`/api/bot/accounts?uid=${callbackUid}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: acc, name: cleanName })
                });
              } catch (e) { }
            }

            addSystemLog("⏳ [FAST CONNECT] Đang xác thực với OKX...");
            const res = await fetch("/api/auth/okx/callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                account_id: acc,
                uid: callbackUid,
                strategy: strat
              })
            });
            const data = await res.json();
            if (res.ok && data.status === "success") {
              if (!isAuthenticated) {
                 setIsAuthenticated(true);
                 setLoginUid(callbackUid);
                 localStorage.setItem("tls1_auth", "true");
                 localStorage.setItem("tls1_uid", callbackUid);
              }

              if (data.accounts && Array.isArray(data.accounts)) {
                setAccounts(data.accounts);
                localStorage.setItem("tls1_accounts", JSON.stringify(data.accounts));
              }
              const accDisplayName = data.detected_name || (accounts.find(a => a.id === acc)?.name) || "Tài khoản";
              alert(`✅ Kết nối OKX Fast Connect thành công: [${accDisplayName}]!`);
              addSystemLog(`✅ [FAST CONNECT] Lấy API Key thành công cho tài khoản "${accDisplayName}"`);
              
              // Cập nhật state nội bộ
              const credRes = await fetch(`/api/bot/credentials?strategy=${strat}&account_id=${acc}&uid=${callbackUid}`);
              if (credRes.ok) {
                const credData = await credRes.json();
                setApiKey(credData.api_key || "");
                setSecretKey(credData.secret_key || "");
                setPassphrase(credData.passphrase || "");
              }
              refreshBotData();
            } else {
              alert("❌ Lỗi kết nối OKX: " + (data.message || "Lỗi máy chủ"));
              addSystemLog("❌ [FAST CONNECT] Lỗi: " + (data.message || "Lỗi máy chủ"));
            }
          } catch (err) {
            alert("❌ Lỗi kết nối server: " + err.message);
          } finally {
            // Clean up URL
            window.history.replaceState({}, document.title, "/");
          }
        } else if (!callbackUid) {
          alert("❌ Lỗi: Không tìm thấy thông tin phiên đăng nhập (UID) từ OKX. Vui lòng kết nối lại từ ứng dụng chính.");
          window.history.replaceState({}, document.title, "/");
        } else if (!code) {
          alert("❌ Lỗi: Không nhận được mã xác thực (code) từ OKX. Vui lòng thử lại.");
          window.history.replaceState({}, document.title, "/");
        }
      }
    };
