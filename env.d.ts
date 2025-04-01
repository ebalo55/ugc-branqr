import type { Agent } from "@fingerprintjs/fingerprintjs";

interface ImportMetaEnv {
    readonly ENCRYPTION_KEY: string;
    readonly DEMO_OWNER: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare var fpjs: Agent;
