from fastapi import FastAPI, Depends, HTTPException, WebSocket
from sqlalchemy.orm import Session
from . import models, database
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="TLS1 Trading Web API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "TLS1 Trading Engine Web API is running."}

@app.get("/users")
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).all()

from pydantic import BaseModel
from .bot_manager import bot_manager

class BotActionRequest(BaseModel):
    uid: str
    strategy: str
    env_data: str = ""

@app.post("/api/bot/start")
def start_bot(req: BotActionRequest):
    return bot_manager.start_bot(req.uid, req.strategy, req.env_data)

@app.post("/api/bot/stop")
def stop_bot(req: BotActionRequest):
    return bot_manager.stop_bot(req.uid, req.strategy)

@app.get("/api/bot/status")
def get_bot_status(uid: str, strategy: str):
    return {"status": bot_manager.get_status(uid, strategy)}
