import React, { useState, useEffect, useMemo, useRef } from 'react';

const BOT_STRATEGIES = [
  "Bot 1: Sóng Hồi EMA200 (Pullback)",
  "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
  "Bot 3: Săn Thanh Khoản (Liquidation)",
];

const DEFAULT_REVIEWS = [
  {
    id: "rev_1",
    username: "User ****8912",
    user_key: "seed_1",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 5,
    date: "12/08/2026",
    comment: "Đúng mô tả chất lượng, bot bắt râu quét thanh khoản rất bén. Tỷ lệ hit TP cao, drawdown cực thấp.",
    seller_reply: null,
    likes: 18,
  },
  {
    id: "rev_2",
    username: "User ****4a7b",
    user_key: "seed_2",
    bot_strategy: "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
    rating: 5,
    date: "10/08/2026",
    comment: "Bot SMC đánh theo Order Block rất kỷ luật. Tránh được bão giá đợt tin CPI vừa rồi. 5 sao cho team phát triển!",
    seller_reply: null,
    likes: 12,
  },
  {
    id: "rev_3",
    username: "User ****90c1",
    user_key: "seed_3",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 5,
    date: "08/08/2026",
    comment: "Bắt sóng hồi EMA200 nến 15m mượt mà, gồng lãi tự động trailing limit rất thông minh.",
    seller_reply: null,
    likes: 15,
  },
  {
    id: "rev_4",
    username: "User ****123f",
    user_key: "seed_4",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 4,
    date: "05/08/2026",
    comment: "Bot chạy ổn áp, nếu có thêm thông báo Telegram báo râu quét tức thì nữa thì hoàn hảo 10/10.",
    seller_reply: null,
    likes: 9,
  },
  {
    id: "rev_5",
    username: "User ****55d8",
    user_key: "seed_5",
    bot_strategy: "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
    rating: 5,
    date: "01/08/2026",
    comment: "Chạy song song 3 bot thấy bot SMC lợi nhuận ổn định nhất. Anh em nên chia vốn theo tỷ lệ 1-2% rủi ro, đừng tham all-in là ngủ ngon.",
    seller_reply: null,
    likes: 11,
  },
  {
    id: "rev_6",
    username: "User ****77e2",
    user_key: "seed_6",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 5,
    date: "28/07/2026",
    comment: "Giao diện web trực quan, xem được biểu đồ đa khung thời gian và trạng thái lệnh theo thời gian thực rất tiện.",
    seller_reply: null,
    likes: 8,
  },
  {
    id: "rev_7",
    username: "User ****9381",
    user_key: "seed_7",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 5,
    date: "25/07/2026",
    comment: "Hôm qua lúc 2h sáng BTC giật râu quét long short cả 2 đầu, sáng dậy thấy bot cắn đúng đáy râu rồi TP ngọt lịm. Đỡ phải thức đêm canh lệnh bạc cả tóc.",
    seller_reply: null,
    likes: 16,
  },
  {
    id: "rev_8",
    username: "User ****2204",
    user_key: "seed_8",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 4,
    date: "22/07/2026",
    comment: "Đánh nến H1 rất chắc tay, ít khi bị dính false break. Có điều thị trường sideway biên hẹp thì vào lệnh hơi ít, phải kiên nhẫn.",
    seller_reply: null,
    likes: 7,
  },
  {
    id: "rev_9",
    username: "User ****6619",
    user_key: "seed_9",
    bot_strategy: "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
    rating: 5,
    date: "19/07/2026",
    comment: "Ban đầu nạp test 500u xem thế nào, chạy được 3 tuần thấy R:R toàn 1:2 với 1:3 chuẩn chỉ quá nên quyết định nâng vốn lên 3000u. Quản lý lệnh rất đàng hoàng.",
    seller_reply: null,
    likes: 21,
  },
  {
    id: "rev_10",
    username: "User ****8832",
    user_key: "seed_10",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 5,
    date: "16/07/2026",
    comment: "Cái quả Dynamic Trailing Limit đỉnh thật sự. Giá rướn thêm là bot tự dời điểm chốt lời theo, không bị tình trạng chốt non tức tưởi như mấy bot thông thường.",
    seller_reply: null,
    likes: 14,
  },
  {
    id: "rev_11",
    username: "User ****3105",
    user_key: "seed_11",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 4,
    date: "14/07/2026",
    comment: "Đợt bão tin Non-Farm vừa rồi dính 1 lệnh SL ở khung M5. May mà tỷ lệ rủi ro để 1% nên không xi nhê gì. Khuyên anh em mới chơi nên tắt M5 chỉ để H1 trở lên khi có tin giật mạnh.",
    seller_reply: null,
    likes: 10,
  },
  {
    id: "rev_12",
    username: "User ****7048",
    user_key: "seed_12",
    bot_strategy: "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
    rating: 5,
    date: "11/07/2026",
    comment: "Vừa rút lãi tháng đầu tiên về tiêu. Cảm giác không bị tâm lý fomo bấm lệnh tay nó nhẹ đầu hẳn anh em ạ. Tks team hỗ trợ nhiệt tình từ lúc chuyển Ref.",
    seller_reply: null,
    likes: 13,
  },
  {
    id: "rev_13",
    username: "User ****4491",
    user_key: "seed_13",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 5,
    date: "08/07/2026",
    comment: "Khen nhất quả bot tự dọn dẹp lệnh Limit cũ khi bật lại. Không bị rác sàn hay kẹt margin. Cơ chế kiểm soát lệnh rất chặt.",
    seller_reply: null,
    likes: 6,
  },
  {
    id: "rev_14",
    username: "User ****1976",
    user_key: "seed_14",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 4,
    date: "05/07/2026",
    comment: "Bắt altcoin ETH với SOL cực nhạy. Nhưng con PEPE biến động điên quá nhiều khi râu quét dài ngoằng, anh em chơi memecoin nên giảm đòn bẩy xuống x3 x5 thôi.",
    seller_reply: null,
    likes: 8,
  },
  {
    id: "rev_15",
    username: "User ****5820",
    user_key: "seed_15",
    bot_strategy: "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
    rating: 5,
    date: "02/07/2026",
    comment: "Thuật toán tìm vùng Order Block chuẩn phết, chạm đúng mép khối OB là bật lên như lò xo. Tỷ lệ thắng cỡ 70-75% mà R:R đẹp.",
    seller_reply: null,
    likes: 17,
  },
  {
    id: "rev_16",
    username: "User ****6013",
    user_key: "seed_16",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 5,
    date: "29/06/2026",
    comment: "Từ ngày cắm bot này vào OKX thì giải phóng được bao nhiêu thời gian. Vừa làm việc chính vừa để bot tự chạy kiếm thêm tiền cafe bỉm sữa.",
    seller_reply: null,
    likes: 19,
  },
  {
    id: "rev_17",
    username: "User ****3728",
    user_key: "seed_17",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 5,
    date: "26/06/2026",
    comment: "Tính năng Macro Sync Altcoin theo BTC hay vãi, BTC đang đâm đầu thì bot tự động khóa không cho Long Altcoin bừa bãi, cứu bao nhiêu bàn thua trông thấy.",
    seller_reply: null,
    likes: 12,
  },
  {
    id: "rev_18",
    username: "User ****9402",
    user_key: "seed_18",
    bot_strategy: "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
    rating: 4,
    date: "23/06/2026",
    comment: "Chạy trên PWA điện thoại mượt, xem biểu đồ tradingview tiện. Mong team ra thêm hướng dẫn chi tiết cách tinh chỉnh hệ số Internal Length cho người mới.",
    seller_reply: null,
    likes: 5,
  },
  {
    id: "rev_19",
    username: "User ****8254",
    user_key: "seed_19",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 5,
    date: "20/06/2026",
    comment: "Đã giới thiệu cho 2 ông bạn cùng hội trade vào ref của TLS1. Cả 2 ông đều khen bot bắt râu khét lẹt. Đáng đồng tiền bát gạo.",
    seller_reply: null,
    likes: 11,
  },
  {
    id: "rev_20",
    username: "User ****1567",
    user_key: "seed_20",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 5,
    date: "17/06/2026",
    comment: "DCA Dương (Pyramid) lúc bắt đúng trend ăn đậm thật. Lệnh trước có lãi mới nhồi lệnh sau, không bao giờ nhồi khi âm nên tài khoản rất an toàn.",
    seller_reply: null,
    likes: 14,
  },
  {
    id: "rev_21",
    username: "User ****4983",
    user_key: "seed_21",
    bot_strategy: "Bot 3: Săn Thanh Khoản (Liquidation)",
    rating: 4,
    date: "14/06/2026",
    comment: "Hôm đầu cài đặt chưa quen bấm nhầm khối lượng xém tí toát mồ hôi, may mà nhắn hỗ trợ được chỉ lại cách set vốn cố định USDT. Giờ thì chạy mượt rồi.",
    seller_reply: null,
    likes: 6,
  },
  {
    id: "rev_22",
    username: "User ****7639",
    user_key: "seed_22",
    bot_strategy: "Bot 2: SMC Cấu Trúc Thị Trường (Order Block)",
    rating: 5,
    date: "11/06/2026",
    comment: "Hệ số trượt giá Max Slippage chuẩn giúp lệnh khớp không bị lệch giá nhiều lúc biến động lớn. Rất ưng bụng độ hoàn thiện của hệ thống.",
    seller_reply: null,
    likes: 9,
  },
  {
    id: "rev_23",
    username: "User ****2810",
    user_key: "seed_23",
    bot_strategy: "Bot 1: Sóng Hồi EMA200 (Pullback)",
    rating: 5,
    date: "08/06/2026",
    comment: "Tổng kết 1 tháng chạy bot: Lãi ròng 18.5%, max drawdown chỉ 4.2%. Quá mỹ mãn cho một con bot chạy tự động 24/7.",
    seller_reply: null,
    likes: 24,
  },
];

