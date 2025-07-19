
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Upload, RotateCcw, ArrowLeft, ArrowRight, ArrowDown, Shield } from 'lucide-react';
import mainHeroIdle from '../statics/characters/MainHero/animations/stand_idle/idle01.png';
import textureAtlas from '../statics/characters/MainHero/animation/texture.png';
import textureData from '../statics/characters/MainHero/animation/texture.json';

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

// 動畫管理器
class AnimationManager {
  private textureAtlas: HTMLImageElement;
  private textureData: any;
  private animations: Map<string, any[]> = new Map();
  private currentAnimation: string = 'idle';
  private currentFrame: number = 0;
  private frameTime: number = 0;
  private frameDuration: number = 100; // 0.1秒 = 100ms

  constructor(atlasSrc: string, data: any) {
    this.textureData = data;
    this.textureAtlas = new Image();
    this.textureAtlas.src = atlasSrc;
    this.loadAnimations();
  }

  private loadAnimations() {
    const frames = this.textureData.frames;
    const animationStates = [
      'idle', 'crouch', 'crouch_kick', 'crouch_punch', 'defend', 'hit', 
      'kick', 'punch', 'jump', 'jump_kick', 'jump_punch', 'walk', 
      'special_attack', 'win_round', 'dead'
    ];

    animationStates.forEach(state => {
      const stateFrames = [];
      let frameIndex = 1;
      while (true) {
        const frameName = `逐格/${state}/${frameIndex}.png`;
        if (frames[frameName]) {
          stateFrames.push({
            name: frameName,
            ...frames[frameName]
          });
          frameIndex++;
        } else {
          break;
        }
      }
      if (stateFrames.length > 0) {
        this.animations.set(state, stateFrames);
      }
    });
  }

  setAnimation(animationName: string) {
    if (this.currentAnimation !== animationName && this.animations.has(animationName)) {
      this.currentAnimation = animationName;
      this.currentFrame = 0;
      this.frameTime = 0;
    }
  }

  update(deltaTime: number) {
    this.frameTime += deltaTime;
    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0;
      const currentAnim = this.animations.get(this.currentAnimation);
      if (currentAnim && currentAnim.length > 0) {
        this.currentFrame = (this.currentFrame + 1) % currentAnim.length;
      }
    }
  }

  getCurrentFrame() {
    const currentAnim = this.animations.get(this.currentAnimation);
    if (currentAnim && currentAnim.length > 0) {
      return currentAnim[this.currentFrame];
    }
    return null;
  }

  isAtlasLoaded() {
    return this.textureAtlas.complete;
  }
}

