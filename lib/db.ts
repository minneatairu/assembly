// Simple database connection with demo mode fallback
const DB_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL

export type Braid = {
  id: number
  braid_name: string
  alt_names?: string
  region: string
  image_url?: string
  public_url?: string
  contributor_name: string
  created_at: string
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
]

// In-memory storage for demo mode
const demoStorage: Braid[] = [...DEMO_BRAIDS]

// Simple fetch wrapper for database operations
export const db = {
  async query(sql: string, params: any[] = []) {
    if (!DB_URL) {
      // Demo mode - simulate database operations
      return { rows: [] }
    }

    const response = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    })

    if (!response.ok) {
      throw new Error("Database query failed")
    }

    return response.json()
  },

  async getBraids(): Promise<Braid[]> {
    if (!DB_URL) {
      // Demo mode - return demo data
      return [...demoStorage].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    try {
      const result = await this.query("SELECT * FROM braids ORDER BY created_at DESC")
      return result.rows || []
    } catch (error) {
      console.warn("Database error, falling back to demo mode:", error)
      return [...demoStorage]
    }
  },

  async addBraid(braid: Omit<Braid, "id" | "created_at">): Promise<Braid> {
    if (!DB_URL) {
      // Demo mode - add to in-memory storage
      const newBraid: Braid = {
        ...braid,
        id: Date.now(), // Simple ID generation for demo
        created_at: new Date().toISOString(),
      }
      demoStorage.unshift(newBraid)
      return newBraid
    }

    try {
      const result = await this.query(
        "INSERT INTO braids (braid_name, alt_names, region, image_url, public_url, contributor_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [braid.braid_name, braid.alt_names, braid.region, braid.image_url, braid.public_url, braid.contributor_name],
      )
      return result.rows[0]
    } catch (error) {
      console.warn("Database error, falling back to demo mode:", error)
      // Fallback to demo mode
      const newBraid: Braid = {
        ...braid,
        id: Date.now(),
        created_at: new Date().toISOString(),
      }
      demoStorage.unshift(newBraid)
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
}
