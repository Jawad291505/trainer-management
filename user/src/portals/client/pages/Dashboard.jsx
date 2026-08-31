import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, App } from 'antd'
import { MessageOutlined, RightOutlined, FireOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ChartCard from '../../../components/common/ChartCard'
import DonutChart from '../../../components/charts/DonutChart'
import GrowthChart from '../../../components/charts/GrowthChart'
import BarSeriesChart from '../../../components/charts/BarSeriesChart'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import ProgressRing from '../components/ProgressRing'
import TaskItem from '../components/TaskItem'
import {
    currentClient,
    trainer,
    todayTasks,
    getTodayProgress,
    weightProgress,
    weeklyCompletion,
    dietPlan,
    exercisePlan,
} from '../../../services/mockData'
import { getFood } from '../../../services/foodLibrary'
import { computeNutrition } from '../../../utils/nutrition'

const TASK_TYPE_LABELS = {
    meal: 'Meals',
    water: 'Water',
    workout: 'Workout',
    walk: 'Walk',
    sleep: 'Sleep',
}

export default function Dashboard() {
    const navigate = useNavigate()
    const { message } = App.useApp()
    const [loading, setLoading] = useState(true)
    const [tasks, setTasks] = useState(todayTasks)

    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 400)
        return () => clearTimeout(t)
    }, [])

    const progress = getTodayProgress(tasks)

    // Planned calories for the day, derived from the same food library the
    // trainer built the plan from.
    const plannedCalories = dietPlan.meals.reduce(
        (sum, m) =>
            sum +
            m.items.reduce((s, it) => {
                const food = getFood(it.foodId)
                return food ? s + computeNutrition(food, it.qty).cal : s
            }, 0),
        0,
    )
    const todayWorkout = exercisePlan.days.find((d) => d.id === exercisePlan.todayId) || exercisePlan.days[0]

    const taskTypeData = Object.entries(
        tasks.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1
            return acc
        }, {})
    ).map(([type, value]) => ({ name: TASK_TYPE_LABELS[type] || type, value }))

    const toggle = (id) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
    }

    if (loading) return <LoadingSkeleton cards={2} />

    return (
        <div>
            <PageHeader
                title={`Hi ${currentClient.name.split(' ')[0]} 👋`}
                subtitle="Here's what you need to do today."
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Today's progress */}
                <div className="app-card animate-rise flex flex-col items-center justify-center p-6 lg:col-span-1">
                    <ProgressRing value={progress.pct} size={150} sublabel="completed" />
                    <div className="mt-4 text-center">
                        <div className="text-sm font-semibold text-text-primary">
                            {progress.done} of {progress.total} tasks done
                        </div>
                        <div className="text-xs text-text-muted">
                            {progress.pct === 100 ? 'Amazing work today! 🎉' : 'Keep going, you\'ve got this!'}
                        </div>
                    </div>
                </div>

                {/* Trainer card */}
                <div className="app-card animate-rise flex flex-col p-5 lg:col-span-2">
                    <h3 className="section-title mb-4">Your Trainer</h3>
                    <div className="flex items-center gap-4">
                        <UserAvatar name={trainer.name} color={trainer.avatarColor} size={60} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary">{trainer.name}</span>
                                {trainer.online && (
                                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-success)' }} /> Online
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-text-muted">{trainer.specialization}</div>
                            <div className="mt-1 text-xs text-text-secondary">Next follow-up: {trainer.nextFollowUp}</div>
                        </div>
                    </div>
                    <Button type="primary" icon={<MessageOutlined />} className="mt-4" onClick={() => navigate('/messages')}>
                        Message Trainer
                    </Button>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
                        <div>
                            <div className="text-lg font-extrabold text-text-primary">{currentClient.progress}%</div>
                            <div className="text-[11px] text-text-muted">Goal progress</div>
                        </div>
                        <div>
                            <div className="text-lg font-extrabold text-text-primary">{currentClient.weight}kg</div>
                            <div className="text-[11px] text-text-muted">Current</div>
                        </div>
                        <div>
                            <div className="text-lg font-extrabold text-text-primary">{currentClient.target}kg</div>
                            <div className="text-[11px] text-text-muted">Target</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's focus — ties diet + workout together */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                    onClick={() => navigate('/diet')}
                    className="app-card app-card-hover flex items-center justify-between p-5 text-left"
                >
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today's nutrition</div>
                        <div className="mt-1 text-lg font-extrabold text-text-primary">{plannedCalories} kcal planned</div>
                        <div className="text-xs text-text-secondary">{dietPlan.meals.length} meals · {dietPlan.title}</div>
                    </div>
                    <RightOutlined style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <button
                    onClick={() => navigate('/exercises')}
                    className="app-card app-card-hover flex items-center justify-between p-5 text-left"
                >
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today's training</div>
                        <div className="mt-1 text-lg font-extrabold text-text-primary">{todayWorkout.focus}</div>
                        <div className="text-xs text-text-secondary">{todayWorkout.exercises.length} exercises · {exercisePlan.title}</div>
                    </div>
                    <RightOutlined style={{ color: 'var(--color-text-muted)' }} />
                </button>
            </div>

            {/* Progress charts */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Weight Journey" subtitle="Last 8 weeks (kg)">
                    <GrowthChart
                        data={weightProgress}
                        dataKey="weight"
                        xKey="week"
                        name="Weight"
                        height={260}
                    />
                </ChartCard>
                <ChartCard title="Today's Plan" subtitle="Tasks by type">
                    <DonutChart data={taskTypeData} centerLabel="tasks" />
                </ChartCard>
            </div>

            <div className="mt-4">
                <ChartCard title="Weekly Consistency" subtitle="Daily task completion (%)">
                    <BarSeriesChart
                        data={weeklyCompletion}
                        dataKey="pct"
                        xKey="day"
                        name="Completion"
                        domain={[0, 100]}
                        valueFormatter={(v) => `${v}%`}
                        colorFor={(e) =>
                            e.pct >= 80
                                ? 'var(--color-success)'
                                : e.pct >= 60
                                    ? 'var(--color-primary)'
                                    : 'var(--color-warning)'
                        }
                    />
                </ChartCard>
            </div>

            {/* Today's tasks */}
            <div className="app-card mt-6 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="section-title m-0 flex items-center gap-2">
                        <FireOutlined style={{ color: 'var(--color-warning)' }} /> Today's Tasks
                    </h3>
                    <button className="flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => navigate('/schedule')}>
                        Schedule <RightOutlined style={{ fontSize: 11 }} />
                    </button>
                </div>
                <div className="flex flex-col gap-2.5">
                    {tasks.map((t) => (
                        <TaskItem key={t.id} task={t} onToggle={toggle} />
                    ))}
                </div>
            </div>
        </div>
    )
}
