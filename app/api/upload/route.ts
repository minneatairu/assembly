import { type NextRequest, NextResponse } from "next/server"

// Simple file upload to Cloudflare with fallback
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("Upload attempt for file:", file.name, "Type:", file.type, "Size:", file.size)

    // Check if Cloudflare is configured
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN

    if (accountId && apiToken) {
      try {
        console.log("Attempting Cloudflare upload...")

        // For audio files, try a different approach
        if (file.type.startsWith("audio/")) {
          console.log("Audio file detected, using fallback for demo")
          // Skip Cloudflare for audio in demo, go straight to fallback
        } else {
          // Upload to Cloudflare Images (for images only)
          const cloudflareFormData = new FormData()
          cloudflareFormData.append("file", file)

          const cloudflareResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiToken}`,
              },
              body: cloudflareFormData,
            },
          )

          if (cloudflareResponse.ok) {
            const result = await cloudflareResponse.json()
            console.log("Cloudflare upload successful")
            return NextResponse.json({
              url: result.result.variants[0], // Use the first variant
              id: result.result.id,
              provider: "cloudflare",
            })
          } else {
            const errorText = await cloudflareResponse.text()
            console.warn("Cloudflare upload failed:", errorText)
          }
        }
      } catch (error) {
        console.warn("Cloudflare upload error:", error)
      }
    } else {
      console.log("Cloudflare not configured, using fallback")
    }

    // Fallback: return appropriate placeholder/demo URL
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const isAudio = file.type.startsWith("audio/")

    if (isAudio) {
      console.log("Creating demo audio URL")
      // For audio files, create a data URL for demo playback
      try {
        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString("base64")
        const dataUrl = `data:${file.type};base64,${base64}`

        return NextResponse.json({
          url: dataUrl,
          id: "demo-audio-" + Date.now(),
          provider: "demo",
          type: "audio",
        })
      } catch (audioError) {
        console.error("Error creating audio data URL:", audioError)
        return NextResponse.json({
          url: null,
          id: "demo-audio-failed-" + Date.now(),
          provider: "demo-failed",
          type: "audio",
        })
      }
    }

    // For images, return placeholder
    console.log("Creating demo image URL")
    return NextResponse.json({
      url: `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(fileName)}`,
      id: "demo-" + Date.now(),
      provider: "placeholder",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
