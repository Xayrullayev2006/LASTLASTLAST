// api/bot.js fayli (Backend va Vercel uchun)
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

// MongoDB ulanishi (Buni Vercel Environment Variables'ga qo'shasiz)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://<user>:<password>@cluster.mongodb.net/flowerdb";

// Database Modelini yaratamiz
const UserSchema = new mongoose.Schema({
    userId: Number,
    groupId: Number,
    firstName: String,
    pts: { type: Number, default: 15 }, // Boshlang'ich ball (5-daraja gul uchun)
    lastMessageDate: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const bot = new Telegraf(process.env.BOT_TOKEN);

// Guruhda xabar yozilganda ballarni hisoblash
bot.on('message', async (ctx) => {
    // Faqat guruhlarda ishlashi uchun
    if (ctx.chat.type === 'private') return;

    const uId = ctx.from.id;
    const gId = ctx.chat.id;
    const isMedia = ctx.message.photo || ctx.message.video || ctx.message.voice;

    try {
        // Databasedan foydalanuvchini qidiramiz yoki yangi yaratamiz
        let user = await User.findOne({ userId: uId, groupId: gId });
        
        if (!user) {
            user = new User({ userId: uId, groupId: gId, firstName: ctx.from.first_name });
        }

        // Ball qo'shish mantiqi
        const pointsToAdd = isMedia ? 3 : 1; 
        
        // Agar pts 100 dan oshib ketmasligi kerak bo'lsa, chegaralab qo'yamiz
        user.pts = Math.min(100, user.pts + pointsToAdd);
        user.lastMessageDate = new Date();
        
        await user.save(); // Baza yangilandi

    } catch (err) {
        console.error("DB Error:", err);
    }
});

// Vercel ulanish funksiyasi
module.exports = async (req, res) => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI);
    }
    
    try {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Xato');
    }
};