import { NextResponse } from 'next/server'

// Types
interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  avatarUrl: string | null
  totalPnl: number
  totalTrades: number
  winRate: number
  currentStreak: number
  badges: string[]
  isVerified: boolean
}

// Mock leaderboard data (realistic demo data)
const leaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: 'whale_master',
    displayName: '🐋 WhaleHunter',
    avatarUrl: null,
    totalPnl: 45230.50,
    totalTrades: 342,
    winRate: 72.5,
    currentStreak: 12,
    badges: ['whale', 'streak_master', 'early_adopter'],
    isVerified: true,
  },
  {
    rank: 2,
    userId: 'degen_trader',
    displayName: '🎰 DegenKing',
    avatarUrl: null,
    totalPnl: 32150.00,
    totalTrades: 1205,
    winRate: 58.3,
    currentStreak: 5,
    badges: ['high_volume', 'risk_taker'],
    isVerified: true,
  },
  {
    rank: 3,
    userId: 'steady_gains',
    displayName: '📈 SteadyEddie',
    avatarUrl: null,
    totalPnl: 28900.75,
    totalTrades: 156,
    winRate: 81.2,
    currentStreak: 8,
    badges: ['high_winrate', 'consistent'],
    isVerified: false,
  },
  {
    rank: 4,
    userId: 'algo_bot',
    displayName: '🤖 AlgoMaster',
    avatarUrl: null,
    totalPnl: 21500.25,
    totalTrades: 2450,
    winRate: 63.7,
    currentStreak: 3,
    badges: ['bot_master', 'high_volume'],
    isVerified: true,
  },
  {
    rank: 5,
    userId: 'futures_pro',
    displayName: '⚡ FuturesPro',
    avatarUrl: null,
    totalPnl: 18750.00,
    totalTrades: 89,
    winRate: 76.4,
    currentStreak: 6,
    badges: ['leverage_king'],
    isVerified: false,
  },
  {
    rank: 6,
    userId: 'polymarket_chad',
    displayName: '🎯 PredictionGod',
    avatarUrl: null,
    totalPnl: 15320.50,
    totalTrades: 234,
    winRate: 69.2,
    currentStreak: 4,
    badges: ['polymarket_pro'],
    isVerified: true,
  },
  {
    rank: 7,
    userId: 'sol_sniper',
    displayName: '☀️ SOLSniper',
    avatarUrl: null,
    totalPnl: 12800.00,
    totalTrades: 567,
    winRate: 55.8,
    currentStreak: 2,
    badges: ['memecoin_hunter'],
    isVerified: false,
  },
  {
    rank: 8,
    userId: 'grid_master',
    displayName: '📊 GridMaster',
    avatarUrl: null,
    totalPnl: 9450.75,
    totalTrades: 1890,
    winRate: 62.1,
    currentStreak: 7,
    badges: ['grid_expert', 'patient'],
    isVerified: true,
  },
  {
    rank: 9,
    userId: 'dca_diamond',
    displayName: '💎 DiamondHands',
    avatarUrl: null,
    totalPnl: 7200.25,
    totalTrades: 52,
    winRate: 84.6,
    currentStreak: 15,
    badges: ['dca_master', 'streak_master'],
    isVerified: false,
  },
  {
    rank: 10,
    userId: 'newbie_luck',
    displayName: '🍀 LuckyNewbie',
    avatarUrl: null,
    totalPnl: 5100.00,
    totalTrades: 23,
    winRate: 78.3,
    currentStreak: 4,
    badges: ['newcomer'],
    isVerified: false,
  },
]

// Badge metadata
const badgeInfo: Record<string, { emoji: string; label: string; color: string }> = {
  whale: { emoji: '🐋', label: 'Whale', color: 'blue' },
  streak_master: { emoji: '🔥', label: 'Streak Master', color: 'orange' },
  early_adopter: { emoji: '🌟', label: 'Early Adopter', color: 'yellow' },
  high_volume: { emoji: '📊', label: 'High Volume', color: 'purple' },
  risk_taker: { emoji: '🎲', label: 'Risk Taker', color: 'red' },
  high_winrate: { emoji: '🎯', label: 'High Win Rate', color: 'green' },
  consistent: { emoji: '📈', label: 'Consistent', color: 'teal' },
  bot_master: { emoji: '🤖', label: 'Bot Master', color: 'gray' },
  leverage_king: { emoji: '⚡', label: 'Leverage King', color: 'yellow' },
  polymarket_pro: { emoji: '🔮', label: 'Prediction Pro', color: 'indigo' },
  memecoin_hunter: { emoji: '🦊', label: 'Memecoin Hunter', color: 'orange' },
  grid_expert: { emoji: '📊', label: 'Grid Expert', color: 'blue' },
  patient: { emoji: '🧘', label: 'Patient', color: 'green' },
  dca_master: { emoji: '💰', label: 'DCA Master', color: 'emerald' },
  newcomer: { emoji: '🆕', label: 'Newcomer', color: 'sky' },
}

// GET /api/leaderboard - Get leaderboard
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // all, weekly, monthly
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // In production, filter by period from database
    const entries = leaderboardData.slice(0, limit)
    
    // Calculate total stats
    const totalPnl = entries.reduce((sum, e) => sum + e.totalPnl, 0)
    const totalTrades = entries.reduce((sum, e) => sum + e.totalTrades, 0)
    const avgWinRate = entries.reduce((sum, e) => sum + e.winRate, 0) / entries.length
    
    return NextResponse.json({
      success: true,
      period,
      leaderboard: entries,
      badges: badgeInfo,
      stats: {
        totalPnl,
        totalTrades,
        avgWinRate: avgWinRate.toFixed(1),
        totalTraders: leaderboardData.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
