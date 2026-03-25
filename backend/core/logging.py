"""
日志配置
"""
import logging
import sys
from pathlib import Path


def setup_logging(
    level: int = logging.INFO,
    log_file: str = None,
    format_string: str = None,
) -> None:
    """
    配置日志

    Args:
        level: 日志级别，默认 INFO
        log_file: 日志文件路径，默认不写入文件
        format_string: 日志格式，默认标准格式
    """
    if format_string is None:
        format_string = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"

    handlers = [logging.StreamHandler(sys.stdout)]

    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))

    logging.basicConfig(
        level=level,
        format=format_string,
        handlers=handlers,
    )

    # 设置第三方库日志级别
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("okx").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """
    获取 logger

    Args:
        name: logger 名称，通常用 __name__

    Returns:
        logging.Logger
    """
    return logging.getLogger(name)
