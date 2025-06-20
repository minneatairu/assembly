"use client"

// You'll need to install Framer Motion:
// npm i framer-motion
// or
// yarn add framer-motion

import type React from "react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface Node {
  id: string
  label: string
  x: number
  y: number
  size: number
  primary?: boolean
  parent?: string
  subtitle?: string
  author?: string
  link?: string
  year?: string
}

interface Connection {
  from: string
  to: string
}

export default function Component() {
  // ─────────────────────────────────── Local state
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [showWhatsThisModal, setShowWhatsThisModal] = useState(false)

  // ─────────────────────────────────── Nodes
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: "data-assembly",
      label: "DATA ASSEMBLY",
      x: 50,
      y: 50,
      size: 60,
      primary: true,
      subtitle: "Central data processing hub",
      author: "by Minne Atairu",
    },
    {
      id: "benin",
      label: "MISSING BENIN BRONZES",
      year: "1897–1914",
      x: 20,
      y: 50,
      size: 100,
      subtitle: "Share sightings and citations",
    },
    {
      id: "braids",
      label: "BRAIDS",
      x: 80,
      y: 50,
      size: 100,
      subtitle: "Traditional hair braiding patterns",
    },
    {
      id: "glossary",
      label: "BRAID GLOSSARY",
      x: 90,
      y: 35,
      size: 100,
      parent: "braids",
      subtitle: "Add a new braid",
      link: "/braid-glossary",
    },
    {
      id: "ethnomathematics",
      label: "ETHNOMATHEMATICS",
      x: 90,
      y: 65,
      size: 100,
      parent: "braids",
      subtitle: "Mathematical concepts in cultural practices",
    },
    {
      id: "whats-this",
      label: "WHAT'S THIS?",
      x: 50,
      y: 30,
      size: 100,
      parent: "data-assembly",
      subtitle: "Explanation of the diagram",
    },
  ])

  const connections: Connection[] = [
    { from: "data-assembly", to: "benin" },
    { from: "data-assembly", to: "braids" },
    { from: "data-assembly", to: "whats-this" },
    { from: "braids", to: "glossary" },
    { from: "braids", to: "ethnomathematics" },
  ]

  // ─────────────────────────────────── Handlers
  const handleNodeClick = (node: Node) => {
    if (node.id === "whats-this") {
      setShowWhatsThisModal(true)
    } else if (node.link) {
      window.location.href = node.link
    }
  }

  // Close modal
  const closeWhatsThisModal = () => {
    setShowWhatsThisModal(false)
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showWhatsThisModal) {
        closeWhatsThisModal()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showWhatsThisModal])

  /** Begin drag */
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, nodeId: string) => {
    e.preventDefault()
    const svg = (e.currentTarget as HTMLElement).closest("svg")
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const point = "touches" in e ? e.touches[0] : (e as React.MouseEvent)
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    const svgX = ((point.clientX - rect.left) / rect.width) * 100
    const svgY = ((point.clientY - rect.top) / rect.height) * 100
    setDraggedNode(nodeId)
    setDragOffset({ x: svgX - node.x, y: svgY - node.y })
  }

  /** Drag move (with fluid spring) */
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggedNode) return
    e.preventDefault()
    const svg = e.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const point = "touches" in e ? e.touches[0] : (e as React.MouseEvent)
    const svgX = ((point.clientX - rect.left) / rect.width) * 100
    const svgY = ((point.clientY - rect.top) / rect.height) * 100
    const newX = Math.max(5, Math.min(95, svgX - dragOffset.x))
    const newY = Math.max(5, Math.min(95, svgY - dragOffset.y))
    setNodes((prev) => prev.map((n) => (n.id === draggedNode ? { ...n, x: newX, y: newY } : n)))
  }

  const endDrag = () => {
    setDraggedNode(null)
    setDragOffset({ x: 0, y: 0 })
  }

  // ─────────────────────────────────── SVG
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* What's This Modal */}
      {showWhatsThisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 w-full max-w-2xl relative shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeWhatsThisModal}
              className="absolute top-4 right-4 text-sm text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-2xl mb-6 stick-no-bills font-light">WHAT'S THIS?</h2>

            <div className="space-y-6 stick-no-bills text-gray-700">
              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Data Assembly Network</h3>
                <p className="text-base leading-relaxed">
                  This interactive diagram represents the Data Assembly project - a network of interconnected cultural
                  documentation initiatives. Each node represents a different aspect of preserving and sharing cultural
                  heritage through digital means.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">How to Navigate</h3>
                <ul className="list-disc list-inside space-y-1 text-base ml-4">
                  <li>
                    <strong>Drag nodes</strong> to rearrange the network layout
                  </li>
                  <li>
                    <strong>Hover over nodes</strong> to see descriptions
                  </li>
                  <li>
                    <strong>Click triangular nodes</strong> to explore sub-projects
                  </li>
                  <li>
                    <strong>Square nodes</strong> represent main project categories
                  </li>
                  <li>
                    <strong>The central circle</strong> is the core Data Assembly hub
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Project Goals</h3>
                <p className="text-base leading-relaxed">
                  Data Assembly aims to create collaborative platforms for documenting cultural artifacts, traditions,
                  and knowledge systems. By connecting researchers, communities, and institutions, we build
                  comprehensive digital archives that preserve heritage for future generations.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Current Projects</h3>
                <ul className="list-disc list-inside space-y-1 text-base ml-4">
                  <li>
                    <strong>Missing Benin Bronzes:</strong> Tracking and documenting displaced cultural artifacts
                  </li>
                  <li>
                    <strong>Braid Glossary:</strong> Preserving traditional braiding patterns and techniques
                  </li>
                  <li>
                    <strong>Ethnomathematics:</strong> Exploring mathematical concepts in cultural practices
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-black">Get Involved</h3>
                <p className="text-base leading-relaxed">
                  Each project welcomes community contributions. Click on the nodes to explore specific initiatives and
                  learn how you can participate in preserving and sharing cultural knowledge.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-[800px] aspect-[4/3] p-8">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full select-none"
          onMouseMove={handleMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchMove={handleMove}
          onTouchEnd={endDrag}
        >
          {/* ───── Lines */}
          {connections.map((conn) => {
            const from = nodes.find((n) => n.id === conn.from)
            const to = nodes.find((n) => n.id === conn.to)
            if (!from || !to) return null
            const isChild = to.parent === from.id
            return (
              <motion.line
                key={`${conn.from}-${conn.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="black"
                strokeWidth="0.2"
                strokeDasharray={isChild ? "1 0.5" : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            )
          })}

          {/* ───── Nodes */}
          {nodes.map((node) => (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { type: "spring", stiffness: 120, damping: 12 },
              }}
            >
              {/* Shape */}
              {node.primary ? (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size / 20}
                  fill="black"
                  stroke="black"
                  strokeWidth="0.2"
                  whileHover={{ scale: 1.05 }}
                  onPointerDown={(e) => handleDragStart(e, node.id)}
                />
              ) : node.parent ? (
                <motion.polygon
                  points={`${node.x},${node.y - ((node.size / 40) * Math.sqrt(3)) / 2} ${node.x - node.size / 40},${
                    node.y + ((node.size / 40) * Math.sqrt(3)) / 2
                  } ${node.x + node.size / 40},${node.y + ((node.size / 40) * Math.sqrt(3)) / 2}`}
                  fill="black"
                  stroke="black"
                  strokeWidth="0.2"
                  whileHover={{ scale: 1.05 }}
                  onPointerDown={(e) => handleDragStart(e, node.id)}
                  onClick={() => handleNodeClick(node)}
                />
              ) : (
                <motion.rect
                  x={node.x - node.size / 40}
                  y={node.y - node.size / 40}
                  width={node.size / 20}
                  height={node.size / 20}
                  fill="white"
                  stroke="black"
                  strokeWidth="0.2"
                  whileHover={{ scale: 1.05 }}
                  onPointerDown={(e) => handleDragStart(e, node.id)}
                />
              )}

              {/* Number */}
              {!node.primary && !node.parent && (
                <motion.text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-black font-bold stick-no-bills pointer-events-none"
                  style={{ fontSize: "3px" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {node.id === "benin" ? "1" : node.id === "braids" ? "2" : ""}
                </motion.text>
              )}

              {/* Label */}
              <motion.text
                x={node.x}
                y={node.y + node.size / 20 + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-900 stick-no-bills"
                style={{ fontSize: "5px", paintOrder: "stroke", stroke: "#f8fafc", strokeWidth: 2.5 }}
                onPointerEnter={() => setHoveredNode(node.id)}
                onPointerLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node)}
                animate={{ cx: node.x, cy: node.y }}
              >
                {node.id === "benin" && node.year ? (
                  <>
                    <tspan x={node.x} dy="-4">
                      {node.year}
                    </tspan>
                    <tspan x={node.x} dy="6">
                      {node.label}
                    </tspan>
                  </>
                ) : (
                  node.label
                )}
              </motion.text>

              {/* Subtitle */}
              {hoveredNode === node.id && node.subtitle && (
                <motion.text
                  x={node.x}
                  y={node.y + node.size / 20 + 10}
                  textAnchor="middle"
                  className="fill-gray-600 stick-no-bills"
                  style={{ fontSize: "5px" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.2 } }}
                >
                  {node.subtitle}
                </motion.text>
              )}

              {/* Author */}
              {node.primary && node.author && (
                <motion.text
                  x={node.x}
                  y={node.y + node.size / 20 + 7}
                  textAnchor="middle"
                  className="fill-gray-500 stick-no-bills"
                  style={{ fontSize: "5px" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.3 } }}
                >
                  {node.author}
                </motion.text>
              )}
            </motion.g>
          ))}
        </svg>
      </div>
    </div>
  )
}
