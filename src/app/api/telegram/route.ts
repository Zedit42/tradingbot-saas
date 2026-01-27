import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Generate verification code
function generateVerificationCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

// Mock storage for verification codes (replace with Redis)
const verificationCodes: Map<string, { code: string; expires: number; userId: string }> = new Map()

// Mock connected users (replace with database)
const connectedUsers: Map<string, { telegramId: string; username: string }> = new Map()

// GET /api/telegram/status - Check connection status
export async function GET(request: Request) {
  try {
    // TODO: Get userId from session
    const userId = 'demo'
    
    const connection = connectedUsers.get(userId)
    
    if (connection) {
      return NextResponse.json({
        success: true,
        connected: true,
        telegramUsername: connection.username,
      })
    }
    
    return NextResponse.json({
      success: true,
      connected: false,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 }
    )
  }
}

// POST /api/telegram/connect - Start connection flow
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body
    
    // TODO: Get userId from session
    const userId = 'demo'
    
    if (action === 'generate_code') {
      // Generate a new verification code
      const code = generateVerificationCode()
      const expires = Date.now() + 10 * 60 * 1000 // 10 minutes
      
      verificationCodes.set(code, { code, expires, userId })
      
      // Bot username - replace with your actual bot
      const botUsername = 'XeonenAlertBot'
      const deepLink = `https://t.me/${botUsername}?start=${code}`
      
      return NextResponse.json({
        success: true,
        code,
        expiresIn: 600, // seconds
        deepLink,
        instructions: [
          `1. Open Telegram and search for @${botUsername}`,
          `2. Click "Start" or send /start`,
          `3. Send this verification code: ${code}`,
          `4. You'll receive a confirmation message`,
        ],
      })
    }
    
    if (action === 'verify') {
      const { telegramId, username } = body
      
      if (!telegramId) {
        return NextResponse.json(
          { success: false, error: 'Missing telegram ID' },
          { status: 400 }
        )
      }
      
      // Save connection
      connectedUsers.set(userId, { telegramId, username: username || 'Unknown' })
      
      return NextResponse.json({
        success: true,
        message: 'Telegram connected successfully!',
        telegramUsername: username,
      })
    }
    
    if (action === 'disconnect') {
      connectedUsers.delete(userId)
      
      return NextResponse.json({
        success: true,
        message: 'Telegram disconnected',
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Webhook handler for Telegram bot (POST /api/telegram/webhook)
// This would be called by your Telegram bot when users verify
