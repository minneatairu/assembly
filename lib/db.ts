// Simple database connection
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

// Simple fetch wrapper for database operations
export const db = {
  async query(sql: string, params: any[] = []) {
    if (!DB_URL) {
      throw new Error("Database URL not configured")
    }

    // For demo purposes, we'll use a simple approach
    // In production, you'd use a proper PostgreSQL client
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
    const result = await this.query("SELECT * FROM braids ORDER BY created_at DESC")
    return result.rows || []
  },

  async addBraid(braid: Omit<Braid, "id" | "created_at">): Promise<Braid> {
    const result = await this.query(
      "INSERT INTO braids (braid_name, alt_names, region, image_url, public_url, contributor_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [braid.braid_name, braid.alt_names, braid.region, braid.image_url, braid.public_url, braid.contributor_name],
    )
    return result.rows[0]
  },
}
