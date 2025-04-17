// Not a class based server, just a simple API
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const LocalModelAnalyzer = require('./LocalModelAnalyzer');
const axios = require('axios');

const app = express();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
const analyzer = new LocalModelAnalyzer(process.env.PYTHON_API_URL || 'http://localhost:8000', process.env.DEEPGRAM_API_KEY);

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.post('/analyze', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    const transcription = await analyzer.stt.transcribe(req.file.path);
    const emotionResult = await analyzer.analyzeAudio(req.file.path);

    // Well apparently deepseek can do this :D
    // I can make a class for this but nah its just 1 functio
    // Issues. Most of the time it will parrot the result
    // Issues. If the transcript has definite emotion like Happy, Sad, Angry, Frustration, etc. The result will be based on transcript even though the probabilities of the emotion are too high
    const deepSeekResponse = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `
              Return ONLY ONE WORD from this array: [neutral, happy, sad, angry, fearful, disgust, calm, surprised].
              Choose the most contextually appropriate emotion for the phrase, sentiment, and emotion data provided.
              DO NOT ADD ANY OTHER TEXT.
            `
          },
          {
            role: "user",
            content: `
              Phrase: "${transcription.transcript}"
              Sentiment: ${JSON.stringify(transcription.sentiment)}
              Dominant Emotion: ${emotionResult.predictedEmotion}
              Probabilities: ${JSON.stringify(emotionResult.probabilities)}
            `
          }
        ],
        temperature: 0.2,
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const finalEmotion = deepSeekResponse.data.choices[0].message.content.trim().toLowerCase();

    res.json({
      transcription: transcription.transcript,
      finalEmotion: finalEmotion,
      rawEmotion: emotionResult
    });

    await fs.remove(req.file.path);
  } catch (error) {
    console.error('Analysis error:', error);
    await fs.remove(req.file.path).catch(() => {});
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/analyze-upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!req.file.originalname.toLowerCase().endsWith('.wav')) {
      await fs.remove(req.file.path);
      return res.status(400).json({ error: 'Only WAV files are accepted for direct upload' });
    }

    const transcription = await analyzer.stt.transcribe(req.file.path);
    const audioData = await fs.readFile(req.file.path); // Just a sanity check
    const result = await analyzer.analyzeDirect(audioData);

    // Well apparently deepseek can do this :D
    // I can make a class for this but nah its just 1 functio
    // Issues. Most of the time it will parrot the result
    // Issues. If the transcript has definite emotion like Happy, Sad, Angry, Frustration, etc. The result will be based on transcript even though the probabilities of the emotion are too high
    const deepSeekResponse = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `
              Return ONLY ONE WORD from this array: [neutral, happy, sad, angry, fearful, disgust, calm, surprised].
              Choose the most contextually appropriate emotion for the phrase and emotion data provided.
              DO NOT ADD ANY OTHER TEXT.
            `
          },
          {
            role: "user",
            content: `
              Phrase: "${transcription.transcript}"
              Dominant Emotion: ${result.predictedEmotion}
              Probabilities: ${JSON.stringify(result.probabilities)}
            `
          }
        ],
        temperature: 0.2,
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const finalEmotion = deepSeekResponse.data.choices[0].message.content.trim().toLowerCase();

    res.json({
      transcription: transcription.transcript,
      finalEmotion: finalEmotion,
      rawEmotion: result
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    await fs.remove(req.file.path).catch(() => {});
    res.status(500).json({ error: 'Analysis failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});