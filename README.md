# PulseTrade — Live Binary Trading Analysis PWA

A responsive, installable browser dashboard for live market monitoring and rule-based 1-minute technical analysis. It does **not** place trades or connect to a Binomo account.

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
