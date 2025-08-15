import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Ban, Handshake, MessageCircleWarning } from 'lucide-react'; // Added MessageCircleWarning icon
import { Button } from '@/components/ui/button'; // Import Button

const CommunityGuidelines = () => {
  return (
    <div className="w-full max-w-screen-lg">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">SoulFlow Community Guidelines</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        SoulFlow is a space dedicated to fostering personal growth, community connection, creativity, and well-being. To ensure a positive and respectful environment for everyone, we've established these guidelines.
      </p>

      <div className="space-y-8">
        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <Ban className="mr-3 h-6 w-6 text-destructive" /> We Don't Allow Events That:
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed">
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li><span className="font-semibold">Promote hate speech, discrimination, or violence</span> toward any person or group.</li>
              <li><span className="font-semibold">Intend to incite conflict, aggression, or harm.</span></li>
              <li>Are primarily <span className="font-semibold">political rallies, protests, or campaigns.</span></li>
              <li>Include content that is <span className="font-semibold">unsafe, abusive, or violates local laws.</span></li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <Handshake className="mr-3 h-6 w-6 text-green-500" /> We Welcome Events That:
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed">
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li><span className="font-semibold">Bring people together in mutual respect.</span></li>
              <li><span className="font-semibold">Encourage self-expression, creativity, healing, and understanding.</span></li>
              <li><span className="font-semibold">Promote harmony, compassion, and unity.</span></li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <ListChecks className="mr-3 h-6 w-6 text-blue-500" /> Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed">
            <p>
              All submissions are reviewed by our team and may be declined at our discretion to ensure they align with our mission and these guidelines.
            </p>
          </CardContent>
        </Card>

        {/* New section for reporting issues */}
        <Card className="shadow-lg rounded-lg dark:bg-secondary dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center">
              <MessageCircleWarning className="mr-3 h-6 w-6 text-yellow-500" /> Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground leading-relaxed text-center">
            <p className="mb-4">
              If you encounter any content or events that violate these guidelines, please let us know. Your help keeps SoulFlow a safe and positive community.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105">
              <Link to="/contact">
                Contact Us to Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 text-center text-muted-foreground">
        <p>
          Thank you for helping us cultivate a supportive and inspiring community on SoulFlow!
        </p>
      </div>
    </div>
  );
};

export default CommunityGuidelines;