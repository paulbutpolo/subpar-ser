// server/HuggingFaceAnalyzer.js
const { HfInference } = require('@huggingface/inference');
const fs = require('fs-extra');
const AudioPreprocessor = require('./AudioPreprocessor');

class HuggingFaceAnalyzer {
  constructor(apiKey) {
    this.hf = new HfInference(apiKey);
    this.preprocessor = new AudioPreprocessor();
    this.model = 'hausenlot/ravdess-emotion-recognition-fine-tuning-for-testing';
    this.emotionMap = {
      'neutral': 'neutral',
      'happy': 'happy',
      'sad': 'sad',
      'angry': 'angry',
      'fearful': 'fear',
      'disgust': 'disgust',
      'calm': 'neutral',
      'surprised': 'surprise',
      // Add inverse mapping for better matching
      'fear': 'fearful',
      'anger': 'angry',
      'happiness': 'happy',
      'sadness': 'sad',
      'disgusted': 'disgust'
    };
    this.ravdessIntensityBoost = 1.2; // Boost for strong intensity emotions
  }

  async analyzeAudio(audioPath) {
    try {
      if (!(await fs.pathExists(audioPath))) {
        throw new Error('Input audio file not found');
      }

      // Preprocess audio
      let processedAudio;
      try {
        processedAudio = await this.preprocessor.process(audioPath);
      } catch (processError) {
        console.error('Audio preprocessing failed, trying raw audio:', processError);
        processedAudio = await fs.readFile(audioPath);
      }
      
      // Use the processed audio for classification
      const response = await this.hf.audioClassification({
        data: processedAudio,
        model: this.model
      });
      console.log(response);
      return this.formatResponse(response);
    } catch (error) {
      console.error('Analysis error:', error);
      return this.getFallbackResponse();
    }
  }

  async analyzeDirect(audioData) {
    try {
      const response = await this.hf.audioClassification({
        data: audioData,
        model: this.model
      });
      console.log(response);
      return this.formatResponse(response);
    } catch (error) {
      console.error('Direct analysis error:', error);
      return this.getFallbackResponse();
    }
  }

  formatResponse(response) {
    const probabilities = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fear: 0,
      disgust: 0,
      surprise: 0
    };

    // Process each emotion score from the response
    response.forEach(item => {
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
        fear: 0,
        disgust: 0,
        surprise: 0
      }
    };
  }
}

module.exports = HuggingFaceAnalyzer;