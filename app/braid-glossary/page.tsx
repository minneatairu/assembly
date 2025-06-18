"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { db, type Braid } from "@/lib/db"

export default function BraidGlossaryPage() {
  const [showForm, setShowForm] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [braids, setBraids] = useState<Braid[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [demoStatus, setDemoStatus] = useState<{ isDemo: boolean; reason?: string }>({ isDemo: false })
  const [showImageModal, setShowImageModal] = useState<{ url: string; caption: string } | null>(null)
  const [showDetailModal, setShowDetailModal] = useState<Braid | null>(null)

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioSupported, setAudioSupported] = useState(true)

  // Audio playback states for gallery items
  const [playingAudio, setPlayingAudio] = useState<{ [key: string]: boolean }>({})
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false)

  const [formData, setFormData] = useState({
    braidName: "",
    altNames: "",
    region: "",
    imageFile: null as File | null,
    imageUrl: "",
    contributorName: "",
    linkUrl: "",
  })

  // Check audio support on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioSupported(false)
    }
  }, [])

  // Handle image click to open modal
  const handleImageClick = (imageUrl: string, braidName: string) => {
    setShowImageModal({ url: imageUrl, caption: braidName })
  }

  // Close image modal
  const closeImageModal = () => {
    setShowImageModal(null)
  }

  // Close info modal
  const closeInfoModal = () => {
    setShowInfoModal(false)
  }

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showImageModal) {
          closeImageModal()
        } else if (showInfoModal) {
          closeInfoModal()
        } else if (showDetailModal) {
          setShowDetailModal(null)
        } else if (showForm) {
          setShowForm(false)
        }
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showImageModal, showInfoModal, showDetailModal, showForm])

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith("image/")) {
        setFormData((prev) => ({ ...prev, imageFile: file, imageUrl: "" }))
        setUploadStatus(null)
      }
    }
  }

  // Toggle audio playback for gallery items
  const toggleAudio = (braidId: string | number, audioUrl: string) => {
    const key = braidId.toString()
    const audio = audioRefs.current[key]

    if (audio) {
      if (playingAudio[key]) {
        // Stop audio
        audio.pause()
        audio.currentTime = 0
        setPlayingAudio((prev) => ({ ...prev, [key]: false }))
      } else {
        // Stop all other audio first
        Object.keys(audioRefs.current).forEach((otherKey) => {
          if (otherKey !== key && audioRefs.current[otherKey]) {
            audioRefs.current[otherKey].pause()
            audioRefs.current[otherKey].currentTime = 0
          }
        })
        setPlayingAudio({}) // Reset all playing states

        // Start this audio
        audio.play()
        setPlayingAudio((prev) => ({ ...prev, [key]: true }))
      }
    } else {
      // Create new audio element
      const newAudio = new Audio(audioUrl)
      audioRefs.current[key] = newAudio

      newAudio.onended = () => {
        setPlayingAudio((prev) => ({ ...prev, [key]: false }))
      }

      newAudio.onerror = () => {
        console.error("Audio playback error for braid:", braidId)
        setPlayingAudio((prev) => ({ ...prev, [key]: false }))
      }

      // Stop all other audio first
      Object.keys(audioRefs.current).forEach((otherKey) => {
        if (otherKey !== key && audioRefs.current[otherKey]) {
          audioRefs.current[otherKey].pause()
          audioRefs.current[otherKey].currentTime = 0
        }
      })
      setPlayingAudio({}) // Reset all playing states

      // Start this audio
      newAudio.play()
      setPlayingAudio((prev) => ({ ...prev, [key]: true }))
    }
  }

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

      const result = await response.json()

      if (!response.ok) {
        console.error("Upload failed:", result)
        throw new Error(result.details || result.error || "Upload failed")
      }

      if (result.provider === "placeholder") {
        setUploadStatus("Using demo mode (Cloudflare not configured)")
      } else if (result.provider === "demo") {
        setUploadStatus("Using demo mode for file storage")
      } else {
        setUploadStatus("Image uploaded successfully!")
      }

      return result.url
    } catch (error) {
      console.error("Upload error:", error)
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      // Return null instead of throwing to allow form submission to continue
      return null
    }
  }

  // Upload audio file
  const uploadAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      setUploadStatus("Uploading pronunciation...")

      // Convert blob to file
      const audioFile = new File([audioBlob], `pronunciation-${Date.now()}.webm`, { type: "audio/webm" })

      const formData = new FormData()
      formData.append("file", audioFile)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Audio upload failed:", result)
        throw new Error(result.details || result.error || "Audio upload failed")
      }

      if (result.provider === "demo") {
        setUploadStatus("Pronunciation ready for demo playback")
      } else {
        setUploadStatus("Pronunciation uploaded successfully!")
      }

      return result.url
    } catch (error) {
      console.error("Audio upload error:", error)
      setUploadStatus(`Pronunciation upload failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      // Return null instead of throwing to allow form submission to continue
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

      // Determine image source - prioritize file upload over URL
      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageFile)
      } else if (formData.imageUrl.trim()) {
        imageUrl = formData.imageUrl.trim()
        setUploadStatus("Using provided image URL")
      }

      // Upload audio if recorded
      if (audioBlob) {
        audioUrl = await uploadAudio(audioBlob)
        // Continue even if audio upload fails
      }

      // Add braid to database
      const newBraid = await db.addBraid({
        braid_name: formData.braidName,
        alt_names: formData.altNames || undefined,
        region: formData.region,
        image_url: imageUrl || undefined,
        public_url: formData.linkUrl || undefined, // Use the link field
        contributor_name: formData.contributorName,
        audio_url: audioUrl || undefined,
        audio_notes: "Pronunciation guide", // Fixed description for pronunciation
      })

      // Update local state
      setBraids((prev) => [newBraid, ...prev])

      // Reset form
      setFormData({
        braidName: "",
        altNames: "",
        region: "",
        imageFile: null,
        imageUrl: "",
        contributorName: "",
        linkUrl: "",
      })

      // Clear audio
      clearRecording()

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ""

      setUploadStatus("Braid submitted successfully!")

      // Auto-hide form after successful submission
      setTimeout(() => {
        setShowForm(false)
        setUploadStatus(null)
      }, 2000)
    } catch (error: any) {
      console.error("Error submitting braid:", error)
      setError(`Submission failed: ${error.message || "Unknown error"}`)
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
    setFormData((prev) => ({ ...prev, imageFile: file, imageUrl: "" }))
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
      // Cleanup audio refs
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause()
          audio.src = ""
        }
      })
    }
  }, [audioUrl])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl relative shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 border-2 border-dashed border-black">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-black hover:text-gray-600 z-10 transition-colors duration-200 stick-no-bills"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="flex">
              {/* Left Side - Upload Area */}
              <div className="w-1/2 p-8 bg-gray-50 border-r border-dashed border-black">
                <div
                  className={`relative h-80 bg-gray-200 border-2 border-dashed transition-colors ${
                    isDragOver ? "border-blue-400 bg-blue-50" : "border-black"
                  } flex flex-col items-center justify-center cursor-pointer overflow-hidden mb-4`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  {formData.imageFile || formData.imageUrl ? (
                    <div className="w-full h-full relative">
                      <img
                        src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : formData.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=300&width=300&text=Invalid+Image"
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-center font-medium stick-no-bills">Click to change image</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-black text-center font-medium stick-no-bills mb-2">
                        Choose a file or drag and drop it here
                      </p>
                      <p className="text-gray-600 text-sm stick-no-bills">Supported formats: JPG, PNG, GIF, WebP</p>
                    </div>
                  )}
                  <input id="file-input" type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Enter image URL:")
                    if (url) {
                      setFormData((prev) => ({ ...prev, imageUrl: url, imageFile: null }))
                    }
                  }}
                  className="w-full py-3 bg-gray-300 text-black rounded-none font-medium hover:bg-gray-400 transition-colors stick-no-bills border-2 border-dashed border-black"
                >
                  Save from URL
                </button>

                {formData.imageUrl && (
                  <p className="text-sm text-black mt-2 text-center stick-no-bills">Using URL: {formData.imageUrl}</p>
                )}
              </div>

              {/* Right Side - Form Fields */}
              <div className="w-1/2 p-8">
                <form onSubmit={handleSubmit} className="space-y-0">
                  {/* Braid Name */}
                  <input
                    type="text"
                    name="braidName"
                    value={formData.braidName}
                    onChange={handleInputChange}
                    placeholder="Braid name"
                    className="w-full h-14 px-4 bg-gray-50 border-2 border-dashed border-black rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black"
                    required
                  />

                  {/* Alternative Names */}
                  <input
                    type="text"
                    name="altNames"
                    value={formData.altNames}
                    onChange={handleInputChange}
                    placeholder="Alternative names"
                    className="w-full h-14 px-4 bg-gray-50 border-2 border-dashed border-black rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black border-t-0"
                  />

                  {/* Region */}
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="Cultural origin"
                    className="w-full h-14 px-4 bg-gray-50 border-2 border-dashed border-black rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black border-t-0"
                    required
                  />

                  {/* Contributor */}
                  <input
                    type="text"
                    name="contributorName"
                    value={formData.contributorName}
                    onChange={handleInputChange}
                    placeholder="Contributor name"
                    className="w-full h-14 px-4 bg-gray-50 border-2 border-dashed border-black rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black border-t-0"
                    required
                  />

                  {/* Link URL */}
                  <input
                    type="url"
                    name="linkUrl"
                    value={formData.linkUrl}
                    onChange={handleInputChange}
                    placeholder="Link to more info"
                    className="w-full h-14 px-4 bg-gray-50 border-2 border-dashed border-black rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black border-t-0"
                  />

                  {/* Audio Recording */}
                  {audioSupported && (
                    <div className="mt-0">
                      <div className="flex items-center gap-3 mb-3">
                        {!isRecording && !audioBlob && (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="w-full h-14 px-4 bg-gray-50 border-2 border-dashed border-black rounded-none hover:bg-gray-100 text-black text-left font-normal transition-colors stick-no-bills border-t-0"
                          >
                            Record pronunciation
                          </button>
                        )}

                        {isRecording && (
                          <div className="flex items-center gap-3 w-full">
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-none hover:bg-gray-700 text-sm font-medium stick-no-bills border-2 border-dashed border-black"
                            >
                              Stop
                            </button>
                            <span className="text-red-600 text-sm font-mono stick-no-bills">
                              🔴 {formatTime(recordingTime)}
                            </span>
                          </div>
                        )}

                        {audioBlob && (
                          <div className="flex items-center gap-3 w-full">
                            <button
                              type="button"
                              onClick={clearRecording}
                              className="px-3 py-1 bg-gray-400 text-white rounded-none hover:bg-gray-500 text-sm stick-no-bills border-2 border-dashed border-black"
                            >
                              Clear
                            </button>
                            <span className="text-green-600 text-sm stick-no-bills">
                              ✓ Recorded ({formatTime(recordingTime)})
                            </span>
                          </div>
                        )}
                      </div>

                      {audioUrl && (
                        <audio controls className="w-full mb-4">
                          <source src={audioUrl} type="audio/webm" />
                          Your browser does not support audio playback.
                        </audio>
                      )}
                    </div>
                  )}

                  {/* Status Messages */}
                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-dashed border-black rounded-none text-red-700 text-sm mt-4 stick-no-bills">
                      {error}
                    </div>
                  )}

                  {uploadStatus && (
                    <div
                      className={`p-4 rounded-none text-sm mt-4 border-2 border-dashed border-black stick-no-bills ${
                        uploadStatus.includes("failed") || uploadStatus.includes("error")
                          ? "bg-orange-50 text-orange-700"
                          : uploadStatus.includes("successfully")
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {uploadStatus}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-green-400 text-black py-4 rounded-none font-medium hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 stick-no-bills border-2 border-dashed border-black"
                  >
                    {submitting ? "Sharing..." : "Share"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 w-full max-w-2xl relative shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={closeInfoModal}
              className="absolute top-4 right-4 text-sm text-gray-500 hover:text-black transition-colors duration-200"
            >
              ✕
            </button>

            <h2 className="text-2xl mb-6 stick-no-bills font-light">ABOUT THE BRAID GLOSSARY</h2>

            <div className="space-y-6 stick-no-bills text-gray-700">
              <div>
                <h3 className="text-lg font-medium mb-2 text-black">What is this?</h3>
                <p className="text-base leading-relaxed">
                  The Braid Glossary is a collaborative documentation project that preserves and shares traditional
                  braiding patterns from cultures around the world. Each entry includes the braid's name, regional
                  origins, alternative names, and visual documentation.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Cultural Significance</h3>
                <p className="text-base leading-relaxed">
                  Braiding traditions carry deep cultural meaning, representing identity, status, age, and community
                  belonging. These patterns have been passed down through generations, often accompanied by stories,
                  songs, and ceremonies. By documenting these styles, we help preserve cultural heritage and promote
                  understanding across communities.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">How to Contribute</h3>
                <p className="text-base leading-relaxed mb-3">
                  Anyone can contribute to the glossary by submitting braiding patterns they know. When contributing,
                  please:
                </p>
                <ul className="list-disc list-inside space-y-1 text-base ml-4">
                  <li>Provide accurate cultural and regional context</li>
                  <li>Include alternative names if known</li>
                  <li>Add pronunciation recordings when possible</li>
                  <li>Respect the cultural significance of the styles you document</li>
                  <li>Credit sources and acknowledge cultural origins</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Pronunciation Guides</h3>
                <p className="text-base leading-relaxed">
                  Many braid names have specific pronunciations that are important to preserve. Contributors can record
                  audio pronunciations to help others learn the correct way to say these traditional names, maintaining
                  linguistic accuracy and cultural respect.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Educational Purpose</h3>
                <p className="text-base leading-relaxed">
                  This glossary serves as an educational resource for hairstylists, cultural researchers, educators, and
                  anyone interested in learning about global braiding traditions. It promotes cultural appreciation
                  while providing practical reference information.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  closeInfoModal()
                  setShowForm(true)
                }}
                className="bg-blue-600 text-white py-2 px-6 hover:bg-blue-700 transition-colors stick-no-bills text-base font-light"
              >
                Contribute a Braid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative max-w-4xl max-h-[90vh] w-full animate-in zoom-in-95 duration-300">
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white text-xl transition-colors duration-200"
            >
              ✕
            </button>
            <img
              src={showImageModal.url || "/placeholder.svg"}
              alt={showImageModal.caption}
              className="w-full h-full object-contain"
              onClick={closeImageModal}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-4">
              <h3 className="text-xl font-light stick-no-bills uppercase">{showImageModal.caption}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 w-full max-w-2xl relative shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 border-2 border-black">
            <button
              onClick={() => setShowDetailModal(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/70 hover:bg-white border border-gray-400 rounded-full flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="space-y-6">
              {/* Title */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold stick-no-bills text-black uppercase">
                {showDetailModal.braid_name}
              </h2>

              {/* Tags */}
              {showDetailModal.alt_names && (
                <div className="flex flex-wrap gap-2">
                  {showDetailModal.alt_names.split(",").map((name, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-400 rounded-full text-sm stick-no-bills text-black font-medium uppercase"
                    >
                      {name.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Image */}
              {showDetailModal.image_url && (
                <div className="w-full aspect-square overflow-hidden rounded-lg">
                  <img
                    src={showDetailModal.image_url || "/placeholder.svg"}
                    alt={showDetailModal.braid_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => handleImageClick(showDetailModal.image_url!, showDetailModal.braid_name)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=400&width=400"
                    }}
                  />
                </div>
              )}

              {/* Details - Inline Format */}
              <div className="space-y-1 stick-no-bills text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-black uppercase">REGION:</span>
                  <span className="text-gray-600 uppercase">{showDetailModal.region}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-black uppercase">BY:</span>
                  <span className="text-gray-600 uppercase">{showDetailModal.contributor_name}</span>
                </div>

                {(showDetailModal as any).audio_url && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black uppercase">PRONUNCIATION:</span>
                    <button
                      onClick={() => toggleAudio(showDetailModal.id, (showDetailModal as any).audio_url)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                    >
                      {playingAudio[showDetailModal.id.toString()] ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                          Stop
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Play
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-medium text-black uppercase">PUBLISHED:</span>
                  <span className="text-gray-600 uppercase">
                    {new Date(showDetailModal.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </span>
                </div>

                {showDetailModal.public_url && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black uppercase">LEARN MORE:</span>
                    <a
                      href={showDetailModal.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline uppercase text-xs"
                    >
                      {showDetailModal.public_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className={`pt-24 px-8 w-full ${demoStatus.isDemo ? "pt-32" : ""}`}>
        <div className="text-center mb-8 max-w-4xl mx-auto">
          <Link href="/" className="inline-block mb-6 text-blue-600 hover:text-blue-800 stick-no-bills text-lg">
            ← Back to Data Assembly
          </Link>
          <div className="flex items-center justify-start gap-4 mb-6 max-w-4xl mx-auto">
            <button
              onClick={() => setShowInfoModal(true)}
              className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors stick-no-bills text-xl sm:text-2xl lg:text-5xl font-bold"
              title="Learn more about the braid glossary"
            >
              ?
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors stick-no-bills text-xl sm:text-2xl lg:text-5xl font-bold"
              title="Add a new braid"
            >
              +
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="stick-no-bills text-gray-500">Loading braids...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {braids.map((braid, index) => (
              <div
                key={braid.id}
                className="bg-gray-200 border-2 border-black hover:opacity-90 transition-opacity relative"
              >
                {/* Index Number */}
                <div className="absolute top-4 right-4 z-10 bg-green-400 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-black stick-no-bills text-sm font-bold">{index + 1}</span>
                </div>

                {/* Image */}
                {braid.image_url ? (
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={braid.image_url || "/placeholder.svg"}
                      alt={braid.braid_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=300&width=300"
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-300 flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-500"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21,15 16,10 5,21" />
                    </svg>
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-20 stick-no-bills text-black uppercase leading-tight">
                    {braid.braid_name}
                  </h3>

                  {/* Tags and Plus Button Row */}
                  <div className="flex items-end justify-between">
                    <div className="flex flex-wrap gap-2">
                      {braid.alt_names && (
                        <>
                          <span className="px-3 py-1 bg-green-400 rounded-full text-sm stick-no-bills text-black font-medium uppercase">
                            {braid.alt_names.split(",")[0].trim()}
                          </span>
                          {braid.alt_names.split(",").length > 2 && (
                            <span className="px-3 py-1 bg-green-400 rounded-full text-sm stick-no-bills text-black font-medium uppercase">
                              +{braid.alt_names.split(",").length - 1}
                            </span>
                          )}
                          {braid.alt_names.split(",").length === 2 && (
                            <span className="px-3 py-1 bg-green-400 rounded-full text-sm stick-no-bills text-black font-medium uppercase">
                              {braid.alt_names.split(",")[1].trim()}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Plus Button */}
                    <button
                      onClick={() => setShowDetailModal(braid)}
                      className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors stick-no-bills text-xl sm:text-2xl lg:text-5xl font-bold"
                      title="View details"
                    >
                      +
                    </button>
                  </div>
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
              className="bg-blue-600 text-white py-2 px-6 hover:bg-blue-700 transition-colors stick-no-bills text-base font-light"
            >
              Be the first to submit!
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
