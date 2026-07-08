use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct MetaDb {
    pub conn: Mutex<Connection>,
}

impl MetaDb {
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            conn: Mutex::new(
                Connection::open(path.into()).expect("failed to open meta database"),
            ),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VaultInfo {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub created_at: String,
}

pub fn init_meta(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS vaults (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            path        TEXT NOT NULL UNIQUE,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )
}

pub fn insert_vault(
    conn: &Connection,
    name: &str,
    path: &str,
) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO vaults (name, path) VALUES (?1, ?2)",
        params![name, path],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn list_vaults(conn: &Connection) -> Result<Vec<VaultInfo>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, path, created_at FROM vaults ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(VaultInfo {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn get_vault(conn: &Connection, id: i64) -> Option<VaultInfo> {
    conn.query_row(
        "SELECT id, name, path, created_at FROM vaults WHERE id = ?1",
        params![id],
        |row| {
            Ok(VaultInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
            })
        },
    )
    .ok()
}

pub fn rename_vault(
    conn: &Connection,
    id: i64,
    new_name: &str,
) -> Result<VaultInfo, rusqlite::Error> {
    conn.execute(
        "UPDATE vaults SET name = ?1 WHERE id = ?2",
        params![new_name, id],
    )?;
    get_vault(conn, id).ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn delete_vault(conn: &Connection, id: i64) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM vaults WHERE id = ?1", params![id])?;
    Ok(())
}
