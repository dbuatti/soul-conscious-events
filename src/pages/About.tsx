import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, CalendarDays, MapPin, PlusCircle, Edit, MessageSquare, Heart } from 'lucide-react'; // Added Heart icon
import { Button } from '@/components/ui/button'; // Import Button

const About = () => {
  return (
    <div className="w-full max-w-screen-lg">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">About SoulFlow</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        SoulFlow is a new web application designed to be a central hub for discovering and connecting with soul-nourishing events across Australia.
      </p>

      <div className="space-y-8">
        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <Sparkles className="mr-3 h-6 w-6 text-primary" /> Our Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed">
            <p className="mb-4">
              The vision for SoulFlow is to create a vibrant, accessible space where individuals can easily find and share events that foster connection, personal growth, and overall well-being. In a world that can often feel disconnected, we believe in the power of shared experiences to uplift and inspire.
            </p>
            <p>
              We aim to simplify the process of discovering meaningful gatherings, from intimate workshops and serene meditation sessions to lively community events and unique artistic performances. SoulFlow is built on the idea that finding your flow, your community, and your next enriching experience should be effortless.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <CalendarDays className="mr-3 h-6 w-6 text-primary" /> What You Can Do
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-4">
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Explore Events:</span> Browse a curated list of upcoming soulful events, with options to filter by type, location, and date range.
            </p>
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Calendar View:</span> Visualize events laid out on an interactive calendar, making it easy to plan your week or month at a glance.
            </p>
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Interactive Map:</span> Discover events geographically with our map feature, helping you find what's happening nearby.
            </p>
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Submit Events:</span> If you're an event organizer, you can easily add your own events to the platform. We even have an AI-powered tool to help you fill out the details quickly!
            </p>
            <p className="flex items-start">
              <span className="font-medium mr-2 min-w-[100px]">Manage Events:</span> Create an account to gain the ability to edit or delete the events you've submitted, giving you full control over your listings.
            </p>
          </CardContent>
        </Card>

        {/* New subtle cross-collaboration section */}
        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <Heart className="mr-3 h-6 w-6 text-primary" /> SoulFlow x HeartBeats
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed flex flex-col items-center text-center">
            {/* Placeholder for logo - if you provide a logo, we can replace this div with an <img> tag */}
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground text-sm border border-border">
              HeartBeats Logo
            </div>
            <p className="mb-4">
              We're thrilled to collaborate with HeartBeats, bringing you heartfelt open mic events that foster music, expression, and community connection.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
              <a href="https://www.instagram.com/heartbeatslive" target="_blank" rel="noopener noreferrer">
                Learn More about HeartBeats
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <MessageSquare className="mr-3 h-6 w-6 text-primary" /> Prototype & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed">
            <p className="mb-4">
              SoulFlow is currently a prototype, and it's an ongoing learning experience for me as an aspiring app developer. This means you might encounter a few quirks, and some features are still evolving. Your patience and understanding are greatly appreciated!
            </p>
            <p>
              Your feedback is incredibly valuable in shaping the future of SoulFlow. If you have any suggestions, recommendations, or encounter any issues, please don't hesitate to reach out. You can visit our dedicated{' '}
              <Link to="/contact" className="text-primary hover:underline font-medium">
                Contact Us
              </Link>{' '}
              page to share your thoughts.
            </p>
            <p className="mt-4 text-center font-medium">
              Thank you for being a part of the SoulFlow journey!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;