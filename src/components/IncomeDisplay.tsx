/**
 * Income display renderer (ticket #198): the kingdom's current passive income.
 * The server recomputes `incomePerTick` whenever citizens or production
 * modifiers change, so this display updates automatically with each sync.
 * Shown per second (tick income × tick rate) for readability.
 */
export function IncomeDisplay({
  incomePerTick,
  tickRate,
}: {
  incomePerTick: number
  tickRate: number
}) {
  const perSecond = incomePerTick * tickRate
  return (
    <g className="income-display" data-testid="income" data-income={incomePerTick}>
      <title>{`$${incomePerTick.toFixed(2)} per tick`}</title>
      <text y={6} className="battlefield__stat-text battlefield__stat-text--income">
        {`$${perSecond.toFixed(2)}/s`}
      </text>
    </g>
  )
}
