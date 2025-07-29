import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSimpleSound } from '@/utils/audio'; // Import the sound utility

interface MeditationTimerProps {
  onClose?: () => void; // Optional callback to close the timer, e.g., if in a dialog
}

const MeditationTimer: React.FC<MeditationTimerProps> = ({ onClose }) => {
  const [duration, setDuration] = useState(1); // Duration in minutes
  const [timeRemaining, setTimeRemaining] = useState(0); // Time in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isStarted, setIsStarted] = useState(false); // To differentiate between initial state and paused state
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isStarted) {
      // Timer finished
      setIsRunning(false);
      setIsStarted(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Play a longer, more resonant bell for the end of meditation
      playSimpleSound({ frequency: 523.25, duration: 1, volume: 0.6, type: 'sine', attack: 0.05, decay: 0.5 }); // C5 note
      toast.success('Meditation session complete!');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, isStarted]);

  const handleStartPause = () => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      if (!isStarted) {
        // First start
        if (duration <= 0) {
          toast.error('Please set a duration greater than 0 minutes.');
          return;
        }
        setTimeRemaining(duration * 60);
        setIsStarted(true);
        // Play a standard bell for the start of meditation
        playSimpleSound({ frequency: 440, duration: 0.3, volume: 0.5, type: 'sine', attack: 0.02, decay: 0.1 });
        toast.info('Meditation started!');
      }
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsStarted(false);
    setTimeRemaining(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Play a short, clear sound for reset
    playSimpleSound({ frequency: 660, duration: 0.15, volume: 0.4, type: 'sine', attack: 0.01, decay: 0.05 }); // E5 note
    toast.info('Timer reset.');
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-foreground mb-4">Meditation Timer</h2>
      <div className="flex items-center justify-center mb-6">
        <Bell className="h-6 w-6 text-purple-600 mr-2" />
        <Input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          min="1"
          disabled={isRunning || isStarted}
          className="w-24 text-center text-lg font-semibold focus-visible:ring-purple-500"
        />
        <span className="ml-2 text-lg text-gray-700">minutes</span>
      </div>

      <div className="text-6xl font-bold text-center text-purple-700 mb-6">
        {formatTime(timeRemaining)}
      </div>

      <div className="flex justify-center space-x-4">
        <Button
          onClick={handleStartPause}
          disabled={timeRemaining === 0 && isStarted}
          className={cn(
            "px-6 py-3 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105",
            isRunning ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"
          )}
        >
          {isRunning ? <><Pause className="mr-2 h-5 w-5" /> Pause</> : <><Play className="mr-2 h-5 w-5" /> Start</>}
        </Button>
        <Button
          onClick={handleReset}
          disabled={!isStarted && timeRemaining === 0}
          variant="outline"
          className="px-6 py-3 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105"
        >
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
      </div>
      {onClose && (
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            Close Timer
          </Button>
        </div>
      )}
    </div>
  );
};

export default MeditationTimer;