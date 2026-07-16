use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tauri::Manager;

use crate::crypto;
use crate::db::{self, DbState};
use crate::meta_db::{self, MetaDb, VaultInfo};

pub struct VaultKey(pub Mutex<Option<[u8; 32]>>);

impl VaultKey {
    pub fn with<T>(&self, f: impl FnOnce(&[u8; 32]) -> T) -> Result<T, String> {
        let guard = self.0.lock().map_err(|e| e.to_string())?;
        guard.as_ref().map(f).ok_or_else(|| "Vault is locked".into())
    }
}

// ─── Vault management ───

#[tauri::command]
pub fn list_vaults(meta: State<'_, MetaDb>) -> Result<Vec<VaultInfo>, String> {
    let conn = meta.conn.lock().map_err(|e| e.to_string())?;
    meta_db::list_vaults(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_vault(
    app: tauri::AppHandle,
    meta: State<'_, MetaDb>,
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    name: String,
    master_password: String,
) -> Result<VaultInfo, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let vaults_dir = app_dir.join("vaults");
    std::fs::create_dir_all(&vaults_dir).map_err(|e| e.to_string())?;

    let safe_name: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let filename = format!("{}.db", safe_name);
    let vault_path = vaults_dir.join(&filename);

    if vault_path.exists() {
        return Err("A vault with this name already exists".into());
    }

    {
        let mut key_guard = vault_key.0.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut key) = *key_guard {
            use zeroize::Zeroize;
            key.zeroize();
        }
        *key_guard = None;
    }
    db.close_vault();
    db.open_vault(&vault_path)?;

    let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
    let info = meta_db::insert_vault(&meta_conn, &name, vault_path.to_str().unwrap())
        .map_err(|e| e.to_string())?;
    let vault_info = meta_db::get_vault(&meta_conn, info).ok_or("Failed to load created vault")?;
    drop(meta_conn);

    let config = crypto::create_vault(&master_password);
    {
        let conn_guard = db.conn.lock().map_err(|e| e.to_string())?;
        let conn = conn_guard.as_ref().ok_or("No vault is open")?;
        db::save_vault_config(conn, &config).map_err(|e| e.to_string())?;
    }

    let vault_key_bytes = crypto::unlock_vault(&master_password, &config)
        .ok_or("Failed to unlock newly created vault")?;
    let mut key_guard = vault_key.0.lock().map_err(|e| e.to_string())?;
    *key_guard = Some(vault_key_bytes);
    drop(key_guard);

    let mut id_guard = db.vault_id.lock().map_err(|e| e.to_string())?;
    *id_guard = Some(vault_info.id);

    let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
    meta_db::touch_vault(&meta_conn, vault_info.id).map_err(|e| e.to_string())?;

    Ok(vault_info)
}

#[tauri::command]
pub fn open_vault(
    meta: State<'_, MetaDb>,
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    vault_id: i64,
    master_password: String,
) -> Result<bool, String> {
    let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
    let info = meta_db::get_vault(&meta_conn, vault_id).ok_or("Vault not found")?;
    drop(meta_conn);

    let vault_path = std::path::PathBuf::from(&info.path);
    db.open_vault(&vault_path)?;

    let conn_guard = db.conn.lock().map_err(|e| e.to_string())?;
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let config = db::load_vault_config(conn).ok_or("Vault config not found")?;
    drop(conn_guard);

    if let Some(key) = crypto::unlock_vault(&master_password, &config) {
        let mut key_guard = vault_key.0.lock().map_err(|e| e.to_string())?;
        *key_guard = Some(key);
        drop(key_guard);

        let mut id_guard = db.vault_id.lock().map_err(|e| e.to_string())?;
        *id_guard = Some(vault_id);

        let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
        meta_db::touch_vault(&meta_conn, vault_id).map_err(|e| e.to_string())?;

        Ok(true)
    } else {
        db.close_vault();
        Ok(false)
    }
}

#[tauri::command]
pub fn verify_password(
    db: State<'_, DbState>,
    master_password: String,
) -> Result<bool, String> {
    let conn_guard = db.conn.lock().map_err(|e| e.to_string())?;
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let config = db::load_vault_config(conn).ok_or("Vault config not found")?;
    drop(conn_guard);
    Ok(crypto::unlock_vault(&master_password, &config).is_some())
}

#[tauri::command]
pub fn close_vault(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
) -> Result<(), String> {
    let mut key_guard = vault_key.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut key) = *key_guard {
        use zeroize::Zeroize;
        key.zeroize();
    }
    *key_guard = None;
    drop(key_guard);
    db.close_vault();
    Ok(())
}

