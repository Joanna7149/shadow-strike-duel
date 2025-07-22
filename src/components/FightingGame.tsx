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

// 移除舊的 texture 導入
// import textureAtlas from '../statics/characters/MainHero/animations/texture.png';
// import textureData from '../statics/characters/MainHero/animations/texture.json';

// 遊戲常數
const CHARACTER_WIDTH = 512;
const CHARACTER_HEIGHT = 512;
const MOVE_SPEED = 5;
const DASH_SPEED = 15;
const JUMP_HEIGHT = 100;
const JUMP_DURATION = 500; // 毫秒

// 舞台固定常數（遊戲世界的物理尺寸）
const FIGHTING_STAGE_CONSTANTS = {
  // 舞台背景尺寸
  backgroundWidth: 2400, // 背景圖寬度（整個可滾動舞台）
  backgroundHeight: 1080, // 舞台高度
  groundY: 0, // 地板位置（角色腳底對齊點）
};

// 視窗狀態接口
interface Viewport {
  width: number; // 當前視窗寬度
  height: number; // 當前視窗高度
  leftBoundary: number; // 鏡頭左邊界
  rightBoundary: number; // 鏡頭右邊界
  characterAreaLeft: number; // 角色活動左邊界
  characterAreaRight: number; // 角色活動右邊界
}

// 計算視窗狀態
const calculateViewport = (): Viewport => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  return {
    width,
    height,
    leftBoundary: 0,
    rightBoundary: Math.max(0, FIGHTING_STAGE_CONSTANTS.backgroundWidth - width),
    characterAreaLeft: 0,
    characterAreaRight: Math.max(0, FIGHTING_STAGE_CONSTANTS.backgroundWidth - CHARACTER_WIDTH)
  };
};

// 計算角色初始位置（確保在可見範圍內）
const calculateInitialPositions = (viewport: Viewport) => {
  const stageWidth = FIGHTING_STAGE_CONSTANTS.backgroundWidth;
  const viewportWidth = viewport.width;
  
  // 如果舞台寬度小於視窗寬度，角色居中顯示
  if (stageWidth <= viewportWidth) {
    const centerX = viewportWidth / 2;
    return {
      player1X: centerX - CHARACTER_WIDTH - 100, // 左側
      player2X: centerX + 100 // 右側
    };
  }
  
  // 如果舞台寬度大於視窗寬度，角色在視窗範圍內顯示
  const margin = 100; // 角色距離視窗邊緣的距離
  const availableWidth = viewportWidth - 2 * margin - CHARACTER_WIDTH * 2;
  const spacing = Math.max(200, availableWidth / 3); // 角色間距
  
  return {
    player1X: margin,
    player2X: margin + CHARACTER_WIDTH + spacing
  };
};

// 鏡頭系統
interface Camera {
  x: number; // 鏡頭X座標（相對於背景圖）
  targetX: number; // 目標X座標
  smoothing: number; // 平滑移動係數
}

// 計算鏡頭目標位置（追蹤玩家與敵人的中間點）
const calculateCameraTarget = (player1X: number, player2X: number, viewport: Viewport): number => {
  const centerX = (player1X + player2X) / 2;
  const viewportCenter = viewport.width / 2;
  
  // 鏡頭中心點應該追蹤兩人的中間點
  let targetX = centerX - viewportCenter;
  
  // 限制鏡頭邊界
  targetX = Math.max(viewport.leftBoundary, Math.min(viewport.rightBoundary, targetX));
  
  return targetX;
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
      frameRate: 20
    },
    kick: {
      type: 'png' as const,
      path: 'kick',
      frameRate: 15
    },
    jump: {
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
      frameRate: 10
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
    // 對於 PNG 模式，根據狀態返回對應的配置
    const pngConfig = ANIMATION_CONFIGS.png[state as keyof typeof ANIMATION_CONFIGS.png];
    if (pngConfig) {
      return pngConfig;
    }
    // 如果找不到對應的狀態，返回 idle
    return ANIMATION_CONFIGS.png.idle;
  }
}

// 移除重複的動畫配置 - 這些配置與 AnimationPlayer.tsx 中的配置衝突
// const PLAYER_ANIMATION_SOURCE: AnimationSource = {
//   type: 'png',
//   path: './src/statics/characters/MainHero/animations/idle/',
//   frameCount: 13,
//   frameRate: 10
// };

// const PLAYER_SPRITESHEET_ANIMATION_SOURCE: AnimationSource = {
//   type: 'spritesheet',
//   path: '/src/statics/characters/MainHero/animations/',
//   frameRate: 10,
//   state: 'idle'
// };

