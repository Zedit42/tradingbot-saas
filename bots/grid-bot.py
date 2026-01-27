#!/usr/bin/env python3
"""
Xeonen Grid Trading Bot
Automated grid trading for range-bound markets

Strategy: Place buy orders below current price and sell orders above
Profit from price oscillation within a range
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from decimal import Decimal
import httpx

# Import Jupiter swap from auto-trader
sys.path.insert(0, str(Path(__file__).parent))
try:
    from importlib.util import spec_from_file_location, module_from_spec
    spec = spec_from_file_location("auto_trader", Path(__file__).parent / "auto-trader.py")
    auto_trader = module_from_spec(spec)
    spec.loader.exec_module(auto_trader)
    buy_token = auto_trader.buy_token
    sell_token = auto_trader.sell_token
    get_sol_balance = auto_trader.get_sol_balance
    HAS_JUPITER = True
except Exception as e:
    print(f"Warning: Could not import Jupiter swap: {e}")
    HAS_JUPITER = False
    buy_token = None
    sell_token = None

# =============================================================================
# CONFIG
# =============================================================================

SECRETS_PATH = Path.home() / "clawd" / ".secrets"
STATE_FILE = SECRETS_PATH / "grid-bot-state.json"

# Grid settings
DEFAULT_GRID_CONFIG = {
    "SOL": {
        "enabled": True,
        "lower_price": 100,      # Grid lower bound
        "upper_price": 150,      # Grid upper bound
        "num_grids": 10,         # Number of grid levels
        "total_investment": 50,  # Total SOL to use
        "take_profit": None,     # Optional TP price
        "stop_loss": 90,         # SL price
    },
    "WIF": {
        "enabled": True,
        "lower_price": 0.25,
        "upper_price": 0.45,
        "num_grids": 8,
        "total_investment": 20,  # USD equivalent
        "take_profit": None,
        "stop_loss": 0.20,
    },
    "BONK": {
        "enabled": True,
        "lower_price": 0.000007,
        "upper_price": 0.000012,
        "num_grids": 8,
        "total_investment": 20,
        "take_profit": None,
        "stop_loss": 0.000005,
    },
}

# =============================================================================
# HELPERS
# =============================================================================

def load_state() -> Dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "grids": {},
        "filled_orders": [],
        "total_profit": 0,
        "trades_count": 0,
    }

def save_state(state: Dict):
    STATE_FILE.write_text(json.dumps(state, indent=2, default=str))

def get_token_price(symbol: str) -> float:
    """Get current price from DexScreener"""
    addresses = {
        "SOL": "So11111111111111111111111111111111111111112",
        "WIF": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
        "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        "POPCAT": "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
        "TRUMP": "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
    }
    
    if symbol not in addresses:
        return 0
    
    try:
        resp = httpx.get(f"https://api.dexscreener.com/latest/dex/tokens/{addresses[symbol]}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            pairs = data.get("pairs", [])
            if pairs:
                return float(pairs[0].get("priceUsd", 0))
    except:
        pass
    return 0

# =============================================================================
# GRID LOGIC
# =============================================================================

def calculate_grid_levels(config: Dict) -> List[Dict]:
    """Calculate grid price levels"""
    lower = config["lower_price"]
    upper = config["upper_price"]
    num_grids = config["num_grids"]
    total = config["total_investment"]
    
    # Calculate price step
    price_step = (upper - lower) / num_grids
    
    # Calculate amount per grid
    amount_per_grid = total / num_grids
    
    levels = []
    for i in range(num_grids + 1):
        price = lower + (i * price_step)
        levels.append({
            "level": i,
            "price": price,
            "buy_price": price,
            "sell_price": price + price_step,
            "amount": amount_per_grid / price,  # Amount in base token
            "status": "pending",  # pending, bought, sold
        })
    
    return levels

def get_grid_status(symbol: str, current_price: float, levels: List[Dict]) -> Dict:
    """Analyze current grid status"""
    buy_orders = 0
    sell_orders = 0
    pending = 0
    
    for level in levels:
        if level["status"] == "pending":
            if current_price > level["buy_price"]:
                pending += 1  # Price above, waiting to buy on dip
            else:
                buy_orders += 1  # Price below, ready to buy
        elif level["status"] == "bought":
            if current_price >= level["sell_price"]:
                sell_orders += 1  # Ready to sell
    
    return {
        "buy_orders": buy_orders,
        "sell_orders": sell_orders,
        "pending": pending,
        "current_price": current_price,
    }

def execute_grid_trades(symbol: str, config: Dict, state: Dict, live: bool = False) -> List[Dict]:
    """Execute grid trades based on current price
    
    Args:
        live: If True, execute real trades via Jupiter. If False, simulate only.
    """
    current_price = get_token_price(symbol)
    if current_price == 0:
        return []
    
    # Get or initialize grid levels
    if symbol not in state.get("grids", {}):
        state["grids"] = state.get("grids", {})
        state["grids"][symbol] = calculate_grid_levels(config)
    
    levels = state["grids"][symbol]
    trades = []
    
    for level in levels:
        # Check for buy signal
        if level["status"] == "pending" and current_price <= level["buy_price"]:
            trade_info = {
                "type": "BUY",
                "symbol": symbol,
                "price": current_price,
                "grid_price": level["buy_price"],
                "amount": level["amount"],
                "level": level["level"],
                "timestamp": datetime.now().isoformat(),
                "executed": False,
            }
            
            # Execute real trade if live mode
            if live and HAS_JUPITER and buy_token:
                sol_amount = level["amount"] * current_price / get_token_price("SOL") if symbol != "SOL" else level["amount"]
                result = buy_token(symbol, sol_amount)
                if result.get("success"):
                    trade_info["executed"] = True
                    trade_info["tx"] = result.get("signature", "")[:20]
                    level["status"] = "bought"
                    level["entry_price"] = current_price
                    print(f"   ✅ GRID BUY {symbol} @ ${current_price:.6f}")
                else:
                    trade_info["error"] = result.get("error")
                    print(f"   ❌ GRID BUY failed: {result.get('error')}")
            else:
                # Simulation mode
                level["status"] = "bought"
                level["entry_price"] = current_price
                trade_info["executed"] = False
                trade_info["mode"] = "simulation"
            
            trades.append(trade_info)
        
        # Check for sell signal
        elif level["status"] == "bought" and current_price >= level["sell_price"]:
            entry = level.get("entry_price", level["buy_price"])
            profit = (current_price - entry) * level["amount"]
            
            trade_info = {
                "type": "SELL",
                "symbol": symbol,
                "price": current_price,
                "grid_price": level["sell_price"],
                "amount": level["amount"],
                "level": level["level"],
                "profit": profit,
                "timestamp": datetime.now().isoformat(),
                "executed": False,
            }
            
            # Execute real trade if live mode
            if live and HAS_JUPITER and sell_token:
                result = sell_token(symbol, 100)  # Sell grid amount
                if result.get("success"):
                    trade_info["executed"] = True
                    trade_info["tx"] = result.get("signature", "")[:20]
                    level["status"] = "pending"
                    state["total_profit"] = state.get("total_profit", 0) + profit
                    print(f"   ✅ GRID SELL {symbol} @ ${current_price:.6f} | Profit: ${profit:.4f}")
                else:
                    trade_info["error"] = result.get("error")
                    print(f"   ❌ GRID SELL failed: {result.get('error')}")
            else:
                # Simulation mode
                level["status"] = "pending"
                state["total_profit"] = state.get("total_profit", 0) + profit
                trade_info["executed"] = False
                trade_info["mode"] = "simulation"
            
            trades.append(trade_info)
    
    # Check stop loss
    if current_price <= config.get("stop_loss", 0):
        print(f"   ⚠️ STOP LOSS triggered at ${current_price}")
    
    return trades

# Keep old function name for compatibility
def simulate_grid_trades(symbol: str, config: Dict, state: Dict) -> List[Dict]:
    return execute_grid_trades(symbol, config, state, live=False)

# =============================================================================
# COMMANDS
# =============================================================================

def show_status():
    """Show grid bot status"""
    state = load_state()
    
    print("=" * 60)
    print("📊 GRID BOT STATUS")
    print("=" * 60)
    
    print(f"\n💰 Total Profit: ${state.get('total_profit', 0):.2f}")
    print(f"📈 Total Trades: {state.get('trades_count', 0)}")
    
    for symbol, config in DEFAULT_GRID_CONFIG.items():
        if not config.get("enabled"):
            continue
        
        current_price = get_token_price(symbol)
        
        print(f"\n{'='*40}")
        print(f"🪙 {symbol}")
        print(f"   Current: ${current_price:.6f}")
        print(f"   Range: ${config['lower_price']:.6f} - ${config['upper_price']:.6f}")
        print(f"   Grids: {config['num_grids']}")
        print(f"   Investment: ${config['total_investment']}")
        
        # Show grid status
        if symbol in state.get("grids", {}):
            levels = state["grids"][symbol]
            bought = sum(1 for l in levels if l["status"] == "bought")
            pending = sum(1 for l in levels if l["status"] == "pending")
            print(f"   Status: {bought} bought, {pending} pending")
        
        # Position in range
        if config["lower_price"] <= current_price <= config["upper_price"]:
            position = (current_price - config["lower_price"]) / (config["upper_price"] - config["lower_price"])
            print(f"   Range Position: {position*100:.0f}%")
        elif current_price < config["lower_price"]:
            print(f"   ⚠️ Below range!")
        else:
            print(f"   ⚠️ Above range!")

def run_grids(live: bool = False):
    """Run grid trading logic
    
    Args:
        live: If True, execute real trades via Jupiter
    """
    mode = "🔴 LIVE" if live else "🔵 SIM"
    print("=" * 60)
    print(f"🤖 GRID BOT [{mode}] - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    if live and not HAS_JUPITER:
        print("❌ Jupiter not available, falling back to simulation")
        live = False
    
    state = load_state()
    all_trades = []
    
    for symbol, config in DEFAULT_GRID_CONFIG.items():
        if not config.get("enabled"):
            continue
        
        current_price = get_token_price(symbol)
        print(f"\n📊 {symbol}: ${current_price:.6f}")
        
        trades = execute_grid_trades(symbol, config, state, live=live)
        
        if trades:
            for trade in trades:
                emoji = "🟢" if trade["type"] == "BUY" else "🔴"
                status = "✅" if trade.get("executed") else "📝"
                print(f"   {emoji}{status} {trade['type']} @ ${trade['price']:.6f} (Grid #{trade['level']})")
                if trade["type"] == "SELL":
                    print(f"      Profit: ${trade.get('profit', 0):.4f}")
            all_trades.extend(trades)
        else:
            print(f"   No trades triggered")
    
    # Save state
    state["filled_orders"].extend(all_trades)
    state["filled_orders"] = state["filled_orders"][-100:]  # Keep last 100
    state["trades_count"] = state.get("trades_count", 0) + len(all_trades)
    save_state(state)
    
    executed = sum(1 for t in all_trades if t.get("executed"))
    if all_trades:
        print(f"\n✅ {executed}/{len(all_trades)} trades executed")
    else:
        print(f"\n📊 No grid trades triggered")

def show_grids(symbol: str):
    """Show detailed grid levels"""
    if symbol not in DEFAULT_GRID_CONFIG:
        print(f"Unknown symbol: {symbol}")
        return
    
    config = DEFAULT_GRID_CONFIG[symbol]
    current_price = get_token_price(symbol)
    levels = calculate_grid_levels(config)
    
    print(f"\n📊 {symbol} Grid Levels")
    print(f"Current Price: ${current_price:.6f}")
    print("-" * 50)
    print(f"{'Level':<6} {'Buy':<12} {'Sell':<12} {'Status'}")
    print("-" * 50)
    
    for level in levels:
        buy = f"${level['buy_price']:.6f}"
        sell = f"${level['sell_price']:.6f}"
        
        if current_price <= level["buy_price"]:
            status = "🟢 BUY ZONE"
        elif current_price >= level["sell_price"]:
            status = "🔴 SELL ZONE"
        else:
            status = "⚪ -"
        
        print(f"{level['level']:<6} {buy:<12} {sell:<12} {status}")

def reset_grids():
    """Reset all grid states"""
    state = {
        "grids": {},
        "filled_orders": [],
        "total_profit": 0,
        "trades_count": 0,
    }
    save_state(state)
    print("✅ Grid states reset")

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
Grid Trading Bot
================

Usage:
  grid-bot.py status       - Show grid status
  grid-bot.py run          - Run grid trading (simulation)
  grid-bot.py live         - Run grid trading (REAL trades!)
  grid-bot.py grids <SYM>  - Show grid levels for symbol
  grid-bot.py reset        - Reset all grids
        """)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "status":
        show_status()
    
    elif cmd == "run":
        run_grids(live=False)
    
    elif cmd == "live":
        print("⚠️ LIVE MODE - Real trades will be executed!")
        run_grids(live=True)
    
    elif cmd == "grids" and len(sys.argv) > 2:
        show_grids(sys.argv[2].upper())
    
    elif cmd == "reset":
        reset_grids()
    
    else:
        print(f"Unknown command: {cmd}")
