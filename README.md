# PulseTrade — Live Binary Trading Analysis PWA

A responsive, installable browser dashboard for live market monitoring, multi-asset crypto scanning, and autonomous paper-trading experiments. It does **not** place trades or connect to a Binomo account.

## Run locally
Because service workers require localhost or HTTPS, run a local static server:
- Python: `python -m http.server 8000`
- Open `http://localhost:8000`

Or deploy the folder to GitHub Pages (HTTPS) to use it as a PWA on mobile and laptop.

## Live feeds
### Crypto
The app connects to Binance's public spot trade WebSocket (no API key) and aggregates incoming trades into 1-minute candles. Availability depends on network and regional access. These are exchange spot prices, not Binomo prices.

### Forex
Choose Forex, provide an API key from a provider whose account plan explicitly supports real-time Forex candle data, and save it in this browser. The current adapter polls Twelve Data's 1-minute time-series endpoint once per minute. Free-tier entitlements, delays, quotas and symbol support can change. The key is stored in localStorage on this device; it is not a secure secret vault. Use a restricted key and do not share this browser profile. For production, move provider requests behind a server-side proxy and protect credentials there.

## Signals and limitations
- The indicator engine uses EMA 9/21/50, RSI 14, MACD histogram, Bollinger Bands and a basic volatility filter.
- Signals are transparent rule-based confluence, not machine-learning predictions. The score is not a win probability.
- It forces NO TRADE while data is disconnected/stale or the indicator history is insufficient.
- It does not know Binomo payout, spread, execution price or OTC feed. Confirm the quote on Binomo; never assume external feed prices match.
- OTC is not supported without a verified, authorized OTC data source.
- Sound alerts require clicking “Sound off” once to enable browser audio.
- Risk guardrails are reminders only; they do not enforce limits at the broker.
- Binary options are high risk and can result in total loss. Test in demo mode first.

## Publish free
1. Create a GitHub repository.
2. Upload the files in this folder to the repository root.
3. In repository Settings → Pages, choose deploy from branch and select `main` / root.
4. Open the HTTPS Pages URL on your phone or laptop. Use the browser's “Add to Home Screen” / “Install app” option.


## Autonomous paper agent (v2)
- Scans BTC, ETH, BNB, SOL, XRP and DOGE spot markets from Binance public market data.
- Loads up to 100 recent 1-minute candles per pair, then follows public trade streams.
- Ranks eligible rule-based CALL/PUT setups and selects the highest-ranked available opportunity.
- Opens at most one simulated position at a time. Stake is capped at 1% of simulated balance and $100; the daily trade cap and 5% default simulated drawdown stop are configurable.
- Selects a 1/2/5-minute simulated expiry using recent Bollinger width as a simple volatility heuristic.
- Uses an illustrative 80% payout assumption for paper results; this is not a quote from Binomo and actual payout terms vary.
- Paper trades settle against Binance spot prices. These are not Binomo or OTC prices; results are not evidence of expected profitability.
- The agent starts OFF and must be manually enabled. Stopping it prevents new simulated entries; an open paper trade is still allowed to settle.
- Forex remains a selected-pair analysis feed; multi-asset Forex scanning is not enabled in this version because provider entitlements, rate limits, and real-time access differ.

## Important platform restriction
Binomo's rules prohibit use of bots, AI, or specialized software to place trades. This project therefore has no Binomo login, browser automation, order submission, or account connection. Do not add those capabilities.
