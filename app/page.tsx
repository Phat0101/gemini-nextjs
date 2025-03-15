"use client";

import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';

export default function Home() {
  const { user, isLoaded } = useUser();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <header className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Interview Assistant
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
            Instant answers to any question during live interviews. Guaranteed to land your dream job.
          </p>
          <div className="flex flex-col items-center gap-4">
            <SignedIn>
              {isLoaded && user && (
                <p className="text-xl text-gray-800 font-medium mb-2">
                  Welcome back, {user.firstName || 'there'}!
                </p>
              )}
              <Link 
                href="/live-chat" 
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition duration-300 shadow-lg hover:shadow-xl"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <div className="flex gap-4">
                <Link 
                  href="/sign-up" 
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition duration-300 shadow-lg hover:shadow-xl"
                >
                  Sign Up
                </Link>
                <Link 
                  href="/sign-in" 
                  className="px-8 py-3 bg-white hover:bg-gray-100 text-blue-600 border border-blue-600 rounded-lg font-medium transition duration-300"
                >
                  Sign In
                </Link>
              </div>
            </SignedOut>
          </div>
        </div>
        
        <div className="relative w-full h-64 md:h-96 bg-gray-100 rounded-xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-300 h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Features Section */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Our Platform?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Job-Winning Interview Answers</h3>
              <p className="text-gray-600">Understand the true intent behind interview questions with advanced AI insights.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Speech Recognition</h3>
              <p className="text-gray-600">Experience seamless interaction with under 1 second latency and personalized answers.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Robust Privacy</h3>
              <p className="text-gray-600">Fully undetectable and unnoticeable by interviewers across all types of interviews.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="px-4 py-16">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Proven Results</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="text-5xl font-bold text-blue-600 mb-2">96%</div>
              <div className="text-xl text-gray-600">Interview Success Rate</div>
            </div>
            
            <div className="p-6">
              <div className="text-5xl font-bold text-blue-600 mb-2">7000+</div>
              <div className="text-xl text-gray-600">Interviews Aced</div>
            </div>
            
            <div className="p-6">
              <div className="text-5xl font-bold text-blue-600 mb-2">1500+</div>
              <div className="text-xl text-gray-600">Job Offers</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="relative p-6 bg-white rounded-lg shadow-md">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
              <h3 className="text-xl font-semibold mb-2 mt-4">Upload Your Information</h3>
              <p className="text-gray-600">Input your resume and job information for personalized responses.</p>
            </div>
            
            <div className="relative p-6 bg-white rounded-lg shadow-md">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
              <h3 className="text-xl font-semibold mb-2 mt-4">Try AI in Our Playground</h3>
              <p className="text-gray-600">Experiment with our AI to understand its capabilities.</p>
            </div>
            
            <div className="relative p-6 bg-white rounded-lg shadow-md">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
              <h3 className="text-xl font-semibold mb-2 mt-4">Configure Settings</h3>
              <p className="text-gray-600">Fine-tune parameters to customize the tone of your responses.</p>
            </div>
            
            <div className="relative p-6 bg-white rounded-lg shadow-md">
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
              <h3 className="text-xl font-semibold mb-2 mt-4">Sit Back and Interview</h3>
              <p className="text-gray-600">Let our AI handle the hard work to help you land the job.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What Our Customers Say</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">
                &quot;AI is a game changer for folks interested in switching careers. I haven&apos;t interviewed in years and was really nervous. I switched from a sales associate to a supply chain manager all because of this platform.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                <div>
                  <div className="font-semibold">D.A.</div>
                  <div className="text-sm text-gray-500">Supply Chain Manager @ Walmart</div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">
                &quot;This tool is magical. Its answers for my finance technical questions were even better than my interview guides, especially because it always tailors the answer to the question.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                <div>
                  <div className="font-semibold">J.B.</div>
                  <div className="text-sm text-gray-500">Investment Banking Analyst @ Goldman Sachs</div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 mb-4">
                &quot;Harvard was my dream school so I knew I couldn&apos;t mess up my online interviews. This AI gave me the confidence to ace the interviews with ease!&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                <div>
                  <div className="font-semibold">A.B.</div>
                  <div className="text-sm text-gray-500">Research Assistant @ Harvard University</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="px-4 py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Ace Your Next Interview?</h2>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Join thousands of job seekers who have successfully landed their dream jobs.
          </p>
          <SignedIn>
            <Link 
              href="/live-chat" 
              className="px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 rounded-lg font-medium text-lg transition duration-300 shadow-lg hover:shadow-xl inline-block"
            >
              Go to Dashboard
            </Link>
          </SignedIn>
          <SignedOut>
            <Link 
              href="/sign-up" 
              className="px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 rounded-lg font-medium text-lg transition duration-300 shadow-lg hover:shadow-xl inline-block"
            >
              Get Started Now
            </Link>
          </SignedOut>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="px-4 py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">About Us</h3>
              <p>
                We provide AI-powered interview assistance to help job seekers land their dream jobs with confidence.
              </p>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2">
                <li><Link href="/live-chat" className="hover:text-white transition duration-300">Interview Assistant</Link></li>
                <li><Link href="/live-chat" className="hover:text-white transition duration-300">Resume Builder</Link></li>
                <li><Link href="/live-chat" className="hover:text-white transition duration-300">Mock Interviews</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/live-chat" className="hover:text-white transition duration-300">Blog</Link></li>
                <li><Link href="/live-chat" className="hover:text-white transition duration-300">Tutorials</Link></li>
                <li><Link href="/live-chat" className="hover:text-white transition duration-300">FAQ</Link></li>
                <li><Link href="/live-chat" className="hover:text-white transition duration-300">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li>Email: support@example.com</li>
                <li>Follow us on social media</li>
              </ul>
              <div className="flex space-x-4 mt-4">
                <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <p>&copy; {new Date().getFullYear()} AI Interview Assistant. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 