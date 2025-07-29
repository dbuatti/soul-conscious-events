import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, FastForward, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSimpleSound } from '@/utils/audio'; // Import the sound utility

interface PomodoroTimerProps {
  onClose?: () => void;
}

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onClose }) => {
  const defaultWorkDuration = 25; // minutes
  const defaultShortBreakDuration = 5; // minutes
  const defaultLongBreakDuration = 15; // minutes
  const pomodorosBeforeLongBreak = 4;

  const [workDuration, setWorkDuration] = useState(defaultWorkDuration);
  const [shortBreakDuration, setShortBreakDuration] = useState(defaultShortBreakDuration);
  const [longBreakDuration, setLongBreakDuration] = useState(defaultLongBreakDuration);

  const [timeRemaining, setTimeRemaining] = useState(defaultWorkDuration * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
  const [pomodoroCount, setPomodoroCount] = useState(0); // Completed work sessions
  const [isStarted, setIsStarted] = useState(false); // To differentiate initial state from paused

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define distinct sounds for different phases
  const playWorkSound = useCallback(() => {
    playSimpleSound({ frequency: 880, duration: 0.2, volume: 0.5, type: 'sine', attack: 0.02, decay: 0.1 }); // Higher pitch, sharp start
  }, []);

  const playBreakSound = useCallback(() => {
    playSimpleSound({ frequency: 660, duration: 0.5, volume: 0.4, type: 'sine', attack: 0.05, decay: 0.3 }); // Softer, more relaxing chime
  }, []);

  const startTimer = useCallback(() => {
    setIsRunning(true);
    if (!isStarted) {
      setIsStarted(true);
      // Play sound based on the current phase
      if (currentPhase === 'work') {
        playWorkSound();
        toast.info('Work session started!');
      } else {
        playBreakSound();
        toast.info(`${currentPhase === 'shortBreak' ? 'Short' : 'Long'} break started!`);
      }
    }
  }, [isStarted, currentPhase, playWorkSound, playBreakSound]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const resetTimer = useCallback(() => {
    pauseTimer();
    setWorkDuration(defaultWorkDuration);
    setShortBreakDuration(defaultShortBreakDuration);
    setLongBreakDuration(defaultLongBreakDuration);
    setTimeRemaining(defaultWorkDuration * 60);
    setCurrentPhase('work');
    setPomodoroCount(0);
    setIsStarted(false);
    toast.info('Pomodoro timer reset.');
    // Play a neutral reset sound
    playSimpleSound({ frequency: 440, duration: 0.15, volume: 0.3, type: 'square', attack: 0.01, decay: 0.05 });
  }, [pauseTimer, defaultWorkDuration, defaultShortBreakDuration, defaultLongBreakDuration, playSimpleSound]);

  const nextPhase = useCallback(() => {
    pauseTimer();
    // Play a transition sound
    playSimpleSound({ frequency: 770, duration: 0.3, volume: 0.4, type: 'sine', attack: 0.02, decay: 0.15 });

    if (currentPhase === 'work') {
      setPomodoroCount((prevCount) => prevCount + 1);
      if ((pomodoroCount + 1) % pomodorosBeforeLongBreak === 0) {
        setCurrentPhase('longBreak');
        setTimeRemaining(longBreakDuration * 60);
        toast.success('Work session complete! Starting long break.');
        playBreakSound(); // Play break sound for the new phase
      } else {
        setCurrentPhase('shortBreak');
        setTimeRemaining(shortBreakDuration * 60);
        toast.success('Work session complete! Starting short break.');
        playBreakSound(); // Play break sound for the new phase
      }
    } else {
      setCurrentPhase('work');
      setTimeRemaining(workDuration * 60);
      toast.info('Break complete! Starting work session.');
      playWorkSound(); // Play work sound for the new phase
    }
    setIsStarted(false); // Reset isStarted to allow bell sound on next auto-start
  }, [currentPhase, pomodoroCount, workDuration, shortBreakDuration, longBreakDuration, pauseTimer, playSimpleSound, playWorkSound, playBreakSound, pomodorosBeforeLongBreak]);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isRunning) {
      // Timer finished for current phase
      nextPhase();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, nextPhase]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number>>) => {
    const value = Number(e.target.value);
    if (value >= 1 || e.target.value === '') { // Allow empty string for temporary input clearing
      setter(value);
    }
  };

  const handleSetDuration = (setter: React.Dispatch<React.SetStateAction<number>>, defaultValue: number) => {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (value < 1 || isNaN(value)) {
        setter(defaultValue);
        toast.warning('Duration must be at least 1 minute. Resetting to default.');
      }
      // If it's the work phase and not running, update timeRemaining immediately
      if (currentPhase === 'work' && !isRunning && !isStarted) {
        setTimeRemaining(workDuration * 60);
      }
    };
  };

  // Determine visual style based on current phase
  const getPhaseStyles = () => {
    switch (currentPhase) {
      case 'work':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: <Timer className="h-6 w-6 text-red-600" />,
        };
      case 'shortBreak':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: <Timer className="h-6 w-6 text-blue-600" />,
        };
      case 'longBreak':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: <Timer className="h-6 w-6 text-green-600" />,
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: <Timer className="h-6 w-6 text-gray-600" />,
        };
    }
  };

  const { bg, text, border, icon } = getPhaseStyles();

  return (
    <div className={`p-6 bg-white rounded-lg shadow-lg border ${border} max-w-md mx-auto`}>
      <h2 className="text-2xl font-bold text-center text-foreground mb-4">Pomodoro Timer</h2>
      
      {/* Phase Indicator */}
      <div className={`mb-6 p-4 rounded-lg ${bg} border ${border} text-center`}>
        <div className="flex items-center justify-center mb-2">
          {icon}
          <span className={`ml-2 text-lg font-semibold ${text}`}>
            {currentPhase === 'work' ? 'Work' : currentPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
          </span>
        </div>
        <p className={`text-sm ${text}`}>
          {currentPhase === 'work' 
            ? 'Focus on your task' 
            : currentPhase === 'shortBreak' 
              ? 'Take a short rest' 
              : 'Take a longer rest'
          }
        </p>
      </div>

      <div className="flex flex-col items-center justify-center mb-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Timer className="h-6 w-6 text-purple-600" />
          <Input
            type="number"
            value={workDuration}
            onChange={(e) => handleDurationChange(e, setWorkDuration)}
            onBlur={handleSetDuration(setWorkDuration, defaultWorkDuration)}
            min="1"
            disabled={isRunning || isStarted}
            className="w-24 text-center text-lg font-semibold focus-visible:ring-purple-500"
          />
          <span className="text-lg text-gray-700">Work (min)</span>
        </div>
        <div className="flex items-center space-x-2">
          <Timer className="h-6 w-6 text-blue-600" />
          <Input
            type="number"
            value={shortBreakDuration}
            onChange={(e) => handleDurationChange(e, setShortBreakDuration)}
            onBlur={handleSetDuration(setShortBreakDuration, defaultShortBreakDuration)}
            min="1"
            disabled={isRunning || isStarted}
            className="w-24 text-center text-lg font-semibold focus-visible:ring-blue-500"
          />
          <span className="text-lg text-gray-700">Short Break (min)</span>
        </div>
        <div className="flex items-center space-x-2">
          <Timer className="h-6 w-6 text-green-600" />
          <Input
            type="number"
            value={longBreakDuration}
            onChange={(e) => handleDurationChange(e, setLongBreakDuration)}
            onBlur={handleSetDuration(setLongBreakDuration, defaultLongBreakDuration)}
            min="1"
            disabled={isRunning || isStarted}
            className="w-24 text-center text-lg font-semibold focus-visible:ring-green-500"
          />
          <span className="text-lg text-gray-700">Long Break (min)</span>
        </div>
      </div>

      <div className={`text-6xl font-bold text-center ${text} mb-6`}>
        {formatTime(timeRemaining)}
      </div>

      <div className="flex justify-center space-x-4 mb-4">
        <Button
          onClick={isRunning ? pauseTimer : startTimer}
          disabled={timeRemaining === 0 && isStarted}
          className={cn(
            "px-6 py-3 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105",
            isRunning ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"
          )}
        >
          {isRunning ? <><Pause className="mr-2 h-5 w-5" /> Pause</> : <><Play className="mr-2 h-5 w-5" /> Start</>}
        </Button>
        <Button
          onClick={resetTimer}
          disabled={!isStarted && timeRemaining === workDuration * 60}
          variant="outline"
          className="px-6 py-3 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105"
        >
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
      </div>
      <div className="flex justify-center">
        <Button
          onClick={nextPhase}
          disabled={!isStarted && timeRemaining === workDuration * 60}
          variant="secondary"
          className="px-6 py-3 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105"
        >
          <FastForward className="mr-2 h-5 w-5" /> Skip Phase
        </Button>
      </div>

      <p className="text-center text-gray-700 mt-4">
        Completed Pomodoros: <span className="font-semibold">{pomodoroCount}</span>
      </p>

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

export default PomodoroTimer;