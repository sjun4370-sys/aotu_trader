from dataclasses import dataclass
from typing import Optional

@dataclass
class NodeOutput:
    success: bool
    node_id: str
    node_type: str
    data: dict
    timestamp: float
    error: Optional[str] = None
