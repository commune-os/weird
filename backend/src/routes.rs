use axum::extract::Path;
use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};

use crate::{AppResult, AppState};

mod db;
mod profile;

pub fn install(router: Router<AppState>) -> Router<AppState> {
    profile::install(db::install(router))
}
