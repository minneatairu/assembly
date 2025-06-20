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

  // Add this state variable with the other state declarations
  const [showBraidPatterns, setShowBraidPatterns] = useState(false)

  // Add memory-specific form fields to the formData state:
  const [formData, setFormData] = useState({
    braidName: "",
    altNames: "",
    region: "",
    era: "",
    braidFamily: "",
    braidPatterns: [] as string[],
    imageFiles: [] as File[],
    imageUrl: "",
    contributorName: "",
    linkUrl: "",
    linkTitle: "",
    linkDescription: "",
    memoryTitle: "",
    agreeToShare: false,
    licenseCheck: false,
    // Add credit fields
    stylist: "",
    photographer: "",
    community: "",
    source: "",
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
      setError("Please certify that you have the rights to submit this braid to continue.")
      return
    }

    if (!formData.licenseCheck) {
      setError(
        "Please confirm that this braid is either your original work, in the public domain, or covered by a license such as Creative Commons.",
      )
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
        era: formData.era || undefined,
        braid_family: formData.braidFamily || undefined,
        braid_patterns: formData.braidPatterns.length > 0 ? formData.braidPatterns : undefined,
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
        era: "",
        braidFamily: "",
        braidPatterns: [],
        imageFiles: [],
        imageUrl: "",
        contributorName: "",
        linkUrl: "",
        linkTitle: "",
        linkDescription: "",
        memoryTitle: "",
        agreeToShare: false,
        licenseCheck: false,
        // Reset credit fields
        stylist: "",
        photographer: "",
        community: "",
        source: "",
      })

      // Add this line in the form reset section after setFormData
      setShowBraidPatterns(false)

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

  // Handle braid pattern checkbox changes
  const handleBraidPatternChange = (pattern: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      braidPatterns: checked ? [...prev.braidPatterns, pattern] : prev.braidPatterns.filter((p) => p !== pattern),
    }))
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
    { value: "photo", label: "Photo" },
    { value: "link", label: "Link" },
    { value: "memory", label: "Memory" },
  ]

  const filterOptions = [
    { value: "all", label: "All Contributions" },
    { value: "photo", label: "Photo" },
    { value: "link", label: "Link" },
    { value: "memory", label: "Memory" },
  ]

  const braidFamilyOptions = [
    { value: "", label: "Select braid family" },
    { value: "cornrows", label: "Cornrows" },
    { value: "two-strand-twist", label: "Two Strand Twist" },
    { value: "tree", label: "Tree" },
    { value: "strand-twist", label: "Strand Twist" },
    { value: "feed-in", label: "Feed In" },
  ]

  const braidPatternOptions = [
    { value: "curve", label: "Curve" },
    { value: "s-curve", label: "S-Curve" },
    { value: "c-curve", label: "C-Curve" },
    { value: "j-curve", label: "J-Curve" },
    { value: "u-curve", label: "U-Curve" },
    { value: "zigzag", label: "Zigzag" },
    { value: "spiral", label: "Spiral" },
    { value: "criss-cross", label: "Criss-Cross" },
    { value: "chevron", label: "Chevron" },
    { value: "heart-shaped", label: "Heart-shaped" },
    { value: "wavy", label: "Wavy" },
    { value: "diamond-grid", label: "Diamond Grid" },
  ]

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sticky Menu Bar */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <div className="px-8 py-6">
          <div className="flex items-center justify-start gap-4">
            <div className="flex gap-4 p-4 items-center">
              <div className="relative">
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="hover:opacity-70 transition-opacity"
                  onMouseEnter={() => setHoveredIcon("info")}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <img src="/globe.svg" alt="Info" className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
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
                  <img src="/cool.svg" alt="Cool" className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
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

        {/* Active Filter Button */}
        {!loading && filterType !== "all" && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowFilter(true)}
                className="bg-black text-white px-4 py-2 stick-no-bills text-sm uppercase hover:bg-gray-800 transition-colors"
              >
                {filterType} ({braids.filter((b) => b.submission_type === filterType).length})
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
                        <div className="w-full h-full bg-[rgb(254,228,107)] flex items-center justify-center p-4">
                          {braid.submission_type === "memory" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (braid.audio_url) {
                                  toggleAudio(braid.id, braid.audio_url)
                                }
                              }}
                              className="text-black hover:text-gray-600 transition-colors"
                              title={playingAudio[braid.id.toString()] ? "Pause memory" : "Play memory"}
                            >
                              {playingAudio[braid.id.toString()] ? (
                                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                              ) : (
                                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <h3 className="text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-bold stick-no-bills text-black uppercase text-center leading-tight">
                              {braid.submission_type === "link"
                                ? (braid as any).link_title || braid.braid_name || "Untitled Link"
                                : braid.braid_name}
                            </h3>
                          )}
                        </div>
                      )}

                      {/* Submission type indicator */}
                      <div className="absolute top-0 right-0 bg-black text-white px-2 py-1 text-xs stick-no-bills uppercase">
                        {braid.submission_type}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {/* Show braid name for photo submissions, or subtitle for others */}
                      {braid.submission_type === "photo" ? (
                        <h3 className="text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-bold stick-no-bills text-black uppercase mb-2">
                          {braid.braid_name}
                        </h3>
                      ) : (
                        <h3 className="text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-bold stick-no-bills text-black uppercase mb-2">
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
                          <span className="text-black uppercase">{braid.contributor_name || "anonymous"}</span>
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
              <div className="space-y-0">
                {filterOptions.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilterType(option.value as "all" | "photo" | "link" | "memory")
                      // Don't close the filter dropdown when a filter is selected
                    }}
                    className={`w-full p-3 text-left stick-no-bills text-black text-3xl sm:text-2xl md:text-5xl transition-colors ${
                      filterType === option.value ? "bg-green-400 hover:bg-green-500" : "bg-gray-50 hover:bg-gray-100"
                    } ${index > 0 ? "border-t border-black" : ""} ${index === 0 ? "border-b border-black" : ""} ${index === filterOptions.length - 1 ? "" : "border-b border-black"}`}
                  >
                    {option.label}
                    {option.value !== "all" && (
                      <span className="text-sm text-gray-600 block">
                        {braids.filter((b) => b.submission_type === option.value).length} ENTRIES
                      </span>
                    )}
                    {option.value === "all" && (
                      <span className="text-sm text-gray-600 block">DATASET COUNT = {braids.length} </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="h-12 px-4 border-black focus:outline-none stick-no-bills text-black text-3xl sm:text-2xl md:text-3xl uppercase flex items-center justify-between hover:bg-[rgb(244,218,97)] transition-colors min-w-[200px] py-8 bg-yellow-200 border-2 ">
          <div className="relative w-full max-w-[50rem] my-8">
            {/* Top bar with close button and dropdown */}
            <div className="flex items-center justify-between mb-0 px-0 py-4">
              {/* Custom Submission Type Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-12 px-4 border-black focus:outline-none stick-no-bills text-black text-3xl sm:text-2xl md:text-3xl uppercase flex items-center justify-between hover:bg-[rgb(244,218,97)] transition-colors min-w-[200px] py-8 border-0 bg-yellow-200"
                >
                  <span className="text-5xl">
                    {submissionOptions.find((opt) => opt.value === submissionType)?.label}
                  </span>
                  <svg
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    className={`ml-2 transition-transform ${showDropdown ? "rotate-180" : ""}`}
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
                  <div className="absolute top-full left-0 w-full bg-[rgb(254,228,107)] border-l-2 border-r-2 border-b-2 border-black z-20">
                    {submissionOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSubmissionType(option.value as "photo" | "link" | "memory")
                          setShowDropdown(false)
                        }}
                        className={`w-full h-12 px-4 text-left stick-no-bills text-black text-3xl sm:text-2xl uppercase hover:bg-[rgb(244,218,97)] transition-colors border-black last:border-b-0 border-b-2 md:text-5xl ${
                          submissionType === option.value ? "bg-[rgb(244,218,97)]" : ""
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="text-white bg-black hover:bg-gray-800 p-2 transition-colors duration-200 z-10"
              >
                <svg className="w-8 h-8 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-white w-full relative shadow-xl animate-in slide-in-from-bottom-4 duration-300 border-2 border-black">
              <div className="p-0">
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
                  // Single-column layout for photo submissions
                  <div className="bg-white p-4 px-0 py-0">
                    <div className=" min-w-[400px] mx-auto space-y-0 bg-black">
                      {/* Photo Upload Area - Above form fields */}
                      <div
                        className={`relative border-black transition-colors border-0 bg-amber-200 ${
                          isDragOver ? "bg-[rgb(244,218,97)]" : ""
                        } flex flex-col items-center justify-center cursor-pointer overflow-visible min-h-[400px] mb-4`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-input")?.click()}
                      >
                        {/* Show uploaded files or upload prompt */}
                        {formData.imageFiles.length > 0 ? (
                          <div className="w-full h-full overflow-y-auto p-4">
                            {formData.imageFiles.length === 1 ? (
                              // Single image - full display with 3:4 aspect ratio
                              <div className="relative w-full mb-4 max-w-md mx-auto" style={{ aspectRatio: "3/4" }}>
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
                                  className="absolute top-0 right-0 w-12 h-12 bg-[rgb(254,228,107)] text-black flex items-center justify-center hover:bg-[rgb(244,218,97)] text-sm font-bold"
                                  title="Remove image"
                                >
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              // Multiple images
                              <div className="space-y-4">
                                <div className="relative w-full max-w-md mx-auto" style={{ aspectRatio: "3/4" }}>
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
                                    className="absolute top-0 right-0 w-12 h-12 bg-[rgb(254,228,107)] text-black flex items-center justify-center hover:bg-[rgb(244,218,97)] text-sm font-bold"
                                    title="Remove image"
                                  >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>

                                  {/* Image counter and navigation arrows */}
                                  <div className="absolute top-0 left-0">
                                    <div className="bg-black text-white px-2 py-1 text-2xl stick-no-bills mb-1 inline-block">
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

                                  {/* Thumbnail strip */}
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                                    <div className="flex gap-1 overflow-x-auto">
                                      {imagePreviews.map((preview, index) => (
                                        <button
                                          key={index}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setCurrentImageIndex(index)
                                          }}
                                          className={`relative flex-shrink-0 w-12 h-12 transition-all ${
                                            index === currentImageIndex
                                              ? "opacity-100 ring-2 ring-white"
                                              : "opacity-70 hover:opacity-90"
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
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-black text-center font-medium stick-no-bills mb-2 text-5xl">
                              CLICK TO UPLOAD
                            </p>
                            <p className="text-black text-sm stick-no-bills">(JPG, PNG, GIF, WebP - Max 5 files)</p>
                          </div>
                        )}
                      </div>

                      {/* Main Form Fields - Separate bordered section */}
                      <div className="border-black mb-3 mt-0 bg-yellow-300 border-0">
                        <div className="px-4 py-2 border-b-2 border-black bg-amber-200">
                          <h3 className="stick-no-bills text-black font-semibold uppercase text-xl">
                            Braid Information
                          </h3>
                        </div>

                        <div className="p-0">
                          <input
                            type="text"
                            name="braidName"
                            value={formData.braidName ?? ""}
                            onChange={handleInputChange}
                            placeholder="Braid Name"
                            className="h-16 px-4 bg-yellow-200 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-5xl w-full"
                            required
                          />

                          <input
                            type="text"
                            name="altNames"
                            value={formData.altNames ?? ""}
                            onChange={handleInputChange}
                            placeholder="Aternate Names"
                            className="h-16 px-4 bg-yellow-200 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-5xl w-full"
                          />

                          <input
                            type="text"
                            name="era"
                            value={formData.era ?? ""}
                            onChange={handleInputChange}
                            placeholder="Era"
                            className="h-16 px-4 bg-yellow-200 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-5xl w-full"
                          />

                          <select
                            name="braidFamily"
                            value={formData.braidFamily ?? ""}
                            onChange={handleInputChange}
                            className="h-16 px-4 bg-yellow-200 border-b-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black text-5xl w-full"
                          >
                            {braidFamilyOptions.map((option) => (
                              <option key={option.value} value={option.value} className="stick-no-bills text-black">
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {/* Braid Patterns - Collapsible with Plus Icon */}
                          <div className="min-h-16 px-4 bg-yellow-200 border-b-2 border-black">
                            <div className="py-2">
                              <div className="flex items-center justify-between">
                                <label className="stick-no-bills text-black text-5xl">Braid Patterns</label>
                                <button
                                  type="button"
                                  onClick={() => setShowBraidPatterns(!showBraidPatterns)}
                                  className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                                  title={showBraidPatterns ? "Hide patterns" : "Show patterns"}
                                >
                                  <svg
                                    className={`w-4 h-4 transition-transform ${showBraidPatterns ? "rotate-45" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                </button>
                              </div>
                              {showBraidPatterns && (
                                <div className="grid grid-cols-2 gap-2  overflow-y-auto mt-2">
                                  {braidPatternOptions.map((option) => (
                                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={formData.braidPatterns.includes(option.value)}
                                        onChange={(e) => handleBraidPatternChange(option.value, e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                                      />
                                      <span className="stick-no-bills text-black text-5xl">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Credit Section - Separate bordered section */}
                      <div className="border-2 border-black bg-gray-50 mb-6 border-none" style={{ marginTop: "20px" }}>
                        <div className="px-4 py-2 border-b-2 border-black bg-yellow-200">
                          <h3 className="stick-no-bills text-black text-xl font-semibold uppercase">Credits</h3>
                        </div>

                        <div className="p-0">
                          <input
                            type="text"
                            name="stylist"
                            value={formData.stylist ?? ""}
                            onChange={handleInputChange}
                            placeholder="Stylist"
                            className="w-full h-16 px-4 bg-yellow-200 border-b-2 border-black border-solid focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-5xl"
                          />

                          <input
                            type="text"
                            name="photographer"
                            value={formData.photographer ?? ""}
                            onChange={handleInputChange}
                            placeholder="Photographer"
                            className="w-full h-16 px-4 bg-yellow-200 border-b-2 border-black border-solid focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-5xl"
                          />

                          <input
                            type="text"
                            name="community"
                            value={formData.community ?? ""}
                            onChange={handleInputChange}
                            placeholder="Community"
                            className="w-full h-16 px-4 bg-yellow-200 border-b-2 border-black border-solid focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-5xl"
                          />

                          <input
                            type="text"
                            name="source"
                            value={formData.source ?? ""}
                            onChange={handleInputChange}
                            placeholder="Source"
                            className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            name="contributorName"
                            value={formData.contributorName ?? ""}
                            onChange={handleInputChange}
                            placeholder="Contributor Name"
                            className="w-full h-16 px-4 bg-yellow-200 border-b-2 border-black border-solid focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent stick-no-bills text-black placeholder-black text-5xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Messages for Photo */}
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
                ) : (
                  // Single-column layout for link and memory submissions
                  <div className="w-full">
                    {submissionType === "link" ? (
                      // Link Form - Full Width
                      <div className="p-8 px-0 py-0 bg-black">
                        <div className="min-w-[400px] mx-auto space-y-6">
                          {/* Link Information - Bordered section */}
                          <div className="border-2 border-black bg-gray-50 mb-4">
                            <div className="px-4 py-2 border-b-2 border-black bg-yellow-200">
                              <h3 className="stick-no-bills text-black text-xl font-semibold uppercase">
                                Link Information
                              </h3>
                            </div>

                            <div className="p-0 bg-amber-200">
                              {/* Link Title */}
                              <input
                                type="text"
                                name="linkTitle"
                                value={formData.linkTitle ?? ""}
                                onChange={handleInputChange}
                                placeholder="Title"
                                className="w-full h-16 px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                                required
                              />

                              {/* Link URL */}
                              <input
                                type="url"
                                name="linkUrl"
                                value={formData.linkUrl ?? ""}
                                onChange={handleInputChange}
                                placeholder="URL"
                                className="w-full h-16 px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                                required={submissionType === "link"}
                              />

                              {/* Link Description */}
                              <textarea
                                name="linkDescription"
                                value={formData.linkDescription ?? ""}
                                onChange={handleInputChange}
                                placeholder="Description"
                                rows={4}
                                className="w-full px-4 bg-yellow-200 text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black resize-none"
                              />
                            </div>
                          </div>

                          {/* Basic Information - Separate bordered section */}
                          <div className="border-2 border-black mb-4 mt-6">
                            <div className="px-4 py-2 border-b-2 border-black bg-yellow-200">
                              <h3 className="stick-no-bills text-black text-xl font-semibold uppercase">
                                Basic Information
                              </h3>
                            </div>

                            <div className="p-0">
                              {/* Basic Info for Link */}
                              <input
                                type="text"
                                name="era"
                                value={formData.era ?? ""}
                                onChange={handleInputChange}
                                placeholder="Era"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-black placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-transparent"
                              />

                              <select
                                name="braidFamily"
                                value={formData.braidFamily ?? ""}
                                onChange={handleInputChange}
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-black stick-no-bills text-5xl focus:outline-none focus:border-transparent"
                              >
                                {braidFamilyOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                    className="stick-no-bills text-gray-700"
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              {/* Braid Patterns for Link - Collapsible */}
                              <div className="px-4 bg-yellow-200">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="stick-no-bills text-black text-5xl">Braid Patterns</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowBraidPatterns(!showBraidPatterns)}
                                    className="w-8 h-8 bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                                    title={showBraidPatterns ? "Hide patterns" : "Show patterns"}
                                  >
                                    <svg
                                      className={`w-4 h-4 transition-transform ${showBraidPatterns ? "rotate-45" : ""}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                      />
                                    </svg>
                                  </button>
                                </div>
                                {showBraidPatterns && (
                                  <div className="grid grid-cols-2 gap-2  overflow-y-auto">
                                    {braidPatternOptions.map((option) => (
                                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={formData.braidPatterns.includes(option.value)}
                                          onChange={(e) => handleBraidPatternChange(option.value, e.target.checked)}
                                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="stick-no-bills text-black text-5xl">{option.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Credit Section for Link - Separate bordered section */}
                          <div className="border-black bg-gray-50 mb-6 mt-6 border-0">
                            <div className="px-4 py-2 border-b-2 border-black bg-yellow-200">
                              <h3 className="stick-no-bills text-black text-xl font-semibold uppercase">Credits</h3>
                            </div>

                            <div className="p-0">
                              <input
                                type="text"
                                name="stylist"
                                value={formData.stylist ?? ""}
                                onChange={handleInputChange}
                                placeholder="Stylist"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />

                              <input
                                type="text"
                                name="photographer"
                                value={formData.photographer ?? ""}
                                onChange={handleInputChange}
                                placeholder="Photographer"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />

                              <input
                                type="text"
                                name="community"
                                value={formData.community ?? ""}
                                onChange={handleInputChange}
                                placeholder="Community"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />

                              <input
                                type="text"
                                name="source"
                                value={formData.source ?? ""}
                                onChange={handleInputChange}
                                placeholder="Source"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                name="contributorName"
                                value={formData.contributorName ?? ""}
                                onChange={handleInputChange}
                                placeholder="Contributor Name"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Memory Form - Full Width
                      <div className="p-8 px-0 py-0 bg-black">
                        <div className="min-w-[400px] mx-auto space-y-6">
                          {/* Memory Title */}
                          <input
                            type="text"
                            name="memoryTitle"
                            value={formData.memoryTitle ?? ""}
                            onChange={handleInputChange}
                            placeholder="Memory Title "
                            className="w-full px-4 bg-yellow-200 border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black "
                            required={submissionType === "memory"}
                          />

                          {/* Audio Recording for Memory */}
                          {audioSupported && (
                            <div className="p-4 border-2 border-black mb-6 border-none bg-yellow-200">
                              <div className="flex flex-col items-center justify-center min-h-[120px]">
                                {!isRecording && !audioBlob && (
                                  <button
                                    type="button"
                                    onClick={startRecording}
                                    className="px-6 py-3 text-black hover:bg-lime-500 font-medium stick-no-bills border-2 border-black uppercase bg-rose-200 text-5xl border-solid"
                                  >
                                    START RECORDING
                                  </button>
                                )}

                                {isRecording && (
                                  <div className="flex flex-col items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={stopRecording}
                                      className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 font-medium stick-no-bills border-2 border-black text-2xl"
                                    >
                                      Stop Recording
                                    </button>
                                    <span className="text-red-600 font-mono stick-no-bills text-2xl">
                                      🔴 {formatTime(recordingTime)}
                                    </span>
                                  </div>
                                )}

                                {audioBlob && (
                                  <div className="flex flex-col items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={clearRecording}
                                      className="px-4 py-2 bg-gray-400 text-white hover:bg-gray-500 stick-no-bills border-2 border-black text-2xl"
                                    >
                                      Clear
                                    </button>
                                    <span className="text-green-600 stick-no-bills text-2xl">
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

                          {/* Basic Information - Separate bordered section */}
                          <div className="border-2 border-black bg-gray-50 mb-6 border-none">
                            <div className="px-4 py-2 border-b-2 border-black bg-yellow-200">
                              <h3 className="stick-no-bills text-black text-xl font-semibold uppercase">
                                Basic Information
                              </h3>
                            </div>

                            <div className="p-0">
                              {/* Basic Info for Memory */}
                              <input
                                type="text"
                                name="era"
                                value={formData.era ?? ""}
                                onChange={handleInputChange}
                                placeholder="ERA"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-black placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-transparent"
                              />

                              <select
                                name="braidFamily"
                                value={formData.braidFamily ?? ""}
                                onChange={handleInputChange}
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-black stick-no-bills text-5xl focus:outline-none focus:border-transparent"
                              >
                                {braidFamilyOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                    className="stick-no-bills text-gray-700"
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              {/* Braid Patterns for Memory - Collapsible */}
                              <div className="px-4 bg-yellow-200">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="stick-no-bills text-black text-5xl">Braid Patterns</label>
                                  <button
                                    type="button"
                                    onClick={() => setShowBraidPatterns(!showBraidPatterns)}
                                    className="w-8 h-8 bg-black text-white flex justify-center hover:bg-gray-800 transition-colors items-center"
                                    title={showBraidPatterns ? "Hide patterns" : "Show patterns"}
                                  >
                                    <svg
                                      className={`w-4 h-4 transition-transform ${showBraidPatterns ? "rotate-45" : ""}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                      />
                                    </svg>
                                  </button>
                                </div>
                                {showBraidPatterns && (
                                  <div className="grid grid-cols-2 gap-2  overflow-y-auto">
                                    {braidPatternOptions.map((option) => (
                                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={formData.braidPatterns.includes(option.value)}
                                          onChange={(e) => handleBraidPatternChange(option.value, e.target.checked)}
                                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="stick-no-bills text-black text-5xl">{option.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Credit Section for Memory - Separate bordered section */}
                          <div className="border-2 border-black bg-gray-50 mb-6 border-none" style="margin-top: 20px">
                            <div className="px-4 py-2 border-b-2 border-black bg-yellow-200">
                              <h3 className="stick-no-bills text-black text-xl font-semibold uppercase">Credits</h3>
                            </div>

                            <div className="p-0 bg-white">
                              <input
                                type="text"
                                name="stylist"
                                value={formData.stylist ?? ""}
                                onChange={handleInputChange}
                                placeholder="Stylist"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />

                              <input
                                type="text"
                                name="photographer"
                                value={formData.photographer ?? ""}
                                onChange={handleInputChange}
                                placeholder="Photographer"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />

                              <input
                                type="text"
                                name="community"
                                value={formData.community ?? ""}
                                onChange={handleInputChange}
                                placeholder="Community"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />

                              <input
                                type="text"
                                name="source"
                                value={formData.source ?? ""}
                                onChange={handleInputChange}
                                placeholder="Source URL"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                name="contributorName"
                                value={formData.contributorName ?? ""}
                                onChange={handleInputChange}
                                placeholder="Contributor Name"
                                className="w-full px-4 bg-yellow-200 border-b-2 border-black border-solid text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
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
                <div className="flex items-start gap-3 p-4 py-4 px-4 bg-yellow-200">
                  <input
                    type="checkbox"
                    id="agreeToShare"
                    name="agreeToShare"
                    checked={formData.agreeToShare}
                    onChange={handleInputChange}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2"
                    required
                  />
                  <label htmlFor="agreeToShare" className="stick-no-bills leading-relaxed text-black">
                    I certify that I have the rights to submit this braid for inclusion in The Braid Intelligence
                    Dataset (B.I.D.).
                  </label>
                </div>

                {/* License Checkbox - Full Width */}
                <div className="flex items-start gap-3 p-4 px-4 py-4 bg-yellow-200">
                  <input
                    type="checkbox"
                    id="licenseCheck"
                    name="licenseCheck"
                    checked={formData.licenseCheck}
                    onChange={handleInputChange}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 focus:ring-2"
                    required
                  />
                  <label htmlFor="licenseCheck" className="stick-no-bills leading-relaxed text-black leading-6">
                    This braid is either my original work, in the public domain, or covered by a license such as
                    Creative Commons.
                  </label>
                </div>

                {/* Account Creation Toggle */}
                <div className="p-4 px-0 py-0 bg-black">
                  <label className="flex items-center gap-2 stick-no-bills text-yellow-200 mx-0 bg-black my-0 px-4 py-0 border-solid border-yellow-200">
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
                      className="w-full px-3 bg-yellow-200 border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={accountData.password}
                      onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                      className="w-full px-3 bg-yellow-200 border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={accountData.confirmPassword}
                      onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                      className="w-full px-3 bg-yellow-200 border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                      required
                    />
                    <input
                      type="text"
                      placeholder="First Name"
                      value={accountData.firstName}
                      onChange={(e) => setAccountData({ ...accountData, firstName: e.target.value })}
                      className="w-full px-3 bg-yellow-200 border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={accountData.lastName}
                      onChange={(e) => setAccountData({ ...accountData, lastName: e.target.value })}
                      className="w-full px-3 bg-yellow-200 border-b-2 border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                      required
                    />
                  </div>
                )}

                {/* Submit Button - Full Width */}
                <div className="p-4 px-0 py-0">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 bg-[rgb(254,228,107)] text-black hover:bg-[rgb(244,218,97)] transition-colors stick-no-bills border-2 border-black font-bold disabled:opacity-50 disabled:cursor-not-allowed uppercase text-5xl"
                  >
                    {submitting ? "Submitting..." : "SUBMIT BRAID"}
                  </button>
                </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black ">
          <div className="relative bg-white max-w-3xl mx-auto p-8 ">
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
            <h2 className="text-3xl font-semibold mb-6 stick-no-bills text-black">
              THE BRAID INTELLIGENCE DATASET (B.I.D.){" "}
            </h2>
            <p className="mb-4 stick-no-bills text-black text-3xl">
              The Braid Intelligence Dataset (B.I.D.) is designed to improve braid-to-name grounding for Da Braidr, a
              text-to-braid generation engine built on Imagen-3.
              <br />
              <br />
              Drawing from research on multimodal grounding (Radford et al., 2021; Jia et al., 2021), B.I.D. provides a
              semantic alignment layer that maps braid names to their corresponding visual structures.
              <br />
              <br />
              Despite advances in image-text models, existing foundation models struggle with underrepresented concept
              classes—particularly those tied to Black cultural production. In our tests, Imagen-3 consistently returns
              generic outputs for terms like butterfly braids, lemonade braids, and braided baldie, indicating semantic
              misalignment.
              <br />
              <br />
              This failure reflects what researchers describe as model fossilization—when a model’s knowledge is fixed
              at the time of training and lacks exposure to emerging or vernacular concepts. B.I.D. intervenes in this
              gap by supporting fine-tuning for Da Braidr and improving the system’s ability to generate name-aligned,
              style-specific outputs.
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-[35rem]">
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
                    ) : showDetailModal.submission_type === "memory" ? (
                      // Memory submissions show play button on yellow background
                      <div className="w-full h-full bg-[rgb(254,228,107)] flex items-center justify-center p-4">
                        <button
                          onClick={() => {
                            if (showDetailModal.audio_url) {
                              toggleAudio(showDetailModal.id, showDetailModal.audio_url)
                            }
                          }}
                          className="text-black hover:text-gray-600 transition-colors"
                          title={playingAudio[showDetailModal.id.toString()] ? "Pause memory" : "Play memory"}
                        >
                          {playingAudio[showDetailModal.id.toString()] ? (
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                            </svg>
                          ) : (
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      // Link submissions show title on yellow background
                      <div className="w-full h-full bg-[rgb(254,228,107)] flex items-center justify-center p-4">
                        <h3 className="text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-bold stick-no-bills text-black uppercase text-center leading-tight">
                          {(showDetailModal as any).link_title || showDetailModal.braid_name || "Untitled Link"}
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* Content below image */}
                  <div className="p-8 bg-white">
                    {/* Title under image */}
                    <h2 className="text-5xl font-bold mb-6 stick-no-bills text-black uppercase">
                      {showDetailModal.submission_type === "memory"
                        ? (showDetailModal as any).memory_title || showDetailModal.braid_name || "Untitled Memory"
                        : showDetailModal.braid_name}
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

                      {/* Era - inline */}
                      {showDetailModal.era && (
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                            ERA
                          </span>
                          <span className="stick-no-bills text-black uppercase text-xl">( {showDetailModal.era} )</span>
                        </div>
                      )}

                      {/* Braid Family - inline */}
                      {showDetailModal.braid_family && (
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                            BRAID FAMILY
                          </span>
                          <span className="stick-no-bills text-black uppercase text-xl">
                            ( {showDetailModal.braid_family.replace("-", " ")} )
                          </span>
                        </div>
                      )}

                      {/* Braid Patterns - inline */}
                      {showDetailModal.braid_patterns && showDetailModal.braid_patterns.length > 0 && (
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                            BRAID PATTERNS
                          </span>
                          <span className="stick-no-bills text-black uppercase text-xl">
                            ( {showDetailModal.braid_patterns.map((pattern) => pattern.replace("-", " ")).join(", ")} )
                          </span>
                        </div>
                      )}

                      {/* Contributor - inline */}
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                          CONTRIBUTOR
                        </span>
                        <span className="stick-no-bills text-black uppercase text-xl">
                          ( {showDetailModal.contributor_name || "anonymous"} )
                        </span>
                      </div>

                      {/* Audio - simplified */}
                      {showDetailModal.audio_url && (
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-semibold stick-no-bills text-black uppercase min-w-fit">
                            {showDetailModal.submission_type === "memory" ? "LISTENING TO MEMORY" : "PRONUNCIATION"}
                          </span>
                          <div className="flex items-center gap-2">
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
                            {audioDurations[showDetailModal.id.toString()] && (
                              <span className="stick-no-bills text-black uppercase text-xl">
                                ( {audioDurations[showDetailModal.id.toString()]} )
                              </span>
                            )}
                          </div>
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
                                  className="text-blue-600 hover:underline"
                                >
                                  external link
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
