import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AiParsingSectionProps {
  onAiParseComplete: (parsedData: any) => void;
}

const AiParsingSection: React.FC<AiParsingSectionProps> = ({ onAiParseComplete }) => {
  const [aiText, setAiText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);

  const handleAiParse = async () => {
    if (!aiText.trim()) {
      toast.error('Please enter some text to parse.');
    } else {
      setIsAiParsing(true);
      try {
        const response = await supabase.functions.invoke('parse-event-details', {
          body: { text: aiText },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const parsedData = response.data;
        console.log('AI Parsed Data:', parsedData);
        onAiParseComplete(parsedData);

        // Log the successful parsing
        const { error: logError } = await supabase.from('ai_parsing_logs').insert([
          {
            input_text: aiText,
            parsed_data: parsedData,
          },
        ]);

        if (logError) {
          console.error('Error logging AI parsing:', logError);
        }

        toast.success('Event details parsed successfully!');
      } catch (error: any) {
        console.error('Error parsing event details with AI:', error);
        toast.error(`Failed to parse event details: ${error.message}`);

        // Log the error
        const { error: logError } = await supabase.from('ai_parsing_logs').insert([
          {
            input_text: aiText,
            error_message: error.message,
          },
        ]);

        if (logError) {
          console.error('Error logging AI parsing error:', logError);
        }
      } finally {
        setIsAiParsing(false);
      }
    }
  };

  return (
    <div className="mb-8 p-4 sm:p-6 bg-secondary border border-border rounded-lg shadow-lg">
      <div className="flex items-center mb-4">
        <Sparkles className="h-5 w-5 text-primary mr-2" />
        <h3 className="text-lg font-semibold text-foreground">AI-Powered Event Details Parser</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Paste event details (flyer text, email, etc.) and let AI automatically fill the form below.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-text" className="text-foreground">Event Details Text</Label>
          <Textarea
            id="ai-text"
            placeholder="Paste event details here..."
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            className="min-h-[120px] focus-visible:ring-primary"
          />
        </div>
        <Button
          onClick={handleAiParse}
          disabled={isAiParsing}
          className="w-full bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105"
        >
          {isAiParsing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Parse with AI
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AiParsingSection;