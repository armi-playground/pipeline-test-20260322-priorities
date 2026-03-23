import { useEffect, useState } from 'react'

interface Task {
  id: string
  title: string
  description: string
  completed: boolean
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetch('/tasks')
      .then((r) => r.json())
      .then(setTasks)
  }, [])

  const addTask = async () => {
    if (!title.trim()) return
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    const task = await res.json()
    setTasks([...tasks, task])
    setTitle('')
    setDescription('')
  }

  const deleteTask = async (id: string) => {
    await fetch(`/tasks/${id}`, { method: 'DELETE' })
    setTasks(tasks.filter((t) => t.id !== id))
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>TaskFlow</h1>
      <div style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <button onClick={addTask} style={{ padding: '0.5rem 1rem' }}>
          Add Task
        </button>
      </div>
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
            <div>
              <strong>{task.title}</strong>
              <p style={{ margin: '0.25rem 0 0', color: '#666' }}>{task.description}</p>
            </div>
            <button onClick={() => deleteTask(task.id)} style={{ color: 'red', cursor: 'pointer' }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
