import type { FC } from 'react'
import {
  ActivityIcon,
  BrainIcon,
  CircleDotIcon,
  FlagIcon,
  GitBranchIcon,
  LayersIcon,
  PlayIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  WalletIcon,
  ZapIcon
} from './icons'

interface IconProps {
  size?: number
  className?: string
}

export const NODE_TYPE_ICONS: Record<string, FC<IconProps>> = {
  start: PlayIcon,
  currency: CircleDotIcon,
  market: TrendingUpIcon,
  account: WalletIcon,
  indicator: ActivityIcon,
  strategy: LayersIcon,
  analysis: BrainIcon,
  trade: ZapIcon,
  condition: GitBranchIcon,
  loop: RefreshCwIcon,
  trigger: FlagIcon
}
