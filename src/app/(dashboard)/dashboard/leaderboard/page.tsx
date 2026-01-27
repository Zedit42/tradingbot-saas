'use client'

import { useState, useEffect } from 'react'

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

interface BadgeInfo {
  emoji: string
  label: string
  color: string
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [badges, setBadges] = useState<Record<string, BadgeInfo>>({})
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all')
  
  useEffect(() => {
    fetchLeaderboard()
  }, [period])
  
  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/leaderboard?period=${period}&limit=10`)
      const data = await res.json()
      if (data.success) {
        setLeaderboard(data.leaderboard)
        setBadges(data.badges)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }
  
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/50'
      case 2: return 'from-gray-400/20 to-gray-500/10 border-gray-400/50'
      case 3: return 'from-orange-500/20 to-orange-600/10 border-orange-500/50'
      default: return 'from-gray-800 to-gray-800 border-gray-700'
    }
  }
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🏆 Leaderboard</h1>
        <p className="text-gray-400">Top traders on Xeonen</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
          <div className="text-2xl font-bold text-green-400">
            ${(stats.totalPnl || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total PnL</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">
            {(stats.totalTrades || 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Trades</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">
            {stats.avgWinRate || 0}%
          </div>
          <div className="text-sm text-gray-400">Avg Win Rate</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">
            {stats.totalTraders || 0}
          </div>
          <div className="text-sm text-gray-400">Active Traders</div>
        </div>
      </div>
      
      {/* Period Filter */}
      <div className="flex justify-center gap-2 mb-6">
        {[
          { value: 'all', label: 'All Time' },
          { value: 'monthly', label: 'This Month' },
          { value: 'weekly', label: 'This Week' },
        ].map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      
      {/* Leaderboard Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading leaderboard...</div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={`bg-gradient-to-r ${getRankColor(entry.rank)} rounded-xl p-4 border transition hover:scale-[1.01]`}
            >
              <div className="flex items-center justify-between">
                {/* Left: Rank + User */}
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${entry.rank <= 3 ? '' : 'text-gray-500'}`}>
                    {getRankEmoji(entry.rank)}
                  </div>
                  
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl">
                    {entry.displayName.split(' ')[0]}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-lg">{entry.displayName}</span>
                      {entry.isVerified && <span title="Verified">✓</span>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {entry.badges.slice(0, 3).map(badgeId => {
                        const badge = badges[badgeId]
                        return badge ? (
                          <span
                            key={badgeId}
                            title={badge.label}
                            className="text-sm"
                          >
                            {badge.emoji}
                          </span>
                        ) : null
                      })}
                      {entry.badges.length > 3 && (
                        <span className="text-xs text-gray-500">+{entry.badges.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Right: Stats */}
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className={`text-xl font-bold ${entry.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.totalPnl >= 0 ? '+' : ''}${entry.totalPnl.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Total PnL</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">
                      {entry.winRate}%
                    </div>
                    <div className="text-xs text-gray-500">Win Rate</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">
                      {entry.totalTrades.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Trades</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-orange-400">
                      🔥 {entry.currentStreak}
                    </div>
                    <div className="text-xs text-gray-500">Streak</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Your Position (placeholder) */}
      <div className="mt-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-4 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-gray-400">#--</div>
            <div>
              <div className="font-bold text-white">Your Position</div>
              <div className="text-sm text-gray-400">Start trading to get ranked!</div>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
            Start Trading →
          </button>
        </div>
      </div>
    </div>
  )
}
