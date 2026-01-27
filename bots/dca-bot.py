#!/usr/bin/env python3
"""
Xeonen DCA Bot
Dollar Cost Averaging - automatic recurring buys

Features:
- Schedule recurring buys (daily/weekly/monthly)
- Multi-token support
- Intelligent timing (buy on dips)
- Track average cost basis
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import httpx

# Import Jupiter swap from auto-trader for Solana tokens
sys.path.insert(0, str(Path(__file__).parent))
try:
    from importlib.util import spec_from_file_location, module_from_spec
    spec = spec_from_file_location("auto_trader", Path(__file__).parent / "auto-trader.py")
    auto_trader = module_from_spec(spec)
    spec.loader.exec_module(auto_trader)
    buy_token_jupiter = auto_trader.buy_token
    get_sol_balance = auto_trader.get_sol_balance
    SOLANA_TOKENS = auto_trader.TOKENS
    HAS_JUPITER = True
except Exception as e:
    print(f"Warning: Could not import Jupiter swap: {e}")
    HAS_JUPITER = False
    buy_token_jupiter = None

# =============================================================================
# CONFIG
# =============================================================================

SECRETS_PATH = Path.home() / "clawd" / ".secrets"
STATE_FILE = SECRETS_PATH / "dca-bot-state.json"

# DCA Plans
DCA_PLANS = {
    "SOL": {
        "enabled": True,
        "amount_usd": 10,          # Buy $10 worth
        "frequency": "daily",       # daily, weekly, monthly
        "day_of_week": None,        # For weekly (0=Monday)
        "day_of_month": None,       # For monthly (1-28)
        "buy_on_dip": True,         # Only buy if price dipped
        "dip_threshold": -2,        # Buy if 24h change < -2%
        "max_price": 200,           # Don't buy above this
    },
    "BTC": {
        "enabled": True,
        "amount_usd": 20,
        "frequency": "weekly",
        "day_of_week": 0,           # Monday
        "day_of_month": None,
        "buy_on_dip": False,
        "dip_threshold": 0,
        "max_price": None,
    },
    "ETH": {
        "enabled": True,
        "amount_usd": 15,
        "frequency": "weekly",
        "day_of_week": 0,
        "day_of_month": None,
        "buy_on_dip": False,
        "dip_threshold": 0,
        "max_price": None,
    },
    "WIF": {
        "enabled": True,
        "amount_usd": 5,
        "frequency": "daily",
        "day_of_week": None,
        "day_of_month": None,
        "buy_on_dip": True,
        "dip_threshold": -5,        # Aggressive dip buying
        "max_price": 1.0,
    },
}

# =============================================================================
# HELPERS
# =============================================================================

def load_state() -> Dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "positions": {},  # {symbol: {total_cost, total_amount, avg_price, buys}}
        "last_buy": {},   # {symbol: timestamp}
        "total_invested": 0,
        "buy_history": [],
    }

def save_state(state: Dict):
    STATE_FILE.write_text(json.dumps(state, indent=2, default=str))

def get_token_data(symbol: str) -> Optional[Dict]:
    """Get token price and 24h change"""
    addresses = {
        "SOL": "So11111111111111111111111111111111111111112",
        "BTC": "bitcoin",  # Special case for CoinGecko
        "ETH": "ethereum",
        "WIF": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
        "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    }
    
    if symbol not in addresses:
        return None
    
    # Use DexScreener for Solana tokens, CoinGecko for BTC/ETH
    if symbol in ["BTC", "ETH"]:
        try:
            resp = httpx.get(
                f"https://api.coingecko.com/api/v3/simple/price",
                params={"ids": addresses[symbol], "vs_currencies": "usd", "include_24hr_change": "true"},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json().get(addresses[symbol], {})
                return {
                    "price": data.get("usd", 0),
                    "change_24h": data.get("usd_24h_change", 0),
                }
        except:
            pass
    else:
        try:
            resp = httpx.get(f"https://api.dexscreener.com/latest/dex/tokens/{addresses[symbol]}", timeout=10)
            if resp.status_code == 200:
                pairs = resp.json().get("pairs", [])
                if pairs:
                    return {
                        "price": float(pairs[0].get("priceUsd", 0)),
                        "change_24h": float(pairs[0].get("priceChange", {}).get("h24", 0)),
                    }
        except:
            pass
    
    return None

# =============================================================================
# DCA LOGIC
# =============================================================================

def should_buy_today(symbol: str, plan: Dict, state: Dict) -> bool:
    """Check if we should buy today based on schedule"""
    now = datetime.now()
    last_buy_str = state.get("last_buy", {}).get(symbol)
    
    if last_buy_str:
        last_buy = datetime.fromisoformat(last_buy_str)
    else:
        last_buy = None
    
    freq = plan.get("frequency", "daily")
    
    if freq == "daily":
        # Buy once per day
        if last_buy and last_buy.date() == now.date():
            return False
        return True
    
    elif freq == "weekly":
        # Buy on specific day of week
        target_day = plan.get("day_of_week", 0)
        if now.weekday() != target_day:
            return False
        if last_buy and (now - last_buy).days < 6:
            return False
        return True
    
    elif freq == "monthly":
        # Buy on specific day of month
        target_day = plan.get("day_of_month", 1)
        if now.day != target_day:
            return False
        if last_buy and (now - last_buy).days < 25:
            return False
        return True
    
    return False

def check_dip_condition(plan: Dict, change_24h: float) -> bool:
    """Check if dip condition is met"""
    if not plan.get("buy_on_dip", False):
        return True  # No dip requirement
    
    threshold = plan.get("dip_threshold", 0)
    return change_24h <= threshold

def execute_dca_buy(symbol: str, plan: Dict, data: Dict, state: Dict, live: bool = False) -> Optional[Dict]:
    """Execute a DCA buy
    
    Args:
        live: If True, execute real trade via Jupiter (for Solana tokens)
    """
    price = data["price"]
    amount_usd = plan["amount_usd"]
    amount_token = amount_usd / price
    
    # Create buy record
    buy = {
        "symbol": symbol,
        "amount_usd": amount_usd,
        "amount_token": amount_token,
        "price": price,
        "change_24h": data["change_24h"],
        "timestamp": datetime.now().isoformat(),
        "executed": False,
        "mode": "simulation",
    }
    
    # Execute real trade if live mode and Jupiter available
    if live and HAS_JUPITER and buy_token_jupiter and symbol in ["SOL", "WIF", "BONK", "POPCAT", "MEW"]:
        # For Solana tokens, use Jupiter
        # Calculate SOL amount needed
        sol_price = get_token_data("SOL")
        if sol_price and sol_price.get("price", 0) > 0:
            sol_amount = amount_usd / sol_price["price"]
            result = buy_token_jupiter(symbol, sol_amount)
            if result.get("success"):
                buy["executed"] = True
                buy["mode"] = "live"
                buy["tx"] = result.get("signature", "")[:20]
                print(f"   ✅ DCA BUY {symbol}: ${amount_usd} via Jupiter")
            else:
                buy["error"] = result.get("error")
                print(f"   ❌ DCA BUY failed: {result.get('error')}")
                return None
    else:
        # Simulation mode or non-Solana tokens
        buy["mode"] = "simulation"
    
    # Update position (whether simulated or real)
    if symbol not in state["positions"]:
        state["positions"][symbol] = {
            "total_cost": 0,
            "total_amount": 0,
            "avg_price": 0,
            "buys": 0,
        }
    
    pos = state["positions"][symbol]
    pos["total_cost"] += amount_usd
    pos["total_amount"] += amount_token
    pos["avg_price"] = pos["total_cost"] / pos["total_amount"]
    pos["buys"] += 1
    
    # Update last buy time
    state["last_buy"][symbol] = datetime.now().isoformat()
    state["total_invested"] = state.get("total_invested", 0) + amount_usd
    
    state["buy_history"].append(buy)
    state["buy_history"] = state["buy_history"][-100:]  # Keep last 100
    
    return buy

def run_dca(live: bool = False) -> List[Dict]:
    """Run DCA for all enabled plans
    
    Args:
        live: If True, execute real trades via Jupiter (Solana tokens)
    """
    state = load_state()
    buys = []
    
    for symbol, plan in DCA_PLANS.items():
        if not plan.get("enabled", False):
            continue
        
        # Check schedule
        if not should_buy_today(symbol, plan, state):
            continue
        
        # Get price data
        data = get_token_data(symbol)
        if not data:
            print(f"   ⚠️ Could not get data for {symbol}")
            continue
        
        price = data["price"]
        change = data["change_24h"]
        
        # Check max price
        max_price = plan.get("max_price")
        if max_price and price > max_price:
            print(f"   ⏭️ {symbol}: Price ${price:.2f} > max ${max_price:.2f}, skipping")
            continue
        
        # Check dip condition
        if not check_dip_condition(plan, change):
            print(f"   ⏭️ {symbol}: No dip ({change:+.1f}%), threshold is {plan.get('dip_threshold')}%")
            continue
        
        # Execute buy (real or simulated)
        buy = execute_dca_buy(symbol, plan, data, state, live=live)
        if buy:
            buys.append(buy)
            mode = "✅" if buy.get("executed") else "📝"
            print(f"   {mode} DCA {symbol}: ${buy['amount_usd']:.2f} @ ${price:.4f} ({change:+.1f}%)")
    
    save_state(state)
    return buys

# =============================================================================
# COMMANDS
# =============================================================================

def show_status():
    """Show DCA bot status"""
    state = load_state()
    
    print("=" * 60)
    print("📈 DCA BOT STATUS")
    print("=" * 60)
    
    print(f"\n💰 Total Invested: ${state.get('total_invested', 0):.2f}")
    print(f"📊 Total Buys: {len(state.get('buy_history', []))}")
    
    # Show positions
    positions = state.get("positions", {})
    if positions:
        print(f"\n📦 Positions:")
        for symbol, pos in positions.items():
            current = get_token_data(symbol)
            current_price = current["price"] if current else 0
            current_value = pos["total_amount"] * current_price
            pnl = current_value - pos["total_cost"]
            pnl_pct = (pnl / pos["total_cost"] * 100) if pos["total_cost"] > 0 else 0
            
            emoji = "🟢" if pnl >= 0 else "🔴"
            print(f"\n   {symbol}:")
            print(f"      Amount: {pos['total_amount']:.6f}")
            print(f"      Avg Price: ${pos['avg_price']:.4f}")
            print(f"      Cost Basis: ${pos['total_cost']:.2f}")
            print(f"      Current Value: ${current_value:.2f}")
            print(f"      {emoji} PnL: ${pnl:+.2f} ({pnl_pct:+.1f}%)")
            print(f"      Buys: {pos['buys']}")
    
    # Show active plans
    print(f"\n📋 Active DCA Plans:")
    for symbol, plan in DCA_PLANS.items():
        if plan.get("enabled"):
            freq = plan["frequency"]
            amount = plan["amount_usd"]
            dip = f", dip<{plan['dip_threshold']}%" if plan.get("buy_on_dip") else ""
            print(f"   {symbol}: ${amount} {freq}{dip}")

def show_schedule():
    """Show upcoming DCA schedule"""
    state = load_state()
    now = datetime.now()
    
    print("=" * 60)
    print("📅 DCA SCHEDULE")
    print("=" * 60)
    
    for symbol, plan in DCA_PLANS.items():
        if not plan.get("enabled"):
            continue
        
        last_buy_str = state.get("last_buy", {}).get(symbol)
        if last_buy_str:
            last_buy = datetime.fromisoformat(last_buy_str)
            last_str = last_buy.strftime("%Y-%m-%d %H:%M")
        else:
            last_str = "Never"
        
        freq = plan["frequency"]
        
        if freq == "daily":
            next_buy = "Today (if conditions met)"
        elif freq == "weekly":
            days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            target = plan.get("day_of_week", 0)
            next_buy = f"Every {days[target]}"
        elif freq == "monthly":
            next_buy = f"Day {plan.get('day_of_month', 1)} of month"
        else:
            next_buy = "Unknown"
        
        print(f"\n{symbol}:")
        print(f"   Schedule: {next_buy}")
        print(f"   Last Buy: {last_str}")
        print(f"   Amount: ${plan['amount_usd']}")

def run_check(live: bool = False):
    """Check and execute DCA buys"""
    mode = "🔴 LIVE" if live else "🔵 SIM"
    print("=" * 60)
    print(f"🤖 DCA BOT [{mode}] - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    if live and not HAS_JUPITER:
        print("⚠️ Jupiter not available for Solana tokens")
    
    print("\n🔍 Checking DCA conditions...")
    buys = run_dca(live=live)
    
    if buys:
        executed = sum(1 for b in buys if b.get("executed"))
        print(f"\n✅ {executed}/{len(buys)} DCA buys executed")
        total = sum(b["amount_usd"] for b in buys)
        print(f"   Total: ${total:.2f}")
    else:
        print("\n📊 No DCA buys triggered")

def reset_state():
    """Reset DCA state"""
    state = {
        "positions": {},
        "last_buy": {},
        "total_invested": 0,
        "buy_history": [],
    }
    save_state(state)
    print("✅ DCA state reset")

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
DCA Bot
=======

Usage:
  dca-bot.py status    - Show DCA status and positions
  dca-bot.py schedule  - Show DCA schedule
  dca-bot.py run       - Check and execute DCA buys (simulation)
  dca-bot.py live      - Check and execute DCA buys (REAL trades!)
  dca-bot.py reset     - Reset all state
        """)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "status":
        show_status()
    
    elif cmd == "schedule":
        show_schedule()
    
    elif cmd == "run":
        run_check(live=False)
    
    elif cmd == "live":
        print("⚠️ LIVE MODE - Real trades will be executed!")
        run_check(live=True)
    
    elif cmd == "reset":
        reset_state()
    
    else:
        print(f"Unknown command: {cmd}")
