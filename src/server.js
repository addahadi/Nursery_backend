import dotenv from 'dotenv/config.js';
import {transporter} from './utils/email.js'
import app from './app.js';
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

  transporter.verify((err, success) => {
  if (err) console.error('[ERROR] SMTP connection failed:', err);
  else console.log('[DEBUG] SMTP ready to send emails');
});

  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
