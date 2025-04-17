class AudioRecorder {
  constructor() {
    this.audioContext = null;
    this.stream = null;
    this.recorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  async start() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = 'audio/webm';
      this.recorder = new MediaRecorder(this.stream, { mimeType });
      
      this.audioChunks = [];
      
      this.recorder.addEventListener('dataavailable', event => {
        this.audioChunks.push(event.data);
      });
      
      this.recorder.start();
      this.isRecording = true;
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  stop() {
    return new Promise(resolve => {
      this.recorder.addEventListener('stop', () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.recorder.mimeType 
        });
        this.isRecording = false;
        resolve(audioBlob);
      });
      
      this.recorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
    });
  }
}