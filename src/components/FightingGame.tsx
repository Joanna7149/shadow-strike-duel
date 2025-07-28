import React, { useState, useEffect, useRef } from 'react';
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
const MOVE_SPEED = 5;
const DASH_SPEED = 20;
//const JUMP_HEIGHT = 200;
//const JUMP_DURATION = 800; // 毫秒

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
    defend: {
      type: 'png' as const,
      path: 'defend',
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
    
  //   // 對於 PNG 模式，根據狀態返回對應的配置
  //   const pngConfig = ANIMATION_CONFIGS.png[state as keyof typeof ANIMATION_CONFIGS.png];
  //   if (pngConfig) {
  //     return pngConfig;
  //   }
  //   // 如果找不到對應的狀態，返回 idle
  //   return ANIMATION_CONFIGS.png.idle;
  // }
}

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
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  position: { x: number; y: number };
  velocityY: number; // 【新增】垂直速度，用於物理跳躍
  isGrounded: boolean; // 【新增】是否在地面上
  facing: 'left' | 'right';
  state: 'idle' | 'walk' | 'attacking' | 'defending' | 'crouching' | 'hit' | 'special' | 'victory' | 'death' | 'jump' | 'kick' | 'punch' | 'crouch' | 'crouch_punch' | 'crouch_kick' | 'jump_punch' | 'jump_kick' | 'walk' | 'special_attack' | 'win_round' | 'dead' | 'walk_forward' | 'walk_backward' | 'landing' | 'pre_jump';
  hitBox: { x: number; y: number; width: number; height: number };
  hurtBox: { x: number; y: number; width: number; height: number };
}

