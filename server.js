const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// --- DYNAMIC LOADER ---
// Scans environment for any keys starting with 'WALLET_'
const getWatchlist = () => {
    const list = {};
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('WALLET_')) {
            const walletName = key.replace('WALLET_', '');
            list[process.env[key]] = walletName;
        }
    });
    return list;
};

// --- TELEGRAM SENDER ---
const sendTelegram = async (message) => {
    if (!TG_TOKEN || !TG_CHAT_ID) {
        console.log("⚠️ Telegram credentials missing. Skipping notification.");
        return;
    }
    try {
        const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: TG_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } catch (err) {
        console.error("❌ Telegram Error:", err.response?.data || err.message);
    }
};

// --- STATUS DASHBOARD ---
app.get('/', (req, res) => {
    const watchlist = getWatchlist();
    res.send(`
        <body style="font-family:monospace; background:#0e0e0e; color:#00ff41; padding:40px;">
            <h2>🛸 ShadowSniper Monitor</h2>
            <p>Status: Monitoring Active</p>
            <hr border="0" style="border-top:1px dashed #00ff41"/>
            <h3>🎯 Targets Loaded:</h3>
            <ul>
                ${Object.entries(watchlist).map(([addr, name]) => `<li><b>${name}</b>: ${addr}</li>`).join('')}
            </ul>
        </body>
    `);
});

// --- WEBHOOK RECEIVER ---
app.post('/webhook', async (req, res) => {
    const watchlist = getWatchlist();
    const transactions = req.body;

    for (const tx of transactions) {
        const actor = tx.feePayer;
        
        if (watchlist[actor]) {
            const name = watchlist[actor];
            
            // Filter for Pump.fun Activity
            if (tx.source === 'PUMP_FUN') {
                // Pinpoint the Token ID (Mint)
                // Account index 1 is standard for Pump.fun Create/Buy instructions
                const mint = tx.instructions[0]?.accounts[1];
                
                if (mint) {
                    const msg = `
🚨 <b>TARGET ACTIVITY DETECTED</b> 🚨

<b>Target:</b> ${name}
<b>Action:</b> ${tx.type}
<b>Token:</b> <code>${mint}</code>
<b>Explorer:</b> <a href="https://solscan.io/token/${mint}">Solscan</a> | <a href="https://pump.fun/${mint}">Pump.fun</a>

<i>Signature: ${tx.signature.slice(0, 8)}...</i>
                    `;
                    
                    console.log(`✨ Notification sent for ${name} on token ${mint}`);
                    await sendTelegram(msg);
                }
            }
        }
    }
    res.sendStatus(200);
});

app.listen(PORT, () => console.log(`📡 Sniper Monitor Online on port ${PORT}`));
