import sys
import re

file_path = "d:/4. Trade Coin - TLS1/4. Cursor - IDE/OKX_Trade_Kit/gui_main.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace setup_tab_strategy_smc
start_idx = content.find("    def setup_tab_strategy_smc(self):")
end_idx = content.find("    def get_selected_env(self):")

smc_setup = """    def setup_tab_strategy_smc(self):
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

        # 1. QUẢN LÝ VỐN & RỦI RO
        grp_risk = QtWidgets.QGroupBox("Quản Lý Vốn & Rủi Ro (Custom)")
        l_risk = QtWidgets.QGridLayout(grp_risk)
        self.smc_chk_main = ToggleSwitch()
        add_checkbox(l_risk, 0, 0, "Bật Bot SMC", self.smc_chk_main, "Kích hoạt thuật toán nhận diện Order Block và tự động giao dịch.")
        self.smc_chk_dynamic_risk = ToggleSwitch()
        add_checkbox(l_risk, 0, 1, "Quản lý Vol theo % vốn", self.smc_chk_dynamic_risk, "Bật để dùng Risk %, tắt để dùng Vốn Cố Định.")
        self.smc_input_risk_pct = QtWidgets.QDoubleSpinBox(); self.smc_input_risk_pct.setSuffix(" %")
        add_field(l_risk, 1, "Risk per Trade:", self.smc_input_risk_pct, "Phần trăm tài khoản rủi ro.")
        self.smc_input_pos_vol = QtWidgets.QDoubleSpinBox(); self.smc_input_pos_vol.setMaximum(1000000)
        add_field(l_risk, 2, "Vốn Limit cố định:", self.smc_input_pos_vol, "Vốn tĩnh.")
        layout.addWidget(grp_risk)

        # 2. REAL TIME INTERNAL STRUCTURE
        grp_int = QtWidgets.QGroupBox("Real Time Internal Structure")
        l_int = QtWidgets.QGridLayout(grp_int)
        self.smc_chk_show_int = ToggleSwitch()
        add_checkbox(l_int, 0, 0, "Show Internal Structure", self.smc_chk_show_int, "Hiển thị cấu trúc nhỏ", 2)
        
        self.smc_combo_int_bull = QtWidgets.QComboBox(); self.smc_combo_int_bull.addItems(["All", "BOS", "CHoCH"])
        add_field(l_int, 1, "Bullish Structure:", self.smc_combo_int_bull, "")
        self.smc_combo_int_bear = QtWidgets.QComboBox(); self.smc_combo_int_bear.addItems(["All", "BOS", "CHoCH"])
        add_field(l_int, 2, "Bearish Structure:", self.smc_combo_int_bear, "")
        
        self.smc_chk_int_conf = ToggleSwitch()
        add_checkbox(l_int, 3, 0, "Confluence Filter", self.smc_chk_int_conf, "Lọc hội tụ cho Internal", 2)
        
        self.smc_input_internal = QtWidgets.QSpinBox(); self.smc_input_internal.setMaximum(999)
        add_field(l_int, 4, "Internal Pivot Length (Custom):", self.smc_input_internal, "Số nến dò đáy đỉnh nhỏ")
        layout.addWidget(grp_int)

        # 3. REAL TIME SWING STRUCTURE
        grp_swing = QtWidgets.QGroupBox("Real Time Swing Structure")
        l_swing = QtWidgets.QGridLayout(grp_swing)
        self.smc_chk_show_swing = ToggleSwitch()
        add_checkbox(l_swing, 0, 0, "Show Swing Structure", self.smc_chk_show_swing, "Hiển thị cấu trúc lớn", 2)
        
        self.smc_combo_swing_bull = QtWidgets.QComboBox(); self.smc_combo_swing_bull.addItems(["All", "BOS", "CHoCH"])
        add_field(l_swing, 1, "Bullish Structure:", self.smc_combo_swing_bull, "")
        self.smc_combo_swing_bear = QtWidgets.QComboBox(); self.smc_combo_swing_bear.addItems(["All", "BOS", "CHoCH"])
        add_field(l_swing, 2, "Bearish Structure:", self.smc_combo_swing_bear, "")
        
        self.smc_chk_show_swing_pts = ToggleSwitch()
        add_checkbox(l_swing, 3, 0, "Show Swings Points", self.smc_chk_show_swing_pts, "")
        self.smc_input_swing = QtWidgets.QSpinBox(); self.smc_input_swing.setMaximum(999)
        add_field(l_swing, 4, "Swing Length:", self.smc_input_swing, "Độ dài nến dò đáy đỉnh Swing")
        
        self.smc_chk_show_hl = ToggleSwitch()
        add_checkbox(l_swing, 5, 0, "Show Strong/Weak High/Low", self.smc_chk_show_hl, "", 2)
        layout.addWidget(grp_swing)

        # 4. ORDER BLOCKS
        grp_ob = QtWidgets.QGroupBox("Order Blocks")
        l_ob = QtWidgets.QGridLayout(grp_ob)
        self.smc_chk_int_ob = ToggleSwitch()
        add_checkbox(l_ob, 0, 0, "Internal Order Blocks", self.smc_chk_int_ob, "")
        self.smc_input_int_ob = QtWidgets.QSpinBox()
        add_field(l_ob, 1, "Số lượng Internal OB:", self.smc_input_int_ob, "")
        
        self.smc_chk_swing_ob = ToggleSwitch()
        add_checkbox(l_ob, 2, 0, "Swing Order Blocks", self.smc_chk_swing_ob, "")
        self.smc_input_swing_ob = QtWidgets.QSpinBox()
        add_field(l_ob, 3, "Số lượng Swing OB:", self.smc_input_swing_ob, "")
        
        self.smc_combo_ob_filter = QtWidgets.QComboBox(); self.smc_combo_ob_filter.addItems(["Atr", "Cumulative Mean Range"])
        add_field(l_ob, 4, "Order Block Filter:", self.smc_combo_ob_filter, "")
        
        self.smc_combo_ob_mitig = QtWidgets.QComboBox(); self.smc_combo_ob_mitig.addItems(["High/Low", "Close"])
        add_field(l_ob, 5, "Order Block Mitigation:", self.smc_combo_ob_mitig, "")
        
        self.smc_input_ob_vol = QtWidgets.QDoubleSpinBox(); self.smc_input_ob_vol.setDecimals(1)
        add_field(l_ob, 6, "OB Volatility Mult (Custom):", self.smc_input_ob_vol, "Lọc nến OB lớn hơn N lần ATR")
        layout.addWidget(grp_ob)

        # 5. EQH/EQL & FVG & ZONES
        grp_liq = QtWidgets.QGroupBox("Liquidity, Gaps & Zones")
        l_liq = QtWidgets.QGridLayout(grp_liq)
        self.smc_chk_eqh = ToggleSwitch()
        add_checkbox(l_liq, 0, 0, "Equal High/Low (EQH/EQL)", self.smc_chk_eqh, "")
        self.smc_input_eqh_bars = QtWidgets.QSpinBox()
        add_field(l_liq, 1, "Bars Confirmation:", self.smc_input_eqh_bars, "")
        self.smc_input_eqh_thr = QtWidgets.QDoubleSpinBox(); self.smc_input_eqh_thr.setDecimals(2)
        add_field(l_liq, 2, "Threshold:", self.smc_input_eqh_thr, "")
        
        self.smc_chk_fvg = ToggleSwitch()
        add_checkbox(l_liq, 3, 0, "Fair Value Gaps", self.smc_chk_fvg, "")
        self.smc_chk_fvg_auto = ToggleSwitch()
        add_checkbox(l_liq, 3, 1, "Auto Threshold", self.smc_chk_fvg_auto, "")
        
        self.smc_chk_zones = ToggleSwitch()
        add_checkbox(l_liq, 4, 0, "Premium/Discount Zones", self.smc_chk_zones, "", 2)
        layout.addWidget(grp_liq)

        # 6. OB TRADE SETUP
        grp_setup = QtWidgets.QGroupBox("OB Trade Setup")
        l_setup = QtWidgets.QGridLayout(grp_setup)
        self.smc_chk_trade = ToggleSwitch()
        add_checkbox(l_setup, 0, 0, "Show OB Trade Setup", self.smc_chk_trade, "")
        
        self.smc_combo_source = QtWidgets.QComboBox()
        self.smc_combo_source.addItems(["Internal + Swing", "Internal OB", "Swing OB"])
        add_field(l_setup, 1, "OB Source:", self.smc_combo_source, "")
        
        self.smc_combo_dir = QtWidgets.QComboBox()
        self.smc_combo_dir.addItems(["Both", "Long only", "Short only"])
        add_field(l_setup, 2, "Direction:", self.smc_combo_dir, "")
        
        self.smc_combo_tp = QtWidgets.QComboBox()
        self.smc_combo_tp.addItems(["Risk:Reward", "Nearest opposite OB", "Opposite OB, fallback RR"])
        add_field(l_setup, 3, "TP Mode:", self.smc_combo_tp, "")
        
        self.smc_input_rr = QtWidgets.QDoubleSpinBox(); self.smc_input_rr.setDecimals(1)
        add_field(l_setup, 4, "TP Risk:Reward:", self.smc_input_rr, "")
        
        self.smc_input_max_setup = QtWidgets.QSpinBox(); self.smc_input_max_setup.setMaximum(99)
        add_field(l_setup, 5, "Max Historical Setups:", self.smc_input_max_setup, "")
        layout.addWidget(grp_setup)

        self.btn_save_strategy = QtWidgets.QPushButton("💾 LƯU CẤU HÌNH SMC (AUTO-RELOAD)")
        self.btn_save_strategy.setStyleSheet("background-color: #2E7D32; color: white; min-height: 40px; font-weight: bold; font-size: 14px;")
        self.btn_save_strategy.clicked.connect(self.save_strategy_settings)
        layout.addWidget(self.btn_save_strategy)
        
        scroll.setWidget(container)
        main_layout = QtWidgets.QVBoxLayout(self.tab_strategy)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.addWidget(scroll)

"""
content = content[:start_idx] + smc_setup + content[end_idx:]


