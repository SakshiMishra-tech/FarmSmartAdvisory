from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import os
import re
from datetime import datetime

app = FastAPI(title="FarmSmart Voice Assistant", version="1.0.0")

# Allow CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VoiceQuery(BaseModel):
    query: str
    language: str = "auto"  # "auto" for automatic detection, or specific language code

# Conversation storage
CONVERSATION_FILE = "conversations.json"

def load_conversations():
    """Load conversations from file"""
    if os.path.exists(CONVERSATION_FILE):
        try:
            with open(CONVERSATION_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading conversations: {e}")
    return []

def save_conversation(question: str, answer: str, language: str):
    """Save conversation to file"""
    try:
        conversations = load_conversations()
        conversation = {
            "id": str(datetime.now().timestamp()),
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "answer": answer,
            "language": language
        }
        conversations.append(conversation)
        
        # Keep only last 100 conversations to prevent file from growing too large
        if len(conversations) > 100:
            conversations = conversations[-100:]
        
        with open(CONVERSATION_FILE, 'w', encoding='utf-8') as f:
            json.dump(conversations, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving conversation: {e}")

def detect_language(text: str) -> str:
    """Detect language based on script and common words"""
    text = text.strip()
    
    # Language detection patterns
    language_patterns = {
        "hi": [r"[\u0900-\u097F]", r"कौन|क्या|कैसे|कब|कहाँ|मिट्टी|फसल|खेती|बारिश|पानी|खाद|कीट|कटाई"],  # Devanagari script + Hindi words
        "mr": [r"[\u0900-\u097F]", r"कोण|काय|कसे|कधी|कुठे|माती|पीक|शेती|पाऊस|पाणी|खत|कीट|कापणी"],  # Devanagari script + Marathi words
        "ta": [r"[\u0B80-\u0BFF]", r"என்ன|எப்படி|எப்போது|எங்கே|மண்|பயிர்|விவசாயம்|மழை|நீர்|உரம்|பூச்சி|அறுவடை"],  # Tamil script + Tamil words
        "te": [r"[\u0C00-\u0C7F]", r"ఏమి|ఎలా|ఎప్పుడు|ఎక్కడ|నేల|పంట|వ్యవసాయం|వర్షం|నీరు|ఎరువు|కీటకం|పంట"],  # Telugu script + Telugu words
        "bn": [r"[\u0980-\u09FF]", r"কী|কিভাবে|কখন|কোথায়|মাটি|ফসল|কৃষি|বৃষ্টি|পানি|সার|পোকা|ফসল"],  # Bengali script + Bengali words
        "gu": [r"[\u0A80-\u0AFF]", r"શું|કેવી રીતે|ક્યારે|ક્યાં|માટી|પાક|ખેતી|વરસાદ|પાણી|ખાતર|કીટક|ફસલ"],  # Gujarati script + Gujarati words
        "pa": [r"[\u0A00-\u0A7F]", r"ਕੀ|ਕਿਵੇਂ|ਕਦੋਂ|ਕਿੱਥੇ|ਮਿੱਟੀ|ਫਸਲ|ਖੇਤੀਬਾੜੀ|ਬਾਰਸ਼|ਪਾਣੀ|ਖਾਦ|ਕੀੜਾ|ਫਸਲ"],  # Gurmukhi script + Punjabi words
        "or": [r"[\u0B00-\u0B7F]", r"କଣ|କିପରି|କେବେ|କେଉଁଠି|ମାଟି|ଫସଲ|କୃଷି|ବର୍ଷା|ପାଣି|ସାର|କୀଟ|ଫସଲ"],  # Odia script + Odia words
        "as": [r"[\u0980-\u09FF]", r"কি|কেনেকৈ|কেতিয়া|ক'ত|মাটি|শস্য|কৃষি|বৰষুণ|পানী|সাৰ|কীট|শস্য"],  # Assamese script + Assamese words
        "ml": [r"[\u0D00-\u0D7F]", r"എന്ത്|എങ്ങനെ|എപ്പോൾ|എവിടെ|മണ്ണ്|വിള|കാർഷികം|മഴ|വെള്ളം|വളം|കീടം|വിള"],  # Malayalam script + Malayalam words
        "kn": [r"[\u0C80-\u0CFF]", r"ಏನು|ಹೇಗೆ|ಎಂದು|ಎಲ್ಲಿ|ಮಣ್ಣು|ಬೆಳೆ|ಕೃಷಿ|ಮಳೆ|ನೀರು|ಗೊಬ್ಬರ|ಕೀಟ|ಬೆಳೆ"],  # Kannada script + Kannada words
    }
    
    # Check for English (default)
    if re.match(r'^[a-zA-Z\s\?\!\.\,]+$', text):
        return "en"
    
    # Check each language pattern - prioritize word-based detection over script detection
    for lang_code, patterns in language_patterns.items():
        # First check for specific words (more reliable)
        if len(patterns) > 1:
            word_pattern = patterns[1]  # Word pattern is second
            if re.search(word_pattern, text, re.IGNORECASE):
                return lang_code
        
        # Then check for script patterns
        script_pattern = patterns[0]  # Script pattern is first
        if re.search(script_pattern, text, re.IGNORECASE):
            return lang_code
    
    # Default to English if no pattern matches
    return "en"

@app.post("/voice-query")
def voice_query(data: VoiceQuery):
    user_query = data.query.lower()
    
    # Auto-detect language if not specified or set to "auto"
    if data.language == "auto" or not data.language:
        lang = detect_language(data.query)
    else:
        lang = data.language

    responses = {
        "en": {
            "soil": "Your soil is suitable for wheat and rice farming. For better results, maintain pH between 6.0-7.5 and ensure proper drainage.",
            "crop": "This season pulses and mustard will be good. Consider planting wheat, rice, or maize based on your soil conditions.",
            "weather": "Current weather conditions are favorable for farming. Monitor rainfall and temperature for optimal crop growth.",
            "fertilizer": "Use balanced NPK fertilizers. Apply nitrogen for leafy growth, phosphorus for root development, and potassium for fruit quality.",
            "pest": "Regular field inspection is recommended. Use organic pesticides and integrated pest management techniques.",
            "irrigation": "Water your crops regularly but avoid overwatering. Drip irrigation is most efficient for water conservation.",
            "harvest": "Harvest timing is crucial. Most crops are ready when they reach maturity and show proper color changes.",
            "default": "I can help you with soil advice, crop recommendations, weather information, fertilizer guidance, pest control, irrigation tips, and harvest timing. What would you like to know?"
        },
        "hi": {
            "soil": "आपकी मिट्टी गेहूं और धान की खेती के लिए उपयुक्त है। बेहतर परिणाम के लिए pH 6.0-7.5 के बीच रखें और उचित जल निकासी सुनिश्चित करें।",
            "crop": "इस मौसम में दाल और सरसों की फसल अच्छी रहेगी। अपनी मिट्टी की स्थिति के आधार पर गेहूं, चावल या मक्का लगाने पर विचार करें।",
            "weather": "वर्तमान मौसम की स्थिति खेती के लिए अनुकूल है। इष्टतम फसल वृद्धि के लिए वर्षा और तापमान की निगरानी करें।",
            "fertilizer": "संतुलित NPK उर्वरकों का उपयोग करें। पत्तेदार वृद्धि के लिए नाइट्रोजन, जड़ विकास के लिए फॉस्फोरस और फल की गुणवत्ता के लिए पोटेशियम डालें।",
            "pest": "नियमित खेत निरीक्षण की सिफारिश की जाती है। जैविक कीटनाशक और एकीकृत कीट प्रबंधन तकनीकों का उपयोग करें।",
            "irrigation": "अपनी फसलों को नियमित रूप से पानी दें लेकिन अधिक पानी देने से बचें। जल संरक्षण के लिए ड्रिप सिंचाई सबसे कुशल है।",
            "harvest": "फसल कटाई का समय महत्वपूर्ण है। अधिकांश फसलें तब तैयार होती हैं जब वे परिपक्वता तक पहुंचती हैं और उचित रंग परिवर्तन दिखाती हैं।",
            "default": "मैं आपकी मिट्टी की सलाह, फसल सिफारिशें, मौसम की जानकारी, उर्वरक मार्गदर्शन, कीट नियंत्रण, सिंचाई सुझाव और कटाई के समय में मदद कर सकता हूं। आप क्या जानना चाहते हैं?"
        },
        "mr": {
            "soil": "तुमची माती गहू आणि तांदुळ लागवडीसाठी योग्य आहे. चांगल्या परिणामासाठी pH 6.0-7.5 दरम्यान ठेवा आणि योग्य जलनिकासी सुनिश्चित करा.",
            "crop": "या हंगामात डाळिंब आणि मोहरी चांगली लागतील. तुमच्या मातीच्या स्थितीनुसार गहू, तांदूळ किंवा मका लावण्याचा विचार करा.",
            "weather": "सध्याची हवामानाची परिस्थिती शेतीसाठी अनुकूल आहे. इष्टतम पीक वाढीसाठी पाऊस आणि तापमानाचे निरीक्षण करा.",
            "fertilizer": "संतुलित NPK खतांचा वापर करा. पानेदार वाढीसाठी नायट्रोजन, मुळांच्या विकासासाठी फॉस्फरस आणि फळांच्या गुणवत्तेसाठी पोटॅशियम वापरा.",
            "pest": "नियमित शेत निरीक्षणाची शिफारस केली जाते. जैविक कीटकनाशक आणि एकात्मिक कीट व्यवस्थापन तंत्रांचा वापर करा.",
            "irrigation": "तुमच्या पिकांना नियमितपणे पाणी द्या पण जास्त पाणी देऊ नका. पाणी संरक्षणासाठी ड्रिप सिंचन सर्वात कार्यक्षम आहे.",
            "harvest": "पीक कापणीची वेळ महत्वाची आहे. बहुतेक पिके जेव्हा ती परिपक्वतेला पोहोचतात आणि योग्य रंग बदल दाखवतात तेव्हा तयार असतात.",
            "default": "मी तुम्हाला मातीच्या सल्ल्यात, पीक शिफारशीत, हवामान माहितीत, खत मार्गदर्शनात, कीट नियंत्रणात, सिंचन सुझावात आणि कापणीच्या वेळेत मदत करू शकतो. तुम्हाला काय जाणून घ्यायचे आहे?"
        },
        "ta": {
            "soil": "உங்கள் மண் கோதுமை மற்றும் நெல் விவசாயத்திற்கு ஏற்றது. சிறந்த முடிவுகளுக்கு pH 6.0-7.5 க்கு இடையில் வைத்து, சரியான வடிகால் உறுதி செய்யுங்கள்.",
            "crop": "இந்த பருவத்தில் பருப்பு மற்றும் கடுகு நன்றாக இருக்கும். உங்கள் மண்ணின் நிலைக்கு ஏற்ப கோதுமை, நெல் அல்லது சோளம் நடுவதைக் கவனியுங்கள்.",
            "weather": "தற்போதைய வானிலை நிலைமைகள் விவசாயத்திற்கு சாதகமானவை. உகந்த பயிர் வளர்ச்சிக்கு மழை மற்றும் வெப்பநிலையை கண்காணிக்கவும்.",
            "fertilizer": "சமச்சீர் NPK உரங்களைப் பயன்படுத்துங்கள். இலை வளர்ச்சிக்கு நைட்ரஜன், வேர் வளர்ச்சிக்கு பாஸ்பரஸ் மற்றும் பழத்தின் தரத்திற்கு பொட்டாசியம் பயன்படுத்துங்கள்.",
            "pest": "வழக்கமான வயல் பரிசோதனை பரிந்துரைக்கப்படுகிறது. கரிம பூச்சிக்கொல்லிகள் மற்றும் ஒருங்கிணைந்த பூச்சி மேலாண்மை நுட்பங்களைப் பயன்படுத்துங்கள்.",
            "irrigation": "உங்கள் பயிர்களுக்கு வழக்கமாக தண்ணீர் கொடுங்கள் ஆனால் அதிக தண்ணீர் கொடுக்க வேண்டாம். நீர் பாதுகாப்புக்கு சொட்டு நீர்ப்பாசனம் மிகவும் திறமையானது.",
            "harvest": "பயிர் அறுவடை நேரம் முக்கியமானது. பெரும்பாலான பயிர்கள் முதிர்ச்சியை அடையும்போது மற்றும் சரியான நிற மாற்றங்களைக் காட்டும்போது தயாராக இருக்கும்.",
            "default": "மண் ஆலோசனை, பயிர் பரிந்துரைகள், வானிலை தகவல், உர வழிகாட்டுதல், பூச்சி கட்டுப்பாடு, நீர்ப்பாசன உதவிக்குறிப்புகள் மற்றும் அறுவடை நேரத்தில் உங்களுக்கு உதவ முடியும். நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?"
        },
        "te": {
            "soil": "మీ నేల గోధుమలు మరియు వరి వ్యవసాయానికి అనుకూలంగా ఉంది. మంచి ఫలితాల కోసం pH 6.0-7.5 మధ్య ఉంచండి మరియు సరైన జలనిక్షేపణను నిర్ధారించండి.",
            "crop": "ఈ సీజన్లో పప్పులు మరియు ఆవాలు మంచివి. మీ నేల పరిస్థితుల ఆధారంగా గోధుమలు, వరి లేదా మొక్కజొన్నలు నాటడాన్ని పరిగణించండి.",
            "weather": "ప్రస్తుత వాతావరణ పరిస్థితులు వ్యవసాయానికి అనుకూలంగా ఉన్నాయి. సరైన పంట పెరుగుదల కోసం వర్షపాతం మరియు ఉష్ణోగ్రతను పర్యవేక్షించండి.",
            "fertilizer": "సమతుల్య NPK ఎరువులను ఉపయోగించండి. ఆకు పెరుగుదల కోసం నత్రజని, వేరు అభివృద్ధి కోసం భాస్వరం మరియు పండు నాణ్యత కోసం పొటాషియం వాడండి.",
            "pest": "వ్యవస్థీకృత క్షేత్ర పరిశీలన సిఫార్సు చేయబడింది. సేంద్రీయ కీటకనాశకాలు మరియు సమగ్ర కీటక నిర్వహణ పద్ధతులను ఉపయోగించండి.",
            "irrigation": "మీ పంటలకు క్రమం తప్పకుండా నీరు ఇవ్వండి కానీ అధిక నీరు ఇవ్వకండి. నీటి పరిరక్షణ కోసం చుక్క సాగు చాలా సమర్థవంతమైనది.",
            "harvest": "పంట కోత సమయం కీలకమైనది. చాలా పంటలు పరిపక్వతను చేరుకున్నప్పుడు మరియు సరైన రంగు మార్పులను చూపించినప్పుడు సిద్ధంగా ఉంటాయి.",
            "default": "నేను మీకు నేల సలహాలు, పంట సిఫార్సులు, వాతావరణ సమాచారం, ఎరువు మార్గదర్శకత్వం, కీటక నియంత్రణ, సాగు చిట్కాలు మరియు కోత సమయంలో సహాయం చేయగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?"
        },
        "bn": {
            "soil": "আপনার মাটি গম ও ধান চাষের জন্য উপযুক্ত। ভাল ফলাফলের জন্য pH 6.0-7.5 এর মধ্যে রাখুন এবং সঠিক নিকাশী নিশ্চিত করুন।",
            "crop": "এই মৌসুমে ডাল ও সরিষা ভাল হবে। আপনার মাটির অবস্থার উপর ভিত্তি করে গম, চাল বা ভুট্টা রোপণ বিবেচনা করুন।",
            "weather": "বর্তমান আবহাওয়ার অবস্থা চাষের জন্য অনুকূল। সর্বোত্তম ফসল বৃদ্ধির জন্য বৃষ্টিপাত ও তাপমাত্রা পর্যবেক্ষণ করুন।",
            "fertilizer": "সুষম NPK সার ব্যবহার করুন। পাতার বৃদ্ধির জন্য নাইট্রোজেন, শিকড়ের বিকাশের জন্য ফসফরাস এবং ফলের গুণমানের জন্য পটাশিয়াম ব্যবহার করুন।",
            "pest": "নিয়মিত ক্ষেত পরিদর্শন সুপারিশ করা হয়। জৈব কীটনাশক এবং সমন্বিত কীট ব্যবস্থাপনা কৌশল ব্যবহার করুন।",
            "irrigation": "আপনার ফসলে নিয়মিত পানি দিন কিন্তু অতিরিক্ত পানি দেবেন না। জল সংরক্ষণের জন্য ড্রিপ সেচ সবচেয়ে কার্যকর।",
            "harvest": "ফসল কাটার সময় গুরুত্বপূর্ণ। বেশিরভাগ ফসল পরিপক্কতায় পৌঁছালে এবং সঠিক রঙের পরিবর্তন দেখালে প্রস্তুত হয়।",
            "default": "আমি আপনাকে মাটির পরামর্শ, ফসলের সুপারিশ, আবহাওয়ার তথ্য, সারের নির্দেশনা, কীট নিয়ন্ত্রণ, সেচের টিপস এবং ফসল কাটার সময়ে সাহায্য করতে পারি। আপনি কী জানতে চান?"
        },
        "gu": {
            "soil": "તમારી માટી ઘઉં અને ચોખા ખેતી માટે યોગ્ય છે. સારા પરિણામો માટે pH 6.0-7.5 વચ્ચે રાખો અને યોગ્ય જલનિકાસીની ખાતરી કરો.",
            "crop": "આ સીઝનમાં દાળ અને સરસવ ચોખા સારા રહેશે. તમારી માટીની સ્થિતિના આધારે ઘઉં, ચોખા અથવા મકાઈ વાવવાનો વિચાર કરો.",
            "weather": "વર્તમાન હવામાનની પરિસ્થિતિ ખેતી માટે અનુકૂળ છે. શ્રેષ્ઠ પાક વૃદ્ધિ માટે વરસાદ અને તાપમાનનું નિરીક્ષણ કરો.",
            "fertilizer": "સંતુલિત NPK ખાતરનો ઉપયોગ કરો. પાંદડાવાળી વૃદ્ધિ માટે નાઇટ્રોજન, મૂળ વિકાસ માટે ફોસ્ફરસ અને ફળની ગુણવત્તા માટે પોટેશિયમ વાપરો.",
            "pest": "નિયમિત ખેતર નિરીક્ષણની ભલામણ કરવામાં આવે છે. જૈવિક કીટનાશકો અને સંકલિત કીટ વ્યવસ્થાપન તકનીકોનો ઉપયોગ કરો.",
            "irrigation": "તમારા પાકોને નિયમિત રીતે પાણી આપો પરંતુ વધુ પાણી આપશો નહીં. પાણી સંરક્ષણ માટે ડ્રિપ સિંચાઈ સૌથી કાર્યક્ષમ છે.",
            "harvest": "પાક કાપવાનો સમય મહત્વપૂર્ણ છે. મોટાભાગના પાકો જ્યારે પરિપક્વતા સુધી પહોંચે છે અને યોગ્ય રંગ પરિવર્તન દર્શાવે છે ત્યારે તૈયાર હોય છે.",
            "default": "હું તમને માટીના સલાહ, પાકની ભલામણો, હવામાનની માહિતી, ખાતરની માર્ગદર્શિકા, કીટ નિયંત્રણ, સિંચાઈના ટિપ્સ અને કાપણીના સમયમાં મદદ કરી શકું છું. તમે શું જાણવા માંગો છો?"
        },
        "pa": {
            "soil": "ਤੁਹਾਡੀ ਮਿੱਟੀ ਕਣਕ ਅਤੇ ਚੌਲਾਂ ਦੀ ਖੇਤੀ ਲਈ ਢੁਕਵੀਂ ਹੈ। ਵਧੀਆ ਨਤੀਜਿਆਂ ਲਈ pH 6.0-7.5 ਦੇ ਵਿਚਕਾਰ ਰੱਖੋ ਅਤੇ ਢੁਕਵੇਂ ਜਲ ਨਿਕਾਸੀ ਨੂੰ ਯਕੀਨੀ ਬਣਾਓ।",
            "crop": "ਇਸ ਸੀਜ਼ਨ ਵਿੱਚ ਦਾਲਾਂ ਅਤੇ ਸਰ੍ਹੋਂਵਾਂ ਚੰਗੀਆਂ ਰਹਿਣਗੀਆਂ। ਆਪਣੀ ਮਿੱਟੀ ਦੀ ਹਾਲਤ ਦੇ ਆਧਾਰ 'ਤੇ ਕਣਕ, ਚੌਲ ਜਾਂ ਮੱਕੀ ਬੀਜਣ ਦਾ ਵਿਚਾਰ ਕਰੋ।",
            "weather": "ਮੌਜੂਦਾ ਮੌਸਮ ਦੀਆਂ ਹਾਲਤਾਂ ਖੇਤੀ ਲਈ ਅਨੁਕੂਲ ਹਨ। ਸਭ ਤੋਂ ਵਧੀਆ ਫਸਲ ਦੇ ਵਾਧੇ ਲਈ ਬਾਰਸ਼ ਅਤੇ ਤਾਪਮਾਨ ਦੀ ਨਿਗਰਾਨੀ ਕਰੋ।",
            "fertilizer": "ਸੰਤੁਲਿਤ NPK ਖਾਦਾਂ ਦਾ ਇਸਤੇਮਾਲ ਕਰੋ। ਪੱਤਿਆਂ ਦੇ ਵਾਧੇ ਲਈ ਨਾਈਟ੍ਰੋਜਨ, ਜੜ੍ਹਾਂ ਦੇ ਵਿਕਾਸ ਲਈ ਫਾਸਫੋਰਸ ਅਤੇ ਫਲ ਦੀ ਗੁਣਵੱਤਾ ਲਈ ਪੋਟਾਸ਼ੀਅਮ ਵਰਤੋ।",
            "pest": "ਨਿਯਮਿਤ ਖੇਤ ਦੇਖਭਾਲ ਦੀ ਸਿਫਾਰਸ਼ ਕੀਤੀ ਜਾਂਦੀ ਹੈ। ਜੈਵਿਕ ਕੀਟਨਾਸ਼ਕਾਂ ਅਤੇ ਸੰਯੁਕਤ ਕੀਟ ਪ੍ਰਬੰਧਨ ਤਕਨੀਕਾਂ ਦਾ ਇਸਤੇਮਾਲ ਕਰੋ।",
            "irrigation": "ਆਪਣੀਆਂ ਫਸਲਾਂ ਨੂੰ ਨਿਯਮਿਤ ਤੌਰ 'ਤੇ ਪਾਣੀ ਦਿਓ ਪਰ ਜ਼ਿਆਦਾ ਪਾਣੀ ਨਾ ਦਿਓ। ਪਾਣੀ ਦੀ ਬਚਤ ਲਈ ਡ੍ਰਿਪ ਸਿੰਚਾਈ ਸਭ ਤੋਂ ਕੁਸ਼ਲ ਹੈ।",
            "harvest": "ਫਸਲ ਕੱਟਣ ਦਾ ਸਮਾਂ ਮਹੱਤਵਪੂਰਨ ਹੈ। ਜ਼ਿਆਦਾਤਰ ਫਸਲਾਂ ਜਦੋਂ ਪਰਿਪੱਕਤਾ ਤੱਕ ਪਹੁੰਚਦੀਆਂ ਹਨ ਅਤੇ ਢੁਕਵੇਂ ਰੰਗ ਦੇ ਬਦਲਾਅ ਦਿਖਾਉਂਦੀਆਂ ਹਨ ਤਾਂ ਤਿਆਰ ਹੁੰਦੀਆਂ ਹਨ।",
            "default": "ਮੈਂ ਤੁਹਾਡੀ ਮਿੱਟੀ ਦੇ ਸਲਾਹ, ਫਸਲ ਦੀਆਂ ਸਿਫਾਰਸ਼ਾਂ, ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ, ਖਾਦ ਦੀ ਗਾਈਡ, ਕੀਟ ਨਿਯੰਤਰਣ, ਸਿੰਚਾਈ ਦੇ ਸੁਝਾਅ ਅਤੇ ਕਟਾਈ ਦੇ ਸਮੇਂ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?"
        },
        "or": {
            "soil": "ତୁମର ମାଟି ଗହମ ଏବଂ ଚାଉଳ ଚାଷ ପାଇଁ ଉପଯୁକ୍ତ। ଭଲ ଫଳାଫଳ ପାଇଁ pH 6.0-7.5 ମଧ୍ୟରେ ରଖ ଏବଂ ଉପଯୁକ୍ତ ଜଳ ନିଷ୍କାସନ ନିଶ୍ଚିତ କର।",
            "crop": "ଏହି ଋତୁରେ ଡାଲି ଏବଂ ସୋରିଷ ଭଲ ହେବ। ତୁମର ମାଟିର ଅବସ୍ଥା ଅନୁସାରେ ଗହମ, ଚାଉଳ କିମ୍ବା ମକା ରୋପଣ ବିଚାର କର।",
            "weather": "ବର୍ତ୍ତମାନର ପାଣିପାଗ ଅବସ୍ଥା ଚାଷ ପାଇଁ ଅନୁକୂଳ। ସର୍ବୋତ୍ତମ ଫସଲ ବୃଦ୍ଧି ପାଇଁ ବର୍ଷା ଏବଂ ତାପମାତ୍ରା ନିରୀକ୍ଷଣ କର।",
            "fertilizer": "ସନ୍ତୁଳିତ NPK ସାର ବ୍ୟବହାର କର। ପତ୍ର ବୃଦ୍ଧି ପାଇଁ ନାଇଟ୍ରୋଜେନ, ମୂଳ ବିକାଶ ପାଇଁ ଫସଫରସ ଏବଂ ଫଳର ଗୁଣବତ୍ତା ପାଇଁ ପୋଟାସିୟମ ବ୍ୟବହାର କର।",
            "pest": "ନିୟମିତ କ୍ଷେତ୍ର ପରିଦର୍ଶନ ସୁପାରିଶ କରାଯାଏ। ଜୈବିକ କୀଟନାଶକ ଏବଂ ସମନ୍ବିତ କୀଟ ପରିଚାଳନା କୌଶଳ ବ୍ୟବହାର କର।",
            "irrigation": "ତୁମର ଫସଲକୁ ନିୟମିତ ଭାବରେ ପାଣି ଦିଅ କିନ୍ତୁ ଅଧିକ ପାଣି ଦିଅ ନାହିଁ। ଜଳ ସଂରକ୍ଷଣ ପାଇଁ ଡ୍ରିପ୍ ସିଞ୍ଚନ ସବୁଠାରୁ କାର୍ଯ୍ୟକ୍ଷମ।",
            "harvest": "ଫସଲ କଟାଇ ସମୟ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ। ଅଧିକାଂଶ ଫସଲ ଯେତେବେଳେ ପରିପକ୍ୱତା ପର୍ଯ୍ୟନ୍ତ ପହଞ୍ଚେ ଏବଂ ଉପଯୁକ୍ତ ରଙ୍ଗ ପରିବର୍ତ୍ତନ ଦେଖାଏ ସେତେବେଳେ ପ୍ରସ୍ତୁତ ହୁଏ।",
            "default": "ମୁଁ ତୁମକୁ ମାଟିର ପରାମର୍ଶ, ଫସଲର ସୁପାରିଶ, ପାଣିପାଗର ସୂଚନା, ସାରର ମାର୍ଗଦର୍ଶିକା, କୀଟ ନିୟନ୍ତ୍ରଣ, ସିଞ୍ଚନ ଟିପ୍ସ ଏବଂ କଟାଇ ସମୟରେ ସାହାଯ୍ୟ କରିପାରିବି। ତୁମେ କଣ ଜାଣିବାକୁ ଚାହୁଁଛ?"
        },
        "as": {
            "soil": "আপোনাৰ মাটি গম আৰু চাউলৰ খেতিৰ বাবে উপযুক্ত। ভাল ফলাফলৰ বাবে pH 6.0-7.5 ৰ মাজত ৰাখক আৰু উপযুক্ত জল নিষ্কাশন নিশ্চিত কৰক।",
            "crop": "এই ঋতুত ডালি আৰু সৰিয়হ ভাল হ'ব। আপোনাৰ মাটিৰ অৱস্থাৰ ওপৰত ভিত্তি কৰি গম, চাউল বা মাকৈ ৰোপণ কৰাৰ কথা ভাবক।",
            "weather": "বৰ্তমানৰ বতৰৰ অৱস্থা খেতিৰ বাবে অনুকূল। শ্ৰেষ্ঠ শস্য বৃদ্ধিৰ বাবে বৰষুণ আৰু উষ্ণতা পৰ্যবেক্ষণ কৰক।",
            "fertilizer": "সন্তুলিত NPK সাৰ ব্যৱহাৰ কৰক। পাতৰ বৃদ্ধিৰ বাবে নাইট্ৰজেন, শিপাৰ বিকাশৰ বাবে ফছফৰাছ আৰু ফলৰ গুণমানৰ বাবে পটাছিয়াম ব্যৱহাৰ কৰক।",
            "pest": "নিয়মীয়া পথাৰ পৰিদৰ্শনৰ পৰামৰ্শ দিয়া হয়। জৈৱিক কীটনাশক আৰু সমন্বিত কীট ব্যৱস্থাপনা কৌশল ব্যৱহাৰ কৰক।",
            "irrigation": "আপোনাৰ শস্যক নিয়মীয়াকৈ পানী দিয়ক কিন্তু অধিক পানী নিদিব। পানী সংৰক্ষণৰ বাবে ড্ৰিপ সেচন আটাইতকৈ কাৰ্যকৰী।",
            "harvest": "শস্য কাটাৰ সময় গুৰুত্বপূৰ্ণ। বেছিভাগ শস্য যেতিয়া পৰিপক্কতালৈ পোছায় আৰু উপযুক্ত ৰঙৰ পৰিৱৰ্তন দেখুৱায় তেতিয়া প্ৰস্তুত হয়।",
            "default": "মই আপোনাক মাটিৰ পৰামৰ্শ, শস্যৰ পৰামৰ্শ, বতৰৰ তথ্য, সাৰৰ নিৰ্দেশনা, কীট নিয়ন্ত্ৰণ, সেচনৰ টিপছ আৰু কাটাৰ সময়ত সহায় কৰিব পাৰোঁ। আপুনি কি জানিব বিচাৰে?"
        },
        "ml": {
            "soil": "നിങ്ങളുടെ മണ്ണ് ഗോതമ്പും അരിയും കൃഷിക്ക് അനുയോജ്യമാണ്. നല്ല ഫലങ്ങൾക്ക് pH 6.0-7.5 ന് ഇടയിൽ സൂക്ഷിക്കുകയും ഉചിതമായ ജലനിർഗമനം ഉറപ്പാക്കുകയും ചെയ്യുക.",
            "crop": "ഈ സീസണിൽ പയർവർഗങ്ങളും കടുകും നന്നായിരിക്കും. നിങ്ങളുടെ മണ്ണിന്റെ അവസ്ഥ അനുസരിച്ച് ഗോതമ്പ്, അരി അല്ലെങ്കിൽ ചോളം നടുന്നത് പരിഗണിക്കുക.",
            "weather": "നിലവിലുള്ള കാലാവസ്ഥാ സാഹചര്യങ്ങൾ കൃഷിക്ക് അനുകൂലമാണ്. മികച്ച വിള വളർച്ചയ്ക്ക് മഴയും താപനിലയും നിരീക്ഷിക്കുക.",
            "fertilizer": "സന്തുലിതമായ NPK വളങ്ങൾ ഉപയോഗിക്കുക. ഇല വളർച്ചയ്ക്ക് നൈട്രജൻ, വേരുകളുടെ വികസനത്തിന് ഫോസ്ഫറസ്, പഴത്തിന്റെ ഗുണനിലവാരത്തിന് പൊട്ടാസ്യം ഉപയോഗിക്കുക.",
            "pest": "നിയമിതമായ വയൽ പരിശോധന ശുപാർശ ചെയ്യുന്നു. ജൈവ കീടനാശിനികളും സംയോജിത കീട മാനേജ്മെന്റ് സാങ്കേതികവിദ്യകളും ഉപയോഗിക്കുക.",
            "irrigation": "നിങ്ങളുടെ വിളകൾക്ക് നിയമിതമായി വെള്ളം നൽകുക, പക്ഷേ അധിക വെള്ളം നൽകരുത്. ജല സംരക്ഷണത്തിന് ഡ്രിപ്പ് നീരാവി ഏറ്റവും കാര്യക്ഷമമാണ്.",
            "harvest": "വിള കൊയ്ത്ത് സമയം നിർണായകമാണ്. മിക്ക വിളകളും പക്വതയിൽ എത്തുമ്പോഴും ഉചിതമായ നിറ മാറ്റങ്ങൾ കാണിക്കുമ്പോഴും തയ്യാറാകും.",
            "default": "മണ്ണിന്റെ ഉപദേശം, വിള ശുപാർശകൾ, കാലാവസ്ഥാ വിവരങ്ങൾ, വള ഗൈഡൻസ്, കീട നിയന്ത്രണം, നീരാവി ടിപ്പുകൾ, കൊയ്ത്ത് സമയം എന്നിവയിൽ ഞാൻ നിങ്ങളെ സഹായിക്കാം. നിങ്ങൾ എന്ത് അറിയാൻ ആഗ്രഹിക്കുന്നു?"
        },
        "kn": {
            "soil": "ನಿಮ್ಮ ಮಣ್ಣು ಗೋಧಿ ಮತ್ತು ಅಕ್ಕಿ ಕೃಷಿಗೆ ಸೂಕ್ತವಾಗಿದೆ. ಉತ್ತಮ ಫಲಿತಾಂಶಗಳಿಗಾಗಿ pH 6.0-7.5 ನಡುವೆ ಇರಿಸಿ ಮತ್ತು ಸರಿಯಾದ ಜಲನಿಕ್ಷೇಪವನ್ನು ಖಚಿತಪಡಿಸಿ.",
            "crop": "ಈ ಋತುವಿನಲ್ಲಿ ಬೇಳೆಗಳು ಮತ್ತು ಸಾಸಿವೆ ಉತ್ತಮವಾಗಿರುತ್ತವೆ. ನಿಮ್ಮ ಮಣ್ಣಿನ ಸ್ಥಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಗೋಧಿ, ಅಕ್ಕಿ ಅಥವಾ ಮೆಕ್ಕೆಜೋಳ ಬಿತ್ತುವುದನ್ನು ಪರಿಗಣಿಸಿ.",
            "weather": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳು ಕೃಷಿಗೆ ಅನುಕೂಲಕರವಾಗಿವೆ. ಸೂಕ್ತ ಬೆಳೆ ಬೆಳವಣಿಗೆಗಾಗಿ ಮಳೆ ಮತ್ತು ತಾಪಮಾನವನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಿ.",
            "fertilizer": "ಸಮತೋಲಿತ NPK ಗೊಬ್ಬರಗಳನ್ನು ಬಳಸಿ. ಎಲೆ ಬೆಳವಣಿಗೆಗಾಗಿ ಸಾರಜನಕ, ಬೇರುಗಳ ಬೆಳವಣಿಗೆಗಾಗಿ ಫಾಸ್ಫರಸ್ ಮತ್ತು ಹಣ್ಣಿನ ಗುಣಮಟ್ಟಕ್ಕಾಗಿ ಪೊಟ್ಯಾಸಿಯಂ ಬಳಸಿ.",
            "pest": "ನಿಯಮಿತ ಕ್ಷೇತ್ರ ಪರಿಶೀಲನೆ ಶಿಫಾರಸು ಮಾಡಲಾಗುತ್ತದೆ. ಸಾವಯವ ಕೀಟನಾಶಕಗಳು ಮತ್ತು ಸಮಗ್ರ ಕೀಟ ನಿರ್ವಹಣೆ ತಂತ್ರಗಳನ್ನು ಬಳಸಿ.",
            "irrigation": "ನಿಮ್ಮ ಬೆಳೆಗಳಿಗೆ ನಿಯಮಿತವಾಗಿ ನೀರು ನೀಡಿ ಆದರೆ ಹೆಚ್ಚು ನೀರು ನೀಡಬೇಡಿ. ನೀರಿನ ಸಂರಕ್ಷಣೆಗಾಗಿ ಡ್ರಿಪ್ ನೀರಾವರಿ ಅತ್ಯಂತ ಪರಿಣಾಮಕಾರಿಯಾಗಿದೆ.",
            "harvest": "ಬೆಳೆ ಕೊಯ್ಲು ಸಮಯ ಮುಖ್ಯವಾಗಿದೆ. ಹೆಚ್ಚಿನ ಬೆಳೆಗಳು ಪ್ರಬುದ್ಧತೆಯನ್ನು ತಲುಪಿದಾಗ ಮತ್ತು ಸರಿಯಾದ ಬಣ್ಣದ ಬದಲಾವಣೆಗಳನ್ನು ತೋರಿಸಿದಾಗ ಸಿದ್ಧವಾಗಿರುತ್ತವೆ.",
            "default": "ನಾನು ನಿಮಗೆ ಮಣ್ಣಿನ ಸಲಹೆ, ಬೆಳೆ ಶಿಫಾರಸುಗಳು, ಹವಾಮಾನ ಮಾಹಿತಿ, ಗೊಬ್ಬರ ಮಾರ್ಗದರ್ಶನ, ಕೀಟ ನಿಯಂತ್ರಣ, ನೀರಾವರಿ ಸಲಹೆಗಳು ಮತ್ತು ಕೊಯ್ಲು ಸಮಯದಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಹುದು. ನೀವು ಏನು ತಿಳಿದುಕೊಳ್ಳಲು ಬಯಸುತ್ತೀರಿ?"
        }
    }

    # Enhanced keyword detection for all languages
    soil_keywords = ["soil", "मिट्टी", "माती", "land", "जमीन", "மண்", "నేల", "মাটি", "માટી", "ਮਿੱਟੀ", "ମାଟି", "মাটি", "മണ്ണ്", "ಮಣ್ಣು"]
    crop_keywords = ["crop", "फसल", "पीक", "plant", "बीज", "பயிர்", "పంట", "ফসল", "પાક", "ਫਸਲ", "ଫସଲ", "শস্য", "വിള", "ಬೆಳೆ"]
    weather_keywords = ["weather", "मौसम", "हवामान", "rain", "बारिश", "வானிலை", "వాతావరణం", "আবহাওয়া", "હવામાન", "ਮੌਸਮ", "ପାଣିପାଗ", "বতৰ", "കാലാവസ്ഥ", "ಹವಾಮಾನ"]
    fertilizer_keywords = ["fertilizer", "खाद", "उर्वरक", "manure", "खत", "உரம்", "ఎరువు", "সার", "ખાતર", "ਖਾਦ", "ସାର", "সাৰ", "വളം", "ಗೊಬ್ಬರ"]
    pest_keywords = ["pest", "कीट", "insect", "bug", "रोग", "பூச்சி", "కీటకం", "পোকা", "કીટક", "ਕੀੜਾ", "କୀଟ", "কীট", "കീടം", "ಕೀಟ"]
    irrigation_keywords = ["water", "पानी", "सिंचाई", "irrigation", "जल", "நீர்", "నీరు", "পানি", "પાણી", "ਪਾਣੀ", "ପାଣି", "পানী", "വെള്ളം", "ನೀರು"]
    harvest_keywords = ["harvest", "कटाई", "कापणी", "yield", "उपज", "அறுவடை", "పంట", "ফসল", "ફસલ", "ਫਸਲ", "ଫସଲ", "শস্য", "വിള", "ಬೆಳೆ"]
    
    if any(word in user_query for word in soil_keywords):
        key = "soil"
    elif any(word in user_query for word in crop_keywords):
        key = "crop"
    elif any(word in user_query for word in weather_keywords):
        key = "weather"
    elif any(word in user_query for word in fertilizer_keywords):
        key = "fertilizer"
    elif any(word in user_query for word in pest_keywords):
        key = "pest"
    elif any(word in user_query for word in irrigation_keywords):
        key = "irrigation"
    elif any(word in user_query for word in harvest_keywords):
        key = "harvest"
    else:
        key = "default"

    response_text = responses.get(lang, responses["en"])[key]
    
    # Save conversation to backend storage
    save_conversation(data.query, response_text, lang)
    
    return {
        "response": response_text,
        "language": lang,
        "detected_language": lang if data.language == "auto" or not data.language else data.language
    }

# Get conversation history endpoint
@app.get("/conversations")
def get_conversations():
    """Get conversation history"""
    conversations = load_conversations()
    return {"conversations": conversations}

# Clear conversation history endpoint
@app.delete("/conversations")
def clear_conversations():
    """Clear conversation history"""
    try:
        if os.path.exists(CONVERSATION_FILE):
            os.remove(CONVERSATION_FILE)
        return {"message": "Conversation history cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing conversations: {str(e)}")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Voice Assistant API is running"}

# Root endpoint
@app.get("/")
def root():
    return {"message": "FarmSmart Voice Assistant API", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)

