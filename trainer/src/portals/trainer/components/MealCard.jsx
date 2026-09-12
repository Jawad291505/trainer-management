import { ClockCircleOutlined, FireOutlined, CheckCircleFilled } from '@ant-design/icons'
import { mealGL, glMealLevel } from '../../../utils/nutrition'
import GlycemicBadge from './GlycemicBadge'

// Formats an item quantity with its unit (e.g. "150g", "2", "250ml").
function qtyLabel(it) {
    if (!it.unit || it.unit === 'count') return `${it.qty}`
    return `${it.qty}${it.unit}`
}

// Displays a single meal with its food items and macro totals.
export default function MealCard({ meal, cheat, done, itemsDone }) {
    const hasItemDetail = Array.isArray(itemsDone) && itemsDone.length === meal.items.length
    const itemsEaten = hasItemDetail ? itemsDone.filter(Boolean).length : 0
    const totals = meal.items.reduce(
        (acc, it) => ({
            cal: acc.cal + it.cal,
            protein: Math.round((acc.protein + it.protein) * 10) / 10,
            carbs: Math.round((acc.carbs + it.carbs) * 10) / 10,
            fat: Math.round((acc.fat + it.fat) * 10) / 10,
        }),
        { cal: 0, protein: 0, carbs: 0, fat: 0 },
    )
    const gl = mealGL(meal.items)
    const glLevel = glMealLevel(gl)

    return (
        <div className="app-card flex flex-col p-5" style={cheat ? { borderColor: 'var(--color-warning)' } : done ? { borderColor: 'var(--color-success)' } : undefined}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        {done && !cheat && <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 16 }} />}
                        <span className="font-bold text-text-primary">{meal.name}</span>
                        {cheat && (
                            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                                <FireOutlined /> Cheat
                            </span>
                        )}
                        {done && !cheat && (
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                                Completed
                            </span>
                        )}
                        {!done && !cheat && hasItemDetail && itemsEaten > 0 && (
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                                {itemsEaten}/{meal.items.length} items
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                        <ClockCircleOutlined /> {meal.time}
                    </div>
                </div>
                <div className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    {totals.cal} kcal
                </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
                {meal.items.map((it, i) => {
                    const eaten = hasItemDetail ? !!itemsDone[i] : null
                    return (
                        <div
                            key={i}
                            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                            style={{ background: eaten ? 'var(--color-success-soft)' : 'var(--color-surface-secondary)' }}
                        >
                            <span className="flex items-center gap-2 font-medium text-text-primary">
                                {eaten !== null && (
                                    eaten
                                        ? <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 13 }} />
                                        : <span className="inline-block h-3 w-3 rounded-full border" style={{ borderColor: 'var(--color-border-strong)' }} />
                                )}
                                {it.food || it.name}
                            </span>
                            <span className="text-text-muted">{qtyLabel(it)}</span>
                        </div>
                    )
                })}
            </div>

            {meal.items.length > 0 && (
                <div className="mt-3 flex items-center justify-end">
                    <GlycemicBadge type="Meal GL" value={gl} level={glLevel} />
                </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                    <div className="text-sm font-bold text-text-primary">{totals.protein}g</div>
                    <div className="text-[11px] text-text-muted">Protein</div>
                </div>
                <div>
                    <div className="text-sm font-bold text-text-primary">{totals.carbs}g</div>
                    <div className="text-[11px] text-text-muted">Carbs</div>
                </div>
                <div>
                    <div className="text-sm font-bold text-text-primary">{totals.fat}g</div>
                    <div className="text-[11px] text-text-muted">Fats</div>
                </div>
            </div>

            {cheat && (
                <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--color-warning-soft)' }}>
                    {cheat.note && <div className="text-xs text-text-secondary">{cheat.note}</div>}
                    {cheat.items?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {cheat.items.map((item, i) => (
                                <span key={i} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                    {!cheat.note && !cheat.items?.length && (
                        <div className="text-xs text-text-muted">Client marked this as a cheat meal (no details provided)</div>
                    )}
                </div>
            )}

            {meal.notes && (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                    {meal.notes}
                </div>
            )}
        </div>
    )
}
