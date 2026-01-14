require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');

const PORT = process.env.PORT || 5000;

// Connect Database
connectDB();
// Connect Redis
connectRedis();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
