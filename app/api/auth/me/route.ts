import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"

/**
 * Returns the current authenticated user (via the `auth-token` cookie).
 * If no valid token → 401.
 */
export async function GET(_req: NextRequest) {
  const token = cookies().get("auth-token")?.value
  if (!token) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 })
  }

  const decoded = auth.verifyToken(token)
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const user = await auth.getUserById(decoded.userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // you can include extra info here if you like
  return NextResponse.json({ user })
}