interface GameState {
  timeLeft: number;
  currentLevel: number;
  gamePhase: 'cover' | 'opening-animation' | 'character-setup' | 'level-battle' | 'round-over' | 'ending-animation' | 'game-complete';
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


const LEVELS = [
  { 
    id: 1, 
    name: '第一關: 燃燒倉庫 火爆拳', 
    boss: '火爆拳',
    bg: 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #1a1a1a 100%)',
    description: '在燃燒的倉庫中，你遇到了火爆拳...',
    bgImage: '/statics/backgrounds/Stage1/stage1.png'
  },
  { 
    id: 2, 
    name: '第二關: 廢棄月台 蛇鞭女', 
    boss: '蛇鞭女',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
    description: '廢棄的月台上，蛇鞭女正等著你...',
    bgImage: '/statics/backgrounds/Stage2/stage2.png'
  },
  { 
    id: 3, 
    name: '第三關: 虛空之塔 心控王', 
    boss: '心控王',
    bg: 'linear-gradient(135deg, #0d0d0d 0%, #2d1b69 50%, #000000 100%)',
    description: '最終戰！虛空之塔的心控王現身...',
    bgImage: '/statics/backgrounds/Stage3/stage3.png'
  }
];

const OPENING_SCENES = [
  '夜晚的城市被黑暗籠罩...',
  '罪惡在街頭蔓延...',
  '只有一位英雄能拯救這座城市...',
  '你就是那位英雄！'
];

// isFacingOpponent 判斷
function isFacingOpponent(p1: Character, p2: Character) {
  return (
    (p1.facing === 'right' && p1.position.x < p2.position.x) ||
    (p1.facing === 'left' && p1.position.x > p2.position.x)
  );
}

const FightingGame: React.FC = () => {
  // 【新增】預先計算角色和攝影機的理想初始位置
  const initialP1X = (FIGHTING_STAGE_CONSTANTS.backgroundWidth / 2) - 400;
  const initialP2X = (FIGHTING_STAGE_CONSTANTS.backgroundWidth / 2) + 400;
  const initialMidpoint = (initialP1X + initialP2X) / 2;
  const initialCameraX = initialMidpoint - (GAME_WIDTH / 2);

  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 60,
    currentLevel: 1,
    gamePhase: 'level-battle',
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

  const [openingStep, setOpeningStep] = useState(0);
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
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    // 初始位置設為舞台右側，y=0 表示在地面
    position: { x: initialP2X, y: 0 },
    velocityY: 0, // 【新增】
    isGrounded: true, // 【新增】
    facing: 'left',
    state: 'idle',
    hitBox: { x: 600, y: 300, width: 40, height: 60 },
    hurtBox: { x: 600, y: 300, width: 40, height: 60 }
  });

  const [effects, setEffects] = useState<Array<{id: string, type: string, x: number, y: number}>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null); // 【新增】儲存 requestAnimationFrame 的 ID
  const pressedKeysRef = useRef<Set<string>>(new Set()); // 【新增】用來在主循環中讀取最新的按鍵狀態
  const keyBufferRef = useRef<Array<{ key: string; time: number }>>([]);
  const player1IdleStateRef = useRef(null);
  const player1HitRegisteredRef = useRef(false);
  const player2HitRegisteredRef = useRef(false);
  const aiActionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // <-- 【新增】這個 Ref
    // 3. 幀追蹤狀態
  const [player1CurrentFrame, setPlayer1CurrentFrame] = useState(1);
  const [player2CurrentFrame, setPlayer2CurrentFrame] = useState(1);
  const player1Ref = useRef(player1);
  const player2Ref = useRef(player2);
  const p1FrameRef = useRef(player1CurrentFrame);
  const p2FrameRef = useRef(player2CurrentFrame);

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

  // Opening animation effect
  useEffect(() => {
    if (gameState.gamePhase === 'opening-animation') {
      const interval = setInterval(() => {
        setOpeningStep(prev => {
          if (prev < OPENING_SCENES.length - 1) {
            return prev + 1;
          } else {
            setGameState(current => ({ ...current, gamePhase: 'character-setup' }));
            return prev;
          }
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [gameState.gamePhase]);

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
    if (gameState.timeLeft === 0 || player1.health <= 0 || player2.health <= 0) {
      handleBattleEnd();
    }
  }, [gameState.timeLeft, player1.health, player2.health]);

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
      if (gameState.gamePhase === 'cover') {
        startOpeningAnimation();
      }
    };

    if (gameState.gamePhase === 'cover') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
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
  // Battle controls
  // handleKeyDown 現在只處理「按下那一下」就觸發的動作，例如攻擊、跳躍
// 【修改後】handleKeyDown 只負責「記錄」按鍵按下
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
        const uninterruptibleStates = ['hit', 'dead', 'victory', 'special_attack', 'punch', 'kick', 'crouch_punch', 'crouch_kick', 'jump_punch', 'jump_kick', 'pre_jump', 'landing'];
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
      if ((pressedKeysRef.current.has('a') || pressedKeysRef.current.has('d')) && !['crouch', 'punch', 'kick', 'special_attack', 'crouch_punch', 'crouch_kick', 'hit'].includes(nextState)) {
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

// --- AI 狀態更新 (將 aiAction 邏輯整合進來) ---
    setPlayer2(prev => {
      // AI 也需要遵守不可中斷的規則
      const uninterruptibleStates = ['hit', 'dead', 'victory', 'special_attack', 'punch', 'kick'];
      if (uninterruptibleStates.includes(prev.state)) {
        return prev;
      }
      const p1 = player1Ref.current;
      const distance = Math.abs(prev.position.x - p1.position.x);
      let nextState = prev.state;
      let nextX = prev.position.x;

      // 簡易的 AI 決策
      if (distance > 150) { // 距離太遠，靠近
        nextState = 'walk_forward';
      } else {
        // 【修改點】當 AI 決定攻擊時，重置它的命中旗幟
        if (Math.random() < 0.8) {
          nextState = 'punch';
          player2HitRegisteredRef.current = false; // <-- 在這裡重置
        } else {
          nextState = 'defending';
        }
      }
      
      // AI 移動邏輯
      if (nextState === 'walk_forward') {
        const direction = prev.position.x > p1.position.x ? 'left' : 'right';
        nextX = prev.position.x + (direction === 'left' ? -MOVE_SPEED : MOVE_SPEED);
      }
      
      // 【關鍵修正】讓 AI 也遵守攝影機邊界
      const minX = cameraXRef.current;
      const maxX = cameraXRef.current + GAME_WIDTH - CHARACTER_WIDTH;
      nextX = Math.max(minX, Math.min(maxX, nextX));

      return {
        ...prev,
        position: { ...prev.position, x: nextX },
        state: nextState
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
  
  if (
    gameState.gamePhase === 'level-battle' &&
    !gameState.isPaused &&
    isPlayer1Attacking &&
    !player1HitRegisteredRef.current &&
    player1CollisionData &&
    player2CollisionData
  ) {
    const p1HitBoxes = getAttackHitBox(p1, p1Frame, player1CollisionData);
    const p2HurtBoxes = getHurtBox(p2, p2Frame, player2CollisionData);

    if (p1HitBoxes.length > 0 && p2HurtBoxes.length > 0) {
      const collisionDetected = p1HitBoxes.some(hitBox =>
        p2HurtBoxes.some(hurtBox =>
          isFacingOpponent(p1, p2) && isCollision(hitBox, hurtBox)
        )
      );

      if (collisionDetected) { 
        player1HitRegisteredRef.current = true;
        console.log("Collision detected!");
        
        setPlayer2(prev => ({ 
          ...prev, 
          health: Math.max(0, prev.health - 10),
          state: 'hit'
        }));
        setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
        // 使用您版本中更精確的特效位置
        addEffect('hit', p2.position.x + (CHARACTER_WIDTH / 2), p2.position.y + (CHARACTER_HEIGHT / 2));

        setTimeout(() => {
          setPlayer2(prev => (prev.health > 0 ? { ...prev, state: 'idle' } : prev));
        }, 500);
      }
    }
  }
}, [player1CurrentFrame, player2CurrentFrame]); // 觸發器是動畫幀數的改變

useEffect(() => {
  // 從 Ref 讀取最新的角色和幀數資料
  const p1 = player1Ref.current;
  const p2 = player2Ref.current;
  const p1Frame = p1FrameRef.current;
  const p2Frame = p2FrameRef.current;

  // 檢查 AI 是否處於攻擊狀態
  const isPlayer2Attacking = ['punch', 'kick', 'jump_punch', 'jump_kick', 'special_attack', 'crouch_punch', 'crouch_kick', 'attacking'].includes(p2.state);
  
  if (
    gameState.gamePhase === 'level-battle' &&
    !gameState.isPaused &&
    isPlayer2Attacking &&
    !player2HitRegisteredRef.current && // 【修改後】增加對旗幟的判斷
    player1CollisionData &&
    player2CollisionData
  ) {
    const p2HitBoxes = getAttackHitBox(p2, p2Frame, player2CollisionData);
    const p1HurtBoxes = getHurtBox(p1, p1Frame, player1CollisionData);

    if (p2HitBoxes.length > 0 && p1HurtBoxes.length > 0) {
      const collisionDetected = p2HitBoxes.some(hitBox =>
        p1HurtBoxes.some(hurtBox =>
          isFacingOpponent(p2, p1) && isCollision(hitBox, hurtBox)
        )
      );

      if (collisionDetected) { 
        player2HitRegisteredRef.current = true; // 【修改後】命中後，立刻將旗幟設為 true
        // 這裡我們不需要 hit ref，因為 AI 的攻擊判定通常比較簡單
        console.log("AI Collision detected!");
        
        // 玩家被命中
        setPlayer1(prev => ({ 
          ...prev, 
          health: Math.max(0, prev.health - 10),
          state: 'hit'
        }));
        addEffect('hit', p1.position.x, p1.position.y);

        // 玩家被擊中後，在短時間內回到 idle
        setTimeout(() => {
          setPlayer1(prev => (prev.health > 0 ? { ...prev, state: 'idle' } : prev));
        }, 500);
      }
    }
  }
// 觸發器：同樣由動畫幀數改變時觸發
}, [player1CurrentFrame, player2CurrentFrame]);

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

  // Dash (前衝/後衝)
  const dashPlayer = (direction: 'left' | 'right') => {
    setPlayer1(prev => {
    const minX = 0;
    // 【修改後】邊界應該是整個大舞台
    const maxX = FIGHTING_STAGE_CONSTANTS.backgroundWidth - CHARACTER_WIDTH;
    let newX = prev.position.x + (direction === 'left' ? -100 : 100);
    newX = Math.max(minX, Math.min(maxX, newX));
      
      addEffect('dash', newX, prev.position.y);
      return {
        ...prev,
        position: {
          ...prev.position,
          x: newX
        },
        facing: direction,
        state: 'walk'
      };
    });
    player1IdleStateRef.current = setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 200);
  };

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
        position: { ...prev.position, x: direction === 'left' ? Math.max(50, prev.position.x - 35) : Math.min(window.innerWidth - CHARACTER_WIDTH, prev.position.x + 35) },
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

  const addEffect = (type: string, x: number, y: number) => {
    const effectId = Math.random().toString(36).substr(2, 9);
    setEffects(prev => [...prev, { id: effectId, type, x, y }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effectId));
    }, 1000);
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
    // 【新增】立即改變遊戲階段，凍結所有動作
    setGameState(prev => ({ ...prev, gamePhase: 'round-over' }));
    let winner = '';
    if (player1.health > player2.health) {
      winner = 'player1';
    } else {
      winner = 'player2';
    }

    setPlayer1(prev => ({ ...prev, state: winner === 'player1' ? 'victory' : 'dead' }));
    setPlayer2(prev => ({ ...prev, state: winner === 'player2' ? 'victory' : 'dead' }));
    addEffect('ko', 400, 200);

    setTimeout(() => {
      if (winner === 'player1') {
        setResultText('勝利！進入下一關');
        setResultType('win');
        setShowResultModal(true);
      } else {
        setResultText('失敗！再挑戰一次');
        setResultType('lose');
        setShowResultModal(true);
      }
    }, 800);
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

  // 處理 Modal 按鈕
  const handleResultModalClose = () => {
    setShowResultModal(false);
    if (resultType === 'win') {
      // 【修改後】只判斷關卡數是否為 3
      if (gameState.currentLevel === 3) {
        setGameState(prev => ({ ...prev, gamePhase: 'ending-animation', lastResult: 'win', isPaused: false }));
      } else {
        setGameState(prev => ({
          ...prev,
          currentLevel: prev.currentLevel + 1,
          timeLeft: 60,
          gamePhase: 'level-battle',
          lastResult: 'win',
          isPaused: false
        }));
        resetPlayersForNewBattle();
      }
    } else {
      setGameState(prev => ({
        ...prev,
        timeLeft: 60,
        gamePhase: 'level-battle',
        lastResult: 'lose'
      }));
      resetPlayersForNewBattle();
    }
  };

  const resetPlayersForNewBattle = () => {

    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, // 歸零
      osition: { x: initialP1X, y: 0 },
      state: 'idle',
      hitBox: { x: 200, y: 300, width: 40, height: 60 },
      hurtBox: { x: 200, y: 300, width: 40, height: 60 }
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: initialP2X, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
  };

  const startOpeningAnimation = () => {
    setGameState(prev => ({ ...prev, gamePhase: 'opening-animation' }));
  };

  const [uploadLoading, setUploadLoading] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('picture', file); // key 為 picture
      try {
        const response = await fetch('https://vibe-coding-upload-user-picture-18729033947.asia-east1.run.app', {
          method: 'POST',
          body: formData
        });
        if (response.status === 202) {
          const data = await response.json();
          if (data.task_id) {
            // 先將本地圖片 URL 存入 playerPhoto
            const localUrl = URL.createObjectURL(file);
            setGameState(prev => ({ ...prev, playerPhoto: localUrl, taskId: data.task_id }));
            console.log('照片上傳成功，task_id: ' + data.task_id);
            // 呼叫 fetchUploadedPhoto 取得正式照片，成功才進入遊戲
            fetchUploadedPhoto(data.task_id);
          }
        } else if (response.ok) {
          const data = await response.json();
          setGameState(prev => ({ ...prev, playerPhoto: data.url }));
          // 若直接拿到 url 也呼叫 fetchUploadedPhoto 以確保流程一致
          if (data.task_id) fetchUploadedPhoto(data.task_id);
        } else {
          throw new Error('上傳失敗');
        }
      } catch (e) {
        alert('照片上傳失敗，請重試');
        setUploadLoading(false);
      }
    }
  };

  // 取得上傳後的照片網址，成功才進入遊戲畫面，404 時自動重試
  const fetchUploadedPhoto = async (taskId: string) => {
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
      setGameState(prev => ({ ...prev, playerPhoto: `https://storage.googleapis.com/vibe_coding_bucket/results/${taskId}/1.png`}));
      setUploadLoading(false);
    }
  };

  const startFirstLevel = () => {
    setGameState(prev => ({ 
      ...prev, 
      gamePhase: 'level-battle',
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
      energy: 100, 
      position: { x: initialP2X, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
  };

  // 角色圖片 import
  // 1. Cover Screen
  if (gameState.gamePhase === 'cover') {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center cursor-pointer animate-pulse"
        style={{ 
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #16213e 70%, #0f0f23 100%)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
        onClick={startOpeningAnimation}
      >
        {/* City skyline silhouette */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-gray-900 to-transparent opacity-90">
          <div className="absolute bottom-0 w-full h-32 bg-black opacity-60"></div>
        </div>
        
        {/* Hero silhouette */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <div className="w-32 h-40 bg-gradient-to-b from-gray-800 to-black rounded-t-full opacity-80 relative">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gray-700 rounded-full"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-20 bg-red-900 opacity-70 rounded-b-lg"></div>
          </div>
        </div>

        <div className="text-center z-10">
          <h1 className="text-7xl font-bold mb-8 bg-gradient-to-r from-red-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent animate-pulse">
            SHADOW STRIKE DUEL
          </h1>
          <p className="text-3xl text-white mb-12 animate-bounce">點擊任意鍵開始</p>
          <div className="text-lg text-gray-300">城市需要英雄...</div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // 2. Opening Animation
  if (gameState.gamePhase === 'opening-animation') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <div className="text-center z-10">
          <div className="text-4xl text-white mb-8 animate-fade-in">
            {OPENING_SCENES[openingStep]}
          </div>
          <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-yellow-500 rounded-full transition-all duration-300"
              style={{ width: `${((openingStep + 1) / OPENING_SCENES.length) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Cinematic bars */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-black z-20"></div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-black z-20"></div>
      </div>
    );
  }

  // 3. Character Setup
  if (gameState.gamePhase === 'character-setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <Card className="p-8 bg-black/70 backdrop-blur border-blue-500 max-w-md w-full">
          <h2 className="text-4xl font-bold mb-6 text-center text-white">角色設定</h2>
          
          <div className="text-center mb-6">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-b from-gray-600 to-gray-800 border-4 border-blue-500 relative overflow-hidden">
              {gameState.playerPhoto ? (
                <img src={gameState.playerPhoto} alt="Player" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Upload size={40} />
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 bg-blue-600 hover:bg-blue-700"
              disabled={uploadLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadLoading ? "上傳照片中" : "上傳大頭照"}
            </Button>
            
            <p className="text-sm text-gray-300 mb-6">
              上傳你的照片，成為城市的英雄！
            </p>
          </div>

          {gameState.playerPhoto && (
            <div className="text-center">
              <Button
                onClick={startFirstLevel}
                className="text-xl px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                disabled={uploadLoading}
              >
              {uploadLoading ? "上傳照片中" : "開始冒險"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 6. Ending Animation
  if (gameState.gamePhase === 'ending-animation') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 relative overflow-hidden">
        <div className="text-center z-10 animate-fade-in">
          <h1 className="text-6xl font-bold mb-8 text-white drop-shadow-lg">
            {gameState.lastResult === 'win' ? '城市拯救成功！' : '遊戲結束'}
          </h1>
          <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-gradient-to-b from-yellow-400 to-orange-500 border-8 border-white relative overflow-hidden animate-scale-in">
            {gameState.playerPhoto ? (
              <img src={gameState.playerPhoto} alt="Hero" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-6xl">😊</div>
            )}
          </div>
          <p className="text-2xl text-white mb-8 drop-shadow">
            {gameState.lastResult === 'win' ? '光明重新照耀這座城市' : '雖然失敗了，但你的勇氣值得敬佩。'}
          </p>
          
          <Button
            onClick={() => setGameState(prev => ({ ...prev, gamePhase: 'game-complete' }))}
            className="text-xl px-8 py-4 bg-white text-orange-600 hover:bg-gray-100"
          >
            繼續
          </Button>
        </div>

        {/* Light rays */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 bg-gradient-to-t from-transparent via-yellow-300 to-transparent opacity-60 animate-pulse"
            style={{
              height: '120vh',
              left: `${(i * 8.33)}%`,
              transform: `rotate(${i * 30}deg)`,
              transformOrigin: 'center center',
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
    );
  }

  // 7. Game Complete
  if (gameState.gamePhase === 'game-complete') {
    const isVictory = gameState.currentLevel > 3 || gameState.lastResult === 'win';
    return (
      <div className={`min-h-screen flex items-center justify-center ${isVictory ? 'bg-gradient-to-br from-green-400 via-blue-500 to-purple-600' : 'bg-gradient-to-br from-gray-800 via-red-900 to-black'}`}>
        <Card className="p-8 text-center bg-black/70 backdrop-blur border-white/30 max-w-lg">
          <h1 className={`text-6xl font-bold mb-4 ${isVictory ? 'text-yellow-400' : 'text-red-400'}`}>
            {isVictory ? '你拯救了城市！' : '遊戲結束'}
          </h1>
          
          <p className="text-2xl text-white mb-8">
            {isVictory 
              ? '你成功擊敗了所有的敵人，城市再次恢復和平。' 
              : '雖然失敗了，但你的勇氣值得敬佩。'}
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={resetGame}
              className="w-full text-xl px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              重新開始遊戲
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 6. Level Battle
  const currentLevelData = LEVELS[gameState.currentLevel - 1];
  
  // 工具函數：將局部 box 轉為全局座標，正確處理 facing
  const renderBoxes = (boxes: Box[], characterId: string, boxType: 'hit' | 'hurt') => {
    const borderColor = boxType === 'hit' ? 'red' : 'blue';
    return boxes.map((box, index) => {
      return (
        <div
          key={`${boxType}-box-${characterId}-${index}`} // <-- 使用傳入的 characterId
          style={{
            position: 'absolute',
            left: `${box.x}px`,
            bottom: `${box.y}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
            border: `2px solid ${borderColor}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      );
    });
  };

  return (
   // 1. 最外層的黑色背景容器 (置中用)
   <div className="w-screen h-screen bg-black relative overflow-hidden">
  {/* 2. 內層的遊戲畫布 (縮放用) */}
    <div
    className="relative overflow-hidden"
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${GAME_WIDTH}px`,
      height: `${GAME_HEIGHT}px`,
      // 這行 transform 會先將畫布的中心點移到父層的中心點(50%, 50%)，然後再進行縮放
      transform: `translate(-50%, -50%) scale(${gameScale})`,
      transformOrigin: 'center center',
      background: currentLevelData?.bg || 'linear-gradient(135deg, #2c1810 0%, #8b4s13 50%, #1a1a1a 100%)',
    }}
  >
      {/* Level Battle UI */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
              variant="outline"
              size="sm"
            >
              {gameState.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <div className="text-white font-bold text-lg">
              {currentLevelData?.name}
            </div>
            <div className="text-white font-bold">第 {gameState.currentLevel} 關</div>
          </div>
        </div>

        {/* Health bars */}
        <div className="flex justify-between items-center mb-2">
          {/* 玩家血條與頭像 */}
          <div className="w-1/3 flex items-center space-x-2">
            <div className="w-14 h-14 rounded-full bg-gray-700 border-4 border-red-500 overflow-hidden flex-shrink-0">
              {gameState.playerPhoto ? (
                <img src={gameState.playerPhoto} alt="玩家" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl">😊</div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-white font-bold mb-1">玩家</div>
              <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${(player1.health / player1.maxHealth) * 100}%` }}
                />
              </div>
              <div className="relative h-2 mt-1 bg-yellow-500 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-yellow-600 rounded-full transition-all duration-500"
                  style={{ width: `${(player1.energy / player1.maxEnergy) * 100}%` }}
                />
            </div>
          </div>
          </div>
          {/* 倒數計時器 */}
          <div className="w-1/3 flex items-center justify-center">
            <div className="text-3xl font-extrabold text-white bg-black/70 px-6 py-1 rounded-lg shadow border-2 border-yellow-400">
              {gameState.timeLeft}
            </div>
          </div>
          {/* AI血條與頭像 */}
          <div className="w-1/3 flex items-center space-x-2 justify-end">
            <div className="flex-1 text-right">
              <div className="text-white font-bold mb-1">AI</div>
              <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${(player2.health / player2.maxHealth) * 100}%` }}
                />
              </div>
              <div className="relative h-2 mt-1 bg-yellow-500 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-yellow-600 rounded-full transition-all duration-500"
                  style={{ width: `${(player2.energy / player2.maxEnergy) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-14 h-14 rounded-full bg-gray-700 border-4 border-red-500 overflow-hidden flex-shrink-0 ml-2">
              <div className="w-full h-full flex items-center justify-center text-white text-3xl">🤖</div>
            </div>
          </div>
        </div>
      </div>

      {/* 格鬥遊戲舞台 */}
      <div 
        className="absolute" // 不再需要 inset-0 和 overflow-hidden
        style={{
          // 【修改後#1】舞台的寬度應該是您設定的 2400px
          width: `${FIGHTING_STAGE_CONSTANTS.backgroundWidth}px`, 
          height: `${FIGHTING_STAGE_CONSTANTS.backgroundHeight}px`,
          // 【修改後#2】使用 left 屬性來移動舞台，模擬攝影機平移
          // cameraX 的值由 rAF 主循環計算
          left: `-${cameraX}px`,
          top: 0,
        }}
      > {/* Controls */}
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

      {gameState.isPaused && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <Card className="p-8 text-center bg-black/80 border-white">
            <h2 className="text-4xl font-bold text-white mb-4">遊戲暫停</h2>
            <Button 
              onClick={() => setGameState(prev => ({ ...prev, isPaused: false }))}
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
              onClick={handleResultModalClose}
            >
              {resultType === 'win' ? (gameState.currentLevel === 3 ? '觀看結局' : '下一關') : '再挑戰'}
            </button>
          </div>
        </div>
      )}
        {/* 舞台背景 */}
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

        {/* 角色容器 */}
        <div className="absolute inset-0">
        {/* Player 1 */}
        <div 
          className={`absolute ${player1.state === 'special' ? 'animate-pulse' : ''}`}
          style={{ 
              left: player1.position.x, 
              bottom: `${player1.position.y}px`, // 簡化Y軸定位
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
              onComplete={handleP1AnimationComplete} // <--- 新增這一行
            />
            {/* {renderBoxes(getHurtBox(player1, player1CurrentFrame), player1, 'hurt')} */}
            {/* {renderBoxes(getAttackHitBox(player1, player1CurrentFrame), player1, 'hit')} */}
        </div>

{/* Player 2 (AI) */}
<div 
  className={`absolute ${player2.state === 'special' ? 'animate-pulse' : ''}`}
  style={{ 
    left: player2.position.x, 
      bottom: `${player2.position.y}px`, // 簡化Y軸定位
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
    />
    {/* {renderBoxes(getHurtBox(player2, player2CurrentFrame), player2, 'hurt')} */}
    {/* {renderBoxes(getAttackHitBox(player2, player2CurrentFrame), player2, 'hit')} */}
</div>
    {/* RENDER BOXES HERE, AT THE TOP LEVEL */}
    {renderBoxes(getHurtBox(player1, player1CurrentFrame, player1CollisionData), 'player1', 'hurt')}
    {renderBoxes(getAttackHitBox(player1, player1CurrentFrame, player1CollisionData), 'player1', 'hit')}
    {renderBoxes(getHurtBox(player2, player2CurrentFrame, player2CollisionData), 'player2', 'hurt')}
    {renderBoxes(getAttackHitBox(player2, player2CurrentFrame, player2CollisionData), 'player2', 'hit')}
    {/* {renderBoxes(getHurtBox(player1, player1CurrentFrame), player1, 'hurt')}
    {renderBoxes(getAttackHitBox(player1, player1CurrentFrame), player1, 'hit')}
    {renderBoxes(getHurtBox(player2, player2CurrentFrame), player2, 'hurt')}
    {renderBoxes(getAttackHitBox(player2, player2CurrentFrame), player2, 'hit')} */}
        {/* Effects */}
        {effects.map(effect => (
          <div
            key={effect.id}
            className="absolute pointer-events-none"
            style={{ 
              left: effect.x, 
              bottom: `${effect.y}px`
            }}
          >
            {effect.type === 'hit' && <div className="text-4xl animate-bounce">💥</div>}
            {effect.type === 'special' && <div className="text-5xl animate-pulse text-yellow-400">🌟</div>}
            {effect.type === 'lightning' && <div className="text-6xl animate-pulse text-blue-400">⚡</div>}
            {effect.type === 'ko' && <div className="text-8xl font-bold text-red-600 animate-bounce">K.O.</div>}
            {effect.type === 'jumpAttack' && <div className="text-4xl animate-bounce text-red-600">💥</div>}
            {effect.type === 'crouchAttack' && <div className="text-4xl animate-bounce text-red-600">💥</div>}
            {effect.type === 'dash' && <div className="text-4xl animate-pulse text-blue-400">💨</div>}
          </div>
        ))}
        </div>
      </div>
    </div>
  </div>
);
}

export default FightingGame;