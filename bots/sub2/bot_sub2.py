#!/usr/bin/env python3
import importlib
from bots.sub2 import bot_indicators, bot_orders, bot_strategy

importlib.reload(bot_indicators)
importlib.reload(bot_orders)
importlib.reload(bot_strategy)

from bots.sub2.bot_indicators import *
from bots.sub2.bot_orders import *
from bots.sub2.bot_strategy import *

# Để tương thích
from bots.sub2.bot_config import *
