use axum::{
    extract::Query,
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;
use chrono::Utc;

#[derive(Clone, Serialize, Deserialize, PartialEq, Default, Debug)]
#[serde(rename_all = "lowercase")]
enum Priority {
    #[default]
    Medium,
    High,
    Low,
}

impl Priority {
    fn from_str(s: &str) -> Option<Priority> {
        match s.to_lowercase().as_str() {
            "high" => Some(Priority::High),
            "medium" => Some(Priority::Medium),
            "low" => Some(Priority::Low),
            _ => None,
        }
    }

    fn sort_order(&self) -> i32 {
        match self {
            Priority::High => 0,
            Priority::Medium => 1,
            Priority::Low => 2,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
struct Task {
    id: String,
    title: String,
    description: String,
    completed: bool,
    priority: Priority,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Deserialize)]
struct CreateTask {
    title: String,
    description: Option<String>,
    #[serde(default)]
    priority: Option<String>,
}

#[derive(Deserialize)]
struct ListTasksQuery {
    priority: Option<String>,
    sort: Option<String>,
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
            priority: Priority::Medium,
            created_at: Utc::now().to_rfc3339(),
        },
        Task {
            id: Uuid::new_v4().to_string(),
            title: "Write API docs".to_string(),
            description: "Document all API endpoints with request/response examples".to_string(),
            completed: false,
            priority: Priority::High,
            created_at: Utc::now().to_rfc3339(),
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

async fn list_tasks(
    State(state): State<AppState>,
    Query(query): Query<ListTasksQuery>,
) -> Json<Vec<Task>> {
    let mut tasks = state.lock().unwrap().clone();

    // Filter by priority if specified
    if let Some(ref priority_str) = query.priority
        && let Some(priority) = Priority::from_str(priority_str) {
        tasks.retain(|t| t.priority == priority);
    }

    // Sort tasks
    let sort_by = query.sort.as_deref().unwrap_or("priority");
    match sort_by {
        "created_at" => {
            tasks.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        }
        _ => {
            // Default: sort by priority (high first), then by createdAt descending
            tasks.sort_by(|a, b| {
                let priority_cmp = a.priority.sort_order().cmp(&b.priority.sort_order());
                if priority_cmp == std::cmp::Ordering::Equal {
                    b.created_at.cmp(&a.created_at)
                } else {
                    priority_cmp
                }
            });
        }
    }

    Json(tasks)
}

async fn create_task(
    State(state): State<AppState>,
    Json(input): Json<CreateTask>,
) -> Result<(StatusCode, Json<Task>), (StatusCode, Json<ErrorResponse>)> {
    // Parse and validate priority if provided
    let priority = match input.priority {
        Some(ref p) => {
            Priority::from_str(p).ok_or((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Invalid priority value. Must be: high, medium, or low".to_string(),
                }),
            ))?
        }
        None => Priority::Medium,
    };

    let task = Task {
        id: Uuid::new_v4().to_string(),
        title: input.title,
        description: input.description.unwrap_or_default(),
        completed: false,
        priority,
        created_at: Utc::now().to_rfc3339(),
    };

    let mut tasks = state.lock().unwrap();
    tasks.push(task.clone());

    Ok((StatusCode::CREATED, Json(task)))
}

async fn get_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Task>, (StatusCode, Json<ErrorResponse>)> {
    let tasks = state.lock().unwrap();
    tasks
        .iter()
        .find(|t| t.id == id)
        .cloned()
        .map(Json)
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Task not found".to_string(),
            }),
        ))
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

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_priority_from_str_valid() {
        assert_eq!(Priority::from_str("high"), Some(Priority::High));
        assert_eq!(Priority::from_str("medium"), Some(Priority::Medium));
        assert_eq!(Priority::from_str("low"), Some(Priority::Low));
    }

    #[test]
    fn test_priority_from_str_case_insensitive() {
        assert_eq!(Priority::from_str("HIGH"), Some(Priority::High));
        assert_eq!(Priority::from_str("Medium"), Some(Priority::Medium));
        assert_eq!(Priority::from_str("LOW"), Some(Priority::Low));
    }

    #[test]
    fn test_priority_from_str_invalid() {
        assert_eq!(Priority::from_str("invalid"), None);
        assert_eq!(Priority::from_str(""), None);
        assert_eq!(Priority::from_str("critical"), None);
    }

    #[test]
    fn test_priority_default() {
        assert_eq!(Priority::default(), Priority::Medium);
    }

    #[test]
    fn test_priority_sort_order() {
        assert_eq!(Priority::High.sort_order(), 0);
        assert_eq!(Priority::Medium.sort_order(), 1);
        assert_eq!(Priority::Low.sort_order(), 2);
    }

    #[test]
    fn test_priority_ordering() {
        // High should sort before Medium, Medium before Low
        assert!(Priority::High.sort_order() < Priority::Medium.sort_order());
        assert!(Priority::Medium.sort_order() < Priority::Low.sort_order());
    }

    #[test]
    fn test_task_default_priority() {
        let task = Task {
            id: "test-id".to_string(),
            title: "Test Task".to_string(),
            description: "Test description".to_string(),
            completed: false,
            priority: Priority::default(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        assert_eq!(task.priority, Priority::Medium);
    }
}
