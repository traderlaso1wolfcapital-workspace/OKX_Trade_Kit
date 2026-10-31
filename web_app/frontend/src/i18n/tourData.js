/**
 * Multilingual Onboarding Tour Data for TLS1 Trading Bot (18 Steps Top-to-Bottom Flow)
 * Supported languages: vi (Tiếng Việt), en (English), zh (简体中文), ko (한국어), fr (Français), es (Español)
 */

export const TOUR_CONTENT = {
  vi: [
    {
      badge: "Header • Bước 1 / 18",
      title: "1. Chọn Tài Khoản Sàn (Header)",
      content: "Nút chọn tài khoản ở góc trên bên trái Header:\n• Sàn OKX: Chọn Sub-Account tương ứng.\n• Sàn MT5 / Quỹ: Chọn tài khoản E8, Vantage, Exness...\n• Số dư live: Cập nhật vốn thời gian thực. Tự động khóa khi bot đang chạy.",
      actionHint: "💡 Nhấp nút này trên Header để xem và chuyển đổi tài khoản."
    },
    {
      badge: "Header • Bước 2 / 18",
      title: "2. Bật / Dừng Vận Hành Bot",
      content: "Nút kích hoạt tự động ở góc trên bên trái:\n• [CHẠY BOT]: Tự động quét tín hiệu và đặt lệnh 24/7 trên sàn.\n• [DỪNG BOT]: Hủy toàn bộ lệnh Limit chờ và bảo toàn vị thế.\n• Chạy nền máy chủ: Có thể tắt trình duyệt web sau khi bật.",
      actionHint: "💡 Nút xanh: Đang quét lệnh. Nút xám: Đang tạm dừng."
    },
    {
      badge: "Bảng Vị Thế • Bước 3 / 18",
      title: "3. Bảng Vị Thế & Danh Sách Cặp Coin",
      content: "Khu vực giám sát tổng thể & rải lệnh đa khung:\n• Cột Cặp: Nhấp tên coin (BTC, ETH, XAU...) để mở biểu đồ TradingView live.\n• Cột Khung trade: Tích chọn các khung (5, 15, 30, H1, H2, H4) bot được phép vào lệnh.\n• Nút ⮃: Bật chế độ chia đôi Biểu Đồ & Bảng Vị Thế.",
      actionHint: "💡 Có thể bật nhiều khung để bot phân bổ lệnh đa tầng song song."
    },
    {
      badge: "Điều Khiển • Bước 4 / 18",
      title: "4. Chọn Chiến Thuật Bot",
      content: "Chuyển đổi linh hoạt giữa 3 thuật toán giao dịch:\n• SMC Bot: Săn vùng thanh khoản & Order Block đảo chiều.\n• EMA200: Đón sóng hồi chạm dải xu hướng động.\n• Thanh Khoản: Bắt râu nến quét thanh khoản giật mạnh.",
      actionHint: "💡 Mỗi bot hoạt động độc lập với tài khoản và cấu hình riêng."
    },
    {
      badge: "Điều Khiển • Bước 5 / 18",
      title: "5. Ký Quỹ & Quản Trị Rủi Ro (TP/SL)",
      content: "Cấu hình vốn mỗi lệnh và ngưỡng an toàn:\n• Ký quỹ: Tính theo USDT ($) hoặc % Vốn (Cố định hoặc Gấp thếp).\n• TP & SL: Thiết lập theo tỷ lệ phần trăm (%) hoặc tỷ lệ R:R.\n• Canh lệnh 24/7: Bot giám sát thời gian thực tự động đóng lệnh.",
      actionHint: "💡 Người mới nên thử nghiệm vốn nhỏ (0.5$ - 5$) để quan sát."
    },
    {
      badge: "Màn Hình Chính • Bước 6 / 18",
      title: "6. Mở Bảng Cài Đặt ⚙",
      content: "Nhấn nút [⚙ Cài Đặt] để mở bảng tinh chỉnh chuyên sâu:\n• Watchlist cặp giao dịch.\n• Bộ 3 chiến thuật DCA & Cầu dao bảo vệ tài khoản.\n• Bộ lọc nến tích lũy & Hệ số nhân đa khung.\n\nNhấn 'Tiếp theo ▶' để khám phá bên trong Cài Đặt.",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để mở cửa sổ Cài Đặt chi tiết."
    },
    {
      badge: "Cài Đặt • Bước 7 / 18",
      title: "7. Danh Mục Coin (Watchlist)",
      content: "Chọn các cặp coin / Forex / Kim loại hiển thị ngoài màn hình:\n• Nhấp chọn/bỏ chọn thẻ (XAU, BTC, ETH, SOL, DOGE...).\n• Thẻ sáng: Đang kích hoạt theo dõi.\n• Khóa an toàn: Cặp đang có vị thế mở sẽ tự khóa bảo vệ.",
      actionHint: "💡 Ưu tiên chọn các cặp có thanh khoản và biên độ tốt."
    },
    {
      badge: "Cài Đặt • Bước 8 / 18",
      title: "8. Bộ 3 Cơ Chế DCA & Cầu Dao Bảo Vệ",
      content: "Quản lý vị thế & lá chắn rủi ro chuyên sâu:\n• Bộ 3 DCA: Chọn 1 trong 3 cơ chế (DCA Dương nhồi lãi, DCA Âm trung bình giá, hoặc Lưới Đa Khung Hedge độc lập từng TF).\n• Cầu dao H4 >8%: Tự động ngắt rải Limit khi giá rướn xa cản EMA200 H4 để chống đu đỉnh/bắt đáy non.\n• Đồng pha BTC: Ép Altcoin chỉ đánh thuận theo xu hướng vĩ mô H4 của Bitcoin.",
      actionHint: "💡 Giúp bạn chủ động kiểm soát quy mô rủi ro và tỷ lệ sụt giảm vốn."
    },
    {
      badge: "Cài Đặt • Bước 9 / 18",
      title: "9. Bộ Lọc Tín Hiệu Vào Lệnh",
      content: "Điều kiện xác nhận tín hiệu vào lệnh chuẩn xác:\n• Độ Lệch Đệm (%): Đặt Limit đón trước cản để dễ khớp lệnh.\n• Khoảng Cách An Toàn (%): Khoảng cách tối thiểu giữa các đường EMA.\n• 60 Nến Tích Lũy: Yêu cầu nến tích lũy đủ lâu để loại trừ bẫy sideway.",
      actionHint: "💡 Người mới nên giữ nguyên thông số chuẩn Admin đã kiểm chứng."
    },
    {
      badge: "Cài Đặt • Bước 10 / 18",
      title: "10. Hệ Số Nhân Đa Khung",
      content: "Tự động điều phối theo quy mô từng khung nến:\n• Cột Vốn: Khung lớn biên độ rộng hơn, bot tự nhân vốn (H1 x2.0, H4 x5.0) và mở rộng TP/SL tương ứng.\n• Cột Vào Lệnh: Nhân tỷ lệ đệm đón trước cản cho khung lớn.",
      actionHint: "💡 Giúp bot ăn trọn sóng lớn H1/H4 mà vẫn giữ rủi ro an toàn ở M5."
    },
    {
      badge: "Cài Đặt • Bước 11 / 18",
      title: "11. Lưu & Khôi Phục Cài Đặt",
      content: "Quản lý lưu trữ cấu hình:\n• 'Lưu Cài Đặt': Áp dụng ngay lập tức mọi thông số vừa điều chỉnh.\n• 'Khôi Phục Mặc Định': Đưa toàn bộ cài đặt về cấu hình an toàn gốc của Admin bất cứ lúc nào.",
      actionHint: "💡 Luôn nhấn 'Lưu Cài Đặt' sau khi thực hiện thay đổi."
    },
    {
      badge: "Cài Đặt • Bước 12 / 18",
      title: "12. Đánh Giá Từ Cộng Đồng",
      content: "Kênh tương tác và chia sẻ kinh nghiệm:\n• Xem đánh giá và hình ảnh lợi nhuận thực chiến từ các nhà giao dịch.\n• Chấm điểm sao và gửi phản hồi trải nghiệm bot của bạn.\n\nNhấn 'Tiếp theo ▶' để chuyển sang hướng dẫn Nút Kết Nối (Connect).",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để khám phá cửa sổ Kết Nối [Connect]."
    },
    {
      badge: "Header • Bước 13 / 18",
      title: "13. Nút Kết Nối [Connect] (Header)",
      content: "Nút quản lý tài khoản trung tâm trên Header:\n• Liên kết sàn OKX (Fast Connect hoặc API Key).\n• Kết nối tài khoản Quỹ Prop & Broker MT5 (Vantage, Exness).\n• Đồng bộ thiết bị mới qua mã 6 số.\n\nNhấn 'Tiếp theo ▶' để mở cửa sổ Kết Nối.",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để mở popup Kết Nối."
    },
    {
      badge: "Kết Nối • Bước 14 / 18",
      title: "14. Tab Fast Connect (OAuth 2.0)",
      content: "Cổng kết nối siêu tốc an toàn tuyệt đối:\n• Sàn OKX: Nhấn 'Kết Nối ➔' tự động chuyển hướng App OKX để ủy quyền OAuth 2.0 chuẩn sàn.\n• Sàn MT5 / Quỹ Prop: Kết nối tài khoản Vantage, Exness, E8...\n• An toàn 100%: Tự mã hóa API Key, không lo lộ mã bí mật.",
      actionHint: "💡 Khuyên dùng Fast Connect vì chỉ mất 3 giây, tiện lợi và an toàn."
    },
    {
      badge: "Kết Nối • Bước 15 / 18",
      title: "15. Tab API Key Connect (Thủ Công)",
      content: "Dành cho người dùng tự tạo API Key trên sàn OKX:\n• Nhập API Key, Secret Key và Passphrase rồi nhấn 'Lưu Cấu Hình'.\n• Hỗ trợ quản lý độc lập nhiều Sub-Account.\n\n🛡️ LƯU Ý BẢO MẬT: Chỉ cấp quyền 'Trade' (Giao dịch), tuyệt đối KHÔNG cấp quyền 'Withdraw' (Rút tiền).",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để khám phá tính năng Ghép Đôi Thiết Bị Mới."
    },
    {
      badge: "Kết Nối • Bước 16 / 18",
      title: "16. Đăng Nhập / Đồng Bộ Thiết Bị Mới",
      content: "Đăng nhập nhanh trên máy 2 (điện thoại/laptop khác):\n• Nhập mã ghép đôi 6 số từ thiết bị đang chạy bot để đồng bộ ngay mà không cần quét lại OKX.\n• Tiện lợi như Telegram Web / Zalo Web, dữ liệu trạng thái đồng bộ chéo tức thì giữa các thiết bị.",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để xem Điều Kiện Kích Hoạt App & Kênh Hỗ Trợ."
    },
    {
      badge: "Kết Nối • Bước 17 / 18",
      title: "17. Điều Kiện Để Sử Dụng App",
      content: "Chính sách kích hoạt bot trọn đời của AutoTrader.fun:\n• Đăng ký tài khoản OKX dưới Link VIP của AutoTrader.fun hoặc chuyển Ref về mã 'AutoTrader'.\n• Nhấn [Hướng dẫn chuyển Ref ▼] để xem chi tiết cách chuyển mã mời nhanh trong 1 phút.\n• Kênh hỗ trợ trực tiếp từ Admin: Telegram, Messenger, Zalo, Discord ở góc dưới.",
      actionHint: "💡 Kích hoạt tài khoản OKX liên kết Ref để sử dụng trọn bộ bot miễn phí trọn đời!"
    },
    {
      badge: "Hoàn Tất • Bước 18 / 18",
      title: "18. Hoàn Tất Hướng Dẫn!",
      content: "Chúc mừng bạn đã làm chủ toàn bộ tính năng của Web AutoTrader!\n• Bạn có thể nhấn lại nút [Hướng Dẫn] bất kỳ lúc nào để xem lại.\n• Hãy bắt đầu với số vốn nhỏ để kiểm chứng hiệu quả thực tế.\n\n🎉 Chúc bạn giao dịch thành công và an toàn cùng TLS1 Trading Bot!",
      actionHint: "🎉 Nhấn 'Hoàn tất' để đóng hướng dẫn và bắt đầu hành trình giao dịch!"
    }
  ],

  en: [
    {
      badge: "Header • Step 1 / 18",
      title: "1. Account & Live Balance (Header)",
      content: "Select trading account on the top-left Header dropdown:\n• OKX Exchange: Route to dedicated Sub-Accounts.\n• MT5 & Prop Firms: Route to E8, Vantage, Exness accounts.\n• Live Balance: Real-time margin equity tracking. Auto-locks while running.",
      actionHint: "💡 Click this header dropdown to inspect and switch accounts."
    },
    {
      badge: "Header • Step 2 / 18",
      title: "2. Start / Stop Bot Execution",
      content: "Autonomous execution control on top-left header:\n• 'START BOT': 24/7 automated signal scanning and order placement.\n• 'STOP BOT': Cancels pending Limit orders and preserves active positions.\n• Server Background: You can close the browser; bot runs 24/7 on server.",
      actionHint: "💡 Green button: Scanning live. Gray button: Idle / Paused."
    },
    {
      badge: "Positions • Step 3 / 18",
      title: "3. Positions & Asset Watchlist",
      content: "Central overview of open positions and multi-timeframe grid:\n• Timeframes: Toggle 5m, 15m, 30m, H1, H2, H4 execution permissions.\n• Chart: Click any ticker (BTC, ETH, XAU...) to switch live TradingView chart.\n• ⮃ Button: Activate split-screen view for chart & positions.",
      actionHint: "💡 Multiple timeframes can run concurrently for multi-layer grid execution."
    },
    {
      badge: "Controls • Step 4 / 18",
      title: "4. Select Bot Strategy",
      content: "Seamlessly switch between 3 algorithmic trading engines:\n• SMC Bot: Hunts liquidity pools & reverse Order Blocks.\n• EMA200: Catches mean-reversion pullbacks at dynamic trendlines.\n• Liquidation: Exploits sharp wick sweeps and high-volatility spikes.",
      actionHint: "💡 Each bot operates independently with dedicated account and settings."
    },
    {
      badge: "Controls • Step 5 / 18",
      title: "5. Margin & Risk Management (TP/SL)",
      content: "Configure capital per trade and safety bounds:\n• Margin: Denominated in USDT ($) or % Equity (Fixed or Multiplied).\n• TP & SL: Expressed in percentage (%) or Risk/Reward (R ratio).\n• 24/7 Watchdog: Autonomous background service protecting open orders.",
      actionHint: "💡 Beginners are advised to start small ($0.5 - $5) to observe execution."
    },
    {
      badge: "Main Screen • Step 6 / 18",
      title: "6. Open System Settings ⚙",
      content: "Click [⚙ Settings] to access advanced configuration:\n• Watchlist custom pairs.\n• Triple DCA engines & Circuit Breaker protections.\n• Candle accumulation filter & Multi-timeframe multipliers.\n\nClick 'Next ▶' to explore System Settings.",
      actionHint: "💡 Click 'Next ▶' to inspect the detailed Settings modal."
    },
    {
      badge: "Strategy Tab • Step 7 / 18",
      title: "7. Asset Watchlist",
      content: "Customize trading pairs displayed on the main dashboard:\n• Click to toggle tickers (XAU, BTC, ETH, SOL, DOGE...).\n• Highlighted cards: Currently active on the dashboard.\n• Safety Lock: Coins with active positions are locked to prevent disruption.",
      actionHint: "💡 Focus on liquid pairs with reliable order-book depth."
    },
    {
      badge: "Strategy Tab • Step 8 / 18",
      title: "8. Triple DCA & Risk Shield",
      content: "Advanced position management & circuit breakers:\n• Triple DCA: Choose Positive (pyramiding), Negative (cost averaging), or Multi-TF Grid (hedged).\n• H4 Reversal >8%: Halts Limit grid when price stretches beyond safe bounds to prevent catching falling knives.\n• BTC Macro Sync: Forces Altcoins to trade strictly aligned with macro Bitcoin trend.",
      actionHint: "💡 Empowers disciplined risk mitigation and drawdown management."
    },
    {
      badge: "Strategy Tab • Step 9 / 18",
      title: "9. Entry Signal Filter",
      content: "Precision entry validation rules:\n• Offset Cushion (%): Places Limit orders ahead of EMA200 for guaranteed fill.\n• Safety Distance (%): Minimum separation between adjacent EMA lines.\n• 60-Candle Accumulation: Requires prolonged structural consolidation to filter choppy noise.",
      actionHint: "💡 Beginners should retain Admin-verified default parameters."
    },
    {
      badge: "Strategy Tab • Step 10 / 18",
      title: "10. Multi-TF Multipliers",
      content: "Adaptive scaling tailored to timeframe swing size:\n• Capital: Higher timeframes automatically scale margin (H1 x2.0, H4 x5.0) and broaden TP/SL proportionally.\n• Entry Cushion: Scales pre-entry offsets for larger candles.",
      actionHint: "💡 Captures large macro swings on H1/H4 while maintaining micro safety on M5."
    },
    {
      badge: "Strategy Tab • Step 11 / 18",
      title: "11. Save & Restore Settings",
      content: "Profile lifecycle management:\n• 'Save Settings': Immediately applies all modified parameters.\n• 'Reset Default': Restores verified factory Admin safety settings anytime.",
      actionHint: "💡 Always click 'Save Settings' after tuning parameters."
    },
    {
      badge: "Reviews Tab • Step 12 / 18",
      title: "12. Community Reviews Tab",
      content: "Social proof and community feedback:\n• Browse live profit screenshots and reviews from active traders.\n• Rate stars and share your personal trading milestones.\n\nClick 'Next ▶' to proceed to the Connect Button walkthrough.",
      actionHint: "💡 Click 'Next ▶' to transition into the [Connect] modal walkthrough."
    },
    {
      badge: "Header • Step 13 / 18",
      title: "13. Connect Button [Connect]",
      content: "Central connection gateway on top header:\n• Link OKX exchange (Fast Connect or API Key).\n• Connect MT5 Prop Firms & Brokers (Vantage, Exness).\n• Sync new devices instantly via 6-digit PIN.\n\nClick 'Next ▶' to open the Connect modal.",
      actionHint: "💡 Click 'Next ▶' to inspect the Connect popup."
    },
    {
      badge: "Connect • Step 14 / 18",
      title: "14. Fast Connect (OAuth 2.0)",
      content: "Fast, 1-click authorized connection:\n• OKX: Click 'Connect ➔' to grant official OAuth 2.0 access via OKX App.\n• MT5 & Prop Firms: Direct connection for Vantage, Exness, E8...\n• 100% Secure: Auto-encrypted API keys with zero secret leakage.",
      actionHint: "💡 Recommended for all users: takes 3 seconds with zero typing."
    },
    {
      badge: "Connect • Step 15 / 18",
      title: "15. Manual API Key Connect",
      content: "For users managing custom API keys generated on OKX:\n• Enter API Key, Secret Key, and Passphrase, then click 'Save'.\n• Supports independent multi-account setup.\n\n🛡️ SECURITY NOTICE: Grant 'Trade' permission only. NEVER enable 'Withdraw'.",
      actionHint: "💡 Click 'Next ▶' to view the Cross-Device Pairing tab."
    },
    {
      badge: "Connect • Step 16 / 18",
      title: "16. Device Login & Pairing",
      content: "Instant login on secondary devices (phone, laptop, tablet):\n• Enter the 6-digit pairing PIN from the primary device running the bot.\n• Functions seamlessly like Telegram/WhatsApp Web with instant cross-device state synchronization.",
      actionHint: "💡 Click 'Next ▶' to inspect App Eligibility & Support Channels."
    },
    {
      badge: "Connect • Step 17 / 18",
      title: "17. App Usage Requirements & Policies",
      content: "Lifetime bot activation policies by AutoTrader.fun:\n• Register an OKX account under AutoTrader VIP link or transfer referral code to 'AutoTrader'.\n• Click [Transfer Guide ▼] for 1-minute step-by-step instructions.\n• Direct Admin support channels: Telegram, Messenger, Zalo, Discord at the bottom.",
      actionHint: "💡 Activate your OKX referral link for lifetime complimentary bot license!"
    },
    {
      badge: "Complete • Step 18 / 18",
      title: "18. Tour Complete!",
      content: "Congratulations! You are now fully equipped to operate Web AutoTrader:\n• Click [Guide] anytime to replay this walkthrough.\n• Start with conservative capital to verify real-time performance.\n\n🎉 Wishing you disciplined and profitable trading with TLS1 Bot!",
      actionHint: "🎉 Click 'Finish' to close the tour and begin trading!"
    }
  ],

  zh: [],
  ko: [],
  fr: [],
  es: []
};

