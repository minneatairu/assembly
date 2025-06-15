"use client"

import React, { useState } from "react"
import Link from "next/link"

export default function BraidGlossaryPage() {
  const [showForm, setShowForm] = useState(true)

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* -------- Form Modal -------- */}
      {/* Sticky Submit Button */}
<div className="fixed top-6 right-6 z-40">
  <button
    onClick={() => setShowForm(true)}
    className="bg-black text-white text-sm px-4 py-2 rounded-full shadow hover:bg-gray-800 stick-no-bills"
  >
    Submit Braid
  </button>
</div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center ">
          <div className="bg-white  w-full max-w-lg relative">
            {/* Close button */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 text-sm text-gray-500 hover:text-black"
            >
              ✕ 
            </button>

            {/* Form content here */}

            <form onSubmit={(e) => {
              e.preventDefault()
              // Handle submit
              setShowForm(false) // optionally close on submit
            }} >
              <input
                type="text"
                name="braidName"
                placeholder="Braid name"
                className="w-full px-4 py-3 border  bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base"
                required
              />
                    <input
                type="text"
                name="braidName"
                placeholder="ALT name"
                className="w-full px-4 py-3 border  bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base"
                required
              />



                    <input
                type="text"
                name="braidName"
                placeholder="https"
                className="w-full px-4 py-3 border  bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base"
                required
              />

                     <input
                type="text"
                name="braidName"
                placeholder="upload here"
                className="w-full px-4 py-3 border  bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base"
                required
              />

                     <input
                type="text"
                name="braidName"
                placeholder="your name"
                className="w-full px-4 py-3 border  bg-transparent focus:ring-2 focus:ring-blue-500 stick-no-bills text-base"
                required
              />
              {/* Add more fields here */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3  hover:bg-blue-700 stick-no-bills text-lg font-light"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------- Gallery Behind -------- */}
      <div className="pt-24 px-6 max-w-4xl mx-auto">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Example image gallery */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg shadow-inner" />
          ))}
        </div>
      </div>
    </div>
  )
}
