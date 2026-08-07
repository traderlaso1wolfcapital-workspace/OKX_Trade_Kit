import socketio
import asyncio
import threading
import os

class DesktopEngineBridge:
    def __init__(self, backend_url="http://localhost:8000"):
        self.backend_url = backend_url
        self.sio = socketio.Client()
        self.setup_handlers()
        
    def setup_handlers(self):
        @self.sio.event
        def connect():
            print("[EngineBridge] Connected to Web Control Center")
            self.sio.emit('engine_status', {'status': 'online'})
            
        @self.sio.event
        def disconnect():
            print("[EngineBridge] Disconnected from Web Control Center")
            
        @self.sio.event
        def system_message(data):
            print(f"[EngineBridge] Server says: {data}")
            
        @self.sio.on('command')
        def on_command(data):
            cmd = data.get('cmd')
            print(f"[EngineBridge] Received command from Web: {cmd}")
            if cmd == 'start_bot':
                self.start_trading_bot()
            elif cmd == 'stop_bot':
                self.stop_trading_bot()

    def start_trading_bot(self):
        print("[EngineBridge] Starting Desktop Trading Engine...")
        # Simulate bot start
        self.sio.emit('bot_event', {'event': 'bot_started', 'status': 'Running'})
        
    def stop_trading_bot(self):
        print("[EngineBridge] Stopping Desktop Trading Engine...")
        # Simulate bot stop
        self.sio.emit('bot_event', {'event': 'bot_stopped', 'status': 'Idle'})

    def connect_sync(self):
        try:
            print(f"[EngineBridge] Connecting to {self.backend_url}...")
            self.sio.connect(self.backend_url)
            self.sio.wait()
        except Exception as e:
            print(f"[EngineBridge] Connection failed: {e}")

    def run_in_background(self):
        thread = threading.Thread(target=self.connect_sync, daemon=True)
        thread.start()
        return thread

# Example usage (would be integrated into gui_main.py)
if __name__ == "__main__":
    bridge = DesktopEngineBridge()
    bridge.connect_sync()
