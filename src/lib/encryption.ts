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
     */
    public static async init() {
        if (!this._instance) {
            this._instance = new Encryption();
            await this.loadKey();
        }
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
    public async encrypt(data: string, key: CryptoKey) {
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

        return Buffer.from(iv).toString("base64url") + "." + Buffer.from(result).toString("base64url");
    }

    /**
     * Decrypt the data.
     * @param {string} data
     * @param key
     */
    public async decrypt(data: string, key: CryptoKey) {
        const [ iv, encrypted ] = data.split(".");
        const result = await crypto.subtle.decrypt(
            {
                name:      "AES-GCM",
                iv:        Buffer.from(iv!, "base64url"),
                tagLength: 128,
            },
            this._key,
            Buffer.from(encrypted!, "base64url"),
        );

        return new TextDecoder().decode(result);
    }

    public prepareSalt(salt: string) {
        return Buffer.from(salt, "base64url");
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
            salt: Buffer.from(salt).toString("base64url"),
            derived_key,
        };
    }
}