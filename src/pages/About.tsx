import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, CalendarDays, Heart, MessageSquare, Compass, Users, Search, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

const About = () => {
  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-16 text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] uppercase">
          <Sparkles className="h-3 w-3 mr-2" /> Our Story
        </div>
        <h1 className="text-5xl sm:text-7xl font-black font-heading tracking-tight text-foreground">About SoulFlow</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
          SoulFlow was born from a simple desire: to find and share the moments that make us feel truly alive.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="organic-card rounded-[2.5rem] p-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <Compass className="mr-3 h-8 w-8 text-primary" /> The Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-4 text-lg">
            <p>
              I created SoulFlow as a sanctuary for heart-centred events across Australia. My hope is for this to become a living, breathing hub for intentional connection—a space where you can discover gatherings that feel aligned, heartfelt, and authentic.
            </p>
            <p>
              In a world that can often feel noisy or disconnected, I believe that shared experiences—singing together, moving together, meditating, and learning—have the power to remind us of our shared humanity.
            </p>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <Users className="mr-3 h-8 w-8 text-primary" /> Your Journey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <div className="flex gap-5 group">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-foreground">Discover the Unseen</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Browse a curated collection of soulful gatherings, from deep sound journeys to intimate community circles.
                </p>
              </div>
            </div>

            <div className="flex gap-5 group">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-foreground">Plan with Intention</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Use our calendar and map views to see what’s vibrating in your area this week or month.
                </p>
              </div>
            </div>

            <div className="flex gap-5 group">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xl text-foreground">Share Your Magic</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Easily contribute your own events to the community using our AI-powered submission helper.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-8 md:col-span-2">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-primary flex items-center justify-center font-heading">
              <Heart className="mr-3 h-10 w-10 text-primary" /> SoulFlow x HeartBeats
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed flex flex-col items-center text-center max-w-4xl mx-auto">
            <img
              src="/heartbeats-logo.png"
              alt="HeartBeats Logo"
              className="h-32 w-auto mb-8 object-contain rounded-2xl"
            />
            <p className="text-xl mb-8 leading-relaxed">
              We are proud to collaborate with <span className="font-bold">HeartBeats</span>—a collective dedicated to celebrating expression, music, growth, and connection. If you’re promoting your event on Instagram, tag <span className="font-black text-primary">@heartbeatslive</span>. They love amplifying community events that align with the spirit of conscious gathering.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-10 py-8 text-xl font-black shadow-xl transition-transform hover:scale-105">
              <a href="https://www.instagram.com/heartbeatslive" target="_blank" rel="noopener noreferrer">
                Follow the Vibration
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-8 md:col-span-2 bg-secondary/30 border-dashed">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground flex items-center font-heading">
              <MessageSquare className="mr-3 h-8 w-8 text-accent" /> A Co-Created Space
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-6 text-lg">
            <p>
              SoulFlow is currently a prototype—a project I’m building and learning from in real-time. Your feedback is the compass that helps this platform grow and evolve.
            </p>
            <p>
              If you have suggestions, ideas, or spot something that could be improved, please reach out through the{' '}
              <Link to="/contact" className="text-primary hover:underline font-black">
                Contact page
              </Link>. Every message helps us build a better home for the community.
            </p>
            <div className="pt-8 text-center">
              <p className="font-heading text-3xl text-primary font-bold italic">Warmly, Daniele</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;