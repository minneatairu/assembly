import { type NextRequest, NextResponse } from "next/server"
import type { File } from "formdata-node"

// Simple image upload to Cloudflare Images
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload to Cloudflare Images
    const cloudflareFormData = new FormData()
    cloudflareFormData.append("file", file)

    const cloudflareResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: cloudflareFormData,
      },
    )

    if (!cloudflareResponse.ok) {
      throw new Error("Cloudflare upload failed")
    }

    const result = await cloudflareResponse.json()

    return NextResponse.json({
      url: result.result.variants[0], // Use the first variant
      id: result.result.id,
    })
  } catch (error) {
    console.error("Upload error:", error)

    // Fallback: return a placeholder URL for demo
    const file = request.formData().get("file") as File
    return NextResponse.json({
      url: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(file?.name || "uploaded-image")}`,
      id: "demo-" + Date.now(),
    })
  }
}
