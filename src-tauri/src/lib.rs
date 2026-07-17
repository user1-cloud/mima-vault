use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod crypto;
mod db;
mod meta_db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_biometry::init());

    #[cfg(not(target_os = "android"))]
    let builder = builder
        .plugin(tauri_plugin_idlemonitor::init());

    builder
        .manage(commands::VaultKey(Mutex::new(None)))
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

            let meta_path = app_dir.join("mima.db");
            let meta_conn =
                rusqlite::Connection::open(&meta_path).expect("failed to open meta database");
            meta_db::init_meta(&meta_conn).expect("failed to init meta database");
            drop(meta_conn);
            app.manage(meta_db::MetaDb::new(meta_path));

            let vaults_dir = app_dir.join("vaults");
            std::fs::create_dir_all(&vaults_dir).expect("failed to create vaults directory");

            app.manage(db::DbState::new_empty());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_vaults,
            commands::create_vault,
            commands::open_vault,
            commands::verify_password,
            commands::close_vault,
            commands::rename_vault,
            commands::delete_vault,
            commands::reorder_vaults,
            commands::list_deleted_vaults,
            commands::restore_vault,
            commands::permanently_delete_vault,
            commands::cleanup_deleted_vaults,
            commands::list_entries,
            commands::get_entry,
            commands::create_entry,
            commands::update_entry,
            commands::delete_entry,
            commands::reorder_entries,
            commands::get_field_history,
            commands::list_recycle_bin,
            commands::remove_custom_field,
            commands::restore_recycle_item,
            commands::permanently_delete_recycle_item,
            commands::cleanup_recycle,
            commands::generate_password,
            commands::generate_totp_code,
            commands::copy_to_clipboard,
            commands::export_plaintext,
            commands::export_encrypted,
            commands::preview_import,
            commands::confirm_import,
            commands::preview_encrypted_import,
            commands::confirm_encrypted_import,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
