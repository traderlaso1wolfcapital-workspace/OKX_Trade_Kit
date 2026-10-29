/**
 * accountUtils.js - Tiện ích chuẩn hoá định danh tài khoản và phát hiện chiến thuật bot đang chạy
 */

/**
 * Trích xuất chuẩn xác chiến thuật ("sub1" | "sub2" | "sub3") mà một tài khoản OKX đang chạy.
 * Trả về "sub1" | "sub2" | "sub3" nếu đang chạy, hoặc null nếu không chạy bot nào.
 */
export const getRunningStrategyForAccount = (activeAccountsMap, targetAccId, accountsList = []) => {
  if (!activeAccountsMap || !targetAccId) return null;
  const rawId = String(targetAccId).trim();
  const cleanId = rawId.replace(/^#/, "");
  const noUnderId = cleanId.replace(/_/g, "");
  const matchedAcc = (accountsList || []).find(
    a => a.id === targetAccId || a.name === targetAccId || a.id === cleanId || a.name === cleanId || a.id === noUnderId
  );
  const cleanName = String(matchedAcc?.name || "").trim().replace(/^#/, "");
  let tagFromParen = "";
  if (cleanName && cleanName.includes("(") && cleanName.includes(")")) {
    try {
      const parts = cleanName.split("(");
      tagFromParen = parts[parts.length - 1].replace(")", "").trim();
    } catch {}
  }

  const checkKeys = Array.from(new Set([
    rawId,
    cleanId,
    noUnderId,
    cleanName,
    tagFromParen,
    tagFromParen ? `#${tagFromParen}` : "",
    tagFromParen ? `sub${tagFromParen}` : "",
    tagFromParen ? `sub_${tagFromParen}` : "",
    cleanId ? `sub${cleanId}` : "",
    cleanId ? `sub_${cleanId}` : "",
  ])).filter(Boolean);

  // 1. Kiểm tra trực tiếp key theo ID tài khoản (ví dụ activeAccountsMap["#7768"] === "sub1")
  for (const k of checkKeys) {
    const directVal = activeAccountsMap[k];
    if (directVal && typeof directVal === "string" && ["sub1", "sub2", "sub3"].includes(directVal)) {
      return directVal;
    }
  }

  // 2. Quét qua 3 chiến thuật chuẩn
  for (const st of ["sub1", "sub2", "sub3"]) {
    // a. Khớp key prefix dạng st_accId (ví dụ activeAccountsMap["sub1_#7768"])
    for (const k of checkKeys) {
      if (activeAccountsMap[`${st}_${k}`]) {
        return st;
      }
    }

    // b. Khớp giá trị lưu trong key của chiến thuật (ví dụ activeAccountsMap["sub1"] = ["#7768"] hoặc "#7768")
    const val = activeAccountsMap[st];
    if (val) {
      if (Array.isArray(val)) {
        if (val.some(v => {
          const cv = String(v).trim().replace(/^#/, "");
          const cvNoUnder = cv.replace(/_/g, "");
          return checkKeys.some(ck => ck === v || ck === cv || ck === cvNoUnder);
        })) {
          return st;
        }
      } else {
        const cv = String(val).trim().replace(/^#/, "");
        const cvNoUnder = cv.replace(/_/g, "");
        if (checkKeys.some(ck => ck === val || ck === cv || ck === cvNoUnder)) {
          return st;
        }
      }
    }
  }
  return null;
};

/**
 * Lấy tên hiển thị chuẩn của bot theo key
 */
export const getBotDisplayName = (key, fallback = "Bot") => {
  if (key === "sub1") return "EMA200 Bot";
  if (key === "sub2") return "SMC Bot";
  if (key === "sub3") return "Liquidation Bot";
  return fallback;
};

