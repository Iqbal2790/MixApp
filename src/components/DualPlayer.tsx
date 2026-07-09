import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import type { Song } from '../types';

interface DualPlayerProps {
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  masterVolume: number; // 0 to 100
  onNext: () => void;
  onProgress: (time: number, duration: number) => void;
}

const CROSSFADE_DURATION = 5; // seconds

export const DualPlayer: React.FC<DualPlayerProps> = ({ queue, currentIndex, isPlaying, masterVolume, onNext, onProgress }) => {
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  
  const playerARef = useRef<any>(null);
  const playerBRef = useRef<any>(null);

  const currentSong = queue[currentIndex];
  const nextSong = queue[currentIndex + 1]; // Can be undefined

  const [songA, setSongA] = useState<Song | null>(currentSong || null);
  const [songB, setSongB] = useState<Song | null>(null);

  const crossfadeIntervalRef = useRef<number | null>(null);

  // Initialize and switch players
  useEffect(() => {
    if (!currentSong) return;

    // Which player should we use for the newly selected currentSong?
    // If songA is the current song, player A is active.
    // If not, we switch active player.
    if (activePlayer === 'A') {
      if (songA?.id !== currentSong.id) {
        setSongA(currentSong);
        if (playerARef.current) {
          playerARef.current.loadVideoById(currentSong.videoId, currentSong.startTime || 0);
        }
      }
      if (nextSong && songB?.id !== nextSong.id) {
        setSongB(nextSong);
        if (playerBRef.current) {
          // Preload
          playerBRef.current.cueVideoById(nextSong.videoId, nextSong.startTime || 0);
        }
      }
    } else {
      if (songB?.id !== currentSong.id) {
        setSongB(currentSong);
        if (playerBRef.current) {
          playerBRef.current.loadVideoById(currentSong.videoId, currentSong.startTime || 0);
        }
      }
      if (nextSong && songA?.id !== nextSong.id) {
        setSongA(nextSong);
        if (playerARef.current) {
          // Preload
          playerARef.current.cueVideoById(nextSong.videoId, nextSong.startTime || 0);
        }
      }
    }
  }, [currentIndex, currentSong, nextSong]);

  // Play/Pause effect
  useEffect(() => {
    const pA = playerARef.current;
    const pB = playerBRef.current;
    
    if (isPlaying) {
      if (activePlayer === 'A' && pA && pA.getPlayerState() !== 1) pA.playVideo();
      if (activePlayer === 'B' && pB && pB.getPlayerState() !== 1) pB.playVideo();
    } else {
      if (pA && pA.getPlayerState() === 1) pA.pauseVideo();
      if (pB && pB.getPlayerState() === 1) pB.pauseVideo();
    }
  }, [isPlaying, activePlayer]);

  // Master volume effect
  useEffect(() => {
    // If not in crossfade, set the active player to master volume
    const active = activePlayer === 'A' ? playerARef.current : playerBRef.current;
    if (active && !crossfadeIntervalRef.current) {
      active.setVolume(masterVolume);
    }
  }, [masterVolume, activePlayer]);

  // Crossfade check loop
  useEffect(() => {
    let animationFrame: number;
    let crossfading = false;

    const loop = () => {
      const active = activePlayer === 'A' ? playerARef.current : playerBRef.current;
      const inactive = activePlayer === 'A' ? playerBRef.current : playerARef.current;
      
      const activeSong = activePlayer === 'A' ? songA : songB;
      const inactiveSong = activePlayer === 'A' ? songB : songA;

      if (active && activeSong && isPlaying) {
        const currentTime = active.getCurrentTime() || 0;
        const duration = active.getDuration() || 0;
        const endTime = activeSong.endTime > 0 ? activeSong.endTime : duration;
        
        onProgress(currentTime, endTime || duration || 1);

        const timeLeft = endTime - currentTime;

        // Trigger crossfade when approaching end time
        if (timeLeft <= CROSSFADE_DURATION && timeLeft > 0 && inactiveSong && !crossfading) {
          crossfading = true;
          
          if (inactive) {
            inactive.setVolume(0);
            inactive.playVideo();
            
            // Start fading
            const fadeStart = Date.now();
            const fadeInterval = window.setInterval(() => {
              const elapsed = (Date.now() - fadeStart) / 1000;
              let ratio = elapsed / CROSSFADE_DURATION;
              if (ratio >= 1) {
                ratio = 1;
                window.clearInterval(fadeInterval);
                // Switch players
                setActivePlayer(activePlayer === 'A' ? 'B' : 'A');
                active.pauseVideo();
                crossfading = false;
                onNext();
              }
              
              active.setVolume((1 - ratio) * masterVolume);
              inactive.setVolume(ratio * masterVolume);
            }, 50);
            
            crossfadeIntervalRef.current = fadeInterval;
          }
        }

        // If no next song, just stop at end
        if (timeLeft <= 0 && !inactiveSong && !crossfading) {
           onNext();
        }
      }

      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrame);
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }
    };
  }, [activePlayer, isPlaying, songA, songB, masterVolume, onNext, onProgress]);

  const opts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
    },
  };

  return (
    <div className="visually-hidden">
      {songA && (
        <YouTube
          videoId={songA.videoId}
          opts={opts}
          onReady={(e) => { playerARef.current = e.target; e.target.setVolume(activePlayer === 'A' ? masterVolume : 0); }}
        />
      )}
      {songB && (
        <YouTube
          videoId={songB.videoId}
          opts={opts}
          onReady={(e) => { playerBRef.current = e.target; e.target.setVolume(activePlayer === 'B' ? masterVolume : 0); }}
        />
      )}
    </div>
  );
};
