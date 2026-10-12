/**
 * Multilingual Onboarding Tour Data for TLS1 Trading Bot (22 Comprehensive Steps)
 * Supported languages: vi (Tiếng Việt), en (English), zh (简体中文), ko (한국어), fr (Français), es (Español)
 */

export const TOUR_CONTENT = {
  vi: [
    {
        "badge": "Màn Hình Chính • Bước 1 / 22",
        "title": "1. Nút Kết Nối Sàn & Quỹ Cấp Vốn (Connect)",
        "content": "Cửa ngõ liên kết tài khoản giao dịch với hệ thống bot. Hỗ trợ toàn diện:\n• Sàn OKX: Kết nối Fast Connect 1-click hoặc nhập API Key chủ động.\n• Quỹ FX Quốc Tế: Kết nối tài khoản Quỹ thi (E8 Markets, FTMO, Funding Pips...) qua giao thức TradeLocker API.\n\n• Nhấn 'Tiếp theo ▶' để mở cửa sổ Kết Nối và cùng khám phá chi tiết từng phương thức!",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để mở popup Kết Nối."
    },
    {
        "badge": "Kết Nối • Bước 2 / 22",
        "title": "2. Phương Thức 1: Fast Connect (OAuth 2.0)",
        "content": "Kết nối 1-click an toàn tuyệt đối được OKX cấp phép chính thức:\n• Nhấn 'Mở App ➔': Tự động mở App OKX trên điện thoại hoặc trình duyệt để xác thực cấp quyền OAuth 2.0.\n• An toàn 100%: Tự động mã hóa và đồng bộ API Key vào hệ thống, không lo lộ mã bí mật, không mất công copy-paste thủ công.\n• Hỗ trợ kết nối và quản lý nhiều tài khoản Sub-Account độc lập cho từng bot.\n• Sắp tới mở rộng thêm Binance Connect, Bybit Connect và Ví Web3.",
        "actionHint": "💡 Khuyên dùng cho người mới vì kết nối siêu tốc chỉ trong 3 giây và loại bỏ hoàn toàn rủi ro copy nhầm mã."
    },
    {
        "badge": "Kết Nối • Bước 3 / 22",
        "title": "3. Phương Thức 2: Tự Nhập API Key OKX (Chủ Động)",
        "content": "Dành cho người dùng muốn chủ động tạo và quản lý API Key thủ công trên sàn OKX:\n• Quản Lý Tài Khoản: Bấm (+) màu xanh để tạo tài khoản mới, chọn tài khoản từ danh sách, hoặc bấm (-) để xóa.\n• Cụm Nhập Key: Điền chính xác API Key, Secret Key và Passphrase tạo từ sàn OKX rồi nhấn 'Lưu Cấu Hình'.\n\n🛡️ NGUYÊN TẮC AN TOÀN SỐNG CÒN:\n• Khi tạo API Key trên sàn OKX, bạn CHỈ CẦN CẤP QUYỀN 'Trade' (Giao dịch).\n• TUYỆT ĐỐI KHÔNG CẤP QUYỀN 'Withdraw' (Rút tiền). Bot TLS1 không bao giờ yêu cầu quyền rút tiền, đảm bảo 100% an toàn tuyệt đối cho tài sản của bạn.",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để khám phá tính năng Kết nối Quỹ FX TradeLocker mới nhất!"
    },
    {
        "badge": "Kết Nối • Bước 4 / 22",
        "title": "4. Phương Thức 3: Kết Nối Quỹ FX (TradeLocker)",
        "content": "Giải pháp tự động hóa giao dịch cho các tài khoản Quỹ Cấp Vốn (Prop Firm) hàng đầu thế giới:\n• Nền tảng hỗ trợ: E8 Markets, FTMO, The 5%ers, Funding Pips... thông qua giao thức TradeLocker API.\n• Kết nối an toàn: Nhập Email, Password, Server Quỹ (E8, Demo, Live). Mật khẩu được mã hóa Fernet đa tầng trên máy cục bộ.\n• Tự động Quản Lý Quỹ: Thiết lập Kích thước Quỹ ($5.000, $100.000, $200.000...), giới hạn rủi ro mỗi lệnh, trần sụt giảm ngày (Daily Drawdown) và mục tiêu chốt lời ngày.\n• Tự động tính Lots: Bot tự tính toán khối lượng Lots tối ưu theo biên độ SL, tuyệt đối không vi phạm luật sụt giảm vốn của Quỹ!",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để hoàn tất phần Kết Nối và ra ngoài giao diện điều hành chính!"
    },
    {
        "badge": "Màn Hình Chính • Bước 5 / 22",
        "title": "5. Chọn Nền Tảng Giao Dịch (Sàn OKX / Quỹ FX)",
        "content": "Thanh chuyển đổi nhanh môi trường giao dịch trực tiếp ngay trên Sidebar:\n• Sàn OKX: Giao dịch Crypto Phái sinh (USDT Swap) trên sàn OKX.\n• Quỹ FX: Giao dịch tài khoản Quỹ quốc tế (Vàng XAU, Forex, Crypto) qua nền tảng TradeLocker.\n• Tự động đồng bộ: Khi bạn chuyển nền tảng, danh sách tài khoản và các cặp giao dịch sẽ tự động điều chỉnh phù hợp với môi trường tương ứng.\n• Khóa an toàn 🔒: Khi bot đang chạy, lựa chọn này sẽ tự động khóa để bảo vệ trạng thái lệnh.",
        "actionHint": "💡 Tiện lợi chuyển đổi giữa tài khoản cá nhân và tài khoản thi Quỹ chỉ trong 1 thao tác."
    },
    {
        "badge": "Màn Hình Chính • Bước 6 / 22",
        "title": "6. Chọn Chiến Thuật Bot (Command Capsule)",
        "content": "Hệ thống tích hợp sẵn 3 thuật toán cao cấp với huy hiệu nhận diện trực quan:\n• EMA200 Bot: Bắt sóng hồi quy xu hướng theo cản động EMA200 đa khung thời gian.\n• SMC Bot: Săn vùng thanh khoản & Order Block phản ứng đảo chiều giá trị.\n• Liquidation Bot: Bắt nhịp quét râu thanh khoản của Market Maker khi thị trường biến động dữ dội.\n\n• Nhấp vào nút Capsule này để mở dropdown chuyển đổi nhanh giữa các chiến thuật.",
        "actionHint": "💡 Mỗi bot có thể chạy độc lập với cấu hình và tài khoản riêng biệt."
    },
    {
        "badge": "Màn Hình Chính • Bước 7 / 22",
        "title": "7. Chọn Tài Khoản & Theo Dõi Số Dư Live",
        "content": "Lựa chọn tài khoản áp dụng cho chiến thuật bot đang chọn:\n• Hỗ trợ đầy đủ: Tài khoản Sàn OKX (Sub-Account) và Tài khoản Quỹ FX (E8 Demo, E8 Live).\n• Hiển thị số dư thực tế: Tự động cập nhật và hiển thị đầy đủ số dư vốn ($5.000, $200.000...) giúp bạn kiểm soát rủi ro tức thời.\n• Khóa bảo vệ 🔒: Khi bot đang chạy, ô chọn tài khoản sẽ tự động khóa chặt để tránh nhầm lẫn đảo lộn vị thế.",
        "actionHint": "💡 Căn phải tinh tế, hiển thị trọn vẹn số dư không bị che khuất."
    },
    {
        "badge": "Màn Hình Chính • Bước 8 / 22",
        "title": "8. Quản Lý Vốn, Ký Quỹ & Khóa An Toàn 🔒",
        "content": "• Đơn vị: Nhập số tiền cố định bằng USDT ($) hoặc tính theo % Vốn tài khoản.\n• Chế độ Hệ số TF: Chọn 'Cố định' để mọi khung dùng chung 1 mức vốn, hoặc 'Nhân TF' để tự động nhân khối lượng theo khung thời gian (H1 x2.0, H4 x5.0).\n\n🔒 CƠ CHẾ KHÓA AN TOÀN TUYỆT ĐỐI:\n• Sau khi bạn nhấn 'BẮT ĐẦU CHẠY BOT', ô ký quỹ này sẽ tự động KHÓA CHẶT 🔒 không cho sửa đổi, ngăn chặn triệt để lỗi nhảy vốn hoặc người dùng vô tình bấm nhầm.\n• Muốn điều chỉnh mức vốn, bạn chỉ cần nhấn 'DỪNG BOT', sau đó chỉnh sửa và bật lại.",
        "actionHint": "💡 Khuyến nghị cho người mới: Cài đặt ký quỹ nhỏ (1$ - 5$) để quan sát nhịp chạy thực tế trước."
    },
    {
        "badge": "Màn Hình Chính • Bước 9 / 22",
        "title": "9. Chốt Lời (TP) & Cắt Lỗ (SL) M5 Chuẩn 0.6%",
        "content": "Cài đặt tỷ lệ TP và SL an toàn. Mức TP/SL thiết lập ở đây là mức CƠ SỞ trên khung M5 (mặc định tối ưu 0.6% TP và 0.6% SL). Khi bot khớp lệnh ở các khung lớn hơn, hệ thống tự động nhân biên độ theo Hệ Số Vốn (Margin Factor):\n\n📊 BẢNG HỆ SỐ NHÂN TP/SL ĐA KHUNG (Chuẩn M5 0.6%):\n• M5 : x1.0 ➔ TP 0,60% | SL 0,60% (Khung gốc)\n• M15: x1.2 ➔ TP 0,72% | SL 0,72%\n• M30: x1.5 ➔ TP 0,90% | SL 0,90%\n• H1 : x2.0 ➔ TP 1,20% | SL 1,20%\n• H2 : x3.0 ➔ TP 1,80% | SL 1,80%\n• H4 : x5.0 ➔ TP 3,00% | SL 3,00%\n\n🔍 Bản chất tính toán: Khung nến càng lớn thì biên độ sóng dao động càng mạnh. Bot tự động nới rộng biên độ TP/SL tương ứng để gồng trọn con sóng dài, tránh bị quét râu cắt lỗ non.\n🛡️ Watchdog 15s: Quét ngầm liên tục, tự động đặt bổ sung cặp TP/SL bảo vệ vị thế 24/7.",
        "actionHint": "💡 Tỷ lệ 0.6% M5 đã được tối ưu hóa thực chiến để chốt lời nhanh gọn và an toàn vốn."
    },
    {
        "badge": "Màn Hình Chính • Bước 10 / 22",
        "title": "10. Chọn Cặp Coin & Khung Nến Giao Dịch",
        "content": "• Cột Cặp Coin: Tích chọn các đồng coin bạn muốn bot theo dõi (XAU, BTC, ETH, SOL...).\n• Cột Khung Trade: Tích chọn các khung nến (M5, M15, M30, H1, H2, H4) mà bot được phép rải lệnh Limit.\n• Tương tác nhanh: Nhấp vào tên coin bất kỳ trên bảng để chuyển nhanh biểu đồ TradingView sang coin đó.",
        "actionHint": "💡 Bạn có thể bật nhiều khung cùng lúc, bot sẽ phân bổ lệnh đa khung tự động."
    },
    {
        "badge": "Màn Hình Chính • Bước 11 / 22",
        "title": "11. Kích Hoạt Vận Hành Bot Tự Động",
        "content": "• Nhấn 'BẮT ĐẦU CHẠY BOT': Bot sẽ kích hoạt tiến trình quét tín hiệu thị trường và tự động vào/đóng lệnh 24/7 trên sàn hoặc Quỹ.\n• Khi cần ngưng: Nhấn 'DỪNG BOT' để hủy toàn bộ lệnh Limit đang chờ khớp và bảo toàn vị thế hiện có.\n• Hiệu ứng an toàn: Trạng thái bot được hiển thị rõ ràng với màu sắc sinh động (Xanh: Đang chạy, Đỏ/Xám: Đang dừng).",
        "actionHint": "💡 Sau khi kích hoạt, bạn có thể tắt trình duyệt; bot chạy nền ổn định trên máy chủ."
    },
    {
        "badge": "Màn Hình Chính • Bước 12 / 22",
        "title": "12. Bảng Điều Khiển Dưới & Chế Độ Chia Đôi (Split View)",
        "content": "Khu vực điều hành và giám sát chi tiết:\n• Tab Vị Thế (Positions): Xem danh sách lệnh đang mở, số dư PnL live, đòn bẩy, giá vào lệnh, giá thanh lý và nút đóng lệnh khẩn cấp.\n• Tab Nhật Ký (Logs): Giám sát toàn bộ dòng log tín hiệu, lệnh quét và phản hồi từ sàn thời gian thực.\n• Tab Biểu Đồ (Charts): Biểu đồ kỹ thuật TradingView tích hợp đa khung.\n• Nút ⮃ Chia Đôi Màn Hình (Split View): Nhấn nút này để tách Biểu Đồ lên trên và Bảng Vị Thế xuống dưới cùng lúc, tiện theo dõi trực quan không cần bấm chuyển qua lại!",
        "actionHint": "💡 Nhấn thử nút ⮃ để trải nghiệm chế độ xem kép Biểu Đồ + Vị Thế chuyên nghiệp."
    },
    {
        "badge": "Màn Hình Chính • Bước 13 / 22",
        "title": "13. Khám Phá Bảng Cài Đặt Chuyên Sâu ⚙",
        "content": "Hai nút chức năng quan trọng cạnh nhau:\n• Nút 'Hướng Dẫn' 💡: Mở lại tour hướng dẫn bất kỳ lúc nào để tra cứu cách sử dụng.\n• Nút 'Cài Đặt' ⚙: Mở Bảng Cài Đặt Chuyên Sâu để tinh chỉnh toàn bộ các tham số thuật toán: Watchlist Coin, Quản Lý Vốn, Bộ 3 DCA, Cầu Dao, Điểm Vào Lệnh, Hệ Số Đa Khung, Tab Hỗ Trợ và Đánh Giá.\n\n• Nhấn 'Tiếp theo ▶' để tự động mở Bảng Cài Đặt và cùng khám phá từng cơ chế!",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để bước vào bên trong Bảng Cài Đặt."
    },
    {
        "badge": "Cài Đặt • Bước 14 / 22",
        "title": "14. Thêm Mã Giao Dịch (Watchlist Coin)",
        "content": "Tùy biến danh mục coin giao dịch cho bot:\n• Nhấp chọn/bỏ chọn từng thẻ coin (XAU, BTC, ETH, SOL, DOGE...).\n• Thẻ coin sáng màu: Đang được bật hiển thị ra ngoài màn hình chính.\n• Khóa bảo vệ: Các coin đang có vị thế mở sẽ tự động khóa an toàn, bạn cần đóng lệnh trước khi bỏ chọn.",
        "actionHint": "💡 Bạn có thể bật bao nhiêu đồng coin tùy ý phù hợp với quy mô vốn của mình."
    },
    {
        "badge": "Cài Đặt • Bước 15 / 22",
        "title": "15. Tài Khoản & Quản Lý Vốn Chuyên Sâu",
        "content": "Thiết lập tài khoản và tỷ lệ phân bổ vốn chuyên sâu cho bot đang chọn:\n• Chọn tài khoản: Gán bot với tài khoản OKX hoặc Quỹ tương ứng.\n• Ký quỹ mỗi lệnh: Nhập số tiền cố định ($) hoặc % vốn tài khoản.\n• Đơn vị & Nhân TF: Chọn 'Cố định' hoặc 'Nhân TF' để khối lượng tự động co giãn theo khung thời gian.\n• Đòn bẩy (Leverage): Cài đặt mức đòn bẩy an toàn cho vị thế.",
        "actionHint": "💡 Khi bot đang chạy, các mục tài khoản và ký quỹ sẽ tự động khóa 🔒 để bảo vệ các lệnh đang hoạt động."
    },
    {
        "badge": "Cài Đặt • Bước 16 / 22",
        "title": "16. Công Tắc Chiến Thuật (Bộ 3 DCA Nâng Cao)",
        "content": "Hệ thống hỗ trợ 3 cơ chế xử lý lệnh nâng cao:\n• Pyramid DCA (DCA Dương): Nhồi thêm lệnh khi vị thế đang có lãi theo bậc thang xu hướng (H4 -> M5).\n• Negative DCA (DCA Âm): Trung bình giá khi gồng lỗ và tự động nâng cấp biên độ TP/SL theo khung lớn.\n• Multi-TF Split Grid: Chia lệnh Limit độc lập cho từng khung thời gian, khớp khung nào chốt lời riêng khung đó.\n\n💡 Lưu ý: Hệ thống chỉ cho phép kích hoạt 1 trong 3 cơ chế (bật chế độ này thì 2 chế độ còn lại tự động tắt).",
        "actionHint": "💡 Người mới khuyên dùng Multi-TF Split Grid hoặc Pyramid DCA để đảm bảo an toàn vốn tối đa."
    },
    {
        "badge": "Cài Đặt • Bước 17 / 22",
        "title": "17. Cầu Dao Bảo Vệ Vốn & Đồng Pha BTC",
        "content": "• Cầu Dao Đảo Chiều (Hedge Reversal): Khi giá rướn quá đà cách xa EMA200 H4 (> 8%), bot tự động khóa không rải thêm Limit thuận trend để tránh đu đỉnh/bắt đáy, đồng thời mở lệnh phòng hộ bắt sóng hồi.\n• Đồng Pha BTC: Ép Altcoin (ETH, SOL...) chỉ được tìm điểm vào lệnh cùng hướng với xu hướng của BTC (Đầu tàu thị trường).",
        "actionHint": "💡 Khuyến nghị: Luôn BẬT Cầu Dao để tài khoản được bảo vệ tự động 24/7 trước các đợt biến động mạnh."
    },
    {
        "badge": "Cài Đặt • Bước 18 / 22",
        "title": "18. Điểm Vào Lệnh (Entry Setup) & 60 Nến Tích Lũy",
        "content": "Cơ chế tính toán điểm vào lệnh an toàn:\n• Độ Lệch Đệm (Base Offset %): Đặt Limit đón sớm trước khi giá chạm đúng vạch EMA200 (mặc định 0.05% ở M5), giúp lệnh dễ khớp trước khi thị trường kịp phản ứng bật cản. Khung càng lớn tự động nhân theo Hệ số Vào Lệnh (ví dụ H4 x6.8 -> đệm 0.34%).\n• Khoảng Cách An Toàn (Base Gap %): Cách biệt tối thiểu giữa 2 đường EMA liền kề để tránh rải lệnh quá dày rủi ro.\n• Nến Tích Lũy (Accum Candles): Mặc định 60 nến đóng cửa liên tục nằm cùng 1 phía EMA200 mới mở lệnh, xác nhận xu hướng vững chắc, loại bỏ hoàn toàn bẫy sideway.",
        "actionHint": "💡 Cài đặt mặc định của Admin đã được kiểm chứng thực chiến, người mới có thể an tâm giữ nguyên thông số chuẩn."
    },
    {
        "badge": "Cài Đặt • Bước 19 / 22",
        "title": "19. Bản Chất Hệ Số Nhân Đa Khung (TF Multipliers)",
        "content": "Bản chất tính toán của bot trên từng khung thời gian:\n• Cột Vốn (Margin Factor): Khung nến càng lớn thì khối lượng ký quỹ và biên độ TP/SL càng được tự động nhân rộng tương ứng (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) để thích ứng với biên độ sóng lớn và tối ưu lợi nhuận.\n• Cột Vào Lệnh (Entry Factor): Dùng để nhân tỷ lệ với 'Đón trước cản' (Base Offset %) và 'Khoảng cách nhồi DCA' (Base Gap %). Khung càng lớn thì vùng đệm đón cản càng rộng (M5 x1.0, H4 x6.8), lệnh không bị trượt khi nến khung lớn dao động mạnh.",
        "actionHint": "💡 Đây là công thức toán học cốt lõi giúp bot vừa bắt trọn sóng lớn khung H1/H4 vừa tối ưu an toàn vốn ở khung nhỏ M5/M15."
    },
    {
        "badge": "Cài Đặt • Bước 20 / 22",
        "title": "20. Lưu Cấu Hình & Khôi Phục Mặc Định",
        "content": "• Lưu Cài Đặt: Áp dụng toàn bộ thông số vừa thiết lập cho bot.\n• Khôi Phục Mặc Định: Trở về cấu hình an toàn gốc của Admin bất kỳ lúc nào nếu bạn thử nghiệm chưa ưng ý.",
        "actionHint": "💡 Nhấn 'Tiếp theo ▶' để cùng tìm hiểu Tab Hỗ Trợ và Tab Đánh Giá tiếp theo!"
    },
    {
        "badge": "Hỗ Trợ • Bước 21 / 22",
        "title": "21. Tab Hỗ Trợ & Quản Trị Hệ Thống",
        "content": "Nơi quản lý bản quyền và hỗ trợ kỹ thuật 24/7:\n• Điều Kiện Sử Dụng: Hướng dẫn đăng ký tài khoản sàn OKX liên kết mã giới thiệu TLS1 để mở khóa toàn bộ quyền sử dụng bot miễn phí trọn đời.\n• Kiểm Tra API & HWID: Nơi nhập API Key, Secret Key, Passphrase và lấy mã HWID máy tính để kích hoạt bot bản quyền.\n• Đổi IP Máy Chủ & Bảo Trì: Thiết lập IP Proxy tùy chọn và các công cụ Reset vốn, dọn dẹp cache nến khi cần.",
        "actionHint": "💡 Bạn có thể nhấp nút 'Sao chép' nhanh HWID hoặc mã giới thiệu để gửi cho đội ngũ hỗ trợ bất kỳ lúc nào."
    },
    {
        "badge": "Đánh Giá • Bước 22 / 22",
        "title": "22. Tab Đánh Giá & Hoàn Tất Tour!",
        "content": "• Xem Đánh Giá Cộng Đồng: Đọc các nhận xét, hình ảnh kết quả và lợi nhuận thực chiến từ các nhà giao dịch đang sử dụng hệ thống bot.\n• Gửi Đánh Giá Của Bạn: Chấm sao, đính kèm hình ảnh và chia sẻ trải nghiệm sử dụng bot của bạn với cộng đồng.",
        "actionHint": "🎉 Chúc mừng bạn đã hoàn thành tour hướng dẫn toàn diện từ A - Z! Bạn đã hiểu rõ mọi tính năng, các nút bấm mới và bản chất vận hành của bot. Nhấn 'Hoàn tất' để đóng cài đặt và bắt đầu giao dịch!"
    }
],
  en: [
    {
        "badge": "Main Screen • Step 1 / 22",
        "title": "1. Connect Exchange & Prop Firm (Connect)",
        "content": "Gateway to link your trading accounts to the bot system. Full multi-platform support:\n• OKX Exchange: 1-click Fast Connect or proactive manual API Key input.\n• International FX Prop Firms: Connect funded/evaluation accounts (E8 Markets, FTMO, Funding Pips...) via TradeLocker API protocol.\n\n• Click 'Next ▶' to open the Connect modal and explore each method in detail!",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "Connect • Step 2 / 22",
        "title": "2. Method 1: Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection officially authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX on mobile app or browser for OAuth 2.0 permission grant.\n• 100% Secure: Automatically encrypts and synchronizes API Keys into the system, no credential leakage, zero manual copy-paste errors.\n• Supports independent Sub-Account routing for each bot instance.\n• Expanding soon to Binance Connect, Bybit Connect, and Web3 Wallets.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero key typing errors."
    },
    {
        "badge": "Connect • Step 3 / 22",
        "title": "3. Method 2: Manual OKX API Key (Proactive)",
        "content": "For traders who prefer creating and managing API Keys manually on OKX:\n• Account Management: Click green (+) to add new account, select from dropdown, or click (-) to delete.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase from OKX then click 'Save Configuration'.\n\n🛡️ CRITICAL SAFETY PRINCIPLE:\n• When creating OKX API Keys, ONLY grant 'Trade' permissions.\n• NEVER grant 'Withdraw' permissions. TLS1 Bot never requests withdrawal rights, keeping your capital 100% safe.",
        "actionHint": "💡 Click 'Next ▶' to explore the new TradeLocker Prop Firm Connect feature!"
    },
    {
        "badge": "Connect • Step 4 / 22",
        "title": "4. Method 3: FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading solution for world-class Prop Firm accounts:\n• Supported Firms: E8 Markets, FTMO, The 5%ers, Funding Pips... via official TradeLocker API.\n• Safe Connection: Enter Email, Password, Server (E8, Demo, Live). Passwords are local multi-layer Fernet encrypted.\n• Prop Risk Management: Set Fund Size ($5,000, $100,000, $200,000...), risk per trade limit, daily drawdown ceiling, and daily profit cap.\n• Dynamic Lot Sizing: Automatically computes optimal lot sizes based on stop-loss distance, preventing rule violations!",
        "actionHint": "💡 Click 'Next ▶' to complete connection setup and return to the main dashboard!"
    },
    {
        "badge": "Main Screen • Step 5 / 22",
        "title": "5. Select Trading Platform (OKX / FX Prop)",
        "content": "Quick platform switcher directly on the left sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap) on OKX.\n• FX Prop Firm: Trade international funded accounts (Gold XAU, Forex, Crypto) via TradeLocker.\n• Auto Sync: Switching platforms instantly updates account lists and pair selectors accordingly.\n• Safety Lock 🔒: While bot is running, this dropdown is locked to protect active orders.",
        "actionHint": "💡 Seamlessly switch between personal crypto accounts and prop firm challenges in 1 click."
    },
    {
        "badge": "Main Screen • Step 6 / 22",
        "title": "6. Select Bot Strategy (Command Capsule)",
        "content": "The system features 3 built-in quantitative algorithms with intuitive visual badges:\n• EMA200 Bot: Captures multi-timeframe trend pullbacks at dynamic EMA200 levels.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\n• Click this Capsule button to toggle between bot algorithms.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "Main Screen • Step 7 / 22",
        "title": "7. Select Account & Live Balance Tracking",
        "content": "Assign the trading account for the currently active bot:\n• Full Support: OKX Sub-Accounts and FX Prop Accounts (E8 Demo, E8 Live).\n• Live Balance Display: Accurately reflects live account equity ($5,000, $200,000...) for real-time risk supervision.\n• Protective Lock 🔒: While the bot is running, account selection locks automatically to prevent position conflicts.",
        "actionHint": "💡 Right-aligned layout ensures full account balances are clearly visible without clipping."
    },
    {
        "badge": "Main Screen • Step 8 / 22",
        "title": "8. Capital, Margin Management & Safety Lock 🔒",
        "content": "• Units: Fixed USDT ($) or % of Account Equity.\n• TF Multiplier: Select 'Fixed' for uniform margin across timeframes, or 'Multiply TF' to scale size with larger candles (H1 x2.0, H4 x5.0).\n\n🔒 FOOLPROOF SAFETY LOCK:\n• Once you click 'START BOT', the margin input is LOCKED 🔒, preventing unintended margin jumps or accidental clicks.\n• To adjust capital, simply click 'STOP BOT', edit values, and restart.",
        "actionHint": "💡 Beginner tip: Start with small margin ($1 - $5) to observe live execution first."
    },
    {
        "badge": "Main Screen • Step 9 / 22",
        "title": "9. Take Profit (TP) & Stop Loss (SL) M5 0.6% Standard",
        "content": "Safety bracket ratios. TP/SL configured here represents the M5 BASE level (optimized default: 0.6% TP & 0.6% SL). Higher timeframes scale automatically via Margin Factor:\n\n📊 MULTI-TF TP/SL MULTIPLIER TABLE (M5 0.6% Base):\n• M5 : x1.0 ➔ TP 0.60% | SL 0.60% (Base TF)\n• M15: x1.2 ➔ TP 0.72% | SL 0.72%\n• M30: x1.5 ➔ TP 0.90% | SL 0.90%\n• H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n• H2 : x3.0 ➔ TP 1.80% | SL 1.80%\n• H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n\n🔍 Core principle: Larger candles experience wider swings. Auto-scaling lets positions ride major trends without premature stop-outs.\n🛡️ 15s Watchdog daemon continuously scans and attaches TP/SL brackets 24/7.",
        "actionHint": "💡 0.6% base ratio is battle-tested for rapid profit-taking and minimal drawdown."
    },
    {
        "badge": "Main Screen • Step 10 / 22",
        "title": "10. Select Trading Pairs & Timeframes",
        "content": "• Pairs Column: Check symbols you want the bot to scan (XAU, BTC, ETH, SOL...).\n• Trade TF Column: Check timeframes (M5 to H4) where the bot is authorized to place Limit orders.\n• Quick Navigation: Click any pair name to instantly focus the TradingView chart on that symbol.",
        "actionHint": "💡 Enable multiple timeframes simultaneously for automated multi-horizon diversification."
    },
    {
        "badge": "Main Screen • Step 11 / 22",
        "title": "11. Activate Automated Bot Engine",
        "content": "• Click 'START BOT': Launches background scanner engine to place/manage orders 24/7 on OKX or Prop Firm.\n• To Pause: Click 'STOP BOT' to cancel open limit orders and protect existing inventory.\n• Visual Status: Dynamic badge indicators (Green: Running, Red/Grey: Stopped).",
        "actionHint": "💡 You can safely close your browser; the bot executes persistently on the backend daemon."
    },
    {
        "badge": "Main Screen • Step 12 / 22",
        "title": "12. Bottom Command Pane & Split View (⮃)",
        "content": "Comprehensive monitoring hub:\n• Positions Tab: Open positions, live PnL, leverage, entry price, liquidation risk, and emergency panic-close buttons.\n• Logs Tab: Real-time stream of engine scans, algorithmic triggers, and broker responses.\n• Charts Tab: Multi-frame TradingView technical charts.\n• ⮃ Split View Button: Click to decouple Charts on top and Positions below simultaneously, providing complete situational awareness!",
        "actionHint": "💡 Try the ⮃ Split View button to unlock a professional dual-pane dashboard."
    },
    {
        "badge": "Main Screen • Step 13 / 22",
        "title": "13. Explore Advanced System Settings ⚙",
        "content": "Two key utility controls side by side:\n• 'Guide' Button 💡: Re-open this guided onboarding tour anytime.\n• 'Settings' Button ⚙: Opens Deep Configuration Panel for algorithmic tuning: Watchlist, Capital Management, DCA Trio, Circuit Breaker, Entry Triggers, Multi-TF Multipliers, Support & Reviews.\n\n• Click 'Next ▶' to open the Settings panel and step through each mechanism!",
        "actionHint": "💡 Click 'Next ▶' to enter the Advanced Settings modal."
    },
    {
        "badge": "Settings • Step 14 / 22",
        "title": "14. Coin Watchlist Configuration",
        "content": "Customize trading universe for your bot:\n• Toggle coin tags (XAU, BTC, ETH, SOL, DOGE...).\n• Highlighted badges indicate coins active on the main dashboard.\n• Safety Lock: Coins with currently open positions are automatically locked from deselecting.",
        "actionHint": "💡 Activate as many coins as appropriate for your capital capacity."
    },
    {
        "badge": "Settings • Step 15 / 22",
        "title": "15. Account & Capital Allocation",
        "content": "Configure account assignment and granular risk sizing for the active bot:\n• Select Account: Bind bot to corresponding OKX or Prop account.\n• Per-order Margin: Enter fixed USDT ($) or % of equity.\n• Multiplier Mode: Toggle between Fixed or Multiplied margin scaling.\n• Leverage: Set safe leverage ratio for the position.",
        "actionHint": "💡 While running, account and margin fields are locked 🔒 to protect active orders."
    },
    {
        "badge": "Settings • Step 16 / 22",
        "title": "16. Strategy Switches (DCA Trio)",
        "content": "The system provides 3 specialized order scaling algorithms:\n• Pyramid DCA (Positive DCA): Scales up positions as profit grows along trend stairs (H4 -> M5).\n• Negative DCA (Averaging Down): Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Multi-TF Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 of the 3 modes can be active at a time (enabling one automatically disables the others).",
        "actionHint": "💡 Beginners are recommended to use Multi-TF Split Grid or Pyramid DCA for maximum capital defense."
    },
    {
        "badge": "Settings • Step 17 / 22",
        "title": "17. Circuit Breaker & BTC Correlation Filter",
        "content": "• Hedge Reversal Circuit Breaker: When price overextends far from H4 EMA200 (> 8%), bot locks trend limit orders to avoid tops/bottoms, while opening hedge orders on mean-reversion waves.\n• BTC Correlation Filter: Enforces Altcoins (ETH, SOL...) to only seek entries aligned with market leader BTC trend.",
        "actionHint": "💡 Recommended: Keep Circuit Breaker ON 24/7 to protect equity against severe volatility spikes."
    },
    {
        "badge": "Settings • Step 18 / 22",
        "title": "18. Entry Setup & 60-Candle Accumulation",
        "content": "Safety criteria for limit placement:\n• Base Offset %: Places Limit orders ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds. Scales with Entry Factor on higher TFs (e.g. H4 x6.8 -> 0.34% offset).\n• Base Gap %: Minimum distance required between consecutive EMA lines to avoid dense clustering.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before placing orders, confirming steady trends and filtering sideway noise.",
        "actionHint": "💡 Admin defaults are battle-tested in live markets; beginners can safely retain standard parameters."
    },
    {
        "badge": "Settings • Step 19 / 22",
        "title": "19. Multi-TF Multiplier Architecture",
        "content": "Mathematical scaling mechanics across timeframes:\n• Margin Factor: Larger candles expand margin and TP/SL amplitudes (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) to match swing ranges and optimize profits.\n• Entry Factor: Multiplies Base Offset % and Base Gap %. Higher TFs get wider buffering zones (M5 x1.0, H4 x6.8) preventing order slippage during large candle fluctuations.",
        "actionHint": "💡 Core mathematical model enabling the bot to ride massive H1/H4 waves while keeping capital safe on M5/M15."
    },
    {
        "badge": "Settings • Step 20 / 22",
        "title": "20. Save Configuration & Reset Defaults",
        "content": "• Save Strategy: Immediately writes all modified parameters into the bot configuration.\n• Reset to Default: Revert to Admin battle-tested baseline settings anytime if experiments prove unsatisfactory.",
        "actionHint": "💡 Click 'Next ▶' to inspect the Support and Community Reviews tabs next!"
    },
    {
        "badge": "Support • Step 21 / 22",
        "title": "21. Support & System Administration Tab",
        "content": "License management and 24/7 technical assistance:\n• Terms of Service: Guide to registering OKX account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify API Key connectivity and retrieve PC HWID for license activation.\n• Proxy & Maintenance: Optional Proxy IP setup, capital reset tools, and candle cache cleaners.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team anytime."
    },
    {
        "badge": "Reviews • Step 22 / 22",
        "title": "22. Community Reviews & Tour Complete!",
        "content": "• View Community Reviews: Browse verified feedback, profit screenshots, and live trading results from fellow traders.\n• Submit Your Review: Rate stars, attach trade snapshots, and share your experience with the community.",
        "actionHint": "🎉 Congratulations on completing the full A-Z onboarding tour! You now master all features and inner logic of the bot. Click 'Finish' to close and begin trading!"
    }
],
  zh: [
    {
        "badge": "系统向导 • 第 1 / 22 步",
        "title": "1. Connect Exchange & Prop Firm (Connect)",
        "content": "Gateway to link your trading accounts to the bot system. Full multi-platform support:\n• OKX Exchange: 1-click Fast Connect or proactive manual API Key input.\n• International FX Prop Firms: Connect funded/evaluation accounts (E8 Markets, FTMO, Funding Pips...) via TradeLocker API protocol.\n\n• Click 'Next ▶' to open the Connect modal and explore each method in detail!",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "系统向导 • 第 2 / 22 步",
        "title": "2. Method 1: Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection officially authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX on mobile app or browser for OAuth 2.0 permission grant.\n• 100% Secure: Automatically encrypts and synchronizes API Keys into the system, no credential leakage, zero manual copy-paste errors.\n• Supports independent Sub-Account routing for each bot instance.\n• Expanding soon to Binance Connect, Bybit Connect, and Web3 Wallets.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero key typing errors."
    },
    {
        "badge": "系统向导 • 第 3 / 22 步",
        "title": "3. Method 2: Manual OKX API Key (Proactive)",
        "content": "For traders who prefer creating and managing API Keys manually on OKX:\n• Account Management: Click green (+) to add new account, select from dropdown, or click (-) to delete.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase from OKX then click 'Save Configuration'.\n\n🛡️ CRITICAL SAFETY PRINCIPLE:\n• When creating OKX API Keys, ONLY grant 'Trade' permissions.\n• NEVER grant 'Withdraw' permissions. TLS1 Bot never requests withdrawal rights, keeping your capital 100% safe.",
        "actionHint": "💡 Click 'Next ▶' to explore the new TradeLocker Prop Firm Connect feature!"
    },
    {
        "badge": "系统向导 • 第 4 / 22 步",
        "title": "4. Method 3: FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading solution for world-class Prop Firm accounts:\n• Supported Firms: E8 Markets, FTMO, The 5%ers, Funding Pips... via official TradeLocker API.\n• Safe Connection: Enter Email, Password, Server (E8, Demo, Live). Passwords are local multi-layer Fernet encrypted.\n• Prop Risk Management: Set Fund Size ($5,000, $100,000, $200,000...), risk per trade limit, daily drawdown ceiling, and daily profit cap.\n• Dynamic Lot Sizing: Automatically computes optimal lot sizes based on stop-loss distance, preventing rule violations!",
        "actionHint": "💡 Click 'Next ▶' to complete connection setup and return to the main dashboard!"
    },
    {
        "badge": "系统向导 • 第 5 / 22 步",
        "title": "5. Select Trading Platform (OKX / FX Prop)",
        "content": "Quick platform switcher directly on the left sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap) on OKX.\n• FX Prop Firm: Trade international funded accounts (Gold XAU, Forex, Crypto) via TradeLocker.\n• Auto Sync: Switching platforms instantly updates account lists and pair selectors accordingly.\n• Safety Lock 🔒: While bot is running, this dropdown is locked to protect active orders.",
        "actionHint": "💡 Seamlessly switch between personal crypto accounts and prop firm challenges in 1 click."
    },
    {
        "badge": "系统向导 • 第 6 / 22 步",
        "title": "6. Select Bot Strategy (Command Capsule)",
        "content": "The system features 3 built-in quantitative algorithms with intuitive visual badges:\n• EMA200 Bot: Captures multi-timeframe trend pullbacks at dynamic EMA200 levels.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\n• Click this Capsule button to toggle between bot algorithms.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "系统向导 • 第 7 / 22 步",
        "title": "7. Select Account & Live Balance Tracking",
        "content": "Assign the trading account for the currently active bot:\n• Full Support: OKX Sub-Accounts and FX Prop Accounts (E8 Demo, E8 Live).\n• Live Balance Display: Accurately reflects live account equity ($5,000, $200,000...) for real-time risk supervision.\n• Protective Lock 🔒: While the bot is running, account selection locks automatically to prevent position conflicts.",
        "actionHint": "💡 Right-aligned layout ensures full account balances are clearly visible without clipping."
    },
    {
        "badge": "系统向导 • 第 8 / 22 步",
        "title": "8. Capital, Margin Management & Safety Lock 🔒",
        "content": "• Units: Fixed USDT ($) or % of Account Equity.\n• TF Multiplier: Select 'Fixed' for uniform margin across timeframes, or 'Multiply TF' to scale size with larger candles (H1 x2.0, H4 x5.0).\n\n🔒 FOOLPROOF SAFETY LOCK:\n• Once you click 'START BOT', the margin input is LOCKED 🔒, preventing unintended margin jumps or accidental clicks.\n• To adjust capital, simply click 'STOP BOT', edit values, and restart.",
        "actionHint": "💡 Beginner tip: Start with small margin ($1 - $5) to observe live execution first."
    },
    {
        "badge": "系统向导 • 第 9 / 22 步",
        "title": "9. Take Profit (TP) & Stop Loss (SL) M5 0.6% Standard",
        "content": "Safety bracket ratios. TP/SL configured here represents the M5 BASE level (optimized default: 0.6% TP & 0.6% SL). Higher timeframes scale automatically via Margin Factor:\n\n📊 MULTI-TF TP/SL MULTIPLIER TABLE (M5 0.6% Base):\n• M5 : x1.0 ➔ TP 0.60% | SL 0.60% (Base TF)\n• M15: x1.2 ➔ TP 0.72% | SL 0.72%\n• M30: x1.5 ➔ TP 0.90% | SL 0.90%\n• H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n• H2 : x3.0 ➔ TP 1.80% | SL 1.80%\n• H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n\n🔍 Core principle: Larger candles experience wider swings. Auto-scaling lets positions ride major trends without premature stop-outs.\n🛡️ 15s Watchdog daemon continuously scans and attaches TP/SL brackets 24/7.",
        "actionHint": "💡 0.6% base ratio is battle-tested for rapid profit-taking and minimal drawdown."
    },
    {
        "badge": "系统向导 • 第 10 / 22 步",
        "title": "10. Select Trading Pairs & Timeframes",
        "content": "• Pairs Column: Check symbols you want the bot to scan (XAU, BTC, ETH, SOL...).\n• Trade TF Column: Check timeframes (M5 to H4) where the bot is authorized to place Limit orders.\n• Quick Navigation: Click any pair name to instantly focus the TradingView chart on that symbol.",
        "actionHint": "💡 Enable multiple timeframes simultaneously for automated multi-horizon diversification."
    },
    {
        "badge": "系统向导 • 第 11 / 22 步",
        "title": "11. Activate Automated Bot Engine",
        "content": "• Click 'START BOT': Launches background scanner engine to place/manage orders 24/7 on OKX or Prop Firm.\n• To Pause: Click 'STOP BOT' to cancel open limit orders and protect existing inventory.\n• Visual Status: Dynamic badge indicators (Green: Running, Red/Grey: Stopped).",
        "actionHint": "💡 You can safely close your browser; the bot executes persistently on the backend daemon."
    },
    {
        "badge": "系统向导 • 第 12 / 22 步",
        "title": "12. Bottom Command Pane & Split View (⮃)",
        "content": "Comprehensive monitoring hub:\n• Positions Tab: Open positions, live PnL, leverage, entry price, liquidation risk, and emergency panic-close buttons.\n• Logs Tab: Real-time stream of engine scans, algorithmic triggers, and broker responses.\n• Charts Tab: Multi-frame TradingView technical charts.\n• ⮃ Split View Button: Click to decouple Charts on top and Positions below simultaneously, providing complete situational awareness!",
        "actionHint": "💡 Try the ⮃ Split View button to unlock a professional dual-pane dashboard."
    },
    {
        "badge": "系统向导 • 第 13 / 22 步",
        "title": "13. Explore Advanced System Settings ⚙",
        "content": "Two key utility controls side by side:\n• 'Guide' Button 💡: Re-open this guided onboarding tour anytime.\n• 'Settings' Button ⚙: Opens Deep Configuration Panel for algorithmic tuning: Watchlist, Capital Management, DCA Trio, Circuit Breaker, Entry Triggers, Multi-TF Multipliers, Support & Reviews.\n\n• Click 'Next ▶' to open the Settings panel and step through each mechanism!",
        "actionHint": "💡 Click 'Next ▶' to enter the Advanced Settings modal."
    },
    {
        "badge": "系统向导 • 第 14 / 22 步",
        "title": "14. Coin Watchlist Configuration",
        "content": "Customize trading universe for your bot:\n• Toggle coin tags (XAU, BTC, ETH, SOL, DOGE...).\n• Highlighted badges indicate coins active on the main dashboard.\n• Safety Lock: Coins with currently open positions are automatically locked from deselecting.",
        "actionHint": "💡 Activate as many coins as appropriate for your capital capacity."
    },
    {
        "badge": "系统向导 • 第 15 / 22 步",
        "title": "15. Account & Capital Allocation",
        "content": "Configure account assignment and granular risk sizing for the active bot:\n• Select Account: Bind bot to corresponding OKX or Prop account.\n• Per-order Margin: Enter fixed USDT ($) or % of equity.\n• Multiplier Mode: Toggle between Fixed or Multiplied margin scaling.\n• Leverage: Set safe leverage ratio for the position.",
        "actionHint": "💡 While running, account and margin fields are locked 🔒 to protect active orders."
    },
    {
        "badge": "系统向导 • 第 16 / 22 步",
        "title": "16. Strategy Switches (DCA Trio)",
        "content": "The system provides 3 specialized order scaling algorithms:\n• Pyramid DCA (Positive DCA): Scales up positions as profit grows along trend stairs (H4 -> M5).\n• Negative DCA (Averaging Down): Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Multi-TF Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 of the 3 modes can be active at a time (enabling one automatically disables the others).",
        "actionHint": "💡 Beginners are recommended to use Multi-TF Split Grid or Pyramid DCA for maximum capital defense."
    },
    {
        "badge": "系统向导 • 第 17 / 22 步",
        "title": "17. Circuit Breaker & BTC Correlation Filter",
        "content": "• Hedge Reversal Circuit Breaker: When price overextends far from H4 EMA200 (> 8%), bot locks trend limit orders to avoid tops/bottoms, while opening hedge orders on mean-reversion waves.\n• BTC Correlation Filter: Enforces Altcoins (ETH, SOL...) to only seek entries aligned with market leader BTC trend.",
        "actionHint": "💡 Recommended: Keep Circuit Breaker ON 24/7 to protect equity against severe volatility spikes."
    },
    {
        "badge": "系统向导 • 第 18 / 22 步",
        "title": "18. Entry Setup & 60-Candle Accumulation",
        "content": "Safety criteria for limit placement:\n• Base Offset %: Places Limit orders ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds. Scales with Entry Factor on higher TFs (e.g. H4 x6.8 -> 0.34% offset).\n• Base Gap %: Minimum distance required between consecutive EMA lines to avoid dense clustering.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before placing orders, confirming steady trends and filtering sideway noise.",
        "actionHint": "💡 Admin defaults are battle-tested in live markets; beginners can safely retain standard parameters."
    },
    {
        "badge": "系统向导 • 第 19 / 22 步",
        "title": "19. Multi-TF Multiplier Architecture",
        "content": "Mathematical scaling mechanics across timeframes:\n• Margin Factor: Larger candles expand margin and TP/SL amplitudes (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) to match swing ranges and optimize profits.\n• Entry Factor: Multiplies Base Offset % and Base Gap %. Higher TFs get wider buffering zones (M5 x1.0, H4 x6.8) preventing order slippage during large candle fluctuations.",
        "actionHint": "💡 Core mathematical model enabling the bot to ride massive H1/H4 waves while keeping capital safe on M5/M15."
    },
    {
        "badge": "系统向导 • 第 20 / 22 步",
        "title": "20. Save Configuration & Reset Defaults",
        "content": "• Save Strategy: Immediately writes all modified parameters into the bot configuration.\n• Reset to Default: Revert to Admin battle-tested baseline settings anytime if experiments prove unsatisfactory.",
        "actionHint": "💡 Click 'Next ▶' to inspect the Support and Community Reviews tabs next!"
    },
    {
        "badge": "系统向导 • 第 21 / 22 步",
        "title": "21. Support & System Administration Tab",
        "content": "License management and 24/7 technical assistance:\n• Terms of Service: Guide to registering OKX account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify API Key connectivity and retrieve PC HWID for license activation.\n• Proxy & Maintenance: Optional Proxy IP setup, capital reset tools, and candle cache cleaners.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team anytime."
    },
    {
        "badge": "系统向导 • 第 22 / 22 步",
        "title": "22. Community Reviews & Tour Complete!",
        "content": "• View Community Reviews: Browse verified feedback, profit screenshots, and live trading results from fellow traders.\n• Submit Your Review: Rate stars, attach trade snapshots, and share your experience with the community.",
        "actionHint": "🎉 Congratulations on completing the full A-Z onboarding tour! You now master all features and inner logic of the bot. Click 'Finish' to close and begin trading!"
    }
],
  ko: [
    {
        "badge": "온보딩 투어 • 1 / 22 단계",
        "title": "1. Connect Exchange & Prop Firm (Connect)",
        "content": "Gateway to link your trading accounts to the bot system. Full multi-platform support:\n• OKX Exchange: 1-click Fast Connect or proactive manual API Key input.\n• International FX Prop Firms: Connect funded/evaluation accounts (E8 Markets, FTMO, Funding Pips...) via TradeLocker API protocol.\n\n• Click 'Next ▶' to open the Connect modal and explore each method in detail!",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "온보딩 투어 • 2 / 22 단계",
        "title": "2. Method 1: Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection officially authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX on mobile app or browser for OAuth 2.0 permission grant.\n• 100% Secure: Automatically encrypts and synchronizes API Keys into the system, no credential leakage, zero manual copy-paste errors.\n• Supports independent Sub-Account routing for each bot instance.\n• Expanding soon to Binance Connect, Bybit Connect, and Web3 Wallets.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero key typing errors."
    },
    {
        "badge": "온보딩 투어 • 3 / 22 단계",
        "title": "3. Method 2: Manual OKX API Key (Proactive)",
        "content": "For traders who prefer creating and managing API Keys manually on OKX:\n• Account Management: Click green (+) to add new account, select from dropdown, or click (-) to delete.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase from OKX then click 'Save Configuration'.\n\n🛡️ CRITICAL SAFETY PRINCIPLE:\n• When creating OKX API Keys, ONLY grant 'Trade' permissions.\n• NEVER grant 'Withdraw' permissions. TLS1 Bot never requests withdrawal rights, keeping your capital 100% safe.",
        "actionHint": "💡 Click 'Next ▶' to explore the new TradeLocker Prop Firm Connect feature!"
    },
    {
        "badge": "온보딩 투어 • 4 / 22 단계",
        "title": "4. Method 3: FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading solution for world-class Prop Firm accounts:\n• Supported Firms: E8 Markets, FTMO, The 5%ers, Funding Pips... via official TradeLocker API.\n• Safe Connection: Enter Email, Password, Server (E8, Demo, Live). Passwords are local multi-layer Fernet encrypted.\n• Prop Risk Management: Set Fund Size ($5,000, $100,000, $200,000...), risk per trade limit, daily drawdown ceiling, and daily profit cap.\n• Dynamic Lot Sizing: Automatically computes optimal lot sizes based on stop-loss distance, preventing rule violations!",
        "actionHint": "💡 Click 'Next ▶' to complete connection setup and return to the main dashboard!"
    },
    {
        "badge": "온보딩 투어 • 5 / 22 단계",
        "title": "5. Select Trading Platform (OKX / FX Prop)",
        "content": "Quick platform switcher directly on the left sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap) on OKX.\n• FX Prop Firm: Trade international funded accounts (Gold XAU, Forex, Crypto) via TradeLocker.\n• Auto Sync: Switching platforms instantly updates account lists and pair selectors accordingly.\n• Safety Lock 🔒: While bot is running, this dropdown is locked to protect active orders.",
        "actionHint": "💡 Seamlessly switch between personal crypto accounts and prop firm challenges in 1 click."
    },
    {
        "badge": "온보딩 투어 • 6 / 22 단계",
        "title": "6. Select Bot Strategy (Command Capsule)",
        "content": "The system features 3 built-in quantitative algorithms with intuitive visual badges:\n• EMA200 Bot: Captures multi-timeframe trend pullbacks at dynamic EMA200 levels.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\n• Click this Capsule button to toggle between bot algorithms.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "온보딩 투어 • 7 / 22 단계",
        "title": "7. Select Account & Live Balance Tracking",
        "content": "Assign the trading account for the currently active bot:\n• Full Support: OKX Sub-Accounts and FX Prop Accounts (E8 Demo, E8 Live).\n• Live Balance Display: Accurately reflects live account equity ($5,000, $200,000...) for real-time risk supervision.\n• Protective Lock 🔒: While the bot is running, account selection locks automatically to prevent position conflicts.",
        "actionHint": "💡 Right-aligned layout ensures full account balances are clearly visible without clipping."
    },
    {
        "badge": "온보딩 투어 • 8 / 22 단계",
        "title": "8. Capital, Margin Management & Safety Lock 🔒",
        "content": "• Units: Fixed USDT ($) or % of Account Equity.\n• TF Multiplier: Select 'Fixed' for uniform margin across timeframes, or 'Multiply TF' to scale size with larger candles (H1 x2.0, H4 x5.0).\n\n🔒 FOOLPROOF SAFETY LOCK:\n• Once you click 'START BOT', the margin input is LOCKED 🔒, preventing unintended margin jumps or accidental clicks.\n• To adjust capital, simply click 'STOP BOT', edit values, and restart.",
        "actionHint": "💡 Beginner tip: Start with small margin ($1 - $5) to observe live execution first."
    },
    {
        "badge": "온보딩 투어 • 9 / 22 단계",
        "title": "9. Take Profit (TP) & Stop Loss (SL) M5 0.6% Standard",
        "content": "Safety bracket ratios. TP/SL configured here represents the M5 BASE level (optimized default: 0.6% TP & 0.6% SL). Higher timeframes scale automatically via Margin Factor:\n\n📊 MULTI-TF TP/SL MULTIPLIER TABLE (M5 0.6% Base):\n• M5 : x1.0 ➔ TP 0.60% | SL 0.60% (Base TF)\n• M15: x1.2 ➔ TP 0.72% | SL 0.72%\n• M30: x1.5 ➔ TP 0.90% | SL 0.90%\n• H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n• H2 : x3.0 ➔ TP 1.80% | SL 1.80%\n• H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n\n🔍 Core principle: Larger candles experience wider swings. Auto-scaling lets positions ride major trends without premature stop-outs.\n🛡️ 15s Watchdog daemon continuously scans and attaches TP/SL brackets 24/7.",
        "actionHint": "💡 0.6% base ratio is battle-tested for rapid profit-taking and minimal drawdown."
    },
    {
        "badge": "온보딩 투어 • 10 / 22 단계",
        "title": "10. Select Trading Pairs & Timeframes",
        "content": "• Pairs Column: Check symbols you want the bot to scan (XAU, BTC, ETH, SOL...).\n• Trade TF Column: Check timeframes (M5 to H4) where the bot is authorized to place Limit orders.\n• Quick Navigation: Click any pair name to instantly focus the TradingView chart on that symbol.",
        "actionHint": "💡 Enable multiple timeframes simultaneously for automated multi-horizon diversification."
    },
    {
        "badge": "온보딩 투어 • 11 / 22 단계",
        "title": "11. Activate Automated Bot Engine",
        "content": "• Click 'START BOT': Launches background scanner engine to place/manage orders 24/7 on OKX or Prop Firm.\n• To Pause: Click 'STOP BOT' to cancel open limit orders and protect existing inventory.\n• Visual Status: Dynamic badge indicators (Green: Running, Red/Grey: Stopped).",
        "actionHint": "💡 You can safely close your browser; the bot executes persistently on the backend daemon."
    },
    {
        "badge": "온보딩 투어 • 12 / 22 단계",
        "title": "12. Bottom Command Pane & Split View (⮃)",
        "content": "Comprehensive monitoring hub:\n• Positions Tab: Open positions, live PnL, leverage, entry price, liquidation risk, and emergency panic-close buttons.\n• Logs Tab: Real-time stream of engine scans, algorithmic triggers, and broker responses.\n• Charts Tab: Multi-frame TradingView technical charts.\n• ⮃ Split View Button: Click to decouple Charts on top and Positions below simultaneously, providing complete situational awareness!",
        "actionHint": "💡 Try the ⮃ Split View button to unlock a professional dual-pane dashboard."
    },
    {
        "badge": "온보딩 투어 • 13 / 22 단계",
        "title": "13. Explore Advanced System Settings ⚙",
        "content": "Two key utility controls side by side:\n• 'Guide' Button 💡: Re-open this guided onboarding tour anytime.\n• 'Settings' Button ⚙: Opens Deep Configuration Panel for algorithmic tuning: Watchlist, Capital Management, DCA Trio, Circuit Breaker, Entry Triggers, Multi-TF Multipliers, Support & Reviews.\n\n• Click 'Next ▶' to open the Settings panel and step through each mechanism!",
        "actionHint": "💡 Click 'Next ▶' to enter the Advanced Settings modal."
    },
    {
        "badge": "온보딩 투어 • 14 / 22 단계",
        "title": "14. Coin Watchlist Configuration",
        "content": "Customize trading universe for your bot:\n• Toggle coin tags (XAU, BTC, ETH, SOL, DOGE...).\n• Highlighted badges indicate coins active on the main dashboard.\n• Safety Lock: Coins with currently open positions are automatically locked from deselecting.",
        "actionHint": "💡 Activate as many coins as appropriate for your capital capacity."
    },
    {
        "badge": "온보딩 투어 • 15 / 22 단계",
        "title": "15. Account & Capital Allocation",
        "content": "Configure account assignment and granular risk sizing for the active bot:\n• Select Account: Bind bot to corresponding OKX or Prop account.\n• Per-order Margin: Enter fixed USDT ($) or % of equity.\n• Multiplier Mode: Toggle between Fixed or Multiplied margin scaling.\n• Leverage: Set safe leverage ratio for the position.",
        "actionHint": "💡 While running, account and margin fields are locked 🔒 to protect active orders."
    },
    {
        "badge": "온보딩 투어 • 16 / 22 단계",
        "title": "16. Strategy Switches (DCA Trio)",
        "content": "The system provides 3 specialized order scaling algorithms:\n• Pyramid DCA (Positive DCA): Scales up positions as profit grows along trend stairs (H4 -> M5).\n• Negative DCA (Averaging Down): Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Multi-TF Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 of the 3 modes can be active at a time (enabling one automatically disables the others).",
        "actionHint": "💡 Beginners are recommended to use Multi-TF Split Grid or Pyramid DCA for maximum capital defense."
    },
    {
        "badge": "온보딩 투어 • 17 / 22 단계",
        "title": "17. Circuit Breaker & BTC Correlation Filter",
        "content": "• Hedge Reversal Circuit Breaker: When price overextends far from H4 EMA200 (> 8%), bot locks trend limit orders to avoid tops/bottoms, while opening hedge orders on mean-reversion waves.\n• BTC Correlation Filter: Enforces Altcoins (ETH, SOL...) to only seek entries aligned with market leader BTC trend.",
        "actionHint": "💡 Recommended: Keep Circuit Breaker ON 24/7 to protect equity against severe volatility spikes."
    },
    {
        "badge": "온보딩 투어 • 18 / 22 단계",
        "title": "18. Entry Setup & 60-Candle Accumulation",
        "content": "Safety criteria for limit placement:\n• Base Offset %: Places Limit orders ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds. Scales with Entry Factor on higher TFs (e.g. H4 x6.8 -> 0.34% offset).\n• Base Gap %: Minimum distance required between consecutive EMA lines to avoid dense clustering.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before placing orders, confirming steady trends and filtering sideway noise.",
        "actionHint": "💡 Admin defaults are battle-tested in live markets; beginners can safely retain standard parameters."
    },
    {
        "badge": "온보딩 투어 • 19 / 22 단계",
        "title": "19. Multi-TF Multiplier Architecture",
        "content": "Mathematical scaling mechanics across timeframes:\n• Margin Factor: Larger candles expand margin and TP/SL amplitudes (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) to match swing ranges and optimize profits.\n• Entry Factor: Multiplies Base Offset % and Base Gap %. Higher TFs get wider buffering zones (M5 x1.0, H4 x6.8) preventing order slippage during large candle fluctuations.",
        "actionHint": "💡 Core mathematical model enabling the bot to ride massive H1/H4 waves while keeping capital safe on M5/M15."
    },
    {
        "badge": "온보딩 투어 • 20 / 22 단계",
        "title": "20. Save Configuration & Reset Defaults",
        "content": "• Save Strategy: Immediately writes all modified parameters into the bot configuration.\n• Reset to Default: Revert to Admin battle-tested baseline settings anytime if experiments prove unsatisfactory.",
        "actionHint": "💡 Click 'Next ▶' to inspect the Support and Community Reviews tabs next!"
    },
    {
        "badge": "온보딩 투어 • 21 / 22 단계",
        "title": "21. Support & System Administration Tab",
        "content": "License management and 24/7 technical assistance:\n• Terms of Service: Guide to registering OKX account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify API Key connectivity and retrieve PC HWID for license activation.\n• Proxy & Maintenance: Optional Proxy IP setup, capital reset tools, and candle cache cleaners.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team anytime."
    },
    {
        "badge": "온보딩 투어 • 22 / 22 단계",
        "title": "22. Community Reviews & Tour Complete!",
        "content": "• View Community Reviews: Browse verified feedback, profit screenshots, and live trading results from fellow traders.\n• Submit Your Review: Rate stars, attach trade snapshots, and share your experience with the community.",
        "actionHint": "🎉 Congratulations on completing the full A-Z onboarding tour! You now master all features and inner logic of the bot. Click 'Finish' to close and begin trading!"
    }
],
  fr: [
    {
        "badge": "Guide Interactif • Étape 1 / 22",
        "title": "1. Connect Exchange & Prop Firm (Connect)",
        "content": "Gateway to link your trading accounts to the bot system. Full multi-platform support:\n• OKX Exchange: 1-click Fast Connect or proactive manual API Key input.\n• International FX Prop Firms: Connect funded/evaluation accounts (E8 Markets, FTMO, Funding Pips...) via TradeLocker API protocol.\n\n• Click 'Next ▶' to open the Connect modal and explore each method in detail!",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "Guide Interactif • Étape 2 / 22",
        "title": "2. Method 1: Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection officially authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX on mobile app or browser for OAuth 2.0 permission grant.\n• 100% Secure: Automatically encrypts and synchronizes API Keys into the system, no credential leakage, zero manual copy-paste errors.\n• Supports independent Sub-Account routing for each bot instance.\n• Expanding soon to Binance Connect, Bybit Connect, and Web3 Wallets.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero key typing errors."
    },
    {
        "badge": "Guide Interactif • Étape 3 / 22",
        "title": "3. Method 2: Manual OKX API Key (Proactive)",
        "content": "For traders who prefer creating and managing API Keys manually on OKX:\n• Account Management: Click green (+) to add new account, select from dropdown, or click (-) to delete.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase from OKX then click 'Save Configuration'.\n\n🛡️ CRITICAL SAFETY PRINCIPLE:\n• When creating OKX API Keys, ONLY grant 'Trade' permissions.\n• NEVER grant 'Withdraw' permissions. TLS1 Bot never requests withdrawal rights, keeping your capital 100% safe.",
        "actionHint": "💡 Click 'Next ▶' to explore the new TradeLocker Prop Firm Connect feature!"
    },
    {
        "badge": "Guide Interactif • Étape 4 / 22",
        "title": "4. Method 3: FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading solution for world-class Prop Firm accounts:\n• Supported Firms: E8 Markets, FTMO, The 5%ers, Funding Pips... via official TradeLocker API.\n• Safe Connection: Enter Email, Password, Server (E8, Demo, Live). Passwords are local multi-layer Fernet encrypted.\n• Prop Risk Management: Set Fund Size ($5,000, $100,000, $200,000...), risk per trade limit, daily drawdown ceiling, and daily profit cap.\n• Dynamic Lot Sizing: Automatically computes optimal lot sizes based on stop-loss distance, preventing rule violations!",
        "actionHint": "💡 Click 'Next ▶' to complete connection setup and return to the main dashboard!"
    },
    {
        "badge": "Guide Interactif • Étape 5 / 22",
        "title": "5. Select Trading Platform (OKX / FX Prop)",
        "content": "Quick platform switcher directly on the left sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap) on OKX.\n• FX Prop Firm: Trade international funded accounts (Gold XAU, Forex, Crypto) via TradeLocker.\n• Auto Sync: Switching platforms instantly updates account lists and pair selectors accordingly.\n• Safety Lock 🔒: While bot is running, this dropdown is locked to protect active orders.",
        "actionHint": "💡 Seamlessly switch between personal crypto accounts and prop firm challenges in 1 click."
    },
    {
        "badge": "Guide Interactif • Étape 6 / 22",
        "title": "6. Select Bot Strategy (Command Capsule)",
        "content": "The system features 3 built-in quantitative algorithms with intuitive visual badges:\n• EMA200 Bot: Captures multi-timeframe trend pullbacks at dynamic EMA200 levels.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\n• Click this Capsule button to toggle between bot algorithms.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "Guide Interactif • Étape 7 / 22",
        "title": "7. Select Account & Live Balance Tracking",
        "content": "Assign the trading account for the currently active bot:\n• Full Support: OKX Sub-Accounts and FX Prop Accounts (E8 Demo, E8 Live).\n• Live Balance Display: Accurately reflects live account equity ($5,000, $200,000...) for real-time risk supervision.\n• Protective Lock 🔒: While the bot is running, account selection locks automatically to prevent position conflicts.",
        "actionHint": "💡 Right-aligned layout ensures full account balances are clearly visible without clipping."
    },
    {
        "badge": "Guide Interactif • Étape 8 / 22",
        "title": "8. Capital, Margin Management & Safety Lock 🔒",
        "content": "• Units: Fixed USDT ($) or % of Account Equity.\n• TF Multiplier: Select 'Fixed' for uniform margin across timeframes, or 'Multiply TF' to scale size with larger candles (H1 x2.0, H4 x5.0).\n\n🔒 FOOLPROOF SAFETY LOCK:\n• Once you click 'START BOT', the margin input is LOCKED 🔒, preventing unintended margin jumps or accidental clicks.\n• To adjust capital, simply click 'STOP BOT', edit values, and restart.",
        "actionHint": "💡 Beginner tip: Start with small margin ($1 - $5) to observe live execution first."
    },
    {
        "badge": "Guide Interactif • Étape 9 / 22",
        "title": "9. Take Profit (TP) & Stop Loss (SL) M5 0.6% Standard",
        "content": "Safety bracket ratios. TP/SL configured here represents the M5 BASE level (optimized default: 0.6% TP & 0.6% SL). Higher timeframes scale automatically via Margin Factor:\n\n📊 MULTI-TF TP/SL MULTIPLIER TABLE (M5 0.6% Base):\n• M5 : x1.0 ➔ TP 0.60% | SL 0.60% (Base TF)\n• M15: x1.2 ➔ TP 0.72% | SL 0.72%\n• M30: x1.5 ➔ TP 0.90% | SL 0.90%\n• H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n• H2 : x3.0 ➔ TP 1.80% | SL 1.80%\n• H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n\n🔍 Core principle: Larger candles experience wider swings. Auto-scaling lets positions ride major trends without premature stop-outs.\n🛡️ 15s Watchdog daemon continuously scans and attaches TP/SL brackets 24/7.",
        "actionHint": "💡 0.6% base ratio is battle-tested for rapid profit-taking and minimal drawdown."
    },
    {
        "badge": "Guide Interactif • Étape 10 / 22",
        "title": "10. Select Trading Pairs & Timeframes",
        "content": "• Pairs Column: Check symbols you want the bot to scan (XAU, BTC, ETH, SOL...).\n• Trade TF Column: Check timeframes (M5 to H4) where the bot is authorized to place Limit orders.\n• Quick Navigation: Click any pair name to instantly focus the TradingView chart on that symbol.",
        "actionHint": "💡 Enable multiple timeframes simultaneously for automated multi-horizon diversification."
    },
    {
        "badge": "Guide Interactif • Étape 11 / 22",
        "title": "11. Activate Automated Bot Engine",
        "content": "• Click 'START BOT': Launches background scanner engine to place/manage orders 24/7 on OKX or Prop Firm.\n• To Pause: Click 'STOP BOT' to cancel open limit orders and protect existing inventory.\n• Visual Status: Dynamic badge indicators (Green: Running, Red/Grey: Stopped).",
        "actionHint": "💡 You can safely close your browser; the bot executes persistently on the backend daemon."
    },
    {
        "badge": "Guide Interactif • Étape 12 / 22",
        "title": "12. Bottom Command Pane & Split View (⮃)",
        "content": "Comprehensive monitoring hub:\n• Positions Tab: Open positions, live PnL, leverage, entry price, liquidation risk, and emergency panic-close buttons.\n• Logs Tab: Real-time stream of engine scans, algorithmic triggers, and broker responses.\n• Charts Tab: Multi-frame TradingView technical charts.\n• ⮃ Split View Button: Click to decouple Charts on top and Positions below simultaneously, providing complete situational awareness!",
        "actionHint": "💡 Try the ⮃ Split View button to unlock a professional dual-pane dashboard."
    },
    {
        "badge": "Guide Interactif • Étape 13 / 22",
        "title": "13. Explore Advanced System Settings ⚙",
        "content": "Two key utility controls side by side:\n• 'Guide' Button 💡: Re-open this guided onboarding tour anytime.\n• 'Settings' Button ⚙: Opens Deep Configuration Panel for algorithmic tuning: Watchlist, Capital Management, DCA Trio, Circuit Breaker, Entry Triggers, Multi-TF Multipliers, Support & Reviews.\n\n• Click 'Next ▶' to open the Settings panel and step through each mechanism!",
        "actionHint": "💡 Click 'Next ▶' to enter the Advanced Settings modal."
    },
    {
        "badge": "Guide Interactif • Étape 14 / 22",
        "title": "14. Coin Watchlist Configuration",
        "content": "Customize trading universe for your bot:\n• Toggle coin tags (XAU, BTC, ETH, SOL, DOGE...).\n• Highlighted badges indicate coins active on the main dashboard.\n• Safety Lock: Coins with currently open positions are automatically locked from deselecting.",
        "actionHint": "💡 Activate as many coins as appropriate for your capital capacity."
    },
    {
        "badge": "Guide Interactif • Étape 15 / 22",
        "title": "15. Account & Capital Allocation",
        "content": "Configure account assignment and granular risk sizing for the active bot:\n• Select Account: Bind bot to corresponding OKX or Prop account.\n• Per-order Margin: Enter fixed USDT ($) or % of equity.\n• Multiplier Mode: Toggle between Fixed or Multiplied margin scaling.\n• Leverage: Set safe leverage ratio for the position.",
        "actionHint": "💡 While running, account and margin fields are locked 🔒 to protect active orders."
    },
    {
        "badge": "Guide Interactif • Étape 16 / 22",
        "title": "16. Strategy Switches (DCA Trio)",
        "content": "The system provides 3 specialized order scaling algorithms:\n• Pyramid DCA (Positive DCA): Scales up positions as profit grows along trend stairs (H4 -> M5).\n• Negative DCA (Averaging Down): Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Multi-TF Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 of the 3 modes can be active at a time (enabling one automatically disables the others).",
        "actionHint": "💡 Beginners are recommended to use Multi-TF Split Grid or Pyramid DCA for maximum capital defense."
    },
    {
        "badge": "Guide Interactif • Étape 17 / 22",
        "title": "17. Circuit Breaker & BTC Correlation Filter",
        "content": "• Hedge Reversal Circuit Breaker: When price overextends far from H4 EMA200 (> 8%), bot locks trend limit orders to avoid tops/bottoms, while opening hedge orders on mean-reversion waves.\n• BTC Correlation Filter: Enforces Altcoins (ETH, SOL...) to only seek entries aligned with market leader BTC trend.",
        "actionHint": "💡 Recommended: Keep Circuit Breaker ON 24/7 to protect equity against severe volatility spikes."
    },
    {
        "badge": "Guide Interactif • Étape 18 / 22",
        "title": "18. Entry Setup & 60-Candle Accumulation",
        "content": "Safety criteria for limit placement:\n• Base Offset %: Places Limit orders ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds. Scales with Entry Factor on higher TFs (e.g. H4 x6.8 -> 0.34% offset).\n• Base Gap %: Minimum distance required between consecutive EMA lines to avoid dense clustering.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before placing orders, confirming steady trends and filtering sideway noise.",
        "actionHint": "💡 Admin defaults are battle-tested in live markets; beginners can safely retain standard parameters."
    },
    {
        "badge": "Guide Interactif • Étape 19 / 22",
        "title": "19. Multi-TF Multiplier Architecture",
        "content": "Mathematical scaling mechanics across timeframes:\n• Margin Factor: Larger candles expand margin and TP/SL amplitudes (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) to match swing ranges and optimize profits.\n• Entry Factor: Multiplies Base Offset % and Base Gap %. Higher TFs get wider buffering zones (M5 x1.0, H4 x6.8) preventing order slippage during large candle fluctuations.",
        "actionHint": "💡 Core mathematical model enabling the bot to ride massive H1/H4 waves while keeping capital safe on M5/M15."
    },
    {
        "badge": "Guide Interactif • Étape 20 / 22",
        "title": "20. Save Configuration & Reset Defaults",
        "content": "• Save Strategy: Immediately writes all modified parameters into the bot configuration.\n• Reset to Default: Revert to Admin battle-tested baseline settings anytime if experiments prove unsatisfactory.",
        "actionHint": "💡 Click 'Next ▶' to inspect the Support and Community Reviews tabs next!"
    },
    {
        "badge": "Guide Interactif • Étape 21 / 22",
        "title": "21. Support & System Administration Tab",
        "content": "License management and 24/7 technical assistance:\n• Terms of Service: Guide to registering OKX account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify API Key connectivity and retrieve PC HWID for license activation.\n• Proxy & Maintenance: Optional Proxy IP setup, capital reset tools, and candle cache cleaners.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team anytime."
    },
    {
        "badge": "Guide Interactif • Étape 22 / 22",
        "title": "22. Community Reviews & Tour Complete!",
        "content": "• View Community Reviews: Browse verified feedback, profit screenshots, and live trading results from fellow traders.\n• Submit Your Review: Rate stars, attach trade snapshots, and share your experience with the community.",
        "actionHint": "🎉 Congratulations on completing the full A-Z onboarding tour! You now master all features and inner logic of the bot. Click 'Finish' to close and begin trading!"
    }
],
  es: [
    {
        "badge": "Guía Interactiva • Paso 1 / 22",
        "title": "1. Connect Exchange & Prop Firm (Connect)",
        "content": "Gateway to link your trading accounts to the bot system. Full multi-platform support:\n• OKX Exchange: 1-click Fast Connect or proactive manual API Key input.\n• International FX Prop Firms: Connect funded/evaluation accounts (E8 Markets, FTMO, Funding Pips...) via TradeLocker API protocol.\n\n• Click 'Next ▶' to open the Connect modal and explore each method in detail!",
        "actionHint": "💡 Click 'Next ▶' to open the Connect popup."
    },
    {
        "badge": "Guía Interactiva • Paso 2 / 22",
        "title": "2. Method 1: Fast Connect (OAuth 2.0)",
        "content": "100% secure 1-click connection officially authorized by OKX:\n• Click 'Open App ➔': Automatically launches OKX on mobile app or browser for OAuth 2.0 permission grant.\n• 100% Secure: Automatically encrypts and synchronizes API Keys into the system, no credential leakage, zero manual copy-paste errors.\n• Supports independent Sub-Account routing for each bot instance.\n• Expanding soon to Binance Connect, Bybit Connect, and Web3 Wallets.",
        "actionHint": "💡 Recommended for beginners: connects in 3 seconds with zero key typing errors."
    },
    {
        "badge": "Guía Interactiva • Paso 3 / 22",
        "title": "3. Method 2: Manual OKX API Key (Proactive)",
        "content": "For traders who prefer creating and managing API Keys manually on OKX:\n• Account Management: Click green (+) to add new account, select from dropdown, or click (-) to delete.\n• Key Inputs: Enter API Key, Secret Key, and Passphrase from OKX then click 'Save Configuration'.\n\n🛡️ CRITICAL SAFETY PRINCIPLE:\n• When creating OKX API Keys, ONLY grant 'Trade' permissions.\n• NEVER grant 'Withdraw' permissions. TLS1 Bot never requests withdrawal rights, keeping your capital 100% safe.",
        "actionHint": "💡 Click 'Next ▶' to explore the new TradeLocker Prop Firm Connect feature!"
    },
    {
        "badge": "Guía Interactiva • Paso 4 / 22",
        "title": "4. Method 3: FX Prop Firm Connect (TradeLocker)",
        "content": "Automated trading solution for world-class Prop Firm accounts:\n• Supported Firms: E8 Markets, FTMO, The 5%ers, Funding Pips... via official TradeLocker API.\n• Safe Connection: Enter Email, Password, Server (E8, Demo, Live). Passwords are local multi-layer Fernet encrypted.\n• Prop Risk Management: Set Fund Size ($5,000, $100,000, $200,000...), risk per trade limit, daily drawdown ceiling, and daily profit cap.\n• Dynamic Lot Sizing: Automatically computes optimal lot sizes based on stop-loss distance, preventing rule violations!",
        "actionHint": "💡 Click 'Next ▶' to complete connection setup and return to the main dashboard!"
    },
    {
        "badge": "Guía Interactiva • Paso 5 / 22",
        "title": "5. Select Trading Platform (OKX / FX Prop)",
        "content": "Quick platform switcher directly on the left sidebar:\n• OKX Exchange: Trade Crypto Perpetual Futures (USDT Swap) on OKX.\n• FX Prop Firm: Trade international funded accounts (Gold XAU, Forex, Crypto) via TradeLocker.\n• Auto Sync: Switching platforms instantly updates account lists and pair selectors accordingly.\n• Safety Lock 🔒: While bot is running, this dropdown is locked to protect active orders.",
        "actionHint": "💡 Seamlessly switch between personal crypto accounts and prop firm challenges in 1 click."
    },
    {
        "badge": "Guía Interactiva • Paso 6 / 22",
        "title": "6. Select Bot Strategy (Command Capsule)",
        "content": "The system features 3 built-in quantitative algorithms with intuitive visual badges:\n• EMA200 Bot: Captures multi-timeframe trend pullbacks at dynamic EMA200 levels.\n• SMC Bot: Hunts liquidity pools & Order Block mitigation reversals.\n• Liquidation Bot: Exploits Market Maker stop hunts during high volatility.\n\n• Click this Capsule button to toggle between bot algorithms.",
        "actionHint": "💡 Each bot operates independently with dedicated settings and accounts."
    },
    {
        "badge": "Guía Interactiva • Paso 7 / 22",
        "title": "7. Select Account & Live Balance Tracking",
        "content": "Assign the trading account for the currently active bot:\n• Full Support: OKX Sub-Accounts and FX Prop Accounts (E8 Demo, E8 Live).\n• Live Balance Display: Accurately reflects live account equity ($5,000, $200,000...) for real-time risk supervision.\n• Protective Lock 🔒: While the bot is running, account selection locks automatically to prevent position conflicts.",
        "actionHint": "💡 Right-aligned layout ensures full account balances are clearly visible without clipping."
    },
    {
        "badge": "Guía Interactiva • Paso 8 / 22",
        "title": "8. Capital, Margin Management & Safety Lock 🔒",
        "content": "• Units: Fixed USDT ($) or % of Account Equity.\n• TF Multiplier: Select 'Fixed' for uniform margin across timeframes, or 'Multiply TF' to scale size with larger candles (H1 x2.0, H4 x5.0).\n\n🔒 FOOLPROOF SAFETY LOCK:\n• Once you click 'START BOT', the margin input is LOCKED 🔒, preventing unintended margin jumps or accidental clicks.\n• To adjust capital, simply click 'STOP BOT', edit values, and restart.",
        "actionHint": "💡 Beginner tip: Start with small margin ($1 - $5) to observe live execution first."
    },
    {
        "badge": "Guía Interactiva • Paso 9 / 22",
        "title": "9. Take Profit (TP) & Stop Loss (SL) M5 0.6% Standard",
        "content": "Safety bracket ratios. TP/SL configured here represents the M5 BASE level (optimized default: 0.6% TP & 0.6% SL). Higher timeframes scale automatically via Margin Factor:\n\n📊 MULTI-TF TP/SL MULTIPLIER TABLE (M5 0.6% Base):\n• M5 : x1.0 ➔ TP 0.60% | SL 0.60% (Base TF)\n• M15: x1.2 ➔ TP 0.72% | SL 0.72%\n• M30: x1.5 ➔ TP 0.90% | SL 0.90%\n• H1 : x2.0 ➔ TP 1.20% | SL 1.20%\n• H2 : x3.0 ➔ TP 1.80% | SL 1.80%\n• H4 : x5.0 ➔ TP 3.00% | SL 3.00%\n\n🔍 Core principle: Larger candles experience wider swings. Auto-scaling lets positions ride major trends without premature stop-outs.\n🛡️ 15s Watchdog daemon continuously scans and attaches TP/SL brackets 24/7.",
        "actionHint": "💡 0.6% base ratio is battle-tested for rapid profit-taking and minimal drawdown."
    },
    {
        "badge": "Guía Interactiva • Paso 10 / 22",
        "title": "10. Select Trading Pairs & Timeframes",
        "content": "• Pairs Column: Check symbols you want the bot to scan (XAU, BTC, ETH, SOL...).\n• Trade TF Column: Check timeframes (M5 to H4) where the bot is authorized to place Limit orders.\n• Quick Navigation: Click any pair name to instantly focus the TradingView chart on that symbol.",
        "actionHint": "💡 Enable multiple timeframes simultaneously for automated multi-horizon diversification."
    },
    {
        "badge": "Guía Interactiva • Paso 11 / 22",
        "title": "11. Activate Automated Bot Engine",
        "content": "• Click 'START BOT': Launches background scanner engine to place/manage orders 24/7 on OKX or Prop Firm.\n• To Pause: Click 'STOP BOT' to cancel open limit orders and protect existing inventory.\n• Visual Status: Dynamic badge indicators (Green: Running, Red/Grey: Stopped).",
        "actionHint": "💡 You can safely close your browser; the bot executes persistently on the backend daemon."
    },
    {
        "badge": "Guía Interactiva • Paso 12 / 22",
        "title": "12. Bottom Command Pane & Split View (⮃)",
        "content": "Comprehensive monitoring hub:\n• Positions Tab: Open positions, live PnL, leverage, entry price, liquidation risk, and emergency panic-close buttons.\n• Logs Tab: Real-time stream of engine scans, algorithmic triggers, and broker responses.\n• Charts Tab: Multi-frame TradingView technical charts.\n• ⮃ Split View Button: Click to decouple Charts on top and Positions below simultaneously, providing complete situational awareness!",
        "actionHint": "💡 Try the ⮃ Split View button to unlock a professional dual-pane dashboard."
    },
    {
        "badge": "Guía Interactiva • Paso 13 / 22",
        "title": "13. Explore Advanced System Settings ⚙",
        "content": "Two key utility controls side by side:\n• 'Guide' Button 💡: Re-open this guided onboarding tour anytime.\n• 'Settings' Button ⚙: Opens Deep Configuration Panel for algorithmic tuning: Watchlist, Capital Management, DCA Trio, Circuit Breaker, Entry Triggers, Multi-TF Multipliers, Support & Reviews.\n\n• Click 'Next ▶' to open the Settings panel and step through each mechanism!",
        "actionHint": "💡 Click 'Next ▶' to enter the Advanced Settings modal."
    },
    {
        "badge": "Guía Interactiva • Paso 14 / 22",
        "title": "14. Coin Watchlist Configuration",
        "content": "Customize trading universe for your bot:\n• Toggle coin tags (XAU, BTC, ETH, SOL, DOGE...).\n• Highlighted badges indicate coins active on the main dashboard.\n• Safety Lock: Coins with currently open positions are automatically locked from deselecting.",
        "actionHint": "💡 Activate as many coins as appropriate for your capital capacity."
    },
    {
        "badge": "Guía Interactiva • Paso 15 / 22",
        "title": "15. Account & Capital Allocation",
        "content": "Configure account assignment and granular risk sizing for the active bot:\n• Select Account: Bind bot to corresponding OKX or Prop account.\n• Per-order Margin: Enter fixed USDT ($) or % of equity.\n• Multiplier Mode: Toggle between Fixed or Multiplied margin scaling.\n• Leverage: Set safe leverage ratio for the position.",
        "actionHint": "💡 While running, account and margin fields are locked 🔒 to protect active orders."
    },
    {
        "badge": "Guía Interactiva • Paso 16 / 22",
        "title": "16. Strategy Switches (DCA Trio)",
        "content": "The system provides 3 specialized order scaling algorithms:\n• Pyramid DCA (Positive DCA): Scales up positions as profit grows along trend stairs (H4 -> M5).\n• Negative DCA (Averaging Down): Averages entry price during drawdowns with expanded higher-TF TP/SL.\n• Multi-TF Split Grid: Independent limit orders per timeframe, each taking profit independently.\n\n💡 Note: Exactly 1 of the 3 modes can be active at a time (enabling one automatically disables the others).",
        "actionHint": "💡 Beginners are recommended to use Multi-TF Split Grid or Pyramid DCA for maximum capital defense."
    },
    {
        "badge": "Guía Interactiva • Paso 17 / 22",
        "title": "17. Circuit Breaker & BTC Correlation Filter",
        "content": "• Hedge Reversal Circuit Breaker: When price overextends far from H4 EMA200 (> 8%), bot locks trend limit orders to avoid tops/bottoms, while opening hedge orders on mean-reversion waves.\n• BTC Correlation Filter: Enforces Altcoins (ETH, SOL...) to only seek entries aligned with market leader BTC trend.",
        "actionHint": "💡 Recommended: Keep Circuit Breaker ON 24/7 to protect equity against severe volatility spikes."
    },
    {
        "badge": "Guía Interactiva • Paso 18 / 22",
        "title": "18. Entry Setup & 60-Candle Accumulation",
        "content": "Safety criteria for limit placement:\n• Base Offset %: Places Limit orders ahead of EMA200 touch (default 0.05% on M5) to fill before price rebounds. Scales with Entry Factor on higher TFs (e.g. H4 x6.8 -> 0.34% offset).\n• Base Gap %: Minimum distance required between consecutive EMA lines to avoid dense clustering.\n• Accum Candles: Requires 60 consecutive candles closed on one side of EMA200 before placing orders, confirming steady trends and filtering sideway noise.",
        "actionHint": "💡 Admin defaults are battle-tested in live markets; beginners can safely retain standard parameters."
    },
    {
        "badge": "Guía Interactiva • Paso 19 / 22",
        "title": "19. Multi-TF Multiplier Architecture",
        "content": "Mathematical scaling mechanics across timeframes:\n• Margin Factor: Larger candles expand margin and TP/SL amplitudes (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0) to match swing ranges and optimize profits.\n• Entry Factor: Multiplies Base Offset % and Base Gap %. Higher TFs get wider buffering zones (M5 x1.0, H4 x6.8) preventing order slippage during large candle fluctuations.",
        "actionHint": "💡 Core mathematical model enabling the bot to ride massive H1/H4 waves while keeping capital safe on M5/M15."
    },
    {
        "badge": "Guía Interactiva • Paso 20 / 22",
        "title": "20. Save Configuration & Reset Defaults",
        "content": "• Save Strategy: Immediately writes all modified parameters into the bot configuration.\n• Reset to Default: Revert to Admin battle-tested baseline settings anytime if experiments prove unsatisfactory.",
        "actionHint": "💡 Click 'Next ▶' to inspect the Support and Community Reviews tabs next!"
    },
    {
        "badge": "Guía Interactiva • Paso 21 / 22",
        "title": "21. Support & System Administration Tab",
        "content": "License management and 24/7 technical assistance:\n• Terms of Service: Guide to registering OKX account under TLS1 referral code to unlock lifetime free bot access.\n• API & HWID Check: Verify API Key connectivity and retrieve PC HWID for license activation.\n• Proxy & Maintenance: Optional Proxy IP setup, capital reset tools, and candle cache cleaners.",
        "actionHint": "💡 Click 'Copy' to quickly share HWID or referral code with the support team anytime."
    },
    {
        "badge": "Guía Interactiva • Paso 22 / 22",
        "title": "22. Community Reviews & Tour Complete!",
        "content": "• View Community Reviews: Browse verified feedback, profit screenshots, and live trading results from fellow traders.\n• Submit Your Review: Rate stars, attach trade snapshots, and share your experience with the community.",
        "actionHint": "🎉 Congratulations on completing the full A-Z onboarding tour! You now master all features and inner logic of the bot. Click 'Finish' to close and begin trading!"
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
    // 2: connect-fast-content
    {
      target: '[data-tour="connect-fast-content"]',
      placement: "right",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("fast");
      },
    },
    // 3: connect-apikey-content
    {
      target: '[data-tour="connect-apikey-content"]',
      placement: "right",
      preStep: () => {
        setShowSettings(false);
        setShowConnectModal(true);
        setConnectModalTab("apikey");
      },
    },
    // 4: connect-tradelocker-content
    {
      target: '[data-tour="connect-tradelocker-content"]',
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
    // 15: settings-account-capital
    {
      target: '[data-tour="settings-account-capital"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 16: settings-dca
    {
      target: '[data-tour="settings-dca"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 17: settings-circuit-breaker
    {
      target: '[data-tour="settings-circuit-breaker"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 18: settings-entry-filters
    {
      target: '[data-tour="settings-entry-filters"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 19: settings-tf-multipliers
    {
      target: '[data-tour="settings-tf-multipliers"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 20: settings-actions
    {
      target: '[data-tour="settings-actions"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("strategy");
      },
    },
    // 21: settings-support-tab-content
    {
      target: '[data-tour="settings-support-tab-content"]',
      placement: "top",
      preStep: () => {
        setShowConnectModal(false);
        setShowSettings(true);
        setSettingsTab("system");
      },
    },
    // 22: settings-reviews-tab-content
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
      badge: text ? text.badge : `Bước ${idx + 1} / 22`,
      title: text ? text.title : `Tính Năng ${idx + 1}`,
      content: text ? text.content : "",
      actionHint: text ? text.actionHint : "",
    };
  });
}
