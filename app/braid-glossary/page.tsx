"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"

// Mock data for when database isn't set up
const mockBraids = [
  {
    id: "1",
    braid_name: "Box Braids",
    alt_names: "Square Braids",
    region: "West Africa",
    image_url: "/placeholder.svg?height=200&width=300",
    public_url: "https://example.com",
    contributor_name: "Sample User",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    braid_name: "French Braid",
    alt_names: "Tresse Française",
    region: "Europe",
    image_url: "/placeholder.svg?height=200&width=300",
    public_url: null,
    contributor_name: "Demo User",
    created_at: "2024-01-02T00:00:00Z",
  },
]

type Braid = {
  id: string
  braid_name: string
  alt_names?: string | null
  region: string
  image_url?: string | null
  public_url?: string | null
  contributor_name: string
  created_at: string
}

export default function BraidGlossaryPage() {
  const [showForm, setShowForm] = useState(true)
  const [braids, setBraids] = useState<Braid[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [databaseConnected, setDatabaseConnected] = useState(false)
  const [formData, setFormData] = useState({
    braidName: "",
    altNames: "",
    region: "",
    imageFile: null as File | null,
    publicUrl: "",
    contributorName: "",
  })

  // Check if Supabase is configured
  const checkSupabaseConfig = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return !!(supabaseUrl && supabaseKey)
  }

  // Fetch braids from database or use mock data
  const fetchBraids = async () => {
    try {
      setError(null)

      if (!checkSupabaseConfig()) {
        console.log("Supabase not configured, using mock data")
        setBraids(mockBraids)
        setLoading(false)
        return
      }

      // Dynamic import to avoid errors when Supabase isn't configured
      const { supabase } = await import("@/lib/supabase")

      const { data, error } = await supabase.from("braids").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          setError("database-not-setup")
        } else {
          setError(`Database error: ${error.message}`)
        }
        // Fall back to mock data
        setBraids(mockBraids)
        return
      }

      setBraids(data || [])
      setDatabaseConnected(true)
    } catch (error) {
      console.error("Error fetching braids:", error)
      setError("connection-failed")
      // Fall back to mock data
      setBraids(mockBraids)
    } finally {
      setLoading(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!checkSupabaseConfig()) {
        // Simulate submission for demo
        const newBraid: Braid = {
          id: Date.now().toString(),
          braid_name: formData.braidName,
          alt_names: formData.altNames || null,
          region: formData.region,
          image_url: formData.imageFile ? "/placeholder.svg?height=200&width=300" : null,
          public_url: formData.publicUrl || null,
          contributor_name: formData.contributorName,
          created_at: new Date().toISOString(),
        }

        setBraids((prev) => [newBraid, ...prev])
        setError("demo-mode")
      } else {
        // Real submission
        const { supabase } = await import("@/lib/supabase")

        let imageUrl = null

        // Upload image if provided
        if (formData.imageFile) {
          const fileExt = formData.imageFile.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `braids/${fileName}`

          const { error: uploadError } = await supabase.storage.from("images").upload(filePath, formData.imageFile)

          if (uploadError) {
            console.error("Upload error:", uploadError)
            throw new Error("Failed to upload image")
          }

          const { data } = supabase.storage.from("images").getPublicUrl(filePath)
          imageUrl = data.publicUrl
        }

        // Insert braid data
        const { data, error } = await supabase
          .from("braids")
          .insert([
            {
              braid_name: formData.braidName,
              alt_names: formData.altNames || null,
              region: formData.region,
              image_url: imageUrl,
              public_url: formData.publicUrl || null,
              contributor_name: formData.contributorName,
            },
          ])
          .select()

        if (error) {
          console.error("Insert error:", error)
          throw error
        }

        await fetchBraids() // Refresh the gallery
      }

      // Reset form
      setFormData({
        braidName: "",
        altNames: "",
        region: "",
        imageFile: null,
        publicUrl: "",
        contributorName: "",
      })

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ""

      setShowForm(false)
    } catch (error: any) {
      console.error("Error submitting braid:", error)
      setError(`Submission failed: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, imageFile: file }))
  }

  // Load braids on component mount
  useEffect(() => {
    fetchBraids()
  }, [])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Submit Button */}
      <div className="fixed top-6 right-6 z-40">
        <button
          onClick={() => setShowForm(true)}
          className="bg-black text-white text-sm px-4 py-2 rounded-full shadow hover:bg-gray-800 stick-no-bills"
        >
          Submit Braid
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 w-full max-w-lg relative rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-sm text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-xl mb-4 stick-no-bills">Submit a Braid</h2>

            {error === "demo-mode" && (
              <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm">
                Demo mode: Your submission was added locally. Set up Supabase for persistent storage.
              </div>
            )}

            {error && error !== "demo-mode" && error !== "database-not-setup" && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="braidName"
                value={formData.braidName}
                onChange={handleInputChange}
                placeholder="Braid name"
                className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
                required
              />

              <input
                type="text"
                name="altNames"
                value={formData.altNames}
                onChange={handleInputChange}
                placeholder="Alternative names"
                className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
              />

              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                placeholder="Region"
                className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 stick-no-bills">Upload Image</label>
                <input
                  type="file"
                  name="imageFile"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
                />
              </div>

              <input
                type="url"
                name="publicUrl"
                value={formData.publicUrl}
                onChange={handleInputChange}
                placeholder="https://example.com (optional)"
                className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
              />

              <input
                type="text"
                name="contributorName"
                value={formData.contributorName}
                onChange={handleInputChange}
                placeholder="Your name"
                className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
                required
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 hover:bg-blue-700 stick-no-bills text-lg font-light rounded disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className="pt-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6 text-blue-600 hover:text-blue-800 stick-no-bills text-lg">
            ← Back to Data Assembly
          </Link>
          <h1 className="text-4xl font-light mb-4 stick-no-bills text-black">BRAID GLOSSARY</h1>
          <p className="text-gray-600 stick-no-bills text-lg mb-6">
            Traditional braiding patterns from around the world
          </p>
        </div>

        {/* Setup Instructions */}
        {error === "database-not-setup" && (
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3 stick-no-bills">Database Setup Required</h3>
            <div className="text-yellow-700 stick-no-bills text-sm space-y-2">
              <p>To enable persistent storage, please:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>
                  Create a Supabase project at{" "}
                  <a href="https://supabase.com" className="text-blue-600 underline">
                    supabase.com
                  </a>
                </li>
                <li>Run the SQL script provided in the code</li>
                <li>Add your environment variables</li>
                <li>Create an "images" storage bucket</li>
              </ol>
              <p className="mt-3 text-xs">Currently showing sample data. Form submissions work in demo mode.</p>
            </div>
          </div>
        )}

        {!checkSupabaseConfig() && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 stick-no-bills text-sm text-center">
              <strong>Demo Mode:</strong> Supabase not configured. Showing sample data.
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="stick-no-bills text-gray-500">Loading braids...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {braids.map((braid) => (
              <div
                key={braid.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {braid.image_url ? (
                  <img
                    src={braid.image_url || "/placeholder.svg"}
                    alt={braid.braid_name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=192&width=384"
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 stick-no-bills">No image</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-xl font-light mb-2 stick-no-bills text-black">{braid.braid_name}</h3>
                  {braid.alt_names && (
                    <p className="text-gray-500 stick-no-bills text-sm mb-1">Also known as: {braid.alt_names}</p>
                  )}
                  <p className="text-gray-600 stick-no-bills text-sm mb-1">Region: {braid.region}</p>
                  <p className="text-gray-500 stick-no-bills text-xs">Contributed by {braid.contributor_name}</p>
                  {braid.public_url && (
                    <a
                      href={braid.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 stick-no-bills text-sm mt-2 inline-block"
                    >
                      Learn more →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && braids.length === 0 && (
          <div className="text-center py-12">
            <div className="stick-no-bills text-gray-500 mb-4">No braids submitted yet</div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors stick-no-bills text-base font-light"
            >
              Be the first to submit!
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
