"""
测试后端 API
"""

import sys

sys.path.insert(0, ".")

# 先初始化数据库
print("Step 1: Importing database modules...")
from database.session import init_db, engine
from database.workflow import Workflow
from database.execution_log import ExecutionLog

print("Step 2: Creating tables...")
init_db()

# 验证表已创建
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Step 3: Tables created: {tables}")

print("\n=== Starting API Tests ===\n")

from api.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

# 测试 1: 健康检查
print("Test 1: Health Check")
response = client.get("/health")
print(f"  Status: {response.status_code}")
print(f"  Response: {response.json()}")
assert response.status_code == 200

# 测试 2: 获取工作流列表
print("\nTest 2: List Workflows")
response = client.get("/api/workflow/")
print(f"  Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"  Total: {data.get('total', 0)}")
    print(f"  Workflows count: {len(data.get('workflows', []))}")
    print(f"  Page: {data.get('page')}")
assert response.status_code == 200

# 测试 3: 创建工作流
print("\nTest 3: Create Workflow")
response = client.post(
    "/api/workflow/save",
    json={
        "name": "Test Workflow",
        "description": "Test description",
        "nodes": [],
        "edges": [],
    },
)
print(f"  Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    workflow_id = data.get("id")
    print(f"  Created workflow ID: {workflow_id}")
    print(f"  Status field: {data.get('status')}")
    print(f"  Name: {data.get('name')}")
    assert data.get("status") == "idle"
    assert "last_run_at" in data

    # 测试 4: 获取单个工作流
    print("\nTest 4: Get Single Workflow")
    response = client.get(f"/api/workflow/{workflow_id}")
    print(f"  Status: {response.status_code}")
    assert response.status_code == 200

    # 测试 5: 运行工作流
    print("\nTest 5: Run Workflow")
    response = client.post(f"/api/workflow/{workflow_id}/run")
    print(f"  Status: {response.status_code}")
    data = response.json()
    print(f"  Response: {data}")
    assert response.status_code == 200
    assert data.get("status") == "running"

    # 测试 6: 验证状态已更新
    print("\nTest 6: Verify Status Updated")
    response = client.get(f"/api/workflow/{workflow_id}")
    data = response.json()
    print(f"  Current status: {data.get('status')}")
    assert data.get("status") == "running"

    # 测试 7: 停止工作流
    print("\nTest 7: Stop Workflow")
    response = client.post(f"/api/workflow/{workflow_id}/stop")
    print(f"  Status: {response.status_code}")
    data = response.json()
    print(f"  Response: {data}")
    assert response.status_code == 200
    assert data.get("status") == "idle"

    # 测试 8: 删除工作流
    print("\nTest 8: Delete Workflow")
    response = client.delete(f"/api/workflow/{workflow_id}")
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")
    assert response.status_code == 200

print("\n✅ All API Tests Passed!")
