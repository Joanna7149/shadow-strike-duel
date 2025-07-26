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
const DASH_SPEED = 15;
const JUMP_HEIGHT = 100;
const JUMP_DURATION = 500; // 毫秒

// 舞台固定常數（遊戲世界的物理尺寸）
const FIGHTING_STAGE_CONSTANTS = {
  // 舞台背景尺寸
  backgroundWidth: 1600, // 背景圖寬度（整個可滾動舞台）
  backgroundHeight: 1080, // 舞台高度
  groundY: 0, // 地板位置（角色腳底對齊點）
};

// 計算角色初始位置（確保在可見範圍內）
const calculateInitialPositions = () => {
  const stageWidth = FIGHTING_STAGE_CONSTANTS.backgroundWidth;
  const viewportWidth = window.innerWidth;
  return {
    player1X: stageWidth * 0.1,
    player2X: stageWidth * 0.85 - CHARACTER_WIDTH,
  };
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

// isFacingOpponent 判斷
function isFacingOpponent(p1: Character, p2: Character) {
  return (
    (p1.facing === 'right' && p1.position.x < p2.position.x) ||
    (p1.facing === 'left' && p1.position.x > p2.position.x)
  );
}

const FightingGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 60,
    currentLevel: 1,
    gamePhase: 'level-battle',
    isPaused: false,
    playerPhoto: null,
    lastResult: null
  });

  const [collisionData, setCollisionData] = useState<CharacterCollisionData | null>(null);
  const [collisionDataLoading, setCollisionDataLoading] = useState(true);
  const [collisionDataError, setCollisionDataError] = useState<string | null>(null);

  const [openingStep, setOpeningStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gameDimensions, setGameDimensions] = useState(FIGHTING_STAGE_CONSTANTS); // 動態遊戲尺寸
  
  // 計算初始位置
  const initialPositions = calculateInitialPositions();
  
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
  const player1HitRegisteredRef = useRef(false);
  // const player2IdleStateRef = useRef(null);

  // RWD 縮放效果
  useEffect(() => {
    const updateDimensions = () => {
      const newInitialPositions = calculateInitialPositions();
      setGameDimensions(FIGHTING_STAGE_CONSTANTS);
      
      // 更新角色位置以適應新的視窗大小
      setPlayer1(prev => ({
        ...prev,
        position: { 
          x: Math.min(prev.position.x, window.innerWidth - CHARACTER_WIDTH), 
          y: prev.position.y 
        }
      }));
      
      setPlayer2(prev => ({
        ...prev,
        position: { 
          x: Math.min(prev.position.x, window.innerWidth - CHARACTER_WIDTH), 
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

  
  const handleP1AnimationComplete = () => {
    // 當一個攻擊動畫結束時，根據當前按下的按鍵決定下一個狀態
    // 這使得操作更流暢，例如攻擊後按住方向鍵會直接走路而不是先變回idle
    setPlayer1(prev => {
      // 如果角色當前狀態不在攻擊中 (可能已經被其他動作中斷)，就不要改變它
      const isAttacking = ['punch', 'kick', 'crouch_punch', 'crouch_kick', 'special_attack'].includes(prev.state);
      if (!isAttacking) {
        return prev;
      }

      // 檢查按鍵狀態
      if (pressedKeys.has('s')) {
        return { ...prev, state: 'crouch' };
      }
      if (pressedKeys.has('a') || pressedKeys.has('d')) {
        return { ...prev, state: 'walk' };
      }
      // 如果沒有任何持續性按鍵，則回到閒置狀態
      return { ...prev, state: 'idle' };
    });
  };
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
          return;
        }
        if (key === 'k') {
          setPlayer1(prev => ({ ...prev, state: 'jump_kick' }));
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
  const anim = collisionData[target.state] || collisionData['idle'];  // 取得當前狀態的 hurtBox
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
function getAttackHitBox(attacker: Character, currentFrame: number): Box[] {
  if (!collisionData) return [];
  const anim = collisionData[attacker.state] || collisionData['idle'];
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
  // 新增：玩家攻擊碰撞檢測
  useEffect(() => {
    // 只有在玩家處於攻擊狀態時才進行碰撞檢測
    const isPlayer1Attacking = ['punch', 'kick', 'jump_punch', 'jump_kick', 'special_attack', 'crouch_punch', 'crouch_kick'].includes(player1.state);
    const isPlayer2Attacking = ['punch', 'kick', 'jump_punch', 'jump_kick', 'special_attack', 'crouch_punch', 'crouch_kick'].includes(player2.state);
    
    if (
      gameState.gamePhase === 'level-battle' &&
      !gameState.isPaused &&
      isPlayer1Attacking &&
      collisionData // 確保碰撞數據已載入
    ) {
      const p1HitBoxes = getAttackHitBox(player1, player1CurrentFrame);
      const p2HurtBoxes = getHurtBox(player2, player2CurrentFrame);
  
      // 確保有碰撞框才進行判斷
      if (p1HitBoxes.length > 0 && p2HurtBoxes.length > 0) {
        const collisionDetected = p1HitBoxes.some(hitBox =>
          p2HurtBoxes.some(hurtBox =>
            isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)
          )
        );
  
        if (collisionDetected && !player1HitRegisteredRef.current) { 
          player1HitRegisteredRef.current = true; // <-- 命中後將旗幟設為 true
          console.log("Collision detected!");
          // 避免重複觸發命中效果，可以添加一個旗幟或者只在特定幀觸發
          // 這裡簡單實現為直接觸發一次效果並扣血
          setPlayer2(prev => ({ 
            ...prev, 
            health: Math.max(0, prev.health - 10), // 假設每次攻擊扣10點血
            state: 'hit'
          }));
          setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
          addEffect('hit', player2.position.x, player2.position.y);
  
          // AI 被擊中後，使其狀態在短時間內回到 idle
          // 這裡可以根據需要調整延遲時間
          setTimeout(() => {
            setPlayer2(prev => ({ ...prev, state: 'idle' }));
          }, 500); // 讓 AI 有被擊中的動畫時間
          // setTimeout(() => {
          //   setPlayer1(prev => ({ ...prev, state: 'idle' }));
          // }, 500); // 玩家被擊中後，使其狀態在短時間內回到 idle
        }
      }
    }
  }, [
    player1.state,
    player1CurrentFrame,
    player1.position.x, // 攻擊時位置可能變動
    player1.facing,
    player2.state, // 偵測對手狀態變動 (hurtbox)
    player2CurrentFrame,
    player2.position.x, // 對手位置變動
    gameState.gamePhase,
    gameState.isPaused,
    collisionData // 確保碰撞數據已載入
  ]);

  const movePlayer = (direction: 'left' | 'right') => {
    setPlayer1(prev => {
      // 考慮角色縮放後的實際大小
      const scaledWidth = CHARACTER_WIDTH;
      const minX = 0;
      const maxX = window.innerWidth - scaledWidth;
      
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
      const minX = 0;
      const maxX = window.innerWidth - scaledWidth;
      
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
    player1HitRegisteredRef.current = false;
    setPlayer1(prev => {
      return({ 
        ...prev, 
      state: 'punch'
    })});
    console.log(player1CurrentFrame)
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
    const newInitialPositions = calculateInitialPositions();
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
    const newInitialPositions = calculateInitialPositions();
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
    clearTimeout(player1IdleStateRef.current); // <--- 建議也加上，確保一致性
    player1HitRegisteredRef.current = false; // <--- 新增這一行
    setPlayer1(prev => ({
      ...prev,
      state: 'kick'
    }));
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
    player1HitRegisteredRef.current = false;
    setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: startX, y: 0 } }));
    setTimeout(() => {
      setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: targetX, y: jumpHeight } }));
      // 空中攻擊判斷
    // 下落
    setTimeout(() => {
      setPlayer1(prev => ({ ...prev, state: 'idle', position: { ...prev.position, x: targetX, y: 0 } }));
    }, downTime);
  }, upTime);
};

  const crouchAttack = (attackType: 'punch' | 'kick') => {
    player1HitRegisteredRef.current = false;
    const state = attackType === 'punch' ? 'crouch_punch' : 'crouch_kick';
    setPlayer1(prev => ({
      ...prev,
      state: state
    }));
    
    // 攻擊後回到蹲下狀態，而不是idle
    // setTimeout(() => {
    //   setPlayer1(prev => {
    //     // 檢查是否還按著S鍵
    //     if (pressedKeys.has('s')) {
    //       return { ...prev, state: 'crouch' };
    //     } else {
    //       return { ...prev, state: 'idle' };
    //     }
    //   });
    // }, 600);
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
  const renderBoxes = (boxes: Box[], character: Character, boxType: 'hit' | 'hurt') => {
    const borderColor = boxType === 'hit' ? 'red' : 'blue';
    return boxes.map((box, index) => {
      // const displayX = character.position.x + box.x;
      // const displayY = character.position.y + box.y;
      return (
        <div
          key={`${boxType}-box-${character.id}-${index}`}
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
          width: `${window.innerWidth}px`,
          height: `${window.innerHeight}px`
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
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            width: `${FIGHTING_STAGE_CONSTANTS.backgroundWidth}px`,
            height: `${FIGHTING_STAGE_CONSTANTS.backgroundHeight}px`,
            left: 0,
            top: `${Math.max(0, window.innerHeight - FIGHTING_STAGE_CONSTANTS.backgroundHeight)}px`
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
              onComplete={handleP1AnimationComplete} // <--- 新增這一行
            />
            {/* {renderBoxes(getHurtBox(player1, player1CurrentFrame), player1, 'hurt')} */}
            {/* {renderBoxes(getAttackHitBox(player1, player1CurrentFrame), player1, 'hit')} */}
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
    {/* {renderBoxes(getHurtBox(player2, player2CurrentFrame), player2, 'hurt')} */}
    {/* {renderBoxes(getAttackHitBox(player2, player2CurrentFrame), player2, 'hit')} */}
</div>
    {/* RENDER BOXES HERE, AT THE TOP LEVEL */}
    {renderBoxes(getHurtBox(player1, player1CurrentFrame), player1, 'hurt')}
    {renderBoxes(getAttackHitBox(player1, player1CurrentFrame), player1, 'hit')}
    {renderBoxes(getHurtBox(player2, player2CurrentFrame), player2, 'hurt')}
    {renderBoxes(getAttackHitBox(player2, player2CurrentFrame), player2, 'hit')}
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
);
}

export default FightingGame;