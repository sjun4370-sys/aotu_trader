from sqlalchemy import Column, String, Text, DateTime, JSON
from datetime import datetime, timezone
from database.session import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    nodes = Column(JSON, nullable=False)
    edges = Column(JSON, nullable=False)
    user_id = Column(String(64), nullable=True, index=True)
    # 新增字段
    status = Column(String(20), default="idle", nullable=False)  # idle, running
    last_run_at = Column(DateTime, nullable=True)
    trigger_mode = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
