import React from 'react';
import { ArrowRight, Star, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface GetStartedProps {
  onGetStarted: () => void;
}

const GetStarted: React.FC<GetStartedProps> = ({ onGetStarted }) => {
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-blue-500 to-purple-600 relative overflow-hidden">
      {/* Navigation Bar */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
              <img 
                src="https://i.pinimg.com/736x/35/ed/de/35edde0e0c9e69638f9e70024db73530.jpg" 
                alt="MindBuddy" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-xl font-bold outfit-bold">MindBuddy</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <span className="text-white/90 outfit-medium hover:text-white cursor-pointer transition-colors">Product</span>
            <span className="text-white/90 outfit-medium hover:text-white cursor-pointer transition-colors">Features</span>
            <span className="text-white/90 outfit-medium hover:text-white cursor-pointer transition-colors">Company</span>
          </div>
          
          <button 
            onClick={onGetStarted}
            className="bg-white text-black px-6 py-2 border-1 border-gray-300 outfit-medium hover:bg-gray-50 transition-colors"
            style={{ borderRadius: '1px' }}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl font-bold text-white mb-6 outfit-bold leading-tight"
            >
              AI-Powered features
              <br />
              <span className="text-white/80">from the future</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-white/90 mb-12 max-w-3xl mx-auto outfit-regular leading-relaxed"
            >
              Experience the next generation of mental wellness support designed specifically for young people. 
              Our AI understands, adapts, and grows with you.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button
                onClick={onGetStarted}
                className="bg-white text-black px-8 py-4 border-1 border-gray-300 outfit-bold text-lg hover:bg-gray-50 transition-all duration-300 flex items-center gap-3 shadow-lg"
                style={{ borderRadius: '1px' }}
              >
                Getstarted
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button className="bg-transparent border-1 border-white text-white px-8 py-4 outfit-medium text-lg hover:bg-white/10 transition-all duration-300"
                     style={{ borderRadius: '1px' }}>
                Watch demo
              </button>
            </motion.div>
          </div>

          {/* Feature Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {/* AI Intelligence Card */}
            <div className="bg-white/95 backdrop-blur-sm p-8 border-1 border-gray-200 hover:shadow-xl transition-all duration-300"
                 style={{ borderRadius: '1px' }}>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 border-1 border-gray-300 flex items-center justify-center mb-6"
                   style={{ borderRadius: '1px' }}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 outfit-bold">AI Intelligence</h3>
              <p className="text-gray-700 outfit-regular leading-relaxed">
                Advanced AI that learns your patterns, understands your emotions, and provides personalized mental health support 24/7.
              </p>
            </div>

            {/* Personalized Care Card */}
            <div className="bg-white/95 backdrop-blur-sm p-8 border-1 border-gray-200 hover:shadow-xl transition-all duration-300"
                 style={{ borderRadius: '1px' }}>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 border-1 border-gray-300 flex items-center justify-center mb-6"
                   style={{ borderRadius: '1px' }}>
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 outfit-bold">Personalized Care</h3>
              <p className="text-gray-700 outfit-regular leading-relaxed">
                Every interaction is tailored to your unique needs, creating a support system that evolves with your mental wellness journey.
              </p>
            </div>

            {/* Safe & Secure Card */}
            <div className="bg-white/95 backdrop-blur-sm p-8 border-1 border-gray-200 hover:shadow-xl transition-all duration-300"
                 style={{ borderRadius: '1px' }}>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 border-1 border-gray-300 flex items-center justify-center mb-6"
                   style={{ borderRadius: '1px' }}>
                 <img 
                    src="https://i.pinimg.com/originals/1a/a4/60/1aa4608ae3ec6562dc394ab747b26124.gif" 
                    alt="Voice Chat" 
                    className="w-full h-full object-cover"
                  />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                 
                </div>
                <h3 className="text-2xl font-bold text-black outfit-bold ml-[-16%] ">Voice chat</h3>
              </div>
              <p className="text-gray-700 outfit-regular leading-relaxed">
                voice chat with our AI , our AI will guide you through your mental wellness journey .
              </p>
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center mt-20"
          >
            <p className="text-white/90 text-lg outfit-regular mb-8">
              Join thousands of young people already transforming their mental wellness
            </p>
          </motion.div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 border-1 border-white/20" style={{ borderRadius: '1px' }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-white/10 border-1 border-white/20" style={{ borderRadius: '1px' }}></div>
        <div className="absolute bottom-20 left-20 w-20 h-20 bg-white/10 border-1 border-white/20" style={{ borderRadius: '1px' }}></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 bg-white/10 border-1 border-white/20" style={{ borderRadius: '1px' }}></div>
      </div>
    </div>
  );
};

export default GetStarted;