// 角色精靈組件
const CharacterSprite: React.FC<{
  animationManager: AnimationManager;
  facing: 'left' | 'right';
  state: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  isPlayer1?: boolean;
}> = ({ animationManager, facing, state, position, width, height, isPlayer1 = false }) => {
  const [deltaTime, setDeltaTime] = useState(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    const animate = (currentTime: number) => {
      const delta = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      setDeltaTime(delta);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animationManager.setAnimation(state);
  }, [state, animationManager]);

  useEffect(() => {
    animationManager.update(deltaTime);
  }, [deltaTime, animationManager]);

  const frame = animationManager.getCurrentFrame();
  if (!frame || !animationManager.isAtlasLoaded()) {
    return (
      <div style={{
        width: width,
        height: height,
        background: '#222',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        載入中...
      </div>
    );
  }

  const { frame: frameData } = frame;
  // Player 1 的 scaleX 邏輯反轉
  const scaleX = isPlayer1 
    ? (facing === 'right' ? -1 : 1)
    : (facing === 'left' ? -1 : 1);

  return (
    <div style={{
      width: width,
      height: height,
      overflow: 'hidden',
      transform: `scaleX(${scaleX})`
    }}>
      <div style={{
        width: frameData.w,
        height: frameData.h,
        backgroundImage: `url(${textureAtlas})`,
        backgroundPosition: `-${frameData.x}px -${frameData.y}px`,
        transform: 'scale(0.9)', // 縮放以符合角色尺寸
        transformOrigin: 'center center'
      }} />
    </div>
  );
};

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
  // 1. 玩家初始 energy=0
  const [player1, setPlayer1] = useState<Character>({
    id: 'player1',
    name: '玩家',
    health: 100,
    maxHealth: 100,
    energy: 0, // 初始為0
    maxEnergy: 100,
    // 初始位置設為畫面 10% 處，避免超出
    position: { x: window.innerWidth * 0.1, y: 0 },
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
    // 初始位置設為畫面 90% 處，避免超出
    position: { x: window.innerWidth * 0.9, y: 0 },
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

  const [player1AnimationManager] = useState(() => new AnimationManager(textureAtlas, textureData));
  const [player2AnimationManager] = useState(() => new AnimationManager(textureAtlas, textureData));

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
          const hitBox = getAttackHitBox(player1, player1.facing);
          const hurtBox = getHurtBox(player2);
          if (isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)) {
            setPlayer2(prev => ({
              ...prev,
              health: Math.max(0, prev.health - 25),
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
          const hitBox = getAttackHitBox(player1, player1.facing);
          const hurtBox = getHurtBox(player2);
          if (isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)) {
            setPlayer2(prev => ({
              ...prev,
              health: Math.max(0, prev.health - 25),
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

  // 角色尺寸常數
  const CHARACTER_WIDTH = 200;
  const CHARACTER_HEIGHT = 500;

  // 新的碰撞判斷工具
  function getAttackHitBox(attacker: Character, facing: 'left' | 'right') {
    // attacker.position.x, attacker.position.y
    // 向右：x+CHARACTER_WIDTH，向左：x-100
    return {
      x: facing === 'right' ? attacker.position.x + CHARACTER_WIDTH : attacker.position.x - 100,
      y: attacker.position.y,
      width: 100,
      height: CHARACTER_HEIGHT
    };
  }
  function getHurtBox(target: Character) {
    return {
      x: target.position.x,
      y: target.position.y,
      width: CHARACTER_WIDTH,
      height: CHARACTER_HEIGHT
    };
  }

  const movePlayer = (direction: 'left' | 'right') => {
    setPlayer1(prev => {
      // 取得舞台寬度
      const stageWidth = window.innerWidth;
      const minX = stageWidth * 0.02;
      const maxX = stageWidth * 0.98 - CHARACTER_WIDTH;
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
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 300);
  };

  // Dash (前衝/後衝)
  const dashPlayer = (direction: 'left' | 'right') => {
    setPlayer1(prev => {
      const stageWidth = window.innerWidth;
      const minX = stageWidth * 0.02;
      const maxX = stageWidth * 0.98 - CHARACTER_WIDTH;
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
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 200);
  };

  const defendPlayer = () => {
    setPlayer1(prev => ({ ...prev, state: 'defending' }));
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 500);
  };

  // 在 attackPlayer、comboAttack、kickPlayer、specialAttack 等攻擊函式中，若 player1 正在 movePlayer('left') 或 movePlayer('right') 且是遠離 AI，則自動進入防禦狀態。
  // 這裡以 attackPlayer 為例，其他攻擊函式可依此類推。
  // 2. 只有攻擊命中對手時才加能量，不能超過 maxEnergy
  const attackPlayer = () => {
    setPlayer1(prev => ({
      ...prev,
      state: 'punch'
    }));
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 400);
    // 命中判斷
    const hitBox = getAttackHitBox(player1, player1.facing);
    const hurtBox = getHurtBox(player2);
    if (isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)) {
      setPlayer2(prev => ({
        ...prev,
        health: Math.max(0, prev.health - 15),
        state: 'hit'
      }));
      setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
      addEffect('hit', player2.position.x, player2.position.y);
    }
    setTimeout(() => setPlayer2(prev => ({ ...prev, state: 'idle' })), 600);
  };

  // 4. UI 只顯示 energy/maxEnergy，能量條正確顯示
  const specialAttack = () => {
    if (player1.energy >= player1.maxEnergy) {
      setPlayer1(prev => ({
        ...prev,
        state: 'special',
        energy: 0
      }));
      setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 1000);
      setTimeout(() => {
        const hitBox = getAttackHitBox(player1, player1.facing);
        const hurtBox = getHurtBox(player2);
        if (isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)) {
          setPlayer2(prev => ({
            ...prev,
            health: Math.max(0, prev.health - 35),
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
            health: Math.max(0, prev.health - 18),
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
      setPlayer1(prev => ({ ...prev, state: prev.health > 0 ? 'idle' : prev.state }));
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
    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, // 歸零
      position: { x: window.innerWidth * 0.1, y: 0 },
      state: 'idle',
      hitBox: { x: 200, y: 300, width: 40, height: 60 },
      hurtBox: { x: 200, y: 300, width: 40, height: 60 }
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: window.innerWidth * 0.9, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
  };

  const startOpeningAnimation = () => {
    setGameState(prev => ({ ...prev, gamePhase: 'opening-animation' }));
    setOpeningStep(0);
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
      timeLeft: 60 
    }));
  };

  const resetGame = () => {
    setGameState({
      timeLeft: 60,
      currentLevel: 1,
      gamePhase: 'cover',
      isPaused: false,
      playerPhoto: null,
      lastResult: null
    });
    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 0, // 歸零
      position: { x: window.innerWidth * 0.1, y: 0 },
      state: 'idle',
      hitBox: { x: 200, y: 300, width: 40, height: 60 },
      hurtBox: { x: 200, y: 300, width: 40, height: 60 }
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: window.innerWidth * 0.7, y: 0 },
      state: 'idle',
      hitBox: { x: 600, y: 300, width: 40, height: 60 },
      hurtBox: { x: 600, y: 300, width: 40, height: 60 }
    }));
    setOpeningStep(0);
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
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 400);
    // 命中判斷
    const hitBox = getAttackHitBox(player1, player1.facing);
    const hurtBox = getHurtBox(player2);
    if (isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)) {
      setPlayer2(prev => ({
        ...prev,
        health: Math.max(0, prev.health - 18),
        state: 'hit'
      }));
      setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
      addEffect('hit', player2.position.x, player2.position.y);
    }
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
        const hitBox = getAttackHitBox({ ...player1, position: { ...player1.position, x: targetX, y: jumpHeight } }, player1.facing);
        const hurtBox = getHurtBox(player2);
        if (isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)) {
          setPlayer2(prev => ({
            ...prev,
            health: Math.max(0, prev.health - (attackType === 'special' ? 35 : 25)),
            state: 'hit'
          }));
          if (attackType === 'special') setPlayer1(prev => ({ ...prev, energy: 0 }));
          else setPlayer1(prev => ({ ...prev, energy: Math.min(prev.maxEnergy, prev.energy + 10) }));
          addEffect('hit', player2.position.x, player2.position.y);
        }
        // 下落
        setPlayer1(prev => ({ ...prev, state: 'jump', position: { ...prev.position, x: targetX, y: 0 } }));
        setTimeout(() => {
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
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 600);
    // 命中判斷
    const hitBox = getAttackHitBox(player1, player1.facing);
    const hurtBox = getHurtBox(player2);
    if (isFacingOpponent(player1, player2) && isCollision(hitBox, hurtBox)) {
      setPlayer2(prev => ({
        ...prev,
        health: Math.max(0, prev.health - 25),
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

  // 5. Level Battle
  const currentLevelData = LEVELS[gameState.currentLevel - 1];
  
  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ background: currentLevelData?.bg || 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #1a1a1a 100%)' }}
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
          {/* 右上方時間顯示已徹底移除 */}
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
            {/* 玩家血條與頭像區塊，血條下方加上怒氣條 */}
            <div className="flex-1">
              <div className="text-white font-bold mb-1">玩家</div>
              {/* 紅色血條 */}
              <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${(player1.health / player1.maxHealth) * 100}%` }}
                />
              </div>
              {/* 怒氣條 */}
              <div className="relative h-2 mt-1 bg-yellow-500 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-yellow-600 rounded-full transition-all duration-500"
                  style={{ width: `${(player1.energy / player1.maxEnergy) * 100}%` }}
                />
              </div>
            </div>
          </div>
          {/* 倒數計時器，置中顯示 */}
          <div className="w-1/3 flex items-center justify-center">
            <div className="text-3xl font-extrabold text-white bg-black/70 px-6 py-1 rounded-lg shadow border-2 border-yellow-400">
              {gameState.timeLeft}
            </div>
          </div>
          {/* AI血條與頭像 */}
          <div className="w-1/3 flex items-center space-x-2 justify-end">
            <div className="flex-1 text-right">
              <div className="text-white font-bold mb-1">AI</div>
              {/* 紅色血條 */}
              <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${(player2.health / player2.maxHealth) * 100}%` }}
                />
              </div>
              {/* 怒氣條 */}
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

      {/* Game Field */}
      <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-black/30 to-transparent">
        {/* Player 1 */}
        <div 
          className={`absolute transition-all duration-300 ${player1.state === 'special' ? 'animate-pulse' : ''}`}
          style={{ 
            left: player1.position.x, 
            bottom: `${40 + player1.position.y}px`,
            width: CHARACTER_WIDTH,
            height: CHARACTER_HEIGHT
          }}
        >
          <CharacterSprite
            animationManager={player1AnimationManager}
            facing={player1.facing}
            state={player1.state}
            position={player1.position}
            width={CHARACTER_WIDTH}
            height={CHARACTER_HEIGHT}
            isPlayer1={true}
          />
        </div>

        {/* Player 2 (AI) */}
        <div 
          className={`absolute transition-all duration-300 ${player2.state === 'special' ? 'animate-pulse' : ''}`}
          style={{ 
            left: player2.position.x, 
            bottom: `${40 + player2.position.y}px`,
            width: CHARACTER_WIDTH,
            height: CHARACTER_HEIGHT
          }}
        >
          <CharacterSprite
            animationManager={player2AnimationManager}
            facing={player2.facing}
            state={player2.state}
            position={player2.position}
            width={CHARACTER_WIDTH}
            height={CHARACTER_HEIGHT}
            isPlayer1={false}
          />
        </div>

        {/* Effects */}
        {effects.map(effect => (
          <div
            key={effect.id}
            className="absolute pointer-events-none"
            style={{ left: effect.x, bottom: '40px' }}
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

      {/* Controls - 簡明操作說明 */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
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
    </div>
  );
};

export default FightingGame;
