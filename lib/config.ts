// Configuration and environment validation
export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  app: {
    name: "Data Assembly - Braid Glossary",
    version: "1.0.0",
  },
  storage: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
}

export const isSupabaseConfigured = () => {
  return !!(config.supabase.url && config.supabase.anonKey)
}

export const validateEnvironment = () => {
  const missing = []

  if (!config.supabase.url) missing.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!config.supabase.anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  return {
    isValid: missing.length === 0,
    missing,
  }
}
