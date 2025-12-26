// Groq environment types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GROQ_API_KEY?: string;
      GROQ_BASE_URL?: string;
      GROQ_MODEL?: string;
    }
  }
}

export {};
