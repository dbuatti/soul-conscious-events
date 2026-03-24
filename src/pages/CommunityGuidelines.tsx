import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Ban, Handshake, MessageCircleWarning, ShieldCheck, AlertTriangle, Heart, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CommunityGuidelines = () => {
  return (
    <div className="w-full max-w-6xl px-4">
      <div className="mb-16 text-center space-y-4">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-[0.2em] uppercase">
          <ShieldCheck className="h-3 w-3 mr-2" /> Safe Space
        </div>
        <h1 className="text-5xl sm:text-6xl font-black font-heading tracking-tight text-foreground">Community Guidelines</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
          SoulFlow is a space dedicated to fostering personal growth, community connection, creativity, and well-being.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="organic-card rounded-[2.5rem] p-6 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-destructive flex items-center font-heading">
              <Ban className="mr-3 h-8 w-8" /> Not Allowed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
              <p className="text-lg"><span className="font-black">Hate speech</span>, discrimination, or violence toward any person or group is strictly prohibited.</p>
            </div>
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
              <p className="text-lg">Any intent to <span className="font-black">incite conflict</span>, aggression, or harm will result in immediate removal.</p>
            </div>
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
              <p className="text-lg">Primary <span className="font-black">political rallies</span>, protests, or campaigns are not the focus of this platform.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-6 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-green-600 flex items-center font-heading">
              <Handshake className="mr-3 h-8 w-8" /> We Welcome
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex gap-4">
              <Heart className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-lg">Events that bring people together in <span className="font-black">mutual respect</span> and shared understanding.</p>
            </div>
            <div className="flex gap-4">
              <Sparkles className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-lg">Gatherings encouraging <span className="font-black">self-expression</span>, creativity, and personal healing.</p>
            </div>
            <div className="flex gap-4">
              <Users className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-lg">Initiatives promoting <span className="font-black">harmony</span>, compassion, and community unity.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-8 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary flex items-center font-heading">
              <ListChecks className="mr-3 h-8 w-8 text-primary" /> Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed text-lg">
            <p>
              All submissions are reviewed by our team and may be declined at our discretion to ensure they align with our mission and these guidelines. We reserve the right to remove any content that compromises the safety or spirit of the community.
            </p>
          </CardContent>
        </Card>

        <Card className="organic-card rounded-[2.5rem] p-8 md:col-span-2 bg-secondary/30 border-dashed text-center">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-foreground flex items-center justify-center font-heading">
              <MessageCircleWarning className="mr-3 h-8 w-8 text-accent" /> Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed space-y-6 max-w-2xl mx-auto">
            <p className="text-lg">
              If you encounter any content or events that violate these guidelines, please let us know. Your help keeps SoulFlow a safe and positive community.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-2xl px-10 py-8 text-xl font-black shadow-xl transition-transform hover:scale-105">
              <Link to="/contact">
                Contact Us to Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommunityGuidelines;