#!/bin/bash
# Script dọn sạch toàn bộ bot chạy ngầm và file rác
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"
python3 zClean_Zombie_Bots.py