# 2. Patch load_current_settings
start_load_idx = content.find('            if self.strategy_id == "sub2":')
end_load_idx = content.find('            self.chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_MAIN"', start_load_idx)

load_block = """            if self.strategy_id == "sub2":
                self.smc_chk_main.setChecked(bool(cfg.get("ENABLE_STRATEGY_SMC", getattr(bot_config, "ENABLE_STRATEGY_SMC", True))))
                self.smc_chk_dynamic_risk.setChecked(bool(cfg.get("USE_DYNAMIC_RISK", getattr(bot_config, "USE_DYNAMIC_RISK", True))))
                self.smc_input_risk_pct.setValue(float(cfg.get("RISK_PER_TRADE_PCT", getattr(bot_config, "RISK_PER_TRADE_PCT", 0.01))) * 100)
                self.smc_input_pos_vol.setValue(float(cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", getattr(bot_config, "POSITION_VOLUME_HIGH_CONFIDENCE", 150))))
                
                self.smc_chk_show_int.setChecked(bool(cfg.get("SMC_SHOW_INTERNAL", True)))
                self.smc_combo_int_bull.setCurrentText(str(cfg.get("SMC_INT_BULL", "All")))
                self.smc_combo_int_bear.setCurrentText(str(cfg.get("SMC_INT_BEAR", "All")))
                self.smc_chk_int_conf.setChecked(bool(cfg.get("SMC_INT_CONF", False)))
                self.smc_input_internal.setValue(int(cfg.get("INTERNAL_LENGTH", getattr(bot_config, "INTERNAL_LENGTH", 5))))
                
                self.smc_chk_show_swing.setChecked(bool(cfg.get("SMC_SHOW_SWING", True)))
                self.smc_combo_swing_bull.setCurrentText(str(cfg.get("SMC_SWING_BULL", "All")))
                self.smc_combo_swing_bear.setCurrentText(str(cfg.get("SMC_SWING_BEAR", "All")))
                self.smc_chk_show_swing_pts.setChecked(bool(cfg.get("SMC_SHOW_SWING_PTS", False)))
                self.smc_input_swing.setValue(int(cfg.get("SWING_LENGTH", getattr(bot_config, "SWING_LENGTH", 50))))
                self.smc_chk_show_hl.setChecked(bool(cfg.get("SMC_SHOW_HL", True)))
                
                self.smc_chk_int_ob.setChecked(bool(cfg.get("SMC_INT_OB", True)))
                self.smc_input_int_ob.setValue(int(cfg.get("SMC_INT_OB_CNT", 5)))
                self.smc_chk_swing_ob.setChecked(bool(cfg.get("SMC_SWING_OB", True)))
                self.smc_input_swing_ob.setValue(int(cfg.get("SMC_SWING_OB_CNT", 5)))
                self.smc_combo_ob_filter.setCurrentText(str(cfg.get("SMC_OB_FILTER", "Atr")))
                self.smc_combo_ob_mitig.setCurrentText(str(cfg.get("SMC_OB_MITIG", "High/Low")))
                self.smc_input_ob_vol.setValue(float(cfg.get("OB_VOLATILITY_MULT", getattr(bot_config, "OB_VOLATILITY_MULT", 2.0))))
                
                self.smc_chk_eqh.setChecked(bool(cfg.get("SMC_EQH", False)))
                self.smc_input_eqh_bars.setValue(int(cfg.get("SMC_EQH_BARS", 3)))
                self.smc_input_eqh_thr.setValue(float(cfg.get("SMC_EQH_THR", 0.1)))
                
                self.smc_chk_fvg.setChecked(bool(cfg.get("SMC_FVG", False)))
                self.smc_chk_fvg_auto.setChecked(bool(cfg.get("SMC_FVG_AUTO", True)))
                self.smc_chk_zones.setChecked(bool(cfg.get("SMC_ZONES", False)))
                
                self.smc_chk_trade.setChecked(bool(cfg.get("SMC_TRADE", True)))
                
                # Mapping the TP mode to GUI correctly
                src = str(cfg.get("OB_SOURCE", getattr(bot_config, "OB_SOURCE", "TRADE_ALL_OB")))
                if src == "SWING": src = "Swing OB"
                elif src == "INTERNAL": src = "Internal OB"
                elif src == "ALL" or src == "TRADE_ALL_OB": src = "Internal + Swing"
                self.smc_combo_source.setCurrentText(src)
                
                dr = str(cfg.get("OB_DIRECTION", getattr(bot_config, "OB_DIRECTION", "BOTH")))
                if dr == "BOTH": dr = "Both"
                elif dr == "LONG_ONLY": dr = "Long only"
                elif dr == "SHORT_ONLY": dr = "Short only"
                self.smc_combo_dir.setCurrentText(dr)
                
                tpm = str(cfg.get("OB_TP_MODE", getattr(bot_config, "OB_TP_MODE", "RR")))
                if tpm == "RR": tpm = "Risk:Reward"
                elif tpm == "NEAREST_OB": tpm = "Nearest opposite OB"
                self.smc_combo_tp.setCurrentText(tpm)
                
                self.smc_input_rr.setValue(float(cfg.get("OB_RR_RATIO", getattr(bot_config, "OB_RR_RATIO", 2.0))))
                self.smc_input_max_setup.setValue(int(cfg.get("OB_MAX_ACTIVE_SETUPS", getattr(bot_config, "OB_MAX_ACTIVE_SETUPS", 10))))
                return\n
"""
content = content[:start_load_idx] + load_block + content[end_load_idx:]

