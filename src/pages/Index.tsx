import React from 'react';

export const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
      <h1 className="text-4xl font-bold text-primary mb-4">Welcome to SoulFlow!</h1>
      <p className="text-lg text-muted-foreground mb-8">Discover and share soulful events across Australia.</p>
      <p className="text-md text-foreground">This is your main landing page. You can customize its content here.</p>
    </div>
  );
};