#!/usr/bin/env python3
"""
Xeonen Funding Rate Farmer
Earn from funding rate arbitrage on Hyperliquid

Strategy: When funding rate is high positive, short perp + hold spot
When funding rate is high negative, long perp + short spot (or just long)
"""

import json
import sys
import time
import hashlib
import hmac
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import httpx

# =============================================================================
# CONFIG
# =============================================================================

HL_API = "https://api.hyperliquid.xyz"
SECRETS_PATH = Path.home() / "clawd" / ".secrets"
STATE_FILE = SECRETS_PATH / "funding-farmer-state.json"

# Funding rate thresholds (annualized)
MIN_FUNDING_APR = 20  # Minimum 20% APR to enter
EXIT_FUNDING_APR = 5  # Exit when APR drops below 5%
REVERSE_EXIT_APR = -5  # Exit if funding flips against us

# Position sizing
MAX_POSITION_USD = 100  # Max $100 per position
MIN_POSITION_USD = 20   # Min $20 per position

# Auto-close settings
MAX_HOLD_HOURS = 48  # Maximum hold time
CHECK_INTERVAL_HOURS = 2  # Check every 2 hours

# Coins to monitor
FUNDING_COINS = ["BTC", "ETH", "SOL", "DOGE", "WIF", "BONK", "PEPE", "ARB", "OP", "SUI"]

# =============================================================================
# HELPERS
# =============================================================================

def load_state() -> Dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "positions": {},
        "total_funding_earned": 0,
        "trades": [],
    }

def save_state(state: Dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))

def load_wallet():
    """Load HL wallet from secrets"""
    wallet_file = SECRETS_PATH / "hyperliquid-wallet.txt"
    if wallet_file.exists():
        return wallet_file.read_text().strip()
    return None

# =============================================================================
# HYPERLIQUID API
# =============================================================================

