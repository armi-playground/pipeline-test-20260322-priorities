use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
struct Task {
    id: String,
    title: String,
    description: String,
    completed: bool,
}

#[derive(Deserialize)]
struct CreateTask {
    title: String,
    description: String,
}

type AppState = Arc<Mutex<Vec<Task>>>;

#[tokio::main]
async fn main() {
    let state: AppState = Arc::new(Mutex::new(vec![
        Task {
            id: Uuid::new_v4().to_string(),
            title: "Set up CI/CD".to_string(),
            description: "Configure GitHub Actions for automated testing and deployment".to_string(),
            completed: false,
        },
        Task {
            id: Uuid::new_v4().to_string(),
            title: "Write API docs".to_string(),
            description: "Document all API endpoints with request/response examples".to_string(),
            completed: false,
        },
    ]));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(root))
        .route("/tasks", get(list_tasks).post(create_task))
        .route("/tasks/{id}", get(get_task).delete(delete_task))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("Backend running on http://localhost:3001");
    axum::serve(listener, app).await.unwrap();
}

async fn root() -> &'static str {
    "Welcome to TaskFlow API"
}

async fn list_tasks(State(state): State<AppState>) -> Json<Vec<Task>> {
    let tasks = state.lock().unwrap();
    Json(tasks.clone())
}

async fn create_task(
    State(state): State<AppState>,
    Json(input): Json<CreateTask>,
) -> (StatusCode, Json<Task>) {
    let task = Task {
        id: Uuid::new_v4().to_string(),
        title: input.title,
        description: input.description,
        completed: false,
    };
    let mut tasks = state.lock().unwrap();
    tasks.push(task.clone());
    (StatusCode::CREATED, Json(task))
}

async fn get_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Task>, StatusCode> {
    let tasks = state.lock().unwrap();
    tasks
        .iter()
        .find(|t| t.id == id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn delete_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> StatusCode {
    let mut tasks = state.lock().unwrap();
    let len = tasks.len();
    tasks.retain(|t| t.id != id);
    if tasks.len() < len {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}
