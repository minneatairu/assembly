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
  const [mounted, setMounted] = useState(false)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

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

  useEffect(() => setMounted(true), [])

  const handleNodeClick = (node: Node) => {
    if (node.link) window.location.href = node.link
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, nodeId: string) => {
    e.preventDefault()
    const svg = (e.currentTarget as HTMLElement).closest("svg")
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e as React.MouseEvent
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    const svgX = ((point.clientX - rect.left) / rect.width) * 100
    const svgY = ((point.clientY - rect.top) / rect.height) * 100
    setDraggedNode(nodeId)
    setDragOffset({ x: svgX - node.x, y: svgY - node.y })
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggedNode) return
    e.preventDefault()
    const svg = e.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e as React.MouseEvent
    const svgX = ((point.clientX - rect.left) / rect.width) * 100
    const svgY = ((point.clientY - rect.top) / rect.height) * 100
    const newX = Math.max(5, Math.min(95, svgX - dragOffset.x))
    const newY = Math.max(5, Math.min(95, svgY - dragOffset.y))
    setNodes((prev) => prev.map((n) => n.id === draggedNode ? { ...n, x: newX, y: newY } : n))
  }

  const endDrag = () => {
    setDraggedNode(null)
    setDragOffset({ x: 0, y: 0 })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
          {connections.map((conn, i) => {
            const from = nodes.find(n => n.id === conn.from)
            const to = nodes.find(n => n.id === conn.to)
            if (!from || !to) return null
            const isChild = to.parent === from.id
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="black"
                strokeWidth="0.2"
                strokeDasharray={isChild ? "1 0.5" : undefined}
              />
            )
          })}

          {nodes.map((node, i) => (
            <g key={node.id}>
              {node.primary ? (
                <>
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.size / 20}
                    fill="yellow"
                    stroke="black" strokeWidth="0.2"
                    className="cursor-grab hover:scale-110 active:cursor-grabbing"
                    onMouseDown={(e) => handleDragStart(e, node.id)}
                    onTouchStart={(e) => handleDragStart(e, node.id)}
                  />
                  <circle cx={node.x} cy={node.y} r="0.8" fill="#32cd32" className="animate-blink" />
                </>
              ) : node.parent ? (
                <polygon
                  points={`${node.x},${node.y - ((node.size / 40) * Math.sqrt(3)) / 2} ${node.x - node.size / 40},${node.y + ((node.size / 40) * Math.sqrt(3)) / 2} ${node.x + node.size / 40},${node.y + ((node.size / 40) * Math.sqrt(3)) / 2}`}
                  fill="black"
                  stroke="black"
                  strokeWidth="0.2"
                  className="cursor-pointer hover:scale-110"
                  onMouseDown={(e) => handleDragStart(e, node.id)}
                  onTouchStart={(e) => handleDragStart(e, node.id)}
                  onClick={() => handleNodeClick(node)}
                />
              ) : (
                <rect
                  x={node.x - node.size / 40} y={node.y - node.size / 40}
                  width={node.size / 20} height={node.size / 20}
                  fill="white"
                  stroke="black" strokeWidth="0.2"
                  className="cursor-grab hover:scale-110 active:cursor-grabbing"
                  onMouseDown={(e) => handleDragStart(e, node.id)}
                  onTouchStart={(e) => handleDragStart(e, node.id)}
                />
              )}

              {/* Label with optional line break for Benin */}
              <text
                x={node.x}
                y={node.y + node.size / 20 + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: "5px",
                  paintOrder: "stroke",
                  stroke: "#f8fafc",
                  strokeWidth: 2.5,
                  fill: node.link ? "#2563eb" : "#000",
                  cursor: node.link ? "pointer" : "default",
                  textTransform: "capitalize",
                }}
                onClick={() => handleNodeClick(node)}
              >
                {node.id === "benin" && node.year ? (
                  <>
                    <tspan x={node.x} dy="-4">{node.year}</tspan>
                    <tspan x={node.x} dy="6">{node.label}</tspan>
                  </>
                ) : (
                  node.label
                )}
              </text>

              {/* Subtitle on hover */}
              {hoveredNode === node.id && node.subtitle && (
                <text
                  x={node.x}
                  y={node.y + node.size / 20 + 10}
                  textAnchor="middle"
                  className="fill-gray-600 stick-no-bills"
                  style={{ fontSize: "5px" }}
                >
                  {node.subtitle}
                </text>
              )}

              {/* Author (for primary) */}
              {node.primary && node.author && (
                <text
                  x={node.x}
                  y={node.y + node.size / 20 + 7}
                  textAnchor="middle"
                  className="fill-gray-500 stick-no-bills"
                  style={{ fontSize: "5px" }}
                >
                  {node.author}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
