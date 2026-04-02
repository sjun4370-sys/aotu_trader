import type { LucideIcon } from 'lucide-react'
import {
  Play,
  BarChart3,
  CandlestickChart,
  BookOpen,
  UserCircle,
  List,
  Activity,
  Target,
  TrendingUp,
  Brain,
  Zap,
  Shield,
  Ban,
  Scale,
  FileText,
  Eye,
  Search,
  GitBranch,
  RotateCw,
  Wallet,
  LineChart,
  Radio
} from 'lucide-react'

// 所有节点类型的图标映射
export const NODE_TYPE_ICONS: Record<string, LucideIcon> = {
  // 基础节点
  start: Play,
  trigger: Radio,

  // OKX数据节点
  okx_ticker: BarChart3,
  okx_candles: CandlestickChart,
  okx_orderbook: BookOpen,
  okx_account: UserCircle,
  okx_positions: List,

  // 技术指标节点
  rsi: Activity,
  macd: BarChart3,
  bollinger: Target,
  ma: TrendingUp,

  // AI节点
  llm_analysis: Brain,
  signal_generator: Zap,

  // 风控节点
  risk_check: Shield,
  stop_loss: Ban,
  take_profit: Target,
  position_sizing: Scale,

  // 交易执行节点
  create_order: FileText,
  monitor_order: Eye,
  cancel_order: Ban,
  query_position: Search,

  // 逻辑节点
  condition: GitBranch,
  loop: RotateCw,

  // 向后兼容的旧节点类型
  currency: Wallet,
  market: BarChart3,
  account: UserCircle,
  indicator: Activity,
  strategy: LineChart,
  analysis: Brain,
  trade: FileText
}

// 获取节点图标（带默认值）
export function getNodeIcon(nodeType: string): LucideIcon {
  return NODE_TYPE_ICONS[nodeType] || Activity
}
