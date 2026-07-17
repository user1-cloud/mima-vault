use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

use crate::crypto::VaultConfig;

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub vault_id: Mutex<Option<i64>>,
}

impl DbState {
    pub fn new_empty() -> Self {
        Self {
            conn: Mutex::new(None),
            vault_id: Mutex::new(None),
        }
    }

    pub fn open_vault(&self, path: &Path) -> Result<(), String> {
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS vault_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                salt BLOB NOT NULL,
                encrypted_vault_key BLOB NOT NULL,
                vault_key_nonce BLOB NOT NULL
            );

            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name_nonce BLOB NOT NULL,
                name_cipher BLOB NOT NULL,
                username_nonce BLOB NOT NULL,
                username_cipher BLOB NOT NULL,
                password_nonce BLOB NOT NULL,
                password_cipher BLOB NOT NULL,
                url_nonce BLOB,
                url_cipher BLOB,
                notes_nonce BLOB,
                notes_cipher BLOB,
                totp_nonce BLOB,
                totp_cipher BLOB,
                sort_order REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_entries_sort ON entries(sort_order ASC);"
        ).map_err(|e| e.to_string())?;

        let _ = conn.execute("ALTER TABLE entries ADD COLUMN sort_order REAL NOT NULL DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE entries ADD COLUMN totp_nonce BLOB", []);
        let _ = conn.execute("ALTER TABLE entries ADD COLUMN totp_cipher BLOB", []);
        let _ = conn.execute("ALTER TABLE entries ADD COLUMN tags_nonce BLOB", []);
        let _ = conn.execute("ALTER TABLE entries ADD COLUMN tags_cipher BLOB", []);
        let _ = conn.execute("ALTER TABLE entries ADD COLUMN custom_nonce BLOB", []);
        let _ = conn.execute("ALTER TABLE entries ADD COLUMN custom_cipher BLOB", []);

        let mut guard = self.conn.lock().map_err(|e| e.to_string())?;
        *guard = Some(conn);
        Ok(())
    }

    pub fn close_vault(&self) {
        if let Ok(mut guard) = self.conn.lock() {
            *guard = None;
        }
        if let Ok(mut guard) = self.vault_id.lock() {
            *guard = None;
        }
    }
}

pub fn save_vault_config(conn: &Connection, config: &VaultConfig) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM vault_config", [])?;
    conn.execute(
        "INSERT INTO vault_config (id, salt, encrypted_vault_key, vault_key_nonce) VALUES (1, ?1, ?2, ?3)",
        params![config.salt, config.encrypted_vault_key, config.vault_key_nonce],
    )?;
    Ok(())
}

