import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import YouTube from 'react-youtube';
import type { Song } from '../types';

interface DualPlayerProps {
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  masterVolume: number; // 0 to 100
  onNext: () => void;
  onProgress: (time: number, duration: number) => void;
  crossfadeDuration: number;
}

export interface DualPlayerRef {
  manualSkip: () => void;
  seekTo: (time: number) => void;
}

export const DualPlayer = forwardRef<DualPlayerRef, DualPlayerProps>(({ queue, currentIndex, isPlaying, masterVolume, onNext, onProgress, crossfadeDuration }, ref) => {
  const [manualCrossfade, setManualCrossfade] = useState(false);

  useImperativeHandle(ref, () => ({
    manualSkip: () => {
      setManualCrossfade(true);
    },
    seekTo: (time: number) => {
      try {
        const active = activePlayerRef.current === 'A' ? playerARef.current : playerBRef.current;
        if (active) active.seekTo(time, true);
      } catch (e) {}
    }
  }));
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  const activePlayerRef = useRef(activePlayer);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => { activePlayerRef.current = activePlayer; }, [activePlayer]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  
  const onNextRef = useRef(onNext);
  const onProgressRef = useRef(onProgress);
  const masterVolumeRef = useRef(masterVolume);
  const crossfadeDurationRef = useRef(crossfadeDuration);

  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);
  useEffect(() => { crossfadeDurationRef.current = crossfadeDuration; }, [crossfadeDuration]);
  
  const playerARef = useRef<any>(null);
  const playerBRef = useRef<any>(null);

  const currentSong = queue[currentIndex];
  const nextSong = queue[currentIndex + 1]; // Can be undefined

  const [songAId, setSongAId] = useState<string | null>(currentSong?.id || null);
  const [songBId, setSongBId] = useState<string | null>(null);

  const songA = queue.find(s => s.id === songAId) || null;
  const songB = queue.find(s => s.id === songBId) || null;

  const crossfadeIntervalRef = useRef<number | null>(null);

  // Initialize and switch players
  useEffect(() => {
    if (!currentSong) return;

    const A_is_current = songAId === currentSong.id;
    const B_is_current = songBId === currentSong.id;

    if (activePlayer === 'A') {
      if (B_is_current) {
        // User manually skipped to the next song which was preloaded in B
        setActivePlayer('B');
        if (nextSong && songAId !== nextSong.id) setSongAId(nextSong.id);
      } else if (!A_is_current) {
        // Not in A, not in B.
        setSongAId(currentSong.id);
        if (nextSong && songBId !== nextSong.id) setSongBId(nextSong.id);
      } else {
        // A is already currentSong. Just update B.
        if (nextSong && songBId !== nextSong.id) setSongBId(nextSong.id);
      }
    } else {
      // activePlayer === 'B'
      if (A_is_current) {
        // User manually skipped to the next song which was preloaded in A
        setActivePlayer('A');
        if (nextSong && songBId !== nextSong.id) setSongBId(nextSong.id);
      } else if (!B_is_current) {
        // Not in B, not in A.
        setSongBId(currentSong.id);
        if (nextSong && songAId !== nextSong.id) setSongAId(nextSong.id);
      } else {
        // B is already currentSong. Just update A.
        if (nextSong && songAId !== nextSong.id) setSongAId(nextSong.id);
      }
    }
  }, [currentIndex, currentSong, nextSong, activePlayer, songAId, songBId]);

  // Play/Pause effect
  useEffect(() => {
    try {
      const pA = playerARef.current;
      const pB = playerBRef.current;
      
      if (isPlaying) {
        if (activePlayer === 'A') {
          if (pA && pA.getPlayerState() !== 1) pA.playVideo();
          if (pB && pB.getPlayerState() === 1) pB.pauseVideo();
        } else {
          if (pB && pB.getPlayerState() !== 1) pB.playVideo();
          if (pA && pA.getPlayerState() === 1) pA.pauseVideo();
        }
      } else {
        if (pA && pA.getPlayerState() === 1) pA.pauseVideo();
        if (pB && pB.getPlayerState() === 1) pB.pauseVideo();
      }
    } catch (e) {
      console.warn("YouTube player API error ignored (Play/Pause):", e);
    }
  }, [isPlaying, activePlayer]);

  // Master volume effect
  useEffect(() => {
    try {
      const active = activePlayer === 'A' ? playerARef.current : playerBRef.current;
      if (active && !crossfadeIntervalRef.current) {
        active.setVolume(masterVolume);
      }
    } catch (e) {
      console.warn("YouTube player API error ignored (Volume):", e);
    }
  }, [masterVolume, activePlayer]);

  const manualCrossfadeRef = useRef(manualCrossfade);
  useEffect(() => { manualCrossfadeRef.current = manualCrossfade; }, [manualCrossfade]);

  // Crossfade check loop
  useEffect(() => {
    let animationFrame: number;
    let crossfading = false;

    const loop = () => {
      try {
        const active = activePlayer === 'A' ? playerARef.current : playerBRef.current;
        const inactive = activePlayer === 'A' ? playerBRef.current : playerARef.current;
        
        const activeSong = activePlayer === 'A' ? songA : songB;
        const inactiveSong = activePlayer === 'A' ? songB : songA;

        if (active && activeSong && isPlaying) {
          const currentTime = active.getCurrentTime() || 0;
          const duration = active.getDuration() || 0;
          const endTime = activeSong.endTime > 0 ? activeSong.endTime : duration;
          
          // Enforce startTime (if user seeks before it or just loaded)
          if (activeSong.startTime > 0 && currentTime < activeSong.startTime - 0.5) {
            active.seekTo(activeSong.startTime, true);
          }

          onProgressRef.current(currentTime, endTime || duration || 1);

          const timeLeft = endTime - currentTime;

          const shouldCrossfade = timeLeft <= crossfadeDurationRef.current || manualCrossfadeRef.current;

          // Trigger crossfade when approaching end time or manual skip
          if (shouldCrossfade && inactiveSong && !crossfading) {
            let startedFading = false;
            
            if (inactive) {
              try {
                inactive.setVolume(0);
                inactive.playVideo();
                
                // Start fading
                const fadeStart = Date.now();
                const fadeInterval = window.setInterval(() => {
                  try {
                    const elapsed = (Date.now() - fadeStart) / 1000;
                    let ratio = elapsed / crossfadeDurationRef.current;
                    
                    if (ratio >= 1) {
                      ratio = 1;
                      window.clearInterval(fadeInterval);
                      crossfadeIntervalRef.current = null;
                      // Switch players
                      setActivePlayer(activePlayer === 'A' ? 'B' : 'A');
                      active.pauseVideo();
                      crossfading = false;
                      onNextRef.current();
                    }
                    
                    // Equal-power crossfade curve for smoother perceived volume
                    const fadeOutVol = Math.cos(ratio * 0.5 * Math.PI) * masterVolumeRef.current;
                    const fadeInVol = Math.sin(ratio * 0.5 * Math.PI) * masterVolumeRef.current;
                    
                    active.setVolume(Math.round(fadeOutVol));
                    inactive.setVolume(Math.round(fadeInVol));
                  } catch (e) {
                    // ignore crossfade interval errors
                  }
                }, 20);
                
                crossfadeIntervalRef.current = fadeInterval;
                crossfading = true;
                startedFading = true;
                if (manualCrossfadeRef.current) setManualCrossfade(false);
              } catch (e) {
                // Inactive player not ready yet. 
              }
            }

            // Fallback: If we couldn't start fading and we MUST skip now
            if (!startedFading && (timeLeft <= 0 || manualCrossfadeRef.current)) {
               if (manualCrossfadeRef.current) setManualCrossfade(false);
               onNextRef.current();
            }
          }

          // If no next song, just stop at end (or if skipped and no next song)
          if ((timeLeft <= 0 || manualCrossfadeRef.current) && !inactiveSong && !crossfading) {
             if (manualCrossfadeRef.current) setManualCrossfade(false);
             onNextRef.current();
          }
        }
      } catch (e) {
        // ignore loop API errors
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
  }, [activePlayer, isPlaying, songA, songB]);

  const getOpts = (song: Song | null) => ({
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      start: song?.startTime || undefined,
    },
  });

  const handleStateChange = (player: 'A' | 'B', e: any) => {
    try {
      if (activePlayerRef.current === player && isPlayingRef.current && (e.data === 5 || e.data === -1)) {
        e.target.playVideo();
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="visually-hidden">
      {songA && (
        <YouTube
          key={songA.id}
          videoId={songA.videoId}
          opts={getOpts(songA)}
          onReady={(e) => { 
            playerARef.current = e.target; 
            e.target.setVolume(activePlayer === 'A' ? masterVolume : 0); 
            if (activePlayer === 'A' && isPlaying) e.target.playVideo();
          }}
          onStateChange={(e) => handleStateChange('A', e)}
        />
      )}
      {songB && (
        <YouTube
          key={songB.id}
          videoId={songB.videoId}
          opts={getOpts(songB)}
          onReady={(e) => { 
            playerBRef.current = e.target; 
            e.target.setVolume(activePlayer === 'B' ? masterVolume : 0); 
            if (activePlayer === 'B' && isPlaying) e.target.playVideo();
          }}
          onStateChange={(e) => handleStateChange('B', e)}
        />
      )}
    </div>
  );
});
