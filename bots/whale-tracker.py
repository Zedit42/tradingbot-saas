#!/usr/bin/env python3
"""
Xeonen Whale Tracker
Track large wallet movements on Solana for trading signals

Features:
- Monitor known whale wallets
- Detect large token transfers
- Track smart money movements
- Alert on significant activity
"""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import httpx

# =============================================================================
# CONFIG
# =============================================================================

HELIUS_RPC = "https://api.mainnet-beta.solana.com"  # Public RPC
BIRDEYE_API = "https://public-api.birdeye.so"  # Public endpoints

STATE_FILE = Path.home() / "clawd" / ".secrets" / "whale-tracker-state.json"

# Minimum USD value to consider "whale" activity
MIN_WHALE_USD = 50000  # $50k minimum

# Known whale/smart money wallets (Solana)
WHALE_WALLETS = {
    # Top traders from Birdeye leaderboard
    "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1": "Alameda Liquidator",
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM": "Jump Trading",
    "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH": "Wintermute",
    "2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm": "Cumberland",
    # Add more as discovered
}

# Tokens to track
TRACKED_TOKENS = {
    "So11111111111111111111111111111111111111112": "SOL",
    "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": "WIF",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
    "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": "POPCAT",
    "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5": "MEW",
    "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN": "TRUMP",
    "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump": "FARTCOIN",
}

# =============================================================================
# HELPERS
# =============================================================================

def load_state() -> Dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "last_signatures": {},
        "whale_activity": [],
        "alerts_sent": [],
    }

def save_state(state: Dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))

# =============================================================================
# SOLANA RPC
# =============================================================================

def get_signatures(address: str, limit: int = 20) -> List[Dict]:
    """Get recent transaction signatures for an address"""
    try:
        resp = httpx.post(HELIUS_RPC, json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSignaturesForAddress",
            "params": [address, {"limit": limit}]
        }, timeout=15)
        
        if resp.status_code == 200:
            result = resp.json().get("result", [])
            return result
    except Exception as e:
        print(f"Error fetching signatures: {e}")
    return []

def get_transaction(signature: str) -> Optional[Dict]:
    """Get transaction details"""
    try:
        resp = httpx.post(HELIUS_RPC, json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}]
        }, timeout=15)
        
        if resp.status_code == 200:
            return resp.json().get("result")
    except:
        pass
    return None

