import sys
import re

file_path = "d:/4. Trade Coin - TLS1/4. Cursor - IDE/OKX_Trade_Kit/gui_main.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Patch setup_tab_strategy
replacement_setup = """    def setup_tab_strategy(self):
        if self.strategy_id == "sub2":
            self.setup_tab_strategy_smc()
            return
            
        # Create Scroll Area
        scroll = QtWidgets.QScrollArea()
"""
content = content.replace("    def setup_tab_strategy(self):\n        # Create Scroll Area\n        scroll = QtWidgets.QScrollArea()", replacement_setup)

# 2. Inject setup_tab_strategy_smc
smc_setup = """
    def setup_tab_strategy_smc(self):
        scroll = QtWidgets.QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QtWidgets.QFrame.Shape.NoFrame)
        
        container = QtWidgets.QWidget()
        container.setStyleSheet("background-color: transparent;")
        scroll.setStyleSheet("background-color: transparent;")
        layout = QtWidgets.QVBoxLayout(container)
        layout.setSpacing(15)

        def add_field(layout_obj, row, label_text, widget, tooltip_text, colspan=1):
            lbl = QtWidgets.QLabel(label_text)
            lbl.setStyleSheet("color: #e0e0e0;")
            btn_help = HelpButton(tooltip_text)
            h_lbl = QtWidgets.QHBoxLayout()
            h_lbl.addWidget(lbl)
            h_lbl.addWidget(btn_help)
            h_lbl.addStretch()
            layout_obj.addLayout(h_lbl, row, 0)
            layout_obj.addWidget(widget, row, 1, 1, colspan)

        def add_checkbox(layout_obj, row, col, label_text, widget, tooltip_text, colspan=1):
            h = QtWidgets.QHBoxLayout()
            h.addWidget(widget)
            lbl = QtWidgets.QLabel(label_text)
            lbl.setStyleSheet("color: #e0e0e0;")
            h.addWidget(lbl)
            btn_help = HelpButton(tooltip_text)
            h.addWidget(btn_help)
            h.addStretch()
            layout_obj.addLayout(h, row, col, 1, colspan)

        # 1. DANH MỤC CHIẾN THUẬT
        grp_toggles = QtWidgets.QGroupBox("Danh Mục Chiến Thuật SMC")
        l_toggles = QtWidgets.QGridLayout(grp_toggles)
        self.smc_chk_main = ToggleSwitch()
        add_checkbox(l_toggles, 0, 0, "Bật Chiến thuật SMC Order Block", self.smc_chk_main, "Kích hoạt thuật toán nhận diện Order Block và tự động giao dịch SMC.")
        layout.addWidget(grp_toggles)

        # 2. QUẢN LÝ VỐN & RỦI RO
        grp_risk = QtWidgets.QGroupBox("Quản Lý Vốn & Rủi Ro")
        l_risk = QtWidgets.QGridLayout(grp_risk)
        self.smc_chk_dynamic_risk = ToggleSwitch()
        add_checkbox(l_risk, 0, 0, "Bật quản lý Volume theo % vốn", self.smc_chk_dynamic_risk, "Nếu bật, bot sẽ dùng % vốn dưới đây để vào lệnh.", 2)
        
        self.smc_input_risk_pct = QtWidgets.QDoubleSpinBox(); self.smc_input_risk_pct.setSuffix(" %")
        add_field(l_risk, 1, "Vào lệnh theo % vốn:", self.smc_input_risk_pct, "Phần trăm tài khoản sẽ vào lệnh (Risk per trade).")
        
        self.smc_input_pos_vol = QtWidgets.QDoubleSpinBox(); self.smc_input_pos_vol.setMaximum(1000000)
        add_field(l_risk, 2, "Vốn Limit cố định:", self.smc_input_pos_vol, "Sử dụng nếu quản lý vốn động bị tắt.")
        
        self.smc_input_rr = QtWidgets.QDoubleSpinBox(); self.smc_input_rr.setDecimals(1)
        add_field(l_risk, 3, "Tỷ lệ Risk:Reward (RR):", self.smc_input_rr, "Tỷ lệ lợi nhuận/rủi ro cho mỗi setup SMC (VD: 2.0 = 1:2).")
        layout.addWidget(grp_risk)

        # 3. CẤU TRÚC SMC & PIVOT
        grp_smc = QtWidgets.QGroupBox("Cấu Trúc SMC & Order Block")
        l_smc = QtWidgets.QGridLayout(grp_smc)
        
        self.smc_input_swing = QtWidgets.QSpinBox(); self.smc_input_swing.setMaximum(999)
        add_field(l_smc, 0, "Nến Swing Pivot:", self.smc_input_swing, "Số nến để xác định đáy/đỉnh cấu trúc lớn.")
        
        self.smc_input_internal = QtWidgets.QSpinBox(); self.smc_input_internal.setMaximum(999)
        add_field(l_smc, 1, "Nến Internal Pivot:", self.smc_input_internal, "Số nến để xác định đáy/đỉnh cấu trúc nhỏ.")
        
        self.smc_input_ob_max = QtWidgets.QSpinBox(); self.smc_input_ob_max.setMaximum(999)
        add_field(l_smc, 2, "Số lượng OB lưu trữ:", self.smc_input_ob_max, "Số lượng vùng Order Block tối đa giữ lại trên RAM.")
        
        self.smc_input_ob_vol = QtWidgets.QDoubleSpinBox(); self.smc_input_ob_vol.setDecimals(1)
        add_field(l_smc, 3, "Lọc nến OB x ATR:", self.smc_input_ob_vol, "Nến tạo OB phải lớn hơn N lần ATR(200).")
        
        self.smc_combo_source = QtWidgets.QComboBox()
        self.smc_combo_source.addItems(["SWING", "INTERNAL", "ALL"])
        add_field(l_smc, 4, "Nguồn OB ưu tiên:", self.smc_combo_source, "Dùng OB từ cấu trúc lớn (SWING), cấu trúc nhỏ (INTERNAL) hay cả hai.")
        
        self.smc_combo_dir = QtWidgets.QComboBox()
        self.smc_combo_dir.addItems(["BOTH", "LONG_ONLY", "SHORT_ONLY"])
        add_field(l_smc, 5, "Chiều giao dịch:", self.smc_combo_dir, "Đánh cả 2 chiều hay chỉ ưu tiên Long/Short.")
        
        self.smc_combo_tp = QtWidgets.QComboBox()
        self.smc_combo_tp.addItems(["RR", "NEAREST_OB"])
        add_field(l_smc, 6, "Chế độ Chốt lời:", self.smc_combo_tp, "Chốt lời cố định theo RR hay chốt tại Order Block gần nhất.")
        
        self.smc_input_max_setup = QtWidgets.QSpinBox(); self.smc_input_max_setup.setMaximum(99)
        add_field(l_smc, 7, "Số lệnh chạy tối đa:", self.smc_input_max_setup, "Số lượng lệnh (setups) SMC tối đa được mở cùng lúc.")
        
        layout.addWidget(grp_smc)

        self.btn_save_strategy = QtWidgets.QPushButton("💾 LƯU CẤU HÌNH SMC (AUTO-RELOAD)")
        self.btn_save_strategy.setStyleSheet("background-color: #2E7D32; color: white; min-height: 40px; font-weight: bold; font-size: 14px;")
        self.btn_save_strategy.clicked.connect(self.save_strategy_settings)
        layout.addWidget(self.btn_save_strategy)
        
        scroll.setWidget(container)
        main_layout = QtWidgets.QVBoxLayout(self.tab_strategy)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.addWidget(scroll)

    def get_selected_env"""
