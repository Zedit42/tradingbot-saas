#!/usr/bin/env python3
"""
Xeonen Auto Trading Bot
Full auto trading system for Solana meme coins

Wallet: 3mBEB3GKULp9oeBzb93uSQquixx6FkQiZFiCPta77QRb
"""

import json
import struct
import hashlib
import hmac
import httpx
import base64
import time
import sys
import os
from datetime import datetime
from pathlib import Path
from decimal import Decimal

# Solana imports
from mnemonic import Mnemonic
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction
from solana.rpc.api import Client

# =============================================================================
# CONFIG
# =============================================================================

SECRETS_PATH = Path.home() / "clawd" / ".secrets" / "burner-wallet.txt"
STATE_PATH = Path.home() / "clawd" / ".secrets" / "trader-state.json"
RPC_URL = "https://api.mainnet-beta.solana.com"

# Token addresses
TOKENS = {
    "SOL": "So11111111111111111111111111111111111111112",
    "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "WIF": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    "PUPPY": "BYsRMRKpDf2QYuR8ugeiCh8SggwDh1QUhPmuUHDxpump",
    "POPCAT": "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    "MEW": "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    "BOME": "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
    "PEPE": "FDqp7eAYXSN7onnqLS1LiiE8tJUkWLCPBfNA5B1rHBY2",  # Solana PEPE
}

# Trading plan (from Yiğit's instructions)
TRADING_PLAN = {
    "lp_farming": 0.6,      # SOL for LP farming
    "dip_buy": 0.7,         # SOL for dip buying
    "pump_plays": 0.5,      # SOL for pump.fun plays
    "fee_reserve": 0.19,    # SOL for fees
}

# Alert thresholds - AGRESIF MOD 🔥
ALERT_THRESHOLDS = {
    "dip_percent": -5,      # Alert on 5% dip (was -10%)
    "pump_percent": 10,     # Alert on 10% pump (was 20%)
    "volume_spike": 1.5,    # 1.5x volume spike (was 2x)
}

# =============================================================================
# AUTO TRADE CONFIG - DIP BUY + MOMENTUM
# =============================================================================

AUTO_TRADE_CONFIG = {
    # Dip Buy Strategy
    "dip_buy": {
        "enabled": True,
        "threshold": -5,           # Buy when 24h change <= -5%
        "strong_threshold": -10,   # Stronger buy signal
        "position_size": 0.3,      # SOL per trade
        "max_position_size": 0.5,  # Max SOL per trade
        "take_profit": 10,         # TP at +10%
        "stop_loss": 7,            # SL at -7%
        "tokens": ["WIF", "BONK", "POPCAT", "MEW", "BOME"],
        "min_volume": 100000,      # Min $100k volume
        "min_liquidity": 500000,   # Min $500k liquidity
    },
    # Momentum Strategy
    "momentum": {
        "enabled": True,
        "threshold_1h": 5,         # 1h change >= 5%
        "threshold_24h": 10,       # 24h change >= 10%
        "volume_spike": 1.5,       # Volume 1.5x above average
        "position_size": 0.2,      # SOL per trade
        "max_position_size": 0.3,  # Max SOL per trade
        "take_profit": 15,         # TP at +15%
        "stop_loss": 5,            # SL at -5% (tight)
        "tokens": ["WIF", "BONK", "POPCAT", "MEW", "BOME", "PEPE"],
        "min_volume": 200000,      # Min $200k volume
    },
    # Risk Management
    "max_open_positions": 3,
    "max_daily_trades": 5,
    "cooldown_minutes": 30,        # Wait between trades
}

# =============================================================================
# WALLET FUNCTIONS
# =============================================================================

def load_keypair():
    """Load keypair from seed phrase using Phantom derivation"""
    phrase = SECRETS_PATH.read_text().strip()
    mnemo = Mnemonic('english')
    seed = mnemo.to_seed(phrase, '')
    
    def derive_key(seed, path):
        key = hmac.new(b"ed25519 seed", seed, hashlib.sha512).digest()
        for i in path:
            i = i | 0x80000000
            key = hmac.new(key[32:], b'\x00' + key[:32] + struct.pack('>I', i), hashlib.sha512).digest()
        return key[:32]
    
    derived = derive_key(seed, [44, 501, 0, 0])
    return Keypair.from_seed(derived)

