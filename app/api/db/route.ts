import { type NextRequest, NextResponse } from "next/server"

// Simple database API endpoint
export async function POST(request: NextRequest) {
  try {
    const { sql, params } = await request.json()

    // Mock database for demo - replace with actual PostgreSQL client
    const mockData = {
      rows: [
        {
          id: 1,
          braid_name: "Box Braids",
          alt_names: "Square Braids",
          region: "West Africa",
          image_url: null,
          public_url: null,
          contributor_name: "Cultural Team",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          braid_name: "French Braid",
          alt_names: "Tresse Française",
          region: "Europe",
          image_url: null,
          public_url: null,
          contributor_name: "Heritage Docs",
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
    }

    // For INSERT queries, return the new row
    if (sql.includes("INSERT")) {
      const newBraid = {
        id: Date.now(),
        braid_name: params[0],
        alt_names: params[1],
        region: params[2],
        image_url: params[3],
        public_url: params[4],
        contributor_name: params[5],
        created_at: new Date().toISOString(),
      }
      return NextResponse.json({ rows: [newBraid] })
    }

    // For SELECT queries, return mock data
    return NextResponse.json(mockData)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Database query failed" }, { status: 500 })
  }
}
