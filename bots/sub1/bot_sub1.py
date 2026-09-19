#!/usr/bin/env python3
import importlib
from bots.sub1 import bot_indicators, bot_orders, bot_strategy, bot_ui

importlib.reload(bot_ui)
importlib.reload(bot_indicators)
importlib.reload(bot_orders)
importlib.reload(bot_strategy)

from bots.sub1.bot_ui import *
from bots.sub1.bot_indicators import *
from bots.sub1.bot_orders import *
from bots.sub1.bot_strategy import *

# Để tương thích với code cũ có thể trỏ vào bot_sub1.COIN_PORTFOLIO
from bots.sub1.bot_config import *

# z3320 | Reload trigger for multi-tf independent grid & ui update

