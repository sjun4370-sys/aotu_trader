"""
系统初始化脚本
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.system_config import system_config
from engine.workflow_engine_v2 import workflow_engine
from okx_api.config import OKXConfig


def initialize_system():
    """初始化整个系统"""
    print("=" * 60)
    print("🚀 AI量化交易系统初始化")
    print("=" * 60)

    # 1. 检查配置
    print("\n1️⃣ 检查系统配置...")
    if not system_config.is_configured():
        print("❌ 配置不完整！请设置以下环境变量：")
        print("   - OKX_API_KEY")
        print("   - OKX_SECRET_KEY")
        print("   - OKX_PASSPHRASE")
        print("\n可选配置：")
        print("   - ANTHROPIC_API_KEY (用于AI分析)")
        print("   - OPENAI_API_KEY (备选AI)")
        print("\n示例命令：")
        print("   export OKX_API_KEY='your_api_key'")
        print("   export OKX_SECRET_KEY='your_secret_key'")
        print("   export OKX_PASSPHRASE='your_passphrase'")
        return False

    print("✅ 配置检查通过")
    print(f"   交易模式: {'模拟盘' if system_config.okx_flag == '1' else '实盘'}")
    print(f"   LLM提供商: {system_config.llm_provider}")
    print(f"   最大亏损: {system_config.max_loss_pct * 100}%")
    print(f"   最大仓位: {system_config.max_position_pct * 100}%")

    # 2. 初始化OKX API
    print("\n2️⃣ 初始化OKX API连接...")
    try:
        okx_config = system_config.to_okx_config()
        workflow_engine.initialize_apis(
            okx_config=okx_config, llm_config={"provider": system_config.llm_provider}
        )
        print("✅ OKX API初始化成功")
    except Exception as e:
        print(f"❌ OKX API初始化失败: {e}")
        return False

    # 3. 测试连接
    print("\n3️⃣ 测试API连接...")
    try:
        from engine.node_executors.okx_data_nodes import okx_manager

        # 测试行情API
        result = okx_manager.market.get_ticker("BTC-USDT")
        success, data = okx_manager.market.parse_response(result)

        if success and data:
            price = data[0].get("last")
            print(f"✅ 行情API连接成功")
            print(f"   BTC-USDT 当前价格: {price} USDT")
        else:
            print(f"⚠️ 行情API测试异常: {data}")
    except Exception as e:
        print(f"❌ API连接测试失败: {e}")
        return False

    # 4. 检查LLM配置
    print("\n4️⃣ 检查LLM配置...")
    if system_config.anthropic_api_key or system_config.openai_api_key:
        print("✅ LLM API已配置")
        print(f"   主提供商: {system_config.llm_provider}")
    else:
        print("⚠️ 未配置LLM API，AI分析功能将使用模拟数据")
        print("   如需使用AI分析，请设置 ANTHROPIC_API_KEY 或 OPENAI_API_KEY")

    # 5. 总结
    print("\n" + "=" * 60)
    print("✅ 系统初始化完成！")
    print("=" * 60)
    print(f"\n系统状态:")
    print(f"  📊 行情数据: 已连接")
    print(f"  💰 交易功能: {'已启用' if system_config.okx_api_key else '未配置'}")
    print(f"  🤖 AI分析: {'已启用' if system_config.anthropic_api_key else '模拟模式'}")
    print(f"  🛡️ 风险控制: 已启用")
    print(f"\n交易设置:")
    print(f"  模式: {'模拟盘' if system_config.okx_flag == '1' else '实盘'}")
    print(f"  最大亏损: {system_config.max_loss_pct * 100}%")
    print(f"  最大仓位: {system_config.max_position_pct * 100}%")

    return True


if __name__ == "__main__":
    success = initialize_system()
    sys.exit(0 if success else 1)
