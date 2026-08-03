import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Volume2, VolumeX, Trash2, MessageSquarePlus, Sparkles, User, Bot, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { transliterateInput } from '@/lib/transliteration';
import { buildVoiceApiUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface VoiceAssistantProps {
  onCommand?: (command: string) => void;
  language?: string;
  farmerId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  language?: string;
}

export function cleanStepFormatting(text: string, language?: string): string {
  if (!text) return text;
  if (language === 'hi' || language === 'Hindi') {
    return text
      .replace(/\bStep\s*1\b:?/gi, 'पहला चरण:')
      .replace(/\bStep\s*2\b:?/gi, 'दूसरा चरण:')
      .replace(/\bStep\s*3\b:?/gi, 'तीसरा चरण:')
      .replace(/\bStep\s*4\b:?/gi, 'चौथा चरण:')
      .replace(/\bStep\s*5\b:?/gi, 'पांचवां चरण:')
      .replace(/\bStep\s*6\b:?/gi, 'छठा चरण:')
      .replace(/\bStep\s*7\b:?/gi, 'सातवां चरण:')
      .replace(/\bStep\s*8\b:?/gi, 'आठवां चरण:')
      .replace(/\bStep\s*9\b:?/gi, 'नौवां चरण:')
      .replace(/\bStep\s*10\b:?/gi, 'दसवां चरण:')
      .replace(/\bStep\s*(\d+)\b:?/gi, 'चरण $1:');
  }
  if (language === 'od' || language === 'or' || language === 'Odia') {
    return text
      .replace(/\bStep\s*1\b:?/gi, 'ପ୍ରଥମ ଚରଣ:')
      .replace(/\bStep\s*2\b:?/gi, 'ଦ୍ୱିତୀୟ ଚରଣ:')
      .replace(/\bStep\s*3\b:?/gi, 'ତୃତୀୟ ଚରଣ:')
      .replace(/\bStep\s*(\d+)\b:?/gi, 'ଚରଣ $1:');
  }
  return text;
}

export function VoiceAssistant({ language: appLanguage, farmerId }: VoiceAssistantProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedQuery, setTypedQuery] = useState('');
  const [inputError, setInputError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const selectedLanguage = appLanguage || localStorage.getItem('farmwise-language') || 'en';
  const backendLanguage = selectedLanguage === 'od' ? 'or' : selectedLanguage;

  const speechLangMap: Record<string, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    od: 'or-IN',
    or: 'or-IN'
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Load past conversation history on mount into thread
  useEffect(() => {
    const loadHistory = async () => {
      if (!farmerId) return;
      try {
        const response = await fetch(buildVoiceApiUrl(`/api/conversations?farmerId=${farmerId}`));
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            const thread: ChatMessage[] = [];
            
            data.conversations.forEach((item: any) => {
              const ts = new Date(item.createdAt || item.timestamp || Date.now());
              thread.push({
                id: `q_${item.id}`,
                role: 'user',
                text: item.question || item.query,
                timestamp: ts,
                language: item.language
              });
              thread.push({
                id: `a_${item.id}`,
                role: 'assistant',
                text: item.answer || item.response,
                timestamp: ts,
                language: item.language
              });
            });

            if (thread.length > 0) {
              setMessages(thread);
            }
          }
        }
      } catch (error) {
        console.log('Backend conversation history error:', error);
      }
    };

    loadHistory();
  }, [farmerId]);

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = speechLangMap[backendLanguage] || 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const spokenText = event.results?.[0]?.[0]?.transcript;
        if (spokenText) {
          handleSendQuery(spokenText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [backendLanguage]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const speakText = (text: string, langCode: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.95;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendQuery = async (queryText: string) => {
    const query = queryText.trim();
    if (!query) {
      setInputError("Please enter a question.");
      toast({
        title: "Validation Error",
        description: "Please complete all required fields.",
        variant: "destructive"
      });
      return;
    }

    setInputError('');
    setTypedQuery('');

    // Append User Message to Thread
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: new Date(),
      language: backendLanguage
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const res = await fetch(buildVoiceApiUrl('/api/voice-query'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          language: backendLanguage,
          farmerId
        }),
      });

      if (!res.ok) throw new Error("Voice assistant server error");
      
      const data = await res.json();
      const responseText = data.response || "I am here to assist with your crops and farming queries.";
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: responseText,
        timestamp: new Date(),
        language: backendLanguage
      };

      setMessages(prev => [...prev, assistantMsg]);
      setCurrentLanguage(backendLanguage);
      
      toast({
        title: "✅ Voice response generated.",
        description: "AI Advisor has answered your question."
      });

      speakText(responseText, speechLangMap[backendLanguage] || 'en-US');
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Connection Error",
        description: "We couldn't generate a voice response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    stopSpeaking();
    toast({
      title: "New Chat Started",
      description: "Started a fresh conversation thread."
    });
  };

  const handleClearHistory = async () => {
    setMessages([]);
    stopSpeaking();
    try {
      await fetch(buildVoiceApiUrl(`/api/conversations?farmerId=${farmerId}`), {
        method: 'DELETE'
      });
    } catch (e) {
      console.error("Failed to clear conversations backend", e);
    }
    toast({
      title: "History Cleared",
      description: "Voice conversation history removed."
    });
  };

  const uiTexts = {
    hi: {
      title: "फार्मवाइज़ AI वॉयस सलाहकार",
      newChat: "नया चैट",
      replayAudio: "पुनः सुनें",
      thinking: "फार्मवाइज़ AI उत्तर तैयार कर रहा है...",
      speakQuery: "बोलकर पूछें",
      stopInput: "बोलना बंद करें",
      stopAudio: "आवाज़ बंद करें",
      placeholder: "अपनी खेती से जुड़ा सवाल यहाँ पूछें...",
      send: "भेजें",
      talking: "सोच रहा है...",
      mode: "HINDI MODE"
    },
    or: {
      title: "ଫାର୍ମୱାଇଜ୍ AI ଭଏସ୍ ପରାମର୍ଶଦାତା",
      newChat: "ନୂତନ ଚାଟ୍",
      replayAudio: "ପୁନର୍ବାର ଶୁଣନ୍ତୁ",
      thinking: "ଉତ୍ତର ପ୍ରସ୍ତୁତ ହେଉଛି...",
      speakQuery: "କୁହନ୍ତୁ",
      stopInput: "ବନ୍ଦ କରନ୍ତୁ",
      stopAudio: "ଅଡିଓ ବନ୍ଦ କରନ୍ତୁ",
      placeholder: "ଆପଣଙ୍କର କୃଷି ପ୍ରଶ୍ନ ଏଠାରେ ପଚାରନ୍ତୁ...",
      send: "ପଠାନ୍ତୁ",
      talking: "ପଠାଯାଉଛି...",
      mode: "ODIA MODE"
    },
    en: {
      title: "FarmWise AI Voice Advisor",
      newChat: "New Chat",
      replayAudio: "Replay Audio",
      thinking: "FarmWise AI is thinking...",
      speakQuery: "Speak Query",
      stopInput: "Stop Voice Input",
      stopAudio: "Stop Audio",
      placeholder: "Ask your farming query here...",
      send: "Send",
      talking: "Thinking...",
      mode: "ENGLISH MODE"
    }
  };

  const ui = uiTexts[selectedLanguage as keyof typeof uiTexts] || uiTexts.en;

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-md border rounded-xl overflow-hidden flex flex-col h-[75vh]">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg font-bold">
            <Bot className="w-5 h-5" />
            <span>{ui.title}</span>
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNewChat}
              className="text-xs bg-white/20 hover:bg-white/30 text-white border-0 font-medium"
            >
              <MessageSquarePlus className="w-4 h-4 mr-1.5" />
              {ui.newChat}
            </Button>
            {messages.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearHistory}
                className="text-xs px-2.5"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex flex-col justify-between overflow-hidden bg-muted/20">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base text-foreground">{ui.title}</h3>
              <p className="text-xs max-w-md mt-1">
                {selectedLanguage === 'hi' 
                  ? "खेती, खाद, फसल सुरक्षा, मौसम या सिंचाई के बारे में कोई भी सवाल पूछें। आपकी बातचीत प्राकृतिक रूप से जारी रहेगी।"
                  : "Ask anything about crops, fertilizers, pest control, weather, or irrigation. Your conversation will continue naturally."}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-card border text-card-foreground rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{cleanStepFormatting(msg.text, msg.language || selectedLanguage)}</p>
                  
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(msg.text, speechLangMap[msg.language || 'en'] || 'en-US')}
                        className="h-5 px-1 text-[10px]"
                      >
                        <Volume2 className="w-3 h-3 mr-1" />
                        {ui.replayAudio}
                      </Button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isGenerating && (
            <div className="flex space-x-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-card border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground font-medium">{ui.thinking}</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Controls & Input Form */}
        <div className="pt-3 border-t space-y-3 shrink-0">
          {/* Voice Mic Controls */}
          <div className="flex items-center justify-between bg-card p-2 rounded-xl border">
            <div className="flex items-center space-x-2">
              <Button
                onClick={toggleListening}
                variant={isListening ? "destructive" : "default"}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isListening ? <MicOff className="w-4 h-4 mr-1.5" /> : <Mic className="w-4 h-4 mr-1.5" />}
                {isListening ? ui.stopInput : ui.speakQuery}
              </Button>

              {isSpeaking && (
                <Button
                  onClick={stopSpeaking}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <VolumeX className="w-3.5 h-3.5 mr-1" />
                  {ui.stopAudio}
                </Button>
              )}
            </div>

            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              {ui.mode}
            </Badge>
          </div>

          {/* Text Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(typedQuery);
            }}
            className="flex space-x-2"
          >
            <div className="flex-1">
              <Input
                value={typedQuery}
                onChange={(e) => {
                  setInputError('');
                  setTypedQuery(transliterateInput(e.target.value, selectedLanguage));
                }}
                placeholder={ui.placeholder}
                disabled={isGenerating}
                className={inputError ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {inputError && <p className="text-xs text-destructive mt-1">{inputError}</p>}
            </div>
            <Button
              type="submit"
              disabled={!typedQuery.trim() || isGenerating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 shrink-0"
            >
              {isGenerating ? (
                ui.talking
              ) : (
                <span className="flex items-center"><Send className="w-4 h-4 mr-1" /> {ui.send}</span>
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export default VoiceAssistant;
