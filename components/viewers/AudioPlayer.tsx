"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Download,
  Music,
  X,
} from "lucide-react";
import { VaultItem } from "@/components/providers/VaultContext";
import { formatBytes } from "@/lib/utils";

export function AudioPlayer({
  item,
  onClose,
}: {
  item: VaultItem;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const streamUrl = `/api/items/${item.id}/stream`;
  const downloadUrl = `/api/items/${item.id}/download`;

  // Remember position (§16)
  useEffect(() => {
    const savedPos = localStorage.getItem(`audio_pos_${item.id}`);
    if (savedPos && audioRef.current) {
      const pos = parseFloat(savedPos);
      if (!isNaN(pos) && pos > 0) {
        audioRef.current.currentTime = pos;
      }
    }
  }, [item.id]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setCurrentTime(curr);
    localStorage.setItem(`audio_pos_${item.id}`, curr.toString());
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      Math.max(audioRef.current.currentTime + seconds, 0),
      duration
    );
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="relative w-full max-w-lg bg-neutral-900 text-white rounded-2xl shadow-2xl p-6 flex flex-col border border-neutral-800 select-none">
      <audio
        ref={audioRef}
        src={streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Music className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
            <p className="text-xs text-neutral-400">{formatBytes(item.size)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <a
            href={downloadUrl}
            download={item.name}
            title="Download Audio"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="space-y-1.5 mb-6">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[11px] font-mono text-neutral-400">
          <span>{formatSeconds(currentTime)}</span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Playback Speed selector (§16) */}
        <div className="flex items-center gap-1">
          {[0.75, 1, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                playbackRate === speed
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Primary Playback buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => skip(-10)}
            title="Rewind 10s"
            className="p-2 text-neutral-400 hover:text-white transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onClick={() => skip(10)}
            title="Forward 10s"
            className="p-2 text-neutral-400 hover:text-white transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} className="text-neutral-400 hover:text-white">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
