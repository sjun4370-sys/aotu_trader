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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
