'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Check,
  ArrowRight,
  Play,
  Pause,
  X,
  Bell,
  Home,
  Calendar as CalendarIcon,
  PenLine,
  Settings,
  TrendingUp,
  Monitor,
  Smartphone,
  Columns3,
  LayoutDashboard,
  Share2,
  Mic
} from 'lucide-react';

export type EnergyMode = 'high' | 'balanced' | 'survival' | 'recharge';

export type InertiaContext = 'desk' | 'mobile' | 'physical' | 'low-brain';

export type ActivationFriction = 1 | 2 | 3;

export type SpoonCost = 1 | 2 | 3 | 4;

export interface MicroStep {
  id: string;
  label: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  durationLabel?: string;
  spoonCost: SpoonCost;
  activationFriction: ActivationFriction;
  inertia: InertiaContext;
  ignitionPrompt: string;
  microSteps: MicroStep[];
  status: 'plate' | 'holding' | 'completed' | 'composted';
  rolloverCount: number;
  isBorrowedEnergy?: boolean;
  createdAt: string;
}

export interface SensoryProfile {
  fontFamily: 'hyperlegible' | 'jakarta' | 'mono';
  saccadicReading: boolean;
  reducedMotion: boolean;
  brownNoiseActive: boolean;
  brownNoiseVolume: number;
  uxAnnotationsVisible: boolean;
}

export type TaskTier = 'full' | 'medium' | 'survival';

export interface BaselineLivingItem {
  id: string;
  label: string;
  spoons: number;
  completed: boolean;
}

export interface SpoonThiefItem {
  id: string;
  label: string;
  drain: number;
  count: number;
}

export function getTieredTaskDetails(
  task: TaskItem,
  tier: TaskTier
): {
  title: string;
  durationLabel: string;
  spoonCost: SpoonCost;
  ignitionPrompt: string;
  microSteps: MicroStep[];
} {
  const baseTitle = task.title;
  const lower = baseTitle.toLowerCase();

  if (tier === 'full') {
    return {
      title: baseTitle,
      durationLabel: task.durationLabel || `${task.spoonCost * 15} min`,
      spoonCost: task.spoonCost,
      ignitionPrompt: task.ignitionPrompt,
      microSteps: task.microSteps,
    };
  }

  const mapStepLabels = (labels: [string, string, string]): MicroStep[] =>
    task.microSteps.map((m, idx) => ({
      ...m,
      label: labels[idx] || m.label,
    }));

  if (tier === 'medium') {
    const medCost = Math.max(1, task.spoonCost - 1) as SpoonCost;
    if (lower.includes('walk')) {
      return {
        title: 'Easy 10-min stroll outside',
        durationLabel: '10 min',
        spoonCost: 1,
        ignitionPrompt: 'Slip on comfortable shoes and step outside the front door.',
        microSteps: mapStepLabels([
          'Put on shoes by the door',
          'Walk halfway down the block at a slow pace',
          'Take two slow breaths before heading back',
        ]),
      };
    }
    if (lower.includes('read') || lower.includes('break')) {
      return {
        title: 'Read two pages in your chair',
        durationLabel: '15 min',
        spoonCost: 1,
        ignitionPrompt: 'Sit back and read only the first paragraph.',
        microSteps: mapStepLabels([
          'Settle into a comfortable seat',
          'Read two pages at an unhurried pace',
          'Close the book and rest your eyes',
        ]),
      };
    }
    if (lower.includes('reply') || lower.includes('prof')) {
      return {
        title: 'Send short two-line note',
        durationLabel: '5 min',
        spoonCost: 1,
        ignitionPrompt: 'Open the draft and write one greeting line.',
        microSteps: mapStepLabels([
          'Open mail draft',
          'Write two plain sentences requesting 48 hours',
          'Send and close tab',
        ]),
      };
    }
    return {
      title: baseTitle,
      durationLabel: '15 min',
      spoonCost: medCost,
      ignitionPrompt: `Spend 60 seconds starting the simplest part of "${baseTitle.slice(0, 26)}".`,
      microSteps: mapStepLabels([
        `Open the workspace for "${baseTitle.slice(0, 22)}"`,
        'Complete a light rough pass',
        'Save progress and pause',
      ]),
    };
  }

  if (lower.includes('walk')) {
    return {
      title: 'Step by an open window for fresh air',
      durationLabel: '2 min',
      spoonCost: 1,
      ignitionPrompt: 'Open the nearest window and take one slow breath.',
      microSteps: mapStepLabels([
        'Walk to the nearest window',
        'Look outside for 60 seconds',
        'Sit or lie back down comfortably',
      ]),
    };
  }
  if (lower.includes('read') || lower.includes('break')) {
    return {
      title: 'Rest eyes quietly for 5 minutes',
      durationLabel: '5 min',
      spoonCost: 1,
      ignitionPrompt: 'Set your device face-down and close your eyes for 30 seconds.',
      microSteps: mapStepLabels([
        'Dim screen brightness',
        'Rest your head back with eyes closed',
        'Take a sip of water',
      ]),
    };
  }
  return {
    title: baseTitle,
    durationLabel: '3 min',
    spoonCost: 1,
    ignitionPrompt: `Do just 30 seconds on "${baseTitle.slice(0, 24)}" and pause.`,
    microSteps: mapStepLabels([
      'Write down one quick note',
      'Spend 90 seconds on the easiest part',
      'Save and rest',
    ]),
  };
}

export function calculateTaskCompatibility(
  task: TaskItem,
  remainingSpoons: number,
  currentInertia: InertiaContext,
  dailyBudget: number,
  spentSpoons: number = 0
): number {
  const safeBudget = Math.max(1, dailyBudget);
  const effectiveSpent = spentSpoons > 0 ? spentSpoons : Math.max(0, dailyBudget - remainingSpoons);
  const fatigueFactor = 1 + effectiveSpent / safeBudget;

  const capacityTerm = 3.5 * (remainingSpoons - task.spoonCost);
  const inertiaBonus = task.inertia === currentInertia ? 4.0 : 0;
  const frictionPenalty = 2.5 * (task.activationFriction * fatigueFactor);
  const overdraftPenalty = 1.5 * Math.pow(Math.max(0, task.spoonCost - remainingSpoons), 2);

  return Number((capacityTerm + inertiaBonus - frictionPenalty - overdraftPenalty).toFixed(2));
}

export function getVisiblePlateTasks(
  tasks: TaskItem[],
  energyMode: EnergyMode,
  remainingSpoons: number,
  currentInertia: InertiaContext,
  dailyBudget: number,
  spentSpoons: number = 0
): TaskItem[] {
  if (energyMode === 'recharge') {
    return [];
  }

  const plateTasks = tasks.filter((t) => t.status === 'plate');

  const sorted = [...plateTasks].sort((a, b) => {
    const scoreB = calculateTaskCompatibility(b, remainingSpoons, currentInertia, dailyBudget, spentSpoons);
    const scoreA = calculateTaskCompatibility(a, remainingSpoons, currentInertia, dailyBudget, spentSpoons);
    return scoreB - scoreA;
  });

  if (energyMode === 'high') {
    return sorted.slice(0, 5);
  }

  if (energyMode === 'balanced') {
    const eligible = sorted.filter((t) => t.spoonCost <= 3);
    const pool = eligible.length > 0 ? eligible : sorted;
    return pool.slice(0, 3);
  }

  if (energyMode === 'survival') {
    const survivalSorted = [...sorted].sort((a, b) => {
      const aLow = a.spoonCost === 1 && a.activationFriction === 1 ? 1 : 0;
      const bLow = b.spoonCost === 1 && b.activationFriction === 1 ? 1 : 0;
      if (aLow !== bLow) return bLow - aLow;
      if (a.spoonCost !== b.spoonCost) return a.spoonCost - b.spoonCost;
      return a.activationFriction - b.activationFriction;
    });
    return survivalSorted.slice(0, 2);
  }

  return sorted.slice(0, 3);
}

class BrownNoiseEngine {
  private static instance: BrownNoiseEngine | null = null;
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private lastOut: number = 0.0;

  public static getInstance(): BrownNoiseEngine {
    if (!BrownNoiseEngine.instance) {
      BrownNoiseEngine.instance = new BrownNoiseEngine();
    }
    return BrownNoiseEngine.instance;
  }

  public start(volume: number = 0.35): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isPlaying) {
      this.setVolume(volume);
      return;
    }

    const sampleRate = this.ctx.sampleRate || 44100;
    const bufferLength = sampleRate * 5;
    const audioBuffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    this.lastOut = 0.0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      this.lastOut = (this.lastOut + 0.02 * white) / 1.02;
      channelData[i] = this.lastOut * 3.2;
    }

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.loop = true;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      Math.max(0.01, Math.min(1, volume)) * 0.35,
      this.ctx.currentTime + 0.4
    );

    this.sourceNode.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    this.sourceNode.start(0);
    this.isPlaying = true;
  }

  public setVolume(volume: number): void {
    if (!this.ctx || !this.gainNode || !this.isPlaying) return;
    const clamped = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.setTargetAtTime(clamped * 0.35, this.ctx.currentTime, 0.08);
  }

  public stop(): void {
    if (!this.ctx || !this.gainNode || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    this.gainNode.gain.setTargetAtTime(0.0001, now, 0.06);
    setTimeout(() => {
      try {
        this.sourceNode?.stop();
        this.sourceNode?.disconnect();
        this.filterNode?.disconnect();
        this.gainNode?.disconnect();
      } catch {}
      this.isPlaying = false;
    }, 180);
  }
}

export function deterministicSlice(title: string): {
  ignitionPrompt: string;
  microSteps: MicroStep[];
} {
  const clean = title.trim();
  const lower = clean.toLowerCase();
  const stamp = Date.now() + Math.floor(Math.random() * 1000);

  if (lower.includes('walk') || lower.includes('explore') || lower.includes('outside')) {
    return {
      ignitionPrompt: 'Put on your comfortable shoes and step just outside the door.',
      microSteps: [
        { id: `ms-${stamp}-1`, label: 'Put on shoes & grab keys', completed: false },
        { id: `ms-${stamp}-2`, label: 'Walk down the block at an easy pace', completed: false },
        { id: `ms-${stamp}-3`, label: 'Take three slow breaths outside', completed: false },
      ],
    };
  }

  if (lower.includes('break') || lower.includes('read') || lower.includes('book')) {
    return {
      ignitionPrompt: 'Sit back in your chair, open the book, and read one paragraph.',
      microSteps: [
        { id: `ms-${stamp}-1`, label: 'Set phone aside on silent', completed: false },
        { id: `ms-${stamp}-2`, label: 'Read two pages at a relaxed pace', completed: false },
        { id: `ms-${stamp}-3`, label: 'Rest eyes for 60 seconds afterward', completed: false },
      ],
    };
  }

  if (lower.includes('email') || lower.includes('reply') || lower.includes('prof') || lower.includes('message')) {
    return {
      ignitionPrompt: 'Open the draft and write only the greeting line.',
      microSteps: [
        { id: `ms-${stamp}-1`, label: 'Open mail tab & type greeting', completed: false },
        { id: `ms-${stamp}-2`, label: 'Write two plain sentences with the request', completed: false },
        { id: `ms-${stamp}-3`, label: 'Send and close tab', completed: false },
      ],
    };
  }

  return {
    ignitionPrompt: `Start "${clean.slice(0, 36)}" for 30 seconds — pause anytime.`,
    microSteps: [
      { id: `ms-${stamp}-1`, label: `Open space for "${clean.slice(0, 26)}"`, completed: false },
      { id: `ms-${stamp}-2`, label: 'Complete the easiest first part', completed: false },
      { id: `ms-${stamp}-3`, label: 'Save progress and rest', completed: false },
    ],
  };
}

const ACTION_VERB_STARTERS = new Set([
  'call', 'text', 'email', 'reply', 'message', 'ping', 'dm', 'pay', 'send',
  'buy', 'pick', 'grab', 'shop', 'order', 'get',
  'clean', 'wash', 'fold', 'vacuum', 'wipe', 'tidy', 'organize', 'declutter', 'sweep',
  'fix', 'debug', 'build', 'write', 'draft', 'code', 'polish', 'refactor', 'deploy', 'design',
  'study', 'read', 'review', 'finish', 'complete', 'submit', 'upload', 'prepare', 'practice',
  'cook', 'make', 'bake', 'eat', 'drink', 'refill', 'brew',
  'walk', 'run', 'stretch', 'exercise', 'workout', 'meditate', 'breathe', 'rest',
  'book', 'schedule', 'cancel', 'renew', 'pack', 'water', 'feed', 'take', 'go', 'do', 'check'
]);

const NON_SPLIT_PREV_WORDS = new Set([
  'to', 'and', 'or', 'will', 'can', 'should', 'must', 'might', 'could', 'would',
  'lets', "let's", 'please', 'help', 'not', 'dont', "don't", 'never', 'just', 'also'
]);

export function splitMultiTaskSentence(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  const cleaned = raw
    .trim()
    .replace(/^(?:hey\s+|hi\s+)?(?:alexa[,:\s]+)?(?:don'?t\s+forget\s+to|remember\s+to|make\s+sure\s+to|can\s+you|i\s+also\s+need\s+to|i\s+need\s+to|i\s+have\s+to|i\s+want\s+to|i\s+should|i\s+gotta|gotta|need\s+to|have\s+to|remind\s+me\s+to|today\s+i\s+will|today\s+i\s+need\s+to|please)\s+/i, '');

  const pass1 = cleaned
    .split(/(?:[,;\n•|]+|\b(?:and\s+then|and\s+also|after\s+that|followed\s+by|as\s+well\s+as|then\s+also|also|then|plus|next|later|finally)\b|(?:^|\s)(?:\d+[.)]|[-*])\s+)/gi)
    .map((s) => s.trim())
    .filter(Boolean);

  const pass2: string[] = [];
  for (const chunk of pass1) {
    const parts = chunk.split(/\band\b/gi).map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      pass2.push(chunk);
      continue;
    }
    let current = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const nextPart = parts[i].replace(/^(?:i\s+need\s+to|i\s+have\s+to|need\s+to|have\s+to|to)\s+/i, '').trim();
      const firstWord = nextPart.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
      if (ACTION_VERB_STARTERS.has(firstWord) || nextPart.split(/\s+/).length >= 3) {
        pass2.push(current);
        current = nextPart;
      } else {
        current = `${current} and ${parts[i]}`;
      }
    }
    if (current) pass2.push(current);
  }

  const finalSegments: string[] = [];
  for (const segment of pass2) {
    const strippedSeg = segment
      .replace(/^(?:i\s+need\s+to|i\s+have\s+to|i\s+want\s+to|need\s+to|have\s+to|gotta)\s+/i, '')
      .trim();
    const words = strippedSeg.split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      if (strippedSeg.length >= 2) finalSegments.push(strippedSeg);
      continue;
    }

    let currentWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '');
      const prevWord = i > 0 ? words[i - 1].toLowerCase().replace(/[^a-z']/g, '') : '';
      const nextWord = i + 1 < words.length ? words[i + 1].toLowerCase().replace(/[^a-z]/g, '') : '';

      const isPhrasalContinuation =
        (prevWord === 'go' && (lowerWord === 'for' || lowerWord === 'walk' || lowerWord === 'run')) ||
        (prevWord === 'take' && lowerWord === 'break') ||
        (prevWord === 'pick' && lowerWord === 'up') ||
        (lowerWord === 'water' && (prevWord === 'drink' || prevWord === 'refill' || prevWord === 'buy' || prevWord === 'hot' || prevWord === 'cold' || nextWord === 'bottle'));

      if (
        i >= 2 &&
        currentWords.length >= 2 &&
        ACTION_VERB_STARTERS.has(lowerWord) &&
        !NON_SPLIT_PREV_WORDS.has(prevWord) &&
        !isPhrasalContinuation
      ) {
        finalSegments.push(currentWords.join(' '));
        currentWords = [word];
      } else {
        currentWords.push(word);
      }
    }
    if (currentWords.length > 0) {
      finalSegments.push(currentWords.join(' '));
    }
  }

  return finalSegments
    .map((s) => s.replace(/^(?:to|and|also|then)\s+/i, '').trim())
    .filter((s) => s.length >= 2);
}

