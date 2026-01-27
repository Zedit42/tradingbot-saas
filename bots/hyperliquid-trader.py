#!/usr/bin/env python3
"""
Xeonen Hyperliquid Futures Trading Bot
Full auto perpetual futures trading on Hyperliquid

Supports: BTC, ETH, SOL and other perps
Leverage: Up to 50x
"""

import json
import sys
import os
import time
from datetime import datetime
from pathlib import Path
from decimal import Decimal
from typing import Optional, Dict, Any, List

import eth_account
from eth_account.signers.local import LocalAccount
from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants
import httpx

# =============================================================================
# CONFIG
# =============================================================================

SECRETS_PATH = Path.home() / "clawd" / ".secrets"
WALLET_FILE = SECRETS_PATH / "hyperliquid-wallet.txt"
STATE_FILE = SECRETS_PATH / "hyperliquid-state.json"

# Trading pairs we support
SUPPORTED_PAIRS = ["BTC", "ETH", "SOL", "ARB", "DOGE", "WIF", "BONK", "PEPE"]

# Default trading settings - AGRESIF MOD 🔥
DEFAULT_LEVERAGE = 10  # 10x leverage
DEFAULT_POSITION_SIZE_PCT = 25  # 25% of account per trade
MAX_POSITIONS = 3
STOP_LOSS_PCT = 3  # 3% stop loss (tighter)
TAKE_PROFIT_PCT = 8  # 8% take profit

# =============================================================================
# STRATEGY CONFIG (Trend Following + Gevşek Funding)
# =============================================================================

# Funding thresholds (relaxed)
FUNDING_LONG_THRESHOLD = 0  # Funding < 0 → Long sinyali
FUNDING_SHORT_THRESHOLD = 0.03  # Funding > 0.03% → Short sinyali

# EMA settings for trend
EMA_FAST = 20  # Fast EMA period
EMA_SLOW = 50  # Slow EMA period
CANDLE_INTERVAL = "4h"  # 4 hour candles for trend

# =============================================================================
# WALLET MANAGEMENT
# =============================================================================

def load_wallet() -> Optional[LocalAccount]:
    """Load wallet from private key file"""
    if not WALLET_FILE.exists():
        print(f"❌ Wallet file not found: {WALLET_FILE}")
        print("Please save your private key to this file")
        return None
    
    private_key = WALLET_FILE.read_text().strip()
    
    # Handle different formats
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
    
    try:
        account = eth_account.Account.from_key(private_key)
        return account
    except Exception as e:
        print(f"❌ Error loading wallet: {e}")
        return None

def get_wallet_address() -> Optional[str]:
    """Get wallet address"""
    account = load_wallet()
    if account:
        return account.address
    return None

# =============================================================================
# HYPERLIQUID CLIENT
# =============================================================================

def get_info_client() -> Info:
    """Get Hyperliquid info client (read-only)"""
    return Info(constants.MAINNET_API_URL, skip_ws=True)

def get_exchange_client() -> Optional[Exchange]:
    """Get Hyperliquid exchange client (requires wallet)"""
    account = load_wallet()
    if not account:
        return None
    
    return Exchange(account, constants.MAINNET_API_URL)

# =============================================================================
# ACCOUNT FUNCTIONS
# =============================================================================

def get_account_state() -> Optional[Dict]:
    """Get account state including balances and positions"""
    account = load_wallet()
    if not account:
        return None
    
    info = get_info_client()
    
    try:
        # Get user state
        user_state = info.user_state(account.address)
        
        # Get open orders
        open_orders = info.open_orders(account.address)
        
        return {
            "address": account.address,
            "margin_summary": user_state.get("marginSummary", {}),
            "cross_margin_summary": user_state.get("crossMarginSummary", {}),
            "positions": user_state.get("assetPositions", []),
            "open_orders": open_orders,
        }
    except Exception as e:
        print(f"Error getting account state: {e}")
        return None

def get_balance() -> float:
    """Get account balance in USDC"""
    state = get_account_state()
    if state:
        margin = state.get("cross_margin_summary", {})
        return float(margin.get("accountValue", 0))
    return 0.0

