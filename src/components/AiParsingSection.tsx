import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';

interface AiParsingSectionProps {
  onAiParseComplete: (parsedData: any) => void;
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
      console.log('AI Parsed Data:', parsedData);
      onAiParseComplete(parsedData);
      toast.success('Event details parsed successfully!');
    } catch (error: any) {
      console.error('Error parsing event details with AI:', error);
      toast.error(`Failed to parse event details: ${error.message}`);
    } finally {
      setIsAiParsing(false);
    }
  };

  return (
    <div className="mb-8 p-6 sm:p-8 bg-secondary/30 border border-border/50 rounded-[2.5rem] shadow-xl">
      <div className="flex items-center mb-4">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center mr-4">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground font-heading">AI Event Assistant</h3>
          <p className="text-sm text-muted-foreground">Paste flyer text or an email to auto-fill the form.</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Textarea
            id="ai-text"
            placeholder="Paste event details here (e.g. 'Yoga at the park this Sunday at 10am...')"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            className="min-h-[140px] rounded-2xl bg-background border-none focus-visible:ring-primary text-base p-4"
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