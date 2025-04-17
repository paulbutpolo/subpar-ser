const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');

class AudioPreprocessor {
  constructor(options = {}) {
    this.targetSampleRate = options.sampleRate || 16000;
    this.targetChannels = 1;
    this.tempDir = options.tempDir || path.join(process.cwd(), 'temp');
  }

  async process(inputPath) {
    await fs.ensureDir(this.tempDir);
    
    const outputPath = path.join(
      this.tempDir,
      `processed_${Date.now()}.wav`
    );

    try {
      // Process audio to match model requirements
      await this._processAudio(inputPath, outputPath);
      
      // Read the processed file and return buffer
      return outputPath
    } finally {
      // Clean up temporary files
      // await fs.remove(outputPath).catch(() => {});
    }
  }

  async _processAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(this.targetSampleRate)
        .audioChannels(this.targetChannels)
        .audioCodec('pcm_s16le')
        .outputOptions([
          `-ar ${this.targetSampleRate}`,
          '-filter_complex',
          [
            // 1. Gentle high-pass to remove rumble (less aggressive than before)
            'highpass=f=80',
            
            // 2. Subtle dynamic range adjustment (less aggressive compression)
            'compand=attacks=0.1:decays=0.3:points=-80/-80 -30/-15 0/-3',
            
            // 3. Single normalization pass with conservative settings
            'loudnorm=I=-23:LRA=7:TP=-2.0',
            
            // 4. Gentle low-pass to remove extreme highs (less aggressive than before)
            'lowpass=f=7000'
          ].join(','),
          
          // Ensure format is exactly what the model expects
          '-ac 1',
          '-sample_fmt s16',
          '-y'
        ])
        .on('start', (cmd) => console.log('Processing audio with:', cmd))
        .on('end', () => {
          console.log('Audio processing completed:', outputPath);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Audio processing error:', err);
          reject(new Error(`Audio processing failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  // Utility method to analyze audio and log properties
  async analyzeAudio(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        console.log('Audio properties:', {
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels,
          duration: metadata.format.duration,
          bitRate: metadata.format.bit_rate
        });
        
        resolve(metadata);
      });
    });
  }
}

module.exports = AudioPreprocessor;