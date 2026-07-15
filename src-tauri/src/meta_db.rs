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
    pub updated_at: String,
    pub last_opened_at: Option<String>,
    pub sort_order: f64,
}

pub fn init_meta(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS vaults (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            path        TEXT NOT NULL UNIQUE,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )?;
    let _ = conn.execute(
        "ALTER TABLE vaults ADD COLUMN last_opened_at TEXT",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE vaults ADD COLUMN updated_at TEXT",
        [],
    );
    let _ = conn.execute(
        "UPDATE vaults SET updated_at = created_at WHERE updated_at IS NULL",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE vaults ADD COLUMN sort_order REAL NOT NULL DEFAULT 0",
        [],
    );
    Ok(())
}

pub fn insert_vault(
    conn: &Connection,
    name: &str,
    path: &str,
) -> Result<i64, rusqlite::Error> {
    conn.execute(
        "INSERT INTO vaults (name, path, updated_at) VALUES (?1, ?2, datetime('now'))",
        params![name, path],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn list_vaults(conn: &Connection) -> Result<Vec<VaultInfo>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, path, created_at, updated_at, last_opened_at, sort_order FROM vaults ORDER BY sort_order ASC, created_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(VaultInfo {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            last_opened_at: row.get(5)?,
            sort_order: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn get_vault(conn: &Connection, id: i64) -> Option<VaultInfo> {
    conn.query_row(
        "SELECT id, name, path, created_at, updated_at, last_opened_at, sort_order FROM vaults WHERE id = ?1",
        params![id],
        |row| {
            Ok(VaultInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                last_opened_at: row.get(5)?,
                sort_order: row.get(6)?,
            })
        },
    )
    .ok()
}

pub fn touch_vault(conn: &Connection, id: i64) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE vaults SET last_opened_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn rename_vault(
    conn: &Connection,
    id: i64,
    new_name: &str,
) -> Result<VaultInfo, rusqlite::Error> {
    conn.execute(
        "UPDATE vaults SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![new_name, id],
    )?;
    get_vault(conn, id).ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn delete_vault(conn: &Connection, id: i64) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM vaults WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn reorder_vaults(conn: &Connection, orders: &[(i64, f64)]) -> Result<(), rusqlite::Error> {
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare("UPDATE vaults SET sort_order = ?1 WHERE id = ?2")?;
        for (id, order) in orders {
            stmt.execute(params![order, id])?;
        }
    }
    tx.commit()
}
