import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import sql from './db.js';
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
