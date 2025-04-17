# Things Need to make it run

## python-api

**Download*** this model directly and store it inside the /python-api folder (It's mine :D)
```
https://huggingface.co/hausenlot/ravdess-emotion-recognition-fine-tuning-for-testing/tree/main
```

Just using the API of hugging face wont work, idk why I am not an AI guy ¯\\_(ツ)_/¯

**Once Done** go inside the python-api model then make and environment and install things and then run the script
```
cd python-api
python -m venv ser_env
source ser_env/bin/activate
pip install -r requirements.txt
python model_api.py
```

**Start the server**
```
npm start
```

Here is how it works under the hood.
1. Audio source
2. Send audio source path in deepgram
3. Send audio source to python-api that runs the model locally
4. Now we have 2 output for that 2 classes (transcript + sentiment and emotion + probabilities)
5. Feed it to the deepgram prompt
6. Emotion output!

Notes:
- There might be better way to get an output, the model I fined tuned in the first place is this:
```
https://huggingface.co/ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition
```
Originally that models sucks, it doesnt even recognize the emotion properly even if I used the audio samples that they claimed that they used to fine tune that model

The audio samples in question is the RAVDESS data set, I am not exactly sure how many they did use but here is the documentation that has all 7356 audio samples
```
// Documentation
https://zenodo.org/records/1188976
```
I fine tuned that model by just using 1440 samples
```
// Download Link
https://zenodo.org/records/1188976/files/Audio_Song_Actors_01-24.zip?download=1
```
The result was phenomenal, I won't pretend that I know jackshit about AI and how to train them but I will link the repository I used to train them here:
```
// Insert link
```

- Right now, this current Iteration of this program has the accuracy of 75% for most of emotions but you will mostly get 100% accuracy for Angry and Suprised due to how the 24 Voice actors delivered all their quotes (Yes I listened to all of them manually, all 192 Audio clips)
- It has issues discerning happy, calm and neutral. and the rest is will depend on how you deliver/speak (disgust and fearful) since remember the audio samples that we used to train here came from Professional voice actors, They know how to deliver lines/quotes that has emotions to them.
- About the Deepgram Sentiment, It doesnt have an actual way to discern emotions it just identifies if the words/batch/group of words are positive, neutral or negative. Which sucks but I don't know if there's an LLM can analyze this data like if We feed it an Initial emotion and its probability, It will analyze it for us. But that sounds redundant right? Why not just train the First model to perfection that detects emotion and context? But right now there is no such model publicly available. I saw EMLO AI from DeepGram but I am too poor to try it out.
