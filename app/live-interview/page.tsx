"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import InterviewScreenPreview from './InterviewScreenPreview';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Laptop, Mic, Eye, EyeOff, ScreenShare } from "lucide-react";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { Button } from "@/components/ui/button";

// Custom styling for the MarkdownPreview component
const markdownStyle = {
  // Override default markdown styling
  backgroundColor: 'transparent',
  fontSize: 'inherit',
  lineHeight: '1.5',
  color: 'inherit',
  // Make sure links stand out
  '--color-primary': '#3b82f6', // Using blue-500 color
  // Adjust code blocks
  '--color-fg-default': '#1f2937', // Using gray-800
  '--color-canvas-subtle': '#f3f4f6', // Using gray-100
  '--color-border-default': '#e5e7eb', // Using gray-200
  // Smaller padding for elements to match our compact UI
  '--margin-block': '0.75rem'
};

// Helper function to create message components
const UserMessage = ({ text }: { text: string }) => (
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
        <MarkdownPreview source={text} className="!bg-transparent !p-0" style={markdownStyle} />
      </div>
    </div>
  </div>
);

const AIMessage = ({ text }: { text: string }) => (
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
        <MarkdownPreview source={text} className="!bg-transparent !p-0" style={markdownStyle} />
      </div>
    </div>
  </div>
);

const SystemMessage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center py-2">
    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm max-w-[80%] text-center">
      {children}
    </div>
  </div>
);

export default function InterviewPage() {
  const [messages, setMessages] = useState<{ type: 'user' | 'ai' | 'system', text: string }[]>([
    { 
      type: 'system', 
      text: 'Welcome to the interview answer assistant. Share your screen with interview questions or speak questions to get helpful answers.' 
    },
    { 
      type: 'ai', 
      text: "## How to Use This Assistant\n\nI'll help you prepare for interviews by suggesting answers. Here's how to use me effectively:\n\n- **Ask me interview questions** like \"Tell me about yourself\" or \"What's your greatest weakness?\"\n- **Practice your answers** after seeing my suggestions\n- **Show me interview questions** on your screen\n\nI'll only respond with answer suggestions when I hear an actual question. When you're practicing your own answer, I'll listen without interrupting.\n\nLet's start! What interview question would you like help with?" 
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  
  const handleTranscription = useCallback((transcription: string) => {
    if (transcription.trim()) {
      setMessages(prev => [...prev, { type: 'user', text: transcription }]);
    }
  }, []);
  
  const handleModelResponse = useCallback((response: string) => {
    // Always add a new AI message for each response
    setMessages(prev => {
      // Check if this is simply updating the exact same message (streaming updates)
      const lastMessage = prev[prev.length - 1];
      
      // If the last message is from the AI and we're receiving a longer version of it,
      // this is likely a streaming update, so replace the message
      if (lastMessage && 
          lastMessage.type === 'ai' && 
          response.startsWith(lastMessage.text.substring(0, 50))) {
        return [
          ...prev.slice(0, prev.length - 1),
          { type: 'ai', text: response }
        ];
      }
      
      // Otherwise, add a completely new message
      return [...prev, { type: 'ai', text: response }];
    });
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
        const padding = 24; // Bottom padding
        
        // Calculate available height
        const availableHeight = viewportHeight - containerTop - padding;
        
        // Set max height to available height, but not less than 300px
        chatContainerRef.current.style.maxHeight = `${Math.max(300, availableHeight)}px`;
        
        // On small screens, set a minimum height when in stacked layout
        if (window.innerWidth < 1024) { // lg breakpoint
          // Make the chat take more space on mobile when stacked
          chatContainerRef.current.style.minHeight = window.innerHeight < 700 ? '30vh' : '35vh';
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
    <div className="w-full h-full">
      <header className="py-4 px-4 sm:py-6 sm:px-6 border-b border-zinc-200 bg-white text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-800">
          Interview Answer Assistant
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Share interview questions and get help crafting excellent answers
        </p>
      </header>
      
      <main className={`p-4 sm:p-6 grid grid-cols-1 ${isPreviewVisible ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4 sm:gap-6 bg-zinc-50`}>
        {/* Toggle button for screen preview visibility */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsPreviewVisible(!isPreviewVisible)}
          className="absolute top-4 right-4 z-10 flex items-center gap-2"
        >
          {isPreviewVisible ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">Hide Preview</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Show Preview</span>
            </>
          )}
        </Button>

        {/* Screen Capture Preview - hidden but still functional when isPreviewVisible is false */}
        <div className={`flex justify-center ${!isPreviewVisible ? 'hidden' : ''}`}>
          <InterviewScreenPreview 
            onTranscription={handleTranscription}
            onModelResponse={handleModelResponse}
          />
        </div>

        {/* Chat Messages - takes full width when preview is hidden */}
        <div 
          ref={chatContainerRef}
          className={`bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full max-h-[calc(100vh-12rem)] sm:max-h-[calc(100vh-10rem)] lg:max-h-[80vh] ${!isPreviewVisible ? 'lg:col-span-1 mx-auto w-full max-w-5xl' : ''}`}
        >
          <div className="p-3 sm:p-4 border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Conversation History</h2>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="flex items-center gap-1"><Laptop className="h-3 w-3" /> Screen</div>
                <div className="flex items-center gap-1"><Mic className="h-3 w-3" /> Voice</div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
            {messages.map((message, index) => (
              message.type === 'user' ? (
                <UserMessage key={`msg-${index}`} text={message.text} />
              ) : message.type === 'ai' ? (
                <AIMessage key={`msg-${index}`} text={message.text} />
              ) : (
                <SystemMessage key={`msg-${index}`}>{message.text}</SystemMessage>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Hidden preview indicator when preview is not visible */}
        {!isPreviewVisible && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-3 shadow-lg z-20 flex items-center gap-2">
            <ScreenShare className="h-5 w-5" />
            <span className="text-sm font-medium">Screen Sharing Active</span>
          </div>
        )}
      </main>
    </div>
  );
}