def get_positions() -> List[Dict]:
    """Get open positions"""
    state = get_account_state()
    if state:
        positions = []
        for pos in state.get("positions", []):
            position_data = pos.get("position", {})
            if float(position_data.get("szi", 0)) != 0:
                positions.append({
                    "coin": position_data.get("coin"),
                    "size": float(position_data.get("szi", 0)),
                    "entry_price": float(position_data.get("entryPx", 0)),
                    "unrealized_pnl": float(position_data.get("unrealizedPnl", 0)),
                    "leverage": float(position_data.get("leverage", {}).get("value", 1)),
                    "liquidation_price": float(position_data.get("liquidationPx", 0) or 0),
                })
        return positions
    return []

# =============================================================================
# MARKET DATA
# =============================================================================

def get_market_price(coin: str) -> Optional[float]:
    """Get current market price for a coin"""
    info = get_info_client()
    
    try:
        all_mids = info.all_mids()
        return float(all_mids.get(coin, 0))
    except Exception as e:
        print(f"Error getting price for {coin}: {e}")
        return None

def get_all_prices() -> Dict[str, float]:
    """Get all market prices"""
    info = get_info_client()
    
    try:
        all_mids = info.all_mids()
        return {k: float(v) for k, v in all_mids.items()}
    except Exception as e:
        print(f"Error getting prices: {e}")
        return {}

def get_funding_rates() -> Dict[str, float]:
    """Get current funding rates"""
    info = get_info_client()
    
    try:
        meta = info.meta()
        rates = {}
        for asset in meta.get("universe", []):
            coin = asset.get("name")
            funding = asset.get("funding", 0)
            if coin and funding:
                rates[coin] = float(funding) * 100  # Convert to percentage
        return rates
    except Exception as e:
        print(f"Error getting funding rates: {e}")
        return {}

# =============================================================================
# TRADING FUNCTIONS
# =============================================================================

def open_position(coin: str, side: str, size_usd: float, leverage: int = DEFAULT_LEVERAGE) -> Dict:
    """
    Open a new position
    
    Args:
        coin: Trading pair (BTC, ETH, SOL, etc.)
        side: "long" or "short"
        size_usd: Position size in USD
        leverage: Leverage to use (default 5x)
    
    Returns:
        Dict with result
    """
    exchange = get_exchange_client()
    if not exchange:
        return {"error": "No wallet configured", "success": False}
    
    # Get current price
    price = get_market_price(coin)
    if not price:
        return {"error": f"Could not get price for {coin}", "success": False}
    
    # Calculate size in coins with proper precision
    size = size_usd / price
    
    # Round to appropriate decimals based on coin
    # BTC: 4 decimals, ETH: 3 decimals, others: 2 decimals
    if coin == "BTC":
        size = round(size, 4)
    elif coin == "ETH":
        size = round(size, 3)
    else:
        size = round(size, 2)
    
    # Minimum size check
    if size < 0.0001:
        return {"error": f"Size too small after rounding: {size}", "success": False}
    
    # Determine if buy or sell
    is_buy = side.lower() == "long"
    
    try:
        # Set leverage first
        exchange.update_leverage(leverage, coin)
        
        # Place market order
        result = exchange.market_open(
            name=coin,
            is_buy=is_buy,
            sz=size,
            slippage=0.01,  # 1% slippage
        )
        
        if result.get("status") == "ok":
            # Calculate SL/TP prices
            if is_buy:
                sl_price = price * (1 - STOP_LOSS_PCT / 100)
                tp_price = price * (1 + TAKE_PROFIT_PCT / 100)
            else:
                sl_price = price * (1 + STOP_LOSS_PCT / 100)
                tp_price = price * (1 - TAKE_PROFIT_PCT / 100)
            
            # Place stop loss
            try:
                exchange.order(
                    coin=coin,
                    is_buy=not is_buy,  # Opposite side for SL
                    sz=size,
                    limit_px=sl_price,
                    order_type={"trigger": {"isMarket": True, "triggerPx": sl_price}},
                    reduce_only=True,
                )
            except:
                pass  # SL is optional
            
            return {
                "success": True,
                "coin": coin,
                "side": side,
                "size": size,
                "size_usd": size_usd,
                "entry_price": price,
                "leverage": leverage,
                "sl_price": sl_price,
                "tp_price": tp_price,
                "response": result,
            }
        else:
            return {"error": f"Order failed: {result}", "success": False}
            
    except Exception as e:
        return {"error": str(e), "success": False}

