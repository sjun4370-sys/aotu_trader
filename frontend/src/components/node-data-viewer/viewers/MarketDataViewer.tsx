import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface KlineData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function MarketDataViewer({ data, isInferred }: Props) {
  const dataType = (data.dataType as string) || 'kline'

  // 渲染K线数据
  if (dataType === 'kline') {
    const klines = (data.klines as Record<string, KlineData[]>) || {}
    const symbols = Object.keys(klines)

    return (
      <BaseDataViewer data={data} isInferred={isInferred} title="K线数据">
        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>时间周期</span>
            <span className={styles.infoValue}>{String(data.interval || '-')}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>K线数量</span>
            <span className={styles.infoValue}>{String(data.count || 0)} 根</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>交易对</span>
            <span className={styles.infoValue}>{symbols.join(', ') || '-'}</span>
          </div>
        </div>

        {symbols.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {symbols.map((symbol) => {
              const candles = klines[symbol] || []
              const latest = candles[candles.length - 1]
              const change = latest ? ((latest.close - latest.open) / latest.open * 100).toFixed(2) : '0'
              const isUp = parseFloat(change) >= 0

              return (
                <div key={symbol} style={{ marginBottom: 12 }}>
                  <div className={styles.klineSymbol}>{symbol}</div>
                  {latest && (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>最新价</th>
                          <th>涨跌</th>
                          <th>高</th>
                          <th>低</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 600 }}>${latest.close.toFixed(2)}</td>
                          <td style={{ color: isUp ? 'var(--wf-success)' : 'var(--wf-error)' }}>
                            {isUp ? '+' : ''}{change}%
                          </td>
                          <td>${latest.high.toFixed(2)}</td>
                          <td>${latest.low.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </BaseDataViewer>
    )
  }

  // 渲染实时行情数据
  if (dataType === 'ticker') {
    const tickers = (data.tickers as Record<string, unknown>[]) || []

    return (
      <BaseDataViewer data={data} isInferred={isInferred} title="实时行情">
        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>交易对</span>
            <span className={styles.infoValue}>{(data.symbols as string[])?.join(', ') || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>数量</span>
            <span className={styles.infoValue}>{tickers.length} 个</span>
          </div>
        </div>

        {tickers.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>币种</th>
                  <th>最新价</th>
                  <th>24h涨跌</th>
                  <th>24h高</th>
                  <th>24h低</th>
                </tr>
              </thead>
              <tbody>
                {tickers.map((ticker, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{String(ticker.symbol || '-')}</td>
                    <td>${String(ticker.lastPrice || '-')}</td>
                    <td style={{ color: parseFloat(String(ticker.priceChangePercent || 0)) >= 0 ? 'var(--wf-success)' : 'var(--wf-error)' }}>
                      {parseFloat(String(ticker.priceChangePercent || 0)) >= 0 ? '+' : ''}{String(ticker.priceChangePercent || '0')}%
                    </td>
                    <td>${String(ticker.high24h || '-')}</td>
                    <td>${String(ticker.low24h || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BaseDataViewer>
    )
  }

  // 渲染成交历史数据
  if (dataType === 'trade') {
    const trades = (data.trades as Record<string, unknown[]>) || {}
    const symbols = Object.keys(trades)

    return (
      <BaseDataViewer data={data} isInferred={isInferred} title="成交历史">
        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>交易对</span>
            <span className={styles.infoValue}>{(data.symbols as string[])?.join(', ') || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>数量限制</span>
            <span className={styles.infoValue}>{String(data.limit || 50)} 条/币种</span>
          </div>
        </div>

        {symbols.map((symbol) => {
          const tradeList = trades[symbol] || []
          return (
            <div key={symbol} style={{ marginTop: 16 }}>
              <div className={styles.klineSymbol}>{symbol}</div>
              <table className={styles.dataTable} style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>价格</th>
                    <th>数量</th>
                    <th>方向</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeList.slice(0, 10).map((trade: unknown, i: number) => {
                    const t = trade as { time?: number; price?: string; qty?: string; isBuyerMaker?: boolean }
                    return (
                      <tr key={i}>
                        <td>{t.time ? new Date(t.time).toLocaleTimeString() : '-'}</td>
                        <td>${t.price || '-'}</td>
                        <td>{t.qty || '-'}</td>
                        <td style={{ color: t.isBuyerMaker ? 'var(--wf-error)' : 'var(--wf-success)' }}>
                          {t.isBuyerMaker ? '卖出' : '买入'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </BaseDataViewer>
    )
  }

  // 渲染订单簿/深度数据
  if (dataType === 'depth') {
    const depths = (data.depths as Record<string, { bids: [string, string][]; asks: [string, string][] }>) || {}
    const symbols = Object.keys(depths)

    return (
      <BaseDataViewer data={data} isInferred={isInferred} title="订单簿/深度">
        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>交易对</span>
            <span className={styles.infoValue}>{(data.symbols as string[])?.join(', ') || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>深度级别</span>
            <span className={styles.infoValue}>{String(data.levels || 20)} 层</span>
          </div>
        </div>

        {symbols.map((symbol) => {
          const depth = depths[symbol]
          if (!depth) return null
          const { bids, asks } = depth

          return (
            <div key={symbol} style={{ marginTop: 16 }}>
              <div className={styles.klineSymbol}>{symbol}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--wf-success)', marginBottom: 4, fontWeight: 600 }}>买单</div>
                  {bids.slice(0, 5).map((b, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--wf-success)' }}>${b[0]}</span>
                      <span>{b[1]}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--wf-error)', marginBottom: 4, fontWeight: 600 }}>卖单</div>
                  {asks.slice(0, 5).map((a, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--wf-error)' }}>${a[0]}</span>
                      <span>{a[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </BaseDataViewer>
    )
  }

  // 渲染币对信息
  if (dataType === 'info') {
    const infos = (data.infos as Record<string, unknown>[]) || []

    return (
      <BaseDataViewer data={data} isInferred={isInferred} title="币对信息">
        <div className={styles.infoList}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>交易对</span>
            <span className={styles.infoValue}>{(data.symbols as string[])?.join(', ') || '-'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>数量</span>
            <span className={styles.infoValue}>{infos.length} 个</span>
          </div>
        </div>

        {infos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>币种</th>
                  <th>状态</th>
                  <th>价格精度</th>
                  <th>数量精度</th>
                  <th>最小数量</th>
                </tr>
              </thead>
              <tbody>
                {infos.map((info, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{String(info.symbol || '-')}</td>
                    <td>
                      <span style={{
                        color: info.status === 'TRADING' ? 'var(--wf-success)' : 'var(--wf-muted)',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}>
                        {String(info.status || '-')}
                      </span>
                    </td>
                    <td>{String(info.pricePrecision ?? '-')}</td>
                    <td>{String(info.qtyPrecision ?? '-')}</td>
                    <td>{String(info.minQty || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BaseDataViewer>
    )
  }

  // 默认显示原始数据
  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="市场数据">
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>数据类型</span>
          <span className={styles.infoValue}>{dataType}</span>
        </div>
      </div>
    </BaseDataViewer>
  )
}