#[tauri::command]
pub fn rename_vault(
    meta: State<'_, MetaDb>,
    db: State<'_, DbState>,
    vault_id: i64,
    new_name: String,
) -> Result<VaultInfo, String> {
    let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
    let updated = meta_db::rename_vault(&meta_conn, vault_id, &new_name)
        .map_err(|e| e.to_string())?;
    drop(meta_conn);

    let mut id_guard = db.vault_id.lock().map_err(|e| e.to_string())?;
    if *id_guard == Some(vault_id) {
        *id_guard = Some(vault_id);
    }

    Ok(updated)
}

#[tauri::command]
pub fn delete_vault(
    meta: State<'_, MetaDb>,
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    vault_id: i64,
) -> Result<(), String> {
    let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
    let info = meta_db::get_vault(&meta_conn, vault_id).ok_or("Vault not found")?;
    drop(meta_conn);

    let is_open = {
        let id_guard = db.vault_id.lock().map_err(|e| e.to_string())?;
        *id_guard == Some(vault_id)
    };

    if is_open {
        let mut key_guard = vault_key.0.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut key) = *key_guard {
            use zeroize::Zeroize;
            key.zeroize();
        }
        *key_guard = None;
        drop(key_guard);
        db.close_vault();
    }

    std::fs::remove_file(&info.path).map_err(|e| format!("Failed to delete vault file: {}", e))?;

    let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
    meta_db::delete_vault(&meta_conn, vault_id).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn reorder_vaults(
    meta: State<'_, MetaDb>,
    orders: Vec<(i64, f64)>,
) -> Result<(), String> {
    let conn = meta.conn.lock().map_err(|e| e.to_string())?;
    meta_db::reorder_vaults(&conn, &orders).map_err(|e| e.to_string())
}

// ─── Entry commands ───

#[derive(Serialize, Deserialize, Clone)]
pub struct ExportEntry {
    pub name: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub totp: Option<String>,
    pub tags: Option<String>,
}

