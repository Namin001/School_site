import { NextResponse } from 'next/server'
import { prisma, logError } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { encrypt } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'Account is inactive. Please contact administration.' }, { status: 403 })
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    
    // Create JWT
    const sessionToken = await encrypt({ id: user.id, username: user.username, role: user.role })
    
    // Set cookie
    const response = NextResponse.json({ success: true, role: user.role })
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })
    
    return response
    
  } catch (error) {
    console.error(error)
    logError(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
