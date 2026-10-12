/**
 * Multilingual Onboarding Tour Data for TLS1 Trading Bot
 * Supported languages: vi (Tiếng Việt), en (English), zh (简体中文), ko (한국어), fr (Français), es (Español)
 */

export const TOUR_CONTENT = {
  vi: [
    {
      badge: "Màn Hình Chính • Bước 1 / 19",
      title: "1. Nút Kết Nối Sàn OKX (Connect)",
      content: "Cửa ngõ liên kết tài khoản OKX với hệ thống bot. Hỗ trợ 2 phương thức: Fast Connect (1-click an toàn) hoặc tự nhập API Key chủ động.\n\n• Nhấn 'Tiếp theo ▶' để mở cửa sổ Kết Nối và cùng khám phá chi tiết cả 2 cách thức liên kết!",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để mở popup Kết Nối.",
    },
    {
      badge: "Kết Nối • Bước 2 / 19",
      title: "2. Phương Thức 1: Fast Connect (OAuth 2.0)",
      content: "Kết nối 1-click an toàn tuyệt đối được OKX cấp phép:\n• Nhấn 'Mở App ➔': Hệ thống tự động mở App OKX trên điện thoại hoặc trình duyệt để xác thực cấp quyền OAuth 2.0.\n• An toàn 100%: Tự động mã hóa và đồng bộ API Key vào hệ thống, không lo lộ mã bí mật, không mất công copy-paste thủ công.\n• Hỗ trợ kết nối và quản lý nhiều tài khoản Sub-Account độc lập cho từng bot.\n• Sắp tới mở rộng thêm Binance Connect, Bybit Connect và Ví Web3.",
      actionHint: "💡 Khuyên dùng cho người mới vì kết nối siêu tốc chỉ trong 3 giây và loại bỏ hoàn toàn rủi ro copy nhầm mã.",
    },
    {
      badge: "Kết Nối • Bước 3 / 19",
      title: "3. Phương Thức 2: Tự Nhập API Key (Chủ Động)",
      content: "Dành cho người dùng muốn chủ động tạo và quản lý API Key thủ công trên sàn OKX:\n• Quản Lý Tài Khoản: Bấm (+) màu xanh để tạo tài khoản mới, chọn tài khoản từ danh sách, hoặc bấm (-) để xóa.\n• Cụm Nhập Key: Điền chính xác API Key, Secret Key và Passphrase tạo từ sàn OKX rồi nhấn 'Lưu Cấu Hình'.\n\n🛡️ NGUYÊN TẮC AN TOÀN SỐNG CÒN:\n• Khi tạo API Key trên sàn OKX, bạn CHỈ CẦN CẤP QUYỀN 'Trade' (Giao dịch).\n• TUYỆT ĐỐI KHÔNG CẤP QUYỀN 'Withdraw' (Rút tiền). Bot TLS1 không bao giờ yêu cầu quyền rút tiền, đảm bảo 100% an toàn tuyệt đối cho tài sản của bạn.",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để hoàn tất phần Kết nối và bắt đầu khám phá Bộ 3 Chiến Thuật Bot ngoài màn hình chính!",
    },
    {
      badge: "Màn Hình Chính • Bước 4 / 19",
      title: "4. Chọn Chiến Thuật Bot",
      content: "Hệ thống tích hợp sẵn 3 thuật toán cao cấp:\n• EMA200 Bot: Bắt sóng hồi quy xu hướng theo cản động EMA200.\n• SMC Bot: Săn vùng thanh khoản & Order Block phản ứng đảo chiều.\n• Liquidation Bot: Bắt nhịp quét râu thanh khoản của Market Maker.",
      actionHint: "💡 Nhấp vào thanh menu này để đổi qua lại giữa các chiến thuật bất kỳ lúc nào.",
    },
    {
      badge: "Màn Hình Chính • Bước 5 / 19",
      title: "5. Chọn Tài Khoản Áp Dụng",
      content: "Lựa chọn tài khoản OKX mà bạn muốn bot hiện tại vận hành. Mỗi bot có thể chạy trên một tài khoản riêng biệt để phân bổ vốn và tối ưu rủi ro.",
      actionHint: "💡 Khi bot đang chạy, lựa chọn này sẽ tự động khóa 🔒 để bảo vệ các lệnh đang mở.",
    },
    {
      badge: "Màn Hình Chính • Bước 6 / 19",
      title: "6. Quản Lý Vốn & Ký Quỹ Mỗi Lệnh",
      content: "• Đơn vị: Nhập số tiền cố định bằng USDT ($) hoặc tính theo % Vốn tài khoản.\n• Hệ số TF: Chọn 'Cố định' để mọi khung dùng chung 1 mức vốn, hoặc chọn 'Nhân TF' để tự động nhân khối lượng theo khung thời gian (ví dụ H1 x2.0, H4 x5.0).",
      actionHint: "💡 Khuyến nghị cho người mới: Cài đặt mức ký quỹ nhỏ (1$ - 5$) để quan sát nhịp chạy thực tế trước.",
    },
    {
      badge: "Màn Hình Chính • Bước 7 / 19",
      title: "7. Thiết Lập Chốt Lời (TP) & Cắt Lỗ (SL)",
      content: "Cài đặt tỷ lệ TP và SL an toàn. Mức TP/SL thiết lập ở đây là mức CƠ SỞ trên khung M5. Khi bot khớp lệnh ở các khung lớn hơn, hệ thống tự động nhân biên độ theo Hệ Số Vốn (Margin Factor) tương ứng:\n\n📊 BẢNG HỆ SỐ NHÂN TP/SL ĐA KHUNG (Mặc định):\n• M5 : x1.0 ➔ TP 0,8% | SL 0,8% (Khung gốc)\n• M15: x1.2 ➔ TP 0,96% | SL 0,96%\n• M30: x1.5 ➔ TP 1,20% | SL 1,20%\n• H1 : x2.0 ➔ TP 1,60% | SL 1,60%\n• H2 : x3.0 ➔ TP 2,40% | SL 2,40%\n• H4 : x5.0 ➔ TP 4,00% | SL 4,00%\n\n🔍 Bản chất tính toán: Khung nến càng lớn thì biên độ sóng dao động càng mạnh. Nếu giữ nguyên TP/SL 0,8% ở khung H1 hay H4 thì lệnh sẽ rất dễ bị quét râu cắt lỗ non. Bot tự động nới rộng biên độ TP/SL tương ứng để gồng trọn con sóng dài và tối ưu lợi nhuận an toàn.",
      actionHint: "💡 Hệ thống tích hợp Watchdog 15s quét ngầm liên tục, tự động đặt bổ sung cặp TP/SL bảo vệ vị thế 24/7.",
    },
    {
      badge: "Màn Hình Chính • Bước 8 / 19",
      title: "8. Chọn Coin & Khung Nến Giao Dịch",
      content: "• Cột Cặp Coin: Tích chọn các đồng coin bạn muốn bot theo dõi (BTC, ETH, SOL...).\n• Cột Khung Trade: Tích chọn các khung nến (M5, M15, M30, H1, H2, H4) mà bot được phép rải lệnh Limit.",
      actionHint: "💡 Nhấp vào tên coin bất kỳ trên bảng để chuyển nhanh biểu đồ TradingView sang coin đó.",
    },
    {
      badge: "Màn Hình Chính • Bước 9 / 19",
      title: "9. Kích Hoạt Vận Hành Bot Tự Động",
      content: "• Nhấn 'BẮT ĐẦU CHẠY BOT': Bot sẽ quét tín hiệu và tự động vào/đóng lệnh trên sàn OKX 24/7.\n• Khi cần ngưng: Nhấn 'DỪNG BOT' để hủy toàn bộ lệnh Limit chưa khớp và bảo toàn vị thế hiện có.",
      actionHint: "💡 Sau khi kích hoạt, bạn có thể theo dõi bảng Logs hoặc lịch sử giao dịch trực tiếp 24/7.",
    },
    {
      badge: "Màn Hình Chính • Bước 10 / 19",
      title: "10. Khám Phá Bảng Cài Đặt Chuyên Sâu ⚙",
      content: "Nơi cấu hình toàn bộ các cơ chế chuyên sâu của bot: Thêm Mã Giao Dịch, Quản Lý Vốn, Bộ 3 DCA, Cầu Dao Bảo Vệ, Điểm Vào Lệnh, Hệ Số Đa Khung, Tab Hỗ Trợ và Đánh Giá.\n\n• Nhấn 'Tiếp theo ▶' để hệ thống tự động mở Bảng Cài Đặt và cùng khám phá tuần tự từng cơ chế từ trên xuống dưới!",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để bắt đầu khám phá bên trong Bảng Cài Đặt.",
    },
    {
      badge: "Cài Đặt • Bước 11 / 19",
      title: "11. Thêm Mã Giao Dịch (Watchlist Coin)",
      content: "Tùy biến danh mục coin giao dịch cho bot:\n• Nhấp chọn/bỏ chọn từng thẻ coin (XAU, BTC, ETH, SOL, DOGE...).\n• Thẻ coin sáng màu: Đang được bật hiển thị ra ngoài màn hình chính.\n• Khóa bảo vệ: Các coin đang có vị thế mở sẽ tự động khóa an toàn, bạn cần đóng lệnh trước khi bỏ chọn.",
      actionHint: "💡 Bạn có thể bật bao nhiêu đồng coin tùy ý phù hợp với quy mô vốn của mình.",
    },
    {
      badge: "Cài Đặt • Bước 12 / 19",
      title: "12. Tài Khoản & Quản Lý Vốn",
      content: "Thiết lập tài khoản và tỷ lệ phân bổ vốn chuyên sâu cho bot đang chọn:\n• Chọn tài khoản: Gán bot với tài khoản OKX tương ứng.\n• Ký quỹ mỗi lệnh: Nhập số tiền cố định ($) hoặc % vốn tài khoản.\n• Đơn vị & Nhân TF: Chọn 'Cố định' hoặc 'Nhân TF' để khối lượng tự động co giãn theo khung thời gian.\n• Đòn bẩy (Leverage): Cài đặt mức đòn bẩy an toàn cho vị thế.",
      actionHint: "💡 Khi bot đang chạy, các mục tài khoản và ký quỹ sẽ tự động khóa 🔒 để bảo vệ các lệnh đang hoạt động.",
    },
    {
      badge: "Cài Đặt • Bước 13 / 19",
      title: "13. Công Tắc Chiến Thuật (Bộ 3 DCA)",
      content: "Hệ thống hỗ trợ 3 cơ chế xử lý lệnh nâng cao:\n• Pyramid DCA (DCA Dương): Nhồi thêm lệnh khi vị thế đang có lãi theo bậc thang xu hướng (H4 -> M5).\n• Negative DCA (DCA Âm): Trung bình giá khi gồng lỗ và tự động nâng cấp biên độ TP/SL theo khung lớn.\n• Multi-TF Split Grid: Chia lệnh Limit độc lập cho từng khung thời gian, khớp khung nào chốt lời riêng khung đó.",
      actionHint: "💡 Lưu ý: Hệ thống chỉ cho phép kích hoạt 1 trong 3 cơ chế (khi bật chế độ này thì 2 chế độ còn lại sẽ tự động tắt).",
    },
    {
      badge: "Cài Đặt • Bước 14 / 19",
      title: "14. Cầu Dao Bảo Vệ Vốn & Đồng Pha BTC",
      content: "• Cầu Dao Đảo Chiều (Hedge Reversal): Khi giá rướn quá đà cách xa EMA200 H4 (> 8%), bot tự động khóa không rải thêm Limit thuận trend để tránh đu đỉnh/bắt đáy, đồng thời mở lệnh phòng hộ bắt sóng hồi.\n• Đồng Pha BTC: Ép Altcoin (ETH, SOL...) chỉ được tìm điểm vào lệnh cùng hướng với xu hướng của BTC (Đầu tàu thị trường).",
      actionHint: "💡 Khuyến nghị: Luôn BẬT Cầu Dao để tài khoản được bảo vệ tự động 24/7 trước các đợt biến động mạnh.",
    },
    {
      badge: "Cài Đặt • Bước 15 / 19",
      title: "15. Điểm Vào Lệnh (Entry Setup) & Nến Tích Lũy",
      content: "Cơ chế tính toán điểm vào lệnh an toàn:\n• Độ Lệch Đệm (Base Offset %): Đặt Limit đón sớm trước khi giá chạm đúng vạch EMA200 (mặc định 0.05% ở M5), giúp lệnh dễ khớp trước khi thị trường kịp phản ứng bật cản. Khung càng lớn tự động nhân theo Hệ số Vào Lệnh (ví dụ H4 x6.8 -> đệm 0.34%).\n• Khoảng Cách An Toàn (Base Gap %): Cách biệt tối thiểu giữa 2 đường EMA liền kề để tránh rải lệnh quá dày rủi ro.\n• Nến Tích Lũy (Accum Candles): Mặc định 60 nến đóng cửa liên tục nằm cùng 1 phía EMA200 mới mở lệnh, xác nhận xu hướng vững chắc, loại bỏ hoàn toàn bẫy sideway.",
      actionHint: "💡 Cài đặt mặc định của Admin đã được kiểm chứng thực chiến, người mới có thể an tâm giữ nguyên thông số chuẩn.",
    },
    {
      badge: "Cài Đặt • Bước 16 / 19",
      title: "16. Bản Chất Hệ Số Nhân Đa Khung (TF Multipliers)",
      content: "Bản chất tính toán của bot trên từng khung thời gian:\n• Cột Vốn (Margin Factor): Khung nến càng lớn thì khối lượng ký quỹ và biên độ TP/SL càng được tự động nhân rộng tương ứng (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) để thích ứng với biên độ sóng lớn và tối ưu lợi nhuận.\n• Cột Vào Lệnh (Entry Factor): Dùng để nhân tỷ lệ với 'Đón trước cản' (Base Offset %) và 'Khoảng cách nhồi DCA' (Base Gap %). Khung càng lớn thì vùng đệm đón cản càng rộng (M5 x1.0, H4 x6.8), lệnh không bị trượt khi nến khung lớn dao động mạnh.",
      actionHint: "💡 Đây là công thức toán học cốt lõi giúp bot vừa bắt trọn sóng lớn khung H1/H4 vừa tối ưu an toàn vốn ở khung nhỏ M5/M15.",
    },
    {
      badge: "Cài Đặt • Bước 17 / 19",
      title: "17. Lưu Cấu Hình & Khôi Phục Mặc Định",
      content: "• Lưu Cài Đặt: Áp dụng toàn bộ thông số vừa thiết lập cho bot.\n• Khôi Phục Mặc Định: Trở về cấu hình an toàn gốc của Admin bất kỳ lúc nào nếu bạn thử nghiệm chưa ưng ý.",
      actionHint: "💡 Nhấn 'Tiếp theo ▶' để cùng tìm hiểu Tab Hỗ Trợ và Tab Đánh Giá tiếp theo!",
    },
    {
      badge: "Hỗ Trợ • Bước 18 / 19",
      title: "18. Tab Hỗ Trợ & Quản Trị Hệ Thống",
      content: "Nơi quản lý bản quyền và hỗ trợ kỹ thuật 24/7:\n• Điều Kiện Sử Dụng: Hướng dẫn đăng ký tài khoản sàn OKX liên kết mã giới thiệu TLS1 để mở khóa toàn bộ quyền sử dụng bot miễn phí trọn đời.\n• Kiểm Tra API & HWID: Nơi nhập API Key, Secret Key, Passphrase và lấy mã HWID máy tính để kích hoạt bot bản quyền.\n• Đổi IP Máy Chủ & Bảo Trì: Thiết lập IP Proxy tùy chọn và các công cụ Reset vốn, dọn dẹp cache nến khi cần.",
      actionHint: "💡 Bạn có thể nhấp nút 'Sao chép' nhanh HWID hoặc mã giới thiệu để gửi cho đội ngũ hỗ trợ bất kỳ lúc nào.",
    },
    {
      badge: "Đánh Giá • Bước 19 / 19",
      title: "19. Tab Đánh Giá & Hoàn Tất Tour!",
      content: "• Xem Đánh Giá Cộng Đồng: Đọc các nhận xét, hình ảnh kết quả và lợi nhuận thực chiến từ các nhà giao dịch đang sử dụng hệ thống bot.\n• Gửi Đánh Giá Của Bạn: Chấm sao, đính kèm hình ảnh và chia sẻ trải nghiệm sử dụng bot của bạn với cộng đồng.",
      actionHint: "🎉 Chúc mừng bạn đã hoàn thành tour hướng dẫn toàn diện từ A - Z! Bạn đã hiểu rõ mọi tính năng và bản chất hoạt động của bot. Nhấn 'Hoàn tất' để đóng cài đặt và bắt đầu giao dịch!",
    },
  ],

  en: [
    {
      badge: "Main Screen • Step 1 / 19",
      title: "1. OKX Exchange Connect Button",
      content: "Gateway to link your OKX exchange account with the bot system. Supports 2 methods: Fast Connect (1-click secure OAuth 2.0) or manual API Key input.\n\n• Click 'Next ▶' to open the Connect modal and explore both linking methods in detail!",
      actionHint: "💡 Click 'Next ▶' to open the Connect modal.",
    },
    {
      badge: "Connect • Step 2 / 19",
      title: "2. Method 1: Fast Connect (OAuth 2.0)",
      content: "100% secure 1-click connection officially authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX on your mobile app or browser for OAuth 2.0 authorization.\n• 100% Secure: Automatically encrypts and syncs API Keys to the system without secret leakage or tedious copying.\n• Supports independent Sub-Account routing for each individual bot.\n• Expanding soon to Binance Connect, Bybit Connect, and Web3 Wallets.",
      actionHint: "💡 Recommended for beginners: takes only 3 seconds and completely eliminates key typing mistakes.",
    },
    {
      badge: "Connect • Step 3 / 19",
      title: "3. Method 2: Manual API Key (Proactive)",
      content: "For users who prefer to create and manage API credentials directly on OKX:\n• Account Management: Click green (+) to add a new account, select from list, or click (-) to delete.\n• Credentials: Enter API Key, Secret Key, and Passphrase from OKX, then click 'Save Configuration'.\n\n🛡️ CRITICAL SECURITY PRINCIPLE:\n• When creating keys on OKX, ONLY grant 'Trade' permissions.\n• NEVER grant 'Withdraw' permissions. TLS1 Bot never requests withdrawal rights, keeping your funds 100% safe.",
      actionHint: "💡 Click 'Next ▶' to complete Connection setup and explore the 3 Bot Strategies on the main screen!",
    },
    {
      badge: "Main Screen • Step 4 / 19",
      title: "4. Select Bot Strategy",
      content: "The system features 3 built-in quantitative algorithms:\n• EMA200 Bot: Captures multi-timeframe trend pullbacks at dynamic EMA200 levels.\n• SMC Bot: Hunts liquidity zones & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts and liquidation spikes.",
      actionHint: "💡 Click this menu tab anytime to switch between bot algorithms.",
    },
    {
      badge: "Main Screen • Step 5 / 19",
      title: "5. Select Active Account",
      content: "Assign the OKX account designated for this specific bot. Each bot can trade on its own isolated sub-account to allocate capital safely and diversify risks.",
      actionHint: "💡 When the bot is running, this selection locks 🔒 automatically to safeguard open positions.",
    },
    {
      badge: "Main Screen • Step 6 / 19",
      title: "6. Capital & Margin Management",
      content: "• Units: Set fixed USDT amount ($) or calculate dynamically via % Account Equity.\n• TF Multiplier: Select 'Fixed' to use uniform margin across all timeframes, or 'Multiply TF' to scale order sizes with larger timeframes (e.g. H1 x2.0, H4 x5.0).",
      actionHint: "💡 Beginner tip: Start with small margin ($1 - $5) to observe real-world execution first.",
    },
    {
      badge: "Main Screen • Step 7 / 19",
      title: "7. Take Profit (TP) & Stop Loss (SL) Setup",
      content: "Configure safety TP and SL ratios. Values here represent BASE ratios on M5. Higher timeframes automatically scale target amplitudes based on the Margin Factor:\n\n📊 MULTI-TF TP/SL MULTIPLIER TABLE (Default):\n• M5 : x1.0 ➔ TP 0.8% | SL 0.8% (Base TF)\n• M15: x1.2 ➔ TP 0.96% | SL 0.96%\n• M30: x1.5 ➔ TP 1.20% | SL 1.20%\n• H1 : x2.0 ➔ TP 1.60% | SL 1.60%\n• H2 : x3.0 ➔ TP 2.40% | SL 2.40%\n• H4 : x5.0 ➔ TP 4.00% | SL 4.00%\n\n🔍 Core principle: Larger timeframes experience wider swings. Using fixed 0.8% TP/SL on H1 or H4 leads to premature stop-outs. Auto-scaling lets positions ride large trends while protecting gains safely.",
      actionHint: "💡 Features a 15s background Watchdog daemon that continuously scans and places protective TP/SL brackets 24/7.",
    },
    {
      badge: "Main Screen • Step 8 / 19",
      title: "8. Select Trading Coins & Timeframes",
      content: "• Pairs Column: Check the coins you want the bot to trade (BTC, ETH, SOL...).\n• Trade TF Column: Check timeframes (M5, M15, M30, H1, H2, H4) where the bot is authorized to place Limit orders.",
      actionHint: "💡 Click any coin name in the table to instantly switch the TradingView chart to that symbol.",
    },
    {
      badge: "Main Screen • Step 9 / 19",
      title: "9. Activate Automated Bot Engine",
      content: "• Click 'START BOT': The bot continuously scans signals and enters/exits positions on OKX 24/7.\n• When stopping: Click 'STOP BOT' to cancel unfilled limit orders and safeguard existing positions.",
      actionHint: "💡 Once running, monitor live terminal logs and execution status 24/7 in real time.",
    },
    {
      badge: "Main Screen • Step 10 / 19",
      title: "10. Explore Advanced System Settings ⚙",
      content: "Central command for all advanced mechanisms: Watchlist Management, Capital Allocation, DCA Trio, Circuit Breaker, Entry Triggers, Multi-TF Multipliers, Support & Community Reviews.\n\n• Click 'Next ▶' to open the Settings Modal and walk through each mechanism step by step!",
      actionHint: "💡 Click 'Next ▶' to open the Settings panel.",
    },
    {
      badge: "Settings • Step 11 / 19",
      title: "11. Coin Watchlist Configuration",
      content: "Customize trading universe for your bot:\n• Toggle coin tags (XAU, BTC, ETH, SOL, DOGE...).\n• Highlighted badges indicate coins active on the main dashboard.\n• Safety Lock: Coins with currently open positions are automatically locked from deselecting.",
      actionHint: "💡 Activate as many coins as appropriate for your capital capacity.",
    },
    {
      badge: "Settings • Step 12 / 19",
      title: "12. Account & Capital Allocation",
      content: "Configure account assignment and granular risk sizing for the active bot:\n• Select Account: Bind bot to corresponding OKX account.\n• Per-order Margin: Enter fixed USDT ($) or % of equity.\n• Multiplier Mode: Toggle between Fixed or Multiplied margin scaling.\n• Leverage: Set safe leverage ratio for the position.",
      actionHint: "💡 While running, account and margin fields are locked 🔒 to protect active orders.",
    },
    {
      badge: "Settings • Step 13 / 19",
      title: "13. Strategy Switches (DCA Trio)",
      content: "The system provides 3 specialized order scaling algorithms:\n• Pyramid DCA (Positive DCA): Scales up positions as profit grows along trend stairs (H4 -> M5).\n• Negative DCA (Averaging Down): Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Multi-TF Split Grid: Independent limit orders per timeframe, each taking profit independently.",
      actionHint: "💡 Note: Exactly 1 of the 3 modes can be active at a time (enabling one automatically disables the others).",
    },
    {
      badge: "Settings • Step 14 / 19",
      title: "14. Circuit Breaker & BTC Correlation Filter",
      content: "• Hedge Reversal Circuit Breaker: When price overextends far from H4 EMA200 (> 8%), bot locks trend limit orders to avoid tops/bottoms, while opening hedge orders on mean-reversion waves.\n• BTC Correlation Filter: Enforces Altcoins (ETH, SOL...) to only seek entries aligned with market leader BTC trend.",
      actionHint: "💡 Recommended: Keep Circuit Breaker ON 24/7 to protect equity against severe volatility spikes.",
    },
    {
      badge: "Settings • Step 15 / 19",
      title: "15. Entry Setup & Trend Accumulation",
      content: "Safety criteria for limit placement:\n• Base Offset %: Places Limit orders ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds. Scales with Entry Factor on higher TFs (e.g. H4 x6.8 -> 0.34% offset).\n• Base Gap %: Minimum distance required between consecutive EMA lines to avoid dense clustering.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before placing orders, confirming steady trends and filtering sideway noise.",
      actionHint: "💡 Admin defaults are battle-tested in live markets; beginners can safely retain standard parameters.",
    },
    {
      badge: "Settings • Step 16 / 19",
      title: "16. Multi-TF Multiplier Architecture",
      content: "Mathematical scaling mechanics across timeframes:\n• Margin Factor: Larger candles expand margin and TP/SL amplitudes (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) to match swing ranges and optimize profits.\n• Entry Factor: Multiplies Base Offset % and Base Gap %. Higher TFs get wider buffering zones (M5 x1.0, H4 x6.8) preventing order slippage during large candle fluctuations.",
      actionHint: "💡 Core mathematical model enabling the bot to ride massive H1/H4 waves while keeping capital safe on M5/M15.",
    },
    {
      badge: "Settings • Step 17 / 19",
      title: "17. Save Configuration & Reset Defaults",
      content: "• Save Strategy: Immediately writes all modified parameters into the bot configuration.\n• Reset to Default: Revert to Admin battle-tested baseline settings anytime if experiments prove unsatisfactory.",
      actionHint: "💡 Click 'Next ▶' to inspect the Support and Community Reviews tabs next!",
    },
    {
      badge: "Support • Step 18 / 19",
      title: "18. Support & System Administration Tab",
      content: "License management and 24/7 technical assistance:\n• Terms of Service: Guide to registering OKX account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify API Key connectivity and retrieve PC HWID for license activation.\n• Proxy & Maintenance: Optional Proxy IP setup, capital reset tools, and candle cache cleaners.",
      actionHint: "💡 Click 'Copy' to quickly share HWID or referral code with the support team anytime.",
    },
    {
      badge: "Reviews • Step 19 / 19",
      title: "19. Community Reviews & Tour Complete!",
      content: "• View Community Reviews: Browse verified feedback, profit screenshots, and live trading results from fellow traders.\n• Submit Your Review: Rate stars, attach trade snapshots, and share your experience with the community.",
      actionHint: "🎉 Congratulations on completing the full A-Z onboarding tour! You now master all features and inner logic of the bot. Click 'Finish' to close and begin trading!",
    },
  ],

  zh: [
    {
      badge: "主界面 • 第 1 / 19 步",
      title: "1. OKX 交易所连接按钮 (Connect)",
      content: "将您的 OKX 账户与交易机器人系统绑定的入口。支持 2 种方式：Fast Connect（一键安全 OAuth 2.0）或手动输入 API Key。\n\n• 点击“下一步 ▶”打开连接窗口，深入了解两种连接方式！",
      actionHint: "💡 点击“下一步 ▶”打开连接弹窗。",
    },
    {
      badge: "连接 • 第 2 / 19 步",
      title: "2. 方式一：Fast Connect (OAuth 2.0)",
      content: "OKX 官方授权的 100% 安全一键连接：\n• 点击“打开 App ➔”：自动打开手机或浏览器上的 OKX App 完成 OAuth 2.0 授权。\n• 100% 安全：自动加密并同步 API Key，绝无泄露风险，告别繁琐的复制粘贴。\n• 支持为每个机器人独立连接和管理多个子账户 (Sub-Account)。\n• 即将拓展至 Binance Connect、Bybit Connect 及 Web3 钱包。",
      actionHint: "💡 新手强烈推荐：只需 3 秒极速连通，彻底杜绝输错密钥的风险。",
    },
    {
      badge: "连接 • 第 3 / 19 步",
      title: "3. 方式二：手动输入 API Key (自主管理)",
      content: "适合希望在 OKX 交易所自主创建和管理 API Key 的用户：\n• 账户管理：点击绿色 (+) 创建新账户，从列表中选择账户，或点击 (-) 删除。\n• 密钥输入：准确填写 OKX 生成的 API Key、Secret Key 和 Passphrase，然后点击“保存配置”。\n\n🛡️ 至关重要的安全准则：\n• 在 OKX 创建 API Key 时，只需开启“Trade”（交易）权限。\n• 严禁开启“Withdraw”（提币）权限！TLS1 机器人绝不会请求提币权限，确保您的资金 100% 绝对安全。",
      actionHint: "💡 点击“下一步 ▶”完成连接引导，开始探索主界面的三大核心策略机器人！",
    },
    {
      badge: "主界面 • 第 4 / 19 步",
      title: "4. 选择机器人量化策略",
      content: "系统内置 3 种高阶量化算法：\n• EMA200 机器人：依托 EMA200 动态阻力捕捉多周期趋势回踩。\n• SMC 机器人：猎取流动性区域与订单块 (Order Block) 反转。\n• 清算猎手机器人：捕捉做市商诱多诱空清算针尖行情。",
      actionHint: "💡 随时点击此菜单在不同策略之间自由切换。",
    },
    {
      badge: "主界面 • 第 5 / 19 步",
      title: "5. 选择当前执行账户",
      content: "选择当前机器人运行的 OKX 交易账户。每个策略机器人可运行在完全独立的子账户上，实现科学资金分流与风险隔离。",
      actionHint: "💡 机器人运行期间，此选项将自动锁定 🔒 以保护持仓安全。",
    },
    {
      badge: "主界面 • 第 6 / 19 步",
      title: "6. 资金与每单保证金管理",
      content: "• 单位：输入固定 USDT 金额 ($) 或按账户总资金百分比 (% Vốn) 计算。\n• 周期倍数：选择“固定”使所有周期共用相同本金，或选择“倍数”随大周期自动放大下单量（例如 H1 x2.0, H4 x5.0）。",
      actionHint: "💡 新手建议：先设置较小的保证金（1$ - 5$）观察实盘节奏。",
    },
    {
      badge: "主界面 • 第 7 / 19 步",
      title: "7. 止盈 (TP) 与止损 (SL) 配置",
      content: "设置安全止盈与止损比例。此处设置的值为 M5 基准比例，在大周期成交时系统自动按资金倍数等比放大：\n\n📊 多周期止盈止损倍数表（默认）：\n• M5 : x1.0 ➔ TP 0.8% | SL 0.8% (基准周期)\n• M15: x1.2 ➔ TP 0.96% | SL 0.96%\n• M30: x1.5 ➔ TP 1.20% | SL 1.20%\n• H1 : x2.0 ➔ TP 1.60% | SL 1.60%\n• H2 : x3.0 ➔ TP 2.40% | SL 2.40%\n• H4 : x5.0 ➔ TP 4.00% | SL 4.00%\n\n🔍 计算本质：周期越大波动空间越广，若大周期依然死守 0.8% 极易被毛刺打掉。自动放宽比例可吃满趋势利润并筑牢安全防线。",
      actionHint: "💡 内置 15 秒后台看门狗 (Watchdog) 24/7 实时巡检补挂双边保护订单。",
    },
    {
      badge: "主界面 • 第 8 / 19 步",
      title: "8. 选择监控币种与交易周期",
      content: "• 交易对列表：勾选希望机器人监控的币种（BTC, ETH, SOL...）。\n• 交易周期：勾选允许机器人挂单的 K 线周期（M5, M15, M30, H1, H2, H4）。",
      actionHint: "💡 点击表格中任意币种名称，右侧 TradingView 图表将立即切换至对应币种。",
    },
    {
      badge: "主界面 • 第 9 / 19 步",
      title: "9. 启动全自动量化运行",
      content: "• 点击“启动机器人”：机器人将 24/7 自动扫描信号并在 OKX 下单/平仓。\n• 需要停止时：点击“停止机器人”自动撤销所有未成交挂单并保留已有仓位。",
      actionHint: "💡 启动后可随时在日志终端中查看 24/7 实时运行细节。",
    },
    {
      badge: "主界面 • 第 10 / 19 步",
      title: "10. 深度探索系统设置面板 ⚙",
      content: "核心控制中枢：交易对池、资金管理、DCA 三重机制、熔断保护、入场参数、多周期倍数、技术支持与社区评价。\n\n• 点击“下一步 ▶”打开设置面板，逐项拆解核心机制！",
      actionHint: "💡 点击“下一步 ▶”进入系统设置内部。",
    },
    {
      badge: "系统设置 • 第 11 / 19 步",
      title: "11. 交易对池 (Watchlist Coin)",
      content: "自定义机器人的交易币种池：\n• 单击选中或取消各个币种标签（XAU, BTC, ETH, SOL, DOGE...）。\n• 高亮标签：代表已激活并在主界面表格中显示。\n• 安全锁：已有持仓的币种将自动上锁，必须平仓后才可移除。",
      actionHint: "💡 您可以根据账户本金规模自由配置启用的币种数量。",
    },
    {
      badge: "系统设置 • 第 12 / 19 步",
      title: "12. 账户与深度资金分配",
      content: "针对当前机器人的账户归属与本金分配：\n• 账户绑定：将策略与指定的 OKX 子账户关联。\n• 单笔保证金：输入固定 USDT 或账户百分比。\n• 周期倍数模式：自由切换固定保证金或多周期递增。\n• 杠杆倍数 (Leverage)：设置稳健杠杆比例。",
      actionHint: "💡 机器人运行中账户与资金项将自动锁定 🔒 保护持仓订单。",
    },
    {
      badge: "系统设置 • 第 13 / 19 步",
      title: "13. 核心策略模式 (DCA 三重奏)",
      content: "系统支持 3 种高阶订单管理逻辑：\n• 金字塔 DCA (正向顺势加仓)：盈利时沿趋势阶梯式追击加仓 (H4 -> M5)。\n• 负向 DCA (逆势网格均价)：回撤时分批拉低均价并按大周期放大止盈空间。\n• 多周期独立网格 (Multi-TF Grid)：各周期独立挂单，各自止盈互不干扰。",
      actionHint: "💡 提示：系统严格单选其一（激活一项时其余两项自动关闭）。",
    },
    {
      badge: "系统设置 • 第 14 / 19 步",
      title: "14. 资金熔断器与 BTC 趋势同频",
      content: "• 反转对冲熔断 (Hedge Reversal)：当价格偏离 H4 EMA200 超过 8% 时，机器人自动禁止顺势追单防止摸顶抄底，同时启动反向对冲单捕捉回归波段。\n• BTC 趋势同频：强制主流币 (ETH, SOL...) 仅允许沿比特币大盘方向入场。",
      actionHint: "💡 强烈建议：始终开启熔断器，全天候防御极端黑天鹅行情。",
    },
    {
      badge: "系统设置 • 第 15 / 19 步",
      title: "15. 入场缓冲与趋势凝聚蜡烛",
      content: "精准入场与防噪滤波机制：\n• 缓冲偏移 (Base Offset %)：在价格触及 EMA200 前提前挂单迎击（M5 默认 0.05%），大周期按入场倍数放大（如 H4 x6.8 -> 0.34% 缓冲）。\n• 安全间距 (Base Gap %)：相邻 EMA 线之间的最小安全间隔，防止订单过于密集。\n• 凝聚蜡烛 (Accum Candles)：默认 60 根连续 K 线收盘在 EMA200 同侧才开仓，确认坚实趋势并彻底过滤震荡假突破。",
      actionHint: "💡 管理员实战默认参数经久验证，新手保持默认即可稳健运行。",
    },
    {
      badge: "系统设置 • 第 16 / 19 步",
      title: "16. 多周期倍数本质 (TF Multipliers)",
      content: "核心数学模型解析：\n• 资金倍数 (Margin Factor)：周期越大，保证金与 TP/SL 幅度等比放大（M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0），适应大波动并吃透利润。\n• 入场倍数 (Entry Factor)：放大缓冲偏移与加仓间距，大周期缓冲更宽（M5 x1.0, H4 x6.8），剧烈震荡时不漏单。",
      actionHint: "💡 这是机器人既能在大周期吃满大波段、又能在小周期控制风险的数学精髓。",
    },
    {
      badge: "系统设置 • 第 17 / 19 步",
      title: "17. 保存策略与恢复出厂设置",
      content: "• 保存策略：立即将当前设置生效并写入机器人配置。\n• 恢复默认：若自定义调试不理想，可随时一键恢复至管理员原装实战参数。",
      actionHint: "💡 点击“下一步 ▶”继续了解技术支持与用户评价专区！",
    },
    {
      badge: "支持 • 第 18 / 19 步",
      title: "18. 技术支持与系统运维面板",
      content: "授权许可与 24/7 技术保障中枢：\n• 使用须知：指导注册绑定 TLS1 推荐码的 OKX 账户以终身免费解锁全功能。\n• API 与 HWID 检测：一键检测 API 连通性并获取本机硬件 HWID 激活授权。\n• 代理与维护：配置代理 IP、重置资金统计、清理行情 K 线缓存。",
      actionHint: "💡 点击“复制”即可一键复制 HWID 或推荐码并发送给客服团队。",
    },
    {
      badge: "评价 • 第 19 / 19 步",
      title: "19. 社区评价与圆满通关！",
      content: "• 浏览社区实盘评价：查看广大交易者的真实收益反馈与实战截图。\n• 提交您的使用评价：为机器人打星评分、上传收益截图并分享量化心得。",
      actionHint: "🎉 恭喜您完成 A-Z 全方位新手引导！您已全面掌握机器人的核心原理与实战功能。点击“完成”关闭面板，开启您的智能交易之旅！",
    },
  ],

  ko: [
    {
      badge: "메인 화면 • 1 / 19 단계",
      title: "1. OKX 거래소 연결 버튼 (Connect)",
      content: "OKX 거래소 계정을 봇 시스템과 연동하는 게이트웨이입니다. 2가지 방식 지원: Fast Connect (원클릭 보안 OAuth 2.0) 또는 수동 API Key 입력.\n\n• '다음 ▶'을 클릭하여 연결 창을 열고 두 가지 연동 방식을 살펴보세요!",
      actionHint: "💡 '다음 ▶'을 클릭하여 연결 팝업을 엽니다.",
    },
    {
      badge: "연결 • 2 / 19 단계",
      title: "2. 방법 1: Fast Connect (OAuth 2.0)",
      content: "OKX 공식 승인 100% 안전한 원클릭 연동:\n• '앱 열기 ➔' 클릭: 모바일 또는 브라우저에서 OKX 앱을 열어 OAuth 2.0 권한을 승인합니다.\n• 100% 안전: API Key 자동 암호화 동기화, 비밀키 유출 걱정 없음, 번거로운 복사 붙여넣기 불필요.\n• 각 봇별로 독립된 서브 계정(Sub-Account) 다중 연결 지원.\n• 바이낸스 커넥트, 바이비트 커넥트, Web3 지갑 지원 예정.",
      actionHint: "💡 초보자 추천: 3초 만에 초고속 연동되며 키 복사 오류 위험을 원천 차단합니다.",
    },
    {
      badge: "연결 • 3 / 19 단계",
      title: "3. 방법 2: 수동 API Key 입력 (자율 관리)",
      content: "OKX에서 직접 API Key를 생성하고 관리하려는 사용자를 위한 방식:\n• 계정 관리: 녹색 (+) 버튼으로 새 계정 추가, 목록에서 계정 선택, (-)로 삭제.\n• 키 입력: OKX에서 발급받은 API Key, Secret Key, Passphrase를 입력 후 '설정 저장' 클릭.\n\n🛡️ 핵심 보안 원칙:\n• OKX에서 API Key 생성 시 'Trade'(거래) 권한만 부여하세요.\n• 'Withdraw'(출금) 권한은 절대 부여하지 마세요! TLS1 봇은 출금 권한을 요구하지 않으며 자산을 100% 안전하게 보호합니다.",
      actionHint: "💡 '다음 ▶'을 클릭하여 연결 섹션을 완료하고 메인 화면의 3대 봇 전략을 살펴보세요!",
    },
    {
      badge: "메인 화면 • 4 / 19 단계",
      title: "4. 봇 퀀트 전략 선택",
      content: "시스템에 내장된 3가지 프리미엄 알고리즘:\n• EMA200 봇: EMA200 동적 지지/저항선을 활용한 다중 타임프레임 추세 풀백 공략.\n• SMC 봇: 유동성 풀 및 오더블록(Order Block) 반전 포착.\n• 청산 헌터 봇: 마켓 메이커의 스탑 헌팅 청산 꼬리 공략.",
      actionHint: "💡 이 메뉴 탭을 클릭하여 언제든지 전략을 자유롭게 전환하세요.",
    },
    {
      badge: "메인 화면 • 5 / 19 단계",
      title: "5. 활성 계정 선택",
      content: "현재 봇이 작동할 OKX 거래 계정을 선택합니다. 각 봇은 독립된 서브 계정에서 실행되어 자본을 안전하게 배분하고 리스크를 분산합니다.",
      actionHint: "💡 봇 작동 중에는 열린 포지션 보호를 위해 이 옵션이 자동 잠금 🔒 처리됩니다.",
    },
    {
      badge: "메인 화면 • 6 / 19 단계",
      title: "6. 자본 및 주문 증거금 관리",
      content: "• 단위: 고정 USDT 금액 ($) 입력 또는 총 자본 대비 % 비율 선택.\n• TF 계수: '고정'을 선택해 모든 타임프레임에 동일 증거금을 적용하거나, '배수'를 선택해 큰 타임프레임에 맞춰 주문 크기를 자동 증액(예: H1 x2.0, H4 x5.0).",
      actionHint: "💡 초보자 추천: 소액 증거금($1 - $5)으로 시작하여 실제 체결 흐름을 먼저 확인하세요.",
    },
    {
      badge: "메인 화면 • 7 / 19 단계",
      title: "7. 익절 (TP) 및 손절 (SL) 설정",
      content: "안전 익절 및 손절 비율 설정. 여기서 설정한 수치는 M5 기준값이며, 상위 타임프레임 체결 시 증거금 계수에 맞춰 자동 확대됩니다:\n\n📊 다중 TF 익절/손절 배수표 (기본값):\n• M5 : x1.0 ➔ TP 0.8% | SL 0.8% (기준 타임프레임)\n• M15: x1.2 ➔ TP 0.96% | SL 0.96%\n• M30: x1.5 ➔ TP 1.20% | SL 1.20%\n• H1 : x2.0 ➔ TP 1.60% | SL 1.60%\n• H2 : x3.0 ➔ TP 2.40% | SL 2.40%\n• H4 : x5.0 ➔ TP 4.00% | SL 4.00%\n\n🔍 핵심 원리: 상위 캔들일수록 변동 폭이 큽니다. 상위 캔들에서도 0.8%를 고정하면 꼬리에 조기 손절당하기 쉽습니다. 자동 스케일링을 통해 추세를 길게 타고 수익을 극대화합니다.",
      actionHint: "💡 15초 백그라운드 워치독(Watchdog)이 상시 스캔하여 24/7 보호 TP/SL을 자동으로 체결합니다.",
    },
    {
      badge: "메인 화면 • 8 / 19 단계",
      title: "8. 감시 코인 및 거래 타임프레임 선택",
      content: "• 코인 컬럼: 봇이 감시할 코인을 체크합니다(BTC, ETH, SOL...).\n• 거래 TF 컬럼: 지정가 주문을 배치할 수 있는 캔들 주기(M5, M15, M30, H1, H2, H4)를 체크합니다.",
      actionHint: "💡 테이블의 코인 이름을 클릭하면 우측 트레이딩뷰 차트가 해당 코인으로 즉시 전환됩니다.",
    },
    {
      badge: "메인 화면 • 9 / 19 단계",
      title: "9. 자동 봇 엔진 시작",
      content: "• '봇 시작' 클릭: 봇이 24/7 신호를 스캔하고 OKX에서 자동으로 진입 및 청산합니다.\n• 중지 필요 시: '봇 중지' 클릭 시 미체결 지정가 주문을 자동 취소하고 기존 포지션을 보호합니다.",
      actionHint: "💡 시작 후 로그 터미널을 통해 24/7 실시간 실행 상태를 모니터링할 수 있습니다.",
    },
    {
      badge: "메인 화면 • 10 / 19 단계",
      title: "10. 고급 시스템 설정 탐색 ⚙",
      content: "봇의 모든 고급 메커니즘을 설정하는 지휘 센터: 워치리스트, 자본 관리, 3대 DCA, 서킷 브레이커, 진입 필터, 다중 TF 계수, 고객지원 및 커뮤니티 리뷰.\n\n• '다음 ▶'을 클릭하여 설정 패널을 열고 순서대로 살펴봅니다!",
      actionHint: "💡 '다음 ▶'을 클릭하여 시스템 설정으로 들어갑니다.",
    },
    {
      badge: "설정 • 11 / 19 단계",
      title: "11. 코인 워치리스트 (Watchlist)",
      content: "봇이 거래할 코인 종목군 커스텀:\n• 각 코인 뱃지(XAU, BTC, ETH, SOL, DOGE...)를 클릭하여 켜고 끕니다.\n• 강조 표시된 뱃지는 메인 대시보드에 활성화된 코인입니다.\n• 안전 잠금: 현재 열린 포지션이 있는 코인은 포지션 종료 전까지 자동 잠금됩니다.",
      actionHint: "💡 계정 자본 규모에 맞춰 원하는 만큼 코인을 자유롭게 활성화하세요.",
    },
    {
      badge: "설정 • 12 / 19 단계",
      title: "12. 계정 및 심층 자본 배분",
      content: "선택한 봇의 계정 매핑 및 자본 비율 설정:\n• 계정 선택: 봇을 해당 OKX 계정에 바인딩.\n• 주문당 증거금: 고정 USDT 또는 자본 대비 % 입력.\n• 증거금 배수 모드: 고정 또는 타임프레임 연동 배수 선택.\n• 레버리지: 안전 레버리지 비율 설정.",
      actionHint: "💡 봇 실행 중에는 주문 보호를 위해 계정 및 증거금 항목이 자동 잠금 🔒 처리됩니다.",
    },
    {
      badge: "설정 • 13 / 19 단계",
      title: "13. 전략 스위치 (3대 DCA 메커니즘)",
      content: "시스템이 지원하는 3가지 고급 주문 처리 알고리즘:\n• 피라미드 DCA (수익 불타기): 수익 중인 포지션에 추세 계단식 추가 진입(H4 -> M5).\n• 네거티브 DCA (물타기 평단 최적화): 손실 구간에서 평단가를 낮추며 상위 TF 기준 익절 목표 확대.\n• 다중 TF 독립 그리드: 타임프레임별 독립 지정가 배치, 개별 익절.",
      actionHint: "💡 안내: 3가지 모드 중 1가지만 활성화 가능합니다(하나를 켜면 나머지 2개는 자동 비활성화).",
    },
    {
      badge: "설정 • 14 / 19 단계",
      title: "14. 서킷 브레이커 및 BTC 추세 동기화",
      content: "• 반전 헷지 서킷 브레이커: 가격이 H4 EMA200 대비 8% 이상 과도하게 이격될 경우, 고점 매수/저점 매도 방지를 위해 순추세 진입을 잠그고 반등 헷지 주문을 개시합니다.\n• BTC 추세 동기화: 알트코인(ETH, SOL...)이 대장주 비트코인의 추세 방향과 일치할 때만 진입하도록 강제합니다.",
      actionHint: "💡 강력 권장: 급격한 시장 변동성으로부터 자본을 보호하기 위해 서킷 브레이커를 항상 켜두세요.",
    },
    {
      badge: "설정 • 15 / 19 단계",
      title: "15. 진입 버퍼 및 추세 축적 캔들",
      content: "정밀 진입 및 노이즈 필터링 설정:\n• 기준 버퍼 오프셋 %: EMA200 터치 전 선제 지정가 배치(M5 기본 0.05%), 상위 TF 진입 계수 연동 확대(예: H4 x6.8 -> 0.34%).\n• 안전 간격 %: 인접 EMA 간 최소 안전 간격 유지로 밀집 위험 방지.\n• 추세 축적 캔들: 60개 연속 캔들이 EMA200 같은 편에서 마감해야 진입하여 횡보 휩쏘 완벽 제거.",
      actionHint: "💡 관리자 기본값은 실전 검증된 수치이므로 초보자는 기본값을 유지하는 것이 안전합니다.",
    },
    {
      badge: "설정 • 16 / 19 단계",
      title: "16. 다중 TF 배수 본질 (TF Multipliers)",
      content: "핵심 수학 모델 해석:\n• 증거금 계수: 캔들이 클수록 증거금과 TP/SL 폭을 등비 확대(M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0)하여 큰 파동을 온전히 수익화.\n• 진입 계수: 선제 오프셋과 DCA 간격을 확대하여 상위 TF(M5 x1.0, H4 x6.8) 캔들 급변 시 주문 슬리피지를 방지.",
      actionHint: "💡 H1/H4의 대형 파동을 잡으면서 M5/M15에서 리스크를 관리하는 수학적 정수입니다.",
    },
    {
      badge: "설정 • 17 / 19 단계",
      title: "17. 설정 저장 및 기본값 초기화",
      content: "• 전략 저장: 방금 변경한 모든 파라미터를 봇 설정에 즉시 적용합니다.\n• 기본값 초기화: 실험 후 언제든지 관리자 오리지널 안전 설정으로 복구 가능합니다.",
      actionHint: "💡 '다음 ▶'을 클릭하여 고객지원 및 커뮤니티 리뷰 탭을 살펴보세요!",
    },
    {
      badge: "지원 • 18 / 19 단계",
      title: "18. 고객지원 및 시스템 관리 탭",
      content: "라이선스 관리 및 24/7 기술 지원 허브:\n• 이용 조건: TLS1 추천인 코드로 OKX 계정을 가입하여 평생 무료 라이선스 활성화.\n• API & HWID 확인: API 연결 상태 점검 및 라이선스 등록을 위한 PC HWID 확인.\n• 프록시 및 유지보수: 프록시 IP 설정, 자본 통계 리셋, 캔들 캐시 청소.",
      actionHint: "💡 '복사' 버튼으로 HWID나 추천인 코드를 빠르게 복사하여 지원팀에 전달할 수 있습니다.",
    },
    {
      badge: "리뷰 • 19 / 19 단계",
      title: "19. 커뮤니티 리뷰 및 투어 완료!",
      content: "• 커뮤니티 리뷰 보기: 다른 트레이더들의 실제 수익 인증과 솔직한 후기 확인.\n• 리뷰 작성하기: 별점 평가, 수익 스크린샷 첨부, 나만의 사용 후기를 커뮤니티와 공유.",
      actionHint: "🎉 축하합니다! A부터 Z까지 모든 온보딩 과정을 마쳤습니다. 봇의 핵심 원리와 기능을 완벽히 이해하셨습니다. '완료'를 눌러 트레이딩을 시작하세요!",
    },
  ],

  fr: [
    {
      badge: "Écran Principal • Étape 1 / 19",
      title: "1. Bouton de Connexion OKX (Connect)",
      content: "Passerelle pour associer votre compte OKX au système de bots. Prend en charge 2 méthodes : Fast Connect (1-clic OAuth 2.0 sécurisé) ou saisie manuelle de la clé API.\n\n• Cliquez sur 'Suivant ▶' pour ouvrir la fenêtre de connexion et explorer les deux méthodes en détail !",
      actionHint: "💡 Cliquez sur 'Suivant ▶' pour ouvrir le modal de connexion.",
    },
    {
      badge: "Connexion • Étape 2 / 19",
      title: "2. Méthode 1 : Fast Connect (OAuth 2.0)",
      content: "Connexion 1-clic 100% sécurisée officiellement agréée par OKX :\n• Cliquez sur 'Ouvrir App ➔' : Ouvre l'application OKX sur mobile ou navigateur pour l'autorisation OAuth 2.0.\n• Sécurité totale : Chiffrement et synchronisation automatiques des clés API, sans risque de fuite ni copier-coller fastidieux.\n• Gestion de sous-comptes indépendants pour chaque bot.\n• Bientôt disponible pour Binance Connect, Bybit Connect et portefeuilles Web3.",
      actionHint: "💡 Idéal pour les débutants : connexion ultra-rapide en 3 secondes sans erreur de saisie.",
    },
    {
      badge: "Connexion • Étape 3 / 19",
      title: "3. Méthode 2 : Saisie Manuelle de Clé API",
      content: "Pour les utilisateurs souhaitant gérer manuellement leurs clés API OKX :\n• Gestion des comptes : Cliquez sur (+) vert pour ajouter un compte, sélectionnez-le ou utilisez (-) pour supprimer.\n• Clés API : Renseignez la clé API, la clé secrète et le passphrase d'OKX, puis sauvegardez.\n\n🛡️ RÈGLE DE SÉCURITÉ CRUCIALE :\n• Accordez UNIQUEMENT la permission 'Trade' (Trading).\n• N'ACCORDEZ JAMAIS la permission 'Withdraw' (Retrait). Le bot TLS1 ne demande jamais l'accès aux retraits, garantissant une sécurité à 100%.",
      actionHint: "💡 Cliquez sur 'Suivant ▶' pour terminer la connexion et explorer les 3 stratégies de bots !",
    },
    {
      badge: "Écran Principal • Étape 4 / 19",
      title: "4. Choisir la Stratégie du Bot",
      content: "Le système intègre 3 algorithmes quantitatifs avancés :\n• Bot EMA200 : Capture les replis de tendance multi-périodes aux niveaux dynamiques EMA200.\n• Bot SMC : Traque les zones de liquidité et les retournements sur Order Blocks.\n• Bot Chasse aux Liquidations : Exploite les mèches de chasse aux stop des teneurs de marché.",
      actionHint: "💡 Cliquez sur ce menu à tout moment pour basculer d'une stratégie à l'autre.",
    },
    {
      badge: "Écran Principal • Étape 5 / 19",
      title: "5. Sélectionner le Compte Actif",
      content: "Assignez le compte OKX dédié à ce bot. Chaque bot peut fonctionner sur un sous-compte isolé afin de répartir le capital et diversifier les risques en toute sécurité.",
      actionHint: "💡 Lorsque le bot est actif, cette option se verrouille 🔒 automatiquement pour protéger vos positions.",
    },
    {
      badge: "Écran Principal • Étape 6 / 19",
      title: "6. Gestion du Capital & Marge par Ordre",
      content: "• Unité : Montant fixe en USDT ($) ou calculé en % du capital total.\n• Multiplicateur UT : Choisissez 'Fixe' pour une marge uniforme ou 'Multiplicateur' pour faire évoluer la taille des ordres selon l'unité de temps (ex. H1 x2.0, H4 x5.0).",
      actionHint: "💡 Conseil débutant : Démarrez avec une petite marge (1$ - 5$) pour observer l'exécution en direct.",
    },
    {
      badge: "Écran Principal • Étape 7 / 19",
      title: "7. Configuration Take Profit (TP) & Stop Loss (SL)",
      content: "Définissez des ratios de sécurité TP et SL. Les valeurs ici sont des bases M5. Les unités supérieures multiplient automatiquement l'amplitude selon le Facteur de Marge :\n\n📊 MULTIPLICATEURS TP/SL MULTI-UT (Défaut) :\n• M5 : x1.0 ➔ TP 0,8% | SL 0,8% (Base)\n• M15: x1.2 ➔ TP 0,96% | SL 0,96%\n• M30: x1.5 ➔ TP 1,20% | SL 1,20%\n• H1 : x2.0 ➔ TP 1,60% | SL 1,60%\n• H2 : x3.0 ➔ TP 2,40% | SL 2,40%\n• H4 : x5.0 ➔ TP 4,00% | SL 4,00%\n\n🔍 Principe clé : Les grandes UT oscillent davantage. Conserver un SL de 0,8% sur H1/H4 risquerait d'entraîner une sortie prématurée sur mèche. L'adaptation protège et maximise les gains.",
      actionHint: "💡 Surveillance Watchdog en arrière-plan toutes les 15s plaçant les TP/SL de protection 24/7.",
    },
    {
      badge: "Écran Principal • Étape 8 / 19",
      title: "8. Sélection des Paires et Unités de Temps",
      content: "• Colonne Paires : Cochez les cryptomonnaies à surveiller (BTC, ETH, SOL...).\n• Colonne UT Trade : Cochez les unités de temps (M5, M15, M30, H1, H2, H4) autorisées pour les ordres Limit.",
      actionHint: "💡 Cliquez sur le nom d'un actif pour basculer instantanément le graphique TradingView sur celui-ci.",
    },
    {
      badge: "Écran Principal • Étape 9 / 19",
      title: "9. Activation du Trading Automatique",
      content: "• Cliquez sur 'LANCER BOT' : Le bot analyse les signaux et exécute les ordres sur OKX 24/7.\n• Pour stopper : Cliquez sur 'ARRÊTER BOT' pour annuler les ordres Limit en attente et sécuriser vos positions.",
      actionHint: "💡 Une fois lancé, suivez l'historique et les logs en direct dans le terminal 24/7.",
    },
    {
      badge: "Écran Principal • Étape 10 / 19",
      title: "10. Paramètres Avancés du Système ⚙",
      content: "Centre de commande avancé : Liste de surveillance, Gestion du capital, Trio DCA, Disjoncteur, Filtres d'entrée, Multiplicateurs UT, Support & Avis de la communauté.\n\n• Cliquez sur 'Suivant ▶' pour ouvrir les paramètres et explorer chaque mécanisme !",
      actionHint: "💡 Cliquez sur 'Suivant ▶' pour ouvrir le panneau des paramètres.",
    },
    {
      badge: "Paramètres • Étape 11 / 19",
      title: "11. Liste de Surveillance (Watchlist)",
      content: "Personnalisez la liste des actifs surveillés par le bot :\n• Cliquez pour activer/désactiver les badges (XAU, BTC, ETH, SOL, DOGE...).\n• Badges lumineux : Actifs affichés sur l'écran d'accueil.\n• Verrouillage de sécurité : Les actifs avec position ouverte sont verrouillés automatiquement.",
      actionHint: "💡 Activez autant d'actifs que votre capital le permet.",
    },
    {
      badge: "Paramètres • Étape 12 / 19",
      title: "12. Compte et Allocation du Capital",
      content: "Configuration du compte et du dimensionnement des risques pour ce bot :\n• Compte : Associez le bot au sous-compte OKX correspondant.\n• Marge par ordre : Montant fixe USDT ou % du capital.\n• Mode multiplicateur : Choisissez entre marge fixe ou évolutive.\n• Effet de levier : Définissez un ratio prudent.",
      actionHint: "💡 En cours d'exécution, le compte et la marge sont verrouillés 🔒 pour préserver les ordres.",
    },
    {
      badge: "Paramètres • Étape 13 / 19",
      title: "13. Mécanismes DCA (Trio Stratégique)",
      content: "Le système propose 3 algorithmes de gestion d'ordres :\n• Pyramid DCA (Renfort gagnant) : Ajoute des ordres dans le sens de la tendance gagnante (H4 -> M5).\n• Negative DCA (Moyennage à la baisse) : Réduit le prix d'entrée moyen avec TP/SL élargi sur grande UT.\n• Multi-TF Split Grid : Grille indépendante par unité de temps, chaque ordre prenant son profit séparément.",
      actionHint: "💡 Remarque : Un seul mode peut être actif à la fois (en activer un désactive les deux autres).",
    },
    {
      badge: "Paramètres • Étape 14 / 19",
      title: "14. Disjoncteur de Protection & Filtre BTC",
      content: "• Disjoncteur Inverseur (Hedge Reversal) : Si le prix s'éloigne excessivement de l'EMA200 H4 (> 8%), le bot bloque les ordres de suivi de tendance pour éviter les sommets et ouvre un hedge de retour à la moyenne.\n• Corrélation BTC : Force les altcoins (ETH, SOL...) à n'entrer que dans la direction de tendance du Bitcoin.",
      actionHint: "💡 Recommandation : Gardez le disjoncteur activé pour protéger votre capital contre les krachs soudains.",
    },
    {
      badge: "Paramètres • Étape 15 / 19",
      title: "15. Configuration d'Entrée & Bougies d'Accumulation",
      content: "Critères d'entrée sécurisée :\n• Décalage Tampon (Base Offset %) : Place les ordres Limit avant le contact exact EMA200 (défaut 0,05% sur M5). Multiplié sur les grandes UT (ex. H4 x6.8 -> 0,34%).\n• Écart de Sécurité (Base Gap %) : Distance minimale entre deux EMA pour éviter la surconcentration.\n• Bougies d'Accumulation : Exige 60 bougies consécutives clôturées du même côté de l'EMA200 avant d'entrer, confirmant une tendance saine et éliminant les faux départs.",
      actionHint: "💡 Les paramètres par défaut sont éprouvés en trading réel ; les débutants peuvent les conserver sans risque.",
    },
    {
      badge: "Paramètres • Étape 16 / 19",
      title: "16. Multiplicateurs Multi-UT (TF Multipliers)",
      content: "Modèle mathématique par unité de temps :\n• Facteur de Marge : Les grandes UT augmentent la marge et l'amplitude TP/SL (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) pour capturer les grandes vagues.\n• Facteur d'Entrée : Élargit le tampon d'entrée et l'espacement DCA sur les grandes UT (M5 x1.0, H4 x6.8), évitant le glissement d'ordre lors de fortes variations.",
      actionHint: "💡 Le cœur mathématique qui permet au bot d'exploiter les vagues H1/H4 tout en protégeant le capital sur M5/M15.",
    },
    {
      badge: "Paramètres • Étape 17 / 19",
      title: "17. Sauvegarde & Rétablissement par Défaut",
      content: "• Sauvegarder : Applique immédiatement les paramètres modifiés au bot.\n• Rétablir par défaut : Revenez à la configuration d'origine de l'administrateur à tout moment si besoin.",
      actionHint: "💡 Cliquez sur 'Suivant ▶' pour découvrir les onglets Support et Avis de la communauté !",
    },
    {
      badge: "Support • Étape 18 / 19",
      title: "18. Onglet Support & Administration Système",
      content: "Gestion des licences et assistance technique 24/7 :\n• Conditions d'utilisation : Guide d'inscription OKX avec code de parrainage TLS1 pour débloquer l'accès gratuit à vie.\n• Vérification API & HWID : Contrôle de connectivité API et récupération de l'identifiant HWID pour activation.\n• Proxy & Maintenance : Configuration de proxy, réinitialisation du capital et vidage du cache de bougies.",
      actionHint: "💡 Cliquez sur 'Copier' pour partager rapidement votre HWID ou code de parrainage avec le support.",
    },
    {
      badge: "Avis • Étape 19 / 19",
      title: "19. Avis Communautaires & Tour Terminé !",
      content: "• Consulter les Avis : Lisez les retours d'expérience, captures de gains et résultats réels des autres traders.\n• Donner votre Avis : Attribuez des étoiles, partagez vos résultats et donnez votre avis à la communauté.",
      actionHint: "🎉 Félicitations, vous avez terminé le tour d'initiation complet ! Vous maîtrisez désormais tous les rouages du bot. Cliquez sur 'Terminer' pour fermer et débuter votre trading !",
    },
  ],

  es: [
    {
      badge: "Pantalla Principal • Paso 1 / 19",
      title: "1. Botón de Conexión OKX (Connect)",
      content: "Puerta de enlace para vincular su cuenta OKX con el sistema de bots. Admite 2 métodos: Fast Connect (OAuth 2.0 seguro en 1 clic) o entrada manual de clave API.\n\n• ¡Haga clic en 'Siguiente ▶' para abrir la ventana de Conexión y explorar ambos métodos en detalle!",
      actionHint: "💡 Haga clic en 'Siguiente ▶' para abrir el modal de conexión.",
    },
    {
      badge: "Conexión • Paso 2 / 19",
      title: "2. Método 1: Fast Connect (OAuth 2.0)",
      content: "Conexión en 1 clic 100% segura autorizada por OKX:\n• Haga clic en 'Abrir App ➔': Abre la aplicación móvil o el navegador de OKX para autorizar vía OAuth 2.0.\n• Seguridad total: Cifra y sincroniza automáticamente las claves API sin riesgo de fugas ni copiar y pegar manual.\n• Admite subcuentas independientes para cada bot.\n• Próximamente: Binance Connect, Bybit Connect y billeteras Web3.",
      actionHint: "💡 Recomendado para principiantes: conexión ultrarrápida en 3 segundos sin errores de tipeo.",
    },
    {
      badge: "Conexión • Paso 3 / 19",
      title: "3. Método 2: Entrada Manual de API Key",
      content: "Para usuarios que prefieren crear y gestionar claves API directamente en OKX:\n• Gestión de cuentas: Haga clic en (+) verde para crear una cuenta, selecciónela o use (-) para eliminar.\n• Credenciales: Ingrese API Key, Secret Key y Passphrase de OKX y guarde la configuración.\n\n🛡️ REGLA DE SEGURIDAD CRUCIAL:\n• Al crear claves en OKX, otorgue ÚNICAMENTE permisos de 'Trade' (Trading).\n• NUNCA otorgue permisos de 'Withdraw' (Retiro). El bot TLS1 nunca solicita retiros, protegiendo sus fondos al 100%.",
      actionHint: "💡 ¡Haga clic en 'Siguiente ▶' para completar la conexión y explorar las 3 estrategias del bot!",
    },
    {
      badge: "Pantalla Principal • Paso 4 / 19",
      title: "4. Seleccionar Estrategia del Bot",
      content: "El sistema incorpora 3 algoritmos cuantitativos de nivel avanzado:\n• Bot EMA200: Captura retrocesos de tendencia multitemporal en soportes dinámicos EMA200.\n• Bot SMC: Caza zonas de liquidez y reversiones en Order Blocks.\n• Bot Caza de Liquidaciones: Explota barridos de stop loss y liquidaciones de creadores de mercado.",
      actionHint: "💡 Haga clic en esta pestaña para alternar entre estrategias en cualquier momento.",
    },
    {
      badge: "Pantalla Principal • Paso 5 / 19",
      title: "5. Seleccionar Cuenta Activa",
      content: "Asigne la cuenta de OKX designada para este bot. Cada bot puede operar en una subcuenta aislada para distribuir el capital y diversificar riesgos de forma segura.",
      actionHint: "💡 Cuando el bot está operando, esta opción se bloquea 🔒 automáticamente para proteger posiciones abiertas.",
    },
    {
      badge: "Pantalla Principal • Paso 6 / 19",
      title: "6. Gestión de Capital y Margen",
      content: "• Unidad: Monto fijo en USDT ($) o calculado en % del capital de la cuenta.\n• Multiplicador TF: Elija 'Fijo' para usar un margen uniforme o 'Multiplicar TF' para escalar el tamaño con temporalidades mayores (ej. H1 x2.0, H4 x5.0).",
      actionHint: "💡 Consejo para principiantes: Comience con márgenes pequeños ($1 - $5) para observar la ejecución real.",
    },
    {
      badge: "Pantalla Principal • Paso 7 / 19",
      title: "7. Configuración de Take Profit (TP) y Stop Loss (SL)",
      content: "Configure ratios de seguridad de TP y SL. Los valores aquí representan la base en M5. Las temporalidades mayores escalan automáticamente según el Factor de Margen:\n\n📊 TABLA MULTIPLICADORA TP/SL MULTI-TF (Por Defecto):\n• M5 : x1.0 ➔ TP 0,8% | SL 0,8% (Base)\n• M15: x1.2 ➔ TP 0,96% | SL 0,96%\n• M30: x1.5 ➔ TP 1,20% | SL 1,20%\n• H1 : x2.0 ➔ TP 1,60% | SL 1,60%\n• H2 : x3.0 ➔ TP 2,40% | SL 2,40%\n• H4 : x5.0 ➔ TP 4,00% | SL 4,00%\n\n🔍 Principio de cálculo: Velas mayores tienen oscilaciones más amplias. Mantener SL de 0,8% en H1/H4 provocaría cierres prematuros por mechas. La escala automática aprovecha toda la tendencia con seguridad.",
      actionHint: "💡 Incluye un demonio Watchdog que escanea cada 15s colocando órdenes TP/SL de protección 24/7.",
    },
    {
      badge: "Pantalla Principal • Paso 8 / 19",
      title: "8. Seleccionar Monedas y Temporalidades",
      content: "• Columna Pares: Marque las criptomonedas a supervisar (BTC, ETH, SOL...).\n• Columna TF Trade: Marque las temporalidades (M5, M15, M30, H1, H2, H4) autorizadas para colocar órdenes Limit.",
      actionHint: "💡 Haga clic en el nombre de cualquier moneda para cambiar el gráfico de TradingView a ese activo.",
    },
    {
      badge: "Pantalla Principal • Paso 9 / 19",
      title: "9. Iniciar el Motor Automatizado del Bot",
      content: "• Haga clic en 'INICIAR BOT': El bot escanea señales y entra/sale de posiciones en OKX 24/7.\n• Para detener: Haga clic en 'DETENER BOT' para cancelar órdenes límite pendientes y proteger posiciones abiertas.",
      actionHint: "💡 Una vez activo, supervise los registros y ejecuciones en el terminal en tiempo real 24/7.",
    },
    {
      badge: "Pantalla Principal • Paso 10 / 19",
      title: "10. Explorar Ajustes Avanzados del Sistema ⚙",
      content: "Centro de control integral: Lista de seguimiento, Gestión de capital, Trío DCA, Disyuntor, Filtros de entrada, Multiplicadores TF, Soporte y Reseñas de la comunidad.\n\n• ¡Haga clic en 'Siguiente ▶' para abrir la ventana de Ajustes y examinar cada mecanismo paso a paso!",
      actionHint: "💡 Haga clic en 'Siguiente ▶' para abrir el panel de ajustes.",
    },
    {
      badge: "Ajustes • Paso 11 / 19",
      title: "11. Lista de Monedas (Watchlist)",
      content: "Personalice las monedas que operará el bot:\n• Active/desactive etiquetas de monedas (XAU, BTC, ETH, SOL, DOGE...).\n• Etiquetas resaltadas: Activos visibles en la pantalla principal.\n• Bloqueo de seguridad: Monedas con posiciones abiertas se bloquean automáticamente.",
      actionHint: "💡 Active tantas monedas como sea adecuado según su capital disponible.",
    },
    {
      badge: "Ajustes • Paso 12 / 19",
      title: "12. Cuenta y Asignación de Capital",
      content: "Configuración de cuenta y gestión de riesgo para el bot seleccionado:\n• Cuenta: Asocie el bot a la subcuenta de OKX correspondiente.\n• Margen por orden: Monto fijo USDT o % del capital.\n• Modo multiplicador: Elija margen fijo o variable según temporalidad.\n• Apalancamiento: Defina un ratio prudente.",
      actionHint: "💡 Durante la ejecución, cuenta y margen se bloquean 🔒 para proteger órdenes activas.",
    },
    {
      badge: "Ajustes • Paso 13 / 19",
      title: "13. Interruptores de Estrategia (Trío DCA)",
      content: "El sistema ofrece 3 algoritmos de gestión de órdenes:\n• Pyramid DCA (DCA Positivo): Añade órdenes a medida que la posición acumula ganancias en tendencia (H4 -> M5).\n• Negative DCA (Promedio a la baja): Reduce el precio promedio en retrocesos ampliando TP/SL en temporalidades mayores.\n• Multi-TF Split Grid: Rejilla de órdenes límite independientes por temporalidad, cerrando beneficios por separado.",
      actionHint: "💡 Nota: Solo 1 de los 3 modos puede estar activo simultáneamente (activar uno apaga los otros dos).",
    },
    {
      badge: "Ajustes • Paso 14 / 19",
      title: "14. Disyuntor de Capital y Filtro de Tendencia BTC",
      content: "• Disyuntor Reversor (Hedge Reversal): Si el precio se aleja en exceso de EMA200 H4 (> 8%), el bot bloquea órdenes a favor de tendencia para evitar techos/suelos y abre órdenes de cobertura para atrapar la reversión.\n• Filtro Tendencial BTC: Obliga a las altcoins (ETH, SOL...) a buscar entradas únicamente en la dirección del Bitcoin.",
      actionHint: "💡 Recomendación: Mantenga siempre activo el disyuntor para blindar su capital contra volatilidades extremas.",
    },
    {
      badge: "Ajustes • Paso 15 / 19",
      title: "15. Configuración de Entrada y Velas de Acumulación",
      content: "Criterios para una entrada de alta precisión:\n• Desfase Amortiguador (Base Offset %): Coloca órdenes Limit antes del toque exacto a EMA200 (0,05% en M5). Escala con el Factor de Entrada en TF mayores (ej. H4 x6.8 -> 0,34%).\n• Separación de Seguridad (Base Gap %): Distancia mínima requerida entre líneas EMA para evitar congestión de órdenes.\n• Velas de Acumulación: Exige 60 velas consecutivas cerrando del mismo lado de EMA200 antes de abrir posiciones, confirmando tendencias firmes y eliminando trampas laterales.",
      actionHint: "💡 Los parámetros por defecto están probados en mercados reales; los nuevos usuarios pueden conservarlos con total seguridad.",
    },
    {
      badge: "Ajustes • Paso 16 / 19",
      title: "16. Multiplicadores Multitemporales (TF Multipliers)",
      content: "Modelo matemático por temporalidad:\n• Factor de Margen: Temporalidades mayores incrementan el margen y la amplitud de TP/SL (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) para capturar grandes movimientos con máxima ganancia.\n• Factor de Entrada: Amplía el amortiguador y la separación DCA en velas mayores (M5 x1.0, H4 x6.8), evitando deslices durante fluctuaciones bruscas.",
      actionHint: "💡 El núcleo matemático que permite capturar grandes olas en H1/H4 protegiendo el capital en M5/M15.",
    },
    {
      badge: "Ajustes • Paso 17 / 19",
      title: "17. Guardar Configuración y Restaurar Valores",
      content: "• Guardar Estrategia: Aplica de inmediato todos los parámetros modificados al bot.\n• Restaurar Valores: Regrese a los ajustes seguros originales del administrador en cualquier momento si sus pruebas no le convencen.",
      actionHint: "💡 ¡Haga clic en 'Siguiente ▶' para conocer el Soporte y las Reseñas de la comunidad a continuación!",
    },
    {
      badge: "Soporte • Paso 18 / 19",
      title: "18. Pestaña de Soporte y Mantenimiento",
      content: "Gestión de licencias y asistencia técnica 24/7:\n• Condiciones de uso: Guía para registrarse en OKX con el código de referido TLS1 y desbloquear el bot gratis de por vida.\n• Comprobación API & HWID: Verifique la conectividad de la API y obtenga el código HWID de su equipo para activar la licencia.\n• Proxy y Mantenimiento: Configuración de proxy opcional, reinicio de capital y limpieza de caché de velas.",
      actionHint: "💡 Haga clic en 'Copiar' para compartir su HWID o código de referido con el equipo de soporte.",
    },
    {
      badge: "Reseñas • Paso 19 / 19",
      title: "19. Reseñas de la Comunidad y ¡Tour Completado!",
      content: "• Ver Reseñas: Lea opiniones reales, capturas de ganancias y resultados en vivo de otros operadores.\n• Dejar su Reseña: Valore con estrellas, adjunte capturas y comparta su experiencia con la comunidad.",
      actionHint: "🎉 ¡Felicitaciones por completar el tour de iniciación de la A a la Z! Ahora domina todas las funciones y principios del bot. ¡Haga clic en 'Finalizar' para cerrar y comenzar a operar!",
    },
  ],
};

