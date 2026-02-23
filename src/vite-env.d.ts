/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_LLM_API_KEY: string
    readonly VITE_LLM_BASE_URL: string
    readonly VITE_LLM_MODEL: string
    readonly VITE_LLM_MODELS: string
    readonly LLAMA_MODEL: string
    readonly LLAMA_API_KEY: string
    readonly LLAMA_API_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
