import React, { useState, useEffect, useRef } from 'react';
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    
    @keyframes pop-in-out {
      0% { transform: scale(0.5); opacity: 0; }
      20%, 80% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .animate-pop-in-out {
      animation: pop-in-out 1.4s forwards;
    }
      
    /* 【新】爆炸火花動畫 */
    @keyframes hit-spark-animation {
      0% { stroke-dashoffset: 0; opacity: 1; transform: scale(0.5) rotate(0deg); }
      70% { stroke-dashoffset: 100; opacity: 1; transform: scale(1.2) rotate(30deg); }
      100% { stroke-dashoffset: 100; opacity: 0; transform: scale(1.5) rotate(45deg); }
    }
    .animate-hit-spark path {
      stroke: #FFD700; /* 金黃色 */
      stroke-width: 8;
      stroke-linecap: round;
      fill: none;
      stroke-dasharray: 100;
      animation: hit-spark-animation 0.4s ease-out forwards;
    }

    /* 防禦碰撞波動畫 */
    @keyframes block-shield-animation {
      0% { transform: scale(0.2); opacity: 0; }
      50% { transform: scale(1.2); opacity: 0.8; }
      100% { transform: scale(1); opacity: 0; }
    }
    .animate-block-shield {
      animation: block-shield-animation 0.4s ease-out forwards;
      background-color: rgba(52, 152, 219, 0.5); /* 藍色半透明 */
      border: 3px solid #3498db;
      border-radius: 50%;
      box-shadow: 0 0 15px #3498db;
    }
  `}</style>
);
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Play, Pause, Upload, RotateCcw, ArrowLeft, ArrowRight, ArrowDown, Shield } from 'lucide-react';
import AnimationPlayer, { AnimationSource } from './AnimationPlayer';

// 遊戲常數
const CHARACTER_WIDTH = 512;
const CHARACTER_HEIGHT = 512;
const MOVE_SPEED = 10;
const KNOCKBACK_DISTANCE = 40; // 受擊時的後退距離
const BLOCK_KNOCKBACK_DISTANCE = 20; // 防禦成功時的後退距離

// 【修改一】新增 BGM 音量統一控制常數
const BGM_VOLUME = 0.5; // BGM 總音量 (0.0 至 1.0)
const SFX_VOLUME = 0.7; // SFX 總音量 (0.0 至 1.0)

// 【修改後】SFX Map，包含音效實例與獨立音量
const sfxMap = {
  // Player
  playerPunchEffort:   { audio: new Audio('/statics/audio/sfx/player/punch.mp3'),   independentVolume: 0.5 },
  playerKickEffort:    { audio: new Audio('/statics/audio/sfx/player/kick.mp3'),    independentVolume: 0.5 },
  playerSpecialEffort: { audio: new Audio('/statics/audio/sfx/player/special.mp3'), independentVolume: 0.5 },
  playerHurt:          { audio: new Audio('/statics/audio/sfx/player/hurt.mp3'),    independentVolume: 0.7 },
  playerDead:          { audio: new Audio('/statics/audio/sfx/player/dead.mp3'),    independentVolume: 0.8 }, // 【新增】
  playerVictory:       { audio: new Audio('/statics/audio/sfx/player/victory.mp3'), independentVolume: 0.7 }, // 新增勝利音效

  // Enemy 1
  enemy1PunchEffort:   { audio: new Audio('/statics/audio/sfx/enemies/enemy1/punch.mp3'),   independentVolume: 0.2 },
  enemy1KickEffort:    { audio: new Audio('/statics/audio/sfx/enemies/enemy1/kick.mp3'),    independentVolume: 0.2 },
  enemy1SpecialEffort: { audio: new Audio('/statics/audio/sfx/enemies/enemy1/special.mp3'), independentVolume: 0.2 },
  enemy1Hurt:          { audio: new Audio('/statics/audio/sfx/enemies/enemy1/hurt.mp3'),    independentVolume: 0.2 },
  enemy1Dead:          { audio: new Audio('/statics/audio/sfx/enemies/enemy1/dead.mp3'),    independentVolume: 0.8 }, // 【新增】
  enemy1Victory:       { audio: new Audio('/statics/audio/sfx/enemies/enemy1/victory.mp3'), independentVolume: 0.8 }, // 新增勝利音效

  // Enemy 2
  enemy2PunchEffort:   { audio: new Audio('/statics/audio/sfx/enemies/enemy2/punch.mp3'),   independentVolume: 0.8 },
  enemy2KickEffort:    { audio: new Audio('/statics/audio/sfx/enemies/enemy2/kick.mp3'),    independentVolume: 0.8 },
  enemy2SpecialEffort: { audio: new Audio('/statics/audio/sfx/enemies/enemy2/special.mp3'), independentVolume: 0.8 },
  enemy2Hurt:          { audio: new Audio('/statics/audio/sfx/enemies/enemy2/hurt.mp3'),    independentVolume: 0.9 },
  enemy2Dead:          { audio: new Audio('/statics/audio/sfx/enemies/enemy2/dead.mp3'),    independentVolume: 0.8 }, // 【新增】
  enemy2Victory:       { audio: new Audio('/statics/audio/sfx/enemies/enemy2/victory.mp3'), independentVolume: 0.8 }, // 新增勝利音效

  // Enemy 3
  enemy3PunchEffort:   { audio: new Audio('/statics/audio/sfx/enemies/enemy3/punch.mp3'),   independentVolume: 0.4 },
  enemy3KickEffort:    { audio: new Audio('/statics/audio/sfx/enemies/enemy3/kick.mp3'),    independentVolume: 0.3 },
  enemy3SpecialEffort: { audio: new Audio('/statics/audio/sfx/enemies/enemy3/special.mp3'), independentVolume: 1.0 },
  enemy3Hurt:          { audio: new Audio('/statics/audio/sfx/enemies/enemy3/hurt.mp3'),    independentVolume: 0.8 },
  enemy3Dead:          { audio: new Audio('/statics/audio/sfx/enemies/enemy3/dead.mp3'),    independentVolume: 0.8 }, // 【新增】
  enemy3Victory:       { audio: new Audio('/statics/audio/sfx/enemies/enemy3/victory.mp3'), independentVolume: 1.0 }, // 新增勝利音效
  
  // Impacts
  impactPunch:   { audio: new Audio('/statics/audio/sfx/impact/punch.mp3'),   independentVolume: 0.6 },
  impactKick:    { audio: new Audio('/statics/audio/sfx/impact/kick.mp3'),    independentVolume: 0.6 },
  impactSpecial: { audio: new Audio('/statics/audio/sfx/impact/special.mp3'), independentVolume: 0.7 },
  // UI
  uiClick1: { audio: new Audio('/statics/audio/sfx/ui/button_click1.mp3'), independentVolume: 0.8 },
  uiClick2: { audio: new Audio('/statics/audio/sfx/ui/button_click2.mp3'), independentVolume: 0.8 },
  uiClick3: { audio: new Audio('/statics/audio/sfx/ui/button_click3.mp3'), independentVolume: 0.8 },
  announcerReady: { audio: new Audio('/statics/audio/sfx/ui/ready.mp3'), independentVolume: 1.0 }, // 【新增】
  announcerGo:    { audio: new Audio('/statics/audio/sfx/ui/go.mp3'),    independentVolume: 0.8 }, // 【新增】
  announcerKO:    { audio: new Audio('/statics/audio/sfx/ui/ko.mp3'),      independentVolume: 0.8 }, // 【新增】
};

// 【新增】BGM Map，包含音源與獨立音量
const bgmMap = {
  cover:    { src: '/statics/audio/bgm/cover.m4a',    independentVolume: 1.0 },
  victory:  { src: '/statics/audio/bgm/victory.mp3',  independentVolume: 0.8 },
  failure:  { src: '/statics/audio/bgm/failure.mp3',  independentVolume: 0.8 },
  ending:   { src: '/statics/audio/bgm/ending.mp3',   independentVolume: 1.0 },
};

// 【新增】定義遊戲世界的固定尺寸
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
// 舞台固定常數（遊戲世界的物理尺寸）
const FIGHTING_STAGE_CONSTANTS = {
  // 舞台背景尺寸
  backgroundWidth: 2400, // 背景圖寬度（整個可滾動舞台）
  backgroundHeight: 1080, // 舞台高度
  groundY: 0, // 地板位置（角色腳底對齊點）
};

// 動畫配置系統
const ANIMATION_CONFIGS = {
  // PNG 動畫配置
  png: {
    idle: {
      type: 'png' as const,
      path: 'idle',
      frameRate: 10
    },
    walk: {
      type: 'png' as const,
      path: 'walk_forward',
      frameRate: 10
    },
    walk_forward: {
      type: 'png' as const,
      path: 'walk_forward',
      frameRate: 10
    },
    walk_backward: {
      type: 'png' as const,
      path: 'walk_backward',
      frameRate: 10
    },
    punch: {
      type: 'png' as const,
      path: 'punch',
      frameRate: 25
    },
    kick: {
      type: 'png' as const,
      path: 'kick',
      frameRate: 12
    },
    jump: {
      type: 'png' as const,
      path: 'jump',
      frameRate: 20
    },
    pre_jump: {
      type: 'png' as const,
      path: 'jump',
      frameRate: 10
    },
    crouch: {
      type: 'png' as const,
      path: 'crouch',
      frameRate: 10
    },
    crouch_punch: {
      type: 'png' as const,
      path: 'crouch_punch',
      frameRate: 10
    },
    crouch_kick: {
      type: 'png' as const,
      path: 'crouch_kick',
      frameRate: 10
    },
    hit: {
      type: 'png' as const,
      path: 'hit',
      frameRate: 10
    },
    special_attack: {
      type: 'png' as const,
      path: 'special_attack',
      frameRate: 10
    },
    win_round: {
      type: 'png' as const,
      path: 'win_round',
      frameRate: 10
    },
    dead: {
      type: 'png' as const,
      path: 'dead',
      frameRate: 10
    },
    jump_punch: {
      type: 'png' as const,
      path: 'jump_punch',
      frameRate: 20
    },
    jump_kick: {
      type: 'png' as const,
      path: 'jump_kick',
      frameRate: 20
    },
    // 為其他狀態提供預設動畫
    attacking: {
      type: 'png' as const,
      path: 'punch',
      frameRate: 15
    },
    defending: {
      type: 'png' as const,
      path: 'defend',
      frameRate: 10
    },
    crouching: {
      type: 'png' as const,
      path: 'crouch',
      frameRate: 10
    },
    special: {
      type: 'png' as const,
      path: 'special_attack',
      frameRate: 10
    },
    victory: {
      type: 'png' as const,
      path: 'win_round',
      frameRate: 10
    },
    death: {
      type: 'png' as const,
      path: 'dead',
      frameRate: 10
    }
  },
  // Spritesheet 動畫配置
  spritesheet: {
    type: 'spritesheet' as const,
    path: '/src/statics/characters/MainHero/animations/',
    frameRate: 10
  }
};

// 獲取動畫來源的函數
function getAnimationSource(state: string, useSpritesheet: boolean = false): AnimationSource {
  if (useSpritesheet) {
    return {
      ...ANIMATION_CONFIGS.spritesheet,
      state: state
    };
  } else {
    // 根據狀態從設定檔中找到對應的動畫基本設定 (例如 'punch', 'idle' 等)
    // 如果找不到，則預設為 'idle'
    const baseConfig = ANIMATION_CONFIGS.png[state as keyof typeof ANIMATION_CONFIGS.png] || ANIMATION_CONFIGS.png.idle;
    
    // 返回一個新的 source 物件，其中包含為主角 (MainHero) 組合的完整路徑
    return {
      ...baseConfig, // 複製 type, frameRate 等屬性
      path: `MainHero/animations/${baseConfig.path}` // 將角色資料夾和 'animations' 子資料夾加到路徑前面
    };
  }
}

const StatusBar: React.FC<{
  type: 'health' | 'energy';
  currentValue: number;
  displayValue?: number; // 僅用於血條
  maxValue: number;
  isPlayer1: boolean;
}> = ({ type, currentValue, displayValue, maxValue, isPlayer1 }) => {
  const percentage = (currentValue / maxValue) * 100;
  const displayPercentage = displayValue ? (displayValue / maxValue) * 100 : 0;

  const barContainerClasses = "relative w-full h-8 border-2 border-black bg-gray-700/80 rounded-sm overflow-hidden shadow-lg";
  const barBaseClasses = "absolute top-0 h-full transition-all duration-500 ease-out";

  if (type === 'health') {
    return (
      <div className={barContainerClasses}>
        {/* 紅色延遲血條 (底層) */}
        <div className={barBaseClasses} style={{ width: `${displayPercentage}%`, background: '#c0392b', zIndex: 1 }} />
        {/* 綠色即時血條 (上層) */}
        <div className={barBaseClasses} style={{ width: `${percentage}%`, background: 'linear-gradient(to bottom, #2ecc71, #27ae60)', zIndex: 2 }} />
      </div>
    );
  }

  if (type === 'energy') {
    const isMax = currentValue >= maxValue;
    return (
      <div className="relative w-full h-6 border-2 border-black bg-gray-900/80 rounded-sm overflow-hidden shadow-md mt-1">
        {/* 黃色能量條 */}
        <div className={barBaseClasses} style={{ width: `${percentage}%`, background: 'linear-gradient(to bottom, #f1c40f, #f39c12)' }} />
        {/* MAX 文字 */}
        {isMax && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="font-bold text-sm text-red-500 animate-pulse" style={{ textShadow: '1px 1px 2px black' }}>MAX</p>
          </div>
        )}
        {/* 掃光特效 */}
        {isMax && (
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        )}
      </div>
    );
  }

  return null;
};

// 新增：根據關卡獲取對手角色動畫來源
function getEnemyAnimationSource(state: string, currentLevel: number): AnimationSource {
  const enemyFolders = {
    1: 'Enemy01',
    2: 'Enemy02',
    3: 'Enemy03'
  };

  const enemyFolder = enemyFolders[currentLevel as keyof typeof enemyFolders] || 'Enemy01';

  // 核心修正：確保對手也使用 ANIMATION_CONFIGS 來查找正確的路徑
  const baseConfig = ANIMATION_CONFIGS.png[state as keyof typeof ANIMATION_CONFIGS.png] || ANIMATION_CONFIGS.png.idle;

  return {
    type: 'png' as const,
    // 這裡使用 baseConfig.path 而不是 state
    path: `${enemyFolder}/animations/${baseConfig.path}`,
    frameRate: baseConfig.frameRate || 10
  };
}

interface Character {
  id: string;
  name: string;
  health: number;
  displayHealth: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  position: { x: number; y: number };
  velocityY: number; // 【新增】垂直速度，用於物理跳躍
  isGrounded: boolean; // 【新增】是否在地面上
  facing: 'left' | 'right';
  aiState?: 'IDLE' | 'APPROACHING' | 'ENGAGING' | 'DEFENSIVE' | 'SPECIAL_READY' | 'ZONING' | 'SPACING'; 
  aiActionTimer?: number; // 【新增】AI 的思考計時器 (單位：幀
  aiCombo?: { // 【新增】儲存 AI 當前的連招狀態
    sequence: readonly (
      'idle' | 'walk' | 'attacking' | 'defending' | 'crouching' | 'hit' | 'special' | 'victory' | 'death' | 'jump' | 'kick' | 'punch' | 'crouch' | 'crouch_punch' | 'crouch_kick' | 'jump_punch' | 'jump_kick' | 'walk_forward' | 'walk_backward' | 'special_attack' | 'win_round' | 'dead' | 'landing' | 'pre_jump'
    )[];
    step: number;
  } | null;
  state: 'idle' | 'walk' | 'attacking' | 'defending' | 'crouching' | 'hit' | 'special' | 'victory' | 'death' | 'jump' | 'kick' | 'punch' | 'crouch' | 'crouch_punch' | 'crouch_kick' | 'jump_punch' | 'jump_kick' | 'walk' | 'special_attack' | 'win_round' | 'dead' | 'walk_forward' | 'walk_backward' | 'landing' | 'pre_jump';
  hitBox: { x: number; y: number; width: number; height: number };
  hurtBox: { x: number; y: number; width: number; height: number };
}

interface GameState {
  timeLeft: number;
  currentLevel: number;
  gamePhase: 'cover' | 'character-setup' | 'pre-battle-sequence' | 'level-battle' | 'round-over' | 'ending-animation' | 'vs-screen';
  isPaused: boolean;
  playerPhoto: string | null;
  lastResult?: 'win' | 'lose' | null;
  taskId?: string; // 新增 taskId 狀態
}
 // 1. 定義碰撞框資料結構

 interface FrameCollisionData { hurtBox?: Box[]; hitBox?: Box[]; }
 interface AnimationCollisionData { [frame: string]: FrameCollisionData; }
 interface CharacterCollisionData { [action: string]: AnimationCollisionData; }

 // 2. 載入 collision_data.json
 interface Box { x: number; y: number; width: number; height: number; }

 interface Effect {
  id: string;
  type: 'hit-spark' | 'block-shield';
  x: number;
  y: number;
  rotation?: number;
  size?: number;
  source?: AnimationSource;
  facing?: 'left' | 'right';
}

const LEVELS = [
  { 
    id: 1, 
    name: '第一關: 燃燒倉庫 火爆拳', 
    boss: '火爆拳',
    bg: 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #1a1a1a 100%)',
    description: '在燃燒的倉庫中, 你遇到了火爆拳...',
    bgImage: '/statics/backgrounds/Stage1/stage1.png',
    bgm: { src: '/statics/audio/bgm/stage1.mp3', independentVolume: 0.4 }
  },
  { 
    id: 2, 
    name: '第二關: 廢棄月台 蛇鞭女', 
    boss: '蛇鞭女',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
    description: '廢棄的月台上, 蛇鞭女正等著你...',
    bgImage: '/statics/backgrounds/Stage2/stage2.png',
    bgm: { src: '/statics/audio/bgm/stage2.mp3', independentVolume: 1.0 }
  },
  { 
    id: 3, 
    name: '第三關: 虛空之塔 心控王', 
    boss: '心控王',
    bg: 'linear-gradient(135deg, #0d0d0d 0%, #2d1b69 50%, #000000 100%)',
    description: '最終戰！虛空之塔的心控王現身...',
    bgImage: '/statics/backgrounds/Stage3/stage3.png',
    bgm: { src: '/statics/audio/bgm/stage3.mp3', independentVolume: 0.8 }
  }
];

// isFacingOpponent 判斷
function isFacingOpponent(p1: Character, p2: Character) {
  return (
    (p1.facing === 'right' && p1.position.x < p2.position.x) ||
    (p1.facing === 'left' && p1.position.x > p2.position.x)
  );
}

// 【新增】AI 行為設定檔
const AI_PROFILES = {
  1: { // 第一關：火爆拳 - 壓迫式進攻者
    attackRange: 180,
    aggression: 0.7, // 稍微降低猛攻機率，為試探留出空間
    defenseChance: 0.2,
    probeChance: 0.5, // 【新增】有 50% 的機率進行試探
    thinkingInterval: { min: 45, max: 75 },
    combos: [
      { sequence: ['punch', 'punch'] as const, chance: 0.7 },
    ],
  },
  2: { // 第二關：蛇鞭女 - 靈活的立回牽制者
    attackRange: 220,
    aggression: 0.7,
    defenseChance: 0.3,
    probeChance: 0.6, // 【新增】更喜歡用試探來控制距離
    thinkingInterval: { min: 60, max: 90 },
    combos: [
      { sequence: ['punch', 'kick'] as const, chance: 0.6 },
      { sequence: ['kick', 'punch'] as const, chance: 0.5 },
    ],
  },
  3: { // 第三關：心控王 - 耐心的機會主義者
    attackRange: 200,
    aggression: 0.7,
    defenseChance: 0.3,
    probeChance: 0.7, // 【新增】非常喜歡試探，引誘你出招
    thinkingInterval: { min: 90, max: 150 },
    combos: [
      { sequence: ['kick', 'punch'] as const, chance: 0.5 },
      { sequence: ['punch', 'special_attack'] as const, chance: 0.4 },
    ],
  }
} as const;

// 2. 擴充 AI_PROFILES，並加入動態難度與行為參數（每關基礎值 + 連勝動態加成）
function getDynamicAIProfile(level: number, winStreak: number) {
  type Move = 'idle' | 'walk' | 'attacking' | 'defending' | 'crouching' | 'hit' | 'special' | 'victory' | 'death' | 'jump' | 'kick' | 'punch' | 'crouch' | 'crouch_punch' | 'crouch_kick' | 'jump_punch' | 'jump_kick' | 'walk_forward' | 'walk_backward' | 'special_attack' | 'win_round' | 'dead' | 'landing' | 'pre_jump';
  // 每關的基礎參數
  const baseProfiles = [
    {
      attackRange: 180,
      aggression: 0.7,
      defenseChance: 0.2,
      probeChance: 0.5, // 【新增】第一關有 30% 機率試探
      zoning: 0.3,
      spacing: 0.3,
      thinkingInterval: { min: 45, max: 75 },
      combos: [
        { sequence: ['punch', 'punch'] as readonly Move[], chance: 0.7 },
        { sequence: ['kick', 'kick'] as readonly Move[], chance: 0.5 },
        { sequence: ['punch', 'kick'] as readonly Move[], chance: 0.4 },
      ],
      prediction: 0.3,
    },
    {
      attackRange: 220,
      aggression: 0.9,
      defenseChance: 0.3,
      probeChance: 0.6, // 【新增】第二關試探機率降低，更傾向猛攻
      zoning: 0.5,
      spacing: 0.5,
      thinkingInterval: { min: 35, max: 60 },
      combos: [
        { sequence: ['punch', 'kick'] as readonly Move[], chance: 0.7 },
        { sequence: ['kick', 'punch'] as readonly Move[], chance: 0.6 },
        { sequence: ['jump_kick', 'punch'] as readonly Move[], chance: 0.4 },
        { sequence: ['crouch_punch', 'kick'] as readonly Move[], chance: 0.3 },
      ],
      prediction: 0.5,
    },
    {
      attackRange: 200,
      aggression: 0.8,
      defenseChance: 0.3,
      probeChance: 0.2, // 【新增】第三關試探機率最低，因為極具攻擊性
      zoning: 0.6,
      spacing: 0.6,
      thinkingInterval: { min: 25, max: 45 },
      combos: [
        { sequence: ['kick', 'punch'] as readonly Move[], chance: 0.7 },
        { sequence: ['punch', 'special_attack'] as readonly Move[], chance: 0.6 },
        { sequence: ['jump_punch', 'kick', 'special_attack'] as readonly Move[], chance: 0.5 },
        { sequence: ['crouch_kick', 'punch', 'kick'] as readonly Move[], chance: 0.4 },
      ],
      prediction: 0.7,
    },
  ];
  // 動態難度加成（根據連勝數）
  const streakBoost = Math.min(winStreak, 10) * 0.05; // 每連勝+5%，最多+50%
  const profile = baseProfiles[Math.max(0, Math.min(level - 1, baseProfiles.length - 1))];
  return {
    ...profile,
    aggression: Math.min(1, profile.aggression + streakBoost),
    defenseChance: Math.min(1, profile.defenseChance + streakBoost * 0.5),
    zoning: Math.min(1, profile.zoning + streakBoost * 0.5),
    spacing: Math.min(1, profile.spacing + streakBoost * 0.5),
    prediction: Math.min(1, profile.prediction + streakBoost * 0.5),
    thinkingInterval: {
      min: Math.max(10, profile.thinkingInterval.min - winStreak * 2),
      max: Math.max(20, profile.thinkingInterval.max - winStreak * 2),
    },
    combos: [
      ...profile.combos,
      ...(winStreak > 2 ? [{ sequence: ['punch', 'kick', 'special_attack'] as readonly Move[], chance: 0.3 }] : []),
      ...(winStreak > 4 ? [{ sequence: ['jump_kick', 'punch', 'kick'] as readonly Move[], chance: 0.2 }] : []),
      ...(winStreak > 6 ? [{ sequence: ['crouch_punch', 'kick', 'special_attack'] as readonly Move[], chance: 0.2 }] : []),
    ]
  };
}

// 3. 重構 aiBrain，加入反應式擋格、預判、Zoning/Spacing、動態難度
function aiBrain(ai: Character, player: Character, level: number, winStreak: number): { nextAiState: Character['aiState'], action: Character['state'], nextTimer: number, nextCombo: Character['aiCombo'] } {
  const profile = getDynamicAIProfile(level, winStreak);
  const distance = Math.abs(ai.position.x - player.position.x);
  let currentAiState = ai.aiState;
  let timer = ai.aiActionTimer || 0;
  let currentCombo = ai.aiCombo;

  // --- 0. 反應式擋格（偵測玩家攻擊即時擋格）---
  const playerIsAttacking = ['punch', 'kick', 'special_attack', 'jump_punch', 'jump_kick', 'crouch_punch', 'crouch_kick'].includes(player.state);
  if (playerIsAttacking && distance < profile.attackRange + 40 && Math.random() < profile.defenseChance + 0.2) {
    return {
      nextAiState: 'DEFENSIVE',
      action: 'defending',
      nextTimer: Math.floor(10 + Math.random() * 10),
      nextCombo: null
    };
  }
// --- 0.1 Anti-Air ---
// 當玩家在空中，並且距離在可打範圍，直接跳擊懲罰
 if ((player.state === 'jump' || player.state.startsWith('jump_')) 
     && distance < profile.attackRange + 20) {
   return {
     nextAiState: 'ENGAGING',
     action: 'jump_punch',
     nextTimer: Math.floor(profile.thinkingInterval.min / 2),
     nextCombo: null
   };
  }

  // --- 1. 最高優先級：連招執行 ---
  if (currentCombo && currentCombo.step < currentCombo.sequence.length) {
    const nextAttack = currentCombo.sequence[currentCombo.step];
    if (nextAttack === 'special_attack' && ai.energy < ai.maxEnergy) {
      return { nextAiState: 'IDLE', action: 'idle', nextTimer: 0, nextCombo: null };
    }
    return {
      nextAiState: ai.aiState,
      action: nextAttack,
      nextTimer: ai.aiActionTimer,
      nextCombo: { ...currentCombo, step: currentCombo.step + 1 }
    };
  } else if (currentCombo) {
    currentCombo = null;
  }

  // --- 2. 策略層 (心態轉換) ---
  if (timer <= 0) {
    // 預判玩家行為（根據玩家最近的動作傾向）
    let predictedAction: Character['state'] | null = null;
    if (Math.random() < profile.prediction) {
      // 例如：如果玩家連續前進，AI 預判攻擊
      if (player.state === 'walk_forward' || player.state === 'walk') {
        predictedAction = 'punch';
      } else if (player.state === 'crouch' || player.state === 'crouch_punch' || player.state === 'crouch_kick') {
        predictedAction = 'jump_kick';
      } else if (player.state === 'jump' || player.state === 'jump_punch' || player.state === 'jump_kick') {
        predictedAction = 'kick';
      }
    }
    if (ai.energy >= ai.maxEnergy) { currentAiState = 'SPECIAL_READY'; }
    else if (playerIsAttacking && distance < profile.attackRange + 40) { currentAiState = 'DEFENSIVE'; }
    else if (distance > profile.attackRange + 80) { currentAiState = 'APPROACHING'; }
    else if (distance < profile.attackRange * 0.7 && Math.random() < profile.zoning) { currentAiState = 'ZONING'; }
    else if (distance > profile.attackRange * 1.2 && Math.random() < profile.spacing) { currentAiState = 'SPACING'; }
    else { currentAiState = 'ENGAGING'; }
    timer = profile.thinkingInterval.min + Math.random() * (profile.thinkingInterval.max - profile.thinkingInterval.min);
    // 預判行為立即觸發
    if (predictedAction) {
      return {
        nextAiState: 'ENGAGING',
        action: predictedAction,
        nextTimer: timer,
        nextCombo: null
      };
    }
  } else {
    timer -= 1;
  }

  // --- 3. 戰術層 (根據心態執行動作) ---
  let action: Character['state'] = 'idle';
  switch (currentAiState) {
    case 'SPECIAL_READY':
      if (ai.energy >= ai.maxEnergy && distance < 350) {
        action = 'special_attack';
      } else {
        action = 'walk_forward'; // 能量不夠或距離太遠，則改為前進
      }
      break;
    case 'DEFENSIVE':
      action = (Math.random() < profile.defenseChance) ? 'defending' : 'walk_backward';
      break;
    case 'APPROACHING':
      action = (Math.random() < 0.2) ? 'jump_kick' : 'walk_forward';
      break;
    case 'ZONING':
      action = 'walk_backward'; // 主動拉開距離
      break;
    case 'SPACING':
      action = 'walk_forward'; // 主動貼近
      break;
      case 'ENGAGING':
        // 【核心升級】在交戰模式中，引入「試探」、「進攻」、「觀察」三段式決策
        const r = Math.random();
        // 1) 試探：走→打→退
        if (r < profile.probeChance) {
          // 我們將「向前走一步 -> 出一拳 -> 向後走一步」定義為一個特殊的連招
          currentCombo = { sequence: ['walk_forward', 'punch', 'walk_backward'] as const, step: 0 };
          action = currentCombo.sequence[0]; // 執行這個特殊連招的第一步
          currentCombo.step = 1;
        } 
        // 2) 進攻：真正的連招
        else if (r < profile.probeChance + profile.aggression) {
          const comboToDo = profile.combos.find(c => Math.random() < c.chance);
          if (comboToDo) {
            // 檢查能量是否足夠 (如果連招包含必殺技)
            if (comboToDo.sequence.includes('special_attack') && ai.energy < ai.maxEnergy) {
              action = 'idle'; // 能量不夠，放棄這次進攻
            } else {
              currentCombo = { sequence: comboToDo.sequence, step: 0 };
              action = currentCombo.sequence[0];
              currentCombo.step = 1;
            }
          } 
        // 3) 重新佈局：根據距離決定拉開或貼近
        else {
          // 距離太近就後退，太遠就貼近
          action = distance < profile.attackRange * 0.8
          ? 'walk_backward'
          : 'walk_forward';
        }
        }
        break;
  }
  return { nextAiState: currentAiState, action, nextTimer: timer, nextCombo: currentCombo };
}

const FightingGame: React.FC = () => {
  // 【修正】預先計算角色和攝影機的理想初始位置
  // 角色應該在遊戲畫面的兩側，而不是整個舞台的兩側
  const initialP1X = 200; // 玩家在畫面左側
  const initialP2X = GAME_WIDTH - CHARACTER_WIDTH - 100; // AI在畫面右側
  const initialMidpoint = (initialP1X + initialP2X) / 2;
  const initialCameraX = 0; // 攝影機從舞台左側開始
  // const initialCameraX = Math.min(
  //   0,
  //   Math.max(
  //     initialMidpoint - (GAME_WIDTH / 2),
  //     FIGHTING_STAGE_CONSTANTS.backgroundWidth - GAME_WIDTH
  //   )
  // );

  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 60,
    currentLevel: 1,
    gamePhase: 'cover',
    isPaused: false,
    playerPhoto: null,
    lastResult: null
  });
  
  const [gameScale, setGameScale] = useState(1); // 【新增】用於儲存縮放比例的 state
  const [cameraX, setCameraX] = useState(initialCameraX);
  const cameraXRef = useRef(cameraX); // 【新增】cameraX 的 Ref

  // const [collisionData, setCollisionData] = useState<CharacterCollisionData | null>(null);
  const [player1CollisionData, setPlayer1CollisionData] = useState<CharacterCollisionData | null>(null);
  const [player2CollisionData, setPlayer2CollisionData] = useState<CharacterCollisionData | null>(null);
  const [collisionDataLoading, setCollisionDataLoading] = useState(true);
  const [collisionDataError, setCollisionDataError] = useState<string | null>(null);
  // const [openingStep, setOpeningStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gameDimensions, setGameDimensions] = useState(FIGHTING_STAGE_CONSTANTS); // 動態遊戲尺寸
  
  const setPlayerIdleState = (player) => {

  };

  // 背景圖片路徑
  // const backgroundImage = '/statics/backgrounds/Stage1/stage1.png';
  
  // 1. 玩家初始 energy=0
  const [player1, setPlayer1] = useState<Character>({
    id: 'player1',
    name: '玩家',
    health: 100,
    displayHealth: 100,
    maxHealth: 100,
    energy: 0, // 初始為0
    maxEnergy: 100,
    // 初始位置設為舞台左側，y=0 表示在地面
    position: { x: initialP1X, y: 0 }, 
    velocityY: 0, // 【新增】
    isGrounded: true, // 【新增】
    facing: 'right',
    state: 'idle',
    hitBox: { x: 200, y: 300, width: 40, height: 60 },
    hurtBox: { x: 200, y: 300, width: 40, height: 60 }
  });

  const [player2, setPlayer2] = useState<Character>({
    id: 'player2',
    name: 'AI',
    health: 100,
    displayHealth: 100,
    maxHealth: 100,
    energy: 0,
    maxEnergy: 100,
    // 初始位置設為舞台右側，y=0 表示在地面
    position: { x: initialP2X, y: 0 },
    velocityY: 0, // 【新增】
    isGrounded: true, // 【新增】
    facing: 'left',
    state: 'idle',
    aiState: 'IDLE', // AI 開始時的心態是「待機」
    aiActionTimer: 0, // 【新增】初始計時器為 0
    aiCombo: null, // 【新增】初始連招為 null
    hitBox: { x: 600, y: 300, width: 40, height: 60 },
    hurtBox: { x: 600, y: 300, width: 40, height: 60 }
  });

  const [effects, setEffects] = useState<Effect[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null); // 【新增】儲存 requestAnimationFrame 的 ID
  const pressedKeysRef = useRef<Set<string>>(new Set()); // 【新增】用來在主循環中讀取最新的按鍵狀態
  const keyBufferRef = useRef<Array<{ key: string; time: number }>>([]);
  const player1IdleStateRef = useRef(null);
  const player1HitRegisteredRef = useRef(false);
  const player2HitRegisteredRef = useRef(false);
  const aiActionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // <-- 【新增】這個 Ref
  const [announcementText, setAnnouncementText] = useState('');

    // 3. 幀追蹤狀態
  const [player1CurrentFrame, setPlayer1CurrentFrame] = useState(1);
  const [player2CurrentFrame, setPlayer2CurrentFrame] = useState(1);
  const player1Ref = useRef(player1);
  const player2Ref = useRef(player2);
  const p1FrameRef = useRef(player1CurrentFrame);
  const p2FrameRef = useRef(player2CurrentFrame);

  // 1. 新增 winStreak 狀態（用於動態難度曲線）
  const [winStreak, setWinStreak] = useState(0); // 玩家連勝次數
  const [isStoryVideoPlaying, setIsStoryVideoPlaying] = useState(false); // 控制是否顯示影片
  const [isVideoEnded, setIsVideoEnded] = useState(false); // 追蹤影片是否已播放完畢
  const [isPhotoReady, setIsPhotoReady] = useState(false); // 追蹤照片是否已成功取回
  const [uploadError, setUploadError] = useState<string | null>(null); // 儲存上傳錯誤訊息
  const storyVideoRef = useRef<HTMLVideoElement | null>(null); // 用於控制影片播放

  useEffect(() => {
    player1Ref.current = player1;
  }, [player1]);

  useEffect(() => {
    player2Ref.current = player2;
  }, [player2]);

  useEffect(() => {
    p1FrameRef.current = player1CurrentFrame;
  }, [player1CurrentFrame]);

  useEffect(() => {
    p2FrameRef.current = player2CurrentFrame;
  }, [player2CurrentFrame]);

  useEffect(() => {
    if (isVideoEnded && isPhotoReady) {
      setGameState(prev => ({
        ...prev,
        gamePhase: 'vs-screen',
        currentLevel: 1,
        timeLeft: 60,
        isPaused: false
      }));
      resetPlayersForNewBattle();
    }
  }, [isVideoEnded, isPhotoReady]);
  
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
  
    // 播放函數
    const playMusic = (src: string, independentVolume: number, loop = true) => {
      audioEl.volume = BGM_VOLUME * independentVolume; // 計算最終音量
      if (!audioEl.src.endsWith(src)) {
        audioEl.src = src;
        audioEl.load();
      }
      audioEl.loop = loop;
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.error("BGM 播放失敗:", error));
      }
    };
  
    const stopMusic = () => {
      audioEl.pause();
    };
  
    // 影片播放時，優先暫停音樂
    if (isStoryVideoPlaying && !isVideoEnded) {
      stopMusic();
      return;
    }

    // 根據遊戲階段播放音樂
    switch (gameState.gamePhase) {
      case 'character-setup':
      case 'vs-screen':
        playMusic(bgmMap.cover.src, bgmMap.cover.independentVolume);
        break;
      case 'level-battle':
        if (!gameState.isPaused) {
          const currentLevelInfo = LEVELS[gameState.currentLevel - 1];
          if (currentLevelInfo?.bgm) {
            playMusic(currentLevelInfo.bgm.src, currentLevelInfo.bgm.independentVolume);
          }
        } else {
          stopMusic();
        }
        break;
      case 'round-over':
        stopMusic();
        setTimeout(() => {
          if (gameState.lastResult === 'win') {
            playMusic(bgmMap.victory.src, bgmMap.victory.independentVolume, true);
          } else if (gameState.lastResult === 'lose') {
            playMusic(bgmMap.failure.src, bgmMap.failure.independentVolume, true);
          }
        }, 100);
        break;
      case 'ending-animation':
        playMusic(bgmMap.ending.src, bgmMap.ending.independentVolume);
        break;
      default:
        stopMusic();
        break;
    }
  }, [gameState.gamePhase, gameState.currentLevel, gameState.isPaused, isStoryVideoPlaying, gameState.lastResult]);
  
//新增此 useEffect 來處理攻擊未擊中、勝利和死亡音效
useEffect(() => {
  const p1State = player1Ref.current.state;
  const baseAttackType = getBaseAttackType(p1State);

  if (baseAttackType) {
    playSfxWithDucking(sfxMap[`player${baseAttackType}Effort`]);
  } else if (p1State === 'dead') {
    playSfxWithDucking(sfxMap.playerDead);
  } else if (p1State === 'victory') {
    playSfxWithDucking(sfxMap.playerVictory);
  }
}, [player1.state]);

useEffect(() => {
  const p2State = player2Ref.current.state;
  const baseAttackType = getBaseAttackType(p2State);
  const lvl = gameState.currentLevel;

  if (baseAttackType) {
    playSfxWithDucking(sfxMap[`enemy${lvl}${baseAttackType}Effort`]);
  } else if (p2State === 'dead') {
    playSfxWithDucking(sfxMap[`enemy${lvl}Dead`]);
  }
}, [player2.state]);

  useEffect(() => {
    if (isStoryVideoPlaying && storyVideoRef.current) {
      storyVideoRef.current.play().catch(error => {
        console.error("影片自動播放失敗:", error);
        // 這裡可以加入一個播放按鈕，讓用戶手動播放
      });
    }
  }, [isStoryVideoPlaying]);

  useEffect(() => {
   if (gameState.gamePhase === 'vs-screen') {
    const timer = setTimeout(() => {
      setGameState(prev => ({ 
        ...prev, 
        timeLeft: 60,
        gamePhase: 'pre-battle-sequence', 
        isPaused: false 
      }));
      resetPlayersForNewBattle();
    }, 3000);
    return () => clearTimeout(timer);
  }
}, [gameState.gamePhase]);

// 【步驟三】新增此 useEffect 來控制戰前動畫序列
useEffect(() => {
  if (gameState.gamePhase === 'pre-battle-sequence') {
    setPressedKeys(new Set()); 

    const sequenceActions = [
      { text: `Stage ${gameState.currentLevel}`, sfx: sfxMap.uiClick1, delay: 500 },
      { text: 'Ready', sfx: sfxMap.announcerReady, delay: 2000 },
      { text: 'Go!', sfx: sfxMap.announcerGo, delay: 3500 },
      { text: '', sfx: undefined, delay: 4500, action: () => setGameState(prev => ({ ...prev, gamePhase: 'level-battle' })) }
    ];

    const timeouts = sequenceActions.map(seq => 
      setTimeout(() => {
        setAnnouncementText(seq.text);
        if (seq.sfx) playSfxWithDucking(seq.sfx);
        if (seq.action) seq.action();
      }, seq.delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }
}, [gameState.gamePhase, gameState.currentLevel]);

  // 【新增/替換】處理遊戲畫布縮放的 useEffect
  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // 計算寬度和高度的縮放比例
      const scaleX = screenWidth / GAME_WIDTH;
      const scaleY = screenHeight / GAME_HEIGHT;
      
      // 選擇較小的比例，以確保整個遊戲畫布都能被看見
      const scale = Math.min(scaleX, scaleY);
      
      setGameScale(scale);
    };

    // 初始設定
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // 空依賴陣列，表示只在組件掛載和卸載時執行

  // Game timer
  useEffect(() => {
    if (gameState.gamePhase === 'level-battle' && !gameState.isPaused && gameState.timeLeft > 0) {
      const timer = setInterval(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.gamePhase, gameState.isPaused, gameState.timeLeft]);

  // Battle end check
  useEffect(() => {
    // 【核心修正】只在戰鬥階段才檢查勝負，避免影響其他頁面
  if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) {
    return;
   }

    if (gameState.timeLeft === 0 || player1.health <= 0 || player2.health <= 0) {
      handleBattleEnd();
    }
  }, [gameState.gamePhase, gameState.isPaused, gameState.timeLeft, player1.health, player2.health]);

  // 【新增】這個 useEffect 專門用來同步按鍵狀態到 Ref
  useEffect(() => {
  pressedKeysRef.current = pressedKeys;
}, [pressedKeys]);

  useEffect(() => {
  cameraXRef.current = cameraX;
}, [cameraX]);
  // Keyboard controls for cover screen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      playSfxWithDucking(sfxMap.uiClick1);
      setGameState(prev => ({ ...prev, gamePhase: 'character-setup' }));
    };
    if (gameState.gamePhase === 'cover') {
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [gameState.gamePhase]);

  
  const handleP1AnimationComplete = () => {
    setPlayer1(prev => {
      const isSinglePlayAnimation = [
        'punch', 'kick', 'crouch_punch', 'crouch_kick', 
        'jump_punch', 'jump_kick', 'hit', 'special_attack'
      ].includes(prev.state);
  
      // 如果是一個單次播放的攻擊動畫結束了，就回到 idle，讓角色可以進行下一個動作
      if (isSinglePlayAnimation) {
        player1HitRegisteredRef.current = false; // 重置攻擊命中旗幟
        return { ...prev, state: 'idle' };
      }
      
      return prev;
    });
  };
  // 【新增這段函式】為 AI (Player 2) 準備的動畫完成處理函式
const handleP2AnimationComplete = () => {
  setPlayer2(prev => {
    // AI 的攻擊、受擊、防禦動畫都屬於單次播放
    const isSinglePlayAnimation = [
      'punch', 'kick', 'crouch_punch', 'crouch_kick', 
      'hit', 'special_attack', 'defending', 'attacking'
    ].includes(prev.state);

    if (isSinglePlayAnimation) {
      return { ...prev, state: 'idle' };
    }
    
    return prev;
  });
};
  // Battle controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) return;
      const key = e.key.toLowerCase();
  
      setPressedKeys(prev => {
    const newKeys = new Set(prev);
    newKeys.add(key);
    return newKeys;
      });

  // Dash 的 key buffer 邏輯可以保留，因為它依賴於按鍵事件的時機
      keyBufferRef.current.push({ key, time: Date.now() });
      if (keyBufferRef.current.length > 10) keyBufferRef.current.shift();
};
// [NEW] 簡化的 handleKeyUp，只負責從 pressedKeys 中移除按鍵
const handleKeyUp = (e: KeyboardEvent) => {
  const key = e.key.toLowerCase();
  setPressedKeys(prev => {
    const newKeys = new Set(prev);
    newKeys.delete(key);
    return newKeys;
  });
};

// [NEW] 此 useEffect 只負責綁定/解綁事件監聽器
useEffect(() => {
  // 每次 player1.state 改變，都重新註冊 handleKeyDown，以捕獲最新的 state
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, [gameState.gamePhase, gameState.isPaused, player1.state]); // <-- 【重要】在這裡加入 player1.state

// 檔案: FightingGame.tsx

// 【修改後】最終的、全能的 requestAnimationFrame 遊戲主循環
useEffect(() => {
  const GRAVITY = 0.8;
  const JUMP_FORCE = 18;

  const gameLoop = () => {
    // --- 玩家狀態更新 ---
    setPlayer1(prev => {
      if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) {
        return prev;
      }

      // 1. 物理更新 (重力與跳躍)
      let nextVelocityY = prev.velocityY - GRAVITY;
      let nextY = prev.position.y + nextVelocityY;
      let nextIsGrounded = false;
      if (nextY <= 0) {
        nextY = 0;
        nextVelocityY = 0;
        nextIsGrounded = true;
      }

      // 2. 動作決策
      let nextState = prev.state;
      let energyUpdate = {};

      const canAct = () => {
        const uninterruptibleStates = ['hit', 'dead', 'victory', 'special_attack', 'punch', 'kick', 'crouch_punch', 'crouch_kick', 'jump_punch', 'jump_kick', 'pre_jump', 'landing', 'defending'];
        return !uninterruptibleStates.includes(prev.state);
      };

      if (canAct()) {
        if (nextIsGrounded) { // 只有在地面上時才能觸發新的地面動作
          // 組合鍵
          if (pressedKeysRef.current.has('w') && pressedKeysRef.current.has('j')) { nextState = 'jump_punch'; nextVelocityY = JUMP_FORCE; player1HitRegisteredRef.current = false; }
          else if (pressedKeysRef.current.has('w') && pressedKeysRef.current.has('k')) { nextState = 'jump_kick'; nextVelocityY = JUMP_FORCE; player1HitRegisteredRef.current = false; }
          else if (pressedKeysRef.current.has('s') && pressedKeysRef.current.has('j')) { nextState = 'crouch_punch'; player1HitRegisteredRef.current = false; }
          else if (pressedKeysRef.current.has('s') && pressedKeysRef.current.has('k')) { nextState = 'crouch_kick'; player1HitRegisteredRef.current = false; }
          // 單鍵
          else if (pressedKeysRef.current.has('j')) { nextState = 'punch'; player1HitRegisteredRef.current = false; }
          else if (pressedKeysRef.current.has('k')) { nextState = 'kick'; player1HitRegisteredRef.current = false; }
          else if (pressedKeysRef.current.has('l') && prev.energy >= prev.maxEnergy) { 
            nextState = 'special_attack'; 
            energyUpdate = { energy: 0 }; 
            player1HitRegisteredRef.current = false;
          }
          else if (pressedKeysRef.current.has('w')) { nextState = 'pre_jump'; }
          // 持續狀態
          else if (pressedKeysRef.current.has('a') || pressedKeysRef.current.has('d')) {
            nextState = (prev.facing === (pressedKeysRef.current.has('a') ? 'left' : 'right')) ? 'walk_forward' : 'walk_backward';
          } else if (pressedKeysRef.current.has('s')) {
            nextState = 'crouch';
          } else {
            nextState = 'idle';
          }
        } else { // 空中動作
          if (pressedKeysRef.current.has('j')) { nextState = 'jump_punch'; player1HitRegisteredRef.current = false; }
          else if (pressedKeysRef.current.has('k')) { nextState = 'jump_kick'; player1HitRegisteredRef.current = false; }
        }
      }

      // 3. 水平位置更新
      let nextX = prev.position.x;
      // 【修正】讓角色在跳躍時也能根據方向鍵移動
      if (prev.state !== 'hit' && (pressedKeysRef.current.has('a') || pressedKeysRef.current.has('d')) && !['crouch', 'punch', 'kick', 'special_attack', 'crouch_punch', 'crouch_kick'].includes(nextState)) {
        const direction = pressedKeysRef.current.has('a') ? 'left' : 'right';
        nextX = prev.position.x + (direction === 'left' ? -MOVE_SPEED : MOVE_SPEED);
    }
      
    const minX = cameraXRef.current; // 攝影機的左邊緣
    const maxX = cameraXRef.current + GAME_WIDTH - CHARACTER_WIDTH; // 攝影機的右邊緣
    nextX = Math.max(minX, Math.min(maxX, nextX));


      // 4. 最終狀態返回
      return {
        ...prev,
        ...energyUpdate,
        position: { x: nextX, y: nextY },
        velocityY: nextVelocityY,
        isGrounded: nextIsGrounded,
        // 從空中落地時，進入 'landing' 狀態
        state: (nextIsGrounded && !prev.isGrounded) ? 'landing' : nextState
      };
    });

// --- AI 狀態更新 (使用 FSM) ---
setPlayer2(prev => {
  if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) {
    return prev;
  }
  
  const uninterruptibleStates = ['hit', 'dead', 'victory', 'special_attack', 'punch', 'kick', 'crouch_punch', 'crouch_kick', 'jump', 'jump_punch', 'jump_kick', 'pre_jump', 'landing', 'defending'];
      // 【關鍵】如果 AI 正在執行不可中斷的動作，我們只更新物理，不呼叫大腦
      if (uninterruptibleStates.includes(prev.state)) {
        let nextVelocityY = prev.velocityY - GRAVITY;
        let nextY = prev.position.y + nextVelocityY;
        let nextIsGrounded = false;
        if (nextY <= 0) { nextY = 0; nextVelocityY = 0; nextIsGrounded = true; }

        return {
          ...prev,
          position: { ...prev.position, y: nextY },
          velocityY: nextVelocityY,
          isGrounded: nextIsGrounded,
          // 【重要】如果 AI 正在連招中，動畫結束後不直接變回 idle，而是讓大腦在下一幀決定
          state: (nextIsGrounded && !prev.isGrounded && !prev.aiCombo) ? 'idle' : prev.state
        };
      }

      const p1 = player1Ref.current;
      const decision = aiBrain(prev, p1, gameState.currentLevel, winStreak); // 傳入 winStreak

      let nextState = decision.action;
      let nextAiState = decision.nextAiState;
      let nextTimer = decision.nextTimer;
      let nextCombo = decision.nextCombo;
      
      let nextX = prev.position.x;
      let nextY = prev.position.y;
      let nextVelocityY = prev.velocityY;
      let nextIsGrounded = prev.isGrounded;
      let energyUpdate = {};

  nextVelocityY -= GRAVITY;
  nextY += nextVelocityY;
  if (nextY <= 0) { nextY = 0; nextVelocityY = 0; nextIsGrounded = true; }
  
  if ((nextState === 'jump' || nextState === 'jump_kick' || nextState === 'jump_punch') && nextIsGrounded) {
    nextVelocityY = JUMP_FORCE;
  }

  if (nextState === 'special_attack' && prev.energy >= prev.maxEnergy) {
    energyUpdate = { energy: 0 };
  }

  if (['punch', 'kick', 'crouch_punch', 'crouch_kick', 'special_attack'].includes(nextState) && !['punch', 'kick', 'crouch_punch', 'crouch_kick', 'special_attack'].includes(prev.state)) {
    player2HitRegisteredRef.current = false;
  }

  if (nextState === 'walk_forward' || nextState === 'walk_backward') {
    const direction = nextState === 'walk_forward' ? (prev.position.x > p1.position.x ? 'left' : 'right') : (prev.position.x > p1.position.x ? 'right' : 'left');
    nextX = prev.position.x + (direction === 'left' ? -MOVE_SPEED : MOVE_SPEED);
  }
  
  const minX = cameraXRef.current;
  const maxX = cameraXRef.current + GAME_WIDTH - CHARACTER_WIDTH;
  nextX = Math.max(minX, Math.min(maxX, nextX));
  
  if (nextIsGrounded && !prev.isGrounded) {
    nextState = 'idle';
  }

  return {
    ...prev,
    ...energyUpdate,
    position: { x: nextX, y: nextY },
    velocityY: nextVelocityY,
    isGrounded: nextIsGrounded,
    state: nextState,
    aiState: nextAiState,
    aiActionTimer: nextTimer, // 【新增】更新 AI 的思考計時器
  };
});
        // 【新增以下攝影機邏輯】
      const p1_x = player1Ref.current.position.x;
      const p2_x = player2Ref.current.position.x;
      const midpoint = (p1_x + p2_x) / 2;
      let targetCameraX = midpoint - (GAME_WIDTH / 2);
      const maxCameraX = FIGHTING_STAGE_CONSTANTS.backgroundWidth - GAME_WIDTH;
      targetCameraX = Math.max(0, Math.min(targetCameraX, maxCameraX));
      setCameraX(targetCameraX);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  gameLoopRef.current = requestAnimationFrame(gameLoop);

  return () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  };
}, [gameState.gamePhase, gameState.isPaused]);

// 【貼上這段全新的、專門用於碰撞檢測的 useEffect】
useEffect(() => {
  const p1 = player1Ref.current;
  const p2 = player2Ref.current;
  const p1Frame = p1FrameRef.current;
  const p2Frame = p2FrameRef.current;
  
  const isPlayer1Attacking = ['punch', 'kick', 'jump_punch', 'jump_kick', 'special_attack', 'crouch_punch', 'crouch_kick'].includes(p1.state);
  
  // 【核心修正】在每次攻擊動畫開始時，重設碰撞旗標
  if (isPlayer1Attacking && p1Frame <= 2) { // 通常前 1-2 幀是準備動作
  player1HitRegisteredRef.current = false;
}

  if (
    gameState.gamePhase === 'level-battle' && !gameState.isPaused && isPlayer1Attacking &&
    !player1HitRegisteredRef.current && player1CollisionData && player2CollisionData
  ) {
    const p1HitBoxes = getAttackHitBox(p1, p1Frame, player1CollisionData);
    const p2HurtBoxes = getHurtBox(p2, player2CurrentFrame, player2CollisionData);
    // 找到實際碰撞的點
    let intersectionPoint: { x: number; y: number } | null = null;
    for (const hitBox of p1HitBoxes) {
      for (const hurtBox of p2HurtBoxes) {
        if (isFacingOpponent(p1, p2) && isCollision(hitBox, hurtBox)) {
          intersectionPoint = getIntersectionPoint(hitBox, hurtBox);
          break;
        }
      }
      if (intersectionPoint) break;
    }

    if (intersectionPoint) { 
      player1HitRegisteredRef.current = true;
      
      const result = calculateCombatResult(p1, p2, gameState.currentLevel);
      const baseAttackType = getBaseAttackType(p1.state);
      const knockbackDirection = p1.facing === 'right' ? 1 : -1; // AI 應該往 p1 的朝向後退

      if (result.defended) {
        setPlayer2(prev => ({ ...prev, health: Math.max(0, prev.health - result.damage), state: 'defending',
          // 防禦擊退
          position: { ...prev.position, x: prev.position.x + BLOCK_KNOCKBACK_DISTANCE * knockbackDirection } }));
        addEffect('defending', p2.position.x, p2.position.y);
        if (baseAttackType) {
          setTimeout(() => playSfxWithDucking(sfxMap[`impact${baseAttackType}`]), 80);
        }
      } else {
        setPlayer2(prev => {
          const newHealth = Math.max(0, prev.health - result.damage);
          // 延遲 0.5 秒後，才更新紅色的 displayHealth
          setTimeout(() => {
            setPlayer2(p => ({ ...p, displayHealth: newHealth }));
          }, 500);
          // 立刻更新綠色的 health
          return { ...prev, health: newHealth, state: 'hit',
            // 受傷擊退
            position: { ...prev.position, x: prev.position.x + KNOCKBACK_DISTANCE * knockbackDirection } };
        });
        setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + result.energyGain) }));
        addEffect('hit', intersectionPoint.x, intersectionPoint.y);
        
        // 只播放撞擊聲和受傷聲
        if (baseAttackType) {
          setTimeout(() => playSfxWithDucking(sfxMap[`impact${baseAttackType}`]), 80);
        }
        playSfxWithDucking(sfxMap[`enemy${gameState.currentLevel}Hurt`]);
      }

      setTimeout(() => {
        setPlayer2(prev => (prev.health > 0 ? { ...prev, state: 'idle' } : prev));
      }, 500);
    }
  }
}, [player1CurrentFrame]);

useEffect(() => {
  const p1 = player1Ref.current;
  const p2 = player2Ref.current;
  const p1Frame = p1FrameRef.current;
  const p2Frame = p2FrameRef.current;

  const isPlayer2Attacking = ['punch', 'kick', 'jump_punch', 'jump_kick', 'special_attack', 'crouch_punch', 'crouch_kick', 'attacking'].includes(p2.state);
  
  // 【核心修正】在每次攻擊動畫開始時，重設碰撞旗標
  if (isPlayer2Attacking && p2Frame <= 2) {
    player2HitRegisteredRef.current = false;
  }

  if (
    gameState.gamePhase === 'level-battle' && !gameState.isPaused && isPlayer2Attacking &&
    !player2HitRegisteredRef.current && player1CollisionData && player2CollisionData
  ) {
    const p2HitBoxes = getAttackHitBox(p2, p2Frame, player2CollisionData);
    const p1HurtBoxes = getHurtBox(p1, player1CurrentFrame, player1CollisionData);

    // 找到實際碰撞的點
    let intersectionPoint: { x: number; y: number } | null = null;
    for (const hitBox of p2HitBoxes) {
      for (const hurtBox of p1HurtBoxes) {
        if (isFacingOpponent(p2, p1) && isCollision(hitBox, hurtBox)) {
          intersectionPoint = getIntersectionPoint(hitBox, hurtBox);
          break;
        }
      }
      if (intersectionPoint) break;
    }

    if (intersectionPoint) { 
      player2HitRegisteredRef.current = true;
      
      const result = calculateCombatResult(p2, p1, gameState.currentLevel);
      const baseAttackType = getBaseAttackType(p2.state);
      const knockbackDirection = p2.facing === 'right' ? 1 : -1; // 玩家應該往 p2 的朝向後退
      const lvl = gameState.currentLevel;

      if (result.defended) {
        setPlayer1(prev => ({ ...prev, health: Math.max(0, prev.health - result.damage), state: 'defending',
          // 防禦擊退
          position: { ...prev.position, x: prev.position.x + BLOCK_KNOCKBACK_DISTANCE * knockbackDirection } }));
        addEffect('defending', p1.position.x, p1.position.y);
        if (baseAttackType) {
          setTimeout(() => playSfxWithDucking(sfxMap[`impact${baseAttackType}`]), 80);
        }
      } else {
        setPlayer1(prev => {
          const newHealth = Math.max(0, prev.health - result.damage);
          // 延遲 0.5 秒後，才更新紅色的 displayHealth
          setTimeout(() => {
            setPlayer1(p => ({ ...p, displayHealth: newHealth }));
          }, 500);
          // 立刻更新綠色的 health
          return { ...prev, health: newHealth, state: 'hit',
            // 受傷擊退
            position: { ...prev.position, x: prev.position.x + KNOCKBACK_DISTANCE * knockbackDirection } };
        });
        setPlayer2(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + result.energyGain) }));
        addEffect('hit', intersectionPoint.x, intersectionPoint.y);

        // 只播放撞擊聲和受傷聲
        if (baseAttackType) {
          setTimeout(() => playSfxWithDucking(sfxMap[`impact${baseAttackType}`]), 80);
        }
        playSfxWithDucking(sfxMap.playerHurt);
      }

      setTimeout(() => {
        setPlayer1(prev => (prev.health > 0 ? { ...prev, state: 'idle' } : prev));
      }, 500);
    }
  }
}, [player2CurrentFrame]);

// 【新增】這個 useEffect 用於處理起跳前的準備動作
useEffect(() => {
  if (player1.state === 'pre_jump') {
    const preJumpTimeout = setTimeout(() => {
        setPlayer1(prev => {
        if (prev.state === 'pre_jump') {
          return { ...prev, state: 'jump', velocityY: 18 }; // 這裡直接賦予跳躍速度
        }
        return prev;
      });
    }, 50); // 150 毫秒的起跳準備時間，您可以調整

    return () => clearTimeout(preJumpTimeout);
  }
}, [player1.state]);
// 【新增】這個 useEffect 用於處理落地後的短暫硬直
useEffect(() => {
  if (player1.state === 'landing') {
    const landingTimeout = setTimeout(() => {
      setPlayer1(prev => {
        // 確保是在 landing 狀態時才變回 idle
        if (prev.state === 'landing') {
            return { ...prev, state: 'idle' };
          }
          return prev;
        });
    }, 100); // 100 毫秒的落地延遲，可以調整這個數值

    return () => clearTimeout(landingTimeout);
  }
}, [player1.state]);

  useEffect(() => {
    fetch(`/statics/characters/MainHero/collision_data.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} for MainHero`);
        return res.json();
      })
      .then(data => setPlayer1CollisionData(data))
      .catch(err => setCollisionDataError('載入玩家碰撞資料失敗: ' + err.message));
  }, []); // 空依賴陣列，確保只執行一次
  
  // 【修改後 - Part 2】修改原本的 useEffect，讓它專門載入敵人的碰撞資料
  useEffect(() => {
    const enemyFolders = { 1: 'Enemy01', 2: 'Enemy02', 3: 'Enemy03' };
    const enemyFolder = enemyFolders[gameState.currentLevel as keyof typeof enemyFolders] || 'Enemy01';
    
    fetch(`/statics/characters/${enemyFolder}/collision_data.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${enemyFolder}`);
        return res.json();
      })
      .then(data => {
        setPlayer2CollisionData(data); // <-- 存入 player2 專用的 state
      })
      .catch((err) => {
        setPlayer2CollisionData(null);
        setCollisionDataError(`載入敵人碰撞資料失敗: ` + err.message);
      });
  }, [gameState.currentLevel]);


  // 4. 動態取得 hitbox/hurtbox（支援 facing）
function getHurtBox(target: Character, currentFrame: number, data: CharacterCollisionData | null): Box[] {
  if (!data) return []; // <-- 正確使用傳入的 data
  const anim = data[target.state as keyof typeof data] || data['idle'];
  const frameData = anim?.[String(currentFrame)]?.hurtBox || []; // 取得當前幀的 hurtBox
    return frameData.map(box => {
    // 計算基於角色朝向的局部 X 座標
        const localX = target.facing === 'right'
    // const transformedX = target.facing === 'left'
      ? (CHARACTER_WIDTH - box.x - box.width) // 翻轉 X 座標
      : box.x;
     const globalX = target.position.x + localX;
     const globalY = target.position.y + box.y; // Y doesn't need flipping
      // return { x: transformedX, y: box.y, width: box.width, height: box.height }; // 返回當前幀的hurtBox
    // 將局部座標轉換為全局座標
    // const globalX = target.position.x + transformedX;
    // const globalY = target.position.y + box.y; // Y 軸通常不需要翻轉，只需加上角色 Y 位置

    return { x: globalX, y: globalY, width: box.width, height: box.height };
    });
  }
function getAttackHitBox(attacker: Character, currentFrame: number, data: CharacterCollisionData | null): Box[] {
  if (!data) return []; // <-- 正確使用傳入的 data
  const anim = data[attacker.state as keyof typeof data] || data['idle'];
    const frameData = anim?.[String(currentFrame)]?.hitBox || [];
    return frameData.map(box => {
    // 根據角色朝向調整局部 X 座標
    // 如果 collision_data.json 是面向左邊的座標，
    // 那麼當 attacker.facing === 'left' 時，直接使用 box.x
    // 當 attacker.facing === 'right' 時，才需要翻轉 x 座標
    const localX = attacker.facing === 'right'   
    // const transformedX = attacker.facing === 'left'
      ? (CHARACTER_WIDTH - box.x - box.width) // 翻轉 X 座標
      : box.x;
      // return { x: transformedX, y: box.y, width: box.width, height: box.height }; // 返回當前幀的hurtBox
    // 將局部座標轉換為全局座標
    const globalX = attacker.position.x + localX;
    const globalY = attacker.position.y + box.y; // Y doesn't need flipping
    // const globalX = attacker.position.x + transformedX;
    // const globalY = attacker.position.y + box.y; // Y 軸通常不需要翻轉

    return { x: globalX, y: globalY, width: box.width, height: box.height };
  });
}

// 只保留一個 isCollision 函式，並確保它接受兩個 Box 物件 (這些 Box 物件已經包含了全局座標和面向資訊)
function isCollision(rect1: Box, rect2: Box) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}
// 【步驟二】新增此函式來計算碰撞中心點
const getIntersectionPoint = (rect1: Box, rect2: Box): { x: number; y: number } | null => {
  const x1 = Math.max(rect1.x, rect2.x);
  const y1 = Math.max(rect1.y, rect2.y);
  const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

  if (x1 < x2 && y1 < y2) {
    // 有交集，返回交集區域的中心點
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }
  
  return null; // 無交集
};

// 【新增】戰鬥結算中心 (傷害計算機)
function calculateCombatResult(
  attacker: Character, 
  defender: Character, 
  level: number
): { damage: number; energyGain: number; defended: boolean } {
  
  let baseDamage = 0;
  let energyGain = 0;
  let damageReduction = 0;
  const attackType = attacker.state;

  // 1. 根據攻擊類型，決定基礎傷害、能量獲取、防禦減傷值
  if (attackType.includes('punch')) {
    baseDamage = 5;
    energyGain = 15;
    damageReduction = 3;
  } else if (attackType.includes('kick')) {
    baseDamage = 10;
    energyGain = 20;
    damageReduction = 5;
  } else if (attackType.includes('special_attack')) {
    baseDamage = 30; // 假設必殺技傷害為 30
    energyGain = 0; // 必殺技不增加能量
    damageReduction = 15; // 必殺技也可被防禦，但減傷較多
  }

  // 2. 如果攻擊者是 AI，根據關卡增加傷害
  if (attacker.id === 'player2') {
    const levelBonus = [0, 1, 3, 5]; // 關卡 0(無效), 1, 2, 3 的傷害加成
    baseDamage += levelBonus[level] || 0;
  }

  // 3. 判斷被攻擊方是否成功防禦 (後退或主動防禦)
  const isDefending = defender.state === 'defending' || defender.state === 'walk_backward';
  
  if (isDefending) {
    // 防禦成功
    const finalDamage = Math.max(0, baseDamage - damageReduction);
    return { damage: finalDamage, energyGain: 0, defended: true }; // 防禦成功，攻擊方不得能量
  } else {
    // 命中成功
    return { damage: baseDamage, energyGain: energyGain, defended: false };
  }
}

  // 4. UI 只顯示 energy/maxEnergy，能量條正確顯示
  const specialAttack = () => {
    if (player1.energy >= player1.maxEnergy) {
      clearTimeout(player1IdleStateRef.current); // <--- 建議也加上
      player1HitRegisteredRef.current = false; // <--- 新增這一行
      setPlayer1(prev => ({ 
        ...prev, 
        state: 'special',
        energy: 0
      }));
    }
  };

  const aiAction = () => {
    if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) return;
    const distance = Math.abs(player2.position.x - player1.position.x);
    const action = Math.random();

    if (distance > 120) {
      const direction = player2.position.x > player1.position.x ? 'left' : 'right';
      setPlayer2(prev => ({
        ...prev,
        // 【修正】使用與遊戲主循環一致的邊界邏輯
        position: {
          ...prev.position,
          x: direction === 'left' 
            ? Math.max(cameraXRef.current, prev.position.x - 35) 
            : Math.min(cameraXRef.current + GAME_WIDTH - CHARACTER_WIDTH, prev.position.x + 35) 
        },
        facing: direction,
        state: 'walk_forward'
      }));
    } else {
      if (action < 0.8) {
        setPlayer2(prev => ({ ...prev, state: 'attacking' }));
      } else {
        setPlayer2(prev => ({ ...prev, state: 'defending' }));
      }
    }
    
    // 【修改後】將 setTimeout 的 ID 存入 ref
    aiActionTimeoutRef.current = setTimeout(() => {
      if (gameState.gamePhase === 'level-battle') {
          setPlayer2(prev => (prev.health > 0 ? {...prev, state: 'idle'} : prev));
      }
    }, 400);
  };

  const addEffect = (type: 'hit' | 'defending', x: number, y: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    if (type === 'hit') {
      const newEffect: Effect = {
        id, type: 'hit-spark',
        x: x, // 直接使用傳入的精準碰撞點 X
        y: y, // 直接使用傳入的精準碰撞點 Y
        rotation: Math.random() * 360,
        size: 150 + Math.random() * 50, // 放大火花尺寸
      };
      setEffects(prev => [...prev, newEffect]);
      setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 400); // 延長動畫時間
    } else if (type === 'defending') {
      const newEffect: Effect = { id, type: 'block-shield', x: x + 80, y: y + 150, size: 150 };
      setEffects(prev => [...prev, newEffect]);
      setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 400);
    }
  };

  // 勝負提示 Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultText, setResultText] = useState('');
  const [resultType, setResultType] = useState<'win' | 'lose' | null>(null);

  // 當 showResultModal 開啟時自動暫停，關閉時恢復
  useEffect(() => {
    if (showResultModal) {
      setGameState(prev => ({ ...prev, isPaused: true }));
    } else {
      setGameState(prev => ({ ...prev, isPaused: false }));
    }
  }, [showResultModal]);

  // 在 handleBattleEnd 顯示提示
  const handleBattleEnd = () => {
    let result: 'win' | 'lose';
    let winner: 'player1' | 'player2' | 'draw';

    if (player1.health > player2.health) {
      winner = 'player1';
      result = 'win';
    } else if (player2.health > player1.health) {
      winner = 'player2';
      result = 'lose';
    } else {
      winner = 'draw';
      result = 'lose'; // 平手也算輸
    }
    
    // 【核心修正】立即更新 gamePhase 和 lastResult，以觸發對應的音樂
    setGameState(prev => ({ ...prev, gamePhase: 'round-over', lastResult: result }));

    // 【修正點】更新角色動畫邏輯
    if (winner === 'player1') {
      // 玩家勝利
      setPlayer1(prev => ({ ...prev, state: 'victory' }));
      setPlayer2(prev => ({ ...prev, state: 'dead' }));
    } else {
      // 玩家失敗 (包含 AI 勝利或平手)
      setPlayer1(prev => ({ ...prev, state: 'dead' }));
      setPlayer2(prev => ({ ...prev, state: 'victory' }));
    }
    
    // 只有在一方血量歸零時才觸發 K.O. 動畫
    if (player1.health <= 0 || player2.health <= 0) {
      setAnnouncementText('K.O.');
      playSfxWithDucking(sfxMap.announcerKO);
      setTimeout(() => setAnnouncementText(''), 1500); // 1.5秒後清除文字
    }

    // 延遲顯示結果視窗，等待 K.O. 動畫播完
    setTimeout(() => {
      setResultText(result === 'win' ? '勝利！進入下一關' : '失敗！再挑戰一次');
      setResultType(result);
      setShowResultModal(true);
    }, 2500); // 延長等待時間
  };
  // 新增這個 useEffect 來處理角色自動轉向
  useEffect(() => {
    // 根據 P1 和 P2 的相對位置來決定 P1 的朝向
    if (player1.position.x > player2.position.x && player1.facing === 'right') {
      setPlayer1(p => ({ ...p, facing: 'left' }));
    } else if (player1.position.x < player2.position.x && player1.facing === 'left') {
      setPlayer1(p => ({ ...p, facing: 'right' }));
    }

    // 根據 P1 和 P2 的相對位置來決定 P2 的朝向
    if (player2.position.x > player1.position.x && player2.facing === 'right') {
      setPlayer2(p => ({ ...p, facing: 'left' }));
    } else if (player2.position.x < player1.position.x && player2.facing === 'left') {
      setPlayer2(p => ({ ...p, facing: 'right' }));
    }
  }, [player1.position.x, player2.position.x]); // 當任一角色的X座標改變時觸發

  const handlePauseClick = () => {
    playSfxWithDucking(sfxMap.uiClick3);
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };
  const handleResumeClick = () => {
    playSfxWithDucking(sfxMap.uiClick3);
    setGameState(prev => ({ ...prev, isPaused: false }));
  };

  const handleModalButtonClick = () => {
    playSfxWithDucking(sfxMap.uiClick3);
    handleResultModalClose();
  };

  // 處理 Modal 按鈕
  const handleResultModalClose = () => {
    audioRef.current?.pause();
    setShowResultModal(false);

    if (resultType === 'win') {
      setWinStreak(s => s + 1);
      if (gameState.currentLevel === 3) {
        setGameState(prev => ({ ...prev, gamePhase: 'ending-animation' }));
      } else {
        // 勝利後，進入下一關的 VS 畫面
        setGameState(prev => ({
          ...prev,
          currentLevel: prev.currentLevel + 1,
          timeLeft: 60,
          gamePhase: 'vs-screen',
        }));
        resetPlayersForNewBattle();
      }
    } else {
      setWinStreak(0);
      // 【修正點】失敗後，重新進入本關的戰前動畫
      setGameState(prev => ({
        ...prev,
        timeLeft: 60,
        gamePhase: 'pre-battle-sequence',
      }));
      resetPlayersForNewBattle();
    }
  };

  const resetPlayersForNewBattle = () => {

    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, // 歸零
      position: { x: initialP1X, y: 0 },
      state: 'idle',
      hitBox: { x: 200, y: 300, width: 40, height: 60 },
      hurtBox: { x: 200, y: 300, width: 40, height: 60 }
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, 
      position: { x: initialP2X, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
  };

  // const startOpeningAnimation = () => {
  //   setGameState(prev => ({ ...prev, gamePhase: 'opening-animation' }));
  // };

  const [uploadLoading, setUploadLoading] = useState(false);
  const [showWaitingText, setShowWaitingText] = useState(false); // 【步驟一】在這裡新增 state

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    // 1. 清除舊的錯誤狀態
    setShowWaitingText(false);
    setUploadError(null);
  
    // 2. 立刻在畫面上顯示本地預覽
    const localUrl = URL.createObjectURL(file);
    setGameState(prev => ({ ...prev, playerPhoto: localUrl }));
  
    // 3. 延遲 1 秒後再正式啟動動畫與後台上傳
    setTimeout(async () => {
      // 啟動載入與故事動畫
      setUploadLoading(true);
      setIsStoryVideoPlaying(true);
      setIsVideoEnded(false);
      setIsPhotoReady(false);
  
      try {
        const formData = new FormData();
        formData.append('picture', file);
  
        // 請替換成你的上傳端點
        const response = await fetch('https://vibe-coding-upload-user-picture-18729033947.asia-east1.run.app', {
          method: 'POST',
          body: formData,
        });
  
        if (response.status === 202) {
          const data = await response.json();
          if (data.task_id) {
            // 儲存 task_id 並開始輪詢取正式照片
            setGameState(prev => ({ ...prev, taskId: data.task_id }));
            fetchUploadedPhoto(data.task_id);
          } else {
            throw new Error('伺服器沒有回傳 task_id');
          }
        } else {
          throw new Error('上傳失敗');
        }
      } catch (err: any) {
        // 上傳錯誤處理
        setUploadError(err.message || '未知錯誤');
        setUploadLoading(false);
        setIsStoryVideoPlaying(false);
        // 清除本地預覽
        setGameState(prev => ({ ...prev, playerPhoto: null }));
      }
    }, 1000);
  };
  // 取得上傳後的照片網址，成功才進入遊戲畫面，404 時自動重試
  const fetchUploadedPhoto = async (taskId: string) => {
  try {
    console.log('fetchUploadedPhoto', taskId);
    const response = await fetch(`https://vibe-coding-get-user-picture-18729033947.asia-east1.run.app?task_id=${encodeURIComponent(taskId)}`);
    if (response.status === 404) {
      console.log('404');
      // 404 時隔 2 秒重試
      setTimeout(() => fetchUploadedPhoto(taskId), 2000);
      return;
    }
    if (response.status === 200) {
      console.log('取得圖片成功');
      const finalUrl = `https://storage.googleapis.com/vibe_coding_bucket/results/${taskId}/1.png`;
      setGameState(prev => ({ ...prev, playerPhoto: finalUrl }));
      setUploadLoading(false);
      setIsPhotoReady(true);
    } else {
      throw new Error('伺服器處理圖片失敗');
    }
  } catch(e: any) {
      setUploadError(e.message || '無法獲取處理後的圖片');
      setUploadLoading(false);
      setIsStoryVideoPlaying(false); // 獲取失敗，也退回上傳介面
  }
};

  const startFirstLevel = () => {
    setGameState(prev => ({ 
      ...prev, 
      gamePhase: 'vs-screen',
      currentLevel: 1,
      timeLeft: 60,
      isPaused: false
    }));
    resetPlayersForNewBattle();
  };

  const resetGame = () => {
    setGameState({
      timeLeft: 60,
      currentLevel: 1,
      gamePhase: 'level-battle',
      isPaused: false,
      playerPhoto: null
    });
    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, // 歸零
      position: { x: initialP1X, y: 0 },
      state: 'idle',
      hitBox: { x: 200, y: 300, width: 40, height: 60 },
      hurtBox: { x: 200, y: 300, width: 40, height: 60 }
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, 
      position: { x: initialP2X, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
  };

  // 【步驟二】貼上最終的音效函式
  // 音效播放輔助函式 (BGM 自動閃避)
  const playSfxWithDucking = (sfxObject: { audio: HTMLAudioElement; independentVolume: number; } | undefined) => {
    if (!sfxObject) return;

    const { audio, independentVolume } = sfxObject;
    audio.volume = SFX_VOLUME * independentVolume; // 計算最終音量

    const bgm = audioRef.current;
    if (!bgm || bgm.paused) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error("SFX 播放失敗:", e));
      return;
    }

    const originalVolume = bgm.volume;
    bgm.volume = originalVolume * 0.8;
    audio.currentTime = 0;
    audio.play().catch(e => console.error("SFX 播放失敗:", e));

    const onSfxEnded = () => {
      let currentVolume = bgm.volume;
      const fadeInterval = setInterval(() => {
        currentVolume = Math.min(currentVolume + 0.05, originalVolume);
        bgm.volume = currentVolume;
        if (currentVolume >= originalVolume) {
          clearInterval(fadeInterval);
        }
      }, 80);
      audio.removeEventListener('ended', onSfxEnded);
    };
    audio.addEventListener('ended', onSfxEnded);
  };

  // 從角色狀態中提取基礎攻擊類型 (例如從 'jump_punch' 提取 'Punch')
  const getBaseAttackType = (state: Character['state']): 'Punch' | 'Kick' | 'Special' | null => {
    if (state.includes('punch')) return 'Punch';
    if (state.includes('kick')) return 'Kick';
    if (state.includes('special')) return 'Special';
    return null;
  };

  // 需要在 return 外部定義這些變數
  const victoryImageUrl = gameState.taskId 
    ? `https://storage.googleapis.com/vibe_coding_bucket/results/${gameState.taskId}/2.png`
    : '/statics/cover/cover_image.png';
  const currentLevelData = LEVELS[gameState.currentLevel - 1];
  const renderBoxes = (boxes: Box[], characterId: string, boxType: 'hit' | 'hurt') => {
    const borderColor = boxType === 'hit' ? 'red' : 'blue';
    return boxes.map((box, index) => {
      return (
        <div
          key={`${boxType}-box-${characterId}-${index}`}
          style={{
            position: 'absolute',
            left: `${box.x}px`,
            bottom: `${box.y}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
            // border: `2px solid ${borderColor}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      );
    });
  };

  const handleUploadClick = () => {
    playSfxWithDucking(sfxMap.uiClick2);
    fileInputRef.current?.click();
  };

  const handleRestartGame = () => {
    playSfxWithDucking(sfxMap.uiClick3);
    setGameState({
      timeLeft: 60,
      currentLevel: 1,
      gamePhase: 'cover',
      isPaused: false,
      playerPhoto: null,
      lastResult: null,
      taskId: undefined,
    });
  };

  // 將所有 return 合併為一個
  return (
    <>
      <GlobalStyles />
      <audio ref={audioRef} loop />

      {gameState.gamePhase === 'cover' && (
        // 最外層容器， overflow-hidden 是為了隱藏超出範圍的元素
        <div className="fixed inset-0 overflow-hidden">
          {/* 底層：滿版背景 + 毛玻璃 */}
          <div
            className="
            absolute inset-0 
            bg-cover bg-center 
            transform scale-105        /* 放大 5% 避免邊緣透出 */
            filter blur-lg              /* 改成 blur-lg（中等強度） */
          "
          style={{
            backgroundImage: `url('/statics/cover/cover_image.png')`
          }}
          />

          {/* 上層：完整不裁切 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src="/statics/cover/cover_image.png"
              alt="Cover"
              className="max-w-full max-h-full object-contain"
            />
          </div>
            {/* 底層：背景圖 + Ken Burns 效果 */}
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat animate-ken-burns" // 【修改後】
              style={{ backgroundImage: `url('/statics/cover/cover_image.png')` }} // <-- 請換成您的啟動頁圖片路徑
            />

            {/* 中層：掃光特效 */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                   style={{ animationDelay: '2s' }} // 延遲 2 秒開始
              />
            </div>

            {/* 頂層：漂浮粒子特效 */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-orange-400 rounded-full animate-float-up"
                  style={{
                    left: `${Math.random() * 100}%`,
                    bottom: `-${Math.random() * 20}%`, // 從螢幕外開始
                    animationDelay: `${Math.random() * 10}s`,
                    animationDuration: `${5 + Math.random() * 10}s`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>

            {/* UI 層：標題與提示文字 */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <p 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-white animate-pulse drop-shadow-md"
              >
                按任意鍵開始
              </p>
            </div>
        </div>
      )}
      {gameState.gamePhase === 'character-setup' && (
        <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/statics/cover/character_setup.png')" }}>
        {isStoryVideoPlaying || (isVideoEnded && !isPhotoReady) ? ( // 【修正點1】只要影片在播，或已播完且照片未就緒，就保持此畫面
          // --- 狀態二：正在播放/等待影片 ---
          <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
            <video
              ref={storyVideoRef}
              className="absolute inset-0 w-full h-full object-contain"
              onEnded={() => {
                // 【修正點2】影片結束時，只設定 isVideoEnded，畫面就會停在最後一幀
                setIsVideoEnded(true);
              }}
              onTimeUpdate={() => {
                // 【修正點3】監聽影片時間，在最後 5 秒時顯示文字
                if (storyVideoRef.current) {
                  const { currentTime, duration } = storyVideoRef.current;
                  if (duration > 5 && duration - currentTime <= 5) {
                    setShowWaitingText(true);
                  }
                }
              }}
            >
              <source src="/statics/videos/story.mp4" type="video/mp4" />
              您的瀏覽器不支援影片播放。
            </video>
            
            {/* 【修正點4】只有在 showWaitingText 為 true 時才顯示文字 */}
            {showWaitingText && (
              <div className="absolute bottom-[10vh] left-0 right-0 text-center z-10">
              <p className="text-[2.5vw] md:text-2xl text-white animate-pulse">
                {uploadLoading
                  ? "英雄正在生成… (圖片處理中)"
                  : !isPhotoReady
                    ? "英雄即將生成，準備進入戰場"
                    : "英雄已生成，準備進入戰鬥…"
                }
              </p>
            </div>
            )}
          </div>
        ) : (
            // --- 狀態一：上傳介面 / 等待介面 / 錯誤介面 ---
        
            <div
                // 使用絕對定位將選單框精準定位在畫面的右側區域
              className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-1/2"
              >
                {/* 選單框 (使用背景圖實現，並作為內部元素的定位基準) */}
                <div 
                  className="relative w-[500px] h-[700px] bg-contain bg-no-repeat bg-center"
                  style={{ backgroundImage: `url('/statics/cover/ui_frame.png')` }}
                >
    
                <h2 className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-white drop-shadow-lg">
                  英雄登入
                </h2>
    
                {/* 頭像預覽區 */}
                <div 
                  // 【修改後】我們保留了絕對定位，但移除了所有裝飾性 class
                  className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center overflow-hidden"
                >
                  {gameState.playerPhoto ? (
                    // 當有照片時，直接顯示圖片
                    <img 
                      src={gameState.playerPhoto} 
                      alt="Avatar Preview" 
                      className="w-full h-full object-cover" // object-cover 確保圖片填滿容器且不變形
                    />
                  ) : (
                    // 沒有照片時，顯示一個中性的上傳圖示
                    <Upload size={48} className="text-gray-500" />
                  )}
                </div>
              </div>
    
              {/* 隱藏的檔案輸入框 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
    
              {/* 按鈕與提示文字的容器 (相對於選單框絕對定位) */}
              <div
                  className="absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-20 text-center"
                >
                {uploadError ? (
                  <div>
                    <p className='text-red-400 mb-4'>上傳失敗：{uploadError}</p>
                    <Button onClick={() => {
                      setUploadError(null);
                      setGameState(prev => ({...prev, playerPhoto: null}));
                    }} variant="destructive">
                      再試一次
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleUploadClick}
                    disabled={uploadLoading}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white text-lg px-8 py-4 w-full shadow-lg"
                  >
                    {uploadLoading ? "處理中..." : "請上傳大頭照"}
                  </Button>
                )}
                
                {/* 如果影片已播完，但照片還在處理，顯示等待提示 */}
                {isVideoEnded && !isPhotoReady && !uploadError && (
                  <div className="mt-4">
                    <p className="animate-pulse text-cyan-300">等待照片處理完成...</p>
                </div>
              )}
            </div>
        </div>
    )}
    </div>
  )}
  {gameState.gamePhase === 'vs-screen' && (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* 底層：滿版背景 + 毛玻璃 */}
      <div
        className="absolute inset-0 bg-cover bg-center transform scale-105 filter blur-lg"
        style={{ backgroundImage: `url('/statics/VsScreen/VsScreen_${gameState.currentLevel}.png')` }}
      />
      {/* 上層：正常不裁切 */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <img
          src={`/statics/VsScreen/VsScreen_${gameState.currentLevel}.png`}
          alt={`Versus Stage ${gameState.currentLevel}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      {/* 掃光特效 */}
      <div className="absolute inset-0 overflow-hidden z-20">
       <div className="absolute w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>
    </div>
)}
  {gameState.gamePhase === 'ending-animation' && (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* 底層：滿版背景 + 毛玻璃 */}
      <div
        className="absolute inset-0 bg-cover bg-center transform scale-105 filter blur-lg"
        style={{ backgroundImage: `url('${victoryImageUrl}')` }}
      />
      {/* 上層：正常不裁切 */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <img
          src={victoryImageUrl}
          alt="Victory"
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* 漂浮粒子特效 */}
      <div className="absolute inset-0 pointer-events-none z-20">
          {[...Array(30)].map((_, i) => (
              <div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full animate-float-up"
                  style={{
                      left: `${Math.random() * 100}%`,
                      bottom: `-${Math.random() * 20}%`,
                      animationDelay: `${Math.random() * 15}s`,
                      animationDuration: `${8 + Math.random() * 12}s`,
                      opacity: 0,
                  }}
              />
          ))}
      </div>

      {/* 內容疊加層 */}
      <div className="absolute top-1/2 left-0 transform -translate-y-1/2 z-30 p-12 w-full md:w-1/2 lg:w-1/3 bg-gradient-to-r from-black/90 via-black/70 to-transparent">
          <div className="text-left text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 text-yellow-300 drop-shadow-lg animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  光明重新照耀城市
              </h1>
              <p className="text-xl md:text-2xl mb-8 drop-shadow animate-fade-in" style={{ animationDelay: '1s' }}>
                  你成功擊敗了所有邪惡的敵人，讓這座城市再次恢復和平
              </p>
              <Button
                  onClick={handleRestartGame}
                  className="text-xl px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 animate-fade-in"
                  style={{ animationDelay: '1.5s' }}
              >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  重新開始遊戲
              </Button>
          </div>
      </div>
    </div>
)}
  {['level-battle', 'round-over', 'pre-battle-sequence'].includes(gameState.gamePhase) && (
    <div className="w-screen h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* 2. 內層的遊戲畫布 (縮放用) */}
      <div 
      className="relative overflow-hidden"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${GAME_WIDTH}px`,
          height: `${GAME_HEIGHT}px`,
          transform: `translate(-50%, -50%) scale(${gameScale})`,
          transformOrigin: 'center center',
          background: currentLevelData?.bg || 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #1a1a1a 100%)', // 【修正】CSS 拼寫錯誤
        }}
      >
        {/* 3. 格鬥遊戲舞台 */}
        <div 
          className="absolute" // 不再需要 inset-0 和 overflow-hidden
          style={{
            width: `${FIGHTING_STAGE_CONSTANTS.backgroundWidth}px`, 
            height: `${FIGHTING_STAGE_CONSTANTS.backgroundHeight}px`,
            left: `-${cameraX}px`,
            top: 0,
          }}
        >
        {/* 4. 舞台背景 */}
        <div 
            className="absolute"
            style={{
              backgroundImage: `url(${currentLevelData.bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              backgroundRepeat: 'no-repeat',
              width: `${FIGHTING_STAGE_CONSTANTS.backgroundWidth}px`,
              height: `${FIGHTING_STAGE_CONSTANTS.backgroundHeight}px`,
              left: 0,
              top: `${Math.max(0, GAME_HEIGHT - FIGHTING_STAGE_CONSTANTS.backgroundHeight)}px`
            }}
          />
        {/* 5. 角色容器 */}
        <div className="absolute inset-0">
          {/* Player 1 */}
        <div 
          className={`absolute ${player1.state === 'special' ? 'animate-pulse' : ''}`}
            style={{ 
              left: player1.position.x, 
              bottom: `${player1.position.y}px`,
              width: CHARACTER_WIDTH,
              height: CHARACTER_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <AnimationPlayer
              source={getAnimationSource(player1.state)}
              facing={player1.facing}
              state={player1.state}
              setPlayer={setPlayer1}
              width={CHARACTER_WIDTH}
              height={CHARACTER_HEIGHT}
              isPlayer1={true}
              onFrameChange={setPlayer1CurrentFrame}
              onComplete={handleP1AnimationComplete}
            />
        </div>
        {/* Player 2 (AI) */}
        <div 
          className={`absolute ${player2.state === 'special' ? 'animate-pulse' : ''}`}
            style={{ 
              left: player2.position.x, 
              bottom: `${player2.position.y}px`,
              width: CHARACTER_WIDTH,
              height: CHARACTER_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <AnimationPlayer
              source={getEnemyAnimationSource(player2.state, gameState.currentLevel)}
              facing={player2.facing}
              state={player2.state}
              width={CHARACTER_WIDTH}
              height={CHARACTER_HEIGHT}
              isPlayer1={false}
              onFrameChange={setPlayer2CurrentFrame}
              setPlayer={setPlayer2}
              onComplete={handleP2AnimationComplete}
            />
          </div>
        {/* Debug hit/hurt boxes */}
          {renderBoxes(getHurtBox(player1, player1CurrentFrame, player1CollisionData), 'player1', 'hurt')}
          {renderBoxes(getAttackHitBox(player1, player1CurrentFrame, player1CollisionData), 'player1', 'hit')}
          {renderBoxes(getHurtBox(player2, player2CurrentFrame, player2CollisionData), 'player2', 'hurt')}
          {renderBoxes(getAttackHitBox(player2, player2CurrentFrame, player2CollisionData), 'player2', 'hit')}

        {/* Effects */}
        {effects.map((effect) => {
          if (effect.type === 'hit-spark' && effect.size) {
            return (
              <div
                key={effect.id}
                className="absolute pointer-events-none z-50"
                style={{ 
                  left: effect.x - effect.size / 2, // 將特效中心對準碰撞點
                  bottom: effect.y - effect.size / 2,
                  width: effect.size,
                  height: effect.size,
                }}
              >
                {/* 新的不規則爆炸星形 SVG */}
                <svg viewBox="0 0 100 100" className="animate-hit-spark" style={{ transform: `rotate(${effect.rotation}deg)` }}>
                  <path d="M50 0 L50 100" />
                  <path d="M0 50 L100 50" />
                  <path d="M15 15 L85 85" />
                  <path d="M15 85 L85 15" />
                </svg>
              </div>
            );
          }
          if (effect.type === 'block-shield' && effect.size) {
            return (
              <div
                key={effect.id}
                className="absolute pointer-events-none z-50 animate-block-shield"
                style={{ 
                  left: effect.x, 
                  bottom: effect.y,
                  width: effect.size,
                  height: effect.size,
                }}
              />
            );
          }
          return null;
        })}
          </div>
        </div>
        {/* Level Battle UI */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4">
         <div className="flex justify-between items-start mb-4">
        {/* 左側資訊 & 暫停按鈕 */}
          <div className="w-1/3 flex items-center space-x-4">
      <Button
        onClick={handlePauseClick} // 綁定音效函式
        variant="outline"
        size="sm"
        className="bg-black/50 text-white hover:bg-white/20 hover:text-white"
      >
        {gameState.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </Button>
      <div className="text-white font-bold">
        <div>{currentLevelData?.name}</div>
        <div>第 {gameState.currentLevel} 關</div>
      </div>
     </div>
    </div>
          {/* Health bars */}
<div className="flex justify-between items-center mb-2">
  {/* 玩家血條與頭像 */}
  <div className="w-2/5 flex items-center space-x-4">
    <div className="w-28 h-28 flex-shrink-0">
      {gameState.playerPhoto ? (
        <img src={gameState.playerPhoto} alt="玩家" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white text-3xl">😊</div>
      )}
    </div>
    <div className="flex-1">
      <div className="text-white font-bold mb-1">玩家</div>
      <StatusBar
        type="health"
        currentValue={player1.health}
        displayValue={player1.displayHealth}
        maxValue={player1.maxHealth}
        isPlayer1={true}
      />
      <StatusBar
        type="energy"
        currentValue={player1.energy}
        maxValue={player1.maxEnergy}
        isPlayer1={true}
      />
    </div>
  </div>
  
  {/* 倒數計時器 */}
  <div className="flex-1 flex items-center justify-center">
    <div className="text-5xl font-extrabold text-white bg-black/70 px-6 py-1 rounded-lg shadow border-2 border-yellow-400">
      {gameState.timeLeft}
    </div>
  </div>

  {/* AI血條與頭像 */}
  <div className="w-2/5 flex items-center space-x-4 justify-end">
    <div className="flex-1 text-right">
      <div className="text-white font-bold mb-1">AI</div>
      <StatusBar
        type="health"
        currentValue={player2.health}
        displayValue={player2.displayHealth}
        maxValue={player2.maxHealth}
        isPlayer1={false}
      />
      <StatusBar
        type="energy"
        currentValue={player2.energy}
        maxValue={player2.maxEnergy}
        isPlayer1={false}
      />
    </div>
    <div className="w-28 h-28 flex-shrink-0 ml-2">
      <img
        src={`/statics/Avatars/Avatar_Enemy0${gameState.currentLevel}.png`}
        alt="AI"
        className="w-full h-full object-contain"
      />
    </div>
  </div>
</div>
        </div>

             {/* Controls */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
          <div className="bg-black/80 rounded-lg px-6 py-2 flex flex-wrap gap-4 text-white text-base font-semibold shadow-lg">
            <span>A：向左</span>
            <span>D：向右</span>
            <span>W：跳躍</span>
            <span>S：蹲下</span>
            <span>J：拳</span>
            <span>K：腳</span>
            <span>L：必殺技</span>
          </div>
        </div>

      {/* 戰前動畫文字 (疊加在最上層) */}
      {announcementText && (
        <div className="absolute inset-0 flex justify-center items-center z-50 pointer-events-none">
          <p 
            key={announcementText} // 使用 key 來觸發 React 的重新渲染，從而重置動畫
            className={`text-9xl font-bold animate-pop-in-out ${
              announcementText === 'K.O.' ? 'text-red-600' : 'text-white'
            }`}
            style={{
              fontFamily: "'Press Start 2P', cursive",
              textShadow: '6px 6px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
            }}
          >
            {announcementText}
          </p>
        </div>
      )}

        {gameState.isPaused && gameState.gamePhase === 'level-battle' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <Card className="p-8 text-center bg-black/80 border-white">
              <h2 className="text-4xl font-bold text-white mb-4">遊戲暫停</h2>
              <Button 
                onClick={handleResumeClick}
                className="text-xl px-6 py-3"
              >
                繼續遊戲
              </Button>
            </Card>
          </div>
        )}
       {showResultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-0">
            <div className="bg-white rounded-lg shadow-lg p-10 text-center">
              <h2 className="text-4xl font-bold mb-6 text-gray-900">{resultText}</h2>
              <button
                className="px-8 py-3 bg-blue-600 text-white rounded-lg text-2xl font-bold hover:bg-blue-700 transition"
                onClick={handleModalButtonClick} // 綁定音效函式
              >
                {resultType === 'win' ? (gameState.currentLevel === 3 ? '觀看結局' : '下一關') : '再挑戰'}
              </button>
            </div>
          </div>
        )}
    </div>
  </div>
  )}
  </>
);
};

export default FightingGame;