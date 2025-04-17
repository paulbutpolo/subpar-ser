# server.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import librosa
import numpy as np
from transformers import pipeline
import os
import uvicorn

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load your fine-tuned model
MODEL_PATH = "./final_model"
if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model not found at {MODEL_PATH}")

classifier = pipeline(
    "audio-classification",
    model=MODEL_PATH,
    feature_extractor="ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
)

@app.post("/predict")
async def predict_emotion(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.wav', '.mp3', '.ogg', '.webm')):
            raise HTTPException(400, "Only audio files are allowed (WAV, MP3, OGG, WEBM)")
        
        # Load and preprocess audio
        audio, sr = librosa.load(file.file, sr=16000)
        
        # Predict emotions
        result = classifier(audio)

        print("Prediction result:", result)
        print("Predicted emotion:", result[0]["label"])
        print("Probabilities:", {item["label"]: float(item["score"]) for item in result})
        
        # Format response
        return {
            "success": True,
            "predictions": result,
            "predicted_emotion": result[0]["label"],  # Top prediction
            "probabilities": {item["label"]: float(item["score"]) for item in result}
        }
        
    except Exception as e:
        raise HTTPException(500, f"Error processing audio: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)