"""
工具函数
"""

import uuid
from datetime import datetime
from typing import Optional


def ts_to_datetime(ts: int) -> str:
    """
    毫秒时间戳转可读时间

    Args:
        ts: 毫秒时间戳

    Returns:
        如 "2024-01-15 10:30:00"
    """
    return datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M:%S")


def datetime_to_ts(dt: str) -> int:
    """
    时间字符串转毫秒时间戳

    Args:
        dt: 如 "2024-01-15 10:30:00"

    Returns:
        毫秒时间戳
    """
    return int(datetime.strptime(dt, "%Y-%m-%d %H:%M:%S").timestamp() * 1000)


def generate_cl_ord_id() -> str:
    """生成客户端订单ID"""
    return str(uuid.uuid4())[:32]