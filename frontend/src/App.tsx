import { useEffect, useState } from 'react'

type Priority = 'high' | 'medium' | 'low'
type SortOrder = 'priority' | 'created_at'
type FilterPriority = Priority | 'all'

interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  priority: Priority
  createdAt: string
}

const priorityConfig: Record<Priority, { bg: string; text: string; border: string; label: string }> = {
  high: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', label: 'HIGH' },
  medium: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', label: 'MEDIUM' },
  low: { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0', label: 'LOW' },
}

const filterDotColors: Record<Priority | 'all', string> = {
  high: '#DC2626',
  medium: '#D97706',
  low: '#059669',
  all: 'transparent',
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        borderRadius: 4,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        fontSize: 11,
        fontWeight: 600,
        color: config.text,
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: config.text,
        }}
      />
      {config.label}
    </span>
  )
}

function FilterBar({
  filter,
  onFilterChange,
}: {
  filter: FilterPriority
  onFilterChange: (f: FilterPriority) => void
}) {
  const filters: { value: FilterPriority; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        marginBottom: '1rem',
      }}
      role="radiogroup"
      aria-label="Filter tasks by priority"
    >
      {filters.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onFilterChange(filter === value ? 'all' : value)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            border: 'none',
            borderRadius: 6,
            backgroundColor: filter === value ? 'white' : 'transparent',
            color: filter === value ? '#111827' : '#6B7280',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: filter === value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.15s ease',
          }}
          role="radio"
          aria-checked={filter === value}
        >
          {value !== 'all' && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: filterDotColors[value],
              }}
            />
          )}
          {label}
        </button>
      ))}
    </div>
  )
}

function SortToggle({
  sort,
  onSortChange,
}: {
  sort: SortOrder
  onSortChange: (s: SortOrder) => void
}) {
  return (
    <button
      onClick={() => onSortChange(sort === 'priority' ? 'created_at' : 'priority')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        border: '1px solid #D1D5DB',
        borderRadius: 6,
        backgroundColor: 'white',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        color: '#374151',
      }}
      aria-pressed={sort === 'priority'}
      title={sort === 'priority' ? 'Sorted by priority' : 'Sorted by recent'}
    >
      {sort === 'priority' ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h10M4 18h6" />
          </svg>
          Priority
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Recent
        </>
      )}
    </button>
  )
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [filter, setFilter] = useState<FilterPriority>('all')
  const [sort, setSort] = useState<SortOrder>('priority')

  const buildUrl = () => {
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('priority', filter)
    if (sort !== 'priority') params.set('sort', sort)
    const query = params.toString()
    return `/tasks${query ? `?${query}` : ''}`
  }

  useEffect(() => {
    fetch(buildUrl())
      .then((r) => r.json())
      .then(setTasks)
  }, [filter, sort])

  const addTask = async () => {
    if (!title.trim()) return
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority }),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks([...tasks, task])
      setTitle('')
      setDescription('')
      setPriority('medium')
    }
  }

  const deleteTask = async (id: string) => {
    await fetch(`/tasks/${id}`, { method: 'DELETE' })
    setTasks(tasks.filter((t) => t.id !== id))
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Tasks</h1>
        <SortToggle sort={sort} onSortChange={setSort} />
      </div>

      <FilterBar filter={filter} onFilterChange={setFilter} />

      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#FAFAFA', borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Create Task</h2>
        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6, boxSizing: 'border-box' }}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6, boxSizing: 'border-box', resize: 'vertical', minHeight: 60 }}
        />
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              backgroundColor: 'white',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <button onClick={addTask} style={{ padding: '0.5rem 1rem', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
          Create Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
          {filter !== 'all' ? `No ${filter} priority tasks` : 'No tasks yet'}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '1rem',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PriorityBadge priority={task.priority} />
                <div>
                  <strong>{task.title}</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: 14 }}>{task.description}</p>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} style={{ color: 'red', cursor: 'pointer', background: 'none', border: 'none', fontSize: 14 }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
