// app/page.tsx
"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import CameraPreview from './components/CameraPreview';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Helper function to create message components
const HumanMessage = ({ text }: { text: string }) => (
  <div className="flex gap-3 items-start">
    <Avatar className="h-8 w-8">
      <AvatarImage src="/avatars/human.png" alt="Human" />
      <AvatarFallback>H</AvatarFallback>
    </Avatar>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-zinc-900">You</p>
      </div>
      <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800">
        {text}
      </div>
    </div>
  </div>
);

const GeminiMessage = ({ text }: { text: string }) => (
  <div className="flex gap-3 items-start">
    <Avatar className="h-8 w-8 bg-blue-600">
      <AvatarImage src="/avatars/gemini.png" alt="Gemini" />
      <AvatarFallback>AI</AvatarFallback>
    </Avatar>
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-zinc-900">Assistant</p>
      </div>
      <div className="rounded-lg bg-white border border-zinc-200 px-3 py-2 text-sm text-zinc-800">
        {text}
      </div>
    </div>
  </div>
);

export default function Home() {
  const [messages, setMessages] = useState<{ type: 'human' | 'gemini', text: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const handleTranscription = useCallback((transcription: string) => {
    setMessages(prev => [...prev, { type: 'gemini', text: transcription }]);
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set initial height for the chat container
  useEffect(() => {
    const adjustHeight = () => {
      if (chatContainerRef.current) {
        const viewportHeight = window.innerHeight;
        const containerTop = chatContainerRef.current.getBoundingClientRect().top;
        const padding = 32; // Bottom padding
        
        // Calculate available height
        const availableHeight = viewportHeight - containerTop - padding;
        
        // Set max height to available height, but not less than 300px
        chatContainerRef.current.style.maxHeight = `${Math.max(300, availableHeight)}px`;
        
        // On small screens, set a minimum height when in stacked layout
        if (window.innerWidth < 1024) { // lg breakpoint
          chatContainerRef.current.style.minHeight = '35vh';
        } else {
          chatContainerRef.current.style.minHeight = 'auto';
        }
      }
    };

    // Initial adjustment
    adjustHeight();
    
    // Adjust on resize
    window.addEventListener('resize', adjustHeight);
    
    return () => {
      window.removeEventListener('resize', adjustHeight);
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col min-h-screen">
      <header className="py-4 px-4 sm:py-6 sm:px-6 md:px-8 border-b border-zinc-200 bg-white shrink-0">
        <h1 className="text-xl sm:text-3xl font-bold text-zinc-800">
          Gemini Live Chat
        </h1>
        <p className="text-sm sm:text-base text-zinc-500 mt-1">Talk with Gemini using your camera and microphone</p>
      </header>
      
      <main className="p-3 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 sm:gap-6 bg-zinc-50 flex-grow">
        {/* Camera Preview */}
        <div className="flex justify-center lg:max-h-screen">
          <CameraPreview onTranscription={handleTranscription} />
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full max-h-[calc(100vh-12rem)] sm:max-h-[calc(100vh-10rem)] lg:max-h-[80vh]"
        >
          <div className="p-3 sm:p-4 border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
            <h2 className="font-semibold text-zinc-900">Chat Transcript</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
            <GeminiMessage text="Hi! I'm your AI assistant. I can see and hear you. Let's chat!" />
            {messages.map((message, index) => (
              message.type === 'human' ? (
                <HumanMessage key={`msg-${index}`} text={message.text} />
              ) : (
                <GeminiMessage key={`msg-${index}`} text={message.text} />
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
}
