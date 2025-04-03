interface ImportMetaEnv {
    readonly ENCRYPTION_KEY: string;
    readonly DEMO_OWNER: string;
    readonly API_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

