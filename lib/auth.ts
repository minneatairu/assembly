import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { neon } from "@neondatabase/serverless"

const DB_URL = process.env.NEON_NEON_NEON_NEON_NEON_DATABASE_URL
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  created_at: string
}

export type CreateUserData = {
  email: string
  password: string
  firstName: string
  lastName: string
}

// Demo storage for users when database isn't configured
const demoUsers: (User & { password_hash: string })[] = []

export const auth = {
  // Create a new user account
  async createUser(userData: CreateUserData): Promise<User> {
    const { email, password, firstName, lastName } = userData

    // Hash password
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    if (!DB_URL) {
      // Demo mode
      const existingUser = demoUsers.find((u) => u.email === email)
      if (existingUser) {
        throw new Error("Email already exists")
      }

      const newUser = {
        id: Date.now(),
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        created_at: new Date().toISOString(),
      }

      demoUsers.push(newUser)

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = newUser
      return userWithoutPassword
    }

    try {
      const sql = neon(DB_URL)

      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `

      if (existingUser.length > 0) {
        throw new Error("Email already exists")
      }

      // Create new user
      const result = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name)
        VALUES (${email}, ${passwordHash}, ${firstName}, ${lastName})
        RETURNING id, email, first_name, last_name, created_at
      `

      return result[0] as User
    } catch (error) {
      console.warn("Database error, falling back to demo mode:", error)
      // Fallback to demo mode
      const existingUser = demoUsers.find((u) => u.email === email)
      if (existingUser) {
        throw new Error("Email already exists")
      }

      const newUser = {
        id: Date.now(),
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        created_at: new Date().toISOString(),
      }

      demoUsers.push(newUser)

      const { password_hash, ...userWithoutPassword } = newUser
      return userWithoutPassword
    }
  },

  // Authenticate user login
  async loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
    if (!DB_URL) {
      // Demo mode
      const user = demoUsers.find((u) => u.email === email)
      if (!user) {
        throw new Error("Invalid email or password")
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error("Invalid email or password")
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })
      const { password_hash, ...userWithoutPassword } = user

      return { user: userWithoutPassword, token }
    }

    try {
      const sql = neon(DB_URL)

      const result = await sql`
        SELECT id, email, password_hash, first_name, last_name, created_at
        FROM users 
        WHERE email = ${email}
      `

      if (result.length === 0) {
        throw new Error("Invalid email or password")
      }

      const user = result[0] as User & { password_hash: string }
      const isValidPassword = await bcrypt.compare(password, user.password_hash)

      if (!isValidPassword) {
        throw new Error("Invalid email or password")
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })
      const { password_hash, ...userWithoutPassword } = user

      return { user: userWithoutPassword, token }
    } catch (error) {
      console.warn("Database error:", error)
      throw new Error("Login failed")
    }
  },

  // Verify JWT token
  verifyToken(token: string): { userId: number; email: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
      return decoded
    } catch (error) {
      return null
    }
  },

  // Get user by ID
  async getUserById(userId: number): Promise<User | null> {
    if (!DB_URL) {
      // Demo mode
      const user = demoUsers.find((u) => u.id === userId)
      if (!user) return null

      const { password_hash, ...userWithoutPassword } = user
      return userWithoutPassword
    }

    try {
      const sql = neon(DB_URL)

      const result = await sql`
        SELECT id, email, first_name, last_name, created_at
        FROM users 
        WHERE id = ${userId}
      `

      return result.length > 0 ? (result[0] as User) : null
    } catch (error) {
      console.warn("Database error:", error)
      return null
    }
  },
}