export function deterministicBrainDump(
  raw: string,
  remainingSpoons: number = 8,
  currentInertia: InertiaContext = 'desk'
): TaskItem[] {
  const segments = splitMultiTaskSentence(raw);

  let availableToAllocate = Math.max(1, remainingSpoons);

  return segments.map((seg, idx) => {
    const lower = seg.toLowerCase();
    let spoonCost: SpoonCost = 2;
    let inertia: InertiaContext = 'desk';
    let activationFriction: ActivationFriction = 2;
    let durationLabel = '25 min';

    const durationMatch = lower.match(/(\d+)\s*(min(?:ute)?s?|hr|hour|hours)/i);

    if (/\b(study|write|build|debug|fix|code|architect|paper|essay|abstract|implement|css|portfolio|assignment|exam|project|report|gate)\b/.test(lower)) {
      spoonCost = 3;
      inertia = 'desk';
      activationFriction = 2;
      durationLabel = '35 min';
    } else if (/\b(email|reply|call|text|pay|message|ping|dm|prof|mom|dad|phone|schedule|book)\b/.test(lower)) {
      spoonCost = 1;
      inertia = 'mobile';
      activationFriction = 1;
      durationLabel = '10 min';
    } else if (/\b(clean|wash|buy|walk|milk|groceries|laundry|desk|trash|gym|oat|explore|room|dishes|stretch|water|run|workout|cook|khichdi)\b/.test(lower)) {
      spoonCost = /\b(drink|stretch|refill|water)\b/.test(lower) ? 1 : 2;
      inertia = 'physical';
      activationFriction = 1;
      durationLabel = spoonCost === 1 ? '10 min' : '30 min';
    } else if (/\b(read|review|check|watch|listen|sort|backup|break|meditate|rest)\b/.test(lower)) {
      spoonCost = 1;
      inertia = 'low-brain';
      activationFriction = 1;
      durationLabel = '20 min';
    }

    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      durationLabel = unit.startsWith('h') ? `${num * 60} min` : `${num} min`;
    }
    const timeTagMatch = lower.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    if (timeTagMatch) {
      durationLabel = `${durationLabel} · ${timeTagMatch[1].replace(/\s+/g, '')}`;
    }

    const title = seg.charAt(0).toUpperCase() + seg.slice(1);
    const sliced = deterministicSlice(title);

    const fitsToday =
      availableToAllocate >= spoonCost || inertia === currentInertia || idx === 0;
    if (fitsToday && availableToAllocate >= spoonCost) {
      availableToAllocate -= spoonCost;
    }

    return {
      id: `dump-${Date.now()}-${idx}-${Math.floor(Math.random() * 999)}`,
      title,
      durationLabel,
      spoonCost,
      activationFriction,
      inertia,
      ignitionPrompt: sliced.ignitionPrompt,
      microSteps: sliced.microSteps,
      status: fitsToday ? 'plate' : 'holding',
      rolloverCount: 0,
      createdAt: new Date().toISOString(),
    };
  });
}

export function createInitialTasks(): TaskItem[] {
  return [
    {
      id: 'task-1',
      title: 'Go out for a walk & explore',
      durationLabel: '30 min',
      spoonCost: 1,
      activationFriction: 1,
      inertia: 'physical',
      ignitionPrompt: 'Put on your comfortable shoes and step outside for 30 seconds of fresh air.',
      microSteps: [
        { id: 'm1-1', label: 'Put on walking shoes by the door', completed: true },
        { id: 'm1-2', label: 'Stroll around the park block at an easy pace', completed: false },
        { id: 'm1-3', label: 'Take three deep breaths before heading inside', completed: false },
      ],
      status: 'plate',
      rolloverCount: 0,
      createdAt: '2026-10-23T08:30:00Z',
    },
    {
      id: 'task-2',
      title: 'Take a break or read',
      durationLabel: '40 min',
      spoonCost: 1,
      activationFriction: 1,
      inertia: 'low-brain',
      ignitionPrompt: 'Settle into your armchair and open your book to the current page.',
      microSteps: [
        { id: 'm2-1', label: 'Pour a cup of tea or water', completed: true },
        { id: 'm2-2', label: 'Read one chapter without checking notifications', completed: true },
        { id: 'm2-3', label: 'Stretch gently before returning to desk', completed: false },
      ],
      status: 'plate',
      rolloverCount: 0,
      createdAt: '2026-10-23T09:00:00Z',
    },
    {
      id: 'task-3',
      title: 'Reply to Prof. Nair about lab extension',
      durationLabel: '15 min',
      spoonCost: 2,
      activationFriction: 2,
      inertia: 'mobile',
      ignitionPrompt: 'Open your mail app and type only "Dear Prof. Nair,".',
      microSteps: [
        { id: 'm3-1', label: 'Open draft & write greeting line', completed: false },
        { id: 'm3-2', label: 'Write two sentences requesting the 48h window', completed: false },
        { id: 'm3-3', label: 'Send and close mail tab', completed: false },
      ],
      status: 'plate',
      rolloverCount: 3,
      createdAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'task-4',
      title: 'Polish responsive layout on portfolio',
      durationLabel: '35 min',
      spoonCost: 3,
      activationFriction: 2,
      inertia: 'desk',
      ignitionPrompt: 'Open Header.tsx and adjust the mobile padding on line 24.',
      microSteps: [
        { id: 'm4-1', label: 'Check mobile spacing in preview', completed: false },
        { id: 'm4-2', label: 'Align cards with clean flex gap', completed: false },
        { id: 'm4-3', label: 'Save and verify contrast', completed: false },
      ],
      status: 'plate',
      rolloverCount: 0,
      createdAt: '2026-10-23T09:15:00Z',
    },
    {
      id: 'task-5',
      title: 'Afternoon hydration & stretch reset',
      durationLabel: '10 min',
      spoonCost: 1,
      activationFriction: 1,
      inertia: 'physical',
      ignitionPrompt: 'Pick up your water glass and roll your shoulders back three times.',
      microSteps: [
        { id: 'm5-1', label: 'Refill water bottle with cool water', completed: false },
        { id: 'm5-2', label: 'Take five slow sips away from screens', completed: false },
        { id: 'm5-3', label: 'Un-shrug shoulders and exhale', completed: false },
      ],
      status: 'plate',
      rolloverCount: 1,
      createdAt: '2026-10-22T14:20:00Z',
    },
    {
      id: 'task-6',
      title: 'Organize semester notes & receipts',
      durationLabel: '25 min',
      spoonCost: 3,
      activationFriction: 3,
      inertia: 'desk',
      ignitionPrompt: 'Drag one loose PDF receipt from Desktop into your archive folder.',
      microSteps: [
        { id: 'm6-1', label: 'Create archive folder', completed: false },
        { id: 'm6-2', label: 'Move syllabus PDFs into folder', completed: false },
        { id: 'm6-3', label: 'Close unused browser tabs', completed: false },
      ],
      status: 'holding',
      rolloverCount: 4,
      createdAt: '2026-10-18T11:00:00Z',
    },
    {
      id: 'task-7',
      title: 'Pick up oat milk & essentials',
      durationLabel: '20 min',
      spoonCost: 2,
      activationFriction: 2,
      inertia: 'physical',
      ignitionPrompt: 'Put your reusable bag and keys right by the door handle.',
      microSteps: [
        { id: 'm7-1', label: 'Put shoes on by the door', completed: false },
        { id: 'm7-2', label: 'Walk to corner market', completed: false },
        { id: 'm7-3', label: 'Grab oat milk & head home', completed: false },
      ],
      status: 'holding',
      rolloverCount: 1,
      createdAt: '2026-10-22T16:00:00Z',
    },
    {
      id: 'task-8',
      title: 'Share preview link with teammate',
      durationLabel: '5 min',
      spoonCost: 1,
      activationFriction: 1,
      inertia: 'mobile',
      ignitionPrompt: 'Copy the preview link to your clipboard.',
      microSteps: [
        { id: 'm8-1', label: 'Copy staging link', completed: false },
        { id: 'm8-2', label: 'Paste into team chat', completed: false },
        { id: 'm8-3', label: 'Confirm mobile view works', completed: false },
      ],
      status: 'holding',
      rolloverCount: 0,
      createdAt: '2026-10-23T10:05:00Z',
    },
  ];
}

export function deriveEnergyModeFromSpoons(remaining: number): EnergyMode {
  if (remaining >= 9) return 'high';
  if (remaining >= 4) return 'balanced';
  if (remaining >= 1) return 'survival';
  return 'recharge';
}

export function computeOverdraftAndMarkTasks(
  tasks: TaskItem[],
  dailyBudget: number,
  spentSpoons: number
): { updatedTasks: TaskItem[]; borrowedFromTomorrow: number; committedPlateSpoons: number } {
  const remaining = Math.max(0, dailyBudget - spentSpoons);
  let runningTotal = 0;

  const updatedTasks = tasks.map((t) => {
    if (t.status !== 'plate') {
      return { ...t, isBorrowedEnergy: false };
    }
    runningTotal += t.spoonCost;
    const isBorrowed = runningTotal > remaining;
    return { ...t, isBorrowedEnergy: isBorrowed };
  });

  const rawOverdraft = Math.max(0, runningTotal - remaining);
  const borrowedFromTomorrow = Math.min(3, rawOverdraft);

  return {
    updatedTasks,
    borrowedFromTomorrow,
    committedPlateSpoons: runningTotal,
  };
}

interface SaccadicTextProps {
  text: string;
  className?: string;
  enabled: boolean;
}

export const SaccadicText: React.FC<SaccadicTextProps> = ({ text, className = '', enabled }) => {
  if (!enabled) {
    return <span className={className}>{text}</span>;
  }

  const tokens = text.split(/(\s+)/);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (/^\s+$/.test(token) || token.length === 0) {
          return <React.Fragment key={idx}>{token}</React.Fragment>;
        }
        const anchorLen = Math.max(1, Math.ceil(token.length * 0.45));
        const anchor = token.slice(0, anchorLen);
        const trail = token.slice(anchorLen);

        return (
          <span key={idx} className="inline">
            <span className="opacity-100 underline decoration-current/25 decoration-1 underline-offset-4">
              {anchor}
            </span>
            <span className="opacity-[0.68]">{trail}</span>
          </span>
        );
      })}
    </span>
  );
};

