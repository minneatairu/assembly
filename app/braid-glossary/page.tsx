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

  // Filter states - changed to support multiple selections
  const [showFilter, setShowFilter] = useState(false)
  const [filterTypes, setFilterTypes] = useState<("photo" | "link" | "memory")[]>([])

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

  // Audio duration state
  const [audioDurations, setAudioDurations] = useState<{ [key: string]: string }>({})

  // Check audio support on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioSupported(false)
    }
  }, [])

  // Filter braids based on submission types - updated for multiple selections
  const filteredBraids = braids.filter((braid) => {
    if (filterTypes.length === 0) return true
    return filterTypes.includes(braid.submission_type as "photo" | "link" | "memory")
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

  // Get audio duration
  const getAudioDuration = async (audioUrl: string, braidId: string | number) => {
    try {
      const audio = new Audio(audioUrl)
      audio.preload = "metadata"

      audio.onloadedmetadata = () => {
        const duration = audio.duration
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        const formattedDuration = `${minutes}:${seconds.toString().padStart(2, "0")}`

        setAudioDurations((prev) => ({
          ...prev,
          [braidId.toString()]: formattedDuration,
        }))
      }
    } catch (error) {
      console.error("Error loading audio duration:", error)
    }
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
    if (submissionType === "link") {
      if (!formData.linkUrl.trim()) {
        setError("Please provide a URL for link submissions.")
        return
      }
      if (!formData.linkTitle.trim()) {
        setError("Please provide a title for link submissions.")
        return
      }
      // Validate URL format
      try {
        new URL(formData.linkUrl.trim())
      } catch {
        setError("Please provide a valid URL format.")
        return
      }
    }

    if (submissionType === "photo") {
      if (formData.imageFiles.length === 0 && !formData.imageUrl.trim()) {
        setError("Please provide at least one image for photo submissions.")
        return
      }
      if (!formData.braidName.trim()) {
        setError("Please provide a braid name for photo submissions.")
        return
      }
      // Validate image URL if provided
      if (formData.imageUrl.trim()) {
        try {
          new URL(formData.imageUrl.trim())
        } catch {
          setError("Please provide a valid image URL format.")
          return
        }
      }
    }

    if (submissionType === "memory") {
      if (!formData.memoryTitle.trim()) {
        setError("Please provide a title for memory submissions.")
        return
      }
      if (!audioBlob) {
        setError("Please record audio for memory submissions.")
        return
      }
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
        memory_description: undefined,
        contributor_name: formData.contributorName.trim() || "anonymous",
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

  // Handle filter toggle - updated for multiple selections
  const handleFilterToggle = (filterType: "photo" | "link" | "memory") => {
    setFilterTypes((prev) => {
      if (prev.includes(filterType)) {
        return prev.filter((type) => type !== filterType)
      } else {
        return [...prev, filterType]
      }
    })
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilterTypes([])
  }

  // Load braids on mount
  useEffect(() => {
    fetchBraids()
  }, [])

  // Load audio durations when braids change
  useEffect(() => {
    braids.forEach((braid) => {
      if (braid.audio_url && !audioDurations[braid.id.toString()]) {
        getAudioDuration(braid.audio_url, braid.id)
      }
    })
  }, [braids])

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
    { value: "photo", label: "Photo", superscript: "JPEG" },
    { value: "link", label: "Link", superscript: "WEB" },
    { value: "memory", label: "Memory", superscript: "MP4" },
  ]

  const filterOptions = [
    { value: "photo", label: "Photo", superscript: "JPEG" },
    { value: "link", label: "Link", superscript: "WEB" },
    { value: "memory", label: "Memory", superscript: "MP4" },
  ]

  const memoryForm = (
    <div className="bg-white p-8">
      <div className="max-w-2xl mx-auto space-y-0">
        {/* Memory Title */}
        <div className="relative">
          <input
            type="text"
            name="memoryTitle"
            value={formData.memoryTitle ?? ""}
            onChange={handleInputChange}
            placeholder="Title"
            className="w-full p-4 bg-white border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-black"
            required
          />
        </div>

        {/* Audio Recording */}
        {audioSupported && (
          <div className="h-20 flex items-center">
            {!isRecording && !audioBlob && (
              <button
                type="button"
                onClick={startRecording}
                className="w-full h-full px-4 bg-gray-50 hover:bg-gray-100 text-black text-left font-normal transition-colors stick-no-bills text-3xl sm:text-2xl md:text-3xl"
              >
                Record memory
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

        {/* Basic Info for Memory */}
        <input
          type="text"
          name="contributorName"
          value={formData.contributorName ?? ""}
          onChange={handleInputChange}
          placeholder="Contributor name"
          className="w-full p-4 bg-white border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-3xl sm:text-2xl md:text-3xl focus:outline-none focus:border-black"
          required
        />
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Menu Bar */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <div className="px-8 py-6">
          <div className="flex items-center justify-start gap-4">
            <div className="flex gap-4 border-2 border-black rounded-none p-4 bg-yellow-400">
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

        {/* Active Filter Buttons */}
        {!loading && filterTypes.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex justify-end gap-2 flex-wrap">
              {filterTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setShowFilter(true)}
                  className="bg-black text-white px-4 py-2 stick-no-bills text-sm uppercase hover:bg-gray-800 transition-colors"
                >
                  {type} ({braids.filter((b) => b.submission_type === type).length})
                </button>
              ))}
              <button
                onClick={clearAllFilters}
                className="bg-red-600 text-white px-4 py-2 stick-no-bills text-sm uppercase hover:bg-red-700 transition-colors"
              >
                CLEAR ALL
              </button>
            </div>
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
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  \