def get_token_price(mint: str) -> float:
    """Get token price from DexScreener"""
    try:
        resp = httpx.get(f"https://api.dexscreener.com/latest/dex/tokens/{mint}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            pairs = data.get("pairs", [])
            if pairs:
                return float(pairs[0].get("priceUsd", 0))
    except:
        pass
    return 0

def get_sol_price() -> float:
    """Get SOL price"""
    return get_token_price("So11111111111111111111111111111111111111112")

# =============================================================================
# WHALE DETECTION
# =============================================================================

def analyze_transaction(tx: Dict, wallet: str, wallet_name: str) -> Optional[Dict]:
    """Analyze a transaction for whale activity"""
    if not tx:
        return None
    
    try:
        meta = tx.get("meta", {})
        message = tx.get("transaction", {}).get("message", {})
        
        pre_balances = meta.get("preBalances", [])
        post_balances = meta.get("postBalances", [])
        
        # Check for significant SOL movement
        if pre_balances and post_balances:
            sol_change = (post_balances[0] - pre_balances[0]) / 1e9
            sol_price = get_sol_price()
            usd_value = abs(sol_change * sol_price)
            
            if usd_value >= MIN_WHALE_USD:
                direction = "IN" if sol_change > 0 else "OUT"
                return {
                    "wallet": wallet,
                    "wallet_name": wallet_name,
                    "token": "SOL",
                    "amount": abs(sol_change),
                    "usd_value": usd_value,
                    "direction": direction,
                    "signature": tx.get("transaction", {}).get("signatures", [""])[0],
                    "timestamp": datetime.now().isoformat(),
                }
        
        # Check token transfers
        token_balances = meta.get("postTokenBalances", [])
        pre_token_balances = meta.get("preTokenBalances", [])
        
        # Simple token transfer detection
        for post in token_balances:
            mint = post.get("mint", "")
            if mint in TRACKED_TOKENS:
                token_name = TRACKED_TOKENS[mint]
                amount = float(post.get("uiTokenAmount", {}).get("uiAmount", 0) or 0)
                
                # Find pre-balance
                pre_amount = 0
                for pre in pre_token_balances:
                    if pre.get("mint") == mint:
                        pre_amount = float(pre.get("uiTokenAmount", {}).get("uiAmount", 0) or 0)
                        break
                
                change = amount - pre_amount
                if abs(change) > 0:
                    price = get_token_price(mint)
                    usd_value = abs(change * price)
                    
                    if usd_value >= MIN_WHALE_USD:
                        direction = "IN" if change > 0 else "OUT"
                        return {
                            "wallet": wallet,
                            "wallet_name": wallet_name,
                            "token": token_name,
                            "amount": abs(change),
                            "usd_value": usd_value,
                            "direction": direction,
                            "signature": tx.get("transaction", {}).get("signatures", [""])[0],
                            "timestamp": datetime.now().isoformat(),
                        }
    except Exception as e:
        pass
    
    return None

def scan_whale_wallets() -> List[Dict]:
    """Scan all whale wallets for recent activity"""
    activities = []
    state = load_state()
    last_sigs = state.get("last_signatures", {})
    
    for wallet, name in WHALE_WALLETS.items():
        print(f"   Scanning {name}...", end=" ")
        
        signatures = get_signatures(wallet, limit=10)
        
        if not signatures:
            print("no txs")
            continue
        
        new_count = 0
        last_known = last_sigs.get(wallet, "")
        
        for sig_info in signatures:
            sig = sig_info.get("signature", "")
            
            # Skip if we've seen this
            if sig == last_known:
                break
            
            tx = get_transaction(sig)
            activity = analyze_transaction(tx, wallet, name)
            
            if activity:
                activities.append(activity)
                new_count += 1
        
        # Update last signature
        if signatures:
            last_sigs[wallet] = signatures[0].get("signature", "")
        
        print(f"{new_count} new activities")
        time.sleep(0.5)  # Rate limiting
    
    # Save state
    state["last_signatures"] = last_sigs
    state["whale_activity"].extend(activities)
    state["whale_activity"] = state["whale_activity"][-100:]  # Keep last 100
    save_state(state)
    
    return activities

# =============================================================================
# COMMANDS
# =============================================================================

def show_status():
    """Show whale tracker status"""
    state = load_state()
    
    print("=" * 60)
    print("🐋 WHALE TRACKER STATUS")
    print("=" * 60)
    
    print(f"\n📊 Tracking {len(WHALE_WALLETS)} whale wallets")
    print(f"🪙 Monitoring {len(TRACKED_TOKENS)} tokens")
    print(f"💰 Min whale threshold: ${MIN_WHALE_USD:,}")
    
    recent = state.get("whale_activity", [])[-10:]
    if recent:
        print(f"\n🕐 Recent Activity ({len(recent)}):")
        for act in reversed(recent):
            emoji = "🟢" if act["direction"] == "IN" else "🔴"
            print(f"   {emoji} {act['wallet_name']}: {act['direction']} {act['amount']:,.2f} {act['token']} (${act['usd_value']:,.0f})")

def run_scan():
    """Run a whale scan"""
    print("=" * 60)
    print(f"🐋 WHALE SCAN - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    print("\n🔍 Scanning whale wallets...")
    activities = scan_whale_wallets()
    
    if activities:
        print(f"\n🚨 DETECTED {len(activities)} WHALE MOVEMENTS:")
        for act in activities:
            emoji = "🟢" if act["direction"] == "IN" else "🔴"
            print(f"\n{emoji} {act['wallet_name']}")
            print(f"   {act['direction']} {act['amount']:,.2f} {act['token']}")
            print(f"   Value: ${act['usd_value']:,.0f}")
            print(f"   TX: {act['signature'][:20]}...")
    else:
        print("\n📊 No significant whale activity detected")

def monitor():
    """Monitor mode for cron - only output alerts"""
    activities = scan_whale_wallets()
    
    # Only alert on very large movements ($100k+)
    big_moves = [a for a in activities if a["usd_value"] >= 100000]
    
    if big_moves:
        print("🐋 WHALE ALERT:")
        for act in big_moves:
            emoji = "🟢" if act["direction"] == "IN" else "🔴"
            print(f"   {emoji} {act['wallet_name']}: {act['direction']} ${act['usd_value']:,.0f} {act['token']}")

def list_wallets():
    """List tracked wallets"""
    print("🐋 Tracked Whale Wallets:\n")
    for wallet, name in WHALE_WALLETS.items():
        print(f"   {name}")
        print(f"   └─ {wallet[:20]}...{wallet[-8:]}\n")

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
Whale Tracker
=============

Usage:
  whale-tracker.py status   - Show tracker status
  whale-tracker.py scan     - Scan for whale activity
  whale-tracker.py monitor  - Monitor mode (for cron)
  whale-tracker.py wallets  - List tracked wallets
        """)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "status":
        show_status()
    
    elif cmd == "scan":
        run_scan()
    
    elif cmd == "monitor":
        monitor()
    
    elif cmd == "wallets":
        list_wallets()
    
    else:
        print(f"Unknown command: {cmd}")
