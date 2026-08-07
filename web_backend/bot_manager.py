import subprocess
import os
import sys
import time

class BotManager:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.running_bots = {}  # Format: { "uid_strategy": subprocess.Popen }

    def get_env_path(self, uid):
        return os.path.join(self.base_dir, f"env_{uid}.env")

    def start_bot(self, uid: str, strategy: str, env_data: str):
        bot_key = f"{uid}_{strategy}"
        if bot_key in self.running_bots:
            if self.running_bots[bot_key].poll() is None:
                return {"status": "error", "message": "Bot is already running"}

        # Write env data for this user
        env_path = self.get_env_path(uid)
        with open(env_path, "w") as f:
            f.write(env_data)

        cmd = [sys.executable, f"sys_bot_{strategy}.py", env_path]
        
        # Start subprocess
        process = subprocess.Popen(
            cmd,
            cwd=self.base_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding='utf-8',
            errors='replace'
        )
        self.running_bots[bot_key] = process
        return {"status": "success", "message": f"Bot {strategy} started for {uid}"}

    def stop_bot(self, uid: str, strategy: str):
        bot_key = f"{uid}_{strategy}"
        if bot_key not in self.running_bots or self.running_bots[bot_key].poll() is not None:
            return {"status": "error", "message": "Bot is not running"}
            
        process = self.running_bots[bot_key]
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            
        del self.running_bots[bot_key]
        return {"status": "success", "message": f"Bot {strategy} stopped for {uid}"}

    def get_status(self, uid: str, strategy: str):
        bot_key = f"{uid}_{strategy}"
        if bot_key in self.running_bots and self.running_bots[bot_key].poll() is None:
            return "running"
        return "stopped"

bot_manager = BotManager(base_dir=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
