'use client'

import { useState, useEffect } from 'react'

interface Alert {
  id: string
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

// Current prices (mock - replace with real API)
const currentPrices: Record<string, number> = {
  BTC: 88500,
  ETH: 2980,
  SOL: 126,
  ARB: 0.85,
  DOGE: 0.32,
}

const COINS = ['BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'WIF', 'BONK']

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  // Form state
  const [coin, setCoin] = useState('BTC')
  const [condition, setCondition] = useState<'above' | 'below'>('below')
  const [price, setPrice] = useState('')
  const [notifyTelegram, setNotifyTelegram] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(false)
  
  useEffect(() => {
    fetchAlerts()
  }, [])
  
  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json()
      if (data.success) {
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin,
          condition,
          price: parseFloat(price),
          notifyTelegram,
          notifyEmail,
        }),
      })
      
      const data = await res.json()
      if (data.success) {
        setAlerts([...alerts, data.alert])
        setShowForm(false)
        setPrice('')
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
    }
  }
  
  const deleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setAlerts(alerts.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">🔔 Price Alerts</h1>
          <p className="text-gray-400 mt-1">Get notified when prices hit your targets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          + New Alert
        </button>
      </div>
      
      {/* Create Alert Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Create Alert</h3>
          <form onSubmit={createAlert} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Coin</label>
                <select
                  value={coin}
                  onChange={(e) => setCoin(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  {COINS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="above">Price goes above</option>
                  <option value="below">Price goes below</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Target Price (Current: ${currentPrices[coin]?.toLocaleString() || 'N/A'})
              </label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={notifyTelegram}
                  onChange={(e) => setNotifyTelegram(e.target.checked)}
                  className="rounded"
                />
                📱 Telegram
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded"
                />
                📧 Email
              </label>
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                Create Alert
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <div className="text-4xl mb-4">🔕</div>
          <p className="text-gray-400">No alerts yet</p>
          <p className="text-gray-500 text-sm mt-1">Create your first price alert above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const currentPrice = currentPrices[alert.coin] || 0
            const distance = ((alert.price - currentPrice) / currentPrice * 100).toFixed(1)
            const isClose = Math.abs(parseFloat(distance)) < 5
            
            return (
              <div
                key={alert.id}
                className={`bg-gray-800 rounded-xl p-4 border ${
                  alert.triggered
                    ? 'border-green-500/50'
                    : isClose
                    ? 'border-yellow-500/50'
                    : 'border-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {alert.triggered ? '✅' : alert.condition === 'above' ? '📈' : '📉'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{alert.coin}</span>
                        <span className="text-gray-400">
                          {alert.condition === 'above' ? 'above' : 'below'}
                        </span>
                        <span className="font-mono text-white">
                          ${alert.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Current: ${currentPrice.toLocaleString()} ({distance}% away)
                        {isClose && !alert.triggered && (
                          <span className="ml-2 text-yellow-500">⚠️ Close!</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {alert.notifyTelegram && <span title="Telegram">📱</span>}
                      {alert.notifyEmail && <span title="Email">📧</span>}
                    </div>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition"
                      title="Delete alert"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
