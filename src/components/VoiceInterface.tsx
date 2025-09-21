import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, Play, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInterfaceProps {
  onSendVoiceMessage: (message: string) => void;
  onToggleVoice: (enabled: boolean) => void;
  isVoiceEnabled: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onSendVoiceMessage,
  onToggleVoice,
  isVoiceEnabled,
  onClose,
  showCloseButton = false
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    setIsSupported(!!(SpeechRecognition && speechSynthesis));

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;
      
      // Enhanced timeout settings for longer speech (using built-in properties)
      // Note: timeout properties are handled by the browser automatically

      recognition.onstart = () => {
        setIsListening(true);
        startVolumeMonitoring();
        console.log('🎤 Voice recognition started - speak naturally');
      };

      recognition.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');
        
        setTranscript(currentTranscript);
        console.log('📝 Transcript:', currentTranscript);

        // Enhanced final result handling
        if (event.results[event.results.length - 1].isFinal) {
          const finalTranscript = currentTranscript.trim();
          const wordCount = finalTranscript.split(/\s+/).filter(word => word.length > 0).length;
          
          console.log(`✅ Final transcript (${wordCount} words):`, finalTranscript);
          
          if (finalTranscript && wordCount >= 1) { // Accept any meaningful input
            onSendVoiceMessage(finalTranscript);
          } else if (wordCount === 0) {
            console.log('⚠️ No speech detected, please try again');
          }
          
          setTranscript('');
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        stopVolumeMonitoring();
      };

      recognition.onend = () => {
        setIsListening(false);
        stopVolumeMonitoring();
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopVolumeMonitoring();
    };
  }, [onSendVoiceMessage]);

  const startVolumeMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setVolume(average / 255);
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };

      updateVolume();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopVolumeMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setVolume(0);
  };

  const toggleListening = () => {
    if (!isSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  // Helper function to clean emoji explanations from text for voice synthesis
  const cleanTextForVoice = (text: string): string => {
    // Remove emoji explanations and make responses more natural for voice
    let cleaned = text;
    
    // Remove emoji descriptions like "heart emoji", "blue heart emoji", etc.
    cleaned = cleaned.replace(/\b(heart emoji|blue heart emoji|rainbow emoji|seedling emoji|sleeping emoji|sos emoji|green heart emoji|purple heart emoji|orange heart emoji|yellow heart emoji)\b/gi, '');
    
    // Remove parenthetical emoji descriptions
    cleaned = cleaned.replace(/\([^)]*emoji[^)]*\)/gi, '');
    
    // Remove emoji-related phrases
    cleaned = cleaned.replace(/\b(with a|followed by a|plus a|and a)\s+(heart|rainbow|seedling|sleeping|sos)\s+emoji\b/gi, '');
    
    // Remove standalone emojis at the end of sentences or phrases
    cleaned = cleaned.replace(/\s+[💙🌈🌱😴🆘❤️💚💜🧡💛💯✨🎉🔥💪🙏👍]+\s*$/g, '');
    cleaned = cleaned.replace(/^[💙🌈🌱😴🆘❤️💚💜🧡💛💯✨🎉🔥💪🙏👍]+\s+/g, '');
    
    // Remove emojis from middle of text
    cleaned = cleaned.replace(/\s+[💙🌈🌱😴🆘❤️💚💜🧡💛💯✨🎉🔥💪🙏👍]+\s+/g, ' ');
    
    // Clean up extra spaces and punctuation
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s+[.,!?]/g, (match) => match.trim());
    cleaned = cleaned.trim();
    
    // Remove empty sentences
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    
    return cleaned;
  };

  // Enhanced speakText function with better error handling and voice selection
  const speakText = (text: string) => {
    console.log('🎵 speakText called with text:', text);
    console.log('🎵 isVoiceEnabled:', isVoiceEnabled);
    console.log('🎵 speechSynthesis available:', !!window.speechSynthesis);
    
    if (!isVoiceEnabled) {
      console.log('🔇 Voice disabled - not speaking');
      return;
    }
    
    if (!window.speechSynthesis) {
      console.log('🚫 Speech synthesis not supported');
      return;
    }

    // Clean emoji explanations from the text before speaking
    const cleanedText = cleanTextForVoice(text);
    console.log('🧹 Cleaned text for voice:', cleanedText);

    // Stop any current speech
    window.speechSynthesis.cancel();
    
    console.log('🗣️ Starting to speak:', cleanedText);

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    // Enhanced voice settings for better clarity
    utterance.rate = 0.85; // Slightly slower for better understanding
    utterance.pitch = 1.1; // Slightly higher pitch for friendliness
    utterance.volume = 0.9; // Louder volume
    utterance.lang = 'en-US';
    
    // Enhanced voice selection
    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('🎵 Available voices:', voices.map(v => v.name));
      
      // Priority order for selecting the most human-like female voice
      const femaleVoiceNames = [
        'Microsoft Zira - English (United States)',
        'Microsoft Aria - English (United States)', 
        'Google US English Female',
        'Samantha',
        'Karen',
        'Victoria',
        'Allison',
        'Ava',
        'Susan',
        'Vicki',
        'Princess'
      ];
      
      // Try to find preferred female voices first
      let preferredVoice = null;
      for (const voiceName of femaleVoiceNames) {
        preferredVoice = voices.find(voice => 
          voice.name.toLowerCase().includes(voiceName.toLowerCase()) &&
          voice.lang.startsWith('en')
        );
        if (preferredVoice) break;
      }
      
      // Fallback to any female voice indicators
      if (!preferredVoice) {
        preferredVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('female') ||
           voice.name.toLowerCase().includes('woman') ||
           voice.name.toLowerCase().includes('girl'))
        );
      }
      
      // Final fallback to high quality voices
      if (!preferredVoice) {
        preferredVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.includes('Google') || 
           voice.name.includes('Microsoft') || 
           voice.localService)
        ) || voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('🎵 Using voice:', preferredVoice.name);
      } else {
        console.log('⚠️ No preferred voice found, using default');
      }
    };

    utterance.onstart = () => {
      setIsPlaying(true);
      console.log('🎵 Voice playback started successfully');
    };
    
    utterance.onend = () => {
      setIsPlaying(false);
      console.log('🎵 Voice playback ended successfully');
    };
    
    utterance.onerror = (error) => {
      setIsPlaying(false);
      console.error('🚫 Voice playback error:', error);
    };

    synthesisRef.current = utterance;
    
    // Ensure voices are loaded before speaking
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      console.log('🔄 Waiting for voices to load...');
      window.speechSynthesis.onvoiceschanged = () => {
        selectVoice();
        window.speechSynthesis.speak(utterance);
        console.log('🎵 Speaking after voices loaded');
      };
    } else {
      selectVoice();
      window.speechSynthesis.speak(utterance);
      console.log('🎵 Speaking immediately');
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  // Enhanced exposure of speakText function to global scope - Always available
  useEffect(() => {
    // Always expose the function, regardless of voice enabled state
    (window as any).mindBuddySpeakText = speakText;
    console.log('✅ mindBuddySpeakText function exposed globally');
    
    // Also create a test function for debugging
    (window as any).testVoice = () => {
      console.log('🎵 Testing voice with: "Hello, this is a voice test"');
      speakText("Hello, this is a voice test");
    };
    
    return () => {
      // Cleanup
      delete (window as any).mindBuddySpeakText;
      delete (window as any).testVoice;
    };
  }, [speakText]); // Depend on speakText to update when it changes

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Voice features are not supported in your browser
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm relative">
      {/* Close Button */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Close Voice Interface"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Voice Controls */}
      <div className="flex items-center gap-3 mt-2">
        {/* Voice Toggle */}
        <button
          onClick={() => onToggleVoice(!isVoiceEnabled)}
          className={`p-2.5 rounded-xl transition-all duration-200 ${
            isVoiceEnabled
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
          }`}
          title={isVoiceEnabled ? 'Disable voice' : 'Enable voice'}
        >
          {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Microphone Button */}
        <motion.button
          onClick={toggleListening}
          className={`relative p-3 rounded-full transition-all duration-200 ${
            isListening
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          whileTap={{ scale: 0.95 }}
          title={isListening ? 'Stop listening' : 'Start listening'}
        >
          <Mic className="w-5 h-5" />
          
          {/* Volume visualization */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-red-300"
              animate={{
                scale: [1, 1 + volume * 0.3, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.button>

        {/* Speech Control */}
        <button
          onClick={isPlaying ? stopSpeaking : undefined}
          disabled={!isPlaying}
          className={`p-2.5 rounded-xl transition-all duration-200 ${
            isPlaying
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
          }`}
          title={isPlaying ? 'Stop speaking' : 'Voice output inactive'}
        >
          {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        
        {/* Test Voice Button - Debug helper */}
        {isVoiceEnabled && (
          <button
            onClick={() => speakText("Voice test successful! I can speak.")}
            className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all duration-200"
            title="Test Voice Output"
          >
            🎵
          </button>
        )}
      </div>

      {/* Status and Transcript */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-center w-full"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Listening...
              </span>
            </div>
            {transcript && (
              <p className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                "{transcript}"
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {!isListening && (
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click the microphone to start voice chat
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            💡 Speak naturally - I can understand longer conversations
          </p>
        </div>
      )}
      
      {/* Enhanced listening feedback */}
      {isListening && (
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-green-600 dark:text-green-400">
            🎤 Listening... speak naturally
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            I'll wait for you to finish speaking
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceInterface;