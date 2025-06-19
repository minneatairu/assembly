import { neon } from "@neondatabase/serverless"

const DB_URL = process.env.NEON_NEON_DATABASE_URL // ✅ use the standard single variable
const getSql = () => {
  if (!DB_URL) throw new Error("DB_URL_NOT_SET")
  return neon(DB_URL)
}

export interface Braid {
  id: number
  braid_name: string
  alt_names?: string
  region: string
  image_url?: string
  image_urls?: string[]
  public_url?: string
  link_title?: string
  link_description?: string
  memory_title?: string
  memory_description?: string
  contributor_name: string
  audio_url?: string
  audio_notes?: string
  submission_type: "photo" | "link" | "memory"
  created_at: string
}

export interface NewBraid {
  braid_name: string
  alt_names?: string
  region: string
  image_url?: string
  image_urls?: string[]
  public_url?: string
  link_title?: string
  link_description?: string
  memory_title?: string
  memory_description?: string
  contributor_name: string
  audio_url?: string
  audio_notes?: string
  submission_type: "photo" | "link" | "memory"
}

// Demo data fallback
const DEMO_BRAIDS: Braid[] = [
  {
    id: 1,
    braid_name: "Box Braids",
    alt_names: "Poetic Justice Braids, Square Braids",
    region: "West Africa",
    image_url: "/placeholder.svg?height=400&width=300&text=Box+Braids",
    contributor_name: "Maya Johnson",
    submission_type: "photo",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    braid_name: "Goddess Braids Tutorial",
    alt_names: "Crown Braids, Halo Braids",
    region: "Ancient Egypt",
    image_url: "/placeholder.svg?height=400&width=300&text=Goddess+Braids",
    contributor_name: "Aisha Williams",
    submission_type: "link",
    public_url: "https://www.youtube.com/watch?v=example",
    link_title: "Complete Goddess Braids Tutorial",
    link_description:
      "Step-by-step guide to creating beautiful goddess braids with cornrow base and loose braided extensions.",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    braid_name: "Grandmother's Braiding Wisdom",
    region: "Southern United States",
    contributor_name: "Keisha Brown",
    submission_type: "memory",
    memory_title: "Sunday Braiding Sessions",
    memory_description:
      "Every Sunday after church, my grandmother would sit me between her knees on the living room floor. She would part my hair with the precision of an artist, her fingers moving through each section like she was weaving stories into my scalp. She taught me that braiding wasn't just about hair - it was about connection, tradition, and the sacred time we spent together. Those moments shaped who I am today.",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    braid_name: "Fulani Braids",
    alt_names: "Tribal Braids, Fulani Cornrows",
    region: "West Africa - Fulani People",
    image_url: "/placeholder.svg?height=400&width=300&text=Fulani+Braids",
    contributor_name: "Fatima Diallo",
    submission_type: "photo",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    braid_name: "Learning to Braid",
    region: "Caribbean",
    contributor_name: "Marley Thompson",
    submission_type: "memory",
    memory_title: "First Time Braiding My Sister",
    memory_description:
      "I was twelve when my mother finally trusted me to braid my little sister's hair for school. My hands shook as I tried to recreate the neat cornrows I had watched her do a thousand times. It took me three hours and looked nothing like mama's work, but my sister wore those crooked braids with pride. That day, I understood that braiding was about more than technique - it was about love, patience, and the trust someone places in your hands.",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
]

class Database {
  private isDemo = false
  private demoReason = ""

  async getBraids(): Promise<Braid[]> {
    try {
      const sql = getSql()
      const rows = await sql`
        SELECT * FROM braids
        ORDER BY created_at DESC
      `
      if (!rows || rows.length === 0) {
        this.isDemo = true
        this.demoReason = "No rows in database"
        return DEMO_BRAIDS
      }
      this.isDemo = false
      return rows as Braid[]
    } catch (err) {
      console.error("DB error, using demo data:", err)
      this.isDemo = true
      this.demoReason = "Database connection failed"
      return DEMO_BRAIDS
    }
  }

  async addBraid(braid: NewBraid): Promise<Braid> {
    try {
      const sql = getSql()
      const result = await sql`
        INSERT INTO braids (
          braid_name, alt_names, region, image_url, image_urls,
          public_url, link_title, link_description, memory_title, memory_description,
          contributor_name, audio_url, audio_notes, submission_type
        ) VALUES (
          ${braid.braid_name}, ${braid.alt_names || null}, ${braid.region}, 
          ${braid.image_url || null}, ${braid.image_urls ? JSON.stringify(braid.image_urls) : null},
          ${braid.public_url || null}, ${braid.link_title || null}, ${braid.link_description || null},
          ${braid.memory_title || null}, ${braid.memory_description || null},
          ${braid.contributor_name}, ${braid.audio_url || null}, ${braid.audio_notes || null},
          ${braid.submission_type}
        )
        RETURNING *
      `

      this.isDemo = false
      return result[0] as Braid
    } catch (error) {
      console.error("Failed to add braid to database:", error)

      // In demo mode, simulate adding to demo data
      const newBraid: Braid = {
        id: Math.max(...DEMO_BRAIDS.map((b) => b.id)) + 1,
        ...braid,
        created_at: new Date().toISOString(),
      }

      DEMO_BRAIDS.unshift(newBraid)
      this.isDemo = true
      this.demoReason = "Database write failed"
      return newBraid
    }
  }

  getDemoStatus() {
    return {
      isDemo: this.isDemo,
      reason: this.demoReason,
    }
  }
}

export const db = new Database()