/**
 * Returns the 19 onboarding tour steps configured for the active language
 * @param {string} lang - 'vi' | 'en' | 'zh' | 'ko' | 'fr' | 'es'
 * @param {object} actions - Callback handlers for modal navigation
 */
export function getTourSteps(lang = "vi", actions = {}) {
  const {
    setShowConnectModal = () => {},
    setShowSettings = () => {},
    setConnectModalTab = () => {},
    setSettingsTab = () => {},
    setActiveTab = () => {},
  } = actions;

  const contentList = TOUR_CONTENT[lang] || TOUR_CONTENT.en || TOUR_CONTENT.vi;

  const baseSpecs = [
    {
      target: '[data-tour="connect-okx"]',
      placement: "bottom",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(false);
      },
    },
    {
      target: '[data-tour="connect-fast-content"]',
      placement: "right",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("fast");
      },
    },
    {
      target: '[data-tour="connect-apikey-content"]',
      placement: "right",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("apikey");
      },
    },
    {
      target: '[data-tour="bot-selector"]',
      placement: "bottom",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    {
      target: '[data-tour="account-select"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    {
      target: '[data-tour="margin-config"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    {
      target: '[data-tour="tpsl-config"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    {
      target: '[data-tour="watchlist-pairs"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
        setActiveTab("positions");
      },
    },
    {
      target: '[data-tour="action-bot"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    {
      target: '[data-tour="settings-btn"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    {
      target: '[data-tour="settings-watchlist"]',
      placement: "bottom",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    {
      target: '[data-tour="settings-account-capital"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    {
      target: '[data-tour="settings-dca"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    {
      target: '[data-tour="settings-circuit-breaker"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    {
      target: '[data-tour="settings-entry-filters"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    {
      target: '[data-tour="settings-tf-multipliers"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    {
      target: '[data-tour="settings-actions"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    {
      target: '[data-tour="settings-support-tab-content"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("system");
      },
    },
    {
      target: '[data-tour="settings-reviews-tab-content"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("reviews");
      },
    },
  ];

  return baseSpecs.map((spec, idx) => {
    const text = contentList[idx] || (TOUR_CONTENT.en && TOUR_CONTENT.en[idx]) || TOUR_CONTENT.vi[idx];
    return {
      ...spec,
      badge: text.badge,
      title: text.title,
      content: text.content,
      actionHint: text.actionHint,
    };
  });
}