content = content.replace("    def get_selected_env", smc_setup)

# 3. Patch load_current_settings
load_orig = """            self.chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_MAIN", bot_config.ENABLE_STRATEGY_MAIN)))
            self.chk_xole.setChecked(bool(cfg.get("ENABLE_STRATEGY_XOLE", bot_config.ENABLE_STRATEGY_XOLE)))"""

load_new = """            if self.strategy_id == "sub2":
                self.smc_chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_SMC", getattr(bot_config, "ENABLE_STRATEGY_SMC", True))))
                self.smc_chk_dynamic_risk.setChecked(bool(cfg.get("USE_DYNAMIC_RISK", getattr(bot_config, "USE_DYNAMIC_RISK", True))))
                self.smc_input_risk_pct.setValue(float(cfg.get("RISK_PER_TRADE_PCT", getattr(bot_config, "RISK_PER_TRADE_PCT", 0.01))) * 100)
                self.smc_input_pos_vol.setValue(float(cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", getattr(bot_config, "POSITION_VOLUME_HIGH_CONFIDENCE", 150))))
                self.smc_input_rr.setValue(float(cfg.get("OB_RR_RATIO", getattr(bot_config, "OB_RR_RATIO", 2.0))))
                self.smc_input_swing.setValue(int(cfg.get("SWING_LENGTH", getattr(bot_config, "SWING_LENGTH", 50))))
                self.smc_input_internal.setValue(int(cfg.get("INTERNAL_LENGTH", getattr(bot_config, "INTERNAL_LENGTH", 5))))
                self.smc_input_ob_max.setValue(int(cfg.get("OB_MAX_COUNT", getattr(bot_config, "OB_MAX_COUNT", 20))))
                self.smc_input_ob_vol.setValue(float(cfg.get("OB_VOLATILITY_MULT", getattr(bot_config, "OB_VOLATILITY_MULT", 2.0))))
                self.smc_input_max_setup.setValue(int(cfg.get("OB_MAX_ACTIVE_SETUPS", getattr(bot_config, "OB_MAX_ACTIVE_SETUPS", 10))))
                
                src = str(cfg.get("OB_SOURCE", getattr(bot_config, "OB_SOURCE", "SWING")))
                self.smc_combo_source.setCurrentText(src)
                dr = str(cfg.get("OB_DIRECTION", getattr(bot_config, "OB_DIRECTION", "BOTH")))
                self.smc_combo_dir.setCurrentText(dr)
                tpm = str(cfg.get("OB_TP_MODE", getattr(bot_config, "OB_TP_MODE", "RR")))
                self.smc_combo_tp.setCurrentText(tpm)
                return

            self.chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_MAIN", bot_config.ENABLE_STRATEGY_MAIN)))
            self.chk_xole.setChecked(bool(cfg.get("ENABLE_STRATEGY_XOLE", bot_config.ENABLE_STRATEGY_XOLE)))"""
