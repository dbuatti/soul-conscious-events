import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, CalendarDays, Heart, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const About = () => {
  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-16 text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] uppercase">
          <Sparkles className="h-3 w-3 mr-2" /> Our Story
        </div>
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">About SoulFlow</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
          Hi, I’m Daniele — and I created SoulFlow as a space to bring together soulful, heart-centred events from across Australia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="organic-card rounded-[2.5rem] p-4">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <Sparkles className="mr-3 h-8 w-8 text-primary" /> My Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-4 text-lg">
            <p>
              My hope is for SoulFlow to become a living, breathing hub for connection and inspiration — a space where you can discover events that feel aligned, heartfelt, and authentic.
            </p>
            <p>
              In a world that can sometimes feel noisy or disconnected, I believe that shared experiences — singing together, moving together, meditating, learning — have the power to remind us of our humanity.
            </p>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-4">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <CalendarDays className="mr-3 h-8 w-8 text-primary" /> What You Can Do
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-4 text-lg">
            <p className="flex items-start">
              <span className="font-black text-primary mr-3">•</span> Browse a curated list of upcoming soulful gatherings — from sound journeys to community circles.
            </p>
            <p className="flex items-start">
              <span className="font-black text-primary mr-3">•</span> Use the calendar view to see what’s coming up this week or month at a glance.
            </p>
            <p className="flex items-start">
              <span className="font-black text-primary mr-3">•</span> Share your own events easily with our AI-powered helper.
            </p>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-4 md:col-span-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center font-heading">
              <Heart className="mr-3 h-8 w-8 text-primary" /> SoulFlow x HeartBeats
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed flex flex-col items-center text-center max-w-3xl mx-auto">
            <img
              src="/heartbeats-logo.png"
              alt="HeartBeats Logo"
              className="h-32 w-auto mb-8 object-contain rounded-2xl"
            />
            <p className="text-lg mb-8">
              I’m really excited to be collaborating with HeartBeats — a collective that hosts events celebrating expression, music, growth, and connection. If you’re promoting your event on Instagram, tag <span className="font-black text-primary">@heartbeatslive</span> — they love resharing community events that align with the same spirit.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-8 py-6 text-lg font-black shadow-xl transition-transform hover:scale-105">
              <a href="https://www.instagram.com/heartbeatslive" target="_blank" rel="noopener noreferrer">
                Follow HeartBeats
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-4 md:col-span-2 bg-secondary/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground flex items-center font-heading">
              <MessageSquare className="mr-3 h-8 w-8 text-accent" /> A Work in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-4 text-lg">
            <p>
              SoulFlow is still a prototype — something I’m building and learning from as I go. Your feedback honestly means the world to me. It helps shape how this platform grows and evolves.
            </p>
            <p>
              If you have suggestions, ideas, or spot something that could be improved, please reach out through the{' '}
              <Link to="/contact" className="text-primary hover:underline font-black">
                Contact page
              </Link>.
            </p>
            <div className="pt-8 text-center">
              <p className="font-heading text-2xl text-primary font-bold">Warmly, Daniele</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;