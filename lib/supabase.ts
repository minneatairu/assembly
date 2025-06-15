import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Braid = {
  id: string
  braid_name: string
  alt_names?: string
  region: string
  image_url?: string
  public_url?: string
  contributor_name: string
  created_at: string
}
