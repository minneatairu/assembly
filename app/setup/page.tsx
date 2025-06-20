"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabaseUtils } from "@/lib/supabase"
import { validateEnvironment, isSupabaseConfigured } from "@/lib/config"

export default function SetupPage() {
  const [connectionStatus, setConnectionStatus] = useState<"testing" | "success" | "error" | "not-configured">(
    "testing",
  )
  const [error, setError] = useState<string | null>(null)
  const [envValidation, setEnvValidation] = useState(validateEnvironment())

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    if (!isSupabaseConfigured()) {
      setConnectionStatus("not-configured")
      return
    }

    setConnectionStatus("testing")
    const result = await supabaseUtils.testConnection()

    if (result.success) {
      setConnectionStatus("success")
    } else {
      setConnectionStatus("error")
      setError(result.error?.message || "Unknown error")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6 text-blue-600 hover:text-blue-800 stick-no-bills text-lg">
            ← Back to Data Assembly
          </Link>
          <h1 className="text-4xl font-light mb-4 stick-no-bills text-black">DATABASE SETUP</h1>
          <p className="text-gray-600 stick-no-bills text-lg">Configure persistent storage for production use</p>
        </div>

        <div className="grid gap-8">
          {/* Environment Variables Check */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-light mb-4 stick-no-bills text-black">Environment Variables</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="stick-no-bills">NEXT_PUBLIC_SUPABASE_URL</span>
                <span
                  className={`px-2 py-1 rounded text-sm stick-no-bills ${
                    envValidation.missing.includes("NEXT_PUBLIC_SUPABASE_URL")
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {envValidation.missing.includes("NEXT_PUBLIC_SUPABASE_URL") ? "Missing" : "Set"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="stick-no-bills">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                <span
                  className={`px-2 py-1 rounded text-sm stick-no-bills ${
                    envValidation.missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {envValidation.missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "Missing" : "Set"}
                </span>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-light mb-4 stick-no-bills text-black">Database Connection</h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <span className="stick-no-bills">Connection Status</span>
              <div className="flex items-center gap-2">
                {connectionStatus === "testing" && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded stick-no-bills text-sm">
                    Testing...
                  </span>
                )}
                {connectionStatus === "success" && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded stick-no-bills text-sm">
                    Connected ✓
                  </span>
                )}
                {connectionStatus === "error" && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded stick-no-bills text-sm">Error ✗</span>
                )}
                {connectionStatus === "not-configured" && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded stick-no-bills text-sm">
                    Not Configured
                  </span>
                )}
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm stick-no-bills">
                {error}
              </div>
            )}
            <button
              onClick={testConnection}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 stick-no-bills"
            >
              Test Connection
            </button>
          </div>

          {/* Setup Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-light mb-4 stick-no-bills text-black">Setup Instructions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2 stick-no-bills">1. Create Supabase Project</h3>
                <p className="text-gray-600 stick-no-bills text-sm mb-2">
                  Go to{" "}
                  <a href="https://supabase.com" className="text-blue-600 underline">
                    supabase.com
                  </a>{" "}
                  and create a new project.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 stick-no-bills">2. Get Your Credentials</h3>
                <p className="text-gray-600 stick-no-bills text-sm mb-2">
                  From your Supabase dashboard, go to Settings → API and copy:
                </p>
                <ul className="list-disc list-inside text-gray-600 stick-no-bills text-sm ml-4">
                  <li>Project URL</li>
                  <li>Anon/Public Key</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 stick-no-bills">3. Set Environment Variables</h3>
                <p className="text-gray-600 stick-no-bills text-sm mb-2">
                  Add these to your <code className="bg-gray-100 px-1 rounded">.env.local</code> file:
                </p>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>
                    NEXT_PUBLIC_SUPABASE_URL=your_project_url
                    <br />
                    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
                  </code>
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 stick-no-bills">4. Run Database Scripts</h3>
                <p className="text-gray-600 stick-no-bills text-sm mb-2">
                  Execute these scripts in your Supabase SQL editor:
                </p>
                <ul className="list-disc list-inside text-gray-600 stick-no-bills text-sm ml-4">
                  <li>01-create-braids-table.sql</li>
                  <li>02-setup-storage.sql</li>
                  <li>03-insert-sample-data.sql (optional)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 stick-no-bills">5. Test Your Setup</h3>
                <p className="text-gray-600 stick-no-bills text-sm mb-2">
                  Use the "Test Connection" button above to verify everything works.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-light mb-4 stick-no-bills text-black">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/braid-glossary"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 stick-no-bills"
              >
                View Braid Glossary
              </Link>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 stick-no-bills"
              >
                Open Supabase
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 stick-no-bills"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
