"""
OKX AI 交易执行脚本
用法:
    # 单币种
    python examples/run_trading.py BTC-USDT

    # 多币种串行（默认）
    python examples/run_trading.py BTC-USDT ETH-USDT SOL-USDT

    # 多币种并行（最多3个同时）
    python examples/run_trading.py --parallel BTC-USDT ETH-USDT SOL-USDT

    # 自定义并行线程数
    python examples/run_trading.py --parallel --workers 5 BTC-USDT ETH-USDT SOL-USDT

    # 每5分钟循环执行（默认）
    python examples/run_trading.py --loop BTC-USDT ETH-USDT

    # 每10分钟循环执行
    python examples/run_trading.py --loop --interval 10 BTC-USDT

    # 带提示词
    python examples/run_trading.py --prompt "关注波动率风险" BTC-USDT ETH-USDT
"""

import argparse
import sys
import time
from datetime import datetime
from pathlib import Path

# 添加 backend 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from examples.demo_trading_flow import TradingFlowDemo


def run_single_trading(inst_id: str, user_prompt: str = None) -> dict:
    """运行单个币种交易"""
    try:
        demo = TradingFlowDemo(inst_id=inst_id)
        result = demo.run(user_prompt=user_prompt)
        return {
            "inst_id": inst_id,
            "action": result.action.value,
            "reason": result.reason,
            "confidence": result.confidence,
            "success": True,
        }
    except Exception as e:
        return {
            "inst_id": inst_id,
            "action": "error",
            "reason": str(e),
            "confidence": 0.0,
            "success": False,
        }


def run_parallel(inst_ids: list, max_workers: int = 3, user_prompt: str = None):
    """并行执行多个币种"""
    print(f"\n{'=' * 60}")
    print(f"并行执行 {len(inst_ids)} 个币种")
    print(f"{'=' * 60}\n")

    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(run_single_trading, inst_id, user_prompt): inst_id
            for inst_id in inst_ids
        }
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            status = "成功" if result["success"] else "失败"
            action_cn = {
                "buy": "买入",
                "sell": "卖出",
                "hold": "持有",
                "error": "错误",
            }.get(result["action"], result["action"])
            print(f"[{status}] {result['inst_id']}: {action_cn} - {result['reason']}")

    return results


def run_serial(inst_ids: list, user_prompt: str = None):
    """串行执行多个币种"""
    print(f"\n{'=' * 60}")
    print(f"串行执行 {len(inst_ids)} 个币种")
    print(f"{'=' * 60}\n")

    results = []
    for inst_id in inst_ids:
        result = run_single_trading(inst_id, user_prompt=user_prompt)
        results.append(result)
        action_cn = {
            "buy": "买入",
            "sell": "卖出",
            "hold": "持有",
            "error": "错误",
        }.get(result["action"], result["action"])
        status = "成功" if result["success"] else "失败"
        print(f"[{status}] {result['inst_id']}: {action_cn} - {result['reason']}")
        print("-" * 40)

    return results


def run_loop(inst_ids: list, interval: int = 5, parallel: bool = False, max_workers: int = 3, user_prompt: str = None):
    """循环执行交易"""
    print(f"\n{'=' * 60}")
    print(f"开始循环执行，每 {interval} 分钟执行一次")
    if user_prompt:
        print(f"提示词: {user_prompt}")
    print(f"按 Ctrl+C 停止")
    print(f"{'=' * 60}\n")

    count = 0
    while True:
        count += 1
        print(f"\n>>> 第 {count} 次执行 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 40)

        if parallel:
            run_parallel(inst_ids, max_workers=max_workers, user_prompt=user_prompt)
        else:
            run_serial(inst_ids, user_prompt=user_prompt)

        print(f"\n下次执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} + {interval} 分钟")
        time.sleep(interval * 60)


def main():
    parser = argparse.ArgumentParser(description="OKX AI 交易执行脚本")
    parser.add_argument("--parallel", action="store_true", help="并行执行模式")
    parser.add_argument("--workers", type=int, default=3, help="并行模式最大线程数")
    parser.add_argument("--loop", action="store_true", help="循环执行")
    parser.add_argument("--interval", type=int, default=5, help="循环执行间隔（分钟）")
    parser.add_argument("--prompt", type=str, default=None, help="AI分析提示词")
    parser.add_argument("symbols", nargs="+", help="交易币种列表，如 BTC-USDT ETH-USDT")
    args = parser.parse_args()

    inst_ids = args.symbols
    user_prompt = args.prompt

    if args.loop:
        run_loop(inst_ids, interval=args.interval, parallel=args.parallel, max_workers=args.workers, user_prompt=user_prompt)
    elif len(inst_ids) == 1:
        result = run_single_trading(inst_ids[0])
        action_cn = {
            "buy": "买入",
            "sell": "卖出",
            "hold": "持有",
            "error": "错误",
        }.get(result["action"], result["action"])
        print(f"\n最终结果: {action_cn} {result['inst_id']}")
        print(f"原因: {result['reason']}")
        print(f"置信度: {result['confidence']}")
    elif args.parallel:
        run_parallel(inst_ids, max_workers=args.workers, user_prompt=user_prompt)
    else:
        run_serial(inst_ids, user_prompt=user_prompt)


if __name__ == "__main__":
    main()
