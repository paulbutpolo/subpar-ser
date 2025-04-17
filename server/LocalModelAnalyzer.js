const fs = require('fs-extra');
const DeepgramSTT = require('./DeepgramSTT');
const AudioPreprocessor = require('./AudioPreprocessor');
const axios = require('axios');

class LocalModelAnalyzer {
  constructor(pythonApiUrl = 'http://localhost:8000', deepgramApiKey) {
    this.pythonApiUrl = pythonApiUrl;
    this.preprocessor = new AudioPreprocessor();
    this.stt = new DeepgramSTT(deepgramApiKey);
    this.emotionMap = {
      'neutral': 'neutral',
      'happy': 'happy',
      'sad': 'sad',
      'angry': 'angry',
      'fearful': 'fearful',
      'disgust': 'disgust',
      'calm': 'calm',
      'surprised': 'surprised',
    };
  }

  async analyzeAudio(audioPath) {
    try {
        if (!(await fs.pathExists(audioPath))) {
            throw new Error('Input audio file not found');
        }

        // Process audio through the preprocessor chain
        const processedAudioPath = await this.preprocessor.process(audioPath);
        
        // Create FormData with the processed file stream
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(processedAudioPath));
        
        // Send to Python API
        const response = await axios.post(`${this.pythonApiUrl}/predict`, formData, {
            headers: formData.getHeaders()
        });
        
        // Clean up processed file
        // await fs.unlink(processedAudioPath).catch(() => {});
        
        return this.formatResponse(response.data.predictions);
    } catch (error) {
        console.error('Analysis error:', error);
        
        // Fallback 1: Try direct analysis with original file
        try {
            const audioData = await fs.readFile(audioPath);
            return this.analyzeDirect(audioData);
        } catch (fallbackError) {
            console.error('Fallback analysis failed:', fallbackError);
            return this.getFallbackResponse();
        }
    }
  }

  async analyzeDirect(audioData) {
    console.log("Analyzing direct");
    try {
      const fs = require('fs');
      const path = require('path');
      const FormData = require('form-data');
      
      // Create a temporary file
      const tempFilePath = path.join(__dirname, 'temp_audio.wav');
      console.log("Temp file path:", tempFilePath);
      await fs.promises.writeFile(tempFilePath, audioData);
      
      // Create FormData with file stream
      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempFilePath));
      
      const response = await axios.post(`${this.pythonApiUrl}/predict`, formData, {
        headers: formData.getHeaders()
      });
      
      // Clean up
      await fs.promises.unlink(tempFilePath).catch(() => {});
      
      return this.formatResponse(response.data.predictions);
    } catch (error) {
      console.error('Direct analysis error:', error);
      return this.getFallbackResponse();
    }
  }

  formatResponse(predictions) {
    const probabilities = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgust: 0,
      calm: 0,
      surprised: 0
    };

    // Process each emotion score from the response
    predictions.forEach(item => {
      const mappedEmotion = this.emotionMap[item.label.toLowerCase()];
      if (mappedEmotion) {
        probabilities[mappedEmotion] = item.score;
      }
    });

    // Find the emotion with highest probability
    const predictedEmotion = Object.entries(probabilities)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return {
      predictedEmotion,
      probabilities
    };
  }

  getFallbackResponse() {
    return {
      predictedEmotion: 'neutral',
      probabilities: {
        neutral: 1,
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        disgust: 0,
        calm: 0,
        surprised: 0
      }
    };
  }
}

module.exports = LocalModelAnalyzer;