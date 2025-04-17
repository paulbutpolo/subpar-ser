document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('recordButton');
  const stopBtn = document.getElementById('stopButton');
  const statusEl = document.getElementById('recordingStatus');
  const resultsEl = document.getElementById('results');
  const recorder = new AudioRecorder();

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.wav';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const uploadButton = document.createElement('button');
  uploadButton.textContent = 'Upload WAV File';
  uploadButton.addEventListener('click', () => fileInput.click());
  document.getElementById('controls').appendChild(uploadButton);

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith('.wav')) {
      alert('Please upload a WAV file');
      return;
    }

    statusEl.textContent = 'Processing upload...';
    resultsEl.style.display = 'none';

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/analyze-upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload analysis failed');
      displayResults(await response.json());
    } catch (error) {
      console.error('Upload error:', error);
      statusEl.textContent = 'Upload failed';
    }
  });

  recordBtn.addEventListener('click', async () => {
    const started = await recorder.start();
    if (started) {
      recordBtn.disabled = true;
      stopBtn.disabled = false;
      statusEl.textContent = 'Recording...';
      resultsEl.style.display = 'none';
    }
  });

  stopBtn.addEventListener('click', async () => {
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    statusEl.textContent = 'Processing...';
    
    const audioBlob = await recorder.stop();
    await analyzeAudio(audioBlob);
  });

  async function analyzeAudio(blob) {
    try {
      if (blob.type !== 'audio/wav') {
        blob = await convertToWav(blob);
      }

      const formData = new FormData();
      formData.append('audio', blob, 'recording.wav');
      
      const response = await fetch('/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }
      
      displayResults(await response.json());
    } catch (error) {
      console.error('Error:', error);
      statusEl.textContent = error.message || 'Analysis failed';
    }
  }

  async function convertToWav(blob) {
    return new Blob([await blob.arrayBuffer()], { type: 'audio/wav' });
  }

  function displayResults(result) {
    statusEl.textContent = 'Analysis complete';
    resultsEl.style.display = 'block';

    const transcriptionEl = document.createElement('p');
    transcriptionEl.innerHTML = `<strong>Transcription:</strong> ${result.transcription || 'None'}`;
    resultsEl.appendChild(transcriptionEl);

    document.getElementById('predictedEmotion').textContent = result.finalEmotion;
  
    const container = document.getElementById('emotionProbabilities');
    container.innerHTML = '';
    Object.entries(result.rawEmotion.probabilities).forEach(([emotion, prob]) => {
      const percent = (prob * 100).toFixed(1);
      const item = document.createElement('div');
      item.innerHTML = `
        <span>${emotion}</span>
        <progress value="${percent}" max="100"></progress>
        <span>${percent}%</span>
      `;
      container.appendChild(item);
    });
  }
});