TOUR_CONTENT.zh = TOUR_CONTENT.en;
TOUR_CONTENT.ko = TOUR_CONTENT.en;
TOUR_CONTENT.fr = TOUR_CONTENT.en;
TOUR_CONTENT.es = TOUR_CONTENT.en;

export function getTourSteps(lang = "vi", actions = {}) {
  const {
    setShowConnectModal = () => {},
    setShowSettings = () => {},
    setConnectModalTab = () => {},
    setSettingsTab = () => {},
    setActiveTab = () => {},
  } = actions;

  const contentList = TOUR_CONTENT[lang] || TOUR_CONTENT.vi;

  const baseSpecs = [
    // 1: account-selector (Header trên cùng bên trái) -> Sát phía dưới chủ thể
    {
      target: '[data-tour="account-selector"], .bot-tabs-group',
      placement: "bottom",
      padding: 10,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 2: action-bot (Nút CHẠY/DỪNG BOT góc trái trên) -> Sát phía dưới chủ thể
    {
      target: '[data-tour="action-bot"]',
      placement: "bottom",
      padding: 10,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 3: bottom-tabs-bar & watchlist-pairs (Bảng vị thế & Cặp coin gộp chung) -> Sát phía TRÊN chủ thể
    {
      target: '[data-tour="bottom-tabs-bar"], [data-tour="watchlist-pairs"]',
      placement: "top",
      padding: 12,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
        setActiveTab("positions");
      },
    },
    // 4: bot-selector (Chọn thuật toán bot bên dưới biểu đồ) -> Sát phía TRÊN chủ thể
    {
      target: '[data-tour="bot-selector"]',
      placement: "top",
      padding: 10,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 5: margin-config & tpsl-config (Ký quỹ, TP, SL gộp làm 1) -> Sát phía TRÊN chủ thể
    {
      target: '[data-tour="margin-config"], [data-tour="tpsl-config"]',
      placement: "top",
      padding: 12,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 6: settings-btn (Nút [⚙ Cài Đặt]) -> Sát phía TRÊN chủ thể
    {
      target: '[data-tour="settings-btn"]',
      placement: "top",
      padding: 10,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 7: Cài Đặt - Watchlist Coin -> Cuộn lên sát tab & card dưới cùng
    {
      target: '.modal-header, .settings-tab-bar, [data-tour="settings-watchlist"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="settings-watchlist"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      },
    },
    // 8: Cài Đặt - Bộ 3 DCA & Cầu Dao Bảo Vệ (Gộp 8 & 9) -> Cuộn lên sát tab & card dưới cùng
    {
      target: '.modal-header, .settings-tab-bar, [data-tour="settings-dca"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="settings-dca"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      },
    },
    // 9: Cài Đặt - Điểm Vào Lệnh -> Cuộn lên sát tab & card dưới cùng
    {
      target: '.modal-header, .settings-tab-bar, [data-tour="settings-entry-filters"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="settings-entry-filters"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      },
    },
    // 10: Cài Đặt - Hệ Số Nhân Đa Khung -> Cuộn lên sát tab & card dưới cùng
    {
      target: '.modal-header, .settings-tab-bar, [data-tour="settings-tf-multipliers"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="settings-tf-multipliers"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      },
    },
    // 11: Cài Đặt - Nút Lưu & Mặc Định -> Đưa nội dung lên trên một chút, mũi tên quay xuống sát chủ thể
    {
      target: '[data-tour="settings-actions"]',
      placement: "top",
      padding: 10,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="settings-actions"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);
      },
    },
    // 12: Cài Đặt - Tab Đánh Giá -> Cuộn lên sát tab & card dưới cùng
    {
      target: '.modal-header, .settings-tab-bar, [data-tour="settings-reviews-tab-content"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("reviews");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="settings-reviews-tab-content"]');
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      },
    },
    // 13: Header - Nút Connect (Góc trên bên phải) -> Sát phía DƯỚI chủ thể
    {
      target: '[data-tour="connect-okx"]',
      placement: "bottom",
      padding: 10,
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(false);
      },
    },
    // 14: Connect - Fast Connect (Khoanh rộng bao Header + Tab) -> Dưới cùng
    {
      target: '.modal-header, .connect-tab-bar, [data-tour="connect-fast-content"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("fast");
      },
    },
    // 15: Connect - API Key (Khoanh rộng bao Header + Tab) -> Dưới cùng
    {
      target: '.modal-header, .connect-tab-bar, [data-tour="connect-apikey-content"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("apikey");
      },
    },
    // 16: Connect - Đăng Nhập / Đồng Bộ Thiết Bị Mới (Box 1) -> Cuộn lên sát tab & card dưới cùng
    {
      target: '.modal-header, .connect-tab-bar, [data-tour="connect-sync-code-box"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("sync_login");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="connect-sync-code-box"]');
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
      },
    },
    // 17: Connect - Điều Kiện Để Sử Dụng App (Box 2) -> Cuộn lên sát tab & card dưới cùng
    {
      target: '.modal-header, .connect-tab-bar, [data-tour="connect-sync-policy-box"]',
      placement: "bottom",
      dockBottom: true,
      padding: 12,
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("sync_login");
        setTimeout(() => {
          const el = document.querySelector('[data-tour="connect-sync-policy-box"]');
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
      },
    },
    // 18: Sidebar - Hoàn Tất Hướng Dẫn -> Sát phía TRÊN chủ thể
    {
      target: '[data-tour="tour-btn"]',
      placement: "top",
      padding: 10,
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
  ];

  return baseSpecs.map((spec, idx) => {
    const textInfo = contentList[idx] || {};
    return {
      ...spec,
      ...textInfo
    };
  });
}