def get_all_funding_rates() -> List[Dict]:
    """Get current funding rates for all coins"""
    try:
        resp = httpx.post(f"{HL_API}/info", json={"type": "metaAndAssetCtxs"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            meta = data[0]  # universe info
            contexts = data[1]  # asset contexts
            
            rates = []
            for i, ctx in enumerate(contexts):
                if i < len(meta["universe"]):
                    coin = meta["universe"][i]["name"]
                    funding = float(ctx.get("funding", 0))
                    mark_price = float(ctx.get("markPx", 0))
                    
                    # Convert to APR (funding is hourly rate)
                    apr = funding * 24 * 365 * 100
                    
                    rates.append({
                        "coin": coin,
                        "funding_hourly": funding,
                        "funding_apr": apr,
                        "mark_price": mark_price,
                        "open_interest": float(ctx.get("openInterest", 0)),
                    })
            
            return rates
    except Exception as e:
        print(f"Error fetching funding rates: {e}")
    return []

def get_user_positions(address: str) -> List[Dict]:
    """Get user's open positions"""
    try:
        resp = httpx.post(f"{HL_API}/info", 
            json={"type": "clearinghouseState", "user": address}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("assetPositions", [])
    except:
        pass
    return []

def get_account_value(address: str) -> float:
    """Get total account value"""
    try:
        resp = httpx.post(f"{HL_API}/info",
            json={"type": "clearinghouseState", "user": address}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return float(data.get("marginSummary", {}).get("accountValue", 0))
    except:
        pass
    return 0

# =============================================================================
# FUNDING ANALYSIS
# =============================================================================

def analyze_funding_opportunities(rates: List[Dict]) -> List[Dict]:
    """Find profitable funding rate opportunities"""
    opportunities = []
    
    for rate in rates:
        coin = rate["coin"]
        apr = rate["funding_apr"]
        
        # Skip if not in our watchlist
        if coin not in FUNDING_COINS:
            continue
        
        # High positive funding = short opportunity
        if apr >= MIN_FUNDING_APR:
            opportunities.append({
                "coin": coin,
                "direction": "SHORT",
                "funding_apr": apr,
                "reason": f"High positive funding ({apr:.1f}% APR)",
                "strategy": "short_perp_hold_spot",
                "mark_price": rate["mark_price"],
            })
        
        # High negative funding = long opportunity
        elif apr <= -MIN_FUNDING_APR:
            opportunities.append({
                "coin": coin,
                "direction": "LONG",
                "funding_apr": abs(apr),
                "reason": f"High negative funding ({apr:.1f}% APR)",
                "strategy": "long_perp",
                "mark_price": rate["mark_price"],
            })
    
    # Sort by APR
    return sorted(opportunities, key=lambda x: x["funding_apr"], reverse=True)

def calculate_expected_profit(apr: float, position_size: float, hours: int = 24) -> float:
    """Calculate expected funding profit"""
    hourly_rate = apr / 100 / 365 / 24
    return position_size * hourly_rate * hours

# =============================================================================
# COMMANDS
# =============================================================================

def show_rates():
    """Show current funding rates"""
    print("=" * 70)
    print(f"💰 FUNDING RATES - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 70)
    
    rates = get_all_funding_rates()
    
    # Filter and sort by APR
    filtered = [r for r in rates if r["coin"] in FUNDING_COINS]
    sorted_rates = sorted(filtered, key=lambda x: abs(x["funding_apr"]), reverse=True)
    
    print(f"\n{'Coin':<8} {'Funding/hr':<12} {'APR':<12} {'Mark Price':<15} {'Signal'}")
    print("-" * 70)
    
    for r in sorted_rates:
        apr = r["funding_apr"]
        if apr >= MIN_FUNDING_APR:
            signal = "🔴 SHORT"
        elif apr <= -MIN_FUNDING_APR:
            signal = "🟢 LONG"
        else:
            signal = "⚪ -"
        
        print(f"{r['coin']:<8} {r['funding_hourly']*100:>+.4f}%    {apr:>+.1f}%      ${r['mark_price']:<12,.2f} {signal}")
    
    # Show opportunities
    opportunities = analyze_funding_opportunities(rates)
    if opportunities:
        print(f"\n🎯 OPPORTUNITIES ({len(opportunities)}):")
        for opp in opportunities[:5]:
            expected = calculate_expected_profit(opp["funding_apr"], MAX_POSITION_USD, 24)
            print(f"   {opp['direction']} {opp['coin']}: {opp['funding_apr']:.1f}% APR → ~${expected:.2f}/day on ${MAX_POSITION_USD}")

def show_status():
    """Show farming status"""
    state = load_state()
    wallet = load_wallet()
    
    print("=" * 60)
    print("📊 FUNDING FARMER STATUS")
    print("=" * 60)
    
    if wallet:
        # Derive address from private key
        try:
            from eth_account import Account
            account = Account.from_key(wallet)
            address = account.address
            
            account_value = get_account_value(address)
            positions = get_user_positions(address)
            
            print(f"\n💰 Account Value: ${account_value:,.2f}")
            print(f"📈 Active Positions: {len(positions)}")
            
            if positions:
                print("\nPositions:")
                for pos in positions:
                    p = pos.get("position", {})
                    coin = p.get("coin", "?")
                    size = float(p.get("szi", 0))
                    entry = float(p.get("entryPx", 0))
                    pnl = float(p.get("unrealizedPnl", 0))
                    print(f"   {coin}: {size:+.4f} @ ${entry:,.2f} | PnL: ${pnl:+.2f}")
        except ImportError:
            print("   (eth_account not installed)")
    
    print(f"\n📊 Farming Stats:")
    print(f"   Total Funding Earned: ${state.get('total_funding_earned', 0):.2f}")
    print(f"   Active Farms: {len(state.get('positions', {}))}")

def scan_opportunities():
    """Scan and report opportunities"""
    print("🔍 SCANNING FUNDING OPPORTUNITIES...")
    
    rates = get_all_funding_rates()
    opportunities = analyze_funding_opportunities(rates)
    
    if not opportunities:
        print("📊 No significant funding opportunities right now")
        return []
    
    print(f"\n🎯 Found {len(opportunities)} opportunities:\n")
    
    for opp in opportunities:
        expected_24h = calculate_expected_profit(opp["funding_apr"], MAX_POSITION_USD, 24)
        expected_7d = calculate_expected_profit(opp["funding_apr"], MAX_POSITION_USD, 24*7)
        
        emoji = "🔴" if opp["direction"] == "SHORT" else "🟢"
        print(f"{emoji} {opp['direction']} {opp['coin']}")
        print(f"   APR: {opp['funding_apr']:.1f}%")
        print(f"   Expected: ${expected_24h:.2f}/day, ${expected_7d:.2f}/week (on ${MAX_POSITION_USD})")
        print(f"   Strategy: {opp['strategy']}")
        print()
    
    return opportunities

# =============================================================================
# TRADE EXECUTION
# =============================================================================

def get_hl_exchange():
    """Get Hyperliquid exchange client"""
    try:
        from hyperliquid.exchange import Exchange
        from hyperliquid.info import Info
        import eth_account
        
        wallet = load_wallet()
        if not wallet:
            return None, None
        
        account = eth_account.Account.from_key(wallet)
        info = Info(skip_ws=True)
        exchange = Exchange(account, base_url='https://api.hyperliquid.xyz')
        
        return exchange, info
    except Exception as e:
        print(f"Error initializing exchange: {e}")
        return None, None

def open_funding_position(coin: str, direction: str, size_usd: float) -> Optional[Dict]:
    """Open a funding farming position"""
    exchange, info = get_hl_exchange()
    if not exchange:
        print("❌ Could not initialize exchange")
        return None
    
    try:
        # Get price and decimals
        prices = info.all_mids()
        price = float(prices.get(coin, 0))
        if price == 0:
            print(f"❌ Could not get price for {coin}")
            return None
        
        meta = info.meta()
        sz_decimals = 0
        for u in meta['universe']:
            if u['name'] == coin:
                sz_decimals = u['szDecimals']
                break
        
        # Calculate size
        size = round(size_usd / price, sz_decimals)
        is_buy = direction == "LONG"
        
        print(f"📤 Opening {direction} {coin}: {size} @ ${price:.4f} (~${size_usd})")
        
        # Execute order
        order = exchange.market_open(coin, is_buy, size, None, 0.01)
        
        if order.get('status') == 'ok':
            filled = order['response']['data']['statuses'][0].get('filled', {})
            avg_px = float(filled.get('avgPx', price))
            total_sz = float(filled.get('totalSz', size))
            
            # Save to state
            state = load_state()
            state['positions'][coin] = {
                'direction': direction,
                'size': total_sz,
                'entry_price': avg_px,
                'entry_time': datetime.now().isoformat(),
                'size_usd': size_usd,
            }
            save_state(state)
            
            print(f"✅ Opened {direction} {coin}: {total_sz} @ ${avg_px:.4f}")
            return {'coin': coin, 'direction': direction, 'size': total_sz, 'price': avg_px}
        else:
            print(f"❌ Order failed: {order}")
            return None
            
    except Exception as e:
        print(f"❌ Error opening position: {e}")
        return None

def close_funding_position(coin: str, reason: str = "manual") -> Optional[Dict]:
    """Close a funding farming position"""
    exchange, info = get_hl_exchange()
    if not exchange:
        print("❌ Could not initialize exchange")
        return None
    
    state = load_state()
    position = state.get('positions', {}).get(coin)
    
    if not position:
        print(f"⚠️ No tracked position for {coin}")
        return None
    
    try:
        direction = position['direction']
        size = position['size']
        is_buy = direction == "SHORT"  # Close short = buy, close long = sell
        
        print(f"📤 Closing {direction} {coin}: {size} ({reason})")
        
        # Get current price
        prices = info.all_mids()
        price = float(prices.get(coin, 0))
        
        # Execute close
        order = exchange.market_open(coin, is_buy, size, None, 0.01)
        
        if order.get('status') == 'ok':
            filled = order['response']['data']['statuses'][0].get('filled', {})
            avg_px = float(filled.get('avgPx', price))
            
            # Calculate PnL
            entry_price = position['entry_price']
            if direction == "LONG":
                pnl = (avg_px - entry_price) * size
            else:
                pnl = (entry_price - avg_px) * size
            
            # Update state
            state['total_funding_earned'] = state.get('total_funding_earned', 0) + pnl
            del state['positions'][coin]
            state['trades'] = state.get('trades', [])
            state['trades'].append({
                'coin': coin,
                'direction': direction,
                'entry': entry_price,
                'exit': avg_px,
                'size': size,
                'pnl': pnl,
                'reason': reason,
                'closed_at': datetime.now().isoformat(),
            })
            save_state(state)
            
            print(f"✅ Closed {direction} {coin} @ ${avg_px:.4f} | PnL: ${pnl:+.2f} ({reason})")
            return {'coin': coin, 'pnl': pnl, 'reason': reason}
        else:
            print(f"❌ Close order failed: {order}")
            return None
            
    except Exception as e:
        print(f"❌ Error closing position: {e}")
        return None

def check_exit_conditions() -> List[Dict]:
    """Check if any positions should be closed"""
    state = load_state()
    positions = state.get('positions', {})
    
    if not positions:
        return []
    
    rates = get_all_funding_rates()
    rate_map = {r['coin']: r for r in rates}
    
    exits = []
    
    for coin, pos in list(positions.items()):
        rate = rate_map.get(coin, {})
        apr = rate.get('funding_apr', 0)
        direction = pos['direction']
        entry_time = datetime.fromisoformat(pos['entry_time'])
        hours_held = (datetime.now() - entry_time).total_seconds() / 3600
        
        should_exit = False
        reason = ""
        
        # Check if funding flipped against us
        if direction == "LONG" and apr > REVERSE_EXIT_APR:
            should_exit = True
            reason = f"funding_flipped_positive ({apr:.1f}% APR)"
        elif direction == "SHORT" and apr < -REVERSE_EXIT_APR:
            should_exit = True
            reason = f"funding_flipped_negative ({apr:.1f}% APR)"
        
        # Check if APR dropped too low
        elif abs(apr) < EXIT_FUNDING_APR:
            should_exit = True
            reason = f"apr_too_low ({apr:.1f}% APR)"
        
        # Check max hold time
        elif hours_held >= MAX_HOLD_HOURS:
            should_exit = True
            reason = f"max_hold_time ({hours_held:.0f}h)"
        
        if should_exit:
            print(f"⚠️ Exit signal for {coin}: {reason}")
            result = close_funding_position(coin, reason)
            if result:
                exits.append(result)
    
    return exits

def run_auto_farm():
    """Run automatic funding farming"""
    print("=" * 60)
    print(f"🌾 FUNDING FARMER - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    # First check exits
    print("\n🔍 Checking exit conditions...")
    exits = check_exit_conditions()
    if exits:
        for e in exits:
            print(f"   ✅ Closed {e['coin']}: ${e['pnl']:+.2f}")
    
    # Then look for new opportunities
    print("\n🔍 Scanning opportunities...")
    rates = get_all_funding_rates()
    opportunities = analyze_funding_opportunities(rates)
    
    state = load_state()
    current_positions = set(state.get('positions', {}).keys())
    
    # Open new positions (max 2 funding farms at a time)
    max_farms = 2
    current_farms = len(current_positions)
    
    for opp in opportunities:
        if current_farms >= max_farms:
            break
        
        coin = opp['coin']
        if coin in current_positions:
            continue
        
        # Only enter if APR is high enough
        if opp['funding_apr'] >= MIN_FUNDING_APR:
            result = open_funding_position(coin, opp['direction'], MAX_POSITION_USD)
            if result:
                current_farms += 1
                current_positions.add(coin)
    
    print("\n" + "=" * 60)

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
Funding Rate Farmer
===================

Usage:
  funding-farmer.py rates     - Show current funding rates
  funding-farmer.py scan      - Scan for opportunities
  funding-farmer.py status    - Show farming status
  funding-farmer.py monitor   - Monitoring (for cron)
  funding-farmer.py farm      - Run auto farming (open/close)
  funding-farmer.py check     - Check exit conditions
  funding-farmer.py open <COIN> <DIRECTION> [SIZE_USD]
  funding-farmer.py close <COIN>
        """)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "rates":
        show_rates()
    
    elif cmd == "scan":
        scan_opportunities()
    
    elif cmd == "status":
        show_status()
    
    elif cmd == "monitor":
        # For cron - check exits and alert on opportunities
        exits = check_exit_conditions()
        if exits:
            print("📤 CLOSED POSITIONS:")
            for e in exits:
                print(f"   {e['coin']}: ${e['pnl']:+.2f} ({e['reason']})")
        
        rates = get_all_funding_rates()
        opportunities = analyze_funding_opportunities(rates)
        
        # Only alert on very high APR (>30%)
        hot_opps = [o for o in opportunities if o["funding_apr"] >= 30]
        
        if hot_opps:
            print("🔥 HOT FUNDING OPPORTUNITIES:")
            for opp in hot_opps:
                expected = calculate_expected_profit(opp["funding_apr"], MAX_POSITION_USD, 24)
                print(f"   {opp['direction']} {opp['coin']}: {opp['funding_apr']:.1f}% APR (~${expected:.2f}/day)")
    
    elif cmd == "farm":
        run_auto_farm()
    
    elif cmd == "check":
        print("🔍 Checking exit conditions...")
        exits = check_exit_conditions()
        if not exits:
            print("✅ No positions need to be closed")
    
    elif cmd == "open" and len(sys.argv) >= 4:
        coin = sys.argv[2].upper()
        direction = sys.argv[3].upper()
        size = float(sys.argv[4]) if len(sys.argv) > 4 else MAX_POSITION_USD
        open_funding_position(coin, direction, size)
    
    elif cmd == "close" and len(sys.argv) >= 3:
        coin = sys.argv[2].upper()
        close_funding_position(coin, "manual")
    
    else:
        print(f"Unknown command: {cmd}")
