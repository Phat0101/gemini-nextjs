"use client";

import React from 'react';
import Sidebar from '../components/Sidebar';

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 h-full overflow-auto">
        {children}
      </div>
    </div>
  );
} 