#[derive(Serialize)]
pub struct DecryptedEntry {
    pub id: i64,
    pub name: String,
    pub username: String,
    pub password: String,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub totp: Option<String>,
    pub tags: Option<String>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
pub struct TotpCode {
    pub code: String,
    pub remaining_seconds: u64,
    pub period: u64,
}

#[derive(Serialize)]
pub struct ImportPreview {
    pub entries: Vec<ExportEntry>,
    pub count: usize,
}

fn decrypt_entry_row(row: &db::EntryRow, key: &[u8; 32]) -> Result<DecryptedEntry, String> {
    Ok(DecryptedEntry {
        id: row.id,
        name: crypto::decrypt_field(&row.name_cipher, &row.name_nonce, key)
            .ok_or("Decrypt failed")?,
        username: crypto::decrypt_field(&row.username_cipher, &row.username_nonce, key)
            .ok_or("Decrypt failed")?,
        password: crypto::decrypt_field(&row.password_cipher, &row.password_nonce, key)
            .ok_or("Decrypt failed")?,
        url: row
            .url_cipher
            .as_ref()
            .zip(row.url_nonce.as_ref())
            .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
        notes: row
            .notes_cipher
            .as_ref()
            .zip(row.notes_nonce.as_ref())
            .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
        totp: row
            .totp_cipher
            .as_ref()
            .zip(row.totp_nonce.as_ref())
            .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
        tags: row
            .tags_cipher
            .as_ref()
            .zip(row.tags_nonce.as_ref())
            .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
        sort_order: row.sort_order,
        created_at: row.created_at.clone(),
        updated_at: row.updated_at.clone(),
    })
}

#[tauri::command]
pub fn list_entries(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
) -> Result<Vec<DecryptedEntry>, String> {
    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;
    let rows = db::fetch_all_entries(conn);
    rows.iter()
        .map(|row| decrypt_entry_row(row, key))
        .collect()
}

#[tauri::command]
pub fn get_entry(
    db: State<'_, DbState>,
    id: i64,
    vault_key: State<'_, VaultKey>,
) -> Result<DecryptedEntry, String> {
    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;
    let row = db::fetch_entry(conn, id).ok_or("Entry not found")?;
    decrypt_entry_row(&row, key)
}

fn encrypt_optional(value: &Option<String>, key: &[u8; 32]) -> Option<(Vec<u8>, Vec<u8>)> {
    value.as_ref().map(|v| crypto::encrypt_field(v, key))
}

#[tauri::command]
pub fn create_entry(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    name: String,
    username: String,
    password: String,
    url: Option<String>,
    notes: Option<String>,
    totp: Option<String>,
    tags: Option<String>,
) -> Result<i64, String> {
    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;

    let name_enc = crypto::encrypt_field(&name, key);
    let username_enc = crypto::encrypt_field(&username, key);
    let password_enc = crypto::encrypt_field(&password, key);
    let url_enc = encrypt_optional(&url, key);
    let notes_enc = encrypt_optional(&notes, key);
    let totp_enc = encrypt_optional(&totp, key);
    let tags_enc = encrypt_optional(&tags, key);

    db::insert_entry(
        conn,
        (&name_enc.1, &name_enc.0),
        (&username_enc.1, &username_enc.0),
        (&password_enc.1, &password_enc.0),
        url_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
        notes_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
        totp_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
        tags_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_entry(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    id: i64,
    name: String,
    username: String,
    password: String,
    url: Option<String>,
    notes: Option<String>,
    totp: Option<String>,
    tags: Option<String>,
) -> Result<(), String> {
    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;

    let name_enc = crypto::encrypt_field(&name, key);
    let username_enc = crypto::encrypt_field(&username, key);
    let password_enc = crypto::encrypt_field(&password, key);
    let url_enc = encrypt_optional(&url, key);
    let notes_enc = encrypt_optional(&notes, key);
    let totp_enc = encrypt_optional(&totp, key);
    let tags_enc = encrypt_optional(&tags, key);

    db::update_entry(
        conn,
        id,
        (&name_enc.1, &name_enc.0),
        (&username_enc.1, &username_enc.0),
        (&password_enc.1, &password_enc.0),
        url_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
        notes_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
        totp_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
        tags_enc
            .as_ref()
            .map(|(c, n)| (n.as_slice(), c.as_slice())),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_entry(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    id: i64,
) -> Result<(), String> {
    let _ = vault_key.with(|_| ())?;
    let conn_guard = db.conn.lock().map_err(|e| e.to_string())?;
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    db::delete_entry(conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn generate_password(length: Option<usize>) -> String {
    let len = length.unwrap_or(20).clamp(8, 64);
    let chars =
        b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>?";
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| {
            let idx = rand::Rng::gen_range(&mut rng, 0..chars.len());
            chars[idx] as char
        })
        .collect()
}

#[tauri::command]
pub fn reorder_entries(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    orders: Vec<(i64, f64)>,
) -> Result<(), String> {
    vault_key.with(|_| {
        let conn_guard = db.conn.lock().map_err(|e| e.to_string())?;
        let conn = conn_guard.as_ref().ok_or("No vault is open")?;
        db::reorder_entries(conn, &orders).map_err(|e| e.to_string())
    })?
}

#[tauri::command]
pub fn copy_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text(text).map_err(|e| e.to_string())?;
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(60));
        let _ = handle.clipboard().clear();
    });
    Ok(())
}

#[tauri::command]
pub fn generate_totp_code(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    entry_id: i64,
) -> Result<TotpCode, String> {
    use totp_rs::{Algorithm, TOTP, Secret};

    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;
    let row = db::fetch_entry(conn, entry_id).ok_or("Entry not found")?;

    let totp_secret = row
        .totp_cipher
        .as_ref()
        .zip(row.totp_nonce.as_ref())
        .and_then(|(c, n)| crypto::decrypt_field(c, n, key))
        .ok_or("No TOTP secret stored for this entry")?;

    let totp = if totp_secret.starts_with("otpauth://") {
        TOTP::from_url(&totp_secret).map_err(|e| format!("Invalid otpauth URL: {}", e))?
    } else {
        let sanitized: String = totp_secret
            .chars()
            .filter(|c| c.is_ascii_alphabetic() || matches!(c, '2'..='7' | '='))
            .collect::<String>()
            .to_uppercase();
        let secret = Secret::Encoded(sanitized)
            .to_bytes()
            .map_err(|e| format!("Invalid base32 secret: {}", e))?;
        TOTP::new_unchecked(Algorithm::SHA1, 6, 1, 30, secret, None, "".into())
    };

    let code = totp.generate_current().map_err(|e| format!("TOTP generation failed: {}", e))?;
    let period = totp.step;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let remaining_seconds = period - (now % period);

    Ok(TotpCode {
        code,
        remaining_seconds,
        period,
    })
}

// ─── Import / Export ───

#[derive(Serialize, Deserialize)]
struct ExportData {
    version: u32,
    #[serde(rename = "app")]
    app_name: String,
    exported_at: String,
    vault_name: String,
    entries: Vec<ExportEntry>,
}

#[tauri::command]
pub fn export_plaintext(
    meta: State<'_, MetaDb>,
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    save_path: String,
) -> Result<(), String> {
    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;

    let vault_name = {
        let id_guard = db.vault_id.lock().map_err(|e| e.to_string())?;
        let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
        meta_db::get_vault(&meta_conn, id_guard.unwrap_or(0))
            .map(|v| v.name)
            .unwrap_or_default()
    };

    let rows = db::fetch_all_entries(conn);
    let entries: Vec<ExportEntry> = rows
        .iter()
        .filter_map(|row| {
            Some(ExportEntry {
                name: crypto::decrypt_field(&row.name_cipher, &row.name_nonce, key)?,
                username: crypto::decrypt_field(
                    &row.username_cipher,
                    &row.username_nonce,
                    key,
                )?,
                password: crypto::decrypt_field(
                    &row.password_cipher,
                    &row.password_nonce,
                    key,
                )?,
                url: row
                    .url_cipher
                    .as_ref()
                    .zip(row.url_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
                notes: row
                    .notes_cipher
                    .as_ref()
                    .zip(row.notes_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
                totp: row
                    .totp_cipher
                    .as_ref()
                    .zip(row.totp_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
                tags: row
                    .tags_cipher
                    .as_ref()
                    .zip(row.tags_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
            })
        })
        .collect();

    let data = ExportData {
        version: 1,
        app_name: "Mima".into(),
        exported_at: chrono_now(),
        vault_name,
        entries,
    };

    let json =
        serde_json::to_string_pretty(&data).map_err(|e| format!("Serialization failed: {}", e))?;
    std::fs::write(&save_path, json).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn export_encrypted(
    meta: State<'_, MetaDb>,
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    save_path: String,
    backup_password: String,
) -> Result<(), String> {
    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;

    let vault_name = {
        let id_guard = db.vault_id.lock().map_err(|e| e.to_string())?;
        let meta_conn = meta.conn.lock().map_err(|e| e.to_string())?;
        meta_db::get_vault(&meta_conn, id_guard.unwrap_or(0))
            .map(|v| v.name)
            .unwrap_or_default()
    };

    let rows = db::fetch_all_entries(conn);
    let entries: Vec<ExportEntry> = rows
        .iter()
        .filter_map(|row| {
            Some(ExportEntry {
                name: crypto::decrypt_field(&row.name_cipher, &row.name_nonce, key)?,
                username: crypto::decrypt_field(
                    &row.username_cipher,
                    &row.username_nonce,
                    key,
                )?,
                password: crypto::decrypt_field(
                    &row.password_cipher,
                    &row.password_nonce,
                    key,
                )?,
                url: row
                    .url_cipher
                    .as_ref()
                    .zip(row.url_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
                notes: row
                    .notes_cipher
                    .as_ref()
                    .zip(row.notes_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
                totp: row
                    .totp_cipher
                    .as_ref()
                    .zip(row.totp_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
                tags: row
                    .tags_cipher
                    .as_ref()
                    .zip(row.tags_nonce.as_ref())
                    .and_then(|(c, n)| crypto::decrypt_field(c, n, key)),
            })
        })
        .collect();

    let data = ExportData {
        version: 1,
        app_name: "Mima".into(),
        exported_at: chrono_now(),
        vault_name,
        entries,
    };

    let json =
        serde_json::to_vec(&data).map_err(|e| format!("Serialization failed: {}", e))?;
    let backup = crypto::encrypt_backup(&json, &backup_password);
    let encoded =
        serde_json::to_vec(&backup).map_err(|e| format!("Serialization failed: {}", e))?;
    std::fs::write(&save_path, encoded).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

fn resolve_import_bytes(file_path: &str, content: Option<&str>) -> Result<Vec<u8>, String> {
    if let Some(b64) = content.filter(|c| !c.is_empty()) {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD
            .decode(b64)
            .map_err(|e| format!("Failed to decode content: {}", e))
    } else {
        std::fs::read(file_path)
            .map_err(|e| format!("Failed to read file: {}", e))
    }
}

#[tauri::command]
pub fn preview_import(
    file_path: String,
    content: Option<String>,
) -> Result<ImportPreview, String> {
    let bytes = resolve_import_bytes(&file_path, content.as_deref())?;
    let json = String::from_utf8(bytes).map_err(|_| "Invalid UTF-8 in file".to_string())?;
    let data: ExportData =
        serde_json::from_str(&json).map_err(|_| "Invalid file format".to_string())?;

    if data.version != 1 {
        return Err("Unsupported file version".into());
    }

    Ok(ImportPreview {
        count: data.entries.len(),
        entries: data.entries,
    })
}

#[tauri::command]
pub fn confirm_import(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    file_path: String,
    content: Option<String>,
) -> Result<usize, String> {
    let bytes = resolve_import_bytes(&file_path, content.as_deref())?;
    let json = String::from_utf8(bytes).map_err(|_| "Invalid UTF-8 in file".to_string())?;
    let data: ExportData =
        serde_json::from_str(&json).map_err(|_| "Invalid file format".to_string())?;

    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;

    for entry in &data.entries {
        let name_enc = crypto::encrypt_field(&entry.name, key);
        let username_enc = crypto::encrypt_field(&entry.username, key);
        let password_enc = crypto::encrypt_field(&entry.password, key);
        let url_enc = encrypt_optional(&entry.url, key);
        let notes_enc = encrypt_optional(&entry.notes, key);
        let totp_enc = encrypt_optional(&entry.totp, key);
        let tags_enc = encrypt_optional(&entry.tags, key);

        db::insert_entry(
            conn,
            (&name_enc.1, &name_enc.0),
            (&username_enc.1, &username_enc.0),
            (&password_enc.1, &password_enc.0),
            url_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
            notes_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
            totp_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
            tags_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(data.entries.len())
}

#[tauri::command]
pub fn preview_encrypted_import(
    file_path: String,
    backup_password: String,
    content: Option<String>,
) -> Result<ImportPreview, String> {
    let encoded = resolve_import_bytes(&file_path, content.as_deref())?;
    let backup: crypto::EncryptedBackup =
        serde_json::from_slice(&encoded).map_err(|_| "Invalid backup file format".to_string())?;
    let json =
        crypto::decrypt_backup(&backup, &backup_password).ok_or("Incorrect backup password")?;
    let data: ExportData =
        serde_json::from_slice(&json).map_err(|_| "Invalid backup content".to_string())?;

    if data.version != 1 {
        return Err("Unsupported file version".into());
    }

    Ok(ImportPreview {
        count: data.entries.len(),
        entries: data.entries,
    })
}

#[tauri::command]
pub fn confirm_encrypted_import(
    db: State<'_, DbState>,
    vault_key: State<'_, VaultKey>,
    file_path: String,
    backup_password: String,
    content: Option<String>,
) -> Result<usize, String> {
    let encoded = resolve_import_bytes(&file_path, content.as_deref())?;
    let backup: crypto::EncryptedBackup =
        serde_json::from_slice(&encoded).map_err(|_| "Invalid backup file format".to_string())?;
    let json =
        crypto::decrypt_backup(&backup, &backup_password).ok_or("Incorrect backup password")?;
    let data: ExportData =
        serde_json::from_slice(&json).map_err(|_| "Invalid backup content".to_string())?;

    let (conn_guard, key_guard) = (
        db.conn.lock().map_err(|e| e.to_string())?,
        vault_key.0.lock().map_err(|e| e.to_string())?,
    );
    let conn = conn_guard.as_ref().ok_or("No vault is open")?;
    let key = key_guard.as_ref().ok_or("Vault is locked")?;

    for entry in &data.entries {
        let name_enc = crypto::encrypt_field(&entry.name, key);
        let username_enc = crypto::encrypt_field(&entry.username, key);
        let password_enc = crypto::encrypt_field(&entry.password, key);
        let url_enc = encrypt_optional(&entry.url, key);
        let notes_enc = encrypt_optional(&entry.notes, key);
        let totp_enc = encrypt_optional(&entry.totp, key);
        let tags_enc = encrypt_optional(&entry.tags, key);

        db::insert_entry(
            conn,
            (&name_enc.1, &name_enc.0),
            (&username_enc.1, &username_enc.0),
            (&password_enc.1, &password_enc.0),
            url_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
            notes_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
            totp_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
            tags_enc
                .as_ref()
                .map(|(c, n)| (n.as_slice(), c.as_slice())),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(data.entries.len())
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let days_since_epoch = secs / 86400;
    let secs_in_day = secs % 86400;
    let hours = secs_in_day / 3600;
    let mins = (secs_in_day % 3600) / 60;
    let secs = secs_in_day % 60;

    let (year, month, day) = civil_from_days(days_since_epoch as i32);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, mins, secs
    )
}

fn civil_from_days(days: i32) -> (i32, u32, u32) {
    let z = days + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i32 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m, d)
}
