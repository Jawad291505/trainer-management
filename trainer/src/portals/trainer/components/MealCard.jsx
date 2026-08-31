import { ClockCircleOutlined } from '@ant-design/icons'
import { mealGL, glMealLevel } from '../../../utils/nutrition'
import GlycemicBadge from './GlycemicBadge'

// Formats an item quantity with its unit (e.g. "150g", "2", "250ml").
function qtyLabel(it) {
    if (!it.unit || it.unit === 'count') return `${it.qty}`
    return `${it.qty}${it.unit}`
}

// Displays a single meal with its food items and macro totals.
export default function MealCard({ meal }) {
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
        <div className="app-card flex flex-col p-5">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-bold text-text-primary">{meal.name}</div>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                        <ClockCircleOutlined /> {meal.time}
                    </div>
                </div>
                <div className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    {totals.cal} kcal
                </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
                {meal.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                        <span className="font-medium text-text-primary">{it.food}</span>
                        <span className="text-text-muted">{qtyLabel(it)}</span>
                    </div>
                ))}
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

            {meal.notes && (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                    {meal.notes}
                </div>
            )}
        </div>
    )
}
