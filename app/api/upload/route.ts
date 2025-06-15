import { type NextRequest, NextResponse } from "next/server"

// Simple image upload to Cloudflare Images with fallback
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check if Cloudflare is configured
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN

    if (accountId && apiToken) {
      try {
        // Upload to Cloudflare Images
        const cloudflareFormData = new FormData()
        cloudflareFormData.append("file", file)

        const cloudflareResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          body: cloudflareFormData,
        })

        if (cloudflareResponse.ok) {
          const result = await cloudflareResponse.json()
          return NextResponse.json({
            url: result.result.variants[0], // Use the first variant
            id: result.result.id,
            provider: "cloudflare",
          })
        } else {
          console.warn("Cloudflare upload failed, using fallback")
        }
      } catch (error) {
        console.warn("Cloudflare upload error, using fallback:", error)
      }
    }

    // Fallback: return a placeholder URL for demo
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    return NextResponse.json({
      url: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(fileName)}`,
      id: "demo-" + Date.now(),
      provider: "placeholder",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