# 3. Patch save_strategy_settings
start_save_idx = content.find('        if self.strategy_id == "sub2":')
end_save_idx = content.find('        else:\n            cfg.update({')

save_block = """        if self.strategy_id == "sub2":
            
            # Map GUI text to Code Enums
            src_text = self.smc_combo_source.currentText()
            if src_text == "Swing OB": src_val = "SWING"
            elif src_text == "Internal OB": src_val = "INTERNAL"
            else: src_val = "ALL"
            
            dir_text = self.smc_combo_dir.currentText()
            if dir_text == "Long only": dir_val = "LONG_ONLY"
            elif dir_text == "Short only": dir_val = "SHORT_ONLY"
            else: dir_val = "BOTH"
            
            tp_text = self.smc_combo_tp.currentText()
            if tp_text == "Risk:Reward": tp_val = "RR"
            elif tp_text == "Nearest opposite OB": tp_val = "NEAREST_OB"
            else: tp_val = "RR"
            
            cfg.update({
                "ENABLE_STRATEGY_SMC": self.smc_chk_main.isChecked(),
                "USE_DYNAMIC_RISK": self.smc_chk_dynamic_risk.isChecked(),
                "RISK_PER_TRADE_PCT": str(round(self.smc_input_risk_pct.value() / 100.0, 4)),
                "POSITION_VOLUME_HIGH_CONFIDENCE": str(round(self.smc_input_pos_vol.value(), 2)),
                
                "SMC_SHOW_INTERNAL": self.smc_chk_show_int.isChecked(),
                "SMC_INT_BULL": self.smc_combo_int_bull.currentText(),
                "SMC_INT_BEAR": self.smc_combo_int_bear.currentText(),
                "SMC_INT_CONF": self.smc_chk_int_conf.isChecked(),
                "INTERNAL_LENGTH": self.smc_input_internal.value(),
                
                "SMC_SHOW_SWING": self.smc_chk_show_swing.isChecked(),
                "SMC_SWING_BULL": self.smc_combo_swing_bull.currentText(),
                "SMC_SWING_BEAR": self.smc_combo_swing_bear.currentText(),
                "SMC_SHOW_SWING_PTS": self.smc_chk_show_swing_pts.isChecked(),
                "SWING_LENGTH": self.smc_input_swing.value(),
                "SMC_SHOW_HL": self.smc_chk_show_hl.isChecked(),
                
                "SMC_INT_OB": self.smc_chk_int_ob.isChecked(),
                "SMC_INT_OB_CNT": self.smc_input_int_ob.value(),
                "SMC_SWING_OB": self.smc_chk_swing_ob.isChecked(),
                "SMC_SWING_OB_CNT": self.smc_input_swing_ob.value(),
                "SMC_OB_FILTER": self.smc_combo_ob_filter.currentText(),
                "SMC_OB_MITIG": self.smc_combo_ob_mitig.currentText(),
                "OB_VOLATILITY_MULT": str(round(self.smc_input_ob_vol.value(), 2)),
                
                "SMC_EQH": self.smc_chk_eqh.isChecked(),
                "SMC_EQH_BARS": self.smc_input_eqh_bars.value(),
                "SMC_EQH_THR": str(round(self.smc_input_eqh_thr.value(), 2)),
                
                "SMC_FVG": self.smc_chk_fvg.isChecked(),
                "SMC_FVG_AUTO": self.smc_chk_fvg_auto.isChecked(),
                "SMC_ZONES": self.smc_chk_zones.isChecked(),
                
                "SMC_TRADE": self.smc_chk_trade.isChecked(),
                "OB_RR_RATIO": str(round(self.smc_input_rr.value(), 2)),
                "OB_MAX_ACTIVE_SETUPS": self.smc_input_max_setup.value(),
                "OB_SOURCE": src_val,
                "OB_DIRECTION": dir_val,
                "OB_TP_MODE": tp_val
            })
"""

content = content[:start_save_idx] + save_block + content[end_save_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("GUI REPLACED V2")
