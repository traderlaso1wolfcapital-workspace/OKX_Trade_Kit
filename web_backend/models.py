from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True)
    username = Column(String, index=True)
    api_key = Column(String)
    api_secret = Column(String)
    api_passphrase = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class GlobalSettings(Base):
    __tablename__ = "global_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String, unique=True, index=True)
    setting_value = Column(String) # Stored as JSON string
