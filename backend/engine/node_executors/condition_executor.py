"""
条件节点执行器
"""

from __future__ import annotations

import logging
import re
import time
from typing import Any, Dict

from engine.context import ExecutionContext
from engine.node_output import NodeOutput

logger = logging.getLogger(__name__)


def _resolve_expression(expression: str, inputs: Dict[str, NodeOutput]) -> bool:
    """
    解析并计算条件表达式
    支持 {{nodeId.field}} 格式的模板语法
    例如: {{rsi}} > 70, {{macd.histogram}} > 0
    """
    if not expression:
        return True

    # 提取所有 {{...}} 占位符
    pattern = r'\{\{([^}]+)\}\}'
    matches = re.findall(pattern, expression)

    if not matches:
        # 没有占位符，尝试直接求值（危险，仅用于简单表达式）
        if expression in ("always", "true"):
            return True
        if expression in ("never", "false"):
            return False
        return False

    # 构建变量上下文
    context_vars = {}

    for match in matches:
        ref = match.strip()
        # 查找匹配的输入源
        found = False
        for src_id, src_output in inputs.items():
            if src_output and src_output.data:
                data = src_output.data
                # 支持 nodeId.field 或直接 field（从第一个输入获取）
                if ref in data:
                    context_vars[ref] = data[ref]
                    found = True
                    break
                # 尝试从 data 中获取嵌套字段 (e.g. "rsi" from {"rsi": 75})
                if src_output.node_type:
                    # 使用 node_type 作为键
                    if src_output.node_type not in context_vars:
                        context_vars[src_output.node_type] = {}
                    if isinstance(src_output.node_type, str) and ref in data:
                        context_vars[src_output.node_type][ref] = data[ref]
                        found = True

        if not found:
            # 尝试更灵活的匹配
            for src_id, src_output in inputs.items():
                if src_output and src_output.data:
                    data = src_output.data
                    # 如果表达式只是字段名如 "rsi"，从输入数据中查找
                    for key, value in data.items():
                        if key == ref:
                            context_vars[ref] = value
                            found = True

    # 替换模板变量
    resolved_expr = expression
    for var_name, var_value in context_vars.items():
        placeholder = f"{{{{{var_name}}}}}"
        if placeholder in resolved_expr:
            # 直接数值替换
            if isinstance(var_value, (int, float)):
                resolved_expr = resolved_expr.replace(placeholder, str(var_value))
            else:
                resolved_expr = resolved_expr.replace(placeholder, f'"{var_value}"')

    # 也处理 field.path 格式的占位符
    field_pattern = r'\{\{([^}]+\.[^}]+)\}\}'
    field_matches = re.findall(field_pattern, expression)
    for field_ref in field_matches:
        parts = field_ref.split('.')
        if len(parts) == 2:
            node_type_or_id, field = parts
            # 查找匹配的输入
            for src_id, src_output in inputs.items():
                if src_output and src_output.data:
                    data = src_output.data
                    if field in data:
                        value = data[field]
                        placeholder = f"{{{{{field_ref}}}}}"
                        if isinstance(value, (int, float)):
                            resolved_expr = resolved_expr.replace(placeholder, str(value))
                        elif isinstance(value, str):
                            resolved_expr = resolved_expr.replace(placeholder, f'"{value}"')

    # 安全求值 - 只允许基本数学和比较运算
    try:
        # 移除所有非法的函数调用和危险操作
        safe_expr = resolved_expr
        # 检查是否包含危险字符
        dangerous_patterns = ['import', 'exec', 'eval', 'open', 'file', '__', 'os.', 'sys.']
        for dangerous in dangerous_patterns:
            if dangerous in safe_expr:
                logger.warning(f"表达式包含危险模式: {dangerous}")
                return False

        # 使用 eval 求值（仅限数学和比较运算）
        result = eval(safe_expr, {"__builtins__": {}}, {})
        return bool(result)
    except Exception as e:
        logger.error(f"条件表达式求值失败: {expression}, 错误: {e}")
        return False


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
    """
    执行条件节点 - 1入2出
    返回包含condition和branches信息的NodeOutput
    """
    timestamp = time.time()
    expression = config.get("expression", "")

    logger.debug(f"执行条件节点: expression={expression}")

    # 解析并计算条件表达式
    condition_met = _resolve_expression(expression, inputs)

    output = {
        "condition": expression,
        "result": condition_met,
        "branches": {"true": condition_met, "false": not condition_met},
    }

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="condition",
        data=output,
        timestamp=timestamp
    )
