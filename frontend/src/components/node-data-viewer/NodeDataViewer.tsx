/**
 * 节点数据可视化展示组件
 */
import type { WorkflowNode } from '../../types/workflow'
import StartDataViewer from './viewers/StartDataViewer'
import CurrencyDataViewer from './viewers/CurrencyDataViewer'
import MarketDataViewer from './viewers/MarketDataViewer'
import AccountDataViewer from './viewers/AccountDataViewer'
import IndicatorDataViewer from './viewers/IndicatorDataViewer'
import StrategyDataViewer from './viewers/StrategyDataViewer'
import AnalysisDataViewer from './viewers/AnalysisDataViewer'
import TradeDataViewer from './viewers/TradeDataViewer'
import ConditionDataViewer from './viewers/ConditionDataViewer'
import LoopDataViewer from './viewers/LoopDataViewer'
import GenericDataViewer from './viewers/GenericDataViewer'

interface NodeDataViewerProps {
  node: WorkflowNode
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function NodeDataViewer({ node, data, isInferred }: NodeDataViewerProps) {
  // 根据节点类型选择对应的展示组件
  switch (node.type) {
    case 'start':
      return <StartDataViewer data={data} isInferred={isInferred} />

    case 'currency':
      return <CurrencyDataViewer data={data} isInferred={isInferred} />

    case 'market':
      return <MarketDataViewer data={data} isInferred={isInferred} />

    case 'account':
      return <AccountDataViewer data={data} isInferred={isInferred} />

    case 'indicator':
      return <IndicatorDataViewer data={data} isInferred={isInferred} />

    case 'strategy':
      return <StrategyDataViewer data={data} isInferred={isInferred} />

    case 'analysis':
      return <AnalysisDataViewer data={data} isInferred={isInferred} />

    case 'trade':
      return <TradeDataViewer data={data} isInferred={isInferred} />

    case 'condition':
      return <ConditionDataViewer data={data} isInferred={isInferred} />

    case 'loop':
      return <LoopDataViewer data={data} isInferred={isInferred} />

    default:
      return <GenericDataViewer data={data} isInferred={isInferred} />
  }
}
