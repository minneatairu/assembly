"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { db, type Braid } from "@/lib/db"

export default function BraidGlossaryPage() {
  // Add Memory to the submission type
  const [submissionType, setSubmissionType] = useState<"photo" | "link" | "memory">("photo")
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

  // Filter states
  const [showFilter, setShowFilter] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "photo" | "link" | "memory">("all")

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

  // Custom dropdown state
  const [showDropdown, setShowDropdown] = useState(false)

  // Tooltip states
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null)

  // Add memory-specific form fields to the formData state:
  const [formData, setFormData] = useState({
    braidName: "",
    altNames: "",
    region: "",
    imageFiles: [] as File[],
    imageUrl: "",
    contributorName: "",
    linkUrl: "",
    linkTitle: "",
    linkDescription: "",
    memoryTitle: "",
    memoryDescription: "",
    agreeToShare: false,
  })

  // Add image preview state
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [showAccountCreation, setShowAccountCreation] = useState(false)
  const [accountData, setAccountData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  })

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: string]: number }>({})

  // Check audio support on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioSupported(false)
    }
  }, [])

  // Filter braids based on submission type
  const filteredBraids = braids.filter((braid) => {
    if (filterType === "all") return true
    return braid.submission_type === filterType
  })

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
        } else if (showFilter) {
          setShowFilter(false)
        }
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showImageModal, showInfoModal, showDetailModal, showForm, showFilter])

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

    if (allFiles.length > 5) {
      setError("Please select only 5 images maximum for upload.")
      return
    }

    if (allFiles.length > 0) {
      // Clean up existing preview URLs
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))

      // Create new preview URLs
      const newPreviews = allFiles.map((file) => URL.createObjectURL(file))
      setImagePreviews(newPreviews)

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
      console.log("Fetching braids...")
      const data = await db.getBraids()
      console.log("Fetched braids:", data)
      setBraids(data)

      // Check demo status
      const status = db.getDemoStatus()
      console.log("Demo status:", status)
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

    // Validate based on submission type
    if (submissionType === "link" && !formData.linkUrl.trim()) {
      setError("Please provide a URL for link submissions.")
      return
    }

    if (submissionType === "photo" && formData.imageFiles.length === 0 && !formData.imageUrl.trim()) {
      setError("Please provide at least one image for photo submissions.")
      return
    }

    // Add validation for memory submissions
    if (submissionType === "memory" && (!formData.memoryTitle.trim() || !formData.memoryDescription.trim())) {
      setError("Please provide both a title and description for memory submissions.")
      return
    }

    setSubmitting(true)
    setError(null)
    setUploadStatus(null)

    try {
      let imageUrls: string[] = []

      if (submissionType === "photo") {
        if (formData.imageFiles.length > 0) {
          imageUrls = await uploadImages(formData.imageFiles)
        } else if (formData.imageUrl.trim()) {
          imageUrls = [formData.imageUrl.trim()]
          setUploadStatus("Using provided image URL")
        }
      }

      // Upload audio if recorded
      if (audioBlob) {
        audioUrl = await uploadAudio(audioBlob)
        // Continue even if audio upload fails
      }

      // Add memory-specific fields to the database submission
      const newBraid = await db.addBraid({
        braid_name: formData.braidName,
        alt_names: formData.altNames || undefined,
        region: formData.region,
        image_url: imageUrls.length > 0 ? imageUrls[0] : undefined,
        image_urls: imageUrls.length > 1 ? imageUrls : undefined,
        public_url: submissionType === "link" ? formData.linkUrl : undefined,
        link_title: submissionType === "link" ? formData.linkTitle : undefined,
        link_description: submissionType === "link" ? formData.linkDescription : undefined,
        memory_title: submissionType === "memory" ? formData.memoryTitle : undefined,
        memory_description: formData.memoryDescription || undefined,
        contributor_name: formData.contributorName,
        audio_url: audioUrl || undefined,
        audio_notes: "Pronunciation guide", // Fixed description for pronunciation
        submission_type: submissionType,
      })

      // Update local state
      setBraids((prev) => [newBraid, ...prev])

      // Add memory fields to form reset
      setFormData({
        braidName: "",
        altNames: "",
        region: "",
        imageFiles: [],
        imageUrl: "",
        contributorName: "",
        linkUrl: "",
        linkTitle: "",
        linkDescription: "",
        memoryTitle: "",
        memoryDescription: "",
        agreeToShare: false,
      })

      // Clean up image previews
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
      setImagePreviews([])

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

    if (allFiles.length > 5) {
      setError("Please select only 5 images maximum for upload.")
      // Reset the file input
      e.target.value = ""
      return
    }

    // Clean up existing preview URLs
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))

    // Create new preview URLs
    const newPreviews = allFiles.map((file) => URL.createObjectURL(file))
    setImagePreviews(newPreviews)

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
      // Cleanup image previews
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
      // Cleanup audio refs
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause()
          audio.src = ""
        }
      })
    }
  }, [audioUrl, imagePreviews])

  const submissionOptions = [
    { value: "photo", label: "Photo" },
    { value: "link", label: "Link" },
    { value: "memory", label: "Memory" },
  ]

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "photo", label: "Photo" },
    { value: "link", label: "Link" },
    { value: "memory", label: "Memory" },
  ]

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Menu Bar */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <div className="px-8 py-6">
          <div className="flex items-center justify-start gap-4">
            <div className="flex gap-4 border-2 border-black rounded-full p-4 bg-lime-400">
              <div className="relative">
                <button
                  onClick={() => (window.location.href = "/")}
                  className="hover:opacity-70 transition-opacity"
                  onMouseEnter={() => setHoveredIcon("home")}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <img src="/globe.svg" alt="Globe" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </button>
                {hoveredIcon === "home" && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-xs rounded-none whitespace-nowrap stick-no-bills uppercase">
                    HOME
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="hover:opacity-70 transition-opacity"
                  onMouseEnter={() => setHoveredIcon("info")}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <img src="/infor.svg" alt="Info" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </button>
                {hoveredIcon === "info" && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-xs rounded-none whitespace-nowrap stick-no-bills uppercase">
                    ABOUT
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => (window.location.href = "/profile")}
                  className="hover:opacity-70 transition-opacity"
                  onMouseEnter={() => setHoveredIcon("account")}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <img src="/cool.svg" alt="Cool" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </button>
                {hoveredIcon === "account" && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-xs rounded-none whitespace-nowrap stick-no-bills uppercase">
                    YOUR ACCOUNT
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => (window.location.href = "mailto:contact@dataassembly.com")}
                  className="hover:opacity-70 transition-opacity"
                  onMouseEnter={() => setHoveredIcon("email")}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <img src="/email.svg" alt="Email" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </button>
                {hoveredIcon === "email" && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-xs rounded-none whitespace-nowrap stick-no-bills uppercase">
                    CONTACT
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowFilter(true)}
                  className="hover:opacity-70 transition-opacity"
                  onMouseEnter={() => setHoveredIcon("filter")}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <img src="/search.svg" alt="Search" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </button>
                {hoveredIcon === "filter" && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-xs rounded-none whitespace-nowrap stick-no-bills uppercase">
                    FILTER
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowForm(true)}
                  className="hover:opacity-70 transition-opacity"
                  onMouseEnter={() => setHoveredIcon("submit")}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <img src="/submit.svg" alt="Submit" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                </button>
                {hoveredIcon === "submit" && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 text-xs rounded-none whitespace-nowrap stick-no-bills uppercase">
                    SUBMIT A BRAID
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 px-8 pb-8">
        {/* Header */}
        <div className="text-center mb-12">{/* Remove this entire header section */}</div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="stick-no-bills text-black text-xl">Loading braids...</div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="stick-no-bills text-red-600 text-xl mb-4">{error}</div>
            <button
              onClick={fetchBraids}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 stick-no-bills"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Gallery Grid - Masonry Layout */}
        {!loading && filteredBraids.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="columns-2 gap-6 space-y-6">
              {filteredBraids.map((braid) => {
                // Determine if this braid has multiple images
                const hasMultipleImages = (braid as any).image_urls && (braid as any).image_urls.length > 1
                const totalImages = hasMultipleImages ? (braid as any).image_urls.length : braid.image_url ? 1 : 0
                const isTextSubmission = braid.submission_type === "link" || braid.submission_type === "memory"
                const currentImageIndex = currentImageIndices[braid.id.toString()] || 0

                return (
                  <div
                    key={braid.id}
                    className="bg-white overflow-hidden hover:shadow-lg transition-shadow cursor-pointer break-inside-avoid mb-6"
                    onClick={() => setShowDetailModal(braid)}
                  >
                    {/* Image or Title Area */}
                    <div
                      className="relative"
                      style={{
                        aspectRatio: isTextSubmission ? "16/9" : "3/4",
                      }}
                    >
                      {braid.submission_type === "photo" && braid.image_url ? (
                        <>
                          <img
                            src={
                              (braid as any).image_urls?.[currentImageIndex] || braid.image_url || "/placeholder.svg"
                            }
                            alt={braid.braid_name}
                            className="w-full h-full object-cover transition-opacity duration-300 ease-in-out transition-all duration-500 ease-in-out"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src =
                                "/placeholder.svg?height=300&width=300&text=" + encodeURIComponent(braid.braid_name)
                            }}
                          />

                          {/* Multiple images navigation */}
                          {hasMultipleImages && (
                            <div className="absolute top-0 left-0">
                              <div className="bg-black text-white px-2 py-1 text-3xl sm:text-xl md:text-2xl lg:text-3xl stick-no-bills mb-1 inline-block">
                                {currentImageIndex + 1} / {totalImages}
                              </div>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const currentIndex = currentImageIndices[braid.id.toString()] || 0
                                    const newIndex = currentIndex > 0 ? currentIndex - 1 : totalImages - 1
                                    setCurrentImageIndices((prev) => ({ ...prev, [braid.id.toString()]: newIndex }))
                                  }}
                                  className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                                  title="Previous image"
                                >
                                  ←
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const currentIndex = currentImageIndices[braid.id.toString()] || 0
                                    const newIndex = currentIndex < totalImages - 1 ? currentIndex + 1 : 0
                                    setCurrentImageIndices((prev) => ({ ...prev, [braid.id.toString()]: newIndex }))
                                  }}
                                  className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                                  title="Next image"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        // Title display for link and memory submissions - 16:9 aspect ratio
                        <div className="w-full h-full bg-yellow-400 flex items-center justify-center p-4">
                          <h3 className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl font-bold stick-no-bills text-black uppercase text-center leading-tight">
                            {braid.submission_type === "memory"
                              ? (braid as any).memory_title || braid.braid_name || "Untitled Memory"
                              : braid.submission_type === "link"
                                ? (braid as any).link_title || braid.braid_name || "Untitled Link"
                                : braid.braid_name}
                          </h3>
                        </div>
                      )}

                      {/* Submission type indicator */}
                      <div className="absolute bottom-0 right-0 bg-black/70 text-white px-2 py-1 text-xs stick-no-bills uppercase">
                        {braid.submission_type}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {/* Show braid name for photo submissions, or subtitle for others */}
                      {braid.submission_type === "photo" ? (
                        <h3 className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl font-bold stick-no-bills text-black uppercase mb-2">
                          {braid.braid_name}
                        </h3>
                      ) : (
                        <h3 className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl font-bold stick-no-bills text-black uppercase mb-2">
                          {braid.submission_type === "memory"
                            ? (braid as any).memory_title || braid.braid_name || "Untitled Memory"
                            : braid.submission_type === "link"
                              ? (braid as any).link_title || braid.braid_name || "Untitled Link"
                              : braid.braid_name}
                        </h3>
                      )}

                      {/* Only show contributor name */}
                      <div className="flex items-center justify-between">
                        <div className="stick-no-bills text-xs text-gray-600">
                          <span className="font-medium text-black uppercase">CONTRIBUTOR: </span>
                          <span className="text-black uppercase">{braid.contributor_name}</span>
                        </div>

                        {/* Plus icon */}
                        <div className="w-6 h-6 bg-black text-white flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBraids.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="stick-no-bills text-black text-xl mb-4">
              {filterType === "all" ? "No braids found" : `No ${filterType} submissions found`}
            </div>
            <p className="stick-no-bills text-gray-600 mb-6">
              {filterType === "all"
                ? "Be the first to contribute to the glossary!"
                : `Be the first to add a ${filterType} submission!`}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-400 text-black py-3 px-6 hover:bg-green-500 transition-colors stick-no-bills border-2 border-black rounded-full text-lg font-bold"
            >
              ADD A BRAID
            </button>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 z-30" onClick={() => setShowFilter(false)}>
          {/* Filter dropdown positioned below menu */}
          <div className="absolute top-32 left-8">
            <div
              className="bg-white w-80 shadow-xl border-2 border-black animate-in slide-in-from-top-4 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl mb-4 stick-no-bills font-light uppercase">Filter Submissions</h2>

                <div className="space-y-0">
                  {filterOptions.map((option, index) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterType(option.value as "all" | "photo" | "link" | "memory")
                        setShowFilter(false)
                      }}
                      className={`w-full p-3 text-left stick-no-bills text-black text-lg border-2 border-black transition-colors ${
                        filterType === option.value ? "bg-green-400 hover:bg-green-500" : "bg-gray-50 hover:bg-gray-100"
                      } ${index > 0 ? "border-t-0" : ""}`}
                    >
                      {option.label}
                      {option.value !== "all" && (
                        <span className="text-sm text-gray-600 block">
                          {braids.filter((b) => b.submission_type === option.value).length} submissions
                        </span>
                      )}
                      {option.value === "all" && (
                        <span className="text-sm text-gray-600 block">{braids.length} total submissions</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-white animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl relative shadow-xl animate-in slide-in-from-bottom-4 duration-300 border-2 border-black my-8">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-black hover:text-gray-600 z-10 transition-colors duration-200"
            >
              <svg
                className="w-12 h-12 sm:w-12 sm:h-12 lg:w-12 lg:h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-0">
              {/* Custom Submission Type Dropdown */}
              <div className="border-b-2 border-black relative w-1/4">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full h-16 px-4 bg-green-400 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 stick-no-bills text-black text-3xl sm:text-2xl md:text-3xl text-left flex items-center justify-between hover:bg-green-500 transition-colors"
                >
                  <span>{submissionOptions.find((opt) => opt.value === submissionType)?.label}</span>
                  <svg
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    className={`transition-transform ${showDropdown ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M1 1L6 6L11 1"
                      stroke="#000"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute top-full left-0 w-full bg-green-400 border-2 border-black border-t-0 z-20">
                    {submissionOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSubmissionType(option.value as "photo" | "link" | "memory")
                          setShowDropdown(false)
                        }}
                        className={`w-full h-16 px-4 text-left stick-no-bills text-black text-3xl sm:text-2xl md:text-3xl hover:bg-green-500 transition-colors border-b border-black last:border-b-0 ${
                          submissionType === option.value ? "bg-green-500" : ""
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Conditional Layout Based on Submission Type */}
              {submissionType === "photo" ? (
                // Two-column layout for photo submissions
                <div className="flex h-full">
                  {/* Left Side - Photo Upload Area */}
                  <div className="w-1/2">
                    <div
                      className={`relative bg-green-400 border-r-2 border-black transition-colors ${
                        isDragOver ? "bg-green-500" : ""
                      } flex flex-col items-center justify-center cursor-pointer overflow-visible h-full min-h-[500px]`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("file-input")?.click()}
                    >
                      {/* Show uploaded files or upload prompt */}
                      {formData.imageFiles.length > 0 ? (
                        <div className="w-full h-full overflow-y-auto">
                          {formData.imageFiles.length === 1 ? (
                            // Single image - full display with 3:4 aspect ratio
                            <div className="relative w-full mb-4" style={{ aspectRatio: "3/4" }}>
                              <img
                                src={imagePreviews[0] || "/placeholder.svg"}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Clean up the preview URL
                                  URL.revokeObjectURL(imagePreviews[0])
                                  setFormData((prev) => ({ ...prev, imageFiles: [] }))
                                  setImagePreviews([])
                                  // Reset file input
                                  const fileInput = document.getElementById("file-input") as HTMLInputElement
                                  if (fileInput) fileInput.value = ""
                                }}
                                className="absolute -top-2 -right-2 w-12 h-12 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 text-sm font-bold"
                                title="Remove image"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            // Multiple images - remove borders and gaps
                            <div className="space-y-4">
                              <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                                <img
                                  src={imagePreviews[currentImageIndex] || "/placeholder.svg"}
                                  alt={`Preview ${currentImageIndex + 1}`}
                                  className="w-full h-full object-cover transition-opacity duration-300 ease-in-out transition-all duration-500 ease-in-out"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Remove the current image
                                    const newFiles = formData.imageFiles.filter((_, i) => i !== currentImageIndex)
                                    const newPreviews = imagePreviews.filter((_, i) => i !== currentImageIndex)

                                    // Clean up the removed preview URL
                                    URL.revokeObjectURL(imagePreviews[currentImageIndex])

                                    setFormData((prev) => ({ ...prev, imageFiles: newFiles }))
                                    setImagePreviews(newPreviews)

                                    // Adjust current index if needed
                                    if (currentImageIndex >= newFiles.length && newFiles.length > 0) {
                                      setCurrentImageIndex(newFiles.length - 1)
                                    } else if (newFiles.length === 0) {
                                      setCurrentImageIndex(0)
                                      // Reset file input if no files left
                                      const fileInput = document.getElementById("file-input") as HTMLInputElement
                                      if (fileInput) fileInput.value = ""
                                    }
                                  }}
                                  className="absolute -top-2 -right-2 w-12 h-12 bg-red-600 text-white flex items-center justify-center hover:bg-red-700 text-sm font-bold"
                                  title="Remove image"
                                >
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>

                                {/* Image counter and navigation arrows - matching card slideshow style */}
                                <div className="absolute top-0 left-0">
                                  <div className="bg-black text-white px-2 py-1 text-3xl sm:text-xl md:text-2xl lg:text-3xl stick-no-bills mb-1 inline-block">
                                    {currentImageIndex + 1} / {formData.imageFiles.length}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCurrentImageIndex((prev) => prev - 1)
                                      }}
                                      className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                                      title="Previous image"
                                    >
                                      ←
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCurrentImageIndex((prev) => prev + 1)
                                      }}
                                      className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                                      title="Next image"
                                    >
                                      →
                                    </button>
                                  </div>
                                </div>

                                {/* Thumbnail strip - remove gaps */}
                                <div className="flex gap-0 overflow-x-auto pb-2">
                                  {imagePreviews.map((preview, index) => (
                                    <button
                                      key={index}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCurrentImageIndex(index)
                                      }}
                                      className={`relative flex-shrink-0 w-16 h-16 transition-all ${
                                        index === currentImageIndex ? "opacity-100" : "opacity-70 hover:opacity-90"
                                      }`}
                                      title={`View image ${index + 1}`}
                                    >
                                      <img
                                        src={preview || "/placeholder.svg"}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Remove this upload text section when images are uploaded - delete this entire block */}
                          {formData.imageFiles.length === 0 && (
                            <div className="text-center">
                              <p className="text-black text-center font-medium stick-no-bills mb-2 text-3xl sm:text-2xl md:text-3xl">
                                CLICK TO UPLOAD
                              </p>
                              <p className="text-black text-sm stick-no-bills">(JPG, PNG, GIF, WebP - Max 5 files)</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-black text-center font-medium stick-no-bills mb-2 text-3xl sm:text-2xl md:text-3xl">
                            CLICK TO UPLOAD
                          </p>
                          <p className="text-black text-sm stick-no-bills">(JPG, PNG, GIF, WebP - Max 5 files)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side - Form Fields for Photo */}
                  <div className="w-1/2 flex flex-col">
                    <div className="flex-1 flex flex-col min-h-[500px]">
                      {/* Make input fields fill the height with fixed heights */}
                      <input
                        type="text"
                        name="braidName"
                        value={formData.braidName ?? ""}
                        onChange={handleInputChange}
                        placeholder="Braid name"
                        className="h-20 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-3xl sm:text-2xl md:text-3xl"
                        required
                      />

                      <input
                        type="text"
                        name="altNames"
                        value={formData.altNames ?? ""}
                        onChange={handleInputChange}
                        placeholder="Alternative names"
                        className="h-20 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-3xl sm:text-2xl md:text-3xl"
                      />

                      <input
                        type="text"
                        name="region"
                        value={formData.region ?? ""}
                        onChange={handleInputChange}
                        placeholder="Cultural origin"
                        className="h-20 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-3xl sm:text-2xl md:text-3xl"
                        required
                      />

                      <input
                        type="text"
                        name="contributorName"
                        value={formData.contributorName ?? ""}
                        onChange={handleInputChange}
                        placeholder="Contributor name"
                        className="h-20 px-4 bg-gray-50 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-3xl sm:text-2xl md:text-3xl"
                        required
                      />

                      {/* Audio Recording */}
                      {audioSupported && (
                        <div className="h-20 flex items-center">
                          {!isRecording && !audioBlob && (
                            <button
                              type="button"
                              onClick={startRecording}
                              className="w-full h-full px-4 bg-gray-50 hover:bg-gray-100 text-black text-left font-normal transition-colors stick-no-bills text-3xl sm:text-2xl md:text-3xl"
                            >
                              Record pronunciation
                            </button>
                          )}
                          {isRecording && (
                            <div className="w-full h-full px-4 bg-red-50 flex items-center justify-between">
                              <span className="text-red-600 stick-no-bills text-2xl">Recording...</span>
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 stick-no-bills"
                              >
                                Stop
                              </button>
                            </div>
                          )}
                          {audioBlob && (
                            <div className="w-full h-full px-4 bg-green-50 flex items-center justify-between">
                              <span className="text-green-600 stick-no-bills text-2xl">Recorded!</span>
                              <button
                                type="button"
                                onClick={clearRecording}
                                className="px-4 py-2 bg-gray-400 text-white hover:bg-gray-500 stick-no-bills"
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Single-column layout for link and memory submissions
                <div className="w-full">
                  {submissionType === "link" ? (
                    // Link Form - Full Width
                    <div className="bg-white p-8">
                      <div className="max-w-2xl mx-auto space-y-0">
                        {/* Link Title */}
                        <div className="relative">
                          <input
                            type="text"
                            name="linkTitle"
                            value={formData.linkTitle ?? ""}
                            onChange={handleInputChange}
                            placeholder="Title"
                            className="w-full p-4 bg-white border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                          />
                          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 stick-no-bills text-sm">
                            Optional
                          </span>
                        </div>

                        {/* Link URL */}
                        <input
                          type="url"
                          name="linkUrl"
                          value={formData.linkUrl ?? ""}
                          onChange={handleInputChange}
                          placeholder="URL"
                          className="w-full p-4 bg-white border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                          required={submissionType === "link"}
                        />

                        {/* Link Description */}
                        <div className="relative">
                          <textarea
                            name="linkDescription"
                            value={formData.linkDescription ?? ""}
                            onChange={handleInputChange}
                            placeholder="Description"
                            rows={4}
                            className="w-full p-4 bg-white border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400 resize-none"
                          />
                          <span className="absolute right-4 top-4 text-gray-400 stick-no-bills text-sm">Optional</span>
                        </div>

                        {/* Basic Info for Link */}
                        <input
                          type="text"
                          name="contributorName"
                          value={formData.contributorName ?? ""}
                          onChange={handleInputChange}
                          placeholder="Contributor name"
                          className="w-full p-4 bg-white border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    // Memory Form - Full Width
                    <div className="bg-white p-8">
                      <div className="max-w-2xl mx-auto space-y-0">
                        {/* Memory Title */}
                        <input
                          type="text"
                          name="memoryTitle"
                          value={formData.memoryTitle ?? ""}
                          onChange={handleInputChange}
                          placeholder="Memory title"
                          className="w-full p-4 bg-white border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                          required={submissionType === "memory"}
                        />

                        {/* Memory Description */}
                        <textarea
                          name="memoryDescription"
                          value={formData.memoryDescription ?? ""}
                          onChange={handleInputChange}
                          placeholder="Describe your memory"
                          rows={8}
                          className="w-full p-4 bg-white border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400 resize-none"
                          required={submissionType === "memory"}
                        />

                        {/* Audio Recording for Memory */}
                        {audioSupported && (
                          <div className="bg-white p-4 border border-gray-300">
                            <h4 className="stick-no-bills text-black font-medium mb-3">
                              Record Your Memory (Optional)
                            </h4>
                            <div className="flex items-center gap-3">
                              {!isRecording && !audioBlob && (
                                <button
                                  type="button"
                                  onClick={startRecording}
                                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium stick-no-bills border-2 border-black"
                                >
                                  Start Recording
                                </button>
                              )}

                              {isRecording && (
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 text-sm font-medium stick-no-bills border-2 border-black"
                                  >
                                    Stop Recording
                                  </button>
                                  <span className="text-red-600 text-sm font-mono stick-no-bills">
                                    🔴 {formatTime(recordingTime)}
                                  </span>
                                </div>
                              )}

                              {audioBlob && (
                                <div className="flex items-center gap-3">
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

                        {/* Basic Info for Memory */}
                        <input
                          type="text"
                          name="contributorName"
                          value={formData.contributorName ?? ""}
                          onChange={handleInputChange}
                          placeholder="Contributor name"
                          className="w-full p-4 bg-white border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Messages for Single Column */}
                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-black text-red-700 text-sm mx-8 stick-no-bills">
                      {error}
                    </div>
                  )}

                  {uploadStatus && (
                    <div
                      className={`p-4 text-sm mx-8 border-2 border-black stick-no-bills ${
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
              )}

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
                <label className="flex items-center gap-2 stick-no-bills text-black">
                  <input
                    type="checkbox"
                    checked={showAccountCreation}
                    onChange={() => setShowAccountCreation(!showAccountCreation)}
                    className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2"
                  />
                  Create an account to manage your submissions
                </label>
              </div>

              {/* Account Creation Form */}
              {showAccountCreation && (
                <div className="p-4 space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={accountData.email}
                    onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                    className="w-full p-3 bg-gray-50 border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={accountData.password}
                    onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                    className="w-full p-3 bg-gray-50 border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                    className="w-full p-3 bg-gray-50 border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="First Name"
                    value={accountData.firstName}
                    onChange={(e) => setAccountData({ ...accountData, firstName: e.target.value })}
                    className="w-full p-3 bg-gray-50 border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={accountData.lastName}
                    onChange={(e) => setAccountData({ ...accountData, lastName: e.target.value })}
                    className="w-full p-3 bg-gray-50 border-b border-gray-300 text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
              )}

              {/* Submit Button - Full Width */}
              <div className="p-4">
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 bg-green-400 text-black text-3xl sm:text-2xl md:text-3xl hover:bg-green-500 transition-colors stick-no-bills border-2 border-black rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Braid"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80">
          <div className="relative">
            <button onClick={closeImageModal} className="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
              <svg
                className="w-12 h-12 sm:w-12 sm:h-12 lg:w-12 lg:h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={showImageModal.url || "/placeholder.svg"}
              alt={showImageModal.caption}
              className="max-w-full max-h-screen object-contain"
            />
            <p className="mt-4 text-white text-center stick-no-bills">{showImageModal.caption}</p>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80">
          <div className="relative bg-white max-w-3xl mx-auto p-8 rounded-md">
            <button onClick={closeInfoModal} className="absolute top-4 right-4 text-black hover:text-gray-600 z-10">
              <svg
                className="w-12 h-12 sm:w-12 sm:h-12 lg:w-12 lg:h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-3xl font-semibold mb-6 stick-no-bills text-black">About the Braid Glossary</h2>
            <p className="mb-4 stick-no-bills text-black">
              The Braid Glossary is a community-driven project dedicated to documenting and preserving the diverse world
              of braids. Our mission is to create a comprehensive resource that celebrates the cultural significance,
              history, and artistry of braids from around the globe.
            </p>
            <h3 className="text-2xl font-semibold mb-4 stick-no-bills text-black">How to Contribute</h3>
            <p className="mb-4 stick-no-bills text-black">
              We invite you to share your knowledge and experiences by submitting information about different types of
              braids. Whether it's a traditional style passed down through generations or a contemporary creation, your
              contributions help enrich our understanding of this intricate art form.
            </p>
            <ul className="list-disc pl-6 mb-4 stick-no-bills text-black">
              <li>
                <b>Photos:</b> Share clear images of braids, highlighting their unique patterns and textures.
              </li>
              <li>
                <b>Links:</b> Provide links to relevant articles, tutorials, or resources that offer further insights
                into specific braid styles.
              </li>
              <li>
                <b>Memories:</b> Share personal stories and anecdotes related to braids, adding a personal touch to the
                glossary.
              </li>
            </ul>
            <h3 className="text-2xl font-semibold mb-4 stick-no-bills text-black">Contact Us</h3>
            <p className="stick-no-bills text-black">
              If you have any questions, suggestions, or feedback, please don't hesitate to reach out to us at{" "}
              <a href="mailto:contact@dataassembly.com" className="text-blue-600 hover:underline">
                contact@dataassembly.com
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowDetailModal(null)}
                className="absolute -top-12 right-0 text-white bg-black hover:bg-gray-800 p-2 transition-colors duration-200 z-10"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="shadow-lg animate-in slide-in-from-bottom-4 duration-300 border-2 border-black bg-white">
                <div className="p-0">
                  {/* Image or Title Area - No padding */}
                  <div
                    className="relative w-full"
                    style={{
                      aspectRatio:
                        showDetailModal.submission_type === "link" || showDetailModal.submission_type === "memory"
                          ? "16/9"
                          : "3/4",
                    }}
                  >
                    {showDetailModal.submission_type === "photo" && showDetailModal.image_url ? (
                      <img
                        src={showDetailModal.image_url || "/placeholder.svg"}
                        alt={showDetailModal.braid_name}
                        className="w-full h-full object-cover transition-all duration-500 ease-in-out"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src =
                            "/placeholder.svg?height=300&width=300&text=" +
                            encodeURIComponent(showDetailModal.braid_name)
                        }}
                      />
                    ) : (
                      // Title display for link and memory submissions
                      <div className="w-full h-full bg-yellow-400 flex items-center justify-center p-4">
                        <h3 className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl font-bold stick-no-bills text-black uppercase text-center leading-tight">
                          {showDetailModal.submission_type === "memory"
                            ? (showDetailModal as any).memory_title || showDetailModal.braid_name || "Untitled Memory"
                            : showDetailModal.submission_type === "link"
                              ? (showDetailModal as any).link_title || showDetailModal.braid_name || "Untitled Link"
                              : showDetailModal.braid_name}
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* Content below image */}
                  <div className="p-8 bg-white">
                    {/* Title under image */}
                    <h2 className="text-4xl font-bold mb-6 stick-no-bills text-black uppercase">
                      {showDetailModal.braid_name}
                    </h2>

                    {/* Inline submission fields */}
                    <div className="space-y-0">
                      {/* Alternate Names - inline */}
                      {showDetailModal.alt_names && (
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                            ALTERNATE NAMES
                          </span>
                          <span className="stick-no-bills text-black uppercase text-xl">
                            ({" "}
                            {showDetailModal.alt_names
                              .split(",")
                              .map((name) => name.trim())
                              .join(", ")}{" "}
                            )
                          </span>
                        </div>
                      )}

                      {/* Region - inline */}
                      {showDetailModal.region && (
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                            REGION
                          </span>
                          <span className="stick-no-bills text-black uppercase text-xl">
                            ( {showDetailModal.region} )
                          </span>
                        </div>
                      )}

                      {/* Contributor - inline */}
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                          CONTRIBUTOR
                        </span>
                        <span className="stick-no-bills text-black uppercase text-xl">
                          ( {showDetailModal.contributor_name} )
                        </span>
                      </div>

                      {/* Audio - simplified */}
                      {showDetailModal.audio_url && (
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                            PRONUNCIATION
                          </span>
                          <button
                            onClick={() => toggleAudio(showDetailModal.id, showDetailModal.audio_url!)}
                            className="text-black hover:text-gray-600 transition-colors"
                            title={playingAudio[showDetailModal.id.toString()] ? "Pause audio" : "Play audio"}
                          >
                            {playingAudio[showDetailModal.id.toString()] ? (
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                              </svg>
                            ) : (
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Link Details - inline */}
                      {showDetailModal.submission_type === "link" && (
                        <>
                          {showDetailModal.public_url && (
                            <div className="flex items-start gap-4">
                              <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                                URL
                              </span>
                              <span className="stick-no-bills text-black uppercase text-xl">
                                ({" "}
                                <a
                                  href={showDetailModal.public_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline break-all"
                                >
                                  {showDetailModal.public_url}
                                </a>{" "}
                                )
                              </span>
                            </div>
                          )}
                          {(showDetailModal as any).link_description && (
                            <div className="flex items-start gap-4">
                              <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                                DESCRIPTION
                              </span>
                              <span className="stick-no-bills text-black uppercase text-xl">
                                ( {(showDetailModal as any).link_description} )
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Memory Details - inline */}
                      {showDetailModal.submission_type === "memory" && (
                        <>
                          {(showDetailModal as any).memory_description && (
                            <div className="flex items-start gap-4">
                              <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                                MEMORY
                              </span>
                              <span className="stick-no-bills text-black leading-relaxed uppercase text-xl">
                                ( {(showDetailModal as any).memory_description} )
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Date and timestamp - moved to last */}
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                          SUBMITTED
                        </span>
                        <span className="stick-no-bills text-black uppercase text-xl">
                          ( {new Date(showDetailModal.created_at || Date.now()).toLocaleDateString()} at{" "}
                          {new Date(showDetailModal.created_at || Date.now()).toLocaleTimeString()} )
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
