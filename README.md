# TaskFlow

A simple task management app with a Rust (Axum) API backend and React (TypeScript) frontend.

## Backend

```bash
cd backend
cargo run
# Runs on http://localhost:3001
```

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome message |
| GET | `/tasks` | List all tasks |
| POST | `/tasks` | Create a task `{ "title": "...", "description": "..." }` |
| GET | `/tasks/:id` | Get a single task |
| DELETE | `/tasks/:id` | Delete a task |

## Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Tech Stack

- **Backend:** Rust, Axum 0.8, Tokio, Serde
- **Frontend:** React 19, TypeScript, Vite
