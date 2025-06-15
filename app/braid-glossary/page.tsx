"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase, type Braid } from "@/lib/supabase"

export default function BraidGlossaryPage() {
  const [showForm, setShowForm] = useState(true)
  const [braids, setBraids] = useState<Braid[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    braidName: "",
    altNames: "",
    region: "",
    imageFile: null as File | null,
    publicUrl: "",
    contributorName: "",
  })

  // Fetch braids from database
  const fetchBraids = async () => {
    try {
      const { data, error } = await supabase.from("braids").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setBraids(data || [])
    } catch (error) {
      console.error("Error fetching braids:", error)
    } finally {
      setLoading(false)
    }
  }

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `braids/${fileName}`

      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("images").getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error("Error uploading image:", error)
      return null
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let imageUrl = null

      // Upload image if provided
      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageFile)
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

      if (error) throw error

      // Reset form and refresh data
      setFormData({
        braidName: "",
        altNames: "",
        region: "",
        imageFile: null,
        publicUrl: "",
        contributorName: "",
      })

      setShowForm(false)
      await fetchBraids() // Refresh the gallery
    } catch (error) {
      console.error("Error submitting braid:", error)
      alert("Error submitting braid. Please try again.")
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
          <div className="bg-white p-6 w-full max-w-lg relative rounded-lg shadow-xl">
            {/* Close button */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-sm text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-xl mb-4 stick-no-bills">Submit a Braid</h2>

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

              <input
                type="file"
                name="imageFile"
                onChange={handleFileChange}
                accept="image/*"
                className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
              />

              <input
                type="url"
                name="publicUrl"
                value={formData.publicUrl}
                onChange={handleInputChange}
                placeholder="https://example.com"
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