def close_position(coin: str, percentage: float = 100) -> Dict:
    """
    Close a position
    
    Args:
        coin: Trading pair
        percentage: Percentage of position to close (default 100%)
    
    Returns:
        Dict with result
    """
    exchange = get_exchange_client()
    if not exchange:
        return {"error": "No wallet configured", "success": False}
    
    # Get current position
    positions = get_positions()
    position = next((p for p in positions if p["coin"] == coin), None)
    
    if not position:
        return {"error": f"No open position for {coin}", "success": False}
    
    try:
        size = abs(position["size"]) * (percentage / 100)
        is_buy = position["size"] < 0  # If short, we buy to close
        
        result = exchange.market_close(
            coin=coin,
            sz=size,
            slippage=0.01,
        )
        
        if result.get("status") == "ok":
            return {
                "success": True,
                "coin": coin,
                "closed_size": size,
                "pnl": position["unrealized_pnl"],
                "response": result,
            }
        else:
            return {"error": f"Close failed: {result}", "success": False}
            
    except Exception as e:
        return {"error": str(e), "success": False}

def close_all_positions() -> List[Dict]:
    """Close all open positions"""
    results = []
    positions = get_positions()
    
    for pos in positions:
        result = close_position(pos["coin"])
        results.append(result)
    
    return results

# =============================================================================
# CANDLE DATA & TECHNICAL ANALYSIS
# =============================================================================

def get_candles(coin: str, interval: str = "4h", limit: int = 100) -> List[Dict]:
    """
    Fetch historical candles for a coin
    
    Args:
        coin: Trading pair (BTC, ETH, etc.)
        interval: Candle interval (1m, 5m, 15m, 1h, 4h, 1d)
        limit: Number of candles to fetch
    
    Returns:
        List of candle dicts with open, high, low, close, volume
    """
    try:
        info = get_info_client()
        
        # Convert interval to milliseconds
        interval_ms = {
            "1m": 60000,
            "5m": 300000,
            "15m": 900000,
            "1h": 3600000,
            "4h": 14400000,
            "1d": 86400000,
        }.get(interval, 14400000)
        
        end_time = int(time.time() * 1000)
        start_time = end_time - (interval_ms * limit)
        
        # Use Hyperliquid candle endpoint
        candles = info.candles_snapshot(coin, interval, start_time, end_time)
        
        result = []
        for c in candles:
            result.append({
                "timestamp": c.get("t", 0),
                "open": float(c.get("o", 0)),
                "high": float(c.get("h", 0)),
                "low": float(c.get("l", 0)),
                "close": float(c.get("c", 0)),
                "volume": float(c.get("v", 0)),
            })
        
        return result
    except Exception as e:
        print(f"Error getting candles for {coin}: {e}")
        return []

def calculate_ema(prices: List[float], period: int) -> List[float]:
    """
    Calculate Exponential Moving Average
    
    Args:
        prices: List of prices (close prices typically)
        period: EMA period
    
    Returns:
        List of EMA values
    """
    if len(prices) < period:
        return []
    
    multiplier = 2 / (period + 1)
    ema = [sum(prices[:period]) / period]  # Start with SMA
    
    for price in prices[period:]:
        ema.append((price - ema[-1]) * multiplier + ema[-1])
    
    return ema

def get_trend(coin: str) -> Dict:
    """
    Determine the trend for a coin using EMA crossover
    
    Returns:
        Dict with trend direction and strength
    """
    candles = get_candles(coin, CANDLE_INTERVAL, max(EMA_SLOW + 10, 60))
    
    if len(candles) < EMA_SLOW:
        return {"trend": "neutral", "strength": 0, "ema_fast": 0, "ema_slow": 0}
    
    closes = [c["close"] for c in candles]
    
    ema_fast = calculate_ema(closes, EMA_FAST)
    ema_slow = calculate_ema(closes, EMA_SLOW)
    
    if not ema_fast or not ema_slow:
        return {"trend": "neutral", "strength": 0, "ema_fast": 0, "ema_slow": 0}
    
    # Get latest values
    fast_val = ema_fast[-1]
    slow_val = ema_slow[-1]
    current_price = closes[-1]
    
    # Determine trend
    if fast_val > slow_val and current_price > fast_val:
        trend = "bullish"
        strength = ((fast_val - slow_val) / slow_val) * 100  # % difference
    elif fast_val < slow_val and current_price < fast_val:
        trend = "bearish"
        strength = ((slow_val - fast_val) / slow_val) * 100
    else:
        trend = "neutral"
        strength = 0
    
    return {
        "trend": trend,
        "strength": round(strength, 2),
        "ema_fast": round(fast_val, 2),
        "ema_slow": round(slow_val, 2),
        "price": current_price,
    }

