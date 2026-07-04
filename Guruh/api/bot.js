const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
// Vercel serverless muhitida model qayta-qayta yaratilmasligi uchun himoya
const UserSchema = new mongoose.Schema({
    userId: Number,
    groupId: Number,
    firstName: String,
    pts: { type: Number, default: 15 },
    lastMessageDate: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on('message', async (ctx) => {
    if (ctx.chat.type === 'private') return;

    const uId = ctx.from.id;
    const gId = ctx.chat.id;
    const isMedia = ctx.message.photo || ctx.message.video || ctx.message.voice;

    try {
        let user = await User.findOne({ userId: uId, groupId: gId });
        if (!user) {
            user = new User({ userId: uId, groupId: gId, firstName: ctx.from.first_name, pts: 15 });
        }
        
        const pointsToAdd = isMedia ? 3 : 1; 
        user.pts = Math.min(100, user.pts + pointsToAdd);
        user.lastMessageDate = new Date();
        
        await user.save();
    } catch (err) {
        console.error("DB Error:", err);
    }
});

module.exports = async (req, res) => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI);
    }
    
    // YARATILGAN YANGI QISM: HTML ekran bazadan ma'lumot so'raganda ishlaydi
    if (req.method === 'GET') {
        try {
            const uId = Number(req.query.userId);
            let currentUser = { name: "Mehmon", pts: 0 };
            let topUsers = [];
            
            if (uId) {
                // Foydalanuvchini oxirgi yozgan guruhidan topamiz
                const user = await User.findOne({ userId: uId }).sort({ lastMessageDate: -1 });
                if (user) {
                    currentUser = { name: user.firstName, pts: user.pts };
                    // Shu guruhdagi top 10 ta foydalanuvchini olamiz
                    const usersInGroup = await User.find({ groupId: user.groupId }).sort({ pts: -1 }).limit(10);
                    topUsers = usersInGroup.map(u => ({ name: u.firstName, pts: u.pts }));
                }
            }
            return res.status(200).json({ currentUser, topUsers });
        } catch (err) {
            return res.status(500).json({ error: "Bazaga ulanishda xatolik" });
        }
    }

    // Telegramdan kelgan webhook xabarlarni qayta ishlash
    try {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Xato');
    }
};