content = content.replace(load_orig, load_new)

# 4. Patch save_strategy_settings
save_orig = """        cfg.update({
            "ENABLE_STRATEGY_MAIN": self.chk_main.isChecked(),
            "ENABLE_STRATEGY_XOLE": self.chk_xole.isChecked(),"""

save_new = """        if self.strategy_id == "sub2":
            cfg.update({
                "ENABLE_STRATEGY_SMC": self.smc_chk_main.isChecked(),
                "USE_DYNAMIC_RISK": self.smc_chk_dynamic_risk.isChecked(),
                "RISK_PER_TRADE_PCT": str(round(self.smc_input_risk_pct.value() / 100.0, 4)),
                "POSITION_VOLUME_HIGH_CONFIDENCE": str(round(self.smc_input_pos_vol.value(), 2)),
                "OB_RR_RATIO": str(round(self.smc_input_rr.value(), 2)),
                "SWING_LENGTH": self.smc_input_swing.value(),
                "INTERNAL_LENGTH": self.smc_input_internal.value(),
                "OB_MAX_COUNT": self.smc_input_ob_max.value(),
                "OB_VOLATILITY_MULT": str(round(self.smc_input_ob_vol.value(), 2)),
                "OB_MAX_ACTIVE_SETUPS": self.smc_input_max_setup.value(),
                "OB_SOURCE": self.smc_combo_source.currentText(),
                "OB_DIRECTION": self.smc_combo_dir.currentText(),
                "OB_TP_MODE": self.smc_combo_tp.currentText()
            })
        else:
            cfg.update({
                "ENABLE_STRATEGY_MAIN": self.chk_main.isChecked(),
                "ENABLE_STRATEGY_XOLE": self.chk_xole.isChecked(),"""

content = content.replace(save_orig, save_new)

save_bottom = """        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4)"""
save_bottom_new = """            })
            
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4)"""
            
content = content.replace("""            "VOL_MULTIPLIERS": {
                "BTC": str(round(self.input_btc_vol_mult.value(), 2)),
                "ETH": str(round(self.input_eth_vol_mult.value(), 2))
            }
        })""", """            "VOL_MULTIPLIERS": {
                "BTC": str(round(self.input_btc_vol_mult.value(), 2)),
                "ETH": str(round(self.input_eth_vol_mult.value(), 2))
            }
        })""") 
# Just need to make sure the dict closing is handled properly.
# Actually I replaced the dict start with `else: cfg.update({...`. The closing bracket is `        })` which remains unchanged!

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("PATCH SUCCESSFUL")
