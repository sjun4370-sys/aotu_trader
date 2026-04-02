"""
执行上下文 - 工作流引擎共享的数据类
"""

from dataclasses import dataclass, field
from typing import Dict, Any

from engine.node_output import NodeOutput


@dataclass
class ExecutionContext:
    """执行上下文，传递节点间数据"""

    workflow_id: str
    execution_id: str
    variables: Dict[str, Any] = field(default_factory=dict)
    node_outputs: Dict[str, NodeOutput] = field(default_factory=dict)
    stop_requested: bool = False

    def request_stop(self):
        self.stop_requested = True

    def is_stopped(self) -> bool:
        return self.stop_requested

    def set_input(self, key: str, value: Any):
        """设置输入变量"""
        self.variables[key] = value

    def get_input(self, key: str) -> Any:
        """获取输入变量"""
        return self.variables.get(key)
