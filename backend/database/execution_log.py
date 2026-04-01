"""
执行日志模型 - 记录工作流执行历史
"""

from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, Float
from datetime import datetime, timezone
from database.session import Base


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(String(64), primary_key=True)
    workflow_id = Column(String(64), nullable=False, index=True)
    execution_id = Column(String(64), nullable=False, index=True)
    node_id = Column(String(64), nullable=True)
    node_type = Column(String(50), nullable=True)

    # 执行时间
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime, nullable=True)
    duration_ms = Column(Float, nullable=True)  # 执行耗时（毫秒）

    # 执行状态
    status = Column(
        String(20), nullable=False
    )  # pending, running, completed, failed, stopped

    # 输入输出数据
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)

    # 错误信息
    error_message = Column(Text, nullable=True)
    error_traceback = Column(Text, nullable=True)

    # 执行上下文
    variables = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
