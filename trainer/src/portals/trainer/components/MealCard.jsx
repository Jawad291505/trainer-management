import { ClockCircleOutlined } from '@ant-design/icons'
import { formatQty } from '../../../utils/foodScale'

// Displays a single meal with its food items and macro totals.
export default function MealCard({ meal, onEdit }) {
    const totals = meal.items.reduce(
        (acc, it) => ({
            cal: acc.cal + it.cal,
            protein: acc.protein + it.protein,
            carbs: acc.carbs + it.carbs,
            fat: acc.fat + it.fat,
        }),
        { cal: 0, protein: 0, carbs: 0, fat: 0 },
    )

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
                        <span className="text-text-muted">{formatQty(it)}</span>
                    </div>
                ))}
            </div>

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
