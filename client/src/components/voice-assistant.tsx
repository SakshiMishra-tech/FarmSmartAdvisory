import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Volume2, VolumeX, Trash2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { transliterateInput } from '@/lib/transliteration';
import { buildVoiceApiUrl } from '@/lib/api';

interface VoiceAssistantProps {
  onCommand?: (command: string) => void;
  language?: string;
  farmerId: string;
}

interface Conversation {
  id: string;
  timestamp: Date;
  question: string;
  answer: string;
  language: string;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onCommand, language: appLanguage, farmerId }) => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [typedQuery, setTypedQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Conversation[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selectedLanguage = appLanguage || localStorage.getItem('farmwise-language') || 'en';
  const backendLanguage = selectedLanguage === 'od' ? 'or' : selectedLanguage;
  const speechLangMap: { [key: string]: string } = {
    en: 'en-US',
    hi: 'hi-IN',
    od: 'or-IN',
    or: 'or-IN'
  };

  // Load conversation history from backend on component mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!farmerId) return;
      try {
        const response = await fetch(buildVoiceApiUrl(`/api/conversations?farmerId=${farmerId}`));
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            const backendHistory = data.conversations.map((item: any) => ({
              ...item,
              timestamp: new Date(item.createdAt || item.timestamp)
            }));
            
            setConversationHistory(backendHistory);
          } else {
            console.warn('Backend returned non-JSON response for history. Likely a configuration issue.');
          }
        }
      } catch (error) {
        console.log('Backend conversation history not available:', error);
      }
    };

    loadHistory();
  }, [farmerId]);

  // Add conversation to history
  const addToHistory = (question: string, answer: string, language: string) => {
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      question,
      answer,
      language
    };
    setConversationHistory(prev => [...prev, newEntry]);
  };

  // Clear conversation history
  const clearHistory = async () => {
    setConversationHistory([]);
    
    // Clear backend history
    try {
      await fetch(buildVoiceApiUrl(`/api/conversations?farmerId=${farmerId}`), {
        method: 'DELETE'
      });
    } catch (error) {
      console.log('Could not clear backend history:', error);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleTypedQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = typedQuery.trim();
    if (!query) return;

    try {
      setTranscript(query);
      setResponse('');
      setError(null);
      setIsGenerating(true);

      const res = await fetch(buildVoiceApiUrl('/api/voice-query'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          language: backendLanguage,
          farmerId
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response (not JSON). Please check your API configuration.');
      }

      const data = await res.json();
      const language = backendLanguage || data.language || 'en';
      setResponse(data.response);
      setCurrentLanguage(language);
      addToHistory(query, data.response, language);
      setTypedQuery('');

      speakText(data.response, speechLangMap[language] || 'en-US');

      if (onCommand) {
        onCommand(query);
      }
    } catch (error) {
      console.error('Error sending typed query:', error);
      setError(error instanceof Error ? error.message : 'Connection error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Text-to-speech function
  const speakText = (text: string, language: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9; // Slightly slower for better understanding
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };
      
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  };

  // Stop speaking function
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    // Initialize voice recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = speechLangMap[backendLanguage] || 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          setResponse(''); // Clear previous response
          setIsGenerating(true);
          
          try {
            const res = await fetch(buildVoiceApiUrl('/api/voice-query'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                query: finalTranscript,
                language: backendLanguage,
                farmerId
              }),
            });

            if (!res.ok) {
              console.error(`HTTP error! status: ${res.status}`);
              throw new Error(`Server returned ${res.status}`);
            }

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error('Server returned an invalid response. API configuration might be wrong.');
            }

            const data = await res.json();
            setResponse(data.response);
            setCurrentLanguage(backendLanguage);
            setError(null);
            
            // Add to conversation history
            addToHistory(finalTranscript, data.response, backendLanguage);
            
            // Automatically speak the response
            const speechLang = speechLangMap[backendLanguage] || 'en-US';
            speakText(data.response, speechLang);
            
            // Call onCommand if provided
            if (onCommand) {
              onCommand(finalTranscript);
            }
            
          } catch (error) {
            console.error('Error in voice recognition:', error);
            setError(error instanceof Error ? error.message : 'Connection error. Please try again.');
            setResponse('');
          } finally {
            setIsGenerating(false);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onCommand, backendLanguage]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      setTranscript('');
      setResponse('');
      // Stop any ongoing speech when starting to listen
      stopSpeaking();
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const getLanguageFlag = (lang: string) => {
    const flags: { [key: string]: string } = {
      'en': '🇺🇸',
      'hi': '🇮🇳',
      'or': '🇮🇳',
      'od': '🇮🇳'
    };
    return flags[lang] || '🌐';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            {t('voice.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? t('button.collapse') : t('button.expand')}
            </Button>
            {conversationHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={toggleListening}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="flex items-center gap-2"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? t('voice.stop') : t('voice.start')}
          </Button>
          
          {isSpeaking && (
            <Button
              onClick={stopSpeaking}
              variant="outline"
              size="lg"
              className="flex items-center gap-2"
            >
              <VolumeX className="w-4 h-4" />
              {t('voice.stopSpeaking')}
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="text-sm text-muted-foreground">
          {isListening ? t('voice.listening') :
           isGenerating ? "Generating response from AI..." :
           isSpeaking ? t('voice.speaking') :
           t('voice.idle')}
        </div>

        <form onSubmit={handleTypedQuery} className="space-y-2">
          <label className="text-sm font-medium">{t('voice.typeTitle')}</label>
          <div className="flex gap-2">
            <Input
              value={typedQuery}
              onChange={(e) => setTypedQuery(transliterateInput(e.target.value, selectedLanguage))}
              placeholder={t('placeholder.typeQuestion')}
              disabled={isGenerating}
              data-testid="input-typed-voice-query"
            />
            <Button type="submit" disabled={!typedQuery.trim() || isGenerating} data-testid="button-send-typed-query">
              {isGenerating ? "Thinking..." : t('voice.send')}
            </Button>
          </div>
        </form>

        {/* Current Interaction */}
        {(transcript || response || isGenerating) && (
          <div className="space-y-3">
            {transcript && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{t('voice.youSaid')}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getLanguageFlag(currentLanguage)} {currentLanguage.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm italic">"{transcript}"</p>
              </div>
            )}

            {isGenerating && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center space-x-3">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-primary">FarmWise AI Advisor is thinking...</p>
                  <p className="text-xs text-muted-foreground">Analyzing your farming query and building step-by-step guidance.</p>
                </div>
              </div>
            )}

            {response && !isGenerating && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-900">{t('voice.response')}</span>
                    <Badge variant="secondary" className="text-xs">
                      {getLanguageFlag(currentLanguage)} {currentLanguage.toUpperCase()}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => {
                      const speechLang = speechLangMap[currentLanguage] || 'en-US';
                      speakText(response, speechLang);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2"
                  >
                    <Volume2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-green-950 whitespace-pre-wrap leading-relaxed">{response}</p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{t('voice.error')}: {error}</p>
          </div>
        )}

        {/* Conversation History */}
        {isExpanded && conversationHistory.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t('voice.history')} ({conversationHistory.length})</h4>
              <Button
                onClick={clearHistory}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {t('button.clear')}
              </Button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {conversationHistory.slice().reverse().map((conversation) => (
                <div 
                  key={conversation.id}
                  className="p-3 bg-card border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{conversation.timestamp.toLocaleString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {getLanguageFlag(conversation.language)} {conversation.language.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('voice.youAsked')}</p>
                    <p className="text-sm italic">"{conversation.question}"</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('voice.assistantReplied')}</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{conversation.answer}</p>
                  </div>
                  
                  <Button
                    onClick={() => {
                      const speechLang = speechLangMap[conversation.language] || 'en-US';
                      speakText(conversation.answer, speechLang);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {t('button.replay')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceAssistant;
