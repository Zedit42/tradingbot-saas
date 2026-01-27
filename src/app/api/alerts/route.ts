import { NextResponse } from 'next/server'

// Types
interface Alert {
  id: string
  userId: string
  coin: string
  condition: 'above' | 'below'
  price: number
  notifyTelegram: boolean
  notifyEmail: boolean
  triggered: boolean
  triggeredAt: string | null
  active: boolean
  createdAt: string
}

// Mock data (replace with Prisma)
let alerts: Alert[] = [
  {
    id: '1',
    userId: 'demo',
    coin: 'BTC',
    condition: 'below',
    price: 85000,
    notifyTelegram: true,
    notifyEmail: false,
    triggered: false,
    triggeredAt: null,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'demo',
    coin: 'ETH',
    condition: 'above',
    price: 3200,
    notifyTelegram: true,
    notifyEmail: true,
    triggered: false,
    triggeredAt: null,
    active: true,
    createdAt: new Date().toISOString(),
  },
]

// GET /api/alerts - List user's alerts
export async function GET() {
  try {
    // TODO: Get userId from session
    const userId = 'demo'
    
    const userAlerts = alerts.filter(a => a.userId === userId)
    
    return NextResponse.json({
      success: true,
      alerts: userAlerts,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

// POST /api/alerts - Create new alert
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { coin, condition, price, notifyTelegram, notifyEmail } = body
    
    // Validation
    if (!coin || !condition || !price) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    if (!['above', 'below'].includes(condition)) {
      return NextResponse.json(
        { success: false, error: 'Condition must be "above" or "below"' },
        { status: 400 }
      )
    }
    
    // TODO: Get userId from session
    const userId = 'demo'
    
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      coin: coin.toUpperCase(),
      condition,
      price: parseFloat(price),
      notifyTelegram: notifyTelegram ?? true,
      notifyEmail: notifyEmail ?? false,
      triggered: false,
      triggeredAt: null,
      active: true,
      createdAt: new Date().toISOString(),
    }
    
    alerts.push(newAlert)
    
    return NextResponse.json({
      success: true,
      alert: newAlert,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}

// DELETE /api/alerts?id=xxx - Delete alert
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Alert ID required' },
        { status: 400 }
      )
    }
    
    alerts = alerts.filter(a => a.id !== id)
    
    return NextResponse.json({
      success: true,
      message: 'Alert deleted',
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete alert' },
      { status: 500 }
    )
  }
}