pub fn load_vault_config(conn: &Connection) -> Option<VaultConfig> {
    conn.query_row(
        "SELECT salt, encrypted_vault_key, vault_key_nonce FROM vault_config WHERE id = 1",
        [],
        |row| {
            Ok(VaultConfig {
                salt: row.get(0)?,
                encrypted_vault_key: row.get(1)?,
                vault_key_nonce: row.get(2)?,
            })
        },
    )
    .ok()
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EntryRow {
    pub id: i64,
    pub name_nonce: Vec<u8>,
    pub name_cipher: Vec<u8>,
    pub username_nonce: Vec<u8>,
    pub username_cipher: Vec<u8>,
    pub password_nonce: Vec<u8>,
    pub password_cipher: Vec<u8>,
    pub url_nonce: Option<Vec<u8>>,
    pub url_cipher: Option<Vec<u8>>,
    pub notes_nonce: Option<Vec<u8>>,
    pub notes_cipher: Option<Vec<u8>>,
    pub totp_nonce: Option<Vec<u8>>,
    pub totp_cipher: Option<Vec<u8>>,
    pub tags_nonce: Option<Vec<u8>>,
    pub tags_cipher: Option<Vec<u8>>,
    pub custom_nonce: Option<Vec<u8>>,
    pub custom_cipher: Option<Vec<u8>>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

pub fn insert_entry(
    conn: &Connection,
    name: (&[u8], &[u8]),
    username: (&[u8], &[u8]),
    password: (&[u8], &[u8]),
    url: Option<(&[u8], &[u8])>,
    notes: Option<(&[u8], &[u8])>,
    totp: Option<(&[u8], &[u8])>,
    tags: Option<(&[u8], &[u8])>,
    custom: Option<(&[u8], &[u8])>,
) -> Result<i64, rusqlite::Error> {
    let min_order: f64 = conn
        .query_row(
            "SELECT COALESCE(MIN(sort_order), 0) FROM entries",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);
    let new_order = min_order - 1000.0;

    conn.execute(
        "INSERT INTO entries (name_nonce, name_cipher, username_nonce, username_cipher,
         password_nonce, password_cipher, url_nonce, url_cipher, notes_nonce, notes_cipher,
         totp_nonce, totp_cipher, tags_nonce, tags_cipher, custom_nonce, custom_cipher, sort_order)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            name.0, name.1,
            username.0, username.1,
            password.0, password.1,
            url.as_ref().map(|u| u.0), url.as_ref().map(|u| u.1),
            notes.as_ref().map(|n| n.0), notes.as_ref().map(|n| n.1),
            totp.as_ref().map(|t| t.0), totp.as_ref().map(|t| t.1),
            tags.as_ref().map(|t| t.0), tags.as_ref().map(|t| t.1),
            custom.as_ref().map(|c| c.0), custom.as_ref().map(|c| c.1),
            new_order,
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_entry(
    conn: &Connection,
    id: i64,
    name: (&[u8], &[u8]),
    username: (&[u8], &[u8]),
    password: (&[u8], &[u8]),
    url: Option<(&[u8], &[u8])>,
    notes: Option<(&[u8], &[u8])>,
    totp: Option<(&[u8], &[u8])>,
    tags: Option<(&[u8], &[u8])>,
    custom: Option<(&[u8], &[u8])>,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "UPDATE entries SET name_nonce=?1, name_cipher=?2, username_nonce=?3, username_cipher=?4,
         password_nonce=?5, password_cipher=?6, url_nonce=?7, url_cipher=?8, notes_nonce=?9,
         notes_cipher=?10, totp_nonce=?11, totp_cipher=?12, tags_nonce=?14, tags_cipher=?15,
         custom_nonce=?16, custom_cipher=?17, updated_at=datetime('now') WHERE id=?13",
        params![
            name.0, name.1,
            username.0, username.1,
            password.0, password.1,
            url.as_ref().map(|u| u.0), url.as_ref().map(|u| u.1),
            notes.as_ref().map(|n| n.0), notes.as_ref().map(|n| n.1),
            totp.as_ref().map(|t| t.0), totp.as_ref().map(|t| t.1),
            id,
            tags.as_ref().map(|t| t.0), tags.as_ref().map(|t| t.1),
            custom.as_ref().map(|c| c.0), custom.as_ref().map(|c| c.1),
        ],
    )?;
    Ok(())
}

pub fn delete_entry(conn: &Connection, id: i64) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM entries WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn reorder_entries(conn: &Connection, orders: &[(i64, f64)]) -> Result<(), rusqlite::Error> {
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare("UPDATE entries SET sort_order = ?1 WHERE id = ?2")?;
        for (id, order) in orders {
            stmt.execute(params![order, id])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn fetch_entry(conn: &Connection, id: i64) -> Option<EntryRow> {
    conn.query_row(
        "SELECT id, name_nonce, name_cipher, username_nonce, username_cipher,
         password_nonce, password_cipher, url_nonce, url_cipher, notes_nonce, notes_cipher,
         totp_nonce, totp_cipher, tags_nonce, tags_cipher, custom_nonce, custom_cipher, sort_order, created_at, updated_at FROM entries WHERE id = ?1",
        params![id],
        |row| {
            Ok(EntryRow {
                id: row.get(0)?,
                name_nonce: row.get(1)?,
                name_cipher: row.get(2)?,
                username_nonce: row.get(3)?,
                username_cipher: row.get(4)?,
                password_nonce: row.get(5)?,
                password_cipher: row.get(6)?,
                url_nonce: row.get(7)?,
                url_cipher: row.get(8)?,
                notes_nonce: row.get(9)?,
                notes_cipher: row.get(10)?,
                totp_nonce: row.get(11)?,
                totp_cipher: row.get(12)?,
                tags_nonce: row.get(13)?,
                tags_cipher: row.get(14)?,
                custom_nonce: row.get(15)?,
                custom_cipher: row.get(16)?,
                sort_order: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        },
    )
    .ok()
}

pub fn fetch_all_entries(conn: &Connection) -> Vec<EntryRow> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name_nonce, name_cipher, username_nonce, username_cipher,
             password_nonce, password_cipher, url_nonce, url_cipher, notes_nonce, notes_cipher,
             totp_nonce, totp_cipher, tags_nonce, tags_cipher, custom_nonce, custom_cipher, sort_order, created_at, updated_at FROM entries ORDER BY sort_order ASC",
        )
        .unwrap();
    let rows = stmt
        .query_map([], |row| {
            Ok(EntryRow {
                id: row.get(0)?,
                name_nonce: row.get(1)?,
                name_cipher: row.get(2)?,
                username_nonce: row.get(3)?,
                username_cipher: row.get(4)?,
                password_nonce: row.get(5)?,
                password_cipher: row.get(6)?,
                url_nonce: row.get(7)?,
                url_cipher: row.get(8)?,
                notes_nonce: row.get(9)?,
                notes_cipher: row.get(10)?,
                totp_nonce: row.get(11)?,
                totp_cipher: row.get(12)?,
                tags_nonce: row.get(13)?,
                tags_cipher: row.get(14)?,
                custom_nonce: row.get(15)?,
                custom_cipher: row.get(16)?,
                sort_order: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        })
        .unwrap();
    rows.filter_map(|r| r.ok()).collect()
}
