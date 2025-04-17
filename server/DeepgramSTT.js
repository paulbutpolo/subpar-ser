const axios = require('axios');
const fs = require('fs-extra');

class DeepgramSTT {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.deepgram.com/v1/listen?sentiment=true';
  }

  async transcribe(audioPath) {
    try {
      const audioData = await fs.readFile(audioPath);
      const response = await axios.post(
        this.apiUrl,
        audioData,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'audio/wav'
          },
          params: {
            model: 'nova-2', // Best for general speech
            punctuate: true,
            utterances: true,
            encoding: "linear16", // Make sure to make this dynamic, we should base it on the audio file idk how to fetch it tbh, ffprobe maybe?
            sample_rate: 48000 // Make sure to make this dynamic, we should base it on the audio file idk how to fetch it tbh, ffprobe maybe?
          }
        }
      );
      return {
        transcript: response.data.results.channels[0].alternatives[0].transcript,
        sentiment: response.data.results.sentiments.average
      }

    } catch (error) {
      console.error('Deepgram STT Error:', error.response?.data || error.message);
      throw new Error('STT transcription failed');
    }
  }
}

module.exports = DeepgramSTT;