const CalendarMoodFaceSVG: React.FC<{ mood: 'blue' | 'green' | 'yellow' }> = ({ mood }) => {
  if (mood === 'blue') {
    return (
      <svg viewBox="0 0 36 36" className="w-7 h-7 overflow-visible">
        <circle cx="18" cy="20" r="12" fill="#1E6FB8" />
        <path
          d="M13 9 L14 5 M17 8 L18 4 M21 8 L23 5 M24 10 L26 7"
          stroke="#18201B"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="15" cy="18" r="1.2" fill="#18201B" />
        <circle cx="21" cy="18" r="1.2" fill="#18201B" />
        <ellipse cx="18" cy="22.5" rx="1.3" ry="1.8" fill="#18201B" />
      </svg>
    );
  }
  if (mood === 'green') {
    return (
      <svg viewBox="0 0 36 36" className="w-7 h-7 overflow-visible">
        <circle cx="18" cy="20" r="12" fill="#288548" />
        <path
          d="M15 8 C15 5 18 5 18 8 C18 5 21 5 21 8"
          stroke="#18201B"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="14.5" cy="18.5" r="1.2" fill="#18201B" />
        <circle cx="21.5" cy="18.5" r="1.2" fill="#18201B" />
        <path
          d="M15.5 22.5 Q18 20.5 20.5 22.5"
          stroke="#18201B"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 36 36" className="w-7 h-7 overflow-visible">
      <circle cx="18" cy="20" r="12" fill="#F6C915" />
      <path
        d="M18 8 V4 M16 6 L18 4 L20 6"
        stroke="#18201B"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="14.5" cy="18.5" r="1.2" fill="#18201B" />
      <circle cx="21.5" cy="18.5" r="1.2" fill="#18201B" />
      <path
        d="M15 22 Q18 25 21 22"
        stroke="#18201B"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

const WalkingCharacterSVG: React.FC<{ className?: string }> = ({ className = 'w-24 h-20' }) => (
  <svg viewBox="0 0 110 100" className={`${className} shrink-0 overflow-visible`}>
    <path d="M8 92 H102" stroke="#18201B" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M24 92 L21 85 M27 92 L28 84 M30 92 L33 86" stroke="#18201B" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M54 66 L42 84 L48 89" stroke="#18201B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <ellipse cx="42" cy="87" rx="7" ry="4" transform="rotate(-25 42 87)" fill="#1E6FB8" stroke="#18201B" strokeWidth="2" />
    <path d="M66 66 L76 84" stroke="#18201B" strokeWidth="8" strokeLinecap="round" fill="none" />
    <ellipse cx="80" cy="89" rx="7.5" ry="4" fill="#1E6FB8" stroke="#18201B" strokeWidth="2" />
    <rect x="46" y="38" width="28" height="28" rx="10" fill="#FFFFFF" stroke="#18201B" strokeWidth="2.2" />
    <path d="M46 44 C36 42 34 32 39 28" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M46 44 C36 42 34 32 39 28" stroke="#18201B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M74 45 C82 50 84 58 78 62" stroke="#18201B" strokeWidth="2.2" strokeLinecap="round" fill="#FFFFFF" />
    <path d="M44 26 C40 16 52 10 62 12 C72 10 80 18 76 28 C80 34 74 40 68 38" fill="#18201B" />
    <circle cx="59" cy="26" r="11" fill="#FFFFFF" stroke="#18201B" strokeWidth="2.2" />
    <path d="M49 20 Q55 15 62 18 Q67 16 70 22" fill="none" stroke="#18201B" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="55" cy="25" r="1.4" fill="#18201B" />
    <circle cx="63" cy="25" r="1.4" fill="#18201B" />
    <path d="M56 30 Q59 33 62 30" stroke="#18201B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const ReadingCharacterSVG: React.FC<{ className?: string }> = ({ className = 'w-24 h-20' }) => (
  <svg viewBox="0 0 110 100" className={`${className} shrink-0 overflow-visible`}>
    <path
      d="M36 46 C36 32 88 32 88 46 V82 C88 86 84 88 78 88 H42 C36 88 32 84 32 78 V58 C32 52 36 50 36 46 Z"
      fill="#B8B6B0"
      stroke="#18201B"
      strokeWidth="2.2"
    />
    <path d="M44 88 L41 95 M78 88 L81 95" stroke="#18201B" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M44 34 C44 16 76 16 76 34 L80 52 H42 Z" fill="#18201B" />
    <circle cx="60" cy="34" r="11" fill="#FFFFFF" stroke="#18201B" strokeWidth="2.2" />
    <circle cx="56" cy="34" r="3.2" fill="none" stroke="#18201B" strokeWidth="1.6" />
    <circle cx="64" cy="34" r="3.2" fill="none" stroke="#18201B" strokeWidth="1.6" />
    <path d="M59 34 H61" stroke="#18201B" strokeWidth="1.6" />
    <rect x="46" y="46" width="28" height="24" rx="8" fill="#FFFFFF" stroke="#18201B" strokeWidth="2" />
    <rect x="49" y="52" width="18" height="13" rx="2.5" fill="#EAE8E1" stroke="#18201B" strokeWidth="2" />
    <path d="M48 70 L36 86 M62 70 L50 88" stroke="#18201B" strokeWidth="8" strokeLinecap="round" />
    <ellipse cx="32" cy="89" rx="7" ry="3.8" fill="#1E6FB8" stroke="#18201B" strokeWidth="2" />
    <ellipse cx="46" cy="91" rx="7" ry="3.8" fill="#1E6FB8" stroke="#18201B" strokeWidth="2" />
  </svg>
);

const AstronautHeroSVG: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <svg
    viewBox="0 0 320 250"
    className={`${compact ? 'w-48 h-40' : 'w-full h-52'} overflow-visible select-none shrink-0`}
  >
    <circle
      cx="165"
      cy="135"
      r="112"
      fill="none"
      stroke="#FCFBF8"
      strokeWidth="1"
      strokeOpacity="0.55"
      strokeDasharray="140 28 90 35"
    />
    <circle
      cx="165"
      cy="135"
      r="82"
      fill="none"
      stroke="#FCFBF8"
      strokeWidth="1"
      strokeOpacity="0.6"
      strokeDasharray="110 35 80 25"
    />
    <circle
      cx="165"
      cy="135"
      r="52"
      fill="none"
      stroke="#FCFBF8"
      strokeWidth="1"
      strokeOpacity="0.65"
      strokeDasharray="65 25 50 20"
    />
    <polygon points="135,22 138,29 145,29 139,34 141,41 135,37 129,41 131,34 125,29 132,29" fill="#FCFBF8" />
    <polygon points="54,132 56,136 61,136 57,139 58,144 54,141 50,144 51,139 47,136 52,136" fill="#FCFBF8" />
    <polygon points="255,65 257,69 261,69 258,72 259,76 255,73 251,76 252,72 249,69 253,69" fill="#FCFBF8" />
    <polygon points="242,102 244,107 249,107 245,110 246,115 242,112 238,115 239,110 235,107 240,107" fill="#FCFBF8" />
    <polygon points="286,188 289,194 295,194 290,198 292,204 286,200 280,204 282,198 277,194 283,194" fill="#FCFBF8" />
    <path d="M152 142 C142 126 154 106 174 104 C158 114 154 128 160 138 Z" fill="#FCFBF8" />
    <polygon points="154,144 158,152 167,153 160,159 162,168 154,163 146,168 148,159 141,153 150,152" fill="#FCFBF8" />
    <path d="M126 242 C144 212 178 212 194 242" fill="none" stroke="#18201B" strokeWidth="1.8" />
    <path d="M115 232 C145 224 185 232 204 244" fill="none" stroke="#18201B" strokeWidth="1.6" />
    <g transform="translate(185, 92) rotate(12)">
      <rect x="28" y="42" width="46" height="52" rx="12" fill="#819576" stroke="#18201B" strokeWidth="2.4" />
      <path d="M28 54 C14 42 8 24 18 16 C26 10 34 22 32 36" fill="#819576" stroke="#18201B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 26 L26 22 M18 33 L28 30" stroke="#18201B" strokeWidth="2" />
      <path d="M72 56 C86 64 90 80 80 88 C72 94 64 84 66 72" fill="#819576" stroke="#18201B" strokeWidth="2.4" />
      <rect x="28" y="46" width="44" height="48" rx="14" fill="#819576" stroke="#18201B" strokeWidth="2.4" />
      <rect x="37" y="56" width="26" height="18" rx="4" fill="#819576" stroke="#18201B" strokeWidth="2" />
      <circle cx="44" cy="65" r="2.5" fill="#18201B" />
      <line x1="50" y1="62" x2="58" y2="62" stroke="#18201B" strokeWidth="2" />
      <line x1="50" y1="68" x2="58" y2="68" stroke="#18201B" strokeWidth="2" />
      <path d="M34 94 L30 116 H46 L48 94" fill="#819576" stroke="#18201B" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M54 94 L56 116 H72 L68 94" fill="#819576" stroke="#18201B" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="26" y="112" width="22" height="10" rx="5" fill="#819576" stroke="#18201B" strokeWidth="2.4" />
      <rect x="54" y="112" width="22" height="10" rx="5" fill="#819576" stroke="#18201B" strokeWidth="2.4" />
      <circle cx="52" cy="26" r="26" fill="#819576" stroke="#18201B" strokeWidth="2.5" />
      <ellipse cx="56" cy="26" rx="16" ry="13" fill="#18201B" />
      <path d="M48 18 C54 15 62 17 65 23" stroke="#FCFBF8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  </svg>
);

interface BottomNavBarProps {
  activeScreen: 'home' | 'calendar' | 'progress' | 'capture' | 'settings';
  onNavigate: (screen: 'home' | 'calendar' | 'progress' | 'capture' | 'settings') => void;
  variant?: 'sage' | 'white';
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeScreen,
  onNavigate,
  variant = 'white',
}) => {
  const isSage = variant === 'sage';

  return (
    <div className="pt-3 pb-1 flex flex-col items-center">
      <div className="w-full flex items-center justify-center gap-3 px-2">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-transform active:scale-95"
          style={{
            backgroundColor:
              activeScreen === 'home'
                ? isSage
                  ? 'rgba(255,255,255,0.22)'
                  : '#EAE8E1'
                : 'transparent',
            borderColor: '#18201B',
            color: '#18201B',
          }}
        >
          <Home className="w-4 h-4 fill-current" />
          <span>home</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('calendar')}
          className="p-2 rounded-xl transition-opacity hover:opacity-100"
          style={{
            color: '#18201B',
            backgroundColor: activeScreen === 'calendar' ? 'rgba(24,32,27,0.1)' : 'transparent',
          }}
          title="Calendar"
          aria-label="Calendar"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('capture')}
          className="p-2 rounded-xl transition-opacity hover:opacity-100"
          style={{ color: '#18201B' }}
          title="Add activity"
          aria-label="Add activity"
        >
          <PenLine className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs transition-transform active:scale-95"
          style={{
            backgroundColor: '#354939',
            color: '#FAF9F6',
          }}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
      <div className="w-28 h-1 rounded-full bg-[#18201B] mt-3 opacity-85" />
    </div>
  );
};

interface AlexaSimulatorProps {
  userName: string;
  remainingSpoons: number;
  dailyBudget: number;
  onRebalanceLive: () => void;
  onDecomposeLive: (microSteps: string[]) => void;
  onSleepSyncLive: (minutes: number, newBudget: number) => void;
  onSensoryShieldLive: () => void;
  onVoiceBrainDumpLive: (utterance: string) => void;
  onBodyDoubleLive: () => void;
  onCustomPlanLive: (
    utterance: string,
    sleepHours: number | null,
    explicitSpoons: number | null,
    isOverwhelmed: boolean,
    activateBrownNoise: boolean,
    taskSegmentText: string,
    maxTasks: number | null,
    clearBoard: boolean
  ) => number;
}

