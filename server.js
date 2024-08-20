import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();

// Configure CORS
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  if (req.url === '/') {
    res.redirect('/?#');
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.get('/api/generate-csv', async (req, res) => {
  const prompt = req.query.prompt;
  const url = "https://api.turboline.ai/openai/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "X-TL-Key": process.env.API_KEY
  };
  const data = {
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    top_p: 1,
    n: 1,
    stream: false,
    stop: null,
    max_tokens: 1500,
    presence_penalty: 0,
    frequency_penalty: 0,
    logit_bias: null,
    user: "user-1234"
  };

  try {
    const response = await axios.post(url, data, { headers: headers });
    res.json(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Error generating CSV:', error.message);
    res.status(500).json({ error: 'Error generating CSV', details: error.message });
  }
});

app.get('/script.js', (req, res) => {
  const filePath = path.join(__dirname, 'script.js');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).send('Script not found');
    } else {
      res.set('Content-Type', 'application/javascript');
      res.send(data);
    }
  });
});
// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});