def get_sol_balance():
    """Get SOL balance"""
    client = Client(RPC_URL)
    keypair = load_keypair()
    balance = client.get_balance(keypair.pubkey()).value
    return balance / 1e9

def get_token_balance(mint_address):
    """Get SPL token balance"""
    keypair = load_keypair()
    client = Client(RPC_URL)
    
    try:
        response = client.get_token_accounts_by_owner_json_parsed(
            keypair.pubkey(),
            {"mint": Pubkey.from_string(mint_address)}
        )
        if response.value:
            return float(response.value[0].account.data.parsed['info']['tokenAmount']['uiAmount'] or 0)
    except:
        pass
    return 0.0

# =============================================================================
# PRICE FUNCTIONS (using DexScreener)
# =============================================================================

def get_token_price(token_address):
    """Get token price from DexScreener"""
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"https://api.dexscreener.com/latest/dex/tokens/{token_address}")
            if resp.status_code == 200:
                data = resp.json()
                pairs = data.get('pairs', [])
                if pairs:
                    # Get the pair with highest liquidity
                    best_pair = max(pairs, key=lambda x: float(x.get('liquidity', {}).get('usd', 0) or 0))
                    return {
                        "price_usd": float(best_pair.get('priceUsd', 0) or 0),
                        "price_change_24h": float(best_pair.get('priceChange', {}).get('h24', 0) or 0),
                        "volume_24h": float(best_pair.get('volume', {}).get('h24', 0) or 0),
                        "liquidity_usd": float(best_pair.get('liquidity', {}).get('usd', 0) or 0),
                        "pair_address": best_pair.get('pairAddress', ''),
                        "dex": best_pair.get('dexId', ''),
                    }
    except Exception as e:
        print(f"Error getting price for {token_address}: {e}")
    return None

def get_sol_price():
    """Get SOL price in USD"""
    data = get_token_price(TOKENS["SOL"])
    if data:
        return data["price_usd"]
    return 124.0  # Fallback

# =============================================================================
# JUPITER SWAP (with fallback to Raydium)
# =============================================================================

