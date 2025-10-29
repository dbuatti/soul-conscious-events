import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, CalendarDays, MapPin, PlusCircle, Edit, MessageSquare, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const About = () => {
  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">About SoulFlow</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        Hi, I’m Daniele — and I created SoulFlow as a space to bring together soulful, heart-centred events from across Australia.
      </p>
      <p className="text-lg text-foreground mb-8 text-center leading-relaxed">
        I’ve often found it tricky to keep track of all the incredible workshops, meditations, concerts, and gatherings happening around us — especially the ones that truly nourish the soul. SoulFlow was born out of that desire: to make it easier to find, share, and connect through meaningful experiences.
      </p>

      <div className="space-y-8">
        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <Sparkles className="mr-3 h-6 w-6 text-primary" /> My Vision for SoulFlow
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed">
            <p className="mb-4">
              My hope is for SoulFlow to become a living, breathing hub for connection and inspiration — a space where you can discover events that feel aligned, heartfelt, and authentic.
            </p>
            <p>
              In a world that can sometimes feel noisy or disconnected, I believe that shared experiences — singing together, moving together, meditating, learning — have the power to remind us of our humanity and bring us back to what really matters.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <CalendarDays className="mr-3 h-6 w-6 text-primary" /> What You Can Do on SoulFlow
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-4">
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Find events:</span> Browse a curated list of upcoming soulful gatherings — from sound journeys and yoga sessions to artistic performances and community circles.
            </p>
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Use the calendar view:</span> See what’s coming up this week or month at a glance.
            </p>
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Share your own events:</span> If you run or host events, you can easily add them to SoulFlow. I’ve built an AI-powered helper to make filling in event details super simple.
            </p>
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Manage your listings:</span> Once you create an account, you can edit or remove your events anytime.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <Heart className="mr-3 h-6 w-6 text-primary" /> SoulFlow x HeartBeats
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed flex flex-col items-center text-center">
            <img
              src="/heartbeats-logo.png"
              alt="HeartBeats Logo"
              className="h-24 w-auto mb-4 object-contain rounded-lg"
            />
            <p className="mb-4">
              I’m really excited to be collaborating with HeartBeats — a collective that hosts events celebrating expression, music, growth, and connection. If you’re promoting your event on Instagram, tag <span className="font-semibold text-primary">@heartbeatslive</span> — they love resharing community events that align with the same spirit.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
              <a href="https://www.instagram.com/heartbeatslive" target="_blank" rel="noopener noreferrer">
                Follow HeartBeats on Instagram
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <MessageSquare className="mr-3 h-6 w-6 text-yellow-500" /> A Work in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed">
            <p className="mb-4">
              SoulFlow is still a prototype — something I’m building and learning from as I go. You might notice a few quirks here and there, but that’s part of the creative process!
            </p>
            <p className="mb-4">
              Your feedback honestly means the world to me. It helps shape how this platform grows and evolves. If you have suggestions, ideas, or spot something that could be improved, please reach out through the{' '}
              <Link to="/contact" className="text-primary hover:underline font-medium">
                Contact page
              </Link>.
            </p>
            <p className="mt-4 text-center font-medium">
              Thank you for being here, for exploring, and for supporting this vision. I hope SoulFlow helps you find your people, your practice, and your flow.
            </p>
            <p className="mt-4 text-center font-semibold text-primary">
              Warmly,<br />Daniele
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;