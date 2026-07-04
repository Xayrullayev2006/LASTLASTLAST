const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Database Model
const UserSchema = new mongoose.Schema({
    userId: Number,
    groupId: Number,
    firstName: String,
    pts: Number,
    lastMessageDate: Date
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

module.exports = async (req, res) => {
    // Agar ruxsatsiz kirilsa, to'xtatish (Vercel xavfsizligi)
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).send('Unauthorized');
    }

    try {
        if (mongoose.connection.readyState === 0) await mongoose.connect(MONGODB_URI);

        // Barcha guruhlarni topish (bot qaysi guruhlarda bor bo'lsa)
        const groupIds = await User.distinct('groupId');

        for (const gId of groupIds) {
            // Shu guruhdagi eng kuchli 10 kishini olamiz
            const topUsers = await User.find({ groupId: gId }).sort({ pts: -1 }).limit(10);
            
            if (topUsers.length > 0) {
                let message = "📊 <b>Guruhdagi eng faol 10 ta gul egalari:</b>\n\n";
                topUsers.forEach((u, idx) => {
                    // Gul emojisi holatini aniqlash (100+ bo'lsa toj, yoki gul)
                    let badge = u.pts >= 100 ? '👑' : u.pts <= -10 ? '🥀' : '🌹';
                    message += `${idx + 1}. ${u.firstName} ${badge} — ${u.pts} pts\n`;
                });
                
                // Bot orqali guruhga yozish
                await bot.telegram.sendMessage(gId, message, { parse_mode: 'HTML' });
            }
        }

        res.status(200).send('Cron muvaffaqiyatli ishladi!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Xato');
    }
};