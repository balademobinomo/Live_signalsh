const $ = id => document.getElementById(id);
const state = { market:"crypto", symbol:"BTCUSDT", ws:null, candles:[], lastTrade:0, lastUpdate:0, chart:null, candleSeries:null, ema9:null, ema21:null, ema50:null, line9:null, line21:null, line50:null, sound:false, lastSignal:"NO TRADE", lastSignalAt:0, signalCount:0, history:[], fxKey:"", fxTimer:null };
const cryptoSymbols = [{v:"BTCUSDT",t:"BTC / USDT"},{v:"ETHUSDT",t:"ETH / USDT"},{v:"BNBUSDT",t:"BNB / USDT"},{v:"SOLUSDT",t:"SOL / USDT"},{v:"XRPUSDT",t:"XRP / USDT"},{v:"DOGEUSDT",t:"DOGE / USDT"}];
const forexSymbols = [{v:"EUR/USD",t:"EUR / USD"},{v:"GBP/USD",t:"GBP / USD"},{v:"USD/JPY",t:"USD / JPY"},{v:"AUD/USD",t:"AUD / USD"},{v:"USD/CAD",t:"USD / CAD"}];
const fmt = n => n==null||!Number.isFinite(n)?"—":n.toLocaleString(undefined,{maximumFractionDigits:n>100?2: n>1?4:6});
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
function status(ok,msg){$("connectionDot").className="dot "+(ok?"connected":"disconnected");$("connectionText").textContent=msg;$("feedBadge").textContent=ok?"LIVE FEED":"DISCONNECTED";$("feedBadge").className="badge "+(ok?"badge-live":"badge-muted")}
function initChart(){
 const el=$("chart"); state.chart=LightweightCharts.createChart(el,{layout:{background:{color:"#101a2a"},textColor:"#8da0b9"},grid:{vertLines:{color:"#1b2a3e"},horzLines:{color:"#1b2a3e"}},rightPriceScale:{borderColor:"#23334b"},timeScale:{borderColor:"#23334b",timeVisible:true,secondsVisible:false},crosshair:{mode:0},width:el.clientWidth,height:el.clientHeight});
 state.candleSeries=state.chart.addCandlestickSeries({upColor:"#26d69a",downColor:"#ff647c",borderUpColor:"#26d69a",borderDownColor:"#ff647c",wickUpColor:"#26d69a",wickDownColor:"#ff647c"});
 state.line9=state.chart.addLineSeries({color:"#f6c85f",lineWidth:1});state.line21=state.chart.addLineSeries({color:"#6bb8ff",lineWidth:1});state.line50=state.chart.addLineSeries({color:"#c18bff",lineWidth:1});
 new ResizeObserver(()=>state.chart.applyOptions({width:el.clientWidth,height:el.clientHeight})).observe(el);
}
function fillSymbols(){const arr=state.market==="crypto"?cryptoSymbols:forexSymbols;$("symbol").innerHTML=arr.map(x=>`<option value="${x.v}">${x.t}</option>`).join("");state.symbol=arr[0].v;$("chartTitle").textContent=arr[0].t}
function disconnect(){if(state.ws){state.ws.onclose=null;state.ws.close();state.ws=null}if(state.fxTimer){clearInterval(state.fxTimer);state.fxTimer=null}}
function connect(){
 disconnect();state.candles=[];state.lastUpdate=0;state.lastTrade=0;state.candleSeries.setData([]);state.line9.setData([]);state.line21.setData([]);state.line50.setData([]);renderEmpty();status(false,"Connecting…");
 if(state.market==="crypto") connectCrypto(); else connectForex();
}
function connectCrypto(){
 const sym=state.symbol.toLowerCase();const ws=new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@trade`);state.ws=ws;
 ws.onopen=()=>{status(true,"Crypto live");$("dataSource").textContent="Binance public spot feed";};
 ws.onmessage=e=>{const t=JSON.parse(e.data),price=+t.p,sec=Math.floor(t.T/60000)*60;state.lastTrade=price;state.lastUpdate=Date.now();let c=state.candles[state.candles.length-1];if(!c||c.time!==sec){c={time:sec,open:price,high:price,low:price,close:price};state.candles.push(c);if(state.candles.length>500)state.candles.shift()}else{c.high=Math.max(c.high,price);c.low=Math.min(c.low,price);c.close=price}updateFromCandles();};
 ws.onerror=()=>{status(false,"Feed error");forceNoTrade("Live data connection error");};
 ws.onclose=()=>{status(false,"Disconnected");forceNoTrade("Live data disconnected");};
}
async function connectForex(){
 const key=state.fxKey||localStorage.getItem("pulsetrade_fx_key")||"";
 if(!key){status(false,"Forex key required");$("dataSource").textContent="No Forex provider configured";forceNoTrade("Forex feed not configured. Add an authorized provider key.");return}
 state.fxKey=key;
 // Twelve Data time_series REST polling; actual real-time access depends on account entitlement and API plan.
 async function poll(){
  try{
   const url=`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(state.symbol)}&interval=1min&outputsize=120&apikey=${encodeURIComponent(key)}`;
   const r=await fetch(url);const d=await r.json();if(!r.ok||d.status==="error"||!d.values)throw new Error(d.message||"Provider did not return candles");
   const rows=d.values.slice().reverse().map(x=>({time:Math.floor(new Date(x.datetime.replace(" ","T")+"Z").getTime()/1000),open:+x.open,high:+x.high,low:+x.low,close:+x.close}));
   if(!rows.length)throw new Error("No Forex candles returned");
   state.candles=rows;state.lastTrade=rows[rows.length-1].close;state.lastUpdate=Date.now();$("dataSource").textContent="Twelve Data · polling (plan-dependent)";status(true,"Forex data received");updateFromCandles();
  }catch(err){status(false,"Forex feed unavailable");$("dataSource").textContent="Provider error";forceNoTrade(err.message);toast(err.message)}
 }
 await poll();state.fxTimer=setInterval(poll,60000);
}
function ema(values,period){let out=[],k=2/(period+1),v=null;values.forEach((x,i)=>{v=v===null?x:x*k+v*(1-k);out.push({i,v})});return out}
function rsi(values,p=14){if(values.length<p+1)return null;let gain=0,loss=0;for(let i=values.length-p;i<values.length;i++){let d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}if(loss===0)return 100;return 100-100/(1+gain/loss)}
function macd(values){if(values.length<35)return null;let e12=ema(values,12),e26=ema(values,26);let m=values.map((_,i)=>e12[i].v-e26[i].v);let sig=ema(m,9);return {line:m.at(-1),signal:sig.at(-1).v,hist:m.at(-1)-sig.at(-1).v}}
function boll(values,p=20){if(values.length<p)return null;let a=values.slice(-p),mean=a.reduce((x,y)=>x+y,0)/p,sd=Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/p);return {mid:mean,upper:mean+2*sd,lower:mean-2*sd,width:(4*sd)/mean}}
function updateFromCandles(){
 const cs=state.candles;if(!cs.length)return;const closes=cs.map(x=>x.close),e9=ema(closes,9),e21=ema(closes,21),e50=ema(closes,50),rv=rsi(closes),m=macd(closes),bb=boll(closes);
 state.candleSeries.setData(cs);state.line9.setData(cs.map((c,i)=>({time:c.time,value:e9[i].v})));state.line21.setData(cs.map((c,i)=>({time:c.time,value:e21[i].v})));state.line50.setData(cs.map((c,i)=>({time:c.time,value:e50[i].v})));
 const last=closes.at(-1),prev=closes.at(-2);$("lastPrice").textContent=fmt(last);$("priceChange").textContent=prev?`${last>=prev?"▲":"▼"} ${fmt(last-prev)} from prior candle`:"Building candles";$("trendValue").textContent=cs.length<50?"WARMING UP":(last>e9.at(-1).v&&e9.at(-1).v>e21.at(-1).v&&e21.at(-1).v>e50.at(-1).v?"BULLISH":last<e9.at(-1).v&&e9.at(-1).v<e21.at(-1).v&&e21.at(-1).v<e50.at(-1).v?"BEARISH":"RANGING");$("trendDetail").textContent=cs.length+" candles loaded";$("rsiValue").textContent=rv===null?"—":rv.toFixed(1);$("rsiDetail").textContent=rv===null?"Need 15 candles":rv>70?"Overbought zone":rv<30?"Oversold zone":"Neutral / mid-range";
 $("ema9").textContent=fmt(e9.at(-1).v);$("ema21").textContent=fmt(e21.at(-1).v);$("ema50").textContent=fmt(e50.at(-1).v);$("ema9State").textContent=last>e9.at(-1).v?"Price above":"Price below";$("ema21State").textContent=last>e21.at(-1).v?"Price above":"Price below";$("ema50State").textContent=last>e50.at(-1).v?"Price above":"Price below";$("macd").textContent=m?m.hist.toFixed(5):"—";$("macdState").textContent=m?(m.hist>0?"Positive momentum":"Negative momentum"):"Need 35 candles";$("bb").textContent=bb?`${fmt(bb.lower)} – ${fmt(bb.upper)}`:"—";$("bbState").textContent=bb?(last>bb.upper?"Above upper band":last<bb.lower?"Below lower band":"Inside bands"):"Need 20 candles";$("volatility").textContent=bb?(bb.width*100).toFixed(2)+"%":"—";$("volatilityState").textContent=bb?(bb.width>.025?"Elevated":"Measured"):"—";
 $("dataAge").textContent="0s";const score=calculateSignal({cs,last,e9,e21,e50,rv,m,bb});showSignal(score,last);
}
function calculateSignal(x){
 const {cs,last,e9,e21,e50,rv,m,bb}=x;let bull=0,bear=0,reasons=[];
 if(cs.length<50)return {signal:"NO TRADE",score:0,reasons:["At least 50 one-minute candles are required to warm up indicators."]};
 if(last>e9.at(-1).v){bull++;reasons.push("Price is above EMA 9")}else{bear++;reasons.push("Price is below EMA 9")}
 if(e9.at(-1).v>e21.at(-1).v){bull++;reasons.push("EMA 9 is above EMA 21")}else{bear++;reasons.push("EMA 9 is below EMA 21")}
 if(e21.at(-1).v>e50.at(-1).v){bull++;reasons.push("EMA 21 is above EMA 50")}else{bear++;reasons.push("EMA 21 is below EMA 50")}
 if(rv!==null){if(rv>50&&rv<70){bull++;reasons.push("RSI supports bullish momentum")}else if(rv<50&&rv>30){bear++;reasons.push("RSI supports bearish momentum")}else reasons.push("RSI is extreme or neutral; no momentum point")}
 if(m){if(m.hist>0){bull++;reasons.push("MACD histogram is positive")}else{bear++;reasons.push("MACD histogram is negative")}}
 if(bb){if(last>bb.upper){reasons.push("Price is above upper Bollinger Band; possible extension")}else if(last<bb.lower){reasons.push("Price is below lower Bollinger Band; possible extension")}else reasons.push("Price remains inside Bollinger Bands")}
 const threshold=+$("threshold").value,dominance=Math.max(bull,bear),gap=Math.abs(bull-bear);let signal="NO TRADE";if(dominance>=threshold&&gap>=3)signal=bull>bear?"CALL":"PUT";
 if(bb&&bb.width<.0015){signal="NO TRADE";reasons.push("Volatility is too compressed")}
 return {signal,score:dominance+"/"+5,reasons,bull,bear};
}
function showSignal(s,price){
 const now=Date.now(),age=now-state.lastUpdate,valid=age<90000&&state.lastUpdate>0&&state.candles.length>=50;
 if(!valid){forceNoTrade("Feed stale or insufficient live history");return}
 let signal=s.signal;
 const cooldown=+$("cooldown").value*60000,max=+$("maxSignals").value;
 if(signal!=="NO TRADE"&&now-state.lastSignalAt<cooldown){signal="NO TRADE";s.reasons.push("Cooldown active; waiting before another alert")}
 if(signal!=="NO TRADE"&&state.signalCount>=max){signal="NO TRADE";s.reasons.push("Session signal limit reached")}
 $("signalCard").className="signal-card "+(signal==="CALL"?"call":signal==="PUT"?"put":"neutral");$("signalText").textContent=signal;$("signalScore").textContent=signal==="NO TRADE"?"No sufficiently strong aligned setup":`Heuristic confluence · ${s.score}`;$("scoreValue").textContent=s.score;$("signalTime").textContent=new Date().toLocaleTimeString();$("signalReasons").innerHTML=s.reasons.map(r=>`<li>${escapeHtml(r)}</li>`).join("");$("dataAge").textContent=Math.round(age/1000)+"s";
 if(signal!=="NO TRADE"&&signal!==state.lastSignal){state.lastSignal=signal;state.lastSignalAt=now;state.signalCount++;addHistory(signal,s.score,price,s.reasons[0]||"Technical confluence");if(state.sound)beep()}
 if(signal==="NO TRADE")state.lastSignal="NO TRADE";
}
function forceNoTrade(reason){$("signalCard").className="signal-card neutral";$("signalText").textContent="NO TRADE";$("signalScore").textContent=reason;$("signalReasons").innerHTML=`<li>${escapeHtml(reason)}</li>`;$("scoreValue").textContent="—";$("signalTime").textContent=new Date().toLocaleTimeString()}
function addHistory(signal,score,price,reason){state.history.unshift({time:new Date().toLocaleTimeString(),market:state.symbol,signal,score,price,reason});state.history=state.history.slice(0,50);$("historyBody").innerHTML=state.history.map(h=>`<tr><td>${h.time}</td><td>${h.market}</td><td class="${h.signal==="CALL"?"tag-call":"tag-put"}">${h.signal}</td><td>${h.score}</td><td>${fmt(h.price)}</td><td>${escapeHtml(h.reason)}</td></tr>`).join("")}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderEmpty(){ $("lastPrice").textContent="—";$("priceChange").textContent="Waiting for feed";$("trendValue").textContent="—";$("trendDetail").textContent="Needs live candles";$("rsiValue").textContent="—";$("dataAge").textContent="—";$("dataSource").textContent="No data source";forceNoTrade("Waiting for valid live market data")}
function beep(){try{const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.value=.08;o.start();o.stop(ctx.currentTime+.18)}catch(e){}}
$("marketType").onchange=()=>{state.market=$("marketType").value;fillSymbols();connect()};
$("symbol").onchange=()=>{state.symbol=$("symbol").value;$("chartTitle").textContent=$("symbol").selectedOptions[0].text;connect()};
$("threshold").onchange=()=>{if(state.candles.length)updateFromCandles()};
$("reconnectBtn").onclick=connect;
$("soundToggle").onclick=()=>{state.sound=!state.sound;$("soundLabel").textContent=state.sound?"Sound on":"Sound off";$("soundToggle").style.borderColor=state.sound?"#26d69a":"#23334b";if(state.sound)beep();toast(state.sound?"Sound alerts enabled":"Sound alerts muted")};
$("saveFxKey").onclick=()=>{const key=$("fxKey").value.trim();if(!key){toast("Enter a provider API key first");return}state.fxKey=key;localStorage.setItem("pulsetrade_fx_key",key);toast("Key saved in this browser");if(state.market==="forex")connect()};
$("clearHistory").onclick=()=>{state.history=[];$("historyBody").innerHTML='<tr><td colspan="6" class="empty">No signals yet.</td></tr>';state.signalCount=0};
setInterval(()=>{$("clock").textContent=new Date().toLocaleTimeString();if(state.lastUpdate){const age=Math.round((Date.now()-state.lastUpdate)/1000);$("dataAge").textContent=age+"s";if(age>90){status(false,"Stale data");forceNoTrade("Data is older than 90 seconds. Signals disabled.")}}},1000);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
initChart();fillSymbols();connect();
