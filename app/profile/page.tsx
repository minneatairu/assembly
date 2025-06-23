"use client"

import { useState, useEffect } from "react"
import { db, type Braid } from "@/lib/db"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userBraids, setUserBraids] = useState<Braid[]>([])
  const [loading, setLoading] = useState(true)
  const [isSignIn, setIsSignIn] = useState(false)

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="stick-no-bills text-white">Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">


        <div className="w-full max-w-2xl mx-auto px-8 relative min-h-[600px]">
          {/* Create Account Form */}
          <div
            className={`absolute top-0 left-0 w-full transition-all duration-700 ease-in-out ${
              isSignIn
                ? "transform -translate-y-full opacity-0 pointer-events-none z-0"
                : "transform translate-y-0 opacity-100 pointer-events-auto z-10"
            }`}
          >
            <div className="bg-white border-dashed border-2 border-black">
              <div className="px-4 border-b border-b-2 border-dashed border-black bg-yellow-200 py-0">
                <h3 className="stick-no-bills text-black font-semibold uppercase">CREATE A NEW ACCOUNT</h3>
              </div>

              <form className="p-0">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-4 bg-yellow-200 border-b border-b-2 border-dashed border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                  required
                />

                <input
                  type="text"
                  placeholder="Username"
                  className="w-full px-4 py-4 bg-yellow-200 border-b border-b-2 border-dashed border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-4 bg-yellow-200 border-b border-b-2 border-dashed border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                  required
                />

                <input
                  type="password"
                  placeholder="Confirm Password"
                  className="w-full px-4 py-4 bg-yellow-200 border-b border-b-2 border-dashed border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                  required
                />

                <div className="p-4 bg-yellow-200">
                  <button
                    type="submit"
                    className="w-full py-4 text-black hover:bg-[rgb(244,218,97)] transition-colors stick-no-bills border-dashed border-2 border-black font-bold uppercase text-5xl bg-yellow-200"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>

            <div className="text-center mt-6">
              <p className="stick-no-bills mb-4 text-amber-200">ALREADY HAVE AN ACCOUNT?</p>
              <button
                onClick={() => setIsSignIn(true)}
                className="hover:bg-green-600 transition-colors stick-no-bills text-black bg-green-500 text-5xl py-3.5 px-12"
              >
                SIGN IN
              </button>
            </div>
          </div>

          {/* Sign In Form */}
          <div
            className={`absolute top-0 left-0 w-full transition-all duration-700 ease-in-out ${
              isSignIn
                ? "transform translate-y-0 opacity-100 pointer-events-auto z-10"
                : "transform translate-y-full opacity-0 pointer-events-none z-0"
            }`}
          >
            <div className="bg-white border-dashed border-2 border-black">
              <div className="px-4 border-b border-b-2 border-dashed border-black bg-green-400 py-0">
                <h3 className="stick-no-bills text-black font-semibold uppercase">SIGN INTO YOUR ACCOUNT</h3>
              </div>

              <form className="p-0">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-4 bg-green-400 border-b border-b-2 border-dashed border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-4 bg-green-400 border-b border-b-2 border-dashed border-black text-gray-700 placeholder-black stick-no-bills text-5xl focus:outline-none focus:border-black"
                  required
                />

                <div className="p-4 bg-green-400">
                  <button
                    type="submit"
                    className="w-full py-4 text-black hover:bg-green-500 transition-colors stick-no-bills border-dashed border-2 border-black font-bold uppercase text-5xl bg-green-400"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>

            <div className="text-center mt-6">
              <p className="stick-no-bills mb-4 text-amber-200">DON'T HAVE AN ACCOUNT?</p>
              <button
                onClick={() => setIsSignIn(false)}
                className="hover:bg-yellow-300 transition-colors stick-no-bills text-black text-5xl py-3.5 px-12 bg-green-500"
              >
                CREATE ACCOUNT
              </button>
            </div>
          </div>
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
            <div className="text-center py-12 bg-white border-dashed border-2 border-black rounded-lg">
              <p className="stick-no-bills text-black mb-4">You haven't submitted any braids yet</p>
              <a
                href="/braid-glossary"
                className="bg-green-400 text-black py-2 px-6 hover:bg-green-500 transition-colors stick-no-bills border-dashed border-2 border-black rounded-full"
              >
                Submit Your First Braid
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {userBraids.map((braid) => (
                <div key={braid.id} className="bg-white border-dashed border-2 border-black rounded-lg overflow-hidden">
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
            className="bg-blue-600 text-white py-2 px-6 hover:bg-blue-700 transition-colors stick-no-bills border-dashed border-2 border-black rounded-full mr-4"
          >
            Back to Glossary
          </a>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" })
              window.location.href = "/braid-glossary"
            }}
            className="bg-gray-400 text-black py-2 px-6 hover:bg-gray-500 transition-colors stick-no-bills border-dashed border-2 border-black rounded-full"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
