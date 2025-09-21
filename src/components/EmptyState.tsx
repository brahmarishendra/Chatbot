import React from 'react';
import { Heart, Mic, MessageCircle, Brain, Sparkles } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { motion } from 'framer-motion';

const EmptyState: React.FC = () => {
  const { createNewSession, sendMessage } = useChat();

  const quickStarters = [
    "I'm feeling stressed",
    "Need someone to talk to",
    "Having anxiety",
    "Feeling overwhelmed"
  ];

  const handleQuickStart = async (message: string) => {
    createNewSession();
    setTimeout(() => {
      sendMessage(message);
    }, 100);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-8 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-8 max-w-md mx-auto"
      >
        {/* Main Title - Clean and Simple */}
        <div className="space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
          >
            Ask anything or explore
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white opacity-60"
          >
            personalized support
          </motion.h2>
        </div>

        {/* Quick Actions - Card Style like reference */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-2 gap-4 mt-12"
        >
          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">CHAT</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Text conversation with your mental wellness companion</p>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <Mic className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">VOICE</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Speak naturally and get voice responses back</p>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">WELLNESS</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mental health tips and coping strategies</p>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">SUPPORT</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">24/7 emotional support when you need it</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Starters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="space-y-3 mt-8"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Popular ways to get started</p>
          <div className="grid grid-cols-2 gap-2">
            {quickStarters.map((starter, index) => (
              <button
                key={index}
                onClick={() => handleQuickStart(starter)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                {starter}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EmptyState;