# =============================================================================
# SIGNAL GENERATION (Trend Following + Gevşek Funding)
# =============================================================================

def get_trading_signals() -> List[Dict]:
    """
    Generate trading signals using combined strategy:
    - Trend Following (EMA20 vs EMA50)
    - Gevşek Funding Rate thresholds
    
    Signal strength:
    - 1: Only funding signal
    - 2: Only trend signal
    - 3: Both aligned (STRONG)
    
    Returns:
        List of signal dicts with coin, direction, strength
    """
    signals = []
    
    # Get funding rates
    funding_rates = get_funding_rates()
    
    # Get prices
    prices = get_all_prices()
    
    for coin in SUPPORTED_PAIRS:
        if coin not in prices:
            continue
        
        signal = {
            "coin": coin,
            "price": prices.get(coin, 0),
            "funding_rate": funding_rates.get(coin, 0),
            "direction": None,
            "strength": 0,
            "reason": [],
            "trend": None,
        }
        
        # === TREND SIGNAL ===
        trend_data = get_trend(coin)
        signal["trend"] = trend_data["trend"]
        signal["ema_fast"] = trend_data.get("ema_fast", 0)
        signal["ema_slow"] = trend_data.get("ema_slow", 0)
        
        trend_signal = None
        if trend_data["trend"] == "bullish":
            trend_signal = "long"
            signal["reason"].append(f"📈 Trend UP (EMA{EMA_FAST}>{EMA_SLOW})")
        elif trend_data["trend"] == "bearish":
            trend_signal = "short"
            signal["reason"].append(f"📉 Trend DOWN (EMA{EMA_FAST}<{EMA_SLOW})")
        
        # === FUNDING SIGNAL (Gevşek) ===
        fr = signal["funding_rate"]
        funding_signal = None
        
        if fr < FUNDING_LONG_THRESHOLD:  # Negatif funding → Long
            funding_signal = "long"
            signal["reason"].append(f"💰 Funding negatif ({fr:.4f}%)")
        elif fr > FUNDING_SHORT_THRESHOLD:  # Yüksek funding → Short
            funding_signal = "short"
            signal["reason"].append(f"💸 Funding yüksek ({fr:.4f}%)")
        
        # === COMBINED LOGIC ===
        # En güçlü: Trend + Funding aynı yönde
        if trend_signal and funding_signal and trend_signal == funding_signal:
            signal["direction"] = trend_signal
            signal["strength"] = 3  # STRONG SIGNAL
            signal["reason"].append("🎯 GÜÇLÜ: Trend + Funding uyumlu!")
        
        # Orta: Sadece trend (funding nötr)
        elif trend_signal and not funding_signal:
            signal["direction"] = trend_signal
            signal["strength"] = 2
        
        # Zayıf: Sadece funding (trend nötr)
        elif funding_signal and not trend_signal:
            signal["direction"] = funding_signal
            signal["strength"] = 1
        
        # Çelişki varsa → sinyal yok
        elif trend_signal and funding_signal and trend_signal != funding_signal:
            signal["direction"] = None
            signal["strength"] = 0
            signal["reason"].append("⚠️ Trend ve Funding çelişiyor, bekliyorum")
        
        if signal["direction"] or signal["reason"]:
            signals.append(signal)
    
    # Sort by strength (strongest first)
    signals.sort(key=lambda x: x["strength"], reverse=True)
    
    return signals

# =============================================================================
# STATE MANAGEMENT
# =============================================================================

def load_state() -> Dict:
    """Load trading state"""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "trades": [],
        "total_pnl": 0,
        "last_check": None,
    }

def save_state(state: Dict):
    """Save trading state"""
    STATE_FILE.write_text(json.dumps(state, indent=2, default=str))

# =============================================================================
# REPORTING
# =============================================================================

def generate_report() -> str:
    """Generate a status report"""
    lines = []
    lines.append("=" * 50)
    lines.append(f"📊 Hyperliquid Status - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("=" * 50)
    
    # Account info
    balance = get_balance()
    lines.append(f"\n💰 Account Balance: ${balance:.2f}")
    
    # Positions
    positions = get_positions()
    if positions:
        lines.append(f"\n📈 Open Positions ({len(positions)}):")
        total_pnl = 0
        for pos in positions:
            side = "LONG" if pos["size"] > 0 else "SHORT"
            pnl_str = f"+${pos['unrealized_pnl']:.2f}" if pos['unrealized_pnl'] >= 0 else f"-${abs(pos['unrealized_pnl']):.2f}"
            lines.append(f"  • {pos['coin']} {side} {pos['leverage']:.0f}x | Entry: ${pos['entry_price']:.2f} | PnL: {pnl_str}")
            total_pnl += pos['unrealized_pnl']
        lines.append(f"  Total Unrealized PnL: ${total_pnl:.2f}")
    else:
        lines.append("\n📈 No open positions")
    
    # Market overview
    lines.append("\n📉 Market Prices:")
    prices = get_all_prices()
    for coin in ["BTC", "ETH", "SOL"]:
        if coin in prices:
            lines.append(f"  • {coin}: ${prices[coin]:,.2f}")
    
    # Funding rates
    lines.append("\n💸 Funding Rates (8h):")
    funding = get_funding_rates()
    for coin in ["BTC", "ETH", "SOL"]:
        if coin in funding:
            fr = funding[coin]
            emoji = "🟢" if fr < 0 else "🔴" if fr > 0.03 else "⚪"
            lines.append(f"  • {coin}: {fr:.4f}% {emoji}")
    
    return "\n".join(lines)

def run_monitor():
    """Run monitoring check"""
    print(generate_report())
    
    # Check for signals
    signals = get_trading_signals()
    if signals:
        print("\n🎯 Trading Signals:")
        for sig in signals[:5]:
            print(f"  • {sig['coin']} {sig['direction'].upper()}: {', '.join(sig['reason'])}")

def run_auto_trade():
    """Run automatic trading based on signals (Trend + Funding Strategy)"""
    print(f"\n{'='*50}")
    print(f"🤖 Auto Trade Check - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"    Strategy: Trend Following + Gevşek Funding")
    print(f"{'='*50}\n")
    
    balance = get_balance()
    positions = get_positions()
    
    print(f"💰 Balance: ${balance:.2f}")
    print(f"📊 Open positions: {len(positions)}/{MAX_POSITIONS}")
    
    if balance < 10:
        print("⚠️ Balance too low for trading")
        return {"traded": False, "reason": "Balance too low"}
    
    if len(positions) >= MAX_POSITIONS:
        print("⚠️ Max positions reached")
        return {"traded": False, "reason": "Max positions reached"}
    
    # Get signals
    signals = get_trading_signals()
    
    print(f"\n📡 Signals found: {len(signals)}")
    for sig in signals[:5]:
        strength_emoji = "🔥" if sig["strength"] >= 3 else "✅" if sig["strength"] >= 2 else "⚪"
        print(f"   {strength_emoji} {sig['coin']}: {sig.get('direction', 'NONE').upper() if sig.get('direction') else 'WAIT'} (strength={sig['strength']})")
        for reason in sig.get("reason", []):
            print(f"      - {reason}")
    
    # Only trade on strength >= 2 (trend signal or combined)
    strong_signals = [s for s in signals if s["strength"] >= 2 and s["direction"]]
    
    if not strong_signals:
        print("\n⏳ No strong signals (need strength >= 2)")
        return {"traded": False, "reason": "No strong signals"}
    
    for signal in strong_signals[:1]:  # Only take top signal
        coin = signal["coin"]
        direction = signal["direction"]
        size_usd = balance * (DEFAULT_POSITION_SIZE_PCT / 100)
        
        # Check if we already have a position in this coin
        existing = next((p for p in positions if p["coin"] == coin), None)
        if existing:
            print(f"\n⚠️ Already have position in {coin}, skipping")
            continue
        
        print(f"\n{'='*40}")
        print(f"🎯 EXECUTING TRADE")
        print(f"{'='*40}")
        print(f"   Coin: {coin}")
        print(f"   Direction: {direction.upper()}")
        print(f"   Size: ${size_usd:.2f}")
        print(f"   Leverage: {DEFAULT_LEVERAGE}x")
        print(f"   Strength: {signal['strength']}/3")
        print(f"   Reasons:")
        for reason in signal["reason"]:
            print(f"      • {reason}")
        
        # Execute trade
        result = open_position(coin, direction, size_usd)
        
        if result.get("success"):
            print(f"\n✅ TRADE EXECUTED!")
            print(f"   Entry: ${result.get('entry_price', 0):.2f}")
            print(f"   SL: ${result.get('sl_price', 0):.2f}")
            print(f"   TP: ${result.get('tp_price', 0):.2f}")
            
            # Save to state
            state = load_state()
            state["trades"].append({
                "coin": coin,
                "direction": direction,
                "size_usd": size_usd,
                "entry_price": result.get("entry_price"),
                "strength": signal["strength"],
                "reasons": signal["reason"],
                "timestamp": datetime.now().isoformat(),
            })
            save_state(state)
            
            return {
                "traded": True,
                "coin": coin,
                "direction": direction,
                "size_usd": size_usd,
                "entry_price": result.get("entry_price"),
                "strength": signal["strength"],
            }
        else:
            print(f"\n❌ Trade failed: {result.get('error', 'Unknown error')}")
            return {"traded": False, "reason": result.get("error")}
    
    return {"traded": False, "reason": "No suitable signal"}

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
Xeonen Hyperliquid Trader
=========================

Usage:
  hyperliquid-trader.py status      - Show account status
  hyperliquid-trader.py monitor     - Full monitoring check
  hyperliquid-trader.py trade       - Run auto trading
  hyperliquid-trader.py balance     - Show balance only
  hyperliquid-trader.py positions   - Show positions
  hyperliquid-trader.py signals     - Show trading signals
  hyperliquid-trader.py prices      - Show market prices
  hyperliquid-trader.py funding     - Show funding rates
  
  hyperliquid-trader.py long <COIN> <SIZE_USD> [LEVERAGE]
  hyperliquid-trader.py short <COIN> <SIZE_USD> [LEVERAGE]
  hyperliquid-trader.py close <COIN> [PERCENT]
  hyperliquid-trader.py closeall
  
  hyperliquid-trader.py setup       - Check wallet setup
        """)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "setup":
        account = load_wallet()
        if account:
            print(f"✅ Wallet loaded: {account.address}")
            balance = get_balance()
            print(f"💰 Balance: ${balance:.2f}")
        else:
            print(f"❌ No wallet found")
            print(f"Save your private key to: {WALLET_FILE}")
    
    elif cmd == "status" or cmd == "monitor":
        run_monitor()
    
    elif cmd == "trade":
        run_auto_trade()
    
    elif cmd == "balance":
        print(f"Balance: ${get_balance():.2f}")
    
    elif cmd == "positions":
        positions = get_positions()
        if positions:
            for pos in positions:
                side = "LONG" if pos["size"] > 0 else "SHORT"
                print(f"{pos['coin']} {side} | Size: {abs(pos['size']):.4f} | Entry: ${pos['entry_price']:.2f} | PnL: ${pos['unrealized_pnl']:.2f}")
        else:
            print("No open positions")
    
    elif cmd == "signals":
        signals = get_trading_signals()
        for sig in signals:
            print(f"{sig['coin']} {sig['direction'].upper() if sig['direction'] else 'NEUTRAL'}: {', '.join(sig['reason']) if sig['reason'] else 'No signal'}")
    
    elif cmd == "prices":
        prices = get_all_prices()
        for coin in SUPPORTED_PAIRS:
            if coin in prices:
                print(f"{coin}: ${prices[coin]:,.2f}")
    
    elif cmd == "funding":
        rates = get_funding_rates()
        for coin in SUPPORTED_PAIRS:
            if coin in rates:
                print(f"{coin}: {rates[coin]:.4f}%")
    
    elif cmd == "long" and len(sys.argv) >= 4:
        coin = sys.argv[2].upper()
        size = float(sys.argv[3])
        leverage = int(sys.argv[4]) if len(sys.argv) > 4 else DEFAULT_LEVERAGE
        result = open_position(coin, "long", size, leverage)
        print(json.dumps(result, indent=2))
    
    elif cmd == "short" and len(sys.argv) >= 4:
        coin = sys.argv[2].upper()
        size = float(sys.argv[3])
        leverage = int(sys.argv[4]) if len(sys.argv) > 4 else DEFAULT_LEVERAGE
        result = open_position(coin, "short", size, leverage)
        print(json.dumps(result, indent=2))
    
    elif cmd == "close" and len(sys.argv) >= 3:
        coin = sys.argv[2].upper()
        pct = float(sys.argv[3]) if len(sys.argv) > 3 else 100
        result = close_position(coin, pct)
        print(json.dumps(result, indent=2))
    
    elif cmd == "closeall":
        results = close_all_positions()
        for r in results:
            print(json.dumps(r, indent=2))
    
    else:
        print(f"Unknown command: {cmd}")
