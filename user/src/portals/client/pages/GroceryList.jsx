import { useCallback, useEffect, useState } from 'react'
import { Button, App } from 'antd'
import { ReloadOutlined, ShoppingOutlined, ClockCircleOutlined, CopyOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { useAuth } from '../../../context/AuthContext'
import { getGroceryList, refreshGroceryList } from '../../../services/groceryList'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRefreshedAt(d) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Plain-text version for the clipboard — a real shopping list you could paste
// into notes or a messaging app.
function buildPlainText(list) {
  const lines = [`Grocery List (${formatDate(list.windowStart)} – ${formatDate(list.windowEnd)})`, '']
  list.groups.forEach((group) => {
    lines.push(group.category.toUpperCase())
    group.items.forEach((item) => lines.push(`- ${item.name} — ${item.qtyLabel}`))
    lines.push('')
  })
  return lines.join('\n').trim()
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch { /* fall through to legacy path */ }
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export default function GroceryList() {
  const { message } = App.useApp()
  const { client } = useAuth()
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const clientId = client?._id || client?.id

  const load = useCallback(() => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    getGroceryList(clientId)
      .then(setList)
      .catch((err) => setError(err.message || 'No diet plan assigned yet'))
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { load() }, [load])

  const refresh = async () => {
    if (!clientId || refreshing) return
    setRefreshing(true)
    try {
      const updated = await refreshGroceryList(clientId)
      setList(updated)
      message.success('Grocery list refreshed')
    } catch (err) {
      message.error(err.message || 'Failed to refresh — please try again')
    } finally {
      setRefreshing(false)
    }
  }

  const copyList = async () => {
    if (!list) return
    const ok = await copyText(buildPlainText(list))
    if (ok) message.success('Grocery list copied to clipboard')
    else message.error('Could not copy — please copy manually')
  }

  if (loading) return <LoadingSkeleton cards={3} rows={4} />

  return (
    <div>
      <PageHeader title="Grocery List" subtitle="Auto-generated from your diet plan for the next 7 days.">
        <Button icon={<CopyOutlined />} onClick={copyList} disabled={!list || !list.groups?.length}>
          Copy to clipboard
        </Button>
        <Button icon={<ReloadOutlined />} loading={refreshing} onClick={refresh} disabled={!list}>
          Refresh Grocery List
        </Button>
      </PageHeader>

      {error || !list ? (
        <div className="app-card">
          <EmptyState
            icon={<ShoppingOutlined />}
            title="No grocery list yet"
            description={error || 'Once your trainer publishes a diet plan, your grocery list will appear here.'}
          />
        </div>
      ) : (
        <>
          <div className="app-card mb-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-text-primary">
              {formatDate(list.windowStart)} – {formatDate(list.windowEnd)}
              <span className="ml-2 text-xs font-normal text-text-muted">(7 days)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <ClockCircleOutlined /> Last refreshed: {formatRefreshedAt(list.refreshedAt)}
            </div>
          </div>

          {list.groups.length === 0 ? (
            <div className="app-card">
              <EmptyState
                icon={<ShoppingOutlined />}
                title="Nothing to shop for"
                description="Your plan for this window doesn't have any meals with foods yet."
              />
            </div>
          ) : (
            <div className="app-card p-5">
              {list.groups.map((group, gi) => (
                <div
                  key={group.category}
                  className={gi > 0 ? 'mt-5 border-t pt-5' : ''}
                  style={gi > 0 ? { borderColor: 'var(--color-border)' } : undefined}
                >
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                    {group.category}
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {group.items.map((item) => (
                      <li key={item.foodCode} className="flex items-baseline gap-2 text-sm">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: 'var(--color-text-muted)' }}
                        />
                        <span className="font-medium text-text-primary">{item.name}</span>
                        <span
                          className="min-w-[16px] flex-1 border-b border-dotted"
                          style={{ borderColor: 'var(--color-border-strong)' }}
                        />
                        <span className="shrink-0 text-text-muted">{item.qtyLabel}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
