"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
  let audioUrl = "" // Changed from const to let
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
    imageFiles: [] as File[],
    imageUrl: "",
    contributorName: "",
    linkUrl: "",
    agreeToShare: false,
  })

  const [showAccountCreation, setShowAccountCreation] = useState(false)
  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
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
    const allFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/") || file.type === "image/gif",
    )

    if (allFiles.length > 4) {
      setError("Please select only 4 images maximum for upload.")
      return
    }

    if (allFiles.length > 0) {
      setFormData((prev) => ({ ...prev, imageFiles: allFiles, imageUrl: "" }))
      setUploadStatus(null)
      setError(null)
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
        audioUrl = URL.createObjectURL(audioBlob) // Updated to use let

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
    audioUrl = "" // Updated to use let
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

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map((file) => uploadImage(file))
    const results = await Promise.all(uploadPromises)
    return results.filter((url) => url !== null) as string[]
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate account creation if enabled
    if (showAccountCreation) {
      if (!accountData.email || !accountData.password || !accountData.firstName || !accountData.lastName) {
        setError("Please fill in all account fields.")
        return
      }
      if (accountData.password.length < 6) {
        setError("Password must be at least 6 characters long.")
        return
      }
      if (accountData.password !== accountData.confirmPassword) {
        setError("Passwords do not match.")
        return
      }
    }

    if (!formData.agreeToShare) {
      setError("Please agree to share your braid in the glossary to continue.")
      return
    }

    setSubmitting(true)
    setError(null)
    setUploadStatus(null)

    try {
      let imageUrls: string[] = []

      if (formData.imageFiles.length > 0) {
        imageUrls = await uploadImages(formData.imageFiles)
      } else if (formData.imageUrl.trim()) {
        imageUrls = [formData.imageUrl.trim()]
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
        image_url: imageUrls.length > 0 ? imageUrls[0] : undefined,
        image_urls: imageUrls.length > 1 ? imageUrls : undefined, // Store multiple URLs
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
        imageFiles: [],
        imageUrl: "",
        contributorName: "",
        linkUrl: "",
        agreeToShare: false,
      })

      // Reset account data
      setAccountData({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
      })
      setShowAccountCreation(false)

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
    const { name, value, type } = e.target

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || [])

    if (allFiles.length > 4) {
      setError("Please select only 4 images maximum for upload.")
      // Reset the file input
      e.target.value = ""
      return
    }

    setFormData((prev) => ({ ...prev, imageFiles: allFiles, imageUrl: "" }))
    setUploadStatus(null)
    setError(null)
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

  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Menu Bar */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <div className="px-8 py-6">
          <div className="flex items-center justify-start gap-4">
            <div className="flex gap-4 border-2 border-black rounded-full p-4">
              <button
                onClick={() => (window.location.href = "/")}
                className="hover:opacity-70 transition-opacity"
                title="Go to Data Assembly home"
              >
                <img src="/main.svg" alt="Main" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
              </button>
              <button
                onClick={() => window.location.reload()}
                className="hover:opacity-70 transition-opacity"
                title="Refresh page"
              >
                <img src="/refresh.svg" alt="Refresh" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
              </button>
              <button
                onClick={() => setShowInfoModal(true)}
                className="hover:opacity-70 transition-opacity"
                title="Learn more about the braid glossary"
              >
                <img src="/infor.svg" alt="Info" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
              </button>
              <button
                onClick={() => (window.location.href = "/profile")}
                className="hover:opacity-70 transition-opacity"
                title="Login to your account"
              >
                <img src="/accounting.svg" alt="Account" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="hover:opacity-70 transition-opacity"
                title="Add a new braid"
              >
                <img src="/submit.svg" alt="Submit" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl relative shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 border-2 border-black">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-black hover:text-gray-600 z-10 transition-colors duration-200"
            >
              <img src="/closing.svg" alt="Close" className="w-10 h-10 sm:w-12 sm:h-12" />
            </button>

            <div className="p-0">
              <div className="flex">
                {/* Left Side - Upload Area */}
                <div className="w-1/2">
                  <div
                    className={`relative bg-green-400 border-r-2 border-black transition-colors ${
                      isDragOver ? "bg-green-500" : ""
                    } flex flex-col items-center justify-center cursor-pointer overflow-visible`}
                    style={{ height: "384px", aspectRatio: "1/1" }} // Make it square
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-input")?.click()}
                  >
                    {formData.imageFiles.length > 0 || formData.imageUrl ? (
                      <div className="w-full h-full relative">
                        {formData.imageFiles.length > 0 ? (
                          <div className="w-full h-full relative">
                            {/* Main image */}
                            <div className="relative w-full h-full">
                              <img
                                src={URL.createObjectURL(formData.imageFiles[0]) || "/placeholder.svg"}
                                alt="Main preview"
                                className="w-full h-full object-cover"
                              />

                              {/* Thumbnails overlay - only show if more than 1 image */}
                              {formData.imageFiles.length > 1 && (
                                <div className="absolute bottom-2 right-2 flex gap-1 max-w-[120px] flex-wrap">
                                  {formData.imageFiles.slice(1).map((file, index) => (
                                    <div
                                      key={index + 1}
                                      className="relative group cursor-pointer"
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", (index + 1).toString())
                                      }}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        const draggedIndex = Number.parseInt(e.dataTransfer.getData("text/plain"))
                                        const targetIndex = index + 1

                                        if (draggedIndex !== targetIndex) {
                                          const newFiles = [...formData.imageFiles]
                                          const draggedFile = newFiles[draggedIndex]
                                          newFiles.splice(draggedIndex, 1)
                                          newFiles.splice(targetIndex, 0, draggedFile)
                                          setFormData((prev) => ({ ...prev, imageFiles: newFiles }))
                                        }
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Move clicked thumbnail to main position
                                        const newFiles = [...formData.imageFiles]
                                        const clickedFile = newFiles[index + 1]
                                        const mainFile = newFiles[0]
                                        newFiles[0] = clickedFile
                                        newFiles[index + 1] = mainFile
                                        setFormData((prev) => ({ ...prev, imageFiles: newFiles }))
                                      }}
                                    >
                                      <img
                                        src={URL.createObjectURL(file) || "/placeholder.svg"}
                                        alt={`Thumbnail ${index + 2}`}
                                        className="w-8 h-8 object-cover border border-white/50 rounded"
                                      />
                                      {/* Delete button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const newFiles = [...formData.imageFiles]
                                          newFiles.splice(index + 1, 1)
                                          setFormData((prev) => ({ ...prev, imageFiles: newFiles }))
                                        }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete image"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Main image delete button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newFiles = [...formData.imageFiles]
                                  newFiles.splice(0, 1)
                                  setFormData((prev) => ({ ...prev, imageFiles: newFiles }))
                                }}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 transition-colors"
                                title="Delete main image"
                              >
                                ×
                              </button>

                              {/* Image counter */}
                              {formData.imageFiles.length > 1 && (
                                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs stick-no-bills">
                                  {formData.imageFiles.length} files
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full relative">
                            <img
                              src={formData.imageUrl || "/placeholder.svg"}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=300&width=300&text=Invalid+Image"
                              }}
                            />
                            {/* URL image delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setFormData((prev) => ({ ...prev, imageUrl: "" }))
                              }}
                              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600 transition-colors"
                              title="Remove image URL"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-center font-medium stick-no-bills">
                            Click to {formData.imageFiles.length > 0 ? "change" : "add"} images
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-black text-center font-medium stick-no-bills mb-2 text-lg">
                          CLICK TO UPLOAD
                        </p>
                        <p className="text-black text-sm stick-no-bills">(JPG, PNG, GIF, WebP - Max 4 files)</p>
                      </div>
                    )}
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,image/gif"
                      multiple
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Right Side - Form Fields */}
                <div className="w-1/2">
                  <div className="space-y-0">
                    {/* Braid Name */}
                    <input
                      type="text"
                      name="braidName"
                      value={formData.braidName}
                      onChange={handleInputChange}
                      placeholder="Braid name"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      required
                    />

                    {/* Alternative Names */}
                    <input
                      type="text"
                      name="altNames"
                      value={formData.altNames}
                      onChange={handleInputChange}
                      placeholder="Alternative names"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                    />

                    {/* Region */}
                    <input
                      type="text"
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      placeholder="Cultural origin"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      required
                    />

                    {/* Contributor */}
                    <input
                      type="text"
                      name="contributorName"
                      value={formData.contributorName}
                      onChange={handleInputChange}
                      placeholder="Contributor name"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      required
                    />

                    {/* Link URL */}
                    <input
                      type="url"
                      name="linkUrl"
                      value={formData.linkUrl}
                      onChange={handleInputChange}
                      placeholder="Link to more info"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                    />

                    {/* Audio Recording */}
                    {audioSupported && (
                      <div>
                        <div className="flex items-center gap-3">
                          {!isRecording && !audioBlob && (
                            <button
                              type="button"
                              onClick={startRecording}
                              className="w-full h-16 px-4 bg-gray-50 hover:bg-gray-100 text-black text-left font-normal transition-colors stick-no-bills"
                            >
                              Record pronunciation
                            </button>
                          )}

                          {isRecording && (
                            <div className="flex items-center gap-3 w-full">
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 text-sm font-medium stick-no-bills border-2 border-black"
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
                                className="px-3 py-1 bg-gray-400 text-white hover:bg-gray-500 text-sm stick-no-bills border-2 border-black"
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
                          <audio controls className="w-full mt-4">
                            <source src={audioUrl} type="audio/webm" />
                            Your browser does not support audio playback.
                          </audio>
                        )}
                      </div>
                    )}

                    {/* Status Messages */}
                    {error && (
                      <div className="p-4 bg-red-50 border-2 border-black text-red-700 text-sm mt-6 stick-no-bills">
                        {error}
                      </div>
                    )}

                    {uploadStatus && (
                      <div
                        className={`p-4 text-sm mt-6 border-2 border-black stick-no-bills ${
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
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox - Full Width */}
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  id="agreeToShare"
                  name="agreeToShare"
                  checked={formData.agreeToShare}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2"
                  required
                />
                <label htmlFor="agreeToShare" className="stick-no-bills text-black leading-relaxed">
                  I agree to submit and share my braid information in the public glossary for educational and cultural
                  preservation purposes.
                </label>
              </div>

              {/* Account Creation Toggle */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="createAccount"
                    checked={showAccountCreation}
                    onChange={(e) => setShowAccountCreation(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2"
                  />
                  <label htmlFor="createAccount" className="stick-no-bills text-black font-medium">
                    CREATE ACCOUNT TO TRACK YOUR SUBMISSIONS
                  </label>
                </div>

                {showAccountCreation && (
                  <div className="space-y-0 border-2 border-black overflow-hidden">
                    {/* First Name */}
                    <input
                      type="text"
                      name="firstName"
                      value={accountData.firstName}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="First name"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      required={showAccountCreation}
                    />

                    {/* Last Name */}
                    <input
                      type="text"
                      name="lastName"
                      value={accountData.lastName}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Last name"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      required={showAccountCreation}
                    />

                    {/* Email */}
                    <input
                      type="email"
                      name="email"
                      value={accountData.email}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      required={showAccountCreation}
                    />

                    {/* Password */}
                    <input
                      type="password"
                      name="password"
                      value={accountData.password}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Password (min 6 characters)"
                      className="w-full h-16 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      minLength={6}
                      required={showAccountCreation}
                    />

                    {/* Confirm Password */}
                    <input
                      type="password"
                      name="confirmPassword"
                      value={accountData.confirmPassword}
                      onChange={(e) => setAccountData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm password"
                      className="w-full h-16 px-4 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black"
                      required={showAccountCreation}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button - Full Width */}
              <form onSubmit={handleSubmit}>
                <button
                  type="submit"
                  disabled={submitting || !formData.agreeToShare}
                  className="w-full bg-green-400 text-black py-6 font-bold hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed stick-no-bills border-t-2 border-black text-5xl"
                >
                  {submitting ? "SHARING..." : "SHARE"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl relative shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 border-2 border-black">
            <button
              onClick={closeInfoModal}
              className="sticky top-4 right-4 ml-auto hover:opacity-70 transition-opacity z-50"
            >
              <img src="/closing.svg" alt="Close" className="w-8 h-8 sm:w-10 sm:h-10" />
            </button>

            <div className="p-6 sm:p-8 lg:p-12">
              <h2 className="text-2xl mb-6 stick-no-bills font-light uppercase">ABOUT THE BRAID GLOSSARY</h2>

              <div className="space-y-12 stick-no-bills text-black">
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed">
                    The Braid Glossary is a crowdsourced, living dataset created to give Da Braidr (AI)—Minne Atairu's
                    text-to-braid generator—the semantic footing it currently lacks. It catalogues the names and visual
                    patterns of braided hairstyles across the African diaspora, capturing both widely used English terms
                    and the indigenous or localized names spoken in braiding communities.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-medium mb-2 text-black uppercase">
                    WHY IT MATTERS
                  </h3>
                  <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed">
                    Research on multimodal models demonstrates that these systems learn by aligning caption tokens with
                    visual features, and that culturally specific vocabularies are often sparse, mislabeled, or entirely
                    absent (e.g., Buolamwini & Gebru, 2018; Birhane, Prabhu & Kahembwe, 2021). For Black braiding,
                    metaphorical style names such as lemonade braids, butterfly locs, and Fulani feed-ins further
                    confound models tuned to privilege literal, descriptive pairings. Consequently, when users prompt Da
                    Braidr with these terms, the system frequently defaults to generic or inaccurate outputs. (See
                    example.)
                  </p>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-medium mb-2 text-black uppercase">
                    WHAT THE GLOSSARY DOES
                  </h3>
                  <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed">
                    Your contribution helps us build an explicit mapping layer between braid names and their
                    corresponding visual forms. Each entry in the glossary pairs a culturally specific term with vetted
                    reference images, which we use to refine Da Braidr's training data and embedding space. This process
                    improves name recognition and generation accuracy—without requiring users to translate or flatten
                    their cultural vocabulary into machine-readable terms.
                  </p>
                </div>
              </div>
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
              className="sticky top-4 right-4 ml-auto z-10 hover:opacity-70 transition-opacity"
            >
              <img src="/closing.svg" alt="Close" className="w-8 h-8 sm:w-10 sm:h-10" />
            </button>
            <img
              src={showImageModal.url || "/placeholder.svg"}
              alt={showImageModal.caption}
              className="w-full h-full object-contain"
              onClick={closeImageModal}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl relative shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 border-2 border-black">
            <button
              onClick={() => setShowDetailModal(null)}
              className="sticky top-4 right-4 ml-auto hover:opacity-70 transition-opacity z-50"
            >
              <img src="/closing.svg" alt="Close" className="w-8 h-8 sm:w-10 sm:h-10" />
            </button>

            <div className="space-y-6">
              {/* Image Carousel with Stacked Effect */}
              {showDetailModal.image_url && (
                <div className="w-full relative" style={{ aspectRatio: "3/4" }}>
                  {(showDetailModal as any).image_urls && (showDetailModal as any).image_urls.length > 1 ? (
                    <div className="relative w-full h-full">
                      {/* Background layers - visible parts of other images */}
                      {(showDetailModal as any).image_urls.map((url: string, index: number) => {
                        if (index === currentImageIndex) return null
                        const offset = (index - currentImageIndex) * 12
                        const zIndex = (showDetailModal as any).image_urls.length - Math.abs(index - currentImageIndex)

                        return (
                          <div
                            key={index}
                            className="absolute inset-0 overflow-hidden"
                            style={{
                              transform: `translate(${offset}px, ${offset}px)`,
                              zIndex: zIndex,
                            }}
                          >
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`${showDetailModal.braid_name} ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=400&width=300"
                              }}
                            />
                          </div>
                        )
                      })}

                      {/* Main image (current) */}
                      <div className="relative w-full h-full overflow-hidden" style={{ zIndex: 100 }}>
                        <img
                          src={(showDetailModal as any).image_urls[currentImageIndex] || "/placeholder.svg"}
                          alt={showDetailModal.braid_name}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() =>
                            handleImageClick(
                              (showDetailModal as any).image_urls[currentImageIndex],
                              showDetailModal.braid_name,
                            )
                          }
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg?height=400&width=300"
                          }}
                        />

                        {/* Navigation buttons */}
                        {currentImageIndex > 0 && (
                          <button
                            onClick={() => setCurrentImageIndex((prev) => prev - 1)}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
                            style={{ zIndex: 101 }}
                          >
                            ←
                          </button>
                        )}

                        {currentImageIndex < (showDetailModal as any).image_urls.length - 1 && (
                          <button
                            onClick={() => setCurrentImageIndex((prev) => prev + 1)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
                            style={{ zIndex: 101 }}
                          >
                            →
                          </button>
                        )}

                        {/* Image counter */}
                        <div
                          className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs stick-no-bills"
                          style={{ zIndex: 101 }}
                        >
                          {currentImageIndex + 1} / {(showDetailModal as any).image_urls.length}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={showDetailModal.image_url || "/placeholder.svg"}
                      alt={showDetailModal.braid_name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => handleImageClick(showDetailModal.image_url!, showDetailModal.braid_name)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=400&width=300"
                      }}
                    />
                  )}
                </div>
              )}

              <div className="p-6">
                {/* Title */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold stick-no-bills text-black uppercase mb-4">
                  {showDetailModal.braid_name}
                </h2>

                {/* Tags */}
                {showDetailModal.alt_names && (
                  <div className="flex flex-wrap gap-2 mb-6">
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

                {/* Details - Inline Format */}
                <div className="space-y-1 stick-no-bills text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black uppercase">REGION:</span>
                    <span className="text-black uppercase">{showDetailModal.region}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black uppercase">BY:</span>
                    <span className="text-black uppercase">{showDetailModal.contributor_name}</span>
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
                    <span className="text-black uppercase">
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
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs uppercase"
                      >
                        VISIT LINK
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className="pt-32 px-8 w-full">
        {loading ? (
          <div className="text-center py-12">
            <div className="stick-no-bills text-black">Loading braids...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {braids.map((braid, index) => (
              <div
                key={braid.id}
                className="bg-gray-200 border-2 border-black hover:opacity-90 transition-opacity relative"
              >
                {/* Index Number */}
                <div className="absolute top-8 right-8 z-10 bg-green-400 rounded-full w-8 h-8 flex items-center justify-center">
                  <span className="text-black stick-no-bills text-sm font-bold">{braids.length}</span>
                </div>

                {/* Image */}
                <img
                  src={braid.image_url || "/placeholder.svg"}
                  alt={braid.braid_name}
                  className="w-full h-64 object-cover cursor-pointer"
                  onClick={() => setShowDetailModal(braid)}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=256&width=384"
                  }}
                />

                {/* Braid Name */}
                <div className="p-4">
                  <h3 className="text-lg font-medium stick-no-bills text-black uppercase">{braid.braid_name}</h3>
                  <p className="text-sm stick-no-bills text-black">
                    {braid.alt_names ? braid.alt_names : "No alternative names"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
