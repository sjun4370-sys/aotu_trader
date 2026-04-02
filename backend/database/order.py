"""
订单模型 - 记录真实下单结果
"""

from sqlalchemy import Column, String, Text, DateTime, Float, Integer
from datetime import datetime, timezone
from database.session import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    execution_id = Column(String(64), nullable=False, index=True)
    workflow_id = Column(String(64), nullable=False, index=True)
    node_id = Column(String(64), nullable=False)

    order_id = Column(String(64), nullable=True)
    client_order_id = Column(String(64), nullable=True)
    inst_id = Column(String(32), nullable=True)
    side = Column(String(10), nullable=True)
    ord_type = Column(String(20), nullable=True)
    sz = Column(String(32), nullable=True)
    px = Column(String(32), nullable=True)
    state = Column(String(20), nullable=True)
    filled_sz = Column(String(32), nullable=True)
    avg_px = Column(String(32), nullable=True)

    raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))