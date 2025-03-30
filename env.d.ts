interface ImportMetaEnv {
    readonly ENCRYPTION_KEY: string;
    readonly DEMO_OWNER: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}