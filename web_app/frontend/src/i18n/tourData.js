/**
 * Multilingual Onboarding Tour Data for TLS1 Trading Bot (21 Comprehensive Steps)
 * Supported languages: vi (Tiếng Việt), en (English), zh (简体中文), ko (한국어), fr (Français), es (Español)
 */

export const TOUR_CONTENT = {
  vi: [
    {
        "badge": "Màn Hình Chính • Bước 1 / 21",
        "title": "1. Nút Kết Nối (Connect)",
        "content": "Liên kết tài khoản giao dịch với hệ thống bot:\n• Sàn OKX: Kết nối 1-click qua Fast Connect hoặc nhập API Key.\n• Quỹ FX: Kết nối tài khoản Quỹ thi (E8, FTMO...) qua TradeLocker.\n\nNhấn 'Tiếp theo ▶' để mở cửa sổ Kết Nối.",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để mở popup Kết Nối."
    },
    {
        "badge": "Kết Nối • Bước 2 / 21",
        "title": "2. Fast Connect (OAuth 2.0)",
        "content": "Kết nối 1-click an toàn tuyệt đối từ OKX:\n• Nhấn 'Mở App ➔': Tự động mở App OKX để cấp quyền OAuth.\n• An toàn 100%: Hệ thống tự đồng bộ API Key, không lo lộ mã bí mật, không cần copy thủ công.\n• Hỗ trợ quản lý độc lập từng tài khoản con (Sub-Account).",
        "actionHint": "💡 Khuyên dùng cho người mới vì kết nối siêu tốc chỉ trong 3 giây."
    },
    {
        "badge": "Kết Nối • Bước 3 / 21",
        "title": "3. API Key OKX (Nhập Thủ Công)",
        "content": "Tự nhập API Key tạo từ sàn OKX:\n• Quản lý tài khoản: Nhấn (+) tạo mới, chọn tài khoản từ danh sách, hoặc (-) để xóa.\n• Cụm Nhập Key: Điền API Key, Secret Key và Passphrase rồi nhấn 'Lưu Cấu Hình'.\n\n🛡️ LƯU Ý AN TOÀN:\n• Chỉ cấp quyền 'Trade' (Giao dịch).\n• Tuyệt đối KHÔNG cấp quyền 'Withdraw' (Rút tiền).",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để xem Kết Nối Quỹ FX."
    },
    {
        "badge": "Kết Nối • Bước 4 / 21",
        "title": "4. Kết Nối Quỹ FX (TradeLocker)",
        "content": "Giao dịch tài khoản Quỹ Cấp Vốn (Prop Firm):\n• Hỗ trợ: E8 Markets, FTMO, Funding Pips... qua TradeLocker API.\n• Đăng nhập: Nhập Email, Mật khẩu và Server Quỹ.\n• Quản trị rủi ro: Cài đặt quy mô Quỹ ($5.000, $100.000...), trần sụt giảm ngày (Daily Drawdown) và mức rủi ro mỗi lệnh.\n• Tự tính Lot: Bot tự tính khối lượng Lot chuẩn theo khoảng cách SL, tuyệt đối không vi phạm luật Quỹ.",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để hoàn tất kết nối và ra màn hình chính."
    },
    {
        "badge": "Màn Hình Chính • Bước 5 / 21",
        "title": "5. Nền Tảng (Sàn OKX / Quỹ FX)",
        "content": "Chuyển đổi môi trường giao dịch trên Sidebar:\n• Sàn OKX: Giao dịch Crypto Phái sinh (USDT Swap).\n• Quỹ FX: Giao dịch Vàng XAU, Forex, Crypto qua TradeLocker.\n• Tự động đồng bộ: Khi đổi nền tảng, danh sách tài khoản và các cặp coin sẽ tự cập nhật tương ứng.\n• Khóa an toàn 🔒: Tự động khóa khi bot đang chạy.",
        "actionHint": "💡 Dễ dàng chuyển giữa tài khoản cá nhân và tài khoản Quỹ chỉ trong 1 click."
    },
    {
        "badge": "Màn Hình Chính • Bước 6 / 21",
        "title": "6. Chọn Chiến Thuật Bot",
        "content": "Tích hợp sẵn 3 thuật toán giao dịch:\n• EMA200 Bot: Bắt sóng hồi quy theo cản động EMA200.\n• SMC Bot: Săn vùng thanh khoản & Order Block đảo chiều.\n• Liquidation Bot: Bắt nhịp quét râu thanh khoản khi thị trường biến động mạnh.\n\nNhấp vào nút này để mở menu chuyển đổi chiến thuật.",
        "actionHint": "💡 Mỗi bot có thể chạy độc lập với cài đặt và tài khoản riêng."
    },
    {
        "badge": "Màn Hình Chính • Bước 7 / 21",
        "title": "7. Chọn Tài Khoản & Số Dư",
        "content": "Chọn tài khoản giao dịch cho bot đang chọn:\n• Sàn OKX: Chọn Sub-Account tương ứng.\n• Quỹ FX: Chọn tài khoản E8 Demo hoặc Live.\n• Hiển thị số dư live: Thấy ngay số dư vốn ($5.000, $200.000...) để quản trị rủi ro kịp thời.\n• Khóa bảo vệ 🔒: Ô tài khoản tự động khóa khi bot đang chạy.",
        "actionHint": "💡 Hiển thị số dư thực tế theo thời gian thực rõ ràng, không bị che khuất."
    },
    {
        "badge": "Màn Hình Chính • Bước 8 / 21",
        "title": "8. Ký Quỹ & Khối Lượng Lệnh",
        "content": "Thiết lập mức vốn cho mỗi lệnh:\n• Sàn OKX: Ký quỹ theo USDT ($) hoặc % Vốn.\n• Quỹ FX: Khối lượng tính theo Lot (mặc định 0.01 L).\n• Chế độ: 'Cố định' (mọi khung chung mức vốn) hoặc 'Nhân TF' (khung lớn tự nhân vốn H1 x2.0, H4 x5.0).\n\n🔒 Khi bot đang chạy, ô này tự khóa chặt để tránh bấm nhầm.",
        "actionHint": "💡 Người mới nên đặt ký quỹ nhỏ (1$ - 5$ hoặc 0.01 Lot) để quan sát nhịp chạy thực tế."
    },
    {
        "badge": "Màn Hình Chính • Bước 9 / 21",
        "title": "9. Chốt Lời (TP) & Cắt Lỗ (SL) M5 Gốc",
        "content": "Cài đặt tỷ lệ TP và SL gốc trên khung M5 (mặc định chuẩn: 0.6% TP | 0.6% SL):\n• Tự động nhân đa khung: Khung lớn có biên độ sóng rộng hơn, bot tự nhân theo Hệ Số Vốn:\n  - M5 : x1.0 ➔ TP 0.60% | SL 0.60%\n  - M15: x1.2 ➔ TP 0.72% | SL 0.72%\n  - M30: x1.5 ➔ TP 0.90% | SL 0.90%\n  - H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n  - H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n• Watchdog 15s: Quét liên tục, tự đặt TP/SL bảo vệ vị thế 24/7.",
        "actionHint": "💡 Tỷ lệ gốc 0.6% đã tối ưu thực chiến giúp chốt lời nhanh và bảo toàn vốn."
    },
    {
        "badge": "Màn Hình Chính • Bước 10 / 21",
        "title": "10. Cặp Coin & Khung Nến Giao Dịch",
        "content": "Quản lý danh sách coin và khung rải lệnh:\n• Cột Cặp vị thế: Tích chọn coin muốn trade (XAU, BTC, ETH...). Nhấp tên coin để mở biểu đồ TradingView.\n• Cột Khung trade: Tích chọn các khung (5, 15, 30, H1, H2, H4) bot được phép đặt lệnh.\n• Bật nhiều khung: Bot tự động phân bổ lệnh đa khung song song.",
        "actionHint": "💡 Bật/tắt linh hoạt từng cặp coin và khung nến theo nhu cầu."
    },
    {
        "badge": "Màn Hình Chính • Bước 11 / 21",
        "title": "11. Bật / Dừng Chạy Bot",
        "content": "Kích hoạt hoặc dừng vận hành bot:\n• 'CHẠY BOT': Bot quét tín hiệu và tự vào/đóng lệnh 24/7 trên sàn hoặc Quỹ.\n• 'DỪNG BOT': Hủy toàn bộ lệnh Limit đang chờ khớp và bảo toàn vị thế hiện có.\n• Sau khi bật bot, bạn có thể tắt trình duyệt; bot chạy nền ổn định trên máy chủ.",
        "actionHint": "💡 Trạng thái nút hiển thị trực quan (Xanh: Đang chạy, Xám: Đang dừng)."
    },
    {
        "badge": "Màn Hình Chính • Bước 12 / 21",
        "title": "12. Vị Thế, Logs & Chia Đôi Màn Hình",
        "content": "Khu vực giám sát tổng quan:\n• Bảng Vị Thế: Xem lệnh đang mở, PnL live, giá vào, SL/TP và nút đóng lệnh nhanh.\n• Logs: Xem lịch sử quét tín hiệu và phản hồi từ sàn thời gian thực.\n• Biểu Đồ: Xem chart TradingView.\n• Nút ⮃ Chia Đôi: Xem đồng thời Biểu Đồ ở trên và Bảng Vị Thế ở dưới mà không cần chuyển tab.",
        "actionHint": "💡 Nhấn nút ⮃ ở góc phải để trải nghiệm chế độ xem chia đôi tiện lợi."
    },
    {
        "badge": "Màn Hình Chính • Bước 13 / 21",
        "title": "13. Hướng Dẫn & Cài Đặt ⚙",
        "content": "Hai nút chức năng trên Sidebar:\n• 'Hướng Dẫn': Mở lại tour hướng dẫn bất kỳ lúc nào.\n• 'Cài Đặt' ⚙: Mở bảng cài đặt chuyên sâu để tinh chỉnh Watchlist, Bộ 3 DCA, Cầu Dao, Điểm Vào Lệnh và Hệ Số Đa Khung.\n\nNhấn 'Tiếp theo ▶' để mở bảng Cài Đặt.",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để vào bảng Cài Đặt chi tiết."
    },
    {
        "badge": "Cài Đặt • Bước 14 / 21",
        "title": "14. Watchlist Coin",
        "content": "Tùy chọn danh mục coin hiển thị ra màn hình chính:\n• Nhấp chọn/bỏ chọn từng coin (XAU, BTC, ETH, SOL, DOGE...).\n• Thẻ sáng: Đang hiển thị ở màn hình chính.\n• Khóa an toàn: Coin đang có vị thế mở sẽ tự khóa, cần đóng lệnh trước khi bỏ chọn.",
        "actionHint": "💡 Chỉ bật những coin phù hợp với quy mô vốn của bạn."
    },
    {
        "badge": "Cài Đặt • Bước 15 / 21",
        "title": "15. Bộ 3 Cơ Chế DCA",
        "content": "Chọn 1 trong 3 cơ chế xử lý lệnh nâng cao:\n• DCA Dương: Nhồi thêm lệnh khi vị thế đang có lãi theo bậc thang xu hướng (H4 -> M5).\n• DCA Âm: Trung bình giá khi gồng lỗ và tự động nâng biên độ TP/SL theo khung lớn.\n• Split Grid: Chia lệnh Limit độc lập cho từng khung, khớp khung nào chốt lời riêng khung đó.\n\n💡 Lưu ý: Hệ thống chỉ cho phép bật 1 trong 3 chế độ (bật chế độ này thì 2 chế độ kia tự tắt).",
        "actionHint": "💡 Khuyên dùng Split Grid hoặc DCA Dương để quản trị vốn an toàn."
    },
    {
        "badge": "Cài Đặt • Bước 16 / 21",
        "title": "16. Cầu Dao & Đồng Pha BTC",
        "content": "Bảo vệ tài khoản trước biến động mạnh:\n• Cầu Dao Đảo Chiều: Khi giá rướn quá xa EMA200 H4 (> 8%), bot ngưng rải Limit thuận trend để tránh đu đỉnh/bắt đáy, đồng thời mở lệnh phòng hộ bắt sóng hồi.\n• Đồng Pha BTC: Ép Altcoin chỉ tìm điểm vào lệnh cùng hướng với xu hướng BTC.",
        "actionHint": "💡 Nên luôn BẬT Cầu Dao để tài khoản được bảo vệ tự động 24/7."
    },
    {
        "badge": "Cài Đặt • Bước 17 / 21",
        "title": "17. Điểm Vào Lệnh & Nến Tích Lũy",
        "content": "Cấu hình tín hiệu vào lệnh an toàn:\n• Độ Lệch Đệm (%): Đặt Limit đón trước cản EMA200 (mặc định 0.05% ở M5), giúp lệnh dễ khớp trước khi giá bật lại.\n• Khoảng Cách An Toàn (%): Khoảng cách tối thiểu giữa 2 đường EMA liền kề để tránh rải lệnh quá dày.\n• Nến Tích Lũy: Yêu cầu 60 nến đóng cửa liên tục cùng 1 phía EMA200 mới mở lệnh, giúp lọc sạch sideway.",
        "actionHint": "💡 Cài đặt mặc định đã được tối ưu, người mới nên giữ nguyên chuẩn Admin."
    },
    {
        "badge": "Cài Đặt • Bước 18 / 21",
        "title": "18. Hệ Số Nhân Đa Khung",
        "content": "Bản chất điều phối lệnh theo khung thời gian:\n• Cột Vốn: Khung nến càng lớn thì khối lượng ký quỹ và biên độ TP/SL tự nhân rộng (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H4 x5.0) để thích ứng với biên độ sóng lớn.\n• Cột Vào Lệnh: Nhân tỷ lệ đệm đón trước cản cho khung lớn (M5 x1.0, H4 x6.8) để lệnh không bị trượt.",
        "actionHint": "💡 Công thức toán học giúp bot bắt trọn sóng lớn khung H1/H4 mà vẫn an toàn ở khung M5."
    },
    {
        "badge": "Cài Đặt • Bước 19 / 21",
        "title": "19. Lưu Cài Đặt & Mặc Định",
        "content": "Quản lý cấu hình bot:\n• 'Lưu Cài Đặt': Áp dụng ngay toàn bộ thông số vừa thiết lập.\n• 'Khôi Phục Mặc Định': Đưa toàn bộ cấu hình về chuẩn an toàn ban đầu của Admin bất cứ lúc nào.",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để khám phá Tab Hỗ Trợ và Đánh Giá."
    },
    {
        "badge": "Hỗ Trợ • Bước 20 / 21",
        "title": "20. Tab Hỗ Trợ",
        "content": "Bản quyền và hỗ trợ kỹ thuật:\n• Điều Kiện Sử Dụng: Hướng dẫn đăng ký tài khoản sàn liên kết mã giới thiệu TLS1 để mở khóa bot miễn phí trọn đời.\n• Kiểm Tra API & HWID: Nơi nhập API Key và lấy mã HWID máy tính để kích hoạt bản quyền.\n• Đổi IP Máy Chủ & Dọn Dẹp: Cấu hình Proxy IP và các công cụ Reset vốn, dọn cache nến khi cần.",
        "actionHint": "💡 Nhấp nút 'Sao chép' để copy nhanh HWID hoặc mã giới thiệu gửi đội ngũ hỗ trợ."
    },
    {
        "badge": "Đánh Giá • Bước 21 / 21",
        "title": "21. Tab Đánh Giá & Hoàn Tất!",
        "content": "Cộng đồng & hoàn tất tour:\n• Đánh Giá Cộng Đồng: Xem đánh giá và hình ảnh lợi nhuận thực chiến từ các nhà giao dịch đang dùng bot.\n• Gửi Đánh Giá: Chấm sao và chia sẻ trải nghiệm sử dụng bot của bạn.\n\n🎉 Bạn đã hoàn thành toàn bộ tour hướng dẫn! Nhấn 'Hoàn tất' để đóng và bắt đầu giao dịch.",
        "actionHint": "🎉 Chúc bạn giao dịch thành công và an toàn vốn cùng TLS1 Trading Bot!"
    }
],
  en: [
    {
        "badge": "Main Screen • Step 1 / 21",
        "title": "1. Connect Button (Connect)",
        "content": "Link trading accounts to the bot system:\n• OKX Exchange: 1-click Fast Connect or manual API Key input.\n• FX Prop Firms: Connect funded accounts (E8, FTMO...) via TradeLocker.\n\nClick 'Next ▶' to open the Connect modal.",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "Connect • Step 2 / 21",
        "title": "2. Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX app to grant OAuth permissions.\n• 100% Secure: Auto-syncs encrypted API Keys, zero secret leakage, no copy-paste errors.\n• Supports independent Sub-Account routing for each bot.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero typing errors."
    },
    {
        "badge": "Connect • Step 3 / 21",
        "title": "3. Manual OKX API Key",
        "content": "Manually enter API Keys generated from OKX:\n• Account Management: Click (+) to add, select from list, or (-) to remove.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase then click 'Save Configuration'.\n\n🛡️ SAFETY NOTICE:\n• Only grant 'Trade' permission.\n• NEVER grant 'Withdraw' permission.",
        "actionHint": "💡 Click 'Next ▶' to explore FX Prop Firm Connect."
    },
    {
        "badge": "Connect • Step 4 / 21",
        "title": "4. FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading for funded Prop Firm accounts:\n• Supported: E8 Markets, FTMO, Funding Pips... via TradeLocker API.\n• Login: Enter Email, Password, and Server.\n• Risk Control: Set Fund Size ($5,000, $100,000...), Daily Drawdown ceiling, and risk per trade.\n• Dynamic Lot: Bot automatically calculates exact Lots based on SL distance to prevent rule breaches.",
        "actionHint": "💡 Click 'Next ▶' to finish connection and return to dashboard."
    },
    {
        "badge": "Main Screen • Step 5 / 21",
        "title": "5. Platform (OKX / FX Prop)",
        "content": "Switch trading environment on the Sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap).\n• FX Prop: Trade Gold XAU, Forex, Crypto via TradeLocker.\n• Auto Sync: Changing platforms automatically updates account lists and pair selectors.\n• Safety Lock 🔒: Automatically locks while the bot is active.",
        "actionHint": "💡 Effortlessly switch between personal exchange accounts and funded challenges in 1 click."
    },
    {
        "badge": "Main Screen • Step 6 / 21",
        "title": "6. Select Bot Strategy",
        "content": "3 built-in quantitative algorithms:\n• EMA200 Bot: Captures pullback waves along dynamic EMA200 trendlines.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\nClick this button to switch bot strategies.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "Main Screen • Step 7 / 21",
        "title": "7. Select Account & Balance",
        "content": "Assign the trading account for the active bot:\n• OKX: Select matching Sub-Account.\n• FX Prop: Select E8 Demo or Live account.\n• Live Balance: View account equity ($5,000, $200,000...) for real-time risk control.\n• Protective Lock 🔒: Account dropdown locks automatically when bot is running.",
        "actionHint": "💡 Real-time equity is clearly displayed without clipping."
    },
    {
        "badge": "Main Screen • Step 8 / 21",
        "title": "8. Capital & Order Volume",
        "content": "Configure capital per trade:\n• OKX: Fixed USDT ($) or % of Account Equity.\n• FX Prop: Volume in Lots (default 0.01 L).\n• Modes: 'Fixed' (uniform across timeframes) or 'Multiply TF' (auto-scales with larger candles H1 x2.0, H4 x5.0).\n\n🔒 Automatically locked while running to prevent mistakes.",
        "actionHint": "💡 Beginners should use small capital ($1 - $5 or 0.01 Lot) to observe execution."
    },
    {
        "badge": "Main Screen • Step 9 / 21",
        "title": "9. Base M5 TP & SL (0.6% Default)",
        "content": "Base TP and SL ratios on M5 timeframe (default: 0.6% TP | 0.6% SL):\n• Multi-TF Scaling: Larger candles have wider swings; bot scales via Margin Factor:\n  - M5 : x1.0 ➔ TP 0.60% | SL 0.60%\n  - M15: x1.2 ➔ TP 0.72% | SL 0.72%\n  - M30: x1.5 ➔ TP 0.90% | SL 0.90%\n  - H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n  - H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n• 15s Watchdog daemon continuously attaches protective brackets 24/7.",
        "actionHint": "💡 Battle-tested 0.6% base ratio provides rapid profit realization and capital safety."
    },
    {
        "badge": "Main Screen • Step 10 / 21",
        "title": "10. Pairs & Trading Timeframes",
        "content": "Manage symbol watchlist and order timeframes:\n• Pairs Column: Check symbols to scan (XAU, BTC, ETH...). Click pair name to open TradingView chart.\n• Trade TF Column: Check timeframes (5, 15, 30, H1, H2, H4) where the bot may place orders.\n• Multi-TF Enabled: Bot distributes orders across timeframes concurrently.",
        "actionHint": "💡 Toggle coin pairs and timeframes flexibly to match your strategy."
    },
    {
        "badge": "Main Screen • Step 11 / 21",
        "title": "11. Start / Stop Bot Engine",
        "content": "Activate or halt automated bot operations:\n• 'START BOT': Scans market signals and places/manages orders 24/7 on exchange or prop.\n• 'STOP BOT': Cancels open pending limit orders and protects active positions.\n• You can safely close your browser; the bot runs persistently on the server.",
        "actionHint": "💡 Button colors reflect active state (Green: Running, Gray: Stopped)."
    },
    {
        "badge": "Main Screen • Step 12 / 21",
        "title": "12. Positions, Logs & Split View",
        "content": "Central monitoring pane:\n• Positions Tab: Open positions, live PnL, entry price, SL/TP brackets, and panic-close button.\n• Logs Tab: Real-time scan logs and broker response feed.\n• Charts Tab: TradingView technical chart.\n• ⮃ Split View: View Charts on top and Positions below simultaneously without switching tabs.",
        "actionHint": "💡 Click ⮃ button on the right to experience the dual-pane view."
    },
    {
        "badge": "Main Screen • Step 13 / 21",
        "title": "13. Guide & Settings ⚙",
        "content": "Two key utility controls on Sidebar:\n• 'Guide': Re-launch this guided tour anytime.\n• 'Settings' ⚙: Open Deep Configuration Panel to fine-tune Watchlist, DCA Trio, Circuit Breaker, Entry Setup, and Multipliers.\n\nClick 'Next ▶' to open the Settings modal.",
        "actionHint": "💡 Click 'Next ▶' to inspect Deep Settings."
    },
    {
        "badge": "Settings • Step 14 / 21",
        "title": "14. Coin Watchlist",
        "content": "Configure coins displayed on the dashboard:\n• Click to toggle coins (XAU, BTC, ETH, SOL, DOGE...).\n• Active badges display on main dashboard.\n• Safety Lock: Coins with open positions are locked from deselecting.",
        "actionHint": "💡 Enable coins aligned with your account capital."
    },
    {
        "badge": "Settings • Step 15 / 21",
        "title": "15. DCA Mode Trio",
        "content": "Select 1 of 3 advanced execution algorithms:\n• DCA Dương: Adds positions as profit develops along trend steps (H4 -> M5).\n• DCA Âm: Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 mode can be active at a time (enabling one disables the others).",
        "actionHint": "💡 Split Grid and DCA Dương are recommended for conservative risk management."
    },
    {
        "badge": "Settings • Step 16 / 21",
        "title": "16. Circuit Breaker & BTC Alignment",
        "content": "Protect account during sharp market shocks:\n• Reversal Circuit Breaker: When price extends too far from H4 EMA200 (> 8%), bot halts trend orders to avoid tops/bottoms, and opens hedge pullback orders.\n• BTC Alignment: Restricts Altcoins to only enter trades aligned with BTC market direction.",
        "actionHint": "💡 Keep Circuit Breaker ON 24/7 to safeguard equity."
    },
    {
        "badge": "Settings • Step 17 / 21",
        "title": "17. Entry Setup & Accumulation",
        "content": "Configure entry criteria:\n• Base Offset (%): Places limits ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds.\n• Base Gap (%): Minimum safety gap between adjacent EMA levels to avoid tight stacking.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before entering, eliminating sideways traps.",
        "actionHint": "💡 Battle-tested defaults; beginners should keep Admin standards."
    },
    {
        "badge": "Settings • Step 18 / 21",
        "title": "18. Multi-TF Multipliers",
        "content": "Multi-timeframe mathematical scaling mechanics:\n• Capital Column: Larger candles expand margin and TP/SL brackets (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H4 x5.0) to match swing ranges.\n• Entry Column: Scales entry buffering for higher TFs (M5 x1.0, H4 x6.8) preventing order slippage.",
        "actionHint": "💡 Mathematical framework that captures major H1/H4 waves while keeping M5 execution safe."
    },
    {
        "badge": "Settings • Step 19 / 21",
        "title": "19. Save Settings & Defaults",
        "content": "Bot configuration management:\n• 'Save Settings': Immediately applies all configured parameters.\n• 'Reset to Default': Reverts back to battle-tested Admin baseline settings anytime.",
        "actionHint": "💡 Click 'Next ▶' to inspect Support and Community Reviews."
    },
    {
        "badge": "Support • Step 20 / 21",
        "title": "20. Support Tab",
        "content": "Licensing and 24/7 technical assistance:\n• Terms of Service: Register exchange account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify connectivity and retrieve PC HWID for license activation.\n• Server IP & Cleanup: Configure custom Proxy IPs and reset capital or clear candle cache.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team."
    },
    {
        "badge": "Reviews • Step 21 / 21",
        "title": "21. Reviews Tab & Tour Complete!",
        "content": "Community & completion:\n• Community Reviews: Browse verified trade reviews and profit snapshots from fellow traders.\n• Submit Review: Rate stars and share your trading experience with the bot.\n\n🎉 You have completed the comprehensive onboarding tour! Click 'Finish' to close and begin trading.",
        "actionHint": "🎉 Wishing you disciplined and profitable trading with TLS1 Trading Bot!"
    }
],
  zh: [
    {
        "badge": "系统向导 • 第 1 / 21 步",
        "title": "1. Connect Button (Connect)",
        "content": "Link trading accounts to the bot system:\n• OKX Exchange: 1-click Fast Connect or manual API Key input.\n• FX Prop Firms: Connect funded accounts (E8, FTMO...) via TradeLocker.\n\nClick 'Next ▶' to open the Connect modal.",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "系统向导 • 第 2 / 21 步",
        "title": "2. Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX app to grant OAuth permissions.\n• 100% Secure: Auto-syncs encrypted API Keys, zero secret leakage, no copy-paste errors.\n• Supports independent Sub-Account routing for each bot.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero typing errors."
    },
    {
        "badge": "系统向导 • 第 3 / 21 步",
        "title": "3. Manual OKX API Key",
        "content": "Manually enter API Keys generated from OKX:\n• Account Management: Click (+) to add, select from list, or (-) to remove.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase then click 'Save Configuration'.\n\n🛡️ SAFETY NOTICE:\n• Only grant 'Trade' permission.\n• NEVER grant 'Withdraw' permission.",
        "actionHint": "💡 Click 'Next ▶' to explore FX Prop Firm Connect."
    },
    {
        "badge": "系统向导 • 第 4 / 21 步",
        "title": "4. FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading for funded Prop Firm accounts:\n• Supported: E8 Markets, FTMO, Funding Pips... via TradeLocker API.\n• Login: Enter Email, Password, and Server.\n• Risk Control: Set Fund Size ($5,000, $100,000...), Daily Drawdown ceiling, and risk per trade.\n• Dynamic Lot: Bot automatically calculates exact Lots based on SL distance to prevent rule breaches.",
        "actionHint": "💡 Click 'Next ▶' to finish connection and return to dashboard."
    },
    {
        "badge": "系统向导 • 第 5 / 21 步",
        "title": "5. Platform (OKX / FX Prop)",
        "content": "Switch trading environment on the Sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap).\n• FX Prop: Trade Gold XAU, Forex, Crypto via TradeLocker.\n• Auto Sync: Changing platforms automatically updates account lists and pair selectors.\n• Safety Lock 🔒: Automatically locks while the bot is active.",
        "actionHint": "💡 Effortlessly switch between personal exchange accounts and funded challenges in 1 click."
    },
    {
        "badge": "系统向导 • 第 6 / 21 步",
        "title": "6. Select Bot Strategy",
        "content": "3 built-in quantitative algorithms:\n• EMA200 Bot: Captures pullback waves along dynamic EMA200 trendlines.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\nClick this button to switch bot strategies.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "系统向导 • 第 7 / 21 步",
        "title": "7. Select Account & Balance",
        "content": "Assign the trading account for the active bot:\n• OKX: Select matching Sub-Account.\n• FX Prop: Select E8 Demo or Live account.\n• Live Balance: View account equity ($5,000, $200,000...) for real-time risk control.\n• Protective Lock 🔒: Account dropdown locks automatically when bot is running.",
        "actionHint": "💡 Real-time equity is clearly displayed without clipping."
    },
    {
        "badge": "系统向导 • 第 8 / 21 步",
        "title": "8. Capital & Order Volume",
        "content": "Configure capital per trade:\n• OKX: Fixed USDT ($) or % of Account Equity.\n• FX Prop: Volume in Lots (default 0.01 L).\n• Modes: 'Fixed' (uniform across timeframes) or 'Multiply TF' (auto-scales with larger candles H1 x2.0, H4 x5.0).\n\n🔒 Automatically locked while running to prevent mistakes.",
        "actionHint": "💡 Beginners should use small capital ($1 - $5 or 0.01 Lot) to observe execution."
    },
    {
        "badge": "系统向导 • 第 9 / 21 步",
        "title": "9. Base M5 TP & SL (0.6% Default)",
        "content": "Base TP and SL ratios on M5 timeframe (default: 0.6% TP | 0.6% SL):\n• Multi-TF Scaling: Larger candles have wider swings; bot scales via Margin Factor:\n  - M5 : x1.0 ➔ TP 0.60% | SL 0.60%\n  - M15: x1.2 ➔ TP 0.72% | SL 0.72%\n  - M30: x1.5 ➔ TP 0.90% | SL 0.90%\n  - H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n  - H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n• 15s Watchdog daemon continuously attaches protective brackets 24/7.",
        "actionHint": "💡 Battle-tested 0.6% base ratio provides rapid profit realization and capital safety."
    },
    {
        "badge": "系统向导 • 第 10 / 21 步",
        "title": "10. Pairs & Trading Timeframes",
        "content": "Manage symbol watchlist and order timeframes:\n• Pairs Column: Check symbols to scan (XAU, BTC, ETH...). Click pair name to open TradingView chart.\n• Trade TF Column: Check timeframes (5, 15, 30, H1, H2, H4) where the bot may place orders.\n• Multi-TF Enabled: Bot distributes orders across timeframes concurrently.",
        "actionHint": "💡 Toggle coin pairs and timeframes flexibly to match your strategy."
    },
    {
        "badge": "系统向导 • 第 11 / 21 步",
        "title": "11. Start / Stop Bot Engine",
        "content": "Activate or halt automated bot operations:\n• 'START BOT': Scans market signals and places/manages orders 24/7 on exchange or prop.\n• 'STOP BOT': Cancels open pending limit orders and protects active positions.\n• You can safely close your browser; the bot runs persistently on the server.",
        "actionHint": "💡 Button colors reflect active state (Green: Running, Gray: Stopped)."
    },
    {
        "badge": "系统向导 • 第 12 / 21 步",
        "title": "12. Positions, Logs & Split View",
        "content": "Central monitoring pane:\n• Positions Tab: Open positions, live PnL, entry price, SL/TP brackets, and panic-close button.\n• Logs Tab: Real-time scan logs and broker response feed.\n• Charts Tab: TradingView technical chart.\n• ⮃ Split View: View Charts on top and Positions below simultaneously without switching tabs.",
        "actionHint": "💡 Click ⮃ button on the right to experience the dual-pane view."
    },
    {
        "badge": "系统向导 • 第 13 / 21 步",
        "title": "13. Guide & Settings ⚙",
        "content": "Two key utility controls on Sidebar:\n• 'Guide': Re-launch this guided tour anytime.\n• 'Settings' ⚙: Open Deep Configuration Panel to fine-tune Watchlist, DCA Trio, Circuit Breaker, Entry Setup, and Multipliers.\n\nClick 'Next ▶' to open the Settings modal.",
        "actionHint": "💡 Click 'Next ▶' to inspect Deep Settings."
    },
    {
        "badge": "系统向导 • 第 14 / 21 步",
        "title": "14. Coin Watchlist",
        "content": "Configure coins displayed on the dashboard:\n• Click to toggle coins (XAU, BTC, ETH, SOL, DOGE...).\n• Active badges display on main dashboard.\n• Safety Lock: Coins with open positions are locked from deselecting.",
        "actionHint": "💡 Enable coins aligned with your account capital."
    },
    {
        "badge": "系统向导 • 第 15 / 21 步",
        "title": "15. DCA Mode Trio",
        "content": "Select 1 of 3 advanced execution algorithms:\n• DCA Dương: Adds positions as profit develops along trend steps (H4 -> M5).\n• DCA Âm: Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 mode can be active at a time (enabling one disables the others).",
        "actionHint": "💡 Split Grid and DCA Dương are recommended for conservative risk management."
    },
    {
        "badge": "系统向导 • 第 16 / 21 步",
        "title": "16. Circuit Breaker & BTC Alignment",
        "content": "Protect account during sharp market shocks:\n• Reversal Circuit Breaker: When price extends too far from H4 EMA200 (> 8%), bot halts trend orders to avoid tops/bottoms, and opens hedge pullback orders.\n• BTC Alignment: Restricts Altcoins to only enter trades aligned with BTC market direction.",
        "actionHint": "💡 Keep Circuit Breaker ON 24/7 to safeguard equity."
    },
    {
        "badge": "系统向导 • 第 17 / 21 步",
        "title": "17. Entry Setup & Accumulation",
        "content": "Configure entry criteria:\n• Base Offset (%): Places limits ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds.\n• Base Gap (%): Minimum safety gap between adjacent EMA levels to avoid tight stacking.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before entering, eliminating sideways traps.",
        "actionHint": "💡 Battle-tested defaults; beginners should keep Admin standards."
    },
    {
        "badge": "系统向导 • 第 18 / 21 步",
        "title": "18. Multi-TF Multipliers",
        "content": "Multi-timeframe mathematical scaling mechanics:\n• Capital Column: Larger candles expand margin and TP/SL brackets (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H4 x5.0) to match swing ranges.\n• Entry Column: Scales entry buffering for higher TFs (M5 x1.0, H4 x6.8) preventing order slippage.",
        "actionHint": "💡 Mathematical framework that captures major H1/H4 waves while keeping M5 execution safe."
    },
    {
        "badge": "系统向导 • 第 19 / 21 步",
        "title": "19. Save Settings & Defaults",
        "content": "Bot configuration management:\n• 'Save Settings': Immediately applies all configured parameters.\n• 'Reset to Default': Reverts back to battle-tested Admin baseline settings anytime.",
        "actionHint": "💡 Click 'Next ▶' to inspect Support and Community Reviews."
    },
    {
        "badge": "系统向导 • 第 20 / 21 步",
        "title": "20. Support Tab",
        "content": "Licensing and 24/7 technical assistance:\n• Terms of Service: Register exchange account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify connectivity and retrieve PC HWID for license activation.\n• Server IP & Cleanup: Configure custom Proxy IPs and reset capital or clear candle cache.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team."
    },
    {
        "badge": "系统向导 • 第 21 / 21 步",
        "title": "21. Reviews Tab & Tour Complete!",
        "content": "Community & completion:\n• Community Reviews: Browse verified trade reviews and profit snapshots from fellow traders.\n• Submit Review: Rate stars and share your trading experience with the bot.\n\n🎉 You have completed the comprehensive onboarding tour! Click 'Finish' to close and begin trading.",
        "actionHint": "🎉 Wishing you disciplined and profitable trading with TLS1 Trading Bot!"
    }
],
  ko: [
    {
        "badge": "온보딩 투어 • 1 / 21 단계",
        "title": "1. Connect Button (Connect)",
        "content": "Link trading accounts to the bot system:\n• OKX Exchange: 1-click Fast Connect or manual API Key input.\n• FX Prop Firms: Connect funded accounts (E8, FTMO...) via TradeLocker.\n\nClick 'Next ▶' to open the Connect modal.",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "온보딩 투어 • 2 / 21 단계",
        "title": "2. Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX app to grant OAuth permissions.\n• 100% Secure: Auto-syncs encrypted API Keys, zero secret leakage, no copy-paste errors.\n• Supports independent Sub-Account routing for each bot.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero typing errors."
    },
    {
        "badge": "온보딩 투어 • 3 / 21 단계",
        "title": "3. Manual OKX API Key",
        "content": "Manually enter API Keys generated from OKX:\n• Account Management: Click (+) to add, select from list, or (-) to remove.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase then click 'Save Configuration'.\n\n🛡️ SAFETY NOTICE:\n• Only grant 'Trade' permission.\n• NEVER grant 'Withdraw' permission.",
        "actionHint": "💡 Click 'Next ▶' to explore FX Prop Firm Connect."
    },
    {
        "badge": "온보딩 투어 • 4 / 21 단계",
        "title": "4. FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading for funded Prop Firm accounts:\n• Supported: E8 Markets, FTMO, Funding Pips... via TradeLocker API.\n• Login: Enter Email, Password, and Server.\n• Risk Control: Set Fund Size ($5,000, $100,000...), Daily Drawdown ceiling, and risk per trade.\n• Dynamic Lot: Bot automatically calculates exact Lots based on SL distance to prevent rule breaches.",
        "actionHint": "💡 Click 'Next ▶' to finish connection and return to dashboard."
    },
    {
        "badge": "온보딩 투어 • 5 / 21 단계",
        "title": "5. Platform (OKX / FX Prop)",
        "content": "Switch trading environment on the Sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap).\n• FX Prop: Trade Gold XAU, Forex, Crypto via TradeLocker.\n• Auto Sync: Changing platforms automatically updates account lists and pair selectors.\n• Safety Lock 🔒: Automatically locks while the bot is active.",
        "actionHint": "💡 Effortlessly switch between personal exchange accounts and funded challenges in 1 click."
    },
    {
        "badge": "온보딩 투어 • 6 / 21 단계",
        "title": "6. Select Bot Strategy",
        "content": "3 built-in quantitative algorithms:\n• EMA200 Bot: Captures pullback waves along dynamic EMA200 trendlines.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\nClick this button to switch bot strategies.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "온보딩 투어 • 7 / 21 단계",
        "title": "7. Select Account & Balance",
        "content": "Assign the trading account for the active bot:\n• OKX: Select matching Sub-Account.\n• FX Prop: Select E8 Demo or Live account.\n• Live Balance: View account equity ($5,000, $200,000...) for real-time risk control.\n• Protective Lock 🔒: Account dropdown locks automatically when bot is running.",
        "actionHint": "💡 Real-time equity is clearly displayed without clipping."
    },
    {
        "badge": "온보딩 투어 • 8 / 21 단계",
        "title": "8. Capital & Order Volume",
        "content": "Configure capital per trade:\n• OKX: Fixed USDT ($) or % of Account Equity.\n• FX Prop: Volume in Lots (default 0.01 L).\n• Modes: 'Fixed' (uniform across timeframes) or 'Multiply TF' (auto-scales with larger candles H1 x2.0, H4 x5.0).\n\n🔒 Automatically locked while running to prevent mistakes.",
        "actionHint": "💡 Beginners should use small capital ($1 - $5 or 0.01 Lot) to observe execution."
    },
    {
        "badge": "온보딩 투어 • 9 / 21 단계",
        "title": "9. Base M5 TP & SL (0.6% Default)",
        "content": "Base TP and SL ratios on M5 timeframe (default: 0.6% TP | 0.6% SL):\n• Multi-TF Scaling: Larger candles have wider swings; bot scales via Margin Factor:\n  - M5 : x1.0 ➔ TP 0.60% | SL 0.60%\n  - M15: x1.2 ➔ TP 0.72% | SL 0.72%\n  - M30: x1.5 ➔ TP 0.90% | SL 0.90%\n  - H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n  - H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n• 15s Watchdog daemon continuously attaches protective brackets 24/7.",
        "actionHint": "💡 Battle-tested 0.6% base ratio provides rapid profit realization and capital safety."
    },
    {
        "badge": "온보딩 투어 • 10 / 21 단계",
        "title": "10. Pairs & Trading Timeframes",
        "content": "Manage symbol watchlist and order timeframes:\n• Pairs Column: Check symbols to scan (XAU, BTC, ETH...). Click pair name to open TradingView chart.\n• Trade TF Column: Check timeframes (5, 15, 30, H1, H2, H4) where the bot may place orders.\n• Multi-TF Enabled: Bot distributes orders across timeframes concurrently.",
        "actionHint": "💡 Toggle coin pairs and timeframes flexibly to match your strategy."
    },
    {
        "badge": "온보딩 투어 • 11 / 21 단계",
        "title": "11. Start / Stop Bot Engine",
        "content": "Activate or halt automated bot operations:\n• 'START BOT': Scans market signals and places/manages orders 24/7 on exchange or prop.\n• 'STOP BOT': Cancels open pending limit orders and protects active positions.\n• You can safely close your browser; the bot runs persistently on the server.",
        "actionHint": "💡 Button colors reflect active state (Green: Running, Gray: Stopped)."
    },
    {
        "badge": "온보딩 투어 • 12 / 21 단계",
        "title": "12. Positions, Logs & Split View",
        "content": "Central monitoring pane:\n• Positions Tab: Open positions, live PnL, entry price, SL/TP brackets, and panic-close button.\n• Logs Tab: Real-time scan logs and broker response feed.\n• Charts Tab: TradingView technical chart.\n• ⮃ Split View: View Charts on top and Positions below simultaneously without switching tabs.",
        "actionHint": "💡 Click ⮃ button on the right to experience the dual-pane view."
    },
    {
        "badge": "온보딩 투어 • 13 / 21 단계",
        "title": "13. Guide & Settings ⚙",
        "content": "Two key utility controls on Sidebar:\n• 'Guide': Re-launch this guided tour anytime.\n• 'Settings' ⚙: Open Deep Configuration Panel to fine-tune Watchlist, DCA Trio, Circuit Breaker, Entry Setup, and Multipliers.\n\nClick 'Next ▶' to open the Settings modal.",
        "actionHint": "💡 Click 'Next ▶' to inspect Deep Settings."
    },
    {
        "badge": "온보딩 투어 • 14 / 21 단계",
        "title": "14. Coin Watchlist",
        "content": "Configure coins displayed on the dashboard:\n• Click to toggle coins (XAU, BTC, ETH, SOL, DOGE...).\n• Active badges display on main dashboard.\n• Safety Lock: Coins with open positions are locked from deselecting.",
        "actionHint": "💡 Enable coins aligned with your account capital."
    },
    {
        "badge": "온보딩 투어 • 15 / 21 단계",
        "title": "15. DCA Mode Trio",
        "content": "Select 1 of 3 advanced execution algorithms:\n• DCA Dương: Adds positions as profit develops along trend steps (H4 -> M5).\n• DCA Âm: Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 mode can be active at a time (enabling one disables the others).",
        "actionHint": "💡 Split Grid and DCA Dương are recommended for conservative risk management."
    },
    {
        "badge": "온보딩 투어 • 16 / 21 단계",
        "title": "16. Circuit Breaker & BTC Alignment",
        "content": "Protect account during sharp market shocks:\n• Reversal Circuit Breaker: When price extends too far from H4 EMA200 (> 8%), bot halts trend orders to avoid tops/bottoms, and opens hedge pullback orders.\n• BTC Alignment: Restricts Altcoins to only enter trades aligned with BTC market direction.",
        "actionHint": "💡 Keep Circuit Breaker ON 24/7 to safeguard equity."
    },
    {
        "badge": "온보딩 투어 • 17 / 21 단계",
        "title": "17. Entry Setup & Accumulation",
        "content": "Configure entry criteria:\n• Base Offset (%): Places limits ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds.\n• Base Gap (%): Minimum safety gap between adjacent EMA levels to avoid tight stacking.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before entering, eliminating sideways traps.",
        "actionHint": "💡 Battle-tested defaults; beginners should keep Admin standards."
    },
    {
        "badge": "온보딩 투어 • 18 / 21 단계",
        "title": "18. Multi-TF Multipliers",
        "content": "Multi-timeframe mathematical scaling mechanics:\n• Capital Column: Larger candles expand margin and TP/SL brackets (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H4 x5.0) to match swing ranges.\n• Entry Column: Scales entry buffering for higher TFs (M5 x1.0, H4 x6.8) preventing order slippage.",
        "actionHint": "💡 Mathematical framework that captures major H1/H4 waves while keeping M5 execution safe."
    },
    {
        "badge": "온보딩 투어 • 19 / 21 단계",
        "title": "19. Save Settings & Defaults",
        "content": "Bot configuration management:\n• 'Save Settings': Immediately applies all configured parameters.\n• 'Reset to Default': Reverts back to battle-tested Admin baseline settings anytime.",
        "actionHint": "💡 Click 'Next ▶' to inspect Support and Community Reviews."
    },
    {
        "badge": "온보딩 투어 • 20 / 21 단계",
        "title": "20. Support Tab",
        "content": "Licensing and 24/7 technical assistance:\n• Terms of Service: Register exchange account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify connectivity and retrieve PC HWID for license activation.\n• Server IP & Cleanup: Configure custom Proxy IPs and reset capital or clear candle cache.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team."
    },
    {
        "badge": "온보딩 투어 • 21 / 21 단계",
        "title": "21. Reviews Tab & Tour Complete!",
        "content": "Community & completion:\n• Community Reviews: Browse verified trade reviews and profit snapshots from fellow traders.\n• Submit Review: Rate stars and share your trading experience with the bot.\n\n🎉 You have completed the comprehensive onboarding tour! Click 'Finish' to close and begin trading.",
        "actionHint": "🎉 Wishing you disciplined and profitable trading with TLS1 Trading Bot!"
    }
],
  fr: [
    {
        "badge": "Guide Interactif • Étape 1 / 21",
        "title": "1. Connect Button (Connect)",
        "content": "Link trading accounts to the bot system:\n• OKX Exchange: 1-click Fast Connect or manual API Key input.\n• FX Prop Firms: Connect funded accounts (E8, FTMO...) via TradeLocker.\n\nClick 'Next ▶' to open the Connect modal.",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "Guide Interactif • Étape 2 / 21",
        "title": "2. Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX app to grant OAuth permissions.\n• 100% Secure: Auto-syncs encrypted API Keys, zero secret leakage, no copy-paste errors.\n• Supports independent Sub-Account routing for each bot.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero typing errors."
    },
    {
        "badge": "Guide Interactif • Étape 3 / 21",
        "title": "3. Manual OKX API Key",
        "content": "Manually enter API Keys generated from OKX:\n• Account Management: Click (+) to add, select from list, or (-) to remove.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase then click 'Save Configuration'.\n\n🛡️ SAFETY NOTICE:\n• Only grant 'Trade' permission.\n• NEVER grant 'Withdraw' permission.",
        "actionHint": "💡 Click 'Next ▶' to explore FX Prop Firm Connect."
    },
    {
        "badge": "Guide Interactif • Étape 4 / 21",
        "title": "4. FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading for funded Prop Firm accounts:\n• Supported: E8 Markets, FTMO, Funding Pips... via TradeLocker API.\n• Login: Enter Email, Password, and Server.\n• Risk Control: Set Fund Size ($5,000, $100,000...), Daily Drawdown ceiling, and risk per trade.\n• Dynamic Lot: Bot automatically calculates exact Lots based on SL distance to prevent rule breaches.",
        "actionHint": "💡 Click 'Next ▶' to finish connection and return to dashboard."
    },
    {
        "badge": "Guide Interactif • Étape 5 / 21",
        "title": "5. Platform (OKX / FX Prop)",
        "content": "Switch trading environment on the Sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap).\n• FX Prop: Trade Gold XAU, Forex, Crypto via TradeLocker.\n• Auto Sync: Changing platforms automatically updates account lists and pair selectors.\n• Safety Lock 🔒: Automatically locks while the bot is active.",
        "actionHint": "💡 Effortlessly switch between personal exchange accounts and funded challenges in 1 click."
    },
    {
        "badge": "Guide Interactif • Étape 6 / 21",
        "title": "6. Select Bot Strategy",
        "content": "3 built-in quantitative algorithms:\n• EMA200 Bot: Captures pullback waves along dynamic EMA200 trendlines.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\nClick this button to switch bot strategies.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "Guide Interactif • Étape 7 / 21",
        "title": "7. Select Account & Balance",
        "content": "Assign the trading account for the active bot:\n• OKX: Select matching Sub-Account.\n• FX Prop: Select E8 Demo or Live account.\n• Live Balance: View account equity ($5,000, $200,000...) for real-time risk control.\n• Protective Lock 🔒: Account dropdown locks automatically when bot is running.",
        "actionHint": "💡 Real-time equity is clearly displayed without clipping."
    },
    {
        "badge": "Guide Interactif • Étape 8 / 21",
        "title": "8. Capital & Order Volume",
        "content": "Configure capital per trade:\n• OKX: Fixed USDT ($) or % of Account Equity.\n• FX Prop: Volume in Lots (default 0.01 L).\n• Modes: 'Fixed' (uniform across timeframes) or 'Multiply TF' (auto-scales with larger candles H1 x2.0, H4 x5.0).\n\n🔒 Automatically locked while running to prevent mistakes.",
        "actionHint": "💡 Beginners should use small capital ($1 - $5 or 0.01 Lot) to observe execution."
    },
    {
        "badge": "Guide Interactif • Étape 9 / 21",
        "title": "9. Base M5 TP & SL (0.6% Default)",
        "content": "Base TP and SL ratios on M5 timeframe (default: 0.6% TP | 0.6% SL):\n• Multi-TF Scaling: Larger candles have wider swings; bot scales via Margin Factor:\n  - M5 : x1.0 ➔ TP 0.60% | SL 0.60%\n  - M15: x1.2 ➔ TP 0.72% | SL 0.72%\n  - M30: x1.5 ➔ TP 0.90% | SL 0.90%\n  - H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n  - H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n• 15s Watchdog daemon continuously attaches protective brackets 24/7.",
        "actionHint": "💡 Battle-tested 0.6% base ratio provides rapid profit realization and capital safety."
    },
    {
        "badge": "Guide Interactif • Étape 10 / 21",
        "title": "10. Pairs & Trading Timeframes",
        "content": "Manage symbol watchlist and order timeframes:\n• Pairs Column: Check symbols to scan (XAU, BTC, ETH...). Click pair name to open TradingView chart.\n• Trade TF Column: Check timeframes (5, 15, 30, H1, H2, H4) where the bot may place orders.\n• Multi-TF Enabled: Bot distributes orders across timeframes concurrently.",
        "actionHint": "💡 Toggle coin pairs and timeframes flexibly to match your strategy."
    },
    {
        "badge": "Guide Interactif • Étape 11 / 21",
        "title": "11. Start / Stop Bot Engine",
        "content": "Activate or halt automated bot operations:\n• 'START BOT': Scans market signals and places/manages orders 24/7 on exchange or prop.\n• 'STOP BOT': Cancels open pending limit orders and protects active positions.\n• You can safely close your browser; the bot runs persistently on the server.",
        "actionHint": "💡 Button colors reflect active state (Green: Running, Gray: Stopped)."
    },
    {
        "badge": "Guide Interactif • Étape 12 / 21",
        "title": "12. Positions, Logs & Split View",
        "content": "Central monitoring pane:\n• Positions Tab: Open positions, live PnL, entry price, SL/TP brackets, and panic-close button.\n• Logs Tab: Real-time scan logs and broker response feed.\n• Charts Tab: TradingView technical chart.\n• ⮃ Split View: View Charts on top and Positions below simultaneously without switching tabs.",
        "actionHint": "💡 Click ⮃ button on the right to experience the dual-pane view."
    },
    {
        "badge": "Guide Interactif • Étape 13 / 21",
        "title": "13. Guide & Settings ⚙",
        "content": "Two key utility controls on Sidebar:\n• 'Guide': Re-launch this guided tour anytime.\n• 'Settings' ⚙: Open Deep Configuration Panel to fine-tune Watchlist, DCA Trio, Circuit Breaker, Entry Setup, and Multipliers.\n\nClick 'Next ▶' to open the Settings modal.",
        "actionHint": "💡 Click 'Next ▶' to inspect Deep Settings."
    },
    {
        "badge": "Guide Interactif • Étape 14 / 21",
        "title": "14. Coin Watchlist",
        "content": "Configure coins displayed on the dashboard:\n• Click to toggle coins (XAU, BTC, ETH, SOL, DOGE...).\n• Active badges display on main dashboard.\n• Safety Lock: Coins with open positions are locked from deselecting.",
        "actionHint": "💡 Enable coins aligned with your account capital."
    },
    {
        "badge": "Guide Interactif • Étape 15 / 21",
        "title": "15. DCA Mode Trio",
        "content": "Select 1 of 3 advanced execution algorithms:\n• DCA Dương: Adds positions as profit develops along trend steps (H4 -> M5).\n• DCA Âm: Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 mode can be active at a time (enabling one disables the others).",
        "actionHint": "💡 Split Grid and DCA Dương are recommended for conservative risk management."
    },
    {
        "badge": "Guide Interactif • Étape 16 / 21",
        "title": "16. Circuit Breaker & BTC Alignment",
        "content": "Protect account during sharp market shocks:\n• Reversal Circuit Breaker: When price extends too far from H4 EMA200 (> 8%), bot halts trend orders to avoid tops/bottoms, and opens hedge pullback orders.\n• BTC Alignment: Restricts Altcoins to only enter trades aligned with BTC market direction.",
        "actionHint": "💡 Keep Circuit Breaker ON 24/7 to safeguard equity."
    },
    {
        "badge": "Guide Interactif • Étape 17 / 21",
        "title": "17. Entry Setup & Accumulation",
        "content": "Configure entry criteria:\n• Base Offset (%): Places limits ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds.\n• Base Gap (%): Minimum safety gap between adjacent EMA levels to avoid tight stacking.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before entering, eliminating sideways traps.",
        "actionHint": "💡 Battle-tested defaults; beginners should keep Admin standards."
    },
    {
        "badge": "Guide Interactif • Étape 18 / 21",
        "title": "18. Multi-TF Multipliers",
        "content": "Multi-timeframe mathematical scaling mechanics:\n• Capital Column: Larger candles expand margin and TP/SL brackets (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H4 x5.0) to match swing ranges.\n• Entry Column: Scales entry buffering for higher TFs (M5 x1.0, H4 x6.8) preventing order slippage.",
        "actionHint": "💡 Mathematical framework that captures major H1/H4 waves while keeping M5 execution safe."
    },
    {
        "badge": "Guide Interactif • Étape 19 / 21",
        "title": "19. Save Settings & Defaults",
        "content": "Bot configuration management:\n• 'Save Settings': Immediately applies all configured parameters.\n• 'Reset to Default': Reverts back to battle-tested Admin baseline settings anytime.",
        "actionHint": "💡 Click 'Next ▶' to inspect Support and Community Reviews."
    },
    {
        "badge": "Guide Interactif • Étape 20 / 21",
        "title": "20. Support Tab",
        "content": "Licensing and 24/7 technical assistance:\n• Terms of Service: Register exchange account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify connectivity and retrieve PC HWID for license activation.\n• Server IP & Cleanup: Configure custom Proxy IPs and reset capital or clear candle cache.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team."
    },
    {
        "badge": "Guide Interactif • Étape 21 / 21",
        "title": "21. Reviews Tab & Tour Complete!",
        "content": "Community & completion:\n• Community Reviews: Browse verified trade reviews and profit snapshots from fellow traders.\n• Submit Review: Rate stars and share your trading experience with the bot.\n\n🎉 You have completed the comprehensive onboarding tour! Click 'Finish' to close and begin trading.",
        "actionHint": "🎉 Wishing you disciplined and profitable trading with TLS1 Trading Bot!"
    }
],
  es: [
    {
        "badge": "Guía Interactiva • Paso 1 / 21",
        "title": "1. Connect Button (Connect)",
        "content": "Link trading accounts to the bot system:\n• OKX Exchange: 1-click Fast Connect or manual API Key input.\n• FX Prop Firms: Connect funded accounts (E8, FTMO...) via TradeLocker.\n\nClick 'Next ▶' to open the Connect modal.",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "Guía Interactiva • Paso 2 / 21",
        "title": "2. Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX app to grant OAuth permissions.\n• 100% Secure: Auto-syncs encrypted API Keys, zero secret leakage, no copy-paste errors.\n• Supports independent Sub-Account routing for each bot.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero typing errors."
    },
    {
        "badge": "Guía Interactiva • Paso 3 / 21",
        "title": "3. Manual OKX API Key",
        "content": "Manually enter API Keys generated from OKX:\n• Account Management: Click (+) to add, select from list, or (-) to remove.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase then click 'Save Configuration'.\n\n🛡️ SAFETY NOTICE:\n• Only grant 'Trade' permission.\n• NEVER grant 'Withdraw' permission.",
        "actionHint": "💡 Click 'Next ▶' to explore FX Prop Firm Connect."
    },
    {
        "badge": "Guía Interactiva • Paso 4 / 21",
        "title": "4. FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading for funded Prop Firm accounts:\n• Supported: E8 Markets, FTMO, Funding Pips... via TradeLocker API.\n• Login: Enter Email, Password, and Server.\n• Risk Control: Set Fund Size ($5,000, $100,000...), Daily Drawdown ceiling, and risk per trade.\n• Dynamic Lot: Bot automatically calculates exact Lots based on SL distance to prevent rule breaches.",
        "actionHint": "💡 Click 'Next ▶' to finish connection and return to dashboard."
    },
    {
        "badge": "Guía Interactiva • Paso 5 / 21",
        "title": "5. Platform (OKX / FX Prop)",
        "content": "Switch trading environment on the Sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap).\n• FX Prop: Trade Gold XAU, Forex, Crypto via TradeLocker.\n• Auto Sync: Changing platforms automatically updates account lists and pair selectors.\n• Safety Lock 🔒: Automatically locks while the bot is active.",
        "actionHint": "💡 Effortlessly switch between personal exchange accounts and funded challenges in 1 click."
    },
    {
        "badge": "Guía Interactiva • Paso 6 / 21",
        "title": "6. Select Bot Strategy",
        "content": "3 built-in quantitative algorithms:\n• EMA200 Bot: Captures pullback waves along dynamic EMA200 trendlines.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\nClick this button to switch bot strategies.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "Guía Interactiva • Paso 7 / 21",
        "title": "7. Select Account & Balance",
        "content": "Assign the trading account for the active bot:\n• OKX: Select matching Sub-Account.\n• FX Prop: Select E8 Demo or Live account.\n• Live Balance: View account equity ($5,000, $200,000...) for real-time risk control.\n• Protective Lock 🔒: Account dropdown locks automatically when bot is running.",
        "actionHint": "💡 Real-time equity is clearly displayed without clipping."
    },
    {
        "badge": "Guía Interactiva • Paso 8 / 21",
        "title": "8. Capital & Order Volume",
        "content": "Configure capital per trade:\n• OKX: Fixed USDT ($) or % of Account Equity.\n• FX Prop: Volume in Lots (default 0.01 L).\n• Modes: 'Fixed' (uniform across timeframes) or 'Multiply TF' (auto-scales with larger candles H1 x2.0, H4 x5.0).\n\n🔒 Automatically locked while running to prevent mistakes.",
        "actionHint": "💡 Beginners should use small capital ($1 - $5 or 0.01 Lot) to observe execution."
    },
    {
        "badge": "Guía Interactiva • Paso 9 / 21",
        "title": "9. Base M5 TP & SL (0.6% Default)",
        "content": "Base TP and SL ratios on M5 timeframe (default: 0.6% TP | 0.6% SL):\n• Multi-TF Scaling: Larger candles have wider swings; bot scales via Margin Factor:\n  - M5 : x1.0 ➔ TP 0.60% | SL 0.60%\n  - M15: x1.2 ➔ TP 0.72% | SL 0.72%\n  - M30: x1.5 ➔ TP 0.90% | SL 0.90%\n  - H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n  - H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n• 15s Watchdog daemon continuously attaches protective brackets 24/7.",
        "actionHint": "💡 Battle-tested 0.6% base ratio provides rapid profit realization and capital safety."
    },
    {
        "badge": "Guía Interactiva • Paso 10 / 21",
        "title": "10. Pairs & Trading Timeframes",
        "content": "Manage symbol watchlist and order timeframes:\n• Pairs Column: Check symbols to scan (XAU, BTC, ETH...). Click pair name to open TradingView chart.\n• Trade TF Column: Check timeframes (5, 15, 30, H1, H2, H4) where the bot may place orders.\n• Multi-TF Enabled: Bot distributes orders across timeframes concurrently.",
        "actionHint": "💡 Toggle coin pairs and timeframes flexibly to match your strategy."
    },
    {
        "badge": "Guía Interactiva • Paso 11 / 21",
        "title": "11. Start / Stop Bot Engine",
        "content": "Activate or halt automated bot operations:\n• 'START BOT': Scans market signals and places/manages orders 24/7 on exchange or prop.\n• 'STOP BOT': Cancels open pending limit orders and protects active positions.\n• You can safely close your browser; the bot runs persistently on the server.",
        "actionHint": "💡 Button colors reflect active state (Green: Running, Gray: Stopped)."
    },
    {
        "badge": "Guía Interactiva • Paso 12 / 21",
        "title": "12. Positions, Logs & Split View",
        "content": "Central monitoring pane:\n• Positions Tab: Open positions, live PnL, entry price, SL/TP brackets, and panic-close button.\n• Logs Tab: Real-time scan logs and broker response feed.\n• Charts Tab: TradingView technical chart.\n• ⮃ Split View: View Charts on top and Positions below simultaneously without switching tabs.",
        "actionHint": "💡 Click ⮃ button on the right to experience the dual-pane view."
    },
    {
        "badge": "Guía Interactiva • Paso 13 / 21",
        "title": "13. Guide & Settings ⚙",
        "content": "Two key utility controls on Sidebar:\n• 'Guide': Re-launch this guided tour anytime.\n• 'Settings' ⚙: Open Deep Configuration Panel to fine-tune Watchlist, DCA Trio, Circuit Breaker, Entry Setup, and Multipliers.\n\nClick 'Next ▶' to open the Settings modal.",
        "actionHint": "💡 Click 'Next ▶' to inspect Deep Settings."
    },
    {
        "badge": "Guía Interactiva • Paso 14 / 21",
        "title": "14. Coin Watchlist",
        "content": "Configure coins displayed on the dashboard:\n• Click to toggle coins (XAU, BTC, ETH, SOL, DOGE...).\n• Active badges display on main dashboard.\n• Safety Lock: Coins with open positions are locked from deselecting.",
        "actionHint": "💡 Enable coins aligned with your account capital."
    },
    {
        "badge": "Guía Interactiva • Paso 15 / 21",
        "title": "15. DCA Mode Trio",
        "content": "Select 1 of 3 advanced execution algorithms:\n• DCA Dương: Adds positions as profit develops along trend steps (H4 -> M5).\n• DCA Âm: Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 mode can be active at a time (enabling one disables the others).",
        "actionHint": "💡 Split Grid and DCA Dương are recommended for conservative risk management."
    },
    {
        "badge": "Guía Interactiva • Paso 16 / 21",
        "title": "16. Circuit Breaker & BTC Alignment",
        "content": "Protect account during sharp market shocks:\n• Reversal Circuit Breaker: When price extends too far from H4 EMA200 (> 8%), bot halts trend orders to avoid tops/bottoms, and opens hedge pullback orders.\n• BTC Alignment: Restricts Altcoins to only enter trades aligned with BTC market direction.",
        "actionHint": "💡 Keep Circuit Breaker ON 24/7 to safeguard equity."
    },
    {
        "badge": "Guía Interactiva • Paso 17 / 21",
        "title": "17. Entry Setup & Accumulation",
        "content": "Configure entry criteria:\n• Base Offset (%): Places limits ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds.\n• Base Gap (%): Minimum safety gap between adjacent EMA levels to avoid tight stacking.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before entering, eliminating sideways traps.",
        "actionHint": "💡 Battle-tested defaults; beginners should keep Admin standards."
    },
    {
        "badge": "Guía Interactiva • Paso 18 / 21",
        "title": "18. Multi-TF Multipliers",
        "content": "Multi-timeframe mathematical scaling mechanics:\n• Capital Column: Larger candles expand margin and TP/SL brackets (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H4 x5.0) to match swing ranges.\n• Entry Column: Scales entry buffering for higher TFs (M5 x1.0, H4 x6.8) preventing order slippage.",
        "actionHint": "💡 Mathematical framework that captures major H1/H4 waves while keeping M5 execution safe."
    },
    {
        "badge": "Guía Interactiva • Paso 19 / 21",
        "title": "19. Save Settings & Defaults",
        "content": "Bot configuration management:\n• 'Save Settings': Immediately applies all configured parameters.\n• 'Reset to Default': Reverts back to battle-tested Admin baseline settings anytime.",
        "actionHint": "💡 Click 'Next ▶' to inspect Support and Community Reviews."
    },
    {
        "badge": "Guía Interactiva • Paso 20 / 21",
        "title": "20. Support Tab",
        "content": "Licensing and 24/7 technical assistance:\n• Terms of Service: Register exchange account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify connectivity and retrieve PC HWID for license activation.\n• Server IP & Cleanup: Configure custom Proxy IPs and reset capital or clear candle cache.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team."
    },
    {
        "badge": "Guía Interactiva • Paso 21 / 21",
        "title": "21. Reviews Tab & Tour Complete!",
        "content": "Community & completion:\n• Community Reviews: Browse verified trade reviews and profit snapshots from fellow traders.\n• Submit Review: Rate stars and share your trading experience with the bot.\n\n🎉 You have completed the comprehensive onboarding tour! Click 'Finish' to close and begin trading.",
        "actionHint": "🎉 Wishing you disciplined and profitable trading with TLS1 Trading Bot!"
    }
]
};

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
    // 1: connect-okx
    {
      target: '[data-tour="connect-okx"]',
      placement: "bottom",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(false);
      },
    },
    // 2: connect-fast-content bao gồm cả tab Fast Connect
    {
      target: '[data-tour="connect-fast-tab"], [data-tour="connect-fast-content"]',
      placement: "right",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("fast");
      },
    },
    // 3: connect-apikey-content bao gồm cả tab API Key
    {
      target: '[data-tour="connect-apikey-tab"], [data-tour="connect-apikey-content"]',
      placement: "right",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("apikey");
      },
    },
    // 4: connect-tradelocker-content bao gồm cả tab Quỹ FX
    {
      target: '[data-tour="connect-tradelocker-tab"], [data-tour="connect-tradelocker-content"]',
      placement: "right",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("tradelocker");
      },
    },
    // 5: platform-select
    {
      target: '[data-tour="platform-select"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 6: bot-selector
    {
      target: '[data-tour="bot-selector"]',
      placement: "bottom",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 7: account-select
    {
      target: '[data-tour="account-select"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 8: margin-config
    {
      target: '[data-tour="margin-config"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 9: tpsl-config
    {
      target: '[data-tour="tpsl-config"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 10: watchlist-pairs
    {
      target: '[data-tour="watchlist-pairs"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
        setActiveTab("positions");
      },
    },
    // 11: action-bot
    {
      target: '[data-tour="action-bot"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 12: bottom-tabs-bar
    {
      target: '[data-tour="bottom-tabs-bar"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 13: settings-btn
    {
      target: '[data-tour="settings-btn"]',
      placement: "right",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(false);
      },
    },
    // 14: settings-watchlist
    {
      target: '[data-tour="settings-watchlist"]',
      placement: "bottom",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 15: settings-dca
    {
      target: '[data-tour="settings-dca"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 16: settings-circuit-breaker
    {
      target: '[data-tour="settings-circuit-breaker"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 17: settings-entry-filters
    {
      target: '[data-tour="settings-entry-filters"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 18: settings-tf-multipliers
    {
      target: '[data-tour="settings-tf-multipliers"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 19: settings-actions
    {
      target: '[data-tour="settings-actions"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 20: settings-support-tab-content bao gồm cả nút tab Hỗ Trợ
    {
      target: '[data-tour="settings-support-tab"], [data-tour="settings-support-tab-content"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("system");
      },
    },
    // 21: settings-reviews-tab-content bao gồm cả nút tab Đánh Giá
    {
      target: '[data-tour="settings-reviews-tab"], [data-tour="settings-reviews-tab-content"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("reviews");
      },
    }
  ];

  return baseSpecs.map((spec, idx) => {
    const textInfo = contentList[idx] || {};
    return {
      ...spec,
      ...textInfo
    };
  });
}
