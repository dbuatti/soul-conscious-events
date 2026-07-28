import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

interface AiParsingSectionProps {
  onAiParseComplete: (parsedData: Record<string, unknown>) => void;
}

const DEBUG_SAMPLES = [
  {
    label: "Music Event",
    text: "Sensory SOAK: A Sound Journey. Join us this Friday Oct 25th at 7pm. Location: The Yoga Space, 123 Zen St, Melbourne VIC 3000. Tickets are $45 via Eventbrite. Bring a mat!"
  },
  {
    label: "Workshop",
    text: "Pottery & Prosecco! Next Saturday from 2pm to 5pm. Art Hub, Sydney. $85 includes all materials and a glass of bubbles. Book at arthub.com.au"
  },
  {
    label: "Multi-day",
    text: "Spring Retreat 2024. Nov 10-12. Byron Bay Healing Centre. $550 all inclusive. Contact Sarah at sarah@retreats.com"
  },
  {
    label: "URL + Image Scrape",
    text: "Journey Symphonic Breathwork. 06:30pm, Wed 5th Aug 2026. The Timber Yard, 351 Plummer St, Port Melbourne VIC 3207. Tickets from $79. Book at https://megatix.com.au/events/journey-symphonic-breathwork"
  }
];

const AiParsingSection: React.FC<AiParsingSectionProps> = ({ onAiParseComplete }) => {
  const [aiText, setAiText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const { user } = useSession();
  const isAdmin = user?.email === 'daniele.buatti@gmail.com';

  const handleAiParse = async (textToParse: string = aiText) => {
    const text = textToParse.trim();
    if (!text) {
      toast.error('Please enter some text to parse.');
      return;
    }

    setIsAiParsing(true);
    try {
      const response = await supabase.functions.invoke('parse-event-details', {
        body: { text },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const parsedData = response.data;
      onAiParseComplete(parsedData);
      toast.success('Event details parsed successfully!');
    } catch (error: unknown) {
      console.error('Error parsing event details with AI:', error);
      toast.error(`Failed to parse event details: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAiParsing(false);
    }
  };

  return (
    <div className="mb-8 relative overflow-hidden rounded-[2.5rem] shadow-xl border border-primary/20">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/20" />
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-accent/10" />
      
      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground font-heading flex items-center gap-2">
              AI Event Assistant
              <span className="text-[9px] font-black uppercase tracking-widest bg-primary text-white px-2.5 py-1 rounded-full">Beta</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Paste a ticketing link and we'll fill in everything for you.</p>
          </div>
        </div>

        {/* URL hint callout */}
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 mb-5">
          <div className="text-2xl">🔗</div>
          <div>
            <p className="text-sm font-bold text-foreground">Just paste a link!</p>
            <p className="text-xs text-muted-foreground">Works with Megatix, Humanitix, Eventbrite, and most event pages. We'll grab the event details, date, venue, and cover image automatically.</p>
          </div>
        </div>
      
        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              id="ai-text"
              placeholder="Paste a ticketing link here... (e.g. https://megatix.com.au/events/my-event)"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              className="min-h-[100px] rounded-2xl bg-background/80 border border-border/50 focus-visible:ring-primary text-base p-4 placeholder:text-muted-foreground/50"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleAiParse()}
              disabled={isAiParsing}
              className="flex-grow bg-primary hover:bg-primary/80 text-primary-foreground h-12 rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02]"
            >
              {isAiParsing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Auto-Fill Form
                </>
              )}
            </Button>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <div className="flex items-center gap-2 mb-3 text-xs font-black text-muted-foreground uppercase tracking-widest">
              <Bug className="h-3 w-3" /> Admin Debug Samples
            </div>
            <div className="flex flex-wrap gap-2">
              {DEBUG_SAMPLES.map((sample, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  size="sm" 
                  className="rounded-lg text-xs h-8 bg-background/50"
                  onClick={() => {
                    setAiText(sample.text);
                    handleAiParse(sample.text);
                  }}
                  disabled={isAiParsing}
                >
                  Test: {sample.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiParsingSection;