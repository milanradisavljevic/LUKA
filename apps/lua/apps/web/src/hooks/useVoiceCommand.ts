import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceCommandReturn {
  listening: boolean;
  transcript: string;
  interimTranscript: string;
  supported: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceCommand(onResult: (text: string) => void): UseVoiceCommandReturn {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!supported) return;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        onResult(final);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onResult, supported]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !listening) {
      try {
        recognitionRef.current.start();
        setListening(true);
        setTranscript('');
        setInterimTranscript('');
      } catch {
        setListening(false);
      }
    }
  }, [listening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  return { listening, transcript, interimTranscript, supported, startListening, stopListening, toggleListening };
}
