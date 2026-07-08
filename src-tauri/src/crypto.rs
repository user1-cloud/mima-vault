use aes_gcm::{aead::Aead, Aes256Gcm, KeyInit, Nonce};
use argon2::{self, Argon2};
use rand::Rng;
use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

const NONCE_SIZE: usize = 12;
const SALT_SIZE: usize = 32;
const VAULT_KEY_SIZE: usize = 32;

#[derive(Serialize, Deserialize, Clone, Zeroize, ZeroizeOnDrop)]
pub struct VaultConfig {
    #[zeroize(skip)]
    pub salt: Vec<u8>,
    #[zeroize(skip)]
    pub encrypted_vault_key: Vec<u8>,
    #[zeroize(skip)]
    pub vault_key_nonce: Vec<u8>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EncryptedBackup {
    pub salt: Vec<u8>,
    pub nonce: Vec<u8>,
    pub ciphertext: Vec<u8>,
}

pub fn generate_salt() -> Vec<u8> {
    let mut salt = vec![0u8; SALT_SIZE];
    rand::thread_rng().fill(&mut salt[..]);
    salt
}

pub fn generate_vault_key() -> [u8; VAULT_KEY_SIZE] {
    let mut key = [0u8; VAULT_KEY_SIZE];
    rand::thread_rng().fill(&mut key);
    key
}

pub fn derive_key(password: &str, salt: &[u8]) -> [u8; VAULT_KEY_SIZE] {
    let mut output = [0u8; VAULT_KEY_SIZE];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut output)
        .expect("argon2 key derivation failed");
    output
}

pub fn encrypt_bytes(
    plaintext: &[u8],
    key: &[u8; VAULT_KEY_SIZE],
) -> (Vec<u8>, Vec<u8>) {
    let cipher = Aes256Gcm::new_from_slice(key).expect("invalid key");
    let mut nonce_bytes = [0u8; NONCE_SIZE];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext).expect("encryption failed");
    (ciphertext, nonce_bytes.to_vec())
}

pub fn decrypt_bytes(
    ciphertext: &[u8],
    nonce: &[u8],
    key: &[u8; VAULT_KEY_SIZE],
) -> Option<Vec<u8>> {
    let cipher = Aes256Gcm::new_from_slice(key).ok()?;
    let nonce = Nonce::from_slice(nonce);
    cipher.decrypt(nonce, ciphertext).ok()
}

pub fn create_vault(password: &str) -> VaultConfig {
    let salt = generate_salt();
    let derived = derive_key(password, &salt);
    let vault_key = generate_vault_key();

    let (encrypted_vault_key, vault_key_nonce) = encrypt_bytes(&vault_key, &derived);

    VaultConfig {
        salt,
        encrypted_vault_key,
        vault_key_nonce,
    }
}

pub fn unlock_vault(password: &str, config: &VaultConfig) -> Option<[u8; VAULT_KEY_SIZE]> {
    let derived = derive_key(password, &config.salt);
    let vault_key_bytes =
        decrypt_bytes(&config.encrypted_vault_key, &config.vault_key_nonce, &derived)?;
    if vault_key_bytes.len() != VAULT_KEY_SIZE {
        return None;
    }
    let mut vault_key = [0u8; VAULT_KEY_SIZE];
    vault_key.copy_from_slice(&vault_key_bytes);
    Some(vault_key)
}

pub fn encrypt_field(plaintext: &str, key: &[u8; VAULT_KEY_SIZE]) -> (Vec<u8>, Vec<u8>) {
    encrypt_bytes(plaintext.as_bytes(), key)
}

pub fn decrypt_field(
    ciphertext: &[u8],
    nonce: &[u8],
    key: &[u8; VAULT_KEY_SIZE],
) -> Option<String> {
    let bytes = decrypt_bytes(ciphertext, nonce, key)?;
    String::from_utf8(bytes).ok()
}

pub fn encrypt_backup(plaintext: &[u8], password: &str) -> EncryptedBackup {
    let salt = generate_salt();
    let derived = derive_key(password, &salt);
    let (ciphertext, nonce) = encrypt_bytes(plaintext, &derived);
    EncryptedBackup {
        salt,
        nonce,
        ciphertext,
    }
}

pub fn decrypt_backup(backup: &EncryptedBackup, password: &str) -> Option<Vec<u8>> {
    let derived = derive_key(password, &backup.salt);
    decrypt_bytes(&backup.ciphertext, &backup.nonce, &derived)
}