def get_jupiter_quote(input_mint, output_mint, amount_lamports, slippage_bps=100):
    """Get quote from Jupiter API"""
    # Load API key
    env_path = Path.home() / "clawd" / ".secrets" / ".env"
    api_key = None
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("JUPITER_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
                break
    
    try:
        headers = {}
        if api_key:
            headers["x-api-key"] = api_key
        
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount_lamports),
            "slippageBps": slippage_bps,
        }
        
        with httpx.Client(timeout=15) as client:
            resp = client.get("https://api.jup.ag/swap/v1/quote", params=params, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            else:
                print(f"Jupiter quote error: {resp.status_code} - {resp.text[:200]}")
    except Exception as e:
        print(f"Jupiter quote error: {e}")
    return None

def execute_jupiter_swap(input_mint, output_mint, amount_lamports, slippage_bps=100):
    """Execute swap via Jupiter"""
    keypair = load_keypair()
    
    # Load API key
    env_path = Path.home() / "clawd" / ".secrets" / ".env"
    api_key = None
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("JUPITER_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
                break
    
    # Get quote
    quote = get_jupiter_quote(input_mint, output_mint, amount_lamports, slippage_bps)
    if not quote:
        return {"error": "Failed to get Jupiter quote", "success": False}
    
    try:
        headers = {}
        if api_key:
            headers["x-api-key"] = api_key
        
        # Get swap transaction
        swap_data = {
            "quoteResponse": quote,
            "userPublicKey": str(keypair.pubkey()),
            "wrapAndUnwrapSol": True,
        }
        
        with httpx.Client(timeout=30) as client:
            resp = client.post("https://api.jup.ag/swap/v1/swap", json=swap_data, headers=headers)
            if resp.status_code != 200:
                return {"error": f"Swap API error: {resp.status_code} - {resp.text[:200]}", "success": False}
            
            swap_response = resp.json()
        
        # Sign and send
        swap_tx_b64 = swap_response.get("swapTransaction")
        if not swap_tx_b64:
            return {"error": "No swap transaction", "success": False}
        
        tx_bytes = base64.b64decode(swap_tx_b64)
        tx = VersionedTransaction.from_bytes(tx_bytes)
        signed_tx = VersionedTransaction(tx.message, [keypair])
        
        rpc_client = Client(RPC_URL)
        result = rpc_client.send_transaction(signed_tx)
        
        return {
            "success": True,
            "signature": str(result.value),
            "input_amount": quote.get('inAmount'),
            "output_amount": quote.get('outAmount'),
        }
        
    except Exception as e:
        return {"error": str(e), "success": False}

# =============================================================================
# TRADING STRATEGIES
# =============================================================================

def load_state():
    """Load trading state"""
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {
        "trades": [],
        "positions": {},
        "last_check": None,
        "total_invested": 0,
        "alerts_sent": [],
    }

def save_state(state):
    """Save trading state"""
    STATE_PATH.write_text(json.dumps(state, indent=2, default=str))

def check_dip_opportunity(token_symbol, token_address, threshold=-10):
    """Check if token has dipped below threshold"""
    price_data = get_token_price(token_address)
    if price_data and price_data["price_change_24h"] <= threshold:
        return {
            "opportunity": True,
            "token": token_symbol,
            "change_24h": price_data["price_change_24h"],
            "price_usd": price_data["price_usd"],
            "volume_24h": price_data["volume_24h"],
        }
    return {"opportunity": False}

def buy_token(token_symbol, sol_amount):
    """Buy token with SOL"""
    if token_symbol not in TOKENS:
        return {"error": f"Unknown token: {token_symbol}", "success": False}
    
    amount_lamports = int(sol_amount * 1e9)
    result = execute_jupiter_swap(TOKENS["SOL"], TOKENS[token_symbol], amount_lamports)
    
    if result.get("success"):
        # Update state
        state = load_state()
        state["trades"].append({
            "type": "buy",
            "token": token_symbol,
            "sol_amount": sol_amount,
            "timestamp": datetime.now().isoformat(),
            "signature": result.get("signature"),
        })
        state["total_invested"] += sol_amount
        save_state(state)
    
    return result

def sell_token(token_symbol, percentage=100):
    """Sell token for SOL"""
    if token_symbol not in TOKENS:
        return {"error": f"Unknown token: {token_symbol}", "success": False}
    
    balance = get_token_balance(TOKENS[token_symbol])
    if balance <= 0:
        return {"error": f"No {token_symbol} balance", "success": False}
    
    sell_amount = balance * (percentage / 100)
    # Assuming 6 decimals for most tokens
    amount_lamports = int(sell_amount * 1e6)
    
    result = execute_jupiter_swap(TOKENS[token_symbol], TOKENS["SOL"], amount_lamports)
    
    if result.get("success"):
        state = load_state()
        state["trades"].append({
            "type": "sell",
            "token": token_symbol,
            "amount": sell_amount,
            "timestamp": datetime.now().isoformat(),
            "signature": result.get("signature"),
        })
        save_state(state)
    
    return result

# =============================================================================
# PUMP.FUN SCANNER
# =============================================================================

def scan_pumpfun_new():
    """Scan for new pump.fun launches"""
    try:
        with httpx.Client(timeout=10) as client:
            # Get recent pump.fun tokens from DexScreener
            resp = client.get("https://api.dexscreener.com/latest/dex/search?q=pump")
            if resp.status_code == 200:
                data = resp.json()
                new_tokens = []
                for pair in data.get('pairs', [])[:20]:
                    if pair.get('chainId') == 'solana' and 'pump' in pair.get('baseToken', {}).get('address', '').lower():
                        age_hours = pair.get('pairCreatedAt', 0)
                        if age_hours:
                            # Check if < 24h old
                            created = datetime.fromtimestamp(age_hours / 1000)
                            age = (datetime.now() - created).total_seconds() / 3600
                            if age < 24:
                                new_tokens.append({
                                    "symbol": pair.get('baseToken', {}).get('symbol'),
                                    "address": pair.get('baseToken', {}).get('address'),
                                    "price_usd": pair.get('priceUsd'),
                                    "volume_24h": pair.get('volume', {}).get('h24'),
                                    "liquidity": pair.get('liquidity', {}).get('usd'),
                                    "age_hours": round(age, 1),
                                })
                return new_tokens
    except Exception as e:
        print(f"Pump.fun scan error: {e}")
    return []

# =============================================================================
# MONITORING & ALERTS
# =============================================================================

def generate_portfolio_report():
    """Generate portfolio report"""
    sol_balance = get_sol_balance()
    sol_price = get_sol_price()
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "sol_balance": sol_balance,
        "sol_price_usd": sol_price,
        "sol_value_usd": sol_balance * sol_price,
        "tokens": {},
    }
    
    for symbol, address in TOKENS.items():
        if symbol != "SOL":
            balance = get_token_balance(address)
            if balance > 0:
                price_data = get_token_price(address)
                report["tokens"][symbol] = {
                    "balance": balance,
                    "price_usd": price_data["price_usd"] if price_data else 0,
                    "value_usd": balance * (price_data["price_usd"] if price_data else 0),
                    "change_24h": price_data["price_change_24h"] if price_data else 0,
                }
    
    # Calculate total
    total_usd = report["sol_value_usd"]
    for token_data in report["tokens"].values():
        total_usd += token_data.get("value_usd", 0)
    report["total_value_usd"] = total_usd
    
    # Load state for P&L
    state = load_state()
    report["total_invested_sol"] = state.get("total_invested", 0)
    report["trades_count"] = len(state.get("trades", []))
    
    return report

def run_monitor():
    """Run monitoring check"""
    print(f"\n{'='*50}")
    print(f"🔍 Monitor Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}\n")
    
    # Check portfolio
    report = generate_portfolio_report()
    print(f"💰 SOL Balance: {report['sol_balance']:.4f} SOL (${report['sol_value_usd']:.2f})")
    
    if report['tokens']:
        print("\n📊 Token Holdings:")
        for symbol, data in report['tokens'].items():
            print(f"  {symbol}: {data['balance']:.4f} (${data['value_usd']:.2f}) [{data['change_24h']:+.1f}%]")
    
    print(f"\n💵 Total Value: ${report['total_value_usd']:.2f}")
    
    # Check for dip opportunities
    print("\n🔎 Checking opportunities...")
    for symbol in ["PUPPY", "WIF", "BONK"]:
        if symbol in TOKENS:
            opp = check_dip_opportunity(symbol, TOKENS[symbol])
            if opp.get("opportunity"):
                print(f"  🎯 DIP ALERT: {symbol} at {opp['change_24h']:.1f}% (${opp['price_usd']:.8f})")
    
    # Scan pump.fun
    print("\n🚀 New Pump.fun tokens (< 24h):")
    new_tokens = scan_pumpfun_new()[:5]
    for t in new_tokens:
        print(f"  • {t['symbol']}: ${t['price_usd']} | Vol: ${t.get('volume_24h', 'N/A')} | Age: {t['age_hours']}h")
    
    return report

def get_extended_token_data(symbol: str, address: str) -> dict:
    """Get extended token data including 1h change"""
    try:
        resp = httpx.get(f"https://api.dexscreener.com/latest/dex/tokens/{address}", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("pairs"):
                pair = data["pairs"][0]
                return {
                    "symbol": symbol,
                    "price_usd": float(pair.get("priceUsd", 0)),
                    "change_1h": float(pair.get("priceChange", {}).get("h1", 0) or 0),
                    "change_24h": float(pair.get("priceChange", {}).get("h24", 0) or 0),
                    "volume_24h": float(pair.get("volume", {}).get("h24", 0) or 0),
                    "liquidity": float(pair.get("liquidity", {}).get("usd", 0) or 0),
                }
    except:
        pass
    return None

def run_auto_trade():
    """Run automatic trading with DIP BUY + MOMENTUM strategies"""
    print(f"\n{'='*60}")
    print(f"🤖 SOL AUTO TRADER - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Strategy: DIP BUY + MOMENTUM")
    print(f"{'='*60}\n")
    
    sol_balance = get_sol_balance()
    sol_price = 124.47  # Will be updated
    
    try:
        resp = httpx.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", timeout=10)
        sol_price = resp.json().get("solana", {}).get("usd", 124.47)
    except:
        pass
    
    print(f"💰 Balance: {sol_balance:.4f} SOL (${sol_balance * sol_price:.2f})")
    
    # Check minimum balance
    fee_reserve = AUTO_TRADE_CONFIG.get("fee_reserve", 0.19) if "AUTO_TRADE_CONFIG" in dir() else 0.19
    if sol_balance < 0.5:
        print("⚠️ Balance too low for trading")
        return {"traded": False, "reason": "Low balance"}
    
    state = load_state()
    config = AUTO_TRADE_CONFIG if "AUTO_TRADE_CONFIG" in dir() else {}
    dip_config = config.get("dip_buy", {})
    momentum_config = config.get("momentum", {})
    
    # Track open positions
    open_positions = state.get("positions", {})
    daily_trades = state.get("daily_trades", 0)
    max_daily = config.get("max_daily_trades", 5)
    
    if daily_trades >= max_daily:
        print(f"⚠️ Daily trade limit reached ({daily_trades}/{max_daily})")
        return {"traded": False, "reason": "Daily limit"}
    
    print(f"📊 Open positions: {len(open_positions)}/{config.get('max_open_positions', 3)}")
    print(f"📈 Daily trades: {daily_trades}/{max_daily}")
    
    # Collect all signals
    signals = []
    
    print(f"\n🔍 Scanning tokens...")
    print("-" * 50)
    
    # Scan tokens for both strategies
    all_tokens = list(set(dip_config.get("tokens", []) + momentum_config.get("tokens", [])))
    
    for symbol in all_tokens:
        if symbol not in TOKENS:
            continue
            
        data = get_extended_token_data(symbol, TOKENS[symbol])
        if not data:
            continue
        
        print(f"\n{symbol}:")
        print(f"   Price: ${data['price_usd']:.8f}")
        print(f"   1h: {data['change_1h']:+.1f}% | 24h: {data['change_24h']:+.1f}%")
        print(f"   Volume: ${data['volume_24h']:,.0f} | Liq: ${data['liquidity']:,.0f}")
        
        # === DIP BUY CHECK ===
        if dip_config.get("enabled", True):
            dip_threshold = dip_config.get("threshold", -5)
            strong_dip = dip_config.get("strong_threshold", -10)
            min_vol = dip_config.get("min_volume", 100000)
            min_liq = dip_config.get("min_liquidity", 500000)
            
            if (data["change_24h"] <= dip_threshold and 
                data["volume_24h"] >= min_vol and 
                data["liquidity"] >= min_liq):
                
                strength = 2 if data["change_24h"] <= strong_dip else 1
                size = dip_config.get("max_position_size", 0.5) if strength == 2 else dip_config.get("position_size", 0.3)
                
                signals.append({
                    "strategy": "DIP_BUY",
                    "symbol": symbol,
                    "strength": strength,
                    "size": size,
                    "reason": f"24h dip {data['change_24h']:.1f}%",
                    "data": data,
                })
                print(f"   🟢 DIP BUY SIGNAL (strength={strength})")
        
        # === MOMENTUM CHECK ===
        if momentum_config.get("enabled", True):
            thresh_1h = momentum_config.get("threshold_1h", 5)
            thresh_24h = momentum_config.get("threshold_24h", 10)
            min_vol = momentum_config.get("min_volume", 200000)
            
            if (data["change_1h"] >= thresh_1h and 
                data["change_24h"] >= thresh_24h and
                data["volume_24h"] >= min_vol):
                
                size = momentum_config.get("position_size", 0.2)
                
                signals.append({
                    "strategy": "MOMENTUM",
                    "symbol": symbol,
                    "strength": 1,
                    "size": size,
                    "reason": f"1h +{data['change_1h']:.1f}%, 24h +{data['change_24h']:.1f}%",
                    "data": data,
                })
                print(f"   🟡 MOMENTUM SIGNAL")
    
    # Process signals
    print(f"\n{'='*50}")
    print(f"📡 Signals found: {len(signals)}")
    
    if not signals:
        print("⏳ No trading signals, waiting...")
        return {"traded": False, "reason": "No signals"}
    
    # Sort by strength (DIP_BUY with strength 2 first)
    signals.sort(key=lambda x: (x["strength"], x["strategy"] == "DIP_BUY"), reverse=True)
    
    # Execute best signal
    for signal in signals[:1]:
        symbol = signal["symbol"]
        
        # Check if already have position
        if symbol in open_positions:
            print(f"⚠️ Already have {symbol} position, skipping")
            continue
        
        # Check balance
        if sol_balance - fee_reserve < signal["size"]:
            print(f"⚠️ Insufficient balance for {signal['size']} SOL trade")
            continue
        
        print(f"\n{'='*50}")
        print(f"🎯 EXECUTING TRADE")
        print(f"{'='*50}")
        print(f"   Strategy: {signal['strategy']}")
        print(f"   Token: {symbol}")
        print(f"   Size: {signal['size']} SOL (${signal['size'] * sol_price:.2f})")
        print(f"   Reason: {signal['reason']}")
        
        # Execute buy
        result = buy_token(symbol, signal["size"])
        
        if result.get("success"):
            print(f"\n✅ TRADE EXECUTED!")
            print(f"   Signature: {result.get('signature', 'N/A')[:20]}...")
            
            # Update state
            state["positions"][symbol] = {
                "strategy": signal["strategy"],
                "entry_price": signal["data"]["price_usd"],
                "size_sol": signal["size"],
                "timestamp": datetime.now().isoformat(),
                "tp_percent": dip_config.get("take_profit", 10) if signal["strategy"] == "DIP_BUY" else momentum_config.get("take_profit", 15),
                "sl_percent": dip_config.get("stop_loss", 7) if signal["strategy"] == "DIP_BUY" else momentum_config.get("stop_loss", 5),
            }
            state["daily_trades"] = daily_trades + 1
            save_state(state)
            
            return {
                "traded": True,
                "strategy": signal["strategy"],
                "symbol": symbol,
                "size": signal["size"],
                "reason": signal["reason"],
            }
        else:
            print(f"\n❌ Trade failed: {result.get('error', 'Unknown')}")
            return {"traded": False, "reason": result.get("error")}
    
    return {"traded": False, "reason": "No executable signals"}

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
Xeonen Auto Trader
==================

Usage:
  auto-trader.py monitor     - Check portfolio & opportunities
  auto-trader.py trade       - Run auto trading
  auto-trader.py report      - Generate full report
  auto-trader.py buy <TOKEN> <SOL_AMOUNT>
  auto-trader.py sell <TOKEN> [PERCENT]
  auto-trader.py balance
  auto-trader.py pumpfun     - Scan new pump.fun tokens
        """)
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "monitor":
        run_monitor()
    
    elif cmd == "trade":
        run_auto_trade()
    
    elif cmd == "report":
        report = generate_portfolio_report()
        print(json.dumps(report, indent=2))
    
    elif cmd == "balance":
        print(f"SOL: {get_sol_balance():.4f}")
        for symbol, address in TOKENS.items():
            if symbol != "SOL":
                bal = get_token_balance(address)
                if bal > 0:
                    print(f"{symbol}: {bal:.4f}")
    
    elif cmd == "buy" and len(sys.argv) >= 4:
        token = sys.argv[2].upper()
        amount = float(sys.argv[3])
        print(f"Buying {token} with {amount} SOL...")
        result = buy_token(token, amount)
        print(json.dumps(result, indent=2))
    
    elif cmd == "sell" and len(sys.argv) >= 3:
        token = sys.argv[2].upper()
        percent = float(sys.argv[3]) if len(sys.argv) > 3 else 100
        print(f"Selling {percent}% of {token}...")
        result = sell_token(token, percent)
        print(json.dumps(result, indent=2))
    
    elif cmd == "pumpfun":
        tokens = scan_pumpfun_new()
        for t in tokens[:10]:
            print(f"{t['symbol']}: {t['address'][:20]}... | ${t['price_usd']} | {t['age_hours']}h old")
    
    else:
        print(f"Unknown command: {cmd}")