interface Character {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  position: { x: number; y: number };
  facing: 'left' | 'right';
  state: 'idle' | 'walk' | 'attacking' | 'defending' | 'crouching' | 'hit' | 'special' | 'victory' | 'death' | 'jump' | 'kick' | 'punch' | 'crouch' | 'crouch_punch' | 'crouch_kick' | 'jump_punch' | 'jump_kick' | 'walk' | 'special_attack' | 'win_round' | 'dead';
  hitBox: { x: number; y: number; width: number; height: number };
  hurtBox: { x: number; y: number; width: number; height: number };
}

interface GameState {
  timeLeft: number;
  currentLevel: number;
  gamePhase: 'cover' | 'opening-animation' | 'character-setup' | 'level-battle' | 'ending-animation' | 'game-complete';
  isPaused: boolean;
  playerPhoto: string | null;
  lastResult?: 'win' | 'lose' | null;
}

const LEVELS = [
  { 
    id: 1, 
    name: '第一關: 燃燒倉庫 火爆拳', 
    boss: '火爆拳',
    bg: 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #1a1a1a 100%)',
    description: '在燃燒的倉庫中，你遇到了火爆拳...'
  },
  { 
    id: 2, 
    name: '第二關: 廢棄月台 蛇鞭女', 
    boss: '蛇鞭女',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
    description: '廢棄的月台上，蛇鞭女正等著你...'
  },
  { 
    id: 3, 
    name: '第三關: 虛空之塔 心控王', 
    boss: '心控王',
    bg: 'linear-gradient(135deg, #0d0d0d 0%, #2d1b69 50%, #000000 100%)',
    description: '最終戰！虛空之塔的心控王現身...'
  }
];

const OPENING_SCENES = [
  '夜晚的城市被黑暗籠罩...',
  '罪惡在街頭蔓延...',
  '只有一位英雄能拯救這座城市...',
  '你就是那位英雄！'
];

// isCollision 函式
function isCollision(rect1: { x: number; y: number; width: number; height: number }, rect2: { x: number; y: number; width: number; height: number }) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}
// isFacingOpponent 判斷
function isFacingOpponent(p1: Character, p2: Character) {
  return (
    (p1.facing === 'right' && p1.position.x < p2.position.x) ||
    (p1.facing === 'left' && p1.position.x > p2.position.x)
  );
}

// 移除舊的 PixiAnimationManager 類別
// class PixiAnimationManager { ... }

// 移除舊的 PixiCharacterSprite 組件
// const PixiCharacterSprite: React.FC<{ ... }> = ({ ... }) => { ... }

const FightingGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 60,
    currentLevel: 1,
    gamePhase: 'cover',
    isPaused: false,
    playerPhoto: null,
    lastResult: null
  });

  const [openingStep, setOpeningStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gameDimensions, setGameDimensions] = useState(FIGHTING_STAGE_CONSTANTS); // 動態遊戲尺寸
  
  // 視窗狀態
  const [viewport, setViewport] = useState<Viewport>(calculateViewport());
  
  // 計算初始位置
  const initialPositions = calculateInitialPositions(viewport);
  
  // 鏡頭系統狀態
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    targetX: 0,
    smoothing: 0.1 // 平滑移動係數
  });
  
  const setPlayerIdleState = (player) => {

  };

  // 背景圖片路徑
  const backgroundImage = '/src/statics/backgrounds/stage1.png';
  
  // 1. 玩家初始 energy=0
  const [player1, setPlayer1] = useState<Character>({
    id: 'player1',
    name: '玩家',
    health: 100,
    maxHealth: 100,
    energy: 0, // 初始為0
    maxEnergy: 100,
    // 初始位置設為舞台左側，y=0 表示在地面
    position: { x: initialPositions.player1X, y: 0 },
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
    position: { x: initialPositions.player2X, y: 0 },
    facing: 'left',
    state: 'idle',
    hitBox: { x: 600, y: 300, width: 40, height: 60 },
    hurtBox: { x: 600, y: 300, width: 40, height: 60 }
  });

  const [effects, setEffects] = useState<Array<{id: string, type: string, x: number, y: number}>>([]);
  const gameLoopRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const keyBufferRef = useRef<Array<{ key: string; time: number }>>([]);
  const player1IdleStateRef = useRef(null);
  // const player2IdleStateRef = useRef(null);

  // 移除舊的動畫管理器狀態
  // const [player1AnimationManager] = useState(() => new PixiAnimationManager());
  // const [player2AnimationManager] = useState(() => new PixiAnimationManager());

  // RWD 縮放效果
  useEffect(() => {
    const updateDimensions = () => {
      const newViewport = calculateViewport();
      const newInitialPositions = calculateInitialPositions(newViewport);
      setViewport(newViewport);
      setGameDimensions(FIGHTING_STAGE_CONSTANTS);
      
      // 更新角色位置以適應新的視窗大小
      setPlayer1(prev => ({
        ...prev,
        position: { 
          x: Math.min(prev.position.x, newViewport.characterAreaRight), 
          y: prev.position.y 
        }
      }));
      
      setPlayer2(prev => ({
        ...prev,
        position: { 
          x: Math.min(prev.position.x, newViewport.characterAreaRight), 
          y: prev.position.y 
        }
      }));
    };

    // 初始設定
    updateDimensions();

    // 監聽視窗大小變化
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 鏡頭更新邏輯
  useEffect(() => {
    if (gameState.gamePhase !== 'level-battle') return;

    const updateCamera = () => {
      // 計算鏡頭目標位置
      const targetX = calculateCameraTarget(player1.position.x, player2.position.x, viewport);
      
      // 平滑移動鏡頭
      setCamera(prev => ({
        ...prev,
        targetX,
        x: prev.x + (targetX - prev.x) * prev.smoothing
      }));
    };

    // 每幀更新鏡頭
    const cameraInterval = setInterval(updateCamera, 16); // 60fps
    return () => clearInterval(cameraInterval);
  }, [gameState.gamePhase, player1.position.x, player2.position.x, viewport]);

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

  // Battle controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) return;
      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      // 更新 keyBuffer
      keyBufferRef.current.push({ key, time: Date.now() });
      if (keyBufferRef.current.length > 10) keyBufferRef.current.shift();

      // 跳躍中攻擊判斷
      if (player1.state === 'jump') {
        if (key === 'j') {
          setPlayer1(prev => ({ ...prev, state: 'jump_punch' }));
          // 命中判斷
          const hitBoxes = getAttackHitBox(player1, player1CurrentFrame);
          const hurtBoxes = getHurtBox(player2, player2CurrentFrame);
          if (hitBoxes.some(hitBox => hurtBoxes.some(hurtBox => isFacingOpponent(player1, player2) && isCollision(player1, player2, hitBox, hurtBox)))) {
            setPlayer2(prev => ({
              ...prev,
              health: Math.max(0, prev.health - 10),
              state: 'hit'
            }));
            setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
            addEffect('hit', player2.position.x, player2.position.y);
          }
          setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'jump' })), 400);
          return;
        }
        if (key === 'k') {
          setPlayer1(prev => ({ ...prev, state: 'jump_kick' }));
          // 命中判斷
          const hitBoxes = getAttackHitBox(player1, player1CurrentFrame);
          const hurtBoxes = getHurtBox(player2, player2CurrentFrame);
          if (hitBoxes.some(hitBox => hurtBoxes.some(hurtBox => isFacingOpponent(player1, player2) && isCollision(player1, player2, hitBox, hurtBox)))) {
            setPlayer2(prev => ({
              ...prev,
              health: Math.max(0, prev.health - 10),
              state: 'hit'
            }));
            setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
            addEffect('hit', player2.position.x, player2.position.y);
          }
          setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'jump' })), 400);
          return;
        }
      }

      // 組合鍵偵測
      const keys = new Set(pressedKeys);
      keys.add(key);
      // handleKeyDown 組合鍵偵測區
      // 跳躍攻擊
      if (keys.has('w') && keys.has('j')) {
        jumpAttack('punch');
        return;
      }
      if (keys.has('w') && keys.has('k')) {
        jumpAttack('kick');
        return;
      }
      if (keys.has('w') && keys.has('l')) {
        jumpAttack('special');
        return;
      }
      // 蹲下攻擊
      if (keys.has('s') && keys.has('j')) {
        crouchAttack('punch');
        return;
      }
      if (keys.has('s') && keys.has('k')) {
        crouchAttack('kick');
        return;
      }
      // 左跳/右跳
      if (keys.has('a') && keys.has('w')) {
        jumpPlayer();
        return;
      }
      if (keys.has('d') && keys.has('w')) {
        jumpPlayer();
        return;
      }
      // D+D dash
      if (key === 'd') {
        const now = Date.now();
        const recentDs = keyBufferRef.current.filter(
          k => k.key === 'd' && now - k.time < 300
        );
        if (recentDs.length >= 2) {
          dashPlayer('right');
          return;
        }
      }
      if (key === 'a') {
        const now = Date.now();
        const recentAs = keyBufferRef.current.filter(
          k => k.key === 'a' && now - k.time < 300
        );
        if (recentAs.length >= 2) {
          dashPlayer('left');
          return;
        }
      }
      // 單鍵行為
      switch (key) {
        case 'a':
          movePlayer('left');
          break;
        case 'd':
          movePlayer('right');
          break;
        case 's':
          setPlayer1(prev => ({ ...prev, state: 'crouch' }));
          break;
        case 'w':
          jumpPlayer();
          break;
        case 'j':
          attackPlayer();
          break;
        case 'k':
          kickPlayer();
          break;
        case 'l':
          specialAttack();
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      
      // 當釋放S鍵時，如果沒有其他動作，回到idle狀態
      if (key === 's') {
        setPlayer1(prev => {
          // 檢查是否還有其他按鍵被按下
          const remainingKeys = new Set(pressedKeys);
          remainingKeys.delete('s');
          
          // 如果沒有其他按鍵，且當前是蹲下狀態，回到idle
          if (remainingKeys.size === 0 && prev.state === 'crouch') {
            return { ...prev, state: 'idle' };
          }
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, player1, pressedKeys]);

  // AI Logic
  useEffect(() => {
    if (gameState.gamePhase === 'level-battle' && !gameState.isPaused) {
      const aiInterval = setInterval(() => {
        aiAction();
      }, 400 + Math.random() * 300); // 更頻繁
      return () => clearInterval(aiInterval);
    }
  }, [gameState.gamePhase, gameState.isPaused, player1, player2]);

  // 1. 定義碰撞框資料結構
  interface Box { x: number; y: number; width: number; height: number; }
  interface FrameCollisionData { hurtBox?: Box[]; hitBox?: Box[]; }
  interface AnimationCollisionData { [frame: string]: FrameCollisionData; }
  interface CharacterCollisionData { [action: string]: AnimationCollisionData; }

  // 2. 載入 collision_data.json
  const [collisionData, setCollisionData] = useState<CharacterCollisionData | null>(null);
  const [collisionDataLoading, setCollisionDataLoading] = useState(true);
  const [collisionDataError, setCollisionDataError] = useState<string | null>(null);
  useEffect(() => {
    setCollisionDataLoading(true);
    setCollisionDataError(null);
    fetch('src/statics/characters/MainHero/collision_data.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCollisionData(data);
        setCollisionDataLoading(false);
      })
      .catch((err) => {
        setCollisionData(null);
        setCollisionDataLoading(false);
        setCollisionDataError('載入 collision_data.json 失敗: ' + err.message);
      });
  }, []);

  // 3. 幀追蹤狀態
  const [player1CurrentFrame, setPlayer1CurrentFrame] = useState(1);
  const [player2CurrentFrame, setPlayer2CurrentFrame] = useState(1);

  // 4. 動態取得 hitbox/hurtbox（支援 facing）
  function getHurtBox(target: Character, currentFrame: number): Box[] {
    if (!collisionData) return [];
    const anim = collisionData[target.state] || collisionData['idle'];
    const frameData = anim?.[String(currentFrame)]?.hurtBox || [];
    // console.log(`${target.id} x: ${target.position.x} y: ${target.position.y}`)
    return frameData.map(box => {
      // let x = target.position.x + (target.facing === 'left' ? CHARACTER_WIDTH - box.x - box.width : box.x);
      // let y = target.position.y + box.y;
      let x = box.x;
      let y = box.y;
      // console.log(`${target.id} x_result: ${x} y_result: ${y}`)
      return { x, y, width: box.width, height: box.height };
    });
  }
  function getAttackHitBox(attacker: Character, currentFrame: number): Box[] {
    if (!collisionData) return [];
    const anim = collisionData[attacker.state] || collisionData['idle'];
    const frameData = anim?.[String(currentFrame)]?.hitBox || [];
    return frameData.map(box => {
      // let x = attacker.position.x + (attacker.facing === 'left' ? CHARACTER_WIDTH - box.x - box.width : box.x);
      // let y = attacker.position.y + box.y;
      let x = box.x;
      let y = box.y;
      return { x, y, width: box.width, height: box.height };
    });
  }

  // 5. 碰撞檢查
  function isCollision(player1, player2, box1: Box, box2: Box) {
    console.log("isCollision")
    // box1: hitbox; player1
    // box2: hurtbox; player2
    let player1HitBoxLeft = player1.position.x + box1.x;
    let player1HitBoxRight = player1HitBoxLeft + box1.width;
    
    const player2HurtBoxLeft = player2.position.x + box2.x;
    const player2HurtBoxRight = player2HurtBoxLeft + box2.width;

    if (player1.facing == "right") {
      player1HitBoxLeft = player1.position.x + CHARACTER_WIDTH - (box1.x + box1.width);
      player1HitBoxRight = player1.position.x + CHARACTER_WIDTH - box1.x;
    }

    let getHitted = false;
    if ((player1HitBoxLeft > player2HurtBoxLeft && player1HitBoxLeft < player2HurtBoxRight) || 
    (player1HitBoxRight > player2HurtBoxLeft && player1HitBoxRight < player2HurtBoxRight)) {
      getHitted = true;
    }

    return getHitted;
    // return (
    //   localX < box2.x + box2.width &&
    //   box1.x + box1.width > box2.x &&
    //   box1.y < box2.y + box2.height &&
    //   box1.y + box1.height > box2.y
    // );
  }

  // 6. 在渲染角色時加上 hitbox/hurtbox div（可視化調試）
  // ...在角色 AnimationPlayer 下方加：
  // {getHurtBox(player1, player1CurrentFrame).map((box, i) => (
  //   <div key={i} style={{
  //     position: 'absolute',
  //     left: box.x - camera.x,
  //     bottom: box.y,
  //     width: box.width,
  //     height: box.height,
  //     border: '2px solid blue',
  //     pointerEvents: 'none',
  //     zIndex: 20
  //   }} />
  // ))}
  // {getAttackHitBox(player1, player1CurrentFrame).map((box, i) => (
  //   <div key={i} style={{
  //     position: 'absolute',
  //     left: box.x - camera.x,
  //     bottom: box.y,
  //     width: box.width,
  //     height: box.height,
  //     border: '2px solid red',
  //     pointerEvents: 'none',
  //     zIndex: 20
  //   }} />
  // ))}
  // ...同理 player2

  // 7. 傳遞 onFrameChange 給 AnimationPlayer
  // <AnimationPlayer ... onFrameChange={setPlayer1CurrentFrame} />
  // ...同理 player2

  // 8. 在攻擊判斷時，遍歷所有 hitBox/hurtBox
  // getAttackHitBox(player1, player1CurrentFrame).some(hitBox =>
  //   getHurtBox(player2, player2CurrentFrame).some(hurtBox => isCollision(hitBox, hurtBox))
  // )

  const movePlayer = (direction: 'left' | 'right') => {
    setPlayer1(prev => {
      // 考慮角色縮放後的實際大小
      const scaledWidth = CHARACTER_WIDTH;
      const minX = viewport.characterAreaLeft;
      const maxX = viewport.characterAreaRight - scaledWidth;
      
      let newX = prev.position.x + (direction === 'left' ? -30 : 30);
      newX = Math.max(minX, Math.min(maxX, newX));
      
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
    player1IdleStateRef.current = setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 300);
  };

  // Dash (前衝/後衝)
  const dashPlayer = (direction: 'left' | 'right') => {
    setPlayer1(prev => {
      // 考慮角色縮放後的實際大小
      const scaledWidth = CHARACTER_WIDTH;
      const minX = viewport.characterAreaLeft;
      const maxX = viewport.characterAreaRight - scaledWidth;
      
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

  const defendPlayer = () => {
    setPlayer1(prev => ({ ...prev, state: 'defending' }));
    player1IdleStateRef.current = setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 500);
  };

  // 在 attackPlayer、comboAttack、kickPlayer、specialAttack 等攻擊函式中，若 player1 正在 movePlayer('left') 或 movePlayer('right') 且是遠離 AI，則自動進入防禦狀態。
  // 這裡以 attackPlayer 為例，其他攻擊函式可依此類推。
  // 2. 只有攻擊命中對手時才加能量，不能超過 maxEnergy
  const attackPlayer = () => {
    clearTimeout(player1IdleStateRef.current);
    setPlayer1(prev => {
      return({ 
        ...prev, 
      state: 'punch'
    })});

    // setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 400);
    console.log(player1CurrentFrame)
    // 命中判斷
    const hitBoxes = getAttackHitBox(player1, player1CurrentFrame);
    const hurtBoxes = getHurtBox(player2, player2CurrentFrame);
    // if (hitBoxes.some(hitBox => hurtBoxes.some(hurtBox => isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)))) {
    //   setPlayer2(prev => ({ 
    //     ...prev, 
    // health: Math.max(0, prev.health - 5),
    //     state: 'hit'
    //   }));


    hurtBoxes.some(hurtBox => {
      return hitBoxes.some(hitBox => {
        return isCollision(player1, player2, hitBox, hurtBox)
      })
    })

    if (hurtBoxes.some(hurtBox => hitBoxes.some(hitBox => isCollision(player1, player2, hitBox, hurtBox)))) {
      setPlayer2(prev => ({ 
        ...prev, 
    health: Math.max(0, prev.health - 5),
        state: 'hit'
      }));
    
      // if (true) {
      //   setPlayer2(prev => ({ 
      //     ...prev, 
      // health: Math.max(0, prev.health - 5),
      //     state: 'hit'
      //   }));
        
  setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
      addEffect('hit', player2.position.x, player2.position.y);
    }
    // setTimeout(() => setPlayer2(prev => ({ ...prev, state: 'idle' })), 1000);
  };

  // 4. UI 只顯示 energy/maxEnergy，能量條正確顯示
  const specialAttack = () => {
    if (player1.energy >= player1.maxEnergy) {
      setPlayer1(prev => ({ 
        ...prev, 
        state: 'special',
        energy: 0
      }));
      player1IdleStateRef.current = setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 1000);
      setTimeout(() => {
        const hitBoxes = getAttackHitBox(player1, player1CurrentFrame);
        const hurtBoxes = getHurtBox(player2, player2CurrentFrame);
        if (hitBoxes.some(hitBox => hurtBoxes.some(hurtBox => isFacingOpponent(player1, player2) && isCollision(player1, player2, hitBox, hurtBox)))) {
          setPlayer2(prev => ({ 
            ...prev, 
            health: Math.max(0, prev.health - 25),
            state: 'hit'
          }));
          addEffect('lightning', player2.position.x, player2.position.y);
        }
        setPlayer1(prev => ({ ...prev, state: 'idle' }));
      }, 1000);
    }
  };

  const aiAction = () => {
    if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) return;
    const distance = Math.abs(player2.position.x - player1.position.x);
    const action = Math.random();

    if (distance > 80) {
      // Move closer
      const direction = player2.position.x > player1.position.x ? 'left' : 'right';
      setPlayer2(prev => ({
        ...prev,
        position: {
          ...prev.position,
          x: direction === 'left' ? Math.max(50, prev.position.x - 35) : Math.min(750, prev.position.x + 35)
        },
        facing: direction === 'left' ? 'left' : 'right',
        state: 'walk'
      }));
    } else {
      // 更高機率攻擊
      if (action < 0.8) {
        // Attack
        setPlayer2(prev => ({ ...prev, state: 'attacking' }));
        if (player1.state !== 'defending') {
          setPlayer1(prev => ({ 
            ...prev, 
            health: Math.max(0, prev.health - 5),
            state: 'hit'
          }));
          setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
          addEffect('hit', player1.position.x, player1.position.y);
        }
      } else if (action < 0.98 && player2.energy >= 50) {
        // Special
        setPlayer2(prev => ({ 
          ...prev, 
          state: 'special',
          energy: Math.max(0, prev.energy - 50)
        }));
        addEffect('special', player2.position.x, player2.position.y);
      } else {
        setPlayer2(prev => ({ ...prev, state: 'defending' }));
      }
    }
    setTimeout(() => {
      setPlayer2(prev => ({ ...prev, state: 'idle' }));
      // player1IdleStateRef.current = setPlayer1(prev => ({ ...prev, state: prev.health > 0 ? 'idle' : prev.state }));
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
    let winner = '';
    if (player1.health > player2.health) {
      winner = 'player1';
    } else {
      winner = 'player2';
    }

    setPlayer1(prev => ({ ...prev, state: winner === 'player1' ? 'victory' : 'death' }));
    setPlayer2(prev => ({ ...prev, state: winner === 'player2' ? 'victory' : 'death' }));
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

  // 處理 Modal 按鈕
  const handleResultModalClose = () => {
    setShowResultModal(false);
    if (resultType === 'win') {
      // 只有在第三關勝利時才進入結局動畫
      if (gameState.currentLevel === 3 && gameState.gamePhase === 'level-battle') {
        setGameState(prev => ({ ...prev, gamePhase: 'ending-animation', lastResult: 'win' }));
      } else {
        setGameState(prev => ({
          ...prev,
          currentLevel: prev.currentLevel + 1,
          timeLeft: 60,
          gamePhase: 'level-battle',
          lastResult: 'win'
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
    const newInitialPositions = calculateInitialPositions(viewport);
    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, // 歸零
      position: { x: newInitialPositions.player1X, y: 0 },
      state: 'idle',
      hitBox: { x: 200, y: 300, width: 40, height: 60 },
      hurtBox: { x: 200, y: 300, width: 40, height: 60 }
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: newInitialPositions.player2X, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
  };

  const startOpeningAnimation = () => {
    setGameState(prev => ({ ...prev, gamePhase: 'opening-animation' }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setGameState(prev => ({ ...prev, playerPhoto: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
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
      gamePhase: 'cover',
      isPaused: false,
      playerPhoto: null
    });
    const newInitialPositions = calculateInitialPositions(viewport);
    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, // 歸零
      position: { x: newInitialPositions.player1X, y: 0 },
      state: 'idle',
      hitBox: { x: 200, y: 300, width: 40, height: 60 },
      hurtBox: { x: 200, y: 300, width: 40, height: 60 }
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: newInitialPositions.player2X, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
  };

  // 新增跳躍與踢的函式
  // 方向跳與原地跳邏輯
  const jumpPlayer = () => {
    if (player1.state === 'jump') return; // 避免連續觸發
    const jumpHeight = 200;
    const upTime = 500;
    const downTime = 500;
    // 判斷方向
    let direction: 'left' | 'right' | 'none' = 'none';
    if (pressedKeys.has('a') && !pressedKeys.has('d')) direction = 'left';
    else if (pressedKeys.has('d') && !pressedKeys.has('a')) direction = 'right';
    const stageWidth = window.innerWidth;
    const minX = stageWidth * 0.02;
    const maxX = stageWidth * 0.98 - CHARACTER_WIDTH;
    // 跳躍慣性距離
    const jumpDistance = direction === 'left' ? -100 : direction === 'right' ? 100 : 0;
    // 跳躍起點
    const startX = player1.position.x;
    const targetX = Math.max(minX, Math.min(maxX, startX + jumpDistance));
    // 跳躍動畫
    setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: startX, y: 0 } }));
    setTimeout(() => {
      setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: targetX, y: jumpHeight } }));
      setTimeout(() => {
        setPlayer1(prev => ({ ...prev, state: 'idle', position: { ...prev.position, x: targetX, y: 0 } }));
      }, downTime);
    }, upTime);
  };
  const kickPlayer = () => {
    setPlayer1(prev => ({
      ...prev,
      state: 'kick'
    }));
    // 命中判斷
    const hitBoxes = getAttackHitBox(player1, player1CurrentFrame);
    const hurtBoxes = getHurtBox(player2, player2CurrentFrame);
    if (hitBoxes.some(hitBox => hurtBoxes.some(hurtBox => isFacingOpponent(player1, player2) && isCollision(player1, player2, hitBox, hurtBox)))) {
        setPlayer2(prev => ({ 
          ...prev, 
        health: Math.max(0, prev.health - 10),
          state: 'hit'
        }));
      setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
        addEffect('hit', player2.position.x, player2.position.y);
      }
      player1IdleStateRef.current = setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 400);
      setTimeout(() => setPlayer2(prev => ({ ...prev, state: 'idle' })), 600);
  };

  // 新增組合攻擊函式
  // 跳躍攻擊邏輯
  const jumpAttack = (attackType: 'punch' | 'kick' | 'special') => {
    if (attackType === 'special' && player1.energy < player1.maxEnergy) return;
    const jumpHeight = 200;
    const upTime = 500;
    const downTime = 500;
    // 判斷方向
    let direction: 'left' | 'right' | 'none' = 'none';
    if (pressedKeys.has('a') && !pressedKeys.has('d')) direction = 'left';
    else if (pressedKeys.has('d') && !pressedKeys.has('a')) direction = 'right';
    const stageWidth = window.innerWidth;
    const minX = stageWidth * 0.02;
    const maxX = stageWidth * 0.98 - CHARACTER_WIDTH;
    const jumpDistance = direction === 'left' ? -100 : direction === 'right' ? 100 : 0;
    const startX = player1.position.x;
    const targetX = Math.max(minX, Math.min(maxX, startX + jumpDistance));
    // 跳躍動畫
    setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: startX, y: 0 } }));
    setTimeout(() => {
      setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: targetX, y: jumpHeight } }));
      // 空中攻擊判斷
      setTimeout(() => {
        // 命中判斷
        const hitBoxes = getAttackHitBox(player1, player1CurrentFrame);
        const hurtBoxes = getHurtBox(player2, player2CurrentFrame);
        if (hitBoxes.some(hitBox => hurtBoxes.some(hurtBox => isFacingOpponent(player1, player2) && isCollision(player1, player2, hitBox, hurtBox)))) {
          setPlayer2(prev => ({
            ...prev,
            health: Math.max(0, prev.health - 10),
            state: 'hit'
          }));
          setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
          addEffect('hit', player2.position.x, player2.position.y);
        }
        // 下落
        setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: targetX, y: 0 } }));
        player1IdleStateRef.current = setTimeout(() => {
          setPlayer1(prev => ({ ...prev, state: 'idle', position: { ...prev.position, x: targetX, y: 0 } }));
        }, downTime);
      }, upTime);
    }, upTime);
  };

  const crouchAttack = (attackType: 'punch' | 'kick') => {
    const state = attackType === 'punch' ? 'crouch_punch' : 'crouch_kick';
    setPlayer1(prev => ({
      ...prev,
      state: state
    }));
    
    // 攻擊後回到蹲下狀態，而不是idle
    setTimeout(() => {
      setPlayer1(prev => {
        // 檢查是否還按著S鍵
        if (pressedKeys.has('s')) {
          return { ...prev, state: 'crouch' };
        } else {
          return { ...prev, state: 'idle' };
        }
      });
    }, 600);
    
    // 命中判斷
    const hitBoxes = getAttackHitBox(player1, player1CurrentFrame);
    const hurtBoxes = getHurtBox(player2, player2CurrentFrame);
    if (hitBoxes.some(hitBox => hurtBoxes.some(hurtBox => isFacingOpponent(player1, player2) && isCollision(player1, player2, hitBox, hurtBox)))) {
      setPlayer2(prev => ({
        ...prev,
        health: Math.max(0, prev.health - 10),
        state: 'hit'
      }));
      setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
      addEffect('hit', player2.position.x, player2.position.y);
    }
    setTimeout(() => setPlayer2(prev => ({ ...prev, state: 'idle' })), 600);
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
            >
              <Upload className="mr-2 h-4 w-4" />
              上傳大頭照
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
              >
                開始冒險
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
              transformOrigin: 'center bottom',
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
  const renderBoxes = (boxes: Box[], character: Character, boxType: 'hit' | 'hurt', cameraX: number) => {
    return boxes.map((box, index) => {
      let localX = box.x;
      let localY = box.y;
      // let displayX = character.position.x + localX;
      let displayX = localX;
      // const displayY = character.position.y + localY;
      const displayY = localY;
      // console.log(`renderBoxex: player: ${character.id} localX: ${localX} displayX: ${displayX}`)
      // if (character.facing === 'left') {
      //   displayX = character.position.x + CHARACTER_WIDTH - (localX + box.width);
      //   // displayX = character.position.x + (localX);
      //   console.log(`facing left: player: ${character.id} displayX: ${displayX}`)
      // }
      if (boxType == "hit") {
        if (character.facing === 'left') {
          displayX = localX;
        } else {
          displayX = CHARACTER_WIDTH - (localX + box.width);
        }
      }
      const borderColor = boxType === 'hit' ? 'red' : 'blue';
      return (
        <div
          key={`${boxType}-box-${character.id}-${index}`}
          style={{
            position: 'absolute',
            left: `${displayX - cameraX}px`,
            bottom: `${displayY}px`,
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
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        background: currentLevelData?.bg || 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #1a1a1a 100%)',
        width: '100vw',
        height: '100vh'
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
        className="absolute inset-0 overflow-hidden"
        style={{
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
          transform: `translateX(-${camera.x}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {/* 舞台背景 */}
        <div 
          className="absolute"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            width: `${FIGHTING_STAGE_CONSTANTS.backgroundWidth}px`,
            height: `${FIGHTING_STAGE_CONSTANTS.backgroundHeight}px`,
            left: 0,
            top: `${Math.max(0, viewport.height - FIGHTING_STAGE_CONSTANTS.backgroundHeight)}px`
          }}
        />

        {/* 角色容器 */}
        <div className="absolute inset-0">
        {/* Player 1 */}
        <div 
          className={`absolute transition-all duration-300 ${player1.state === 'special' ? 'animate-pulse' : ''}`}
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
            />
            {renderBoxes(getHurtBox(player1, player1CurrentFrame), player1, 'hurt', camera.x)}
            {renderBoxes(getAttackHitBox(player1, player1CurrentFrame), player1, 'hit', camera.x)}
        </div>

        {/* Player 2 (AI) */}
        <div 
          className={`absolute transition-all duration-300 ${player2.state === 'special' ? 'animate-pulse' : ''}`}
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
              source={getAnimationSource(player2.state)}
              facing={player2.facing}
              state={player2.state}
              width={CHARACTER_WIDTH}
              height={CHARACTER_HEIGHT}
              isPlayer1={false}
              onFrameChange={setPlayer2CurrentFrame}
              setPlayer={setPlayer2}
            />
            {renderBoxes(getHurtBox(player2, player2CurrentFrame), player2, 'hurt', camera.x)}
            {renderBoxes(getAttackHitBox(player2, player2CurrentFrame), player2, 'hit', camera.x)}
        </div>

        {/* Effects */}
        {effects.map(effect => (
          <div
            key={effect.id}
            className="absolute pointer-events-none"
              style={{ 
                left: effect.x - camera.x, 
                bottom: `${effect.y}px` // 簡化Y軸定位
              }}
          >
            {effect.type === 'hit' && (
              <div className="text-4xl animate-bounce">💥</div>
            )}
            {effect.type === 'special' && (
              <div className="text-5xl animate-pulse text-yellow-400">🌟</div>
            )}
            {effect.type === 'lightning' && (
              <div className="text-6xl animate-pulse text-blue-400">⚡</div>
            )}
            {effect.type === 'ko' && (
              <div className="text-8xl font-bold text-red-600 animate-bounce">K.O.</div>
            )}
              {effect.type === 'jumpAttack' && (
                <div className="text-4xl animate-bounce text-red-600">💥</div>
              )}
              {effect.type === 'crouchAttack' && (
                <div className="text-4xl animate-bounce text-red-600">💥</div>
              )}
              {effect.type === 'dash' && (
                <div className="text-4xl animate-pulse text-blue-400">💨</div>
              )}
          </div>
        ))}
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
      {collisionDataLoading && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 9999, color: 'yellow', background: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 4 }}>
          載入碰撞資料中...
        </div>
      )}
      {collisionDataError && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 9999, color: 'red', background: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 4 }}>
          {collisionDataError}
        </div>
      )}
    </div>
  );
};

export default FightingGame;
