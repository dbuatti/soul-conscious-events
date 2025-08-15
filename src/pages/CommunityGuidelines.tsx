import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Ban, Handshake } from 'lucide-react';

const CommunityGuidelines = () => {
  return (
    <div className="w-full max-w-screen-lg">
      <h1 className="text-4xl font-bold text-foreground mb-6 text-center">SoulFlow Community Guidelines</h1>
      <p className="text-xl text-muted-foreground mb-8 text-center leading-relaxed">
        SoulFlow is here to uplift, connect, and inspire. All events listed should align with our vision of fostering personal growth, community connection, creativity, and well-being.
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
              <li>Promote hate speech, discrimination, or violence toward any person or group.</li>
              <li>Intend to incite conflict, aggression, or harm.</li>
              <li>Are primarily political rallies, protests, or campaigns.</li>
              <li>Include content that is unsafe, abusive, or violates local laws.</li>
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
              <li>Bring people together in mutual respect.</li>
              <li>Encourage self-expression, creativity, healing, and understanding.</li>
              <li>Promote harmony, compassion, and unity.</li>
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
              All submissions are reviewed and may be declined at our discretion to ensure they align with our mission.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 text-center text-muted-foreground">
        <p>
          Have questions? Visit our{' '}
          <Link to="/contact" className="text-primary hover:underline font-medium">
            Contact Us
          </Link>{' '}
          page.
        </p>
      </div>
    </div>
  );
};

export default CommunityGuidelines;