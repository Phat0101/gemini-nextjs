"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageSquare, User, Video, X } from "lucide-react";

const navItems = [
  {
    name: "Live Chat",
    href: "/live-chat",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    name: "Live Interview",
    href: "/live-interview",
    icon: <Video className="h-5 w-5" />,
  },
  // Add more navigation items as needed
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  // Close sidebar when changing routes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar");
      const hamburger = document.getElementById("hamburger-menu");
      
      if (
        sidebar && 
        hamburger && 
        !sidebar.contains(event.target as Node) && 
        !hamburger.contains(event.target as Node) && 
        isOpen
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  
  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);
  
  return (
    <>
      {/* Mobile hamburger button */}
      <button
        id="hamburger-menu"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white/70 shadow-md text-zinc-700 hover:bg-zinc-100/70 transition-colors duration-200"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      
      {/* Mobile overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}
      
      {/* Sidebar */}
      <div
        id="sidebar"
        className={`fixed lg:sticky top-0 left-0 z-40 h-full w-64 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full bg-white border-r border-zinc-200 shadow-sm flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-zinc-200">
            <Link href="/" className="flex items-center gap-2">
              <User className="h-8 w-8 rounded-full bg-blue-500 text-white p-1.5" />
              <span className="font-bold text-xl text-zinc-800">Gemini App</span>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-5 bg-blue-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className="p-4 text-sm text-zinc-500 border-t border-zinc-200">
            <p>© {new Date().getFullYear()} Gemini App</p>
          </div>
        </div>
      </div>
    </>
  );
} 