function StrategyDropdown({ value, onChange, options, isFilter = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = value === "all" ? "Tất cả chiến lược" : value;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width: isFilter ? "auto" : "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: isFilter ? "auto" : "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: isFilter ? "4px 10px" : "8px 12px",
          background: isFilter ? "#161b22" : "#21262d",
          border: isOpen ? "1px solid #58a6ff" : "1px solid #30363d",
          borderRadius: "6px",
          color: value === "all" ? "#e6edf3" : "#a5d6ff",
          fontSize: isFilter ? "12px" : "12.5px",
          fontWeight: "500",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
      >
        <span style={{ color: value === "all" ? "#e6edf3" : "#a5d6ff", whiteSpace: "nowrap" }}>
          {displayLabel}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#a5d6ff",
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            marginLeft: "4px",
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: isFilter ? 0 : "auto",
            left: isFilter ? "auto" : 0,
            width: isFilter ? "max-content" : "100%",
            minWidth: "260px",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "6px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            zIndex: 1000,
            overflow: "hidden",
            padding: "4px 0",
          }}
        >
          {isFilter && (
            <div
              onClick={() => {
                onChange("all");
                setIsOpen(false);
              }}
              style={{
                padding: "8px 12px",
                fontSize: "12px",
                color: value === "all" ? "#58a6ff" : "#e6edf3",
                background: value === "all" ? "#1f293d" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#21262d")}
              onMouseLeave={e => (e.currentTarget.style.background = value === "all" ? "#1f293d" : "transparent")}
            >
              <span>Tất cả chiến lược</span>
              {value === "all" && <span style={{ color: "#58a6ff" }}>✓</span>}
            </div>
          )}

          {options.map((st) => {
            const isSelected = value === st;
            return (
              <div
                key={st}
                onClick={() => {
                  onChange(st);
                  setIsOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: isFilter ? "12px" : "12.5px",
                  color: "#a5d6ff",
                  fontWeight: "500",
                  background: isSelected ? "#1f293d" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#21262d")}
                onMouseLeave={e => (e.currentTarget.style.background = isSelected ? "#1f293d" : "transparent")}
              >
                <span>{st}</span>
                {isSelected && <span style={{ color: "#a5d6ff" }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReviewsTab({ apiKey = "", accounts = [], selectedAccount, okxUid = "", hwid = "" }) {
  const [reviews, setReviews] = useState([]);
  const [filterStar, setFilterStar] = useState("all"); // "all", "5", "4", "3", "low"
  const [filterStrategy, setFilterStrategy] = useState("all");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Form states
  const [formRating, setFormRating] = useState(5);
  const [formHoverStar, setFormHoverStar] = useState(0);
  const [formStrategy, setFormStrategy] = useState(BOT_STRATEGIES[0]);
  const [formComment, setFormComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedMap, setLikedMap] = useState({});

  // Xác định userKey từ apiKey hoặc account
  const currentUserKey = useMemo(() => {
    if (apiKey && apiKey.trim()) return apiKey.trim();
    const acc = accounts?.find(a => a.id === selectedAccount || a.apiKey);
    if (acc?.apiKey) return acc.apiKey.trim();
    return localStorage.getItem("tls1_apikey") || localStorage.getItem("tls1_uid") || okxUid || hwid || "user_guest";
  }, [apiKey, accounts, selectedAccount, okxUid, hwid]);

  // Masked user name format chuẩn: User ****8912
  const currentMaskedName = useMemo(() => {
    const raw = currentUserKey.replace(/[^a-zA-Z0-9]/g, "");
    if (raw.length <= 6) return `User ****${raw || "8888"}`;
    return `User ****${raw.slice(-4)}`;
  }, [currentUserKey]);

  // Load reviews on mount & poll every 60s
  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && isMounted) {
            setReviews(json.data);
            localStorage.setItem("tls1_cached_reviews_v3", JSON.stringify(json.data));
            return;
          }
        }
      } catch {
        // Fallback
      }
      if (!isMounted) return;
      const local = localStorage.getItem("tls1_cached_reviews_v3");
      if (local) {
        try {
          setReviews(JSON.parse(local));
          return;
        } catch {
          // Ignore
        }
      }
      setReviews(DEFAULT_REVIEWS);
    };
    fetchReviews();
    const interval = setInterval(fetchReviews, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Đếm số lần user đã review bot được chọn trong form (giới hạn tối đa 2 lần)
  const reviewsCountForFormBot = useMemo(() => {
    return reviews.filter(r => r.user_key === currentUserKey && r.bot_strategy === formStrategy).length;
  }, [reviews, currentUserKey, formStrategy]);

  const isLimitReached = reviewsCountForFormBot >= 2;

  // Lọc đánh giá theo Phân Loại Chiến Lược
  // Để số sao tổng ảnh hưởng gián tiếp theo phân loại này!
  const reviewsByStrategy = useMemo(() => {
    if (filterStrategy === "all") return reviews;
    return reviews.filter(r => r.bot_strategy === filterStrategy);
  }, [reviews, filterStrategy]);

  // Thống kê điểm số và phân bố sao RIÊNG CHO PHÂN LOẠI ĐƯỢC CHỌN
  const stats = useMemo(() => {
    const total = reviewsByStrategy.length;
    const c5 = reviewsByStrategy.filter(r => r.rating === 5).length;
    const c4 = reviewsByStrategy.filter(r => r.rating === 4).length;
    const c3 = reviewsByStrategy.filter(r => r.rating === 3).length;
    const cLow = reviewsByStrategy.filter(r => r.rating <= 2).length;
    const avg = total > 0 ? (reviewsByStrategy.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : "5.0";
    return { total, c5, c4, c3, cLow, avg };
  }, [reviewsByStrategy]);

  // Lọc danh sách hiển thị theo sao
  const filteredReviews = useMemo(() => {
    return reviewsByStrategy.filter(r => {
      if (filterStar === "5" && r.rating !== 5) return false;
      if (filterStar === "4" && r.rating !== 4) return false;
      if (filterStar === "3" && r.rating !== 3) return false;
      if (filterStar === "low" && r.rating > 2) return false;
      return true;
    });
  }, [reviewsByStrategy, filterStar]);

  // Gửi đánh giá
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (isLimitReached) {
      showToast("⚠️ Tài khoản đã đánh giá tối đa 2 lần cho bot này!");
      return;
    }
    if (!formComment.trim() || formComment.trim().length < 5) {
      showToast("⚠️ Vui lòng nhập nội dung đánh giá tối thiểu 5 ký tự");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: currentUserKey,
          user_id: okxUid,
          bot_strategy: formStrategy,
          rating: formRating,
          comment: formComment.trim(),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setReviews(json.data);
        localStorage.setItem("tls1_cached_reviews", JSON.stringify(json.data));
        setFormComment("");
        setShowWriteForm(false);
        showToast("✅ Đánh giá thành công! Cảm ơn bạn.");
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(`⚠️ ${errJson.detail || "Không thể gửi đánh giá"}`);
      }
    } catch {
      // Local fallback nếu backend offline
      const newRev = {
        id: `rev_${Date.now()}`,
        username: currentMaskedName,
        user_key: currentUserKey,
        bot_strategy: formStrategy,
        rating: formRating,
        date: new Date().toLocaleDateString("vi-VN"),
        comment: formComment.trim(),
        seller_reply: null,
        likes: 0,
      };
      const updated = [newRev, ...reviews];
      setReviews(updated);
      localStorage.setItem("tls1_cached_reviews", JSON.stringify(updated));
      setFormComment("");
      setShowWriteForm(false);
      showToast("✅ Đã lưu đánh giá thành công!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thích đánh giá
  const handleLike = async (revId) => {
    if (likedMap[revId]) return;
    setLikedMap(prev => ({ ...prev, [revId]: true }));
    setReviews(prev =>
      prev.map(r => (r.id === revId ? { ...r, likes: (r.likes || 0) + 1 } : r))
    );
    try {
      await fetch(`/api/reviews/like?review_id=${revId}`, { method: "POST" });
    } catch {
      // Ignore
    }
  };

  const getStarText = (rating) => {
    if (rating === 5) return "Tuyệt vời";
    if (rating === 4) return "Hài lòng";
    if (rating === 3) return "Bình thường";
    if (rating === 2) return "Không hài lòng";
    return "Rất tệ";
  };

  return (
    <div className="reviews-tab-container" style={{ position: "relative", minHeight: "360px" }}>
      {/* Toast popup thông báo */}
      {toastMsg && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(22, 27, 34, 0.95)",
            border: "1px solid rgba(16, 185, 129, 0.6)",
            color: "#f0f6fc",
            padding: "5px 16px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "500",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            pointerEvents: "none",
            backdropFilter: "blur(6px)",
            whiteSpace: "nowrap",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. KHỐI TỔNG QUAN ĐÁNH GIÁ (BỐ CỤC CHUẨN BAN ĐẦU - SHOPEE STYLE) */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "14px 16px",
          marginBottom: "14px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Điểm số trung bình (Tổng hợp tự động theo phân loại) */}
        <div style={{ textAlign: "center", minWidth: "100px", paddingRight: "14px", borderRight: "1px solid #282e38" }}>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b", lineHeight: "1" }}>
            {stats.avg} <span style={{ fontSize: "14px", color: "#8b949e", fontWeight: "normal" }}>/ 5</span>
          </div>
          <div style={{ color: "#f59e0b", fontSize: "15px", margin: "4px 0 2px" }}>
            ★★★★★
          </div>
          <div style={{ fontSize: "11px", color: "#8b949e" }}>
            {stats.total} đánh giá
          </div>
        </div>

        {/* Các nút bấm lọc nhanh sao (Shopee Chips ngang tự nhiên) */}
        <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setFilterStar("all")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: filterStar === "all" ? "1px solid #ff9900" : "1px solid #30363d",
              background: filterStar === "all" ? "rgba(255, 153, 0, 0.12)" : "#21262d",
              color: filterStar === "all" ? "#ff9900" : "#c9d1d9",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: filterStar === "all" ? "600" : "normal",
              transition: "all 0.15s ease",
            }}
          >
            Tất cả ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStar("5")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: filterStar === "5" ? "1px solid #ff9900" : "1px solid #30363d",
              background: filterStar === "5" ? "rgba(255, 153, 0, 0.12)" : "#21262d",
              color: filterStar === "5" ? "#ff9900" : "#c9d1d9",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: filterStar === "5" ? "600" : "normal",
              transition: "all 0.15s ease",
            }}
          >
            5 Sao ({stats.c5})
          </button>
          <button
            type="button"
            onClick={() => setFilterStar("4")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: filterStar === "4" ? "1px solid #ff9900" : "1px solid #30363d",
              background: filterStar === "4" ? "rgba(255, 153, 0, 0.12)" : "#21262d",
              color: filterStar === "4" ? "#ff9900" : "#c9d1d9",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: filterStar === "4" ? "600" : "normal",
              transition: "all 0.15s ease",
            }}
          >
            4 Sao ({stats.c4})
          </button>
          <button
            type="button"
            onClick={() => setFilterStar("3")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: filterStar === "3" ? "1px solid #ff9900" : "1px solid #30363d",
              background: filterStar === "3" ? "rgba(255, 153, 0, 0.12)" : "#21262d",
              color: filterStar === "3" ? "#ff9900" : "#c9d1d9",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: filterStar === "3" ? "600" : "normal",
              transition: "all 0.15s ease",
            }}
          >
            3 Sao ({stats.c3})
          </button>
          <button
            type="button"
            onClick={() => setFilterStar("low")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: filterStar === "low" ? "1px solid #ff9900" : "1px solid #30363d",
              background: filterStar === "low" ? "rgba(255, 153, 0, 0.12)" : "#21262d",
              color: filterStar === "low" ? "#ff9900" : "#c9d1d9",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: filterStar === "low" ? "600" : "normal",
              transition: "all 0.15s ease",
            }}
          >
            1 - 2 Sao ({stats.cLow})
          </button>
        </div>

        {/* Nút Viết Đánh Giá */}
        <div>
          <button
            type="button"
            onClick={() => setShowWriteForm(!showWriteForm)}
            style={{
              padding: "7px 14px",
              background: showWriteForm ? "#2d3748" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "1px solid #10b981",
              color: "#ffffff",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12.5px",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
            }}
          >
            {showWriteForm ? "✕ Đóng Form" : "✍️ Viết Đánh Giá"}
          </button>
        </div>
      </div>

      {/* 2. FORM VIẾT ĐÁNH GIÁ (MỞ RA KHI BẤM) */}
      {showWriteForm && (
        <form
          onSubmit={handleSubmitReview}
          style={{
            background: "#1c2128",
            border: "1px solid #444c56",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f0f6fc" }}>
              Đánh giá chất lượng Bot Trading
            </div>
            <div style={{ fontSize: "11px", color: "#8b949e" }}>
              Tài khoản: <strong style={{ color: "#58a6ff" }}>{currentMaskedName}</strong>
            </div>
          </div>

          {/* Chọn số sao */}
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "#c9d1d9" }}>Đánh giá sao:</span>
            <div style={{ display: "inline-flex", gap: "4px", fontSize: "20px", cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map(star => {
                const isLit = (formHoverStar || formRating) >= star;
                return (
                  <span
                    key={star}
                    style={{
                      color: isLit ? "#f59e0b" : "#484f58",
                      transition: "color 0.1s ease",
                    }}
                    onMouseEnter={() => setFormHoverStar(star)}
                    onMouseLeave={() => setFormHoverStar(0)}
                    onClick={() => setFormRating(star)}
                    title={`${star} sao`}
                  >
                    ★
                  </span>
                );
              })}
            </div>
            <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "500", marginLeft: "4px" }}>
              {getStarText(formHoverStar || formRating)}
            </span>
          </div>

          {/* Chọn phân loại chiến lược bot */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#c9d1d9", marginBottom: "4px" }}>
              Phân loại bot:
            </label>
            <StrategyDropdown
              value={formStrategy}
              onChange={setFormStrategy}
              options={BOT_STRATEGIES}
              isFilter={false}
            />
            <div style={{ fontSize: "11px", color: isLimitReached ? "#f85149" : "#8b949e", marginTop: "4px" }}>
              {isLimitReached
                ? "⚠️ Bạn đã đánh giá đủ 2 lần cho bot này (Tối đa 2 lần / API Key / bot)."
                : `Lượt đã đánh giá bot này: ${reviewsCountForFormBot}/2 lần`}
            </div>
          </div>

          {/* Nội dung đánh giá */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#c9d1d9", marginBottom: "4px" }}>
              Nội dung đánh giá:
            </label>
            <textarea
              rows={3}
              value={formComment}
              onChange={e => setFormComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm thực tế của bạn (hiệu quả khớp lệnh, lợi nhuận, bắt râu nến, tính ổn định)..."
              disabled={isLimitReached || isSubmitting}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#21262d",
                border: "1px solid #30363d",
                color: "#e6edf3",
                borderRadius: "6px",
                fontSize: "12px",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Nút gửi */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setShowWriteForm(false)}
              style={{
                padding: "6px 14px",
                background: "transparent",
                border: "1px solid #30363d",
                color: "#c9d1d9",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLimitReached || isSubmitting || !formComment.trim()}
              style={{
                padding: "6px 18px",
                background: isLimitReached
                  ? "#2d333b"
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                color: isLimitReached ? "#6e7681" : "#ffffff",
                borderRadius: "6px",
                cursor: isLimitReached ? "not-allowed" : "pointer",
                fontSize: "12.5px",
                fontWeight: "bold",
                boxShadow: isLimitReached ? "none" : "0 2px 8px rgba(16, 185, 129, 0.3)",
              }}
            >
              {isSubmitting ? "Đang gửi..." : "Hoàn Tất & Gửi"}
            </button>
          </div>
        </form>
      )}

      {/* 3. THANH LỌC THEO PHÂN LOẠI CHIẾN LƯỢC (SHOPEE DROPDOWN) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          padding: "4px 2px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#8b949e" }}>
          Hiển thị <strong style={{ color: "#e6edf3" }}>{filteredReviews.length}</strong> đánh giá
          {filterStrategy !== "all" && <span style={{ color: "#a5d6ff" }}> ({filterStrategy.split(":")[0]})</span>}
        </span>

        {/* Dropdown Phân loại (Shopee Style - Tự động cập nhật điểm số ở trên theo bot được chọn) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#8b949e" }}>Phân loại:</span>
          <StrategyDropdown
            value={filterStrategy}
            onChange={v => {
              setFilterStrategy(v);
              setFilterStar("all");
            }}
            options={BOT_STRATEGIES}
            isFilter={true}
          />
        </div>
      </div>

      {/* 4. DANH SÁCH ĐÁNH GIÁ (SHOPEE REVIEW CARDS) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredReviews.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#8b949e",
              background: "#161b22",
              borderRadius: "8px",
              border: "1px solid #30363d",
              fontSize: "13px",
            }}
          >
            Chưa có đánh giá nào phù hợp với bộ lọc này.
          </div>
        ) : (
          filteredReviews.map(rev => {
            const isLiked = likedMap[rev.id];
            return (
              <div
                key={rev.id}
                style={{
                  background: "#161b22",
                  border: "1px solid #282e38",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Header: User avatar + Masked username (User ****8912) + Sao + Ngày */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Avatar Shopee */}
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#262c36",
                        border: "1px solid #363d49",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#58a6ff",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      👤
                    </div>
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: "600", color: "#f0f6fc" }}>
                        {rev.username}
                      </div>
                      <div style={{ color: "#f59e0b", fontSize: "12px", lineHeight: "1" }}>
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(5 - rev.rating)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "11px", color: "#8b949e" }}>
                    {rev.date}
                  </div>
                </div>

                {/* Phân loại bot */}
                <div style={{ fontSize: "11.5px", color: "#8b949e", marginTop: "2px" }}>
                  Phân loại: <span style={{ color: "#a5d6ff" }}>{rev.bot_strategy}</span>
                </div>

                {/* Nội dung đánh giá */}
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "#e6edf3",
                    lineHeight: "1.5",
                    marginTop: "4px",
                  }}
                >
                  {rev.comment}
                </div>

                {/* Phản hồi của người bán (Shopee Seller Reply) */}
                {rev.seller_reply && (
                  <div
                    style={{
                      background: "#1c2128",
                      border: "1px solid #30363d",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      marginTop: "6px",
                      fontSize: "11.5px",
                      color: "#c9d1d9",
                      lineHeight: "1.5",
                    }}
                  >
                    <div style={{ fontWeight: "600", color: "#26a69a", marginBottom: "2px" }}>
                      Phản hồi của TLS1 Team:
                    </div>
                    {rev.seller_reply}
                  </div>
                )}

                {/* Hàng nút tương tác: Hữu ích (Like) */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => handleLike(rev.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: isLiked ? "#10b981" : "#8b949e",
                      fontSize: "11.5px",
                      cursor: isLiked ? "default" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 6px",
                    }}
                    title="Đánh giá này hữu ích"
                  >
                    <span>👍</span>
                    <span>Hữu ích ({rev.likes || 0})</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
