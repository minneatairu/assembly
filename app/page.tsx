"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"

interface Node {
  id: string
  label: string
  x: number
  y: number
  size: number
  primary?: boolean
  parent?: string
}

interface Connection {
  from: string
  to: string
}

export default function Component() {
  const [mounted, setMounted] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const [nodes, setNodes] = useState<Node[]>([
    { id: "data-assembly", label: "Data Assembly", x: 50, y: 50, size: 60, primary: true },
    { id: "benin", label: "Benin Bronzes", x: 25, y: 30, size: 100 },
    { id: "braids", label: "braids", x: 75, y: 30, size: 100 },
    { id: "glossary", label: "Braid Glossary", x: 90, y: 10, size: 100, parent: "braids" },
    { id: "ethnomathematics", label: "Ethnomathematics", x: 90, y: 50, size: 100, parent: "braids" },
  ])

  const connections: Connection[] = [
    { from: "data-assembly", to: "benin" },
    { from: "data-assembly", to: "braids" },
    { from: "braids", to: "glossary" },
    { from: "braids", to: "ethnomathematics" },
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault()
      const svg = e.currentTarget.closest("svg")
      if (!svg) return

      const rect = svg.getBoundingClientRect()
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return

      const svgX = ((e.clientX - rect.left) / rect.width) * 100
      const svgY = ((e.clientY - rect.top) / rect.height) * 100

      setDraggedNode(nodeId)
      setDragOffset({
        x: svgX - node.x,
        y: svgY - node.y,
      })
    },
    [nodes],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedNode) return

      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const svgX = ((e.clientX - rect.left) / rect.width) * 100
      const svgY = ((e.clientY - rect.top) / rect.height) * 100

      const newX = Math.max(5, Math.min(95, svgX - dragOffset.x))
      const newY = Math.max(5, Math.min(95, svgY - dragOffset.y))

      setNodes((prevNodes) => prevNodes.map((node) => (node.id === draggedNode ? { ...node, x: newX, y: newY } : node)))
    },
    [draggedNode, dragOffset],
  )

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, nodeId: string) => {
      e.preventDefault()
      const svg = e.currentTarget.closest("svg")
      if (!svg) return

      const rect = svg.getBoundingClientRect()
      const touch = e.touches[0]
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return

      const svgX = ((touch.clientX - rect.left) / rect.width) * 100
      const svgY = ((touch.clientY - rect.top) / rect.height) * 100

      setDraggedNode(nodeId)
      setDragOffset({
        x: svgX - node.x,
        y: svgY - node.y,
      })
    },
    [nodes],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!draggedNode) return
      e.preventDefault()

      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const touch = e.touches[0]
      const svgX = ((touch.clientX - rect.left) / rect.width) * 100
      const svgY = ((touch.clientY - rect.top) / rect.height) * 100

      const newX = Math.max(5, Math.min(95, svgX - dragOffset.x))
      const newY = Math.max(5, Math.min(95, svgY - dragOffset.y))

      setNodes((prevNodes) => prevNodes.map((node) => (node.id === draggedNode ? { ...node, x: newX, y: newY } : node)))
    },
    [draggedNode, dragOffset],
  )

  const handleTouchEnd = useCallback(() => {
    setDraggedNode(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="relative w-full max-w-[800px] aspect-[4/3] p-8">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Connection Lines */}
          {connections.map((conn, index) => {
            const fromNode = nodes.find((n) => n.id === conn.from)
            const toNode = nodes.find((n) => n.id === conn.to)
            if (!fromNode || !toNode) return null

            // Check if this is a subnode connection (parent-child relationship)
            const isSubnodeConnection = toNode.parent === fromNode.id

            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="black"
                strokeWidth="0.5"
                strokeDasharray={isSubnodeConnection ? "2 1" : "none"}
                className={mounted ? "animate-pulse" : ""}
                style={{
                  animationDelay: `${index * 0.2}s`,
                  animationDuration: "3s",
                }}
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((node, index) => (
            <g key={node.id}>
              {node.primary ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size / 20}
                  fill="#2563eb"
                  stroke="black"
                  strokeWidth="0.5"
                  className={`transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing ${
                    mounted ? "animate-fade-in" : ""
                  } ${draggedNode === node.id ? "scale-110" : ""}`}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onTouchStart={(e) => handleTouchStart(e, node.id)}
                />
              ) : node.parent ? (
                // Triangle for subnodes
                <polygon
                  points={`${node.x},${node.y - ((node.size / 40) * Math.sqrt(3)) / 2} ${node.x - node.size / 40},${node.y + ((node.size / 40) * Math.sqrt(3)) / 2} ${node.x + node.size / 40},${node.y + ((node.size / 40) * Math.sqrt(3)) / 2}`}
                  fill="#f8fafc"
                  stroke="black"
                  strokeWidth="0.5"
                  className={`transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing ${
                    mounted ? "animate-fade-in" : ""
                  } ${draggedNode === node.id ? "scale-110" : ""}`}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onTouchStart={(e) => handleTouchStart(e, node.id)}
                />
              ) : (
                // Rectangle for regular nodes
                <rect
                  x={node.x - node.size / 40}
                  y={node.y - node.size / 40}
                  width={node.size / 20}
                  height={node.size / 20}
                  fill="#f8fafc"
                  stroke="black"
                  strokeWidth="0.5"
                  className={`transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing ${
                    mounted ? "animate-fade-in" : ""
                  } ${draggedNode === node.id ? "scale-110" : ""}`}
                  style={{
                    animationDelay: `${index * 0.2}s`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onTouchStart={(e) => handleTouchStart(e, node.id)}
                />
              )}

              {/* Numbers inside shapes */}
              {!node.primary && !node.parent && node.id === "benin" && (
                <text
                  x={node.x}
                  y={node.y + 0.5}
                  textAnchor="middle"
                  className="font-bold pointer-events-none fill-black"
                  style={{ fontSize: "2px" }}
                >
                  1
                </text>
              )}
              {!node.primary && !node.parent && node.id === "braids" && (
                <text
                  x={node.x}
                  y={node.y + 0.5}
                  textAnchor="middle"
                  className="font-bold pointer-events-none fill-black"
                  style={{ fontSize: "2px" }}
                >
                  2
                </text>
              )}

              {/* Text background rectangles (masks for lines) */}
              <rect
                x={node.x - node.label.length * 0.7}
                y={node.y + node.size / 20 + 0.2}
                width={node.label.length * 1.4}
                height="1.6"
                fill="#e5e7eb"
                rx="0.2"
              />

              {/* Text labels below shapes */}
              <text
                x={node.x}
                y={node.y + node.size / 20 + 1}
                textAnchor="middle"
                className="font-medium pointer-events-none fill-black"
                style={{
                  fontSize: "2.5px",
                  textTransform: "uppercase",
                }}
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 text-sm text-slate-600 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
          Drag nodes to rearrange the network
        </div>
      </div>
    </div>
  )
}
