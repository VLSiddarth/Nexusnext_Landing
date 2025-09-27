import 'dotenv/config';  // Load environment variables from .env
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Read environment variables (set these in your backend/.env file)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;
const PORT = process.env.PORT || 3001;

// Initialize Supabase client with service role key (backend secret)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(cors());       // Allow cross-origin requests (frontend on :3000)
app.use(express.json()); // Parse JSON request bodies

// Function to validate email format (simple regex)
const isEmail = (email) =>
  typeof email === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// POST /api/waitlist route to add email to Supabase and send confirmation
app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    // Insert email into waitlist table, ignoring duplicates
    const { error } = await supabase
      .from('waitlist')
      .insert([{ email }], { ignoreDuplicates: true });

    if (error && !error.message.toLowerCase().includes('duplicate')) {
      throw error;
    }

    res.json({ message: 'Successfully added to waitlist.' });
  } catch (error) {
    console.error('Error in /api/waitlist:', error);
    res.status(500).json({ error: 'Failed to add to waitlist.' });
  }
});

// Optional: test route for backend is up
app.get('/', (_req, res) => {
  res.send('Nexusnext Waitlist API is running');
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Waitlist API listening on port ${PORT}`);
});
