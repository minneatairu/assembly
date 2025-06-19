import { neon } from "@neondatabase/serverless"

// Use Neon database connection
const DB_URL = process.env.NEON_NEON_NEON_NEON_NEON_NEON_DATABASE_URL

export type Braid = {
  id: string | number
  braid_name: string
  alt_names?: string
  region: string
  image_url?: string
  public_url?: string
  contributor_name: string
  created_at: string
  updated_at?: string
  audio_url?: string
  audio_notes?: string
}

// Demo data for when database isn't configured
const DEMO_BRAIDS: Braid[] = [
  {
    id: 1,
    braid_name: "Box Braids",
    alt_names: "Square Braids, Poetic Justice Braids",
    region: "West Africa",
    image_url: "/placeholder.svg?height=200&width=300&text=Box+Braids",
    public_url: null,
    contributor_name: "Cultural Heritage Team",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    braid_name: "French Braid",
    alt_names: "Tresse Française, Dutch Braid",
    region: "Europe",
    image_url: "/placeholder.svg?height=200&width=300&text=French+Braid",
    public_url: null,
    contributor_name: "Traditional Styles Collective",
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: 3,
    braid_name: "Cornrows",
    alt_names: "Canerows, Boxer Braids",
    region: "Africa",
    image_url: "/placeholder.svg?height=200&width=300&text=Cornrows",
    public_url: null,
    contributor_name: "Heritage Documentation Project",
    created_at: "2024-01-03T00:00:00Z",
  },
  {
    id: 4,
    braid_name: "Fishtail Braid",
    alt_names: "Herringbone Braid, Fishbone Braid",
    region: "Scandinavia",
    image_url: "/placeholder.svg?height=200&width=300&text=Fishtail+Braid",
    public_url: null,
    contributor_name: "Nordic Traditions Archive",
    created_at: "2024-01-04T00:00:00Z",
  },
  {
    id: 5,
    braid_name: "Fulani Braids",
    alt_names: "Tribal Braids, Fulani Cornrows, Peul Braids",
    region: "West Africa",
    image_url: "/placeholder.svg?height=200&width=300&text=Fulani+Braids",
    public_url: null,
    contributor_name: "Fulani Cultural Center",
    created_at: "2024-01-05T00:00:00Z",
  },
  {
    id: 6,
    braid_name: "Crown Braid",
    alt_names: "Halo Braid, Milkmaid Braid",
    region: "Eastern Europe",
    image_url: "/placeholder.svg?height=200&width=300&text=Crown+Braid",
    public_url: null,
    contributor_name: "Folk Traditions Institute",
    created_at: "2024-01-06T00:00:00Z",
  },
]

// Persistent demo storage using localStorage
const getDemoStorage = (): Braid[] => {
  if (typeof window === "undefined") return [...DEMO_BRAIDS]

  try {
    const stored = localStorage.getItem("demo-braids")
    if (stored) {
      const parsed = JSON.parse(stored)
      // ensure we always return a non-empty array
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (error) {
    console.warn("Error loading demo storage:", error)
  }

  return [...DEMO_BRAIDS] // ✅ default non-empty demo list
}

const setDemoStorage = (braids: Braid[]) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("demo-braids", JSON.stringify(braids))
  } catch (error) {
    console.warn("Error saving demo storage:", error)
  }
}

// Initialize demo storage
let demoStorage: Braid[] = getDemoStorage()

// Database operations
export const db = {
  async getBraids(): Promise<Braid[]> {
    if (!DB_URL) {
      // Demo mode - return persistent demo data
      demoStorage = getDemoStorage()
      return demoStorage.length
        ? [...demoStorage].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [...DEMO_BRAIDS]
    }

    try {
      const sql = neon(DB_URL)
      const result = await sql`SELECT * FROM braids ORDER BY created_at DESC`
      return result as Braid[]
    } catch (error) {
      console.warn("Database error, falling back to demo mode:", error)
      demoStorage = getDemoStorage()
      // if for some reason demoStorage is still empty, return hard-coded demo
      return demoStorage.length ? [...demoStorage] : [...DEMO_BRAIDS]
    }
  },

  async addBraid(braid: Omit<Braid, "id" | "created_at" | "updated_at">): Promise<Braid> {
    if (!DB_URL) {
      // Demo mode - add to persistent storage
      const newBraid: Braid = {
        ...braid,
        id: Date.now(), // Simple ID generation for demo
        created_at: new Date().toISOString(),
      }
      demoStorage = getDemoStorage()
      demoStorage.unshift(newBraid)
      setDemoStorage(demoStorage)
      return newBraid
    }

    try {
      const sql = neon(DB_URL)
      const result = await sql`
        INSERT INTO braids (braid_name, alt_names, region, image_url, public_url, contributor_name, audio_url, audio_notes)
        VALUES (${braid.braid_name}, ${braid.alt_names || null}, ${braid.region}, ${braid.image_url || null}, ${braid.public_url || null}, ${braid.contributor_name}, ${braid.audio_url || null}, ${braid.audio_notes || null})
        RETURNING *
      `
      return result[0] as Braid
    } catch (error) {
      console.warn("Database error, falling back to demo mode:", error)
      // Fallback to demo mode with persistence
      const newBraid: Braid = {
        ...braid,
        id: Date.now(),
        created_at: new Date().toISOString(),
      }
      demoStorage = getDemoStorage()
      demoStorage.unshift(newBraid)
      setDemoStorage(demoStorage)
      return newBraid
    }
  },

  // Check if database is configured
  isConfigured(): boolean {
    return !!DB_URL
  },

  // Get demo status
  getDemoStatus(): { isDemo: boolean; reason?: string } {
    if (!DB_URL) {
      return { isDemo: true, reason: "No database URL configured" }
    }
    return { isDemo: false }
  },

  /**
   * Return all braids submitted by a given user id
   */
  async getUserBraids(userId: number | string) {
    if (!DB_URL) {
      // demo mode → filter from local storage
      demoStorage = getDemoStorage()
      return demoStorage.filter((b) => (b as any).user_id === userId)
    }

    try {
      const sql = neon(DB_URL)
      const rows = await sql`
        SELECT * FROM braids
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `
      return rows as Braid[]
    } catch (err) {
      console.warn("getUserBraids db error, falling back to demo:", err)
      demoStorage = getDemoStorage()
      return demoStorage.filter((b) => (b as any).user_id === userId)
    }
  },
}
