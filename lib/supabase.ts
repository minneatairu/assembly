import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables not found. Running in demo mode.")
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
)

export type Braid = {
  id: string
  braid_name: string
  alt_names?: string | null
  region: string
  image_url?: string | null
  public_url?: string | null
  contributor_name: string
  created_at: string
  updated_at?: string
}

// Database utility functions
export const supabaseUtils = {
  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await supabase.from("braids").select("count").single()
      return { success: !error, error }
    } catch (error) {
      return { success: false, error }
    }
  },

  // Get all braids with pagination
  async getBraids(page = 0, limit = 20) {
    const from = page * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from("braids")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)

    return { data, error, count }
  },

  // Search braids
  async searchBraids(query: string) {
    const { data, error } = await supabase
      .from("braids")
      .select("*")
      .or(`braid_name.ilike.%${query}%,alt_names.ilike.%${query}%,region.ilike.%${query}%`)
      .order("created_at", { ascending: false })

    return { data, error }
  },

  // Upload image with optimization
  async uploadImage(file: File, folder = "braids") {
    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Upload file
      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from("images").getPublicUrl(filePath)

      return { url: data.publicUrl, path: filePath, error: null }
    } catch (error) {
      return { url: null, path: null, error }
    }
  },

  // Delete image
  async deleteImage(path: string) {
    const { error } = await supabase.storage.from("images").remove([path])
    return { error }
  },
}
