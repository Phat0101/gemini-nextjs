"use client";
import { useState, useCallback, useEffect, useRef } from 'react';
import InterviewScreenPreview from './InterviewScreenPreview';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Laptop, Mic, Eye, EyeOff, ScreenShare, AlertTriangle, CreditCard } from "lucide-react";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  <div className="flex gap-2 items-start">
    {/* <Avatar className="h-8 w-8 bg-blue-600">
      <AvatarImage src="/avatars/gemini.png" alt="Gemini" />
      <AvatarFallback>AI</AvatarFallback>
    </Avatar> */}
    <div className="flex-1 space-y-2">
      {/* <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-zinc-900">Assistant</p>
      </div> */}
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
  const router = useRouter();
  const [messages, setMessages] = useState<{ type: 'user' | 'ai' | 'system', text: string }[]>([
    { 
      type: 'system', 
      text: 'Welcome to the interview answer assistant. Share your screen with interview questions or speak questions to get helpful answers.' 
    },
    { 
      type: 'ai', 
      text: "## How to Use This Assistant\n\nI'll help you ace your interview by suggesting answers. Here's how to use me effectively:\n\n- **Ask me interview questions** like \"Tell me about yourself\" or \"What's your greatest weakness?\"\n- **Practice your answers** after seeing my suggestions\n- **Show me interview questions** on your screen\n\nI'll only respond with answer suggestions when I hear an actual question. When you're practicing your own answer, I'll listen without interrupting.\n\nLet's start! What interview question would you like help with?" 
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [streamingStatus, setStreamingStatus] = useState({
    isStreaming: false,
    isScreenSharing: false,
    isAudioOnly: false
  });
  
  // Credit state
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch user credits on page load
  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        setIsLoadingCredits(true);
        const response = await fetch('/api/subscription');
        
        if (!response.ok) {
          if (response.status === 401) {
            // User is not authenticated, redirect to sign in
            router.push('/sign-in');
            return;
          }
          throw new Error('Failed to fetch subscription details');
        }
        
        const data = await response.json();
        const credits = data.data?.credits || 0;
        setUserCredits(credits);
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError('Unable to load your subscription information');
        setUserCredits(0);
      } finally {
        setIsLoadingCredits(false);
      }
    };
    
    fetchUserCredits();
  }, [router]);
  
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
  
  const handleStreamingStatusChange = useCallback((status: { 
    isStreaming: boolean; 
    isScreenSharing: boolean; 
    isAudioOnly: boolean 
  }) => {
    setStreamingStatus(status);
  }, []);
  
  // Handle credit updates from the InterviewScreenPreview component
  const handleCreditUpdate = useCallback((newCredits: number) => {
    setUserCredits(newCredits);
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

  // Show loading state
  if (isLoadingCredits) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-zinc-600">Loading your interview session...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 p-8 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-zinc-800">Something went wrong</h1>
          <p className="text-zinc-600">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show insufficient credits state
  if (userCredits !== null && userCredits <= 0) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center">
          <div className="p-3 rounded-full bg-amber-100">
            <CreditCard className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-zinc-800">Insufficient Credits</h1>
          <p className="text-zinc-600">
            You need interview credits to use this feature. Please upgrade your subscription to continue.
          </p>
          <div className="flex gap-3 mt-2">
            <Link href="/settings" passHref>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Upgrade Subscription
              </Button>
            </Link>
            <Link href="/" passHref>
              <Button variant="outline">
                Go to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <header className="py-4 px-4 sm:py-6 sm:px-6  border-zinc-200 bg-white text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-800">
          AI Interview Partner
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ace your interview with the help of cutting-edge AI
        </p>
        {/* Credits indicator */}
        {userCredits !== null && (
          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700">
            <CreditCard className="h-3 w-3" />
            {userCredits.toFixed(2)} interview credits remaining
          </div>
        )}
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
            onStatusChange={handleStreamingStatusChange}
            userCredits={userCredits || 0}
            onCreditUpdate={handleCreditUpdate}
          />
        </div>

        {/* Chat Messages - takes full width when preview is hidden */}
        <div 
          ref={chatContainerRef}
          className={`bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full max-h-[calc(100vh-12rem)] sm:max-h-[calc(100vh-10rem)] lg:max-h-[80vh] ${!isPreviewVisible ? 'lg:col-span-1 mx-auto w-full max-w-6xl' : ''}`}
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
        {!isPreviewVisible && streamingStatus.isStreaming && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-3 shadow-lg z-20 flex items-center gap-2">
            {streamingStatus.isScreenSharing ? (
              <>
                <ScreenShare className="h-5 w-5" />
                <span className="text-sm font-medium">Screen Sharing Active</span>
              </>
            ) : streamingStatus.isAudioOnly ? (
              <>
                <Mic className="h-5 w-5" />
                <span className="text-sm font-medium">Audio Only Mode Active</span>
              </>
            ) : (
              <>
                <ScreenShare className="h-5 w-5" />
                <span className="text-sm font-medium">Preparing Stream...</span>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}