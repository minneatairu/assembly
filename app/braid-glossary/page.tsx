"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { db, type Braid } from "@/lib/db"

export default function BraidGlossaryPage() {
  const [showForm, setShowForm] = useState(false)
  const [braids, setBraids] = useState<Braid[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [demoStatus, setDemoStatus] = useState<{ isDemo: boolean; reason?: string }>({ isDemo: false })

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioSupported, setAudioSupported] = useState(true)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState({
    braidName: "",
    altNames: "",
    region: "",
    imageFile: null as File | null,
    publicUrl: "",
    contributorName: "",
    audioNotes: "", // Description of what the audio contains
  })

  // Check audio support on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioSupported(false)
    }
  }, [])

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error starting recording:", error)
      setError("Could not access microphone. Please check permissions.")
    }
  }

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Clear audio recording
  const clearRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Fetch braids
  const fetchBraids = async () => {
    try {
      setError(null)
      const data = await db.getBraids()
      setBraids(data)

      // Check demo status
      const status = db.getDemoStatus()
      setDemoStatus(status)
    } catch (error) {
      console.error("Error fetching braids:", error)
      setError("Failed to load braids")

      // Still check demo status
      const status = db.getDemoStatus()
      setDemoStatus(status)
    } finally {
      setLoading(false)
    }
  }

  // Upload image to Cloudflare with fallback
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadStatus("Uploading image...")

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()

      if (result.provider === "placeholder") {
        setUploadStatus("Using demo mode (Cloudflare not configured)")
      } else {
        setUploadStatus("Image uploaded successfully!")
      }

      return result.url
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus("Upload failed, continuing without image")
      return null
    }
  }

  // Upload audio file
  const uploadAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      setUploadStatus("Uploading audio...")

      // Convert blob to file
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: "audio/webm" })

      const formData = new FormData()
      formData.append("file", audioFile)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Audio upload failed")
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      console.error("Audio upload error:", error)
      setUploadStatus("Audio upload failed, continuing without audio")
      return null
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setUploadStatus(null)

    try {
      let imageUrl = null
      let audioUrl = null

      // Upload image if provided
      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageFile)
      }

      // Upload audio if recorded
      if (audioBlob) {
        audioUrl = await uploadAudio(audioBlob)
      }

      // Add braid to database
      const newBraid = await db.addBraid({
        braid_name: formData.braidName,
        alt_names: formData.altNames || undefined,
        region: formData.region,
        image_url: imageUrl || undefined,
        public_url: formData.publicUrl || undefined,
        contributor_name: formData.contributorName,
        audio_url: audioUrl || undefined,
        audio_notes: formData.audioNotes || undefined,
      })

      // Update local state
      setBraids((prev) => [newBraid, ...prev])

      // Reset form
      setFormData({
        braidName: "",
        altNames: "",
        region: "",
        imageFile: null,
        publicUrl: "",
        contributorName: "",
        audioNotes: "",
      })

      // Clear audio
      clearRecording()

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ""

      setShowForm(false)
      setUploadStatus(null)
    } catch (error: any) {
      console.error("Error submitting braid:", error)
      setError(`Submission failed: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, imageFile: file }))
    setUploadStatus(null) // Clear previous upload status
  }

  // Load braids on mount
  useEffect(() => {
    fetchBraids()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Submit Button */}
      <div className="fixed top-6 right-6 z-40">
        <button
          onClick={() => setShowForm(true)}
          className="bg-black text-white text-sm px-4 py-2 rounded-full shadow hover:bg-gray-800 stick-no-bills"
        >
          Submit Braid
        </button>
      </div>

      {/* Demo Mode Banner */}
      {demoStatus.isDemo && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-center z-30">
          <span className="text-yellow-800 stick-no-bills text-sm">
            🚧 Demo Mode: {demoStatus.reason} - Submissions are temporary
          </span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 w-full max-w-lg relative rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-sm text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-xl mb-4 stick-no-bills">Submit a Braid</h2>

            {demoStatus.isDemo && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
                <strong>Demo Mode:</strong> Your submission will be temporary. Set up a database for permanent storage.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>
            )}

            {uploadStatus && (
              <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm">
                {uploadStatus}
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1 stick-no-bills">
                  Upload Image (optional)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded"
                />
                {formData.imageFile && (
                  <p className="text-sm text-gray-600 mt-1 stick-no-bills">Selected: {formData.imageFile.name}</p>
                )}
              </div>

              {/* Audio Recording Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 stick-no-bills">
                  Voice Recording (optional)
                </label>

                {!audioSupported ? (
                  <div className="p-3 bg-gray-100 rounded text-gray-600 text-sm stick-no-bills">
                    Audio recording not supported in this browser
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Recording Controls */}
                    <div className="flex items-center gap-3">
                      {!isRecording && !audioBlob && (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 stick-no-bills text-sm"
                        >
                          🎤 Start Recording
                        </button>
                      )}

                      {isRecording && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 stick-no-bills text-sm"
                          >
                            ⏹️ Stop Recording
                          </button>
                          <span className="text-red-600 stick-no-bills text-sm font-mono">
                            🔴 {formatTime(recordingTime)}
                          </span>
                        </div>
                      )}

                      {audioBlob && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={clearRecording}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 stick-no-bills text-sm"
                          >
                            Clear
                          </button>
                          <span className="text-green-600 stick-no-bills text-sm">
                            ✓ Recorded ({formatTime(recordingTime)})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Audio Playback */}
                    {audioUrl && (
                      <div className="p-3 bg-gray-50 rounded">
                        <audio controls className="w-full">
                          <source src={audioUrl} type="audio/webm" />
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}

                    {/* Audio Description */}
                    <textarea
                      name="audioNotes"
                      value={formData.audioNotes}
                      onChange={handleInputChange}
                      placeholder="Describe what's in your recording (e.g., pronunciation guide, cultural context, braiding instructions)"
                      className="w-full px-4 py-3 border bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base rounded resize-none"
                      rows={3}
                    />
                  </div>
                )}
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

            {/* Configuration hints */}
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-gray-50 rounded text-gray-600 text-xs stick-no-bills">
                <strong>Database:</strong> {demoStatus.isDemo ? "Not configured (demo mode)" : "Connected"}
              </div>
              <div className="p-3 bg-gray-50 rounded text-gray-600 text-xs stick-no-bills">
                <strong>Files:</strong> Add CLOUDFLARE_* env vars for real uploads
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className={`pt-24 px-6 max-w-6xl mx-auto ${demoStatus.isDemo ? "pt-32" : ""}`}>
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
              <div key={braid.id} className="bg-white shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                {braid.image_url ? (
                  <img
                    src={braid.image_url || "/placeholder.svg"}
                    alt={braid.braid_name}
                    className="w-full aspect-square object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(braid.image_url, "_blank")}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=300&width=300"
                    }}
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 stick-no-bills">No image</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-xl font-light mb-2 stick-no-bills text-black">{braid.braid_name}</h3>
                  {braid.alt_names && (
                    <p className="text-gray-500 stick-no-bills text-sm mb-1">Also known as: {braid.alt_names}</p>
                  )}
                  <p className="text-gray-600 stick-no-bills text-sm mb-1">Region: {braid.region}</p>

                  {/* Audio Player */}
                  {(braid as any).audio_url && (
                    <div className="my-2">
                      <audio controls className="w-full h-8">
                        <source src={(braid as any).audio_url} type="audio/webm" />
                        Your browser does not support audio playback.
                      </audio>
                      {(braid as any).audio_notes && (
                        <p className="text-gray-500 stick-no-bills text-xs mt-1">🎤 {(braid as any).audio_notes}</p>
                      )}
                    </div>
                  )}

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
