from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from dotenv import load_dotenv

# ✅ Load .env
load_dotenv()

app = FastAPI()

# Allow CORS from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # production me frontend URL daalein
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Voice query model
class VoiceQuery(BaseModel):
    query: str
    language: str  # "en", "hi", "mr"

# Soil / Crop responses
soil_responses = {
    "en": {
        "soil": "Your soil is suitable for wheat and rice farming.",
        "crop": "This season pulses and mustard will be good.",
        "default": "Sorry, I did not understand. Please try again."
    },
    "hi": {
        "soil": "आपकी मिट्टी गेहूं और धान की खेती के लिए उपयुक्त है।",
        "crop": "इस मौसम में दाल और सरसों की फसल अच्छी रहेगी।",
        "default": "माफ कीजिये, मैं समझ नहीं पाई। कृपया दुबारा बोलें।"
    },
    "mr": {
        "soil": "तुमची माती गहू आणि तांदुळ लागवडीसाठी योग्य आहे.",
        "crop": "या हंगामात डाळिंब आणि मोहरी चांगली लागतील.",
        "default": "माफ करा, मला समजले नाही. कृपया पुन्हा प्रयत्न करा."
    }
}

# Weather endpoint
@app.get("/weather/{city}")
def get_weather(city: str):
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")

    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        return {
            "city": data.get("name", city),
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"]
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch weather: {str(e)}")

# Voice query handler (soil, crop, weather)
@app.post("/voice-query")
def voice_query(data: VoiceQuery):
    query = data.query.lower()
    lang = data.language

    # Soil / crop check
    if any(word in query for word in ["soil", "मिट्टी", "माती"]):
        key = "soil"
        text_response = soil_responses.get(lang, soil_responses["en"])[key]
    elif any(word in query for word in ["crop", "फसल", "पिक"]):
        key = "crop"
        text_response = soil_responses.get(lang, soil_responses["en"])[key]
    # Weather check
    elif any(word in query for word in ["weather", "मौसम", "हवामान"]):
        city = query.split()[-1]  # simple last word as city
        try:
            weather = get_weather(city)
            temp = weather["temperature"]
            desc = weather["description"]
            if lang == "hi":
                text_response = f"{city} का तापमान {temp}°C है और मौसम {desc} है।"
            elif lang == "mr":
                text_response = f"{city} चे तापमान {temp}°C आहे आणि हवामान {desc} आहे."
            else:
                text_response = f"The temperature in {city} is {temp}°C and the weather is {desc}."
        except:
            text_response = "Could not fetch weather data."
    else:
        text_response = soil_responses.get(lang, soil_responses["en"])["default"]

    return {"response": text_response}
