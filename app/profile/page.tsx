"use client"

import { useState, useEffect } from "react"
import { db, type Braid } from "@/lib/db"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userBraids, setUserBraids] = useState<Braid[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in and fetch their submissions
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          // not logged in or server error
          setLoading(false)
          return
        }
        let data: any = null
        try {
          data = await res.json()
        } catch {
          setLoading(false)
          return
        }
        if (!data?.user) {
          setLoading(false)
          return
        }
        setUser(data.user)

        // Fetch user's braids
        const braids = await db.getUserBraids(data.user.id)
        setUserBraids(braids)
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="stick-no-bills text-black">Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl stick-no-bills text-black mb-4">Please log in to view your profile</h1>
          <a
            href="/braid-glossary"
            className="bg-green-400 text-black py-2 px-6 hover:bg-green-500 transition-colors stick-no-bills border-2 border-black rounded-full"
          >
            Back to Glossary
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl stick-no-bills text-black font-bold mb-2">
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-lg stick-no-bills text-gray-600">{user.email}</p>
          <p className="text-sm stick-no-bills text-gray-500">
            Member since {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl stick-no-bills text-black font-bold mb-4">Your Submissions ({userBraids.length})</h2>

          {userBraids.length === 0 ? (
            <div className="text-center py-12 bg-white border-2 border-black rounded-lg">
              <p className="stick-no-bills text-black mb-4">You haven't submitted any braids yet</p>
              <a
                href="/braid-glossary"
                className="bg-green-400 text-black py-2 px-6 hover:bg-green-500 transition-colors stick-no-bills border-2 border-black rounded-full"
              >
                Submit Your First Braid
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {userBraids.map((braid) => (
                <div key={braid.id} className="bg-white border-2 border-black rounded-lg overflow-hidden">
                  {braid.image_url && (
                    <img
                      src={braid.image_url || "/placeholder.svg"}
                      alt={braid.braid_name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="stick-no-bills text-black font-bold text-lg mb-2">{braid.braid_name}</h3>
                    <p className="stick-no-bills text-gray-600 text-sm mb-2">{braid.region}</p>
                    <p className="stick-no-bills text-gray-500 text-xs">
                      {new Date(braid.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <a
            href="/braid-glossary"
            className="bg-blue-600 text-white py-2 px-6 hover:bg-blue-700 transition-colors stick-no-bills border-2 border-black rounded-full mr-4"
          >
            Back to Glossary
          </a>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              window.location.href = "/braid-glossary"
            }}
            className="bg-gray-400 text-black py-2 px-6 hover:bg-gray-500 transition-colors stick-no-bills border-2 border-black rounded-full"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