const BuiltInAlexaPlusSimulator: React.FC<AlexaSimulatorProps> = ({
  userName,
  remainingSpoons,
  dailyBudget,
  onRebalanceLive,
  onDecomposeLive,
  onSleepSyncLive,
  onSensoryShieldLive,
  onVoiceBrainDumpLive,
  onBodyDoubleLive,
  onCustomPlanLive,
}) => {
  const [alexaReply, setAlexaReply] = useState(
    `Hi ${userName}. You have ${remainingSpoons} of ${dailyBudget} spoons available today. Say or type anything to Alexa+ below and Spoons will build your plan.`
  );
  const [mcpLog, setMcpLog] = useState(
    'POST /api/mcp (Spec 2025-11-25 Streamable HTTP Ready)'
  );
  const [loading, setLoading] = useState(false);
  const [customUtterance, setCustomUtterance] = useState('');
  const [isListening, setIsListening] = useState(false);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    }
  };

  const invokeMcp = async (toolName: string, args: Record<string, unknown>, utterance: string) => {
    setLoading(true);
    const reqPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    };
    setMcpLog(
      `Utterance: "${utterance}"\nRequest -> POST /api/mcp (2025-11-25)\n` +
        JSON.stringify(reqPayload, null, 2)
    );

    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload),
      });
      const data = await res.json();
      setMcpLog((prev) => `${prev}\n\nResponse <- MCP Server\n` + JSON.stringify(data, null, 2));

      const parsed = JSON.parse(data?.result?.content?.[0]?.text || '{}');

      if (toolName === 'plan_from_any_utterance') {
        const addedCount = onCustomPlanLive(
          utterance,
          parsed.detectedSleepHours ?? null,
          parsed.explicitSpoons ?? null,
          Boolean(parsed.isOverwhelmed),
          Boolean(parsed.activateBrownNoise),
          String(parsed.taskSegmentText ?? ""),
          parsed.maxTasks ?? null,
          Boolean(parsed.clearBoard)
        );
        const msg =
          parsed.alexaSpokenResponse ||
          `I analyzed your request in Spoons and organized ${addedCount} energy-paced tasks for your schedule.`;
        setAlexaReply(msg);
        speak(msg);
      } else if (toolName === 'rebalance_schedule') {
        onRebalanceLive();
        const msg =
          parsed.alexaSpokenResponse ||
          'I updated your energy budget to 2 spoons, switched Spoons to Quiet Dusk mode, and deferred heavy tasks to tomorrow.';
        setAlexaReply(msg);
        speak(msg);
      } else if (toolName === 'log_sleep_and_calibrate') {
        onSleepSyncLive(parsed.sleepMinutes || 255, parsed.calibratedDailyBudget || 6);
        const msg =
          parsed.alexaSpokenResponse ||
          'I logged 4 hours and 15 minutes of sleep. Because of sleep debt, I calibrated your daily budget to 6 spoons so you can pace gently.';
        setAlexaReply(msg);
        speak(msg);
      } else if (toolName === 'trigger_sensory_shield') {
        onSensoryShieldLive();
        const msg =
          parsed.alexaSpokenResponse ||
          'I activated your 380 Hertz brown noise acoustic shield, logged sensory overload, and dimmed Spoons to Quiet Dusk.';
        setAlexaReply(msg);
        speak(msg);
      } else if (toolName === 'voice_brain_dump') {
        const rawText = String(args.rawUtterance || 'call mom buy oat milk and check lab notes');
        onVoiceBrainDumpLive(rawText);
        const msg =
          parsed.alexaSpokenResponse ||
          'I captured your voice brain dump, split it into 3 energy-tagged tasks, and checked off your morning water and breakfast.';
        setAlexaReply(msg);
        speak(msg);
      } else if (toolName === 'decompose_overwhelming_task') {
        const steps: string[] = parsed.microSteps || [
          '1. [1 Spoon] Open Header.tsx without editing yet',
          '2. [1 Spoon] Adjust mobile flex gap on line 24',
          '3. [1 Spoon] Save and take a 5-minute sensory rest',
        ];
        onDecomposeLive(steps);
        const msg = `I used Amazon Bedrock to break that down into 3 low-friction steps. ${steps[0]}`;
        setAlexaReply(`${msg}\n\n${steps.join('\n')}`);
        speak(msg);
      } else if (toolName === 'start_body_double') {
        onBodyDoubleLive();
        const msg =
          'Starting your 5-minute body-doubling flow timer now. Just do the first 30 seconds with me—open Header.tsx and adjust line 24.';
        setAlexaReply(msg);
        speak(msg);
      }
    } catch {
      if (toolName === 'plan_from_any_utterance') {
        onCustomPlanLive(utterance, 5, 3, true, false, "", 3, true);
      }
      if (toolName === 'rebalance_schedule') onRebalanceLive();
      if (toolName === 'log_sleep_and_calibrate') onSleepSyncLive(255, 6);
      if (toolName === 'trigger_sensory_shield') onSensoryShieldLive();
      if (toolName === 'voice_brain_dump') onVoiceBrainDumpLive('call mom buy oat milk and check lab notes');
      if (toolName === 'start_body_double') onBodyDoubleLive();
      setAlexaReply('Executed Alexa+ MCP tool and synced your Spoons board.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAlexaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUtterance.trim()) return;
    const text = customUtterance.trim();
    setCustomUtterance('');
    invokeMcp('plan_from_any_utterance', { utterance: text }, text);
  };

  const recognitionRef = useRef<any>(null);

  const startVoiceRecognition = async () => {
    if (typeof window === "undefined") return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setAlexaReply("Speech recognition is not supported in this browser. Please open localhost:3000 in Google Chrome or Safari (and enable Dictation in macOS System Settings -> Keyboard).");
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setAlexaReply("Microphone access was blocked. Please click the camera/mic icon in your browser address bar and allow Microphone access for localhost.");
      return;
    }

    try {
      window.speechSynthesis?.cancel();
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = "";

      recognition.onstart = () => {
        setIsListening(true);
        setAlexaReply("🎙️ Listening... Speak now (e.g., \"Alexa, I slept 5 hours and need to study for GATE, reply to Prof Nair, and cook dinner\")");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += piece + " ";
          } else {
            interim += piece;
          }
        }
        const combined = (finalTranscript + interim).trim();
        if (combined) {
          setCustomUtterance(combined);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          setAlexaReply("Microphone permission denied. Please allow microphone access in your browser settings.");
        } else if (event.error === "no-speech") {
          setAlexaReply("No speech was detected. Click Speak and talk into your microphone.");
        } else {
          setAlexaReply("Voice error (" + event.error + "). If on Safari, make sure macOS Dictation is enabled in System Settings -> Keyboard -> Dictation.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const spokenText = finalTranscript.trim();
        if (spokenText) {
          setCustomUtterance(spokenText);
          invokeMcp("plan_from_any_utterance", { utterance: spokenText }, spokenText);
        }
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setAlexaReply("Could not start microphone recognition. Try using Chrome or enabling macOS Dictation.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4">
      <div
        className="rounded-[32px] p-5 sm:p-6 shadow-xl border"
        style={{
          backgroundColor: '#18201B',
          borderColor: 'rgba(124, 144, 112, 0.45)',
          color: '#FAF9F6',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#E2F0C5] animate-pulse inline-block" />
            <h3 className="text-xs sm:text-sm font-extrabold tracking-wide text-[#E2F0C5]">
              Spoons • Alexa+ Multimodal Simulator (MCP Spec 2025-11-25)
            </h3>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#354939] text-[#E2F0C5] border border-[#7C9070]/40">
            Amazon Bedrock Nova Lite + Live Voice Planner
          </span>
        </div>

        <form onSubmit={handleCustomAlexaSubmit} className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={customUtterance}
            onChange={(e) => setCustomUtterance(e.target.value)}
            placeholder='Say or type anything to Alexa+ (e.g., "Alexa, I slept 5 hours, I feel overwhelmed, and I need to study for GATE, reply to Prof Nair, and cook dinner")...'
            className="flex-1 min-w-[240px] px-4 py-2.5 rounded-full bg-[#111612] border border-[#7C9070]/40 text-xs sm:text-sm text-[#FAF9F6] placeholder-[#A8B0A4] focus:outline-none focus:border-[#E2F0C5]"
          />
          <button
            type="button"
            onClick={startVoiceRecognition}
            className="px-4 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 border border-[#7C9070]/50 transition-transform active:scale-95"
            style={{
              backgroundColor: isListening ? '#E2F0C5' : '#242E26',
              color: isListening ? '#18201B' : '#E2F0C5',
            }}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isListening ? 'Listening...' : 'Speak'}</span>
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 transition-transform active:scale-95"
            style={{ backgroundColor: '#7C9070', color: '#FAF9F6' }}
          >
            <span>Ask Alexa+ to Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between rounded-[24px] bg-black/35 p-4 border border-white/10">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#A8B0A4] font-bold mb-1.5">
                Alexa+ Voice & Echo Show Card Output
              </div>
              <div className="p-3.5 rounded-2xl bg-[#111612] border border-[#7C9070]/30 text-xs sm:text-sm leading-relaxed whitespace-pre-line text-[#FAF9F6]">
                {loading ? 'Alexa+ is invoking MCP tool via /api/mcp...' : alexaReply}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[11px] text-[#A8B0A4] mb-2 font-medium">
                Or Trigger Preset Voice Utterances (Syncs Spoons Board Below):
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    invokeMcp(
                      'log_sleep_and_calibrate',
                      { hoursSlept: 4.25, sleepQuality: 'fragmented' },
                      'Alexa, I only slept 4 hours and 15 minutes last night. Calibrate my spoons.'
                    )
                  }
                  className="text-xs px-3.5 py-2 rounded-full font-bold transition-transform active:scale-95"
                  style={{ backgroundColor: '#7C9070', color: '#FAF9F6' }}
                >
                  😴 &ldquo;Alexa, I only slept 4h 15m—calibrate my day&rdquo;
                </button>

                <button
                  type="button"
                  onClick={() =>
                    invokeMcp(
                      'trigger_sensory_shield',
                      { triggerType: 'sensory noise' },
                      'Alexa, it is too loud in here—turn on my sensory shield.'
                    )
                  }
                  className="text-xs px-3.5 py-2 rounded-full font-bold transition-transform active:scale-95 bg-[#354939] text-[#E2F0C5] border border-[#7C9070]/50"
                >
                  🎧 &ldquo;Alexa, turn on 380Hz sensory shield&rdquo;
                </button>

                <button
                  type="button"
                  onClick={() =>
                    invokeMcp(
                      'rebalance_schedule',
                      { remainingSpoons: 2, sensoryState: 'migraine & overwhelmed' },
                      'Alexa, I have a migraine and I am down to 2 spoons. Rebalance my afternoon.'
                    )
                  }
                  className="text-xs px-3.5 py-2 rounded-full font-semibold bg-[#242E26] text-[#FAF9F6] border border-white/15 hover:bg-[#2F3B31]"
                >
                  🎙️ &ldquo;Alexa, I&apos;m down to 2 spoons—rebalance&rdquo;
                </button>

                <button
                  type="button"
                  onClick={() =>
                    invokeMcp(
                      'voice_brain_dump',
                      { rawUtterance: 'call mom buy oat milk and check lab notes' },
                      'Alexa, brain dump: call mom buy oat milk and check lab notes, plus I drank water and ate breakfast.'
                    )
                  }
                  className="text-xs px-3.5 py-2 rounded-full font-semibold bg-[#242E26] text-[#E2F0C5] border border-[#7C9070]/40 hover:bg-[#2F3B31]"
                >
                  🧠 &ldquo;Alexa, brain dump chores & log breakfast&rdquo;
                </button>

                <button
                  type="button"
                  onClick={() =>
                    invokeMcp(
                      'decompose_overwhelming_task',
                      { taskTitle: 'Polish responsive layout on portfolio' },
                      'Alexa, break down my portfolio layout task into 1-spoon steps.'
                    )
                  }
                  className="text-xs px-3.5 py-2 rounded-full font-semibold bg-[#242E26] text-[#FAF9F6] border border-white/15 hover:bg-[#2F3B31]"
                >
                  ⚡ &ldquo;Alexa, break down portfolio task (Bedrock)&rdquo;
                </button>

                <button
                  type="button"
                  onClick={() =>
                    invokeMcp(
                      'start_body_double',
                      { taskId: 'task-4', durationMinutes: 5 },
                      'Alexa, I have task paralysis—body double with me for 5 minutes.'
                    )
                  }
                  className="text-xs px-3.5 py-2 rounded-full font-semibold bg-[#242E26] text-[#E2F0C5] border border-[#7C9070]/40 hover:bg-[#2F3B31]"
                >
                  ⏱️ &ldquo;Alexa, body double with me for 5m&rdquo;
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-[24px] bg-black/80 p-4 border border-white/10 font-mono text-[11px] overflow-x-auto max-h-64">
            <div className="text-[#A8B0A4] mb-1.5 border-b border-white/10 pb-1 font-bold">
              LIVE MCP JSON-RPC INSPECTOR (`POST /api/mcp`)
            </div>
            <pre className="text-[#E2F0C5] whitespace-pre-wrap m-0">{mcpLog}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

const STORAGE_KEY = 'spoons-v2-storage';

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,opsz,SOFT,WONK,wght@0,9..144,0..100,0..1,400..700;1,9..144,0..100,0..1,400..700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  :root {
    --sage-card: #7C9070;
    --sage-deep: #354939;
    --stone-card: #EAE8E1;
    --charcoal-card: #404040;
    --sheet-white: #FAF9F6;
    --text-primary: #18201B;
    --text-muted: #525D55;
    --accent-primary: #354939;
    --border-subtle: #DCD8CE;
  }

  .font-jakarta {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }
  .font-hyperlegible {
    font-family: 'Atkinson Hyperlegible', system-ui, -apple-system, sans-serif;
  }
  .font-mono-ui {
    font-family: 'JetBrains Mono', monospace;
  }
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
  [data-energy-mode="survival"] .bg-\\[\\#FAF9F6\\],
  [data-energy-mode="recharge"] .bg-\\[\\#FAF9F6\\],
  [data-energy-mode="survival"] .bg-\\[\\#FAF9F6\\]\\/95,
  [data-energy-mode="recharge"] .bg-\\[\\#FAF9F6\\]\\/95,
  [data-energy-mode="survival"] .bg-white,
  [data-energy-mode="recharge"] .bg-white {
    background-color: #242A24 !important;
    color: #E4DFD3 !important;
    border-color: rgba(124, 144, 112, 0.25) !important;
  }
  [data-energy-mode="survival"] .bg-\\[\\#EAE8E1\\],
  [data-energy-mode="recharge"] .bg-\\[\\#EAE8E1\\] {
    background-color: #2E362E !important;
    color: #E4DFD3 !important;
  }
  [data-energy-mode="survival"] .text-\\[\\#18201B\\],
  [data-energy-mode="recharge"] .text-\\[\\#18201B\\],
  [data-energy-mode="survival"] .text-\\[\\#2B2D2A\\],
  [data-energy-mode="recharge"] .text-\\[\\#2B2D2A\\] {
    color: #E4DFD3 !important;
  }
  [data-energy-mode="survival"] .text-\\[\\#525D55\\],
  [data-energy-mode="recharge"] .text-\\[\\#525D55\\] {
    color: #A8B0A4 !important;
  }
`;

export default function App() {
  const [userName, setUserName] = useState<string>("Radha");
  const [customTaskLimit, setCustomTaskLimit] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  const [dailyBudget, setDailyBudgetState] = useState<number>(10);
  const [spentSpoons, setSpentSpoons] = useState<number>(2);
  const [currentInertia, setCurrentInertia] = useState<InertiaContext>('desk');
  const [energyMode, setEnergyModeState] = useState<EnergyMode>('high');
  const [tasks, setTasks] = useState<TaskItem[]>(() => createInitialTasks());
  const [sensory, setSensory] = useState<SensoryProfile>({
    fontFamily: 'jakarta',
    saccadicReading: false,
    reducedMotion: false,
    brownNoiseActive: false,
    brownNoiseVolume: 0.35,
    uxAnnotationsVisible: false,
  });

  const [deviceViewMode, setDeviceViewMode] = useState<'web' | 'phone-single' | 'phone-showcase'>('web');
  const [activePhoneScreen, setActivePhoneScreen] = useState<'calendar' | 'home' | 'progress'>('home');
  const [activeWebNav, setActiveWebNav] = useState<'overview' | 'calendar' | 'progress' | 'activities'>('overview');

  const nowDate = useMemo(() => new Date(), []);
  const currentDayOfMonth = nowDate.getDate();
  const currentMonthShort = nowDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const currentFullDateLabel = nowDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const firstDayOffset = useMemo(
    () => new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getDay(),
    [nowDate]
  );
  const daysInCurrentMonth = useMemo(
    () => new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate(),
    [nowDate]
  );

  const [calendarMoods, setCalendarMoods] = useState<Record<number, 'blue' | 'green' | 'yellow'>>({
    1: 'blue',
    2: 'green',
    3: 'yellow',
    23: 'green',
  });
  const [selectedMonth, setSelectedMonth] = useState(currentMonthShort);

  const [activeIgnitionTask, setActiveIgnitionTask] = useState<TaskItem | null>(null);
  const [sandbarRunning, setSandbarRunning] = useState(false);
  const [sandbarElapsed, setSandbarElapsed] = useState(65);

  const [activeWorkspaceView, setActiveWorkspaceView] = useState<
    'plate' | 'holding' | 'compost' | 'completed' | 'recharge'
  >('plate');

  const [baselineItems, setBaselineItems] = useState<BaselineLivingItem[]>([
    { id: 'base-wake', label: 'Morning wake-up', spoons: 1, completed: true },
    { id: 'base-meds', label: 'Water & essentials', spoons: 1, completed: true },
    { id: 'base-shower', label: 'Freshen up', spoons: 1, completed: false },
    { id: 'base-food', label: 'Breakfast', spoons: 1, completed: false },
  ]);

  const [taskTiers, setTaskTiers] = useState<Record<string, TaskTier>>({});
  const [goldenReserveLocked, setGoldenReserveLocked] = useState<boolean>(true);
  const [spoonThieves, setSpoonThieves] = useState<SpoonThiefItem[]>([
    { id: 'thief-noise', label: 'Sensory noise', drain: 1, count: 0 },
    { id: 'thief-flare', label: 'Physical fatigue', drain: 2, count: 0 },
    { id: 'thief-social', label: 'Long meetings', drain: 1, count: 0 },
  ]);
  const [bedBoundMode, setBedBoundMode] = useState<boolean>(false);
  const [shareBatteryOpen, setShareBatteryOpen] = useState<boolean>(false);

  const [sleepMinutes, setSleepMinutes] = useState<number>(288);
  const [dietPercent, setDietPercent] = useState<number>(80);
  const [dietKcal, setDietKcal] = useState<number>(1600);
  const [exercisePercent, setExercisePercent] = useState<number>(45);
  const [exerciseSteps, setExerciseSteps] = useState<number>(1300);

  const [previewOverrides, setPreviewOverrides] = useState<
    Record<number, { spoonCost?: SpoonCost; inertia?: InertiaContext; removed?: boolean }>
  >({});

  const [brainDumpInput, setBrainDumpInput] = useState('');
  const [brainDumpNotice, setBrainDumpNotice] = useState<string | null>(null);
  const [sensoryDrawerOpen, setSensoryDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.userName === 'string' && parsed.userName.trim()) {
          setUserName(parsed.userName);
        }
        if (typeof parsed.dailyBudget === 'number') setDailyBudgetState(parsed.dailyBudget);
        if (typeof parsed.spentSpoons === 'number') setSpentSpoons(parsed.spentSpoons);
        if (parsed.currentInertia) setCurrentInertia(parsed.currentInertia);
        if (parsed.energyMode) setEnergyModeState(parsed.energyMode);
        if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) setTasks(parsed.tasks);
        if (Array.isArray(parsed.baselineItems)) setBaselineItems(parsed.baselineItems);
        if (parsed.taskTiers) setTaskTiers(parsed.taskTiers);
        if (typeof parsed.goldenReserveLocked === 'boolean') setGoldenReserveLocked(parsed.goldenReserveLocked);
        if (Array.isArray(parsed.spoonThieves)) setSpoonThieves(parsed.spoonThieves);
        if (typeof parsed.bedBoundMode === 'boolean') setBedBoundMode(parsed.bedBoundMode);
        if (parsed.calendarMoods) setCalendarMoods(parsed.calendarMoods);
        if (typeof parsed.sleepMinutes === 'number') setSleepMinutes(parsed.sleepMinutes);
        if (typeof parsed.dietPercent === 'number') setDietPercent(parsed.dietPercent);
        if (typeof parsed.dietKcal === 'number') setDietKcal(parsed.dietKcal);
        if (typeof parsed.exercisePercent === 'number') setExercisePercent(parsed.exercisePercent);
        if (typeof parsed.exerciseSteps === 'number') setExerciseSteps(parsed.exerciseSteps);
        if (parsed.sensory) {
          setSensory((prev) => ({
            ...prev,
            ...parsed.sensory,
            brownNoiseActive: false,
            uxAnnotationsVisible: false,
          }));
        }
      }
    } catch {}
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          userName,
          dailyBudget,
          spentSpoons,
          currentInertia,
          energyMode,
          tasks,
          baselineItems,
          taskTiers,
          goldenReserveLocked,
          spoonThieves,
          bedBoundMode,
          calendarMoods,
          sleepMinutes,
          dietPercent,
          dietKcal,
          exercisePercent,
          exerciseSteps,
          sensory: { ...sensory, brownNoiseActive: false, uxAnnotationsVisible: false },
        })
      );
    } catch {}
  }, [
    userName,
    dailyBudget,
    spentSpoons,
    currentInertia,
    energyMode,
    tasks,
    baselineItems,
    taskTiers,
    goldenReserveLocked,
    spoonThieves,
    bedBoundMode,
    calendarMoods,
    sleepMinutes,
    dietPercent,
    dietKcal,
    exercisePercent,
    exerciseSteps,
    sensory,
  ]);

  useEffect(() => {
    if (!sandbarRunning) return;
    const t = setInterval(() => {
      setSandbarElapsed((prev) => (prev >= 300 ? 300 : prev + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [sandbarRunning]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const remainingSpoons = Math.max(0, dailyBudget - spentSpoons);

  const { updatedTasks } = useMemo(
    () => computeOverdraftAndMarkTasks(tasks, dailyBudget, spentSpoons),
    [tasks, dailyBudget, spentSpoons]
  );

  const visiblePlateTasks = useMemo(
    () =>
      getVisiblePlateTasks(
        updatedTasks,
        energyMode,
        remainingSpoons,
        currentInertia,
        dailyBudget,
        spentSpoons
      ),
    [updatedTasks, energyMode, remainingSpoons, currentInertia, dailyBudget, spentSpoons]
  );

  const filteredVisiblePlateTasks = useMemo(() => {
    if (customTaskLimit !== null) {
      return updatedTasks
        .filter((t) => t.status === "plate")
        .sort((a, b) => a.spoonCost - b.spoonCost)
        .slice(0, customTaskLimit);
    }
    if (!bedBoundMode) return visiblePlateTasks;
    const lowEffort = visiblePlateTasks.filter((t) => t.inertia !== "physical");
    return lowEffort.length > 0 ? lowEffort : visiblePlateTasks;
  }, [visiblePlateTasks, bedBoundMode, customTaskLimit, updatedTasks]);

  const holdingTasks = useMemo(() => {
    return updatedTasks
      .filter((t) => t.status === 'holding')
      .sort(
        (a, b) =>
          calculateTaskCompatibility(b, remainingSpoons, currentInertia, dailyBudget, spentSpoons) -
          calculateTaskCompatibility(a, remainingSpoons, currentInertia, dailyBudget, spentSpoons)
      );
  }, [updatedTasks, remainingSpoons, currentInertia, dailyBudget, spentSpoons]);

  const compostedTasks = useMemo(
    () => updatedTasks.filter((t) => t.status === 'composted'),
    [updatedTasks]
  );

  const completedTasks = useMemo(
    () => updatedTasks.filter((t) => t.status === 'completed'),
    [updatedTasks]
  );

  const totalThiefDrain = useMemo(
    () => spoonThieves.reduce((acc, item) => acc + item.drain * item.count, 0),
    [spoonThieves]
  );

  const formattedSleepDuration = useMemo(() => {
    const hrs = Math.floor(sleepMinutes / 60);
    const mins = sleepMinutes % 60;
    return `${hrs}h ${mins < 10 ? `0${mins}` : mins} m`;
  }, [sleepMinutes]);

  const sleepQualityPercent = useMemo(
    () => Math.min(100, Math.round((sleepMinutes / 480) * 100)),
    [sleepMinutes]
  );

  const progressPercentage = useMemo(() => {
    const baselineDone = baselineItems.filter((b) => b.completed).length * 6;
    const doneWeight = completedTasks.length * 16 + baselineDone;
    const base = 58 + Math.min(40, doneWeight + (dailyBudget - remainingSpoons) * 7);
    return Math.min(98, Math.max(45, base));
  }, [completedTasks.length, baselineItems, dailyBudget, remainingSpoons]);

  const energyBalancePercent = useMemo(
    () => Math.round((remainingSpoons / Math.max(1, dailyBudget)) * 100),
    [remainingSpoons, dailyBudget]
  );

  const handleAlexaRebalance = () => {
    setSpentSpoons(Math.max(0, dailyBudget - 2));
    setEnergyModeState('survival');
    setBedBoundMode(true);
    setTasks((prev) =>
      prev.map((t) => (t.status === 'plate' && t.spoonCost >= 2 ? { ...t, status: 'holding' } : t))
    );
    showToast('Alexa+ MCP: Rebalanced for 2 spoons & deferred heavy tasks');
  };

  const handleAlexaDecompose = (steps: string[]) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== 'task-4') return t;
        return {
          ...t,
          spoonCost: 1,
          microSteps: steps.slice(0, 3).map((s, idx) => ({
            id: `mcp-step-${Date.now()}-${idx}`,
            label: s.replace(/^\d+\.\s*(\[\d+\s*Spoon\]\s*)?/i, ''),
            completed: false,
          })),
        };
      })
    );
    showToast('Alexa+ Bedrock MCP: Simplified portfolio task into 1-spoon micro-steps');
  };

  const handleAlexaSleepSync = (minutes: number, newBudget: number) => {
    setSleepMinutes(minutes);
    setDailyBudgetState(newBudget);
    const rem = Math.max(1, newBudget - spentSpoons);
    setEnergyModeState(deriveEnergyModeFromSpoons(rem));
    showToast(`Alexa+ Sleep Sync: ${Math.floor(minutes / 60)}h ${minutes % 60}m logged • Budget set to ${newBudget} spoons`);
  };

  const handleAlexaSensoryShield = () => {
    setEnergyModeState('survival');
    if (!sensory.brownNoiseActive) {
      BrownNoiseEngine.getInstance().start(sensory.brownNoiseVolume);
      setSensory((prev) => ({ ...prev, brownNoiseActive: true }));
    }
    setSpoonThieves((prev) =>
      prev.map((item) => (item.id === 'thief-noise' ? { ...item, count: item.count + 1 } : item))
    );
    setSpentSpoons((s) => Math.min(12, s + 1));
    showToast('Alexa+ Sensory Shield: 380Hz Brown Noise Active & Quiet Dusk On');
  };

  const handleAlexaVoiceBrainDump = (utterance: string) => {
    const newItems = deterministicBrainDump(utterance, remainingSpoons, currentInertia);
    setTasks((prev) => [...newItems, ...prev]);
    setDietPercent((d) => Math.min(100, d + 12));
    setDietKcal((k) => Math.min(2200, k + 350));
    setBaselineItems((prev) => prev.map((b) => ({ ...b, completed: true })));
    showToast(`Alexa+ Brain Dump: Added ${newItems.length} tasks & checked off Morning Routine`);
  };

  const handleAlexaBodyDouble = () => {
    const target = tasks.find((t) => t.id === 'task-4') || filteredVisiblePlateTasks[0] || tasks[0];
    if (target) {
      setActiveIgnitionTask(target);
      setSandbarElapsed(65);
      setSandbarRunning(true);
      showToast(`Alexa+ Body Double: Started 5-Min Flow for "${target.title}"`);
    }
  };

  const handleAlexaCustomPlan = (
    utterance: string,
    sleepHours: number | null,
    explicitSpoons: number | null,
    isOverwhelmed: boolean,
    activateBrownNoise: boolean,
    taskSegmentText: string,
    maxTasks: number | null,
    clearBoard: boolean
  ): number => {
    let nextBudget = dailyBudget;
    let nextSpent = spentSpoons;

    if (sleepHours !== null && !Number.isNaN(sleepHours)) {
      const mins = Math.round(sleepHours * 60);
      setSleepMinutes(mins);
      nextBudget = sleepHours < 6 ? 6 : sleepHours >= 7.5 ? 11 : 9;
      setDailyBudgetState(nextBudget);
    }

    if (explicitSpoons !== null && !Number.isNaN(explicitSpoons)) {
      const clamped = Math.max(1, Math.min(12, explicitSpoons));
      nextSpent = Math.max(0, nextBudget - clamped);
      setSpentSpoons(nextSpent);
    } else if (isOverwhelmed) {
      nextSpent = Math.max(0, nextBudget - 3);
      setSpentSpoons(nextSpent);
    }

    const targetRemaining = Math.max(1, nextBudget - nextSpent);

    if (isOverwhelmed) {
      setEnergyModeState("survival");
      setBedBoundMode(true);
    } else {
      setEnergyModeState(deriveEnergyModeFromSpoons(targetRemaining));
    }

    if (activateBrownNoise && !sensory.brownNoiseActive) {
      BrownNoiseEngine.getInstance().start(sensory.brownNoiseVolume);
      setSensory((prev) => ({ ...prev, brownNoiseActive: true }));
    }

    const limit = maxTasks !== null && !Number.isNaN(maxTasks) ? Math.max(1, maxTasks) : isOverwhelmed ? 3 : null;
    setCustomTaskLimit(limit);

    const cleanedText = (taskSegmentText || "").trim();
    const parsedItems =
      cleanedText.length >= 4
        ? deterministicBrainDump(cleanedText, targetRemaining, currentInertia)
        : [];

    setTasks((prev) => {
      let pool = [...parsedItems, ...prev];
      if (clearBoard || limit !== null) {
        const activeCandidates = pool
          .filter((t) => t.status === "plate" || parsedItems.some((p) => p.id === t.id))
          .sort((a, b) => {
            if (a.spoonCost !== b.spoonCost) return a.spoonCost - b.spoonCost;
            return a.activationFriction - b.activationFriction;
          });

        const keepCount = limit !== null ? limit : 2;
        const keepIds = new Set(activeCandidates.slice(0, keepCount).map((t) => t.id));

        return pool.map((t) => {
          if (keepIds.has(t.id)) {
            return { ...t, status: "plate", spoonCost: 1 as SpoonCost };
          }
          if (t.status === "plate") {
            return { ...t, status: "holding", isBorrowedEnergy: false };
          }
          return t;
        });
      }
      return pool;
    });

    if (limit !== null) {
      setTaskTiers((prev) => {
        const next = { ...prev };
        tasks.forEach((t) => {
          next[t.id] = "survival";
        });
        return next;
      });
    }

    showToast(
      `Spoons Auto-Plan: Sleep ${sleepHours ? sleepHours + "h" : "updated"} • Board cleared to ${limit || 3} light tasks`
    );
    return limit || parsedItems.length || 3;
  };

  const toggleCalendarDayMood = (day: number) => {
    setCalendarMoods((prev) => {
      const current = prev[day];
      const nextMap = { ...prev };
      if (!current) nextMap[day] = 'blue';
      else if (current === 'blue') nextMap[day] = 'green';
      else if (current === 'green') nextMap[day] = 'yellow';
      else delete nextMap[day];
      return nextMap;
    });
  };

  const toggleBaselineItem = (id: string) => {
    setBaselineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextCompleted = !item.completed;
        setSpentSpoons((s) => (nextCompleted ? Math.min(12, s + item.spoons) : Math.max(0, s - item.spoons)));
        return { ...item, completed: nextCompleted };
      })
    );
  };

  const triggerSpoonThief = (id: string) => {
    const target = spoonThieves.find((t) => t.id === id);
    if (!target) return;
    setSpoonThieves((prev) =>
      prev.map((item) => (item.id === id ? { ...item, count: item.count + 1 } : item))
    );
    setSpentSpoons((s) => Math.min(12, s + target.drain));
    showToast(`Adjusted pace for ${target.label.toLowerCase()}`);
  };

  const resetSpoonThieves = () => {
    if (totalThiefDrain === 0) return;
    setSpentSpoons((s) => Math.max(0, s - totalThiefDrain));
    setSpoonThieves((prev) => prev.map((item) => ({ ...item, count: 0 })));
  };

  const cycleTaskTier = (taskId: string, nextTier: TaskTier) => {
    setTaskTiers((prev) => ({ ...prev, [taskId]: nextTier }));
  };

  const copyShareMessage = (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    showToast('Copied status note');
    setShareBatteryOpen(false);
  };

  const completeTask = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const activeTier: TaskTier =
      taskTiers[id] || (bedBoundMode || remainingSpoons <= 3 ? 'survival' : 'full');
    const tiered = getTieredTaskDetails(target, activeTier);

    if (
      goldenReserveLocked &&
      remainingSpoons - tiered.spoonCost < 1 &&
      activeTier !== 'survival' &&
      tiered.spoonCost > 1
    ) {
      setTaskTiers((prev) => ({ ...prev, [id]: 'survival' }));
      showToast('Evening buffer active — switched to 2-min light version');
      return;
    }

    const maxAllowedSpent = goldenReserveLocked ? Math.max(0, dailyBudget - 1) : 12;
    const nextSpent = Math.min(maxAllowedSpent, spentSpoons + tiered.spoonCost);
    setSpentSpoons(nextSpent);

    if (target.inertia === 'physical' || target.title.toLowerCase().includes('walk')) {
      setExercisePercent((p) => Math.min(100, p + 18));
      setExerciseSteps((s) => s + 950);
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'completed', isBorrowedEnergy: false } : t))
    );
    const nextRem = Math.max(0, dailyBudget - nextSpent);
    setEnergyModeState(deriveEnergyModeFromSpoons(nextRem));
    setActiveIgnitionTask(null);
    showToast(`Completed "${tiered.title}"`);
  };

  const moveTaskToHolding = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'holding', isBorrowedEnergy: false } : t))
    );
    showToast('Saved for later');
  };

  const toggleMicroStep = (taskId: string, stepId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          microSteps: t.microSteps.map((m) =>
            m.id === stepId ? { ...m, completed: !m.completed } : m
          ),
        };
      })
    );
  };

  const liveDetectedTasks = useMemo(() => {
    if (!brainDumpInput.trim()) return [];
    const rawList = deterministicBrainDump(brainDumpInput, remainingSpoons, currentInertia);
    return rawList
      .map((item, idx) => {
        const override = previewOverrides[idx];
        if (override?.removed) return null;
        return {
          ...item,
          origIndex: idx,
          spoonCost: override?.spoonCost || item.spoonCost,
          inertia: override?.inertia || item.inertia,
        };
      })
      .filter((x): x is TaskItem & { origIndex: number } => x !== null);
  }, [brainDumpInput, remainingSpoons, currentInertia, previewOverrides]);

  const cyclePreviewChipInertia = (origIndex: number, currentCat: InertiaContext) => {
    const order: InertiaContext[] = ['desk', 'physical', 'mobile', 'low-brain'];
    const nextCat = order[(order.indexOf(currentCat) + 1) % order.length];
    setPreviewOverrides((prev) => ({
      ...prev,
      [origIndex]: { ...prev[origIndex], inertia: nextCat },
    }));
  };

  const removePreviewChip = (origIndex: number) => {
    setPreviewOverrides((prev) => ({
      ...prev,
      [origIndex]: { ...prev[origIndex], removed: true },
    }));
  };

  const handleBrainDumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (liveDetectedTasks.length === 0) return;

    const todayCount = liveDetectedTasks.filter((t) => t.status === 'plate').length;
    const laterCount = liveDetectedTasks.filter((t) => t.status === 'holding').length;

    setTasks((prev) => [...liveDetectedTasks, ...prev]);
    setBrainDumpInput('');
    setPreviewOverrides({});
    setBrainDumpNotice(
      `Added ${liveDetectedTasks.length} activities (${todayCount} for today${
        laterCount > 0 ? `, ${laterCount} saved for later` : ''
      })`
    );
  };

  const completeRechargeRitual = (spoonsRestored: number, ritualTitle: string) => {
    const nextSpent = Math.max(0, spentSpoons - spoonsRestored);
    const nextBudget = Math.min(12, Math.max(dailyBudget, nextSpent + spoonsRestored));
    setSpentSpoons(nextSpent);
    setDailyBudgetState(nextBudget);
    const nextRemaining = Math.max(1, nextBudget - nextSpent);
    setEnergyModeState(deriveEnergyModeFromSpoons(nextRemaining));

    const lower = ritualTitle.toLowerCase();
    if (lower.includes('sleep') || lower.includes('rest')) {
      setSleepMinutes((m) => Math.min(540, m + 45));
    }
    if (lower.includes('hydration') || lower.includes('nourish') || lower.includes('diet')) {
      setDietPercent((d) => Math.min(100, d + 10));
      setDietKcal((k) => Math.min(2200, k + 200));
    }

    showToast(ritualTitle);
  };

  const toggleBrownNoise = () => {
    const engine = BrownNoiseEngine.getInstance();
    if (sensory.brownNoiseActive) {
      engine.stop();
      setSensory((prev) => ({ ...prev, brownNoiseActive: false }));
    } else {
      engine.start(sensory.brownNoiseVolume);
      setSensory((prev) => ({ ...prev, brownNoiseActive: true }));
    }
  };

  const handleVolumeChange = (vol: number) => {
    setSensory((prev) => ({ ...prev, brownNoiseVolume: vol }));
    if (sensory.brownNoiseActive) {
      BrownNoiseEngine.getInstance().setVolume(vol);
    }
  };

  const handlePhoneNav = (target: 'home' | 'calendar' | 'progress' | 'capture' | 'settings') => {
    if (target === 'settings') {
      setSensoryDrawerOpen(true);
    } else if (target === 'capture') {
      document.getElementById('chaos-brain-dump-input')?.focus();
    } else {
      setActivePhoneScreen(target);
    }
  };

  const fontFamilyClass =
    sensory.fontFamily === 'mono'
      ? 'font-mono-ui'
      : sensory.fontFamily === 'hyperlegible'
      ? 'font-hyperlegible'
      : 'font-jakarta';

  const sandbarPercent = Math.min(100, Math.round((sandbarElapsed / 300) * 100));

  const categoryLabelMap: Record<InertiaContext, string> = {
    desk: 'Focus',
    physical: 'Move',
    mobile: 'Quick',
    'low-brain': 'Rest',
  };

  const renderEditableGreeting = (textSizeClass: string = 'text-2xl sm:text-3xl') => (
    <div className="flex items-center gap-2">
      {isEditingName ? (
        <input
          type="text"
          value={userName}
          autoFocus
          onChange={(e) => setUserName(e.target.value)}
          onBlur={() => setIsEditingName(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsEditingName(false);
          }}
          className="px-2.5 py-0.5 rounded-xl bg-black/20 text-[#FAF9F6] font-bold text-lg focus:outline-none border border-white/40 max-w-[180px]"
        />
      ) : (
        <h2
          onClick={() => setIsEditingName(true)}
          className={`${textSizeClass} font-bold tracking-tight cursor-pointer hover:underline`}
          title="Click to change your name"
        >
          Hello {userName},
        </h2>
      )}
      <button
        type="button"
        onClick={() => setIsEditingName((prev) => !prev)}
        className="p-1 rounded-full bg-white/15 hover:bg-white/25 text-[#FAF9F6]"
        title="Edit your name"
      >
        <PenLine className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderCalendarCard = () => (
    <div className="rounded-[30px] border-2 border-[#7C9070]/65 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#18201B] mb-2">
        <span>S</span>
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
      </div>

      <div className="grid grid-cols-7 gap-y-2.5 text-center items-center justify-items-center">
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="w-7 h-9" />
        ))}
        {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const mood = calendarMoods[dayNum];
          const isToday = dayNum === currentDayOfMonth;
          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => toggleCalendarDayMood(dayNum)}
              className="flex flex-col items-center justify-start group focus:outline-none"
              title={`Day ${dayNum}${isToday ? ' (Today)' : ''}`}
            >
              <span
                className={`text-[10px] font-bold mb-0.5 tabular-nums px-1.5 rounded-full ${
                  isToday ? 'bg-[#354939] text-[#FAF9F6]' : 'text-[#18201B]'
                }`}
              >
                {dayNum}
              </span>
              {mood ? (
                <CalendarMoodFaceSVG mood={mood} />
              ) : (
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border transition-colors ${
                    isToday
                      ? 'border-2 border-[#354939]'
                      : 'border-[#D5D3CD] group-hover:border-[#7C9070]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMyActivitiesBento = () => (
    <div className="grid grid-cols-12 gap-3">
      <div
        onClick={() => completeRechargeRitual(1, 'Sleep logged')}
        className="col-span-7 rounded-[26px] p-4 flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.02]"
        style={{ backgroundColor: '#EAE8E1', color: '#18201B', minHeight: '128px' }}
      >
        <span className="text-xs font-bold">Sleep</span>
        <div className="flex items-end justify-between mt-3">
          <div>
            <div className="text-2xl font-extrabold tabular-nums">{sleepQualityPercent}%</div>
            <div className="text-[10px] text-[#525D55] mt-0.5 tabular-nums">{formattedSleepDuration}</div>
          </div>
          <span className="w-6 h-6 rounded-full border border-[#18201B] flex items-center justify-center">
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      <div
        onClick={() => completeRechargeRitual(1, 'Nutrition logged')}
        className="col-span-5 rounded-[26px] p-4 flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.02]"
        style={{ backgroundColor: '#404040', color: '#FAF9F6', minHeight: '128px' }}
      >
        <span className="text-xs font-bold">Diet</span>
        <div className="flex items-end justify-between mt-3">
          <div>
            <div className="text-2xl font-extrabold tabular-nums">{dietPercent}%</div>
            <div className="text-[10px] text-[#D0CEC7] mt-0.5 tabular-nums">{dietKcal.toLocaleString()} Kcal</div>
          </div>
          <span className="w-6 h-6 rounded-full border border-[#FAF9F6] flex items-center justify-center">
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      <div
        onClick={() => {
          setExercisePercent((p) => Math.min(100, p + 15));
          setExerciseSteps((s) => s + 600);
          const walkTask = filteredVisiblePlateTasks[0] || tasks[0];
          if (walkTask) setActiveIgnitionTask(walkTask);
        }}
        className="col-span-7 rounded-[26px] p-4 flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.02]"
        style={{ backgroundColor: '#404040', color: '#FAF9F6', minHeight: '122px' }}
      >
        <span className="text-xs font-bold">Exercise</span>
        <div className="flex items-end justify-between mt-3">
          <div>
            <div className="text-2xl font-extrabold tabular-nums">{exercisePercent}%</div>
            <div className="text-[10px] text-[#D0CEC7] mt-0.5 tabular-nums">{exerciseSteps.toLocaleString()} steps</div>
          </div>
          <span className="w-6 h-6 rounded-full border border-[#FAF9F6] flex items-center justify-center">
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          document.getElementById('chaos-brain-dump-input')?.focus();
        }}
        className="col-span-5 rounded-[26px] flex items-center justify-center text-3xl font-light shadow-sm transition-transform hover:scale-[1.03] active:scale-95"
        style={{ backgroundColor: '#354939', color: '#FAF9F6', minHeight: '122px' }}
        title="Add activity"
        aria-label="Add Activity"
      >
        +
      </button>
    </div>
  );

  const renderActivityCard = (task: TaskItem, idx: number, showStepsInline: boolean = false) => {
    const isDarkCard = idx % 2 === 1;
    const activeTier: TaskTier =
      taskTiers[task.id] || (bedBoundMode || remainingSpoons <= 3 ? 'survival' : 'full');
    const tiered = getTieredTaskDetails(task, activeTier);

    return (
      <div
        key={task.id}
        className="rounded-[28px] p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-sm transition-transform hover:scale-[1.01]"
        style={{
          backgroundColor: isDarkCard ? '#404040' : '#EAE8E1',
          color: isDarkCard ? '#FAF9F6' : '#18201B',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col justify-between space-y-2.5 flex-1 min-w-0">
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-snug">
                <SaccadicText text={tiered.title} enabled={sensory.saccadicReading} />
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className="text-xs tabular-nums"
                  style={{ color: isDarkCard ? '#D0CEC7' : '#5A5C58' }}
                >
                  {tiered.durationLabel}
                </span>

                {showStepsInline && (
                  <div className="inline-flex items-center gap-1 text-[11px]">
                    {(['full', 'medium', 'survival'] as TaskTier[]).map((tLevel) => {
                      const isSelected = activeTier === tLevel;
                      const label =
                        tLevel === 'full' ? 'Full' : tLevel === 'medium' ? 'Light' : '2 min';
                      return (
                        <button
                          key={tLevel}
                          type="button"
                          onClick={() => cycleTaskTier(task.id, tLevel)}
                          className="px-2 py-0.5 rounded-full transition-opacity"
                          style={{
                            backgroundColor: isSelected
                              ? '#354939'
                              : 'transparent',
                            color: isSelected
                              ? '#FAF9F6'
                              : isDarkCard
                              ? '#A8A6A0'
                              : '#6E706C',
                            fontWeight: isSelected ? 700 : 500,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveIgnitionTask(task);
                  setSandbarElapsed(65);
                }}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform active:scale-90"
                style={{
                  borderColor: isDarkCard ? '#FAF9F6' : '#18201B',
                  color: isDarkCard ? '#FAF9F6' : '#18201B',
                }}
                title="Start activity"
                aria-label={`Start ${task.title}`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {showStepsInline && (
                <>
                  <button
                    type="button"
                    onClick={() => completeTask(task.id)}
                    className="text-[11px] font-semibold px-3 py-1 rounded-full border opacity-85 hover:opacity-100"
                    style={{
                      borderColor: isDarkCard ? 'rgba(255,255,255,0.22)' : 'rgba(24,32,27,0.18)',
                    }}
                  >
                    Done
                  </button>
                  {task.status === 'plate' && (
                    <button
                      type="button"
                      onClick={() => moveTaskToHolding(task.id)}
                      className="text-[11px] px-2 py-1 rounded-full opacity-65 hover:opacity-100"
                    >
                      Later
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {isDarkCard ? <ReadingCharacterSVG /> : <WalkingCharacterSVG />}
        </div>

        {showStepsInline && (
          <div
            className="pt-3 mt-1 border-t grid grid-cols-1 sm:grid-cols-3 gap-2"
            style={{ borderColor: isDarkCard ? 'rgba(255,255,255,0.12)' : 'rgba(24,32,27,0.08)' }}
          >
            {tiered.microSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleMicroStep(task.id, step.id)}
                className="flex items-center gap-2 text-left text-xs py-1.5 px-2.5 rounded-xl transition-opacity hover:opacity-100 opacity-90"
                style={{
                  backgroundColor: isDarkCard ? 'rgba(255,255,255,0.06)' : 'rgba(24,32,27,0.045)',
                }}
              >
                <span
                  className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: isDarkCard ? '#FAF9F6' : '#18201B',
                    backgroundColor: step.completed ? '#7C9070' : 'transparent',
                  }}
                >
                  {step.completed && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <span className={`truncate ${step.completed ? 'line-through opacity-60' : ''}`}>
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-energy-mode={energyMode}
      className={`min-h-screen transition-colors ${fontFamilyClass}`}
      style={{
        background:
          energyMode === 'survival' || energyMode === 'recharge'
            ? 'linear-gradient(135deg, #1E241E 0%, #141814 100%)'
            : 'linear-gradient(135deg, #E2F0C5 0%, #C2D6A4 48%, #93AC7E 100%)',
        color: '#18201B',
      }}
    >
      <script src="https://cdn.tailwindcss.com" suppressHydrationWarning />
      <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }}
      />

      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#FAF9F6]/75 border-b border-[#354939]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#354939', color: '#FAF9F6' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#E2F0C5]" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-[#18201B]">
              Spoons
            </span>
          </div>

          <div className="inline-flex items-center bg-[#EAE8E1] p-1 rounded-full border border-[#354939]/12">
            <button
              type="button"
              onClick={() => setDeviceViewMode('web')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: deviceViewMode === 'web' ? '#354939' : 'transparent',
                color: deviceViewMode === 'web' ? '#FAF9F6' : '#18201B',
              }}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Web</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceViewMode('phone-single')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: deviceViewMode === 'phone-single' ? '#354939' : 'transparent',
                color: deviceViewMode === 'phone-single' ? '#FAF9F6' : '#18201B',
              }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone</span>
            </button>

            <button
              type="button"
              onClick={() => setDeviceViewMode('phone-showcase')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: deviceViewMode === 'phone-showcase' ? '#354939' : 'transparent',
                color: deviceViewMode === 'phone-showcase' ? '#FAF9F6' : '#18201B',
              }}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Showcase</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-[#EAE8E1] px-3 py-1.5 rounded-full">
              <button
                type="button"
                onClick={toggleBrownNoise}
                className="inline-flex items-center gap-2 text-xs font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {sensory.brownNoiseActive ? (
                  <Volume2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                ) : (
                  <VolumeX className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                )}
                <span>380Hz Brown Noise</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShareBatteryOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EAE8E1] text-[#18201B] hover:opacity-80"
              title="Share status note"
              aria-label="Share status"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setSensoryDrawerOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#354939] text-[#FAF9F6]"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {toastMessage && (
        <div className="max-w-sm mx-auto px-4 mt-3">
          <div className="px-4 py-2 rounded-full bg-[#354939] text-[#FAF9F6] text-xs font-medium flex items-center justify-between shadow-md">
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <BuiltInAlexaPlusSimulator
        userName={userName}
        remainingSpoons={remainingSpoons}
        dailyBudget={dailyBudget}
        onRebalanceLive={handleAlexaRebalance}
        onDecomposeLive={handleAlexaDecompose}
        onSleepSyncLive={handleAlexaSleepSync}
        onSensoryShieldLive={handleAlexaSensoryShield}
        onVoiceBrainDumpLive={handleAlexaVoiceBrainDump}
        onBodyDoubleLive={handleAlexaBodyDouble}
        onCustomPlanLive={handleAlexaCustomPlan}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-4">
        <form
          onSubmit={handleBrainDumpSubmit}
          className="bg-[#FAF9F6]/90 backdrop-blur-md rounded-[28px] p-2 border border-[#354939]/12 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <input
              id="chaos-brain-dump-input"
              type="text"
              value={brainDumpInput}
              onChange={(e) => setBrainDumpInput(e.target.value)}
              placeholder="Write one or more activities in a single sentence (e.g., call mom buy oat milk read 10 pages)..."
              className="flex-1 px-4 py-2 rounded-full bg-transparent text-xs sm:text-sm text-[#18201B] placeholder-[#525D55] focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
              style={{ backgroundColor: '#354939', color: '#FAF9F6' }}
            >
              <span>Organize</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {liveDetectedTasks.length > 0 && (
            <div className="px-3 pt-2 pb-1 flex flex-wrap items-center gap-2 border-t border-[#354939]/10 mt-1.5">
              {liveDetectedTasks.map((item, idx) => (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: idx % 2 === 1 ? '#404040' : '#EAE8E1',
                    color: idx % 2 === 1 ? '#FAF9F6' : '#18201B',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => cyclePreviewChipInertia(item.origIndex, item.inertia)}
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#7C9070] text-[#FAF9F6]"
                  >
                    {categoryLabelMap[item.inertia]}
                  </button>
                  <span>{item.title}</span>
                  <span className="text-[10px] opacity-70 tabular-nums">{item.durationLabel}</span>
                  <button
                    type="button"
                    onClick={() => removePreviewChip(item.origIndex)}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {brainDumpNotice && (
            <div className="mt-1.5 px-3.5 py-1.5 rounded-full bg-[#EAE8E1] text-xs font-medium flex items-center justify-between text-[#18201B]">
              <span>{brainDumpNotice}</span>
              <button type="button" onClick={() => setBrainDumpNotice(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </form>
      </div>

      {deviceViewMode === 'web' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <aside className="lg:col-span-3 rounded-[36px] bg-[#FAF9F6] p-5 shadow-xl border border-white/60 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div
                  className="rounded-[28px] p-5 text-[#FAF9F6]"
                  style={{ backgroundColor: '#7C9070' }}
                >
                  <div className="text-xs opacity-85">Daily Overview</div>
                  <div className="mt-0.5">{renderEditableGreeting('text-2xl')}</div>
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Daily Energy</span>
                      <span className="tabular-nums">{energyBalancePercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FAF9F6] transition-all duration-300"
                        style={{ width: `${energyBalancePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <nav className="space-y-1.5">
                  {(
                    [
                      { id: 'overview', label: 'Home', icon: <Home className="w-4 h-4" /> },
                      { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
                      { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-4 h-4" /> },
                      { id: 'activities', label: 'Activities', icon: <LayoutDashboard className="w-4 h-4" /> },
                    ] as const
                  ).map((item) => {
                    const active = activeWebNav === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveWebNav(item.id)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all"
                        style={{
                          backgroundColor: active ? '#354939' : '#EAE8E1',
                          color: active ? '#FAF9F6' : '#18201B',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          {item.icon}
                          <span>{item.label}</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                      </button>
                    );
                  })}
                </nav>

                <div className="rounded-[26px] bg-[#EAE8E1] p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#18201B]">
                    <span>Morning Routine</span>
                    <span className="tabular-nums text-[#525D55]">
                      {baselineItems.filter((b) => b.completed).length}/{baselineItems.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {baselineItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleBaselineItem(item.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors"
                        style={{
                          backgroundColor: item.completed ? '#354939' : '#FAF9F6',
                          color: item.completed ? '#FAF9F6' : '#18201B',
                        }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0"
                          style={{
                            borderColor: item.completed ? '#FAF9F6' : '#18201B',
                          }}
                        >
                          {item.completed && <Check className="w-2.5 h-2.5" />}
                        </span>
                        <span className={item.completed ? 'line-through opacity-85' : ''}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] bg-[#EAE8E1] p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#18201B]">
                    <span>Pace Mode</span>
                    <button
                      type="button"
                      onClick={() => setBedBoundMode((b) => !b)}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                      style={{
                        backgroundColor: bedBoundMode ? '#354939' : '#FAF9F6',
                        color: bedBoundMode ? '#FAF9F6' : '#18201B',
                      }}
                    >
                      {bedBoundMode ? 'Low-Effort On' : 'Standard'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {spoonThieves.map((thief) => (
                      <button
                        key={thief.id}
                        type="button"
                        onClick={() => triggerSpoonThief(thief.id)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FAF9F6] text-[#18201B] hover:opacity-85"
                      >
                        {thief.label}
                        {thief.count > 0 ? ` (${thief.count})` : ''}
                      </button>
                    ))}
                    {totalThiefDrain > 0 && (
                      <button
                        type="button"
                        onClick={resetSpoonThieves}
                        className="text-[11px] font-semibold underline text-[#354939] px-1"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeviceViewMode('phone-single')}
                className="w-full py-3 px-4 rounded-2xl border border-[#354939]/20 text-xs font-bold text-[#354939] flex items-center justify-center gap-2 hover:bg-[#EAE8E1]/60"
              >
                <Smartphone className="w-4 h-4" />
                <span>Phone View</span>
              </button>
            </aside>

            <div className="lg:col-span-9 space-y-6">
              {activeWebNav !== 'overview' && (
                <div className="flex items-center justify-between px-5 py-2.5 rounded-full bg-[#FAF9F6] border border-[#354939]/12 text-xs font-bold">
                  <span className="capitalize">{activeWebNav}</span>
                  <button
                    type="button"
                    onClick={() => setActiveWebNav('overview')}
                    className="underline text-[#354939]"
                  >
                    Show All
                  </button>
                </div>
              )}

              {(activeWebNav === 'overview' || activeWebNav === 'progress') && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div
                    className="xl:col-span-7 rounded-[40px] overflow-hidden shadow-xl border border-white/40 flex flex-col justify-between"
                    style={{ backgroundColor: '#7C9070' }}
                  >
                    <div className="p-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#FAF9F6]">
                      <div className="space-y-2 max-w-xs">
                        <span className="text-xs font-medium opacity-85">Home</span>
                        {renderEditableGreeting()}
                        <p className="text-xs text-[#FAF9F6]/90 leading-relaxed">
                          Your daily schedule is paced around your rest and recovery.
                        </p>
                      </div>
                      <AstronautHeroSVG compact />
                    </div>

                    <div className="rounded-t-[34px] bg-[#FAF9F6] p-6 sm:px-7 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-3xl sm:text-4xl font-extrabold text-[#2B2D2A] tabular-nums">
                          {formattedSleepDuration}
                        </div>
                        <div className="text-sm font-extrabold text-[#18201B] mt-1">
                          {sleepMinutes >= 360 ? 'Rest Logged — Pacing Well!' : 'Sleep Quality Decreased!'}
                        </div>
                        <p className="text-xs text-[#525D55] mt-0.5">
                          Your sleep quality is 10% lower compared to last night
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => completeRechargeRitual(1, 'Sleep recorded')}
                        className="py-3.5 px-6 rounded-full text-xs font-semibold shadow-sm transition-transform active:scale-95"
                        style={{ backgroundColor: '#354939', color: '#FAF9F6' }}
                      >
                        Record your sleep
                      </button>
                    </div>
                  </div>

                  <div
                    className="xl:col-span-5 rounded-[40px] overflow-hidden shadow-xl border border-white/40 flex flex-col justify-between"
                    style={{ backgroundColor: '#7C9070' }}
                  >
                    <div className="p-6 pb-4 text-[#FAF9F6]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span className="w-5 h-5 rounded-md border border-[#FAF9F6]/70 flex items-center justify-center">
                            <TrendingUp className="w-3 h-3" />
                          </span>
                          <span>Your progress</span>
                        </span>
                        <span className="text-[11px] opacity-80">{currentFullDateLabel}</span>
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div className="text-4xl font-bold tabular-nums">
                          {progressPercentage}%
                        </div>
                        <div className="flex-1 max-w-[170px]">
                          <svg viewBox="0 0 200 85" className="w-full h-20 overflow-visible">
                            <path
                              d="M 10 38 C 32 32, 42 68, 62 66 C 82 64, 92 40, 110 46 C 126 52, 134 74, 146 66 C 158 58, 165 24, 184 30"
                              fill="none"
                              stroke="#FAF9F6"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <line x1="184" y1="35" x2="184" y2="68" stroke="#FAF9F6" strokeWidth="1" strokeOpacity="0.5" />
                            <circle cx="184" cy="30" r="4.5" fill="#7C9070" stroke="#FAF9F6" strokeWidth="2.5" />
                            <text x="184" y="80" textAnchor="middle" fill="#FAF9F6" fontSize="9">
                              20:00 pm
                            </text>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-t-[34px] bg-[#FAF9F6] p-5 flex-1">
                      <div className="text-xs font-extrabold text-[#18201B] mb-3">My activities</div>
                      {renderMyActivitiesBento()}
                    </div>
                  </div>
                </div>
              )}

              {(activeWebNav === 'overview' || activeWebNav === 'activities' || activeWebNav === 'calendar') && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <div
                    className="xl:col-span-7 rounded-[40px] p-6 shadow-xl border border-white/40 space-y-4"
                    style={{ backgroundColor: '#7C9070' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#18201B]">
                        Recommended activities
                      </h3>

                      <div className="inline-flex flex-wrap items-center gap-1 bg-[#FAF9F6]/90 p-1 rounded-full">
                        {(
                          [
                            { id: 'plate', label: `Active (${filteredVisiblePlateTasks.length})` },
                            { id: 'holding', label: `Later (${holdingTasks.length})` },
                            { id: 'completed', label: `Done (${completedTasks.length})` },
                            { id: 'compost', label: `Archived (${compostedTasks.length})` },
                            { id: 'recharge', label: 'Rest' },
                          ] as const
                        ).map((tab) => {
                          const active = activeWorkspaceView === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveWorkspaceView(tab.id)}
                              className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                              style={{
                                backgroundColor: active ? '#354939' : 'transparent',
                                color: active ? '#FAF9F6' : '#18201B',
                              }}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {activeWorkspaceView === 'recharge' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {[
                          {
                            id: 'ritual-palming',
                            title: '2-Min Eye Rest',
                            sub: 'Rest eyes away from bright screens',
                            spoons: 1,
                            bg: '#EAE8E1',
                            dark: false,
                          },
                          {
                            id: 'ritual-hydration',
                            title: 'Hydration & Stretch',
                            sub: 'Drink cool water and relax shoulders',
                            spoons: 1,
                            bg: '#404040',
                            dark: true,
                          },
                          {
                            id: 'ritual-brown-noise',
                            title: 'Warm Sound Bath',
                            sub: 'Soothing 380Hz acoustic rest',
                            spoons: 2,
                            bg: '#FAF9F6',
                            dark: false,
                          },
                          {
                            id: 'ritual-deferral',
                            title: 'Pause for Tomorrow',
                            sub: 'Set aside remaining tasks for tonight',
                            spoons: 1,
                            bg: '#354939',
                            dark: true,
                          },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => completeRechargeRitual(r.spoons, r.title)}
                            className="rounded-[26px] p-5 text-left flex flex-col justify-between transition-transform hover:scale-[1.02]"
                            style={{
                              backgroundColor: r.bg,
                              color: r.dark ? '#FAF9F6' : '#18201B',
                              minHeight: '130px',
                            }}
                          >
                            <div>
                              <span className="text-xs font-bold opacity-75">Rest Break</span>
                              <h4 className="text-base font-extrabold mt-1">{r.title}</h4>
                              <p className="text-xs opacity-80 mt-1">{r.sub}</p>
                            </div>
                            <div className="flex justify-end mt-3">
                              <span
                                className="w-7 h-7 rounded-full border flex items-center justify-center"
                                style={{ borderColor: r.dark ? '#FAF9F6' : '#18201B' }}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {(activeWorkspaceView === 'plate'
                          ? filteredVisiblePlateTasks
                          : activeWorkspaceView === 'holding'
                          ? holdingTasks
                          : activeWorkspaceView === 'completed'
                          ? completedTasks
                          : compostedTasks
                        ).map((task, idx) => renderActivityCard(task, idx, true))}
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-5 rounded-[40px] bg-[#FAF9F6] p-6 shadow-xl border border-white/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMonth((m) =>
                            m === currentMonthShort ? 'Nov, 2026' : currentMonthShort
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-lg font-extrabold text-[#18201B]"
                      >
                        <span>{selectedMonth}</span>
                        <span className="text-xs">▼</span>
                      </button>
                      <span className="text-xs font-semibold text-[#525D55]">
                        Today: {currentFullDateLabel}
                      </span>
                    </div>

                    {renderCalendarCard()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {deviceViewMode === 'phone-single' && (
        <main className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            {(
              [
                { id: 'calendar', label: 'Calendar' },
                { id: 'home', label: 'Home' },
                { id: 'progress', label: 'Progress' },
              ] as const
            ).map((scr) => (
              <button
                key={scr.id}
                type="button"
                onClick={() => setActivePhoneScreen(scr.id)}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs"
                style={{
                  backgroundColor: activePhoneScreen === scr.id ? '#354939' : '#FAF9F6',
                  color: activePhoneScreen === scr.id ? '#FAF9F6' : '#18201B',
                }}
              >
                {scr.label}
              </button>
            ))}
          </div>

          {activePhoneScreen === 'calendar' && (
            <section
              className="rounded-[44px] shadow-2xl overflow-hidden flex flex-col justify-between border-4 border-white/70"
              style={{ backgroundColor: '#FAF9F6', minHeight: '760px' }}
            >
              <div className="p-6 pb-5">
                <div className="flex items-center justify-between mb-5">
                  <span className="w-5" />
                  <span className="text-sm font-semibold text-[#18201B]">Home</span>
                  <Bell className="w-4 h-4 text-[#18201B]" />
                </div>

                <div className="flex items-center justify-center gap-2.5 mb-5">
                  <button
                    type="button"
                    onClick={() => setActivePhoneScreen('calendar')}
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-[#354939] text-[#FAF9F6]"
                  >
                    Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhoneScreen('progress')}
                    className="px-5 py-2 rounded-full text-xs font-semibold border border-[#B8B5AC] text-[#18201B]"
                  >
                    Progress
                  </button>
                </div>

                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="inline-flex items-center gap-1.5 text-base font-bold text-[#18201B]">
                    <span>{selectedMonth}</span>
                    <span className="text-xs">▼</span>
                  </span>
                </div>

                {renderCalendarCard()}
              </div>

              <div
                className="rounded-t-[38px] p-5 pt-6 flex-1 flex flex-col justify-between"
                style={{ backgroundColor: '#7C9070' }}
              >
                <div>
                  <h2 className="text-sm font-bold text-[#18201B] mb-3.5 px-1">
                    Recommended activities
                  </h2>
                  <div className="space-y-3.5">
                    {filteredVisiblePlateTasks.slice(0, 2).map((task, idx) => renderActivityCard(task, idx))}
                  </div>
                </div>
                <div className="mt-5">
                  <BottomNavBar
                    activeScreen="calendar"
                    onNavigate={handlePhoneNav}
                    variant="sage"
                  />
                </div>
              </div>
            </section>
          )}

          {activePhoneScreen === 'home' && (
            <section
              className="rounded-[44px] shadow-2xl overflow-hidden flex flex-col justify-between border-4 border-white/70"
              style={{ backgroundColor: '#7C9070', minHeight: '760px' }}
            >
              <div className="p-6 pb-2 relative text-[#FAF9F6]">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-5" />
                  <span className="text-sm font-medium">Home</span>
                  <Bell className="w-4 h-4" />
                </div>
                {renderEditableGreeting()}
                <AstronautHeroSVG />
              </div>

              <div
                className="rounded-t-[40px] p-6 pt-7 flex flex-col justify-between"
                style={{ backgroundColor: '#FAF9F6' }}
              >
                <div className="text-center space-y-2.5">
                  <div className="text-4xl sm:text-5xl font-extrabold text-[#2B2D2A] tracking-tight tabular-nums">
                    {formattedSleepDuration}
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#18201B] pt-1">
                    {sleepMinutes >= 360 ? 'Rest Logged — Pacing Well!' : 'Sleep Quality Decreased!'}
                  </h3>
                  <p className="text-xs text-[#525D55] max-w-xs mx-auto leading-relaxed">
                    Your sleep quality is 10% lower compared to last night
                  </p>
                  <div className="pt-3 pb-2">
                    <button
                      type="button"
                      onClick={() => completeRechargeRitual(1, 'Recorded sleep')}
                      className="w-full max-w-xs mx-auto py-3.5 px-6 rounded-full text-xs sm:text-sm font-semibold shadow-sm"
                      style={{ backgroundColor: '#354939', color: '#FAF9F6' }}
                    >
                      Record your sleep
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <BottomNavBar
                    activeScreen="home"
                    onNavigate={handlePhoneNav}
                    variant="white"
                  />
                </div>
              </div>
            </section>
          )}

          {activePhoneScreen === 'progress' && (
            <section
              className="rounded-[44px] shadow-2xl overflow-hidden flex flex-col justify-between border-4 border-white/70"
              style={{ backgroundColor: '#7C9070', minHeight: '760px' }}
            >
              <div className="p-6 pb-5 text-[#FAF9F6]">
                <div className="flex items-center justify-between mb-5">
                  <span className="w-5" />
                  <span className="text-sm font-medium">Home</span>
                  <Bell className="w-4 h-4" />
                </div>

                <div className="flex items-center justify-center gap-2.5 mb-6">
                  <button
                    type="button"
                    onClick={() => setActivePhoneScreen('calendar')}
                    className="px-5 py-2 rounded-full text-xs font-semibold border border-[#FAF9F6]/60 text-[#FAF9F6]"
                  >
                    Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhoneScreen('progress')}
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-[#354939] text-[#FAF9F6]"
                  >
                    Progress
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold mb-3">
                  <span className="w-5 h-5 rounded-md border border-[#FAF9F6]/70 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3" />
                  </span>
                  <span>Your progress</span>
                </div>

                <div className="flex items-end justify-between gap-2 pt-2">
                  <div>
                    <div className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
                      {progressPercentage}%
                    </div>
                    <div className="text-[11px] text-[#FAF9F6]/80 mt-1">
                      {currentFullDateLabel}
                    </div>
                  </div>

                  <div className="flex-1 max-w-[190px]">
                    <svg viewBox="0 0 200 95" className="w-full h-24 overflow-visible">
                      <path
                        d="M 10 38 C 32 32, 42 68, 62 66 C 82 64, 92 40, 110 46 C 126 52, 134 74, 146 66 C 158 58, 165 24, 184 30"
                        fill="none"
                        stroke="#FAF9F6"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <line x1="184" y1="35" x2="184" y2="75" stroke="#FAF9F6" strokeWidth="1" strokeOpacity="0.5" />
                      <circle cx="184" cy="30" r="4.5" fill="#7C9070" stroke="#FAF9F6" strokeWidth="2.5" />
                      <text x="184" y="88" textAnchor="middle" fill="#FAF9F6" fillOpacity="0.8" fontSize="9">
                        20:00 pm
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              <div
                className="rounded-t-[40px] p-6 pt-6 flex-1 flex flex-col justify-between"
                style={{ backgroundColor: '#FAF9F6' }}
              >
                <div>
                  <h3 className="text-sm font-extrabold text-[#18201B] mb-4">My activities</h3>
                  {renderMyActivitiesBento()}
                </div>
                <div className="mt-5">
                  <BottomNavBar
                    activeScreen="progress"
                    onNavigate={handlePhoneNav}
                    variant="white"
                  />
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {deviceViewMode === 'phone-showcase' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 items-start">
            <section
              className="rounded-[44px] shadow-2xl overflow-hidden flex flex-col justify-between border border-white/40"
              style={{ backgroundColor: '#FAF9F6', minHeight: '760px' }}
            >
              <div className="p-6 pb-5">
                <div className="flex items-center justify-between mb-5">
                  <span className="w-5" />
                  <span className="text-sm font-semibold text-[#18201B]">Home</span>
                  <Bell className="w-4 h-4 text-[#18201B]" />
                </div>
                <div className="flex items-center justify-center gap-2.5 mb-5">
                  <span className="px-5 py-2 rounded-full text-xs font-semibold bg-[#354939] text-[#FAF9F6]">
                    Calendar
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceViewMode('phone-single');
                      setActivePhoneScreen('progress');
                    }}
                    className="px-5 py-2 rounded-full text-xs font-semibold border border-[#B8B5AC] text-[#18201B]"
                  >
                    Progress
                  </button>
                </div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-base font-bold text-[#18201B]">{selectedMonth} ▼</span>
                </div>
                {renderCalendarCard()}
              </div>

              <div
                className="rounded-t-[38px] p-5 pt-6 flex-1 flex flex-col justify-between"
                style={{ backgroundColor: '#7C9070' }}
              >
                <div>
                  <h2 className="text-sm font-bold text-[#18201B] mb-3.5 px-1">
                    Recommended activities
                  </h2>
                  <div className="space-y-3.5">
                    {filteredVisiblePlateTasks.slice(0, 2).map((task, idx) => renderActivityCard(task, idx))}
                  </div>
                </div>
                <div className="mt-5">
                  <BottomNavBar activeScreen="home" onNavigate={handlePhoneNav} variant="sage" />
                </div>
              </div>
            </section>

            <section
              className="rounded-[44px] shadow-2xl overflow-hidden flex flex-col justify-between border border-white/40 lg:mt-10"
              style={{ backgroundColor: '#7C9070', minHeight: '720px' }}
            >
              <div className="p-6 pb-2 relative text-[#FAF9F6]">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-5" />
                  <span className="text-sm font-medium">Home</span>
                  <Bell className="w-4 h-4" />
                </div>
                {renderEditableGreeting()}
                <AstronautHeroSVG />
              </div>

              <div
                className="rounded-t-[40px] p-6 pt-7 flex flex-col justify-between"
                style={{ backgroundColor: '#FAF9F6' }}
              >
                <div className="text-center space-y-2.5">
                  <div className="text-4xl sm:text-5xl font-extrabold text-[#2B2D2A] tracking-tight tabular-nums">
                    {formattedSleepDuration}
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#18201B] pt-1">
                    {sleepMinutes >= 360 ? 'Rest Logged — Pacing Well!' : 'Sleep Quality Decreased!'}
                  </h3>
                  <p className="text-xs text-[#525D55] max-w-xs mx-auto leading-relaxed">
                    Your sleep quality is 10% lower compared to last night
                  </p>
                  <div className="pt-3 pb-2">
                    <button
                      type="button"
                      onClick={() => completeRechargeRitual(1, 'Recorded sleep')}
                      className="w-full max-w-xs mx-auto py-3.5 px-6 rounded-full text-xs sm:text-sm font-semibold shadow-sm"
                      style={{ backgroundColor: '#354939', color: '#FAF9F6' }}
                    >
                      Record your sleep
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <BottomNavBar activeScreen="home" onNavigate={handlePhoneNav} variant="white" />
                </div>
              </div>
            </section>

            <section
              className="rounded-[44px] shadow-2xl overflow-hidden flex flex-col justify-between border border-white/40 lg:mt-10"
              style={{ backgroundColor: '#7C9070', minHeight: '720px' }}
            >
              <div className="p-6 pb-5 text-[#FAF9F6]">
                <div className="flex items-center justify-between mb-5">
                  <span className="w-5" />
                  <span className="text-sm font-medium">Home</span>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-center gap-2.5 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceViewMode('phone-single');
                      setActivePhoneScreen('calendar');
                    }}
                    className="px-5 py-2 rounded-full text-xs font-semibold border border-[#FAF9F6]/60 text-[#FAF9F6]"
                  >
                    Calendar
                  </button>
                  <span className="px-5 py-2 rounded-full text-xs font-semibold bg-[#354939] text-[#FAF9F6]">
                    Progress
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold mb-3">
                  <span className="w-5 h-5 rounded-md border border-[#FAF9F6]/70 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3" />
                  </span>
                  <span>Your progress</span>
                </div>
                <div className="flex items-end justify-between gap-2 pt-2">
                  <div>
                    <div className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
                      {progressPercentage}%
                    </div>
                    <div className="text-[11px] text-[#FAF9F6]/80 mt-1">{currentFullDateLabel}</div>
                  </div>
                  <div className="flex-1 max-w-[190px]">
                    <svg viewBox="0 0 200 95" className="w-full h-24 overflow-visible">
                      <path
                        d="M 10 38 C 32 32, 42 68, 62 66 C 82 64, 92 40, 110 46 C 126 52, 134 74, 146 66 C 158 58, 165 24, 184 30"
                        fill="none"
                        stroke="#FAF9F6"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <line x1="184" y1="35" x2="184" y2="75" stroke="#FAF9F6" strokeWidth="1" strokeOpacity="0.5" />
                      <circle cx="184" cy="30" r="4.5" fill="#7C9070" stroke="#FAF9F6" strokeWidth="2.5" />
                      <text x="184" y="88" textAnchor="middle" fill="#FAF9F6" fillOpacity="0.8" fontSize="9">
                        20:00 pm
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              <div
                className="rounded-t-[40px] p-6 pt-6 flex-1 flex flex-col justify-between"
                style={{ backgroundColor: '#FAF9F6' }}
              >
                <div>
                  <h3 className="text-sm font-extrabold text-[#18201B] mb-4">My activities</h3>
                  {renderMyActivitiesBento()}
                </div>
                <div className="mt-5">
                  <BottomNavBar activeScreen="home" onNavigate={handlePhoneNav} variant="white" />
                </div>
              </div>
            </section>
          </div>
        </main>
      )}

      {activeIgnitionTask && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveIgnitionTask(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border border-white/30"
            style={{ backgroundColor: '#7C9070', color: '#FAF9F6' }}
          >
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#354939] text-[#FAF9F6]">
                  Quick Start
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIgnitionTask(null)}
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/25"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-xl font-bold leading-snug mb-1">
                {activeIgnitionTask.title}
              </h3>
              <p className="text-xs text-[#FAF9F6]/85">
                {activeIgnitionTask.durationLabel || '25 min'}
              </p>
            </div>

            <div className="rounded-t-[36px] bg-[#FAF9F6] text-[#18201B] p-6 space-y-4">
              <div className="p-4 rounded-[24px] bg-[#EAE8E1]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#354939] mb-1">
                  First Step
                </div>
                <p className="text-sm font-semibold leading-relaxed">
                  “{activeIgnitionTask.ignitionPrompt}”
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span>5-Minute Flow</span>
                  <span className="tabular-nums">{sandbarPercent}%</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-[#EAE8E1] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(8, sandbarPercent)}%`,
                      backgroundColor: '#7C9070',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={() => setSandbarRunning((r) => !r)}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-[#EAE8E1] text-[#18201B] inline-flex items-center gap-1.5"
                  >
                    {sandbarRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{sandbarRunning ? 'Pause' : 'Start'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => completeTask(activeIgnitionTask.id)}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#354939] text-[#FAF9F6] inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Complete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {shareBatteryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShareBatteryOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border border-white/30"
            style={{ backgroundColor: '#7C9070', color: '#FAF9F6' }}
          >
            <div className="p-6 pb-4 flex items-center justify-between">
              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#354939] text-[#FAF9F6]">
                  Quick Status Note
                </span>
                <h3 className="text-xl font-extrabold mt-2">
                  Share Your Availability
                </h3>
                <p className="text-xs text-[#FAF9F6]/85 mt-0.5">
                  Copy a ready-made note for family, friends, or teammates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareBatteryOpen(false)}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-t-[36px] bg-[#FAF9F6] text-[#18201B] p-6 space-y-3">
              {[
                {
                  label: 'Partner & Family',
                  text: 'Hey, I’m running low on energy tonight and taking a quiet evening to rest. Will catch up with you tomorrow!',
                },
                {
                  label: 'Friends',
                  text: 'Hey! Need to raincheck tonight and get some rest so I can recharge. Let’s catch up soon!',
                },
                {
                  label: 'Work & Team',
                  text: 'Hi team — wrapping up core essentials asynchronously today and will follow up first thing tomorrow morning.',
                },
              ].map((tmpl, idx) => (
                <div key={idx} className="p-4 rounded-[24px] bg-[#EAE8E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#354939]">{tmpl.label}</span>
                    <button
                      type="button"
                      onClick={() => copyShareMessage(tmpl.text)}
                      className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#354939] text-[#FAF9F6]"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-[#18201B] leading-relaxed">“{tmpl.text}”</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {sensoryDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
          onClick={() => setSensoryDrawerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full overflow-y-auto p-6 shadow-2xl space-y-5"
            style={{ backgroundColor: '#FAF9F6', color: '#18201B' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Spoons Settings</h2>
              <button
                type="button"
                onClick={() => setSensoryDrawerOpen(false)}
                className="p-2 rounded-full bg-[#EAE8E1]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-[26px] bg-[#EAE8E1] space-y-2">
              <div className="text-xs font-bold">Your Name</div>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F6] text-xs font-semibold text-[#18201B] border border-[#354939]/20 focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-[26px] bg-[#EAE8E1] space-y-2.5">
              <div className="text-xs font-bold">Daily Pace</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'high', label: 'Full Pace' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'survival', label: 'Quiet Dusk' },
                    { id: 'recharge', label: 'Rest Mode' },
                  ] as { id: EnergyMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setEnergyModeState(m.id)}
                    className="px-3 py-2 rounded-2xl text-xs font-semibold text-left"
                    style={{
                      backgroundColor: energyMode === m.id ? '#354939' : '#FAF9F6',
                      color: energyMode === m.id ? '#FAF9F6' : '#18201B',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-[26px] bg-[#EAE8E1] space-y-2.5">
              <div className="text-xs font-bold">Context Priority</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'desk', label: 'Focus' },
                    { id: 'physical', label: 'Move' },
                    { id: 'mobile', label: 'Quick' },
                    { id: 'low-brain', label: 'Rest' },
                  ] as { id: InertiaContext; label: string }[]
                ).map((ctx) => (
                  <button
                    key={ctx.id}
                    type="button"
                    onClick={() => setCurrentInertia(ctx.id)}
                    className="py-2 rounded-xl text-xs font-semibold text-center"
                    style={{
                      backgroundColor: currentInertia === ctx.id ? '#354939' : '#FAF9F6',
                      color: currentInertia === ctx.id ? '#FAF9F6' : '#18201B',
                    }}
                  >
                    {ctx.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-[26px] bg-[#EAE8E1] space-y-2.5">
              <div className="text-xs font-bold">Font Style</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'jakarta', name: 'Jakarta Sans' },
                    { id: 'hyperlegible', name: 'Atkinson' },
                    { id: 'mono', name: 'Monospace' },
                  ] as { id: SensoryProfile['fontFamily']; name: string }[]
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSensory((prev) => ({ ...prev, fontFamily: f.id }))}
                    className="p-2.5 rounded-2xl text-xs font-semibold text-center"
                    style={{
                      backgroundColor: sensory.fontFamily === f.id ? '#354939' : '#FAF9F6',
                      color: sensory.fontFamily === f.id ? '#FAF9F6' : '#18201B',
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-[26px] bg-[#EAE8E1] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold">Focus Reading Highlights</div>
                <div className="text-[11px] text-[#525D55]">
                  Highlights word beginnings for easier scanning
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSensory((prev) => ({ ...prev, saccadicReading: !prev.saccadicReading }))
                }
                className="px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: sensory.saccadicReading ? '#354939' : '#FAF9F6',
                  color: sensory.saccadicReading ? '#FAF9F6' : '#18201B',
                }}
              >
                {sensory.saccadicReading ? 'On' : 'Off'}
              </button>
            </div>

            <div className="p-4 rounded-[26px] bg-[#EAE8E1] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Ambient Brown Noise</span>
                <button
                  type="button"
                  onClick={toggleBrownNoise}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: sensory.brownNoiseActive ? '#354939' : '#FAF9F6',
                    color: sensory.brownNoiseActive ? '#FAF9F6' : '#18201B',
                  }}
                >
                  {sensory.brownNoiseActive ? 'Playing' : 'Off'}
                </button>
              </div>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={sensory.brownNoiseVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-[#354939] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}