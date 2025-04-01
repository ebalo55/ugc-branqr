export interface KeyMaterial {
    salt: string;
    derived_key: CryptoKey;
}

export class Encryption {
    private _key!: CryptoKey;

    private constructor() {}

    private static _instance: Encryption;

    /**
     * Get the encryption instance.
     */
    public static get instance() {
        if (!this._instance) {
            throw new Error(`${ this.name } instance not initialized`);
        }
        return this._instance;
    }

    /**
     * Initialize the encryption instance.
     * @param {boolean} volatile If true, the key will not be loaded from the environment.
     */
    public static async init(volatile: boolean = false) {
        if (!this._instance) {
            this._instance = new Encryption();

            if (!volatile) {
                await this.loadKey();
            }
        }
    }

    /**
     * Generate a new encryption key, and return it as a base64url encoded string.
     */
    public static async makeKey() {
        const key = await crypto.subtle.generateKey(
            {
                name:   "AES-GCM",
                length: 256,
            },
            true,
            [ "encrypt", "decrypt" ],
        );

        const exported_key = await crypto.subtle.exportKey("jwk", key);
        return {serialized: btoa(JSON.stringify(exported_key)), key};
    }

    /**
     * Import a key from a base64 encoded string.
     * @param {string} serialized
     */
    public static async importKey(serialized: string) {
        const key = JSON.parse(atob(serialized));
        return await crypto.subtle.importKey(
            "jwk",
            key,
            {name: "AES-GCM", length: 256},
            true,
            [ "encrypt", "decrypt" ],
        );
    }

    /**
     * Load the encryption key from the environment.
     */
    private static async loadKey() {
        const key = JSON.parse(atob(import.meta.env.ENCRYPTION_KEY));
        this._instance._key = await crypto.subtle.importKey(
            "jwk",
            key,
            {name: "AES-GCM", length: 256},
            true,
            [ "encrypt", "decrypt" ],
        );
    }

    /**
     * Encrypt the data.
     * @param {string} data
     * @param key
     */
    public async encrypt(data: string, key?: CryptoKey) {
        if (!key) {
            key = this._key;
        }

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const result = await crypto.subtle.encrypt(
            {
                name:      "AES-GCM",
                iv:        iv.buffer,
                tagLength: 128,
            },
            key,
            new TextEncoder().encode(data),
        );

        return this.arrayBufferToBase64(iv.buffer) + "." + this.arrayBufferToBase64(result);
    }

    /**
     * Decrypt the data.
     * @param {string} data
     * @param key
     */
    public async decrypt(data: string, key?: CryptoKey) {
        if (!key) {
            key = this._key;
        }

        const [ iv, encrypted ] = data.split(".");

        const iv_buffer = this.base64ToArrayBuffer(iv!);
        const encrypted_buffer = this.base64ToArrayBuffer(encrypted!);

        const result = await crypto.subtle.decrypt(
            {
                name:      "AES-GCM",
                iv: iv_buffer,
                tagLength: 128,
            },
            key,
            encrypted_buffer,
        );

        return new TextDecoder().decode(result);
    }

    /**
     * Prepare the salt for the key derivation. Convert it to a Uint8Array.
     * @param {string} salt
     */
    public prepareSalt(salt: string) {
        return new Uint8Array(this.base64ToArrayBuffer(salt));
    }

    /**
     * Derive a key from the password.
     * @param {Uint8Array} salt The salt to use for the key derivation.
     */
    public async deriveKey(salt?: Uint8Array): Promise<KeyMaterial> {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(32));
        }

        if (salt.length < 32) {
            throw new Error("Salt must be at least 32 bytes");
        }

        // convert the key to its raw form
        const raw_key = await crypto.subtle.exportKey("raw", this._key);

        // use the key as the baseline for the PBKDF2 key derivation
        const key_material = await crypto.subtle.importKey(
            "raw",
            raw_key,
            {
                name: "PBKDF2",
            },
            false,
            [ "deriveBits", "deriveKey" ],
        );

        // derive the key using PBKDF2
        const derived_key = await crypto.subtle.deriveKey(
            {
                name:       "PBKDF2",
                salt:       salt,
                iterations: 100_000,
                hash:       "SHA-512",
            },
            key_material,
            {
                name:   "AES-GCM",
                length: 256,
            },
            true,
            [ "encrypt", "decrypt" ],
        );

        return {
            salt: this.arrayBufferToBase64(salt.buffer),
            derived_key,
        };
    }

    /**
     * Convert ArrayBuffer to base64url string
     * @param {ArrayBuffer} buffer
     * @returns {string}
     */
    public arrayBufferToBase64(buffer: ArrayBufferLike): string {
        try {
            return Buffer.from(buffer).toString("base64");
        }
        catch (e) {
            console.warn("Buffer not available, falling back to browser implementation");
            // Browser fallback when Buffer is not available
            const bytes = new Uint8Array(buffer);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            // Convert to base64
            return btoa(binary);
        }
    }

    /**
     * Convert base64url string to ArrayBuffer
     * @param {string} base64
     * @returns {ArrayBuffer}
     */
    public base64ToArrayBuffer(base64: string): ArrayBuffer {
        try {
            const buf = new Uint8Array(Buffer.from(base64, "base64"));
            return buf.buffer;
        }
        catch (e) {
            console.warn("Buffer not available, falling back to browser implementation");
            // Browser fallback when Buffer is not available

            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        }
    }
}