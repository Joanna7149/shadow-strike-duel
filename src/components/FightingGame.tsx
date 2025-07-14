
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Upload, RotateCcw, ArrowLeft, ArrowRight, ArrowDown, Shield } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  position: { x: number; y: number };
  facing: 'left' | 'right';
  state: 'idle' | 'moving' | 'attacking' | 'defending' | 'crouching' | 'hit' | 'combo' | 'special' | 'victory' | 'death';
  comboCount: number;
}

interface GameState {
  timeLeft: number;
  battleRound: number;
  battleWins: number;
  battleLosses: number;
  currentLevel: number;
  gamePhase: 'cover' | 'opening-animation' | 'character-setup' | 'level-battle' | 'ending-animation' | 'game-complete';
  isPaused: boolean;
  playerPhoto: string | null;
}

const LEVELS = [
  { 
    id: 1, 
    name: '第一關：街頭霸主', 
    boss: '混混老大',
    bg: 'linear-gradient(135deg, #2c1810 0%, #8b4513 50%, #1a1a1a 100%)',
    description: '在黑暗的小巷中，你遇到了第一個敵人...'
  },
  { 
    id: 2, 
    name: '第二關：地下拳王', 
    boss: '地下格鬥王',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
    description: '地下格鬥場的燈光閃爍，強敵等待著你...'
  },
  { 
    id: 3, 
    name: '第三關：暗影之王', 
    boss: '暗影領主',
    bg: 'linear-gradient(135deg, #0d0d0d 0%, #2d1b69 50%, #000000 100%)',
    description: '最終戰！城市的命運就在你的手中...'
  }
];

const OPENING_SCENES = [
  '夜晚的城市被黑暗籠罩...',
  '罪惡在街頭蔓延...',
  '只有一位英雄能拯救這座城市...',
  '你就是那位英雄！'
];

const FightingGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 60,
    battleRound: 1,
    battleWins: 0,
    battleLosses: 0,
    currentLevel: 1,
    gamePhase: 'cover',
    isPaused: false,
    playerPhoto: null
  });

  const [openingStep, setOpeningStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [player1, setPlayer1] = useState<Character>({
    id: 'player1',
    name: '玩家',
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    position: { x: 200, y: 300 },
    facing: 'right',
    state: 'idle',
    comboCount: 0
  });

  const [player2, setPlayer2] = useState<Character>({
    id: 'player2',
    name: 'AI',
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    position: { x: 600, y: 300 },
    facing: 'left',
    state: 'idle',
    comboCount: 0
  });

  const [effects, setEffects] = useState<Array<{id: string, type: string, x: number, y: number}>>([]);
  const gameLoopRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.gamePhase !== 'level-battle' || gameState.isPaused) return;
      
      switch (e.key.toLowerCase()) {
        case 'a':
          movePlayer('left');
          break;
        case 'd':
          movePlayer('right');
          break;
        case 's':
          setPlayer1(prev => ({ ...prev, state: 'crouching' }));
          break;
        case 'w':
          defendPlayer();
          break;
        case 'j':
          attackPlayer();
          break;
        case 'k':
          comboAttack();
          break;
        case 'l':
          specialAttack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, player1]);

  // AI Logic
  useEffect(() => {
    if (gameState.gamePhase === 'level-battle' && !gameState.isPaused) {
      const aiInterval = setInterval(() => {
        aiAction();
      }, 1000 + Math.random() * 1000);
      return () => clearInterval(aiInterval);
    }
  }, [gameState.gamePhase, gameState.isPaused]);

  const movePlayer = (direction: 'left' | 'right') => {
    setPlayer1(prev => ({
      ...prev,
      position: {
        ...prev.position,
        x: direction === 'left' ? Math.max(50, prev.position.x - 30) : Math.min(750, prev.position.x + 30)
      },
      facing: direction,
      state: 'moving'
    }));
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 300);
  };

  const defendPlayer = () => {
    setPlayer1(prev => ({ ...prev, state: 'defending' }));
    setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 500);
  };

  const attackPlayer = () => {
    if (Math.abs(player1.position.x - player2.position.x) < 80) {
      setPlayer1(prev => ({ ...prev, state: 'attacking' }));
      if (player2.state !== 'defending') {
        setPlayer2(prev => ({ 
          ...prev, 
          health: Math.max(0, prev.health - 15),
          state: 'hit'
        }));
        addEffect('hit', player2.position.x, player2.position.y);
      }
      setTimeout(() => setPlayer1(prev => ({ ...prev, state: 'idle' })), 400);
      setTimeout(() => setPlayer2(prev => ({ ...prev, state: 'idle' })), 600);
    }
  };

  const comboAttack = () => {
    if (Math.abs(player1.position.x - player2.position.x) < 80 && player1.energy >= 30) {
      setPlayer1(prev => ({ 
        ...prev, 
        state: 'combo',
        energy: Math.max(0, prev.energy - 30),
        comboCount: 5
      }));
      
      let comboHits = 0;
      const comboInterval = setInterval(() => {
        if (comboHits < 5 && player2.state !== 'defending') {
          setPlayer2(prev => ({ 
            ...prev, 
            health: Math.max(0, prev.health - 8),
            state: 'hit'
          }));
          addEffect('combo', player2.position.x + (Math.random() - 0.5) * 40, player2.position.y + (Math.random() - 0.5) * 40);
        }
        comboHits++;
        if (comboHits >= 5) {
          clearInterval(comboInterval);
          setPlayer1(prev => ({ ...prev, state: 'idle', comboCount: 0 }));
          setTimeout(() => setPlayer2(prev => ({ ...prev, state: 'idle' })), 300);
        }
      }, 200);
    }
  };

  const specialAttack = () => {
    if (player1.energy >= 50) {
      setPlayer1(prev => ({ 
        ...prev, 
        state: 'special',
        energy: Math.max(0, prev.energy - 50)
      }));
      addEffect('special', player1.position.x, player1.position.y);
      
      setTimeout(() => {
        if (Math.abs(player1.position.x - player2.position.x) < 150) {
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
    const distance = Math.abs(player2.position.x - player1.position.x);
    const action = Math.random();
    
    if (distance > 100) {
      // Move closer
      const direction = player2.position.x > player1.position.x ? 'left' : 'right';
      setPlayer2(prev => ({
        ...prev,
        position: {
          ...prev.position,
          x: direction === 'left' ? Math.max(50, prev.position.x - 25) : Math.min(750, prev.position.x + 25)
        },
        facing: direction === 'left' ? 'left' : 'right',
        state: 'moving'
      }));
    } else {
      // Combat actions
      if (action < 0.3) {
        // Attack
        setPlayer2(prev => ({ ...prev, state: 'attacking' }));
        if (player1.state !== 'defending') {
          setPlayer1(prev => ({ 
            ...prev, 
            health: Math.max(0, prev.health - 12),
            state: 'hit'
          }));
          addEffect('hit', player1.position.x, player1.position.y);
        }
      } else if (action < 0.5) {
        // Defend
        setPlayer2(prev => ({ ...prev, state: 'defending' }));
      } else if (action < 0.7 && player2.energy >= 30) {
        // Combo
        setPlayer2(prev => ({ 
          ...prev, 
          state: 'combo',
          energy: Math.max(0, prev.energy - 30)
        }));
      } else if (action < 0.8 && player2.energy >= 50) {
        // Special
        setPlayer2(prev => ({ 
          ...prev, 
          state: 'special',
          energy: Math.max(0, prev.energy - 50)
        }));
        addEffect('special', player2.position.x, player2.position.y);
      }
    }
    
    setTimeout(() => {
      setPlayer2(prev => ({ ...prev, state: 'idle' }));
      setPlayer1(prev => ({ ...prev, state: prev.health > 0 ? 'idle' : prev.state }));
    }, 500);
  };

  const addEffect = (type: string, x: number, y: number) => {
    const effectId = Math.random().toString(36).substr(2, 9);
    setEffects(prev => [...prev, { id: effectId, type, x, y }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effectId));
    }, 1000);
  };

  const handleBattleEnd = () => {
    let winner = '';
    if (player1.health > player2.health) {
      setGameState(prev => ({ ...prev, battleWins: prev.battleWins + 1 }));
      winner = 'player1';
    } else {
      setGameState(prev => ({ ...prev, battleLosses: prev.battleLosses + 1 }));
      winner = 'player2';
    }

    // Check if level is complete (3 wins out of 5 battles, so need 3 wins)
    if (gameState.battleWins === 3) {
      // Level complete, move to next level or ending
      if (gameState.currentLevel === 3) {
        setGameState(prev => ({ ...prev, gamePhase: 'ending-animation' }));
      } else {
        setTimeout(() => {
          setGameState(prev => ({ 
            ...prev, 
            currentLevel: prev.currentLevel + 1,
            battleWins: 0,
            battleLosses: 0,
            battleRound: 1,
            timeLeft: 60 
          }));
          resetPlayersForNewBattle();
        }, 3000);
      }
    } else if (gameState.battleLosses === 3) {
      // Game over - player lost
      setGameState(prev => ({ ...prev, gamePhase: 'game-complete' }));
    } else {
      // Next battle in current level
      setTimeout(() => {
        setGameState(prev => ({ 
          ...prev, 
          battleRound: prev.battleRound + 1, 
          timeLeft: 60 
        }));
        resetPlayersForNewBattle();
      }, 2000);
    }
    
    setPlayer1(prev => ({ ...prev, state: winner === 'player1' ? 'victory' : 'death' }));
    setPlayer2(prev => ({ ...prev, state: winner === 'player2' ? 'victory' : 'death' }));
    addEffect('ko', 400, 200);
  };

  const resetPlayersForNewBattle = () => {
    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: 200, y: 300 },
      state: 'idle'
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: 600, y: 300 },
      state: 'idle'
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
      battleRound: 1,
      battleWins: 0,
      battleLosses: 0,
      currentLevel: 1,
      gamePhase: 'cover',
      isPaused: false,
      playerPhoto: null
    });
    setPlayer1(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: 200, y: 300 },
      state: 'idle'
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      health: 100, 
      energy: 100, 
      position: { x: 600, y: 300 },
      state: 'idle'
    }));
    setOpeningStep(0);
  };

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
            城市拯救成功！
          </h1>
          <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-gradient-to-b from-yellow-400 to-orange-500 border-8 border-white relative overflow-hidden animate-scale-in">
            {gameState.playerPhoto ? (
              <img src={gameState.playerPhoto} alt="Hero" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-6xl">😊</div>
            )}
          </div>
          <p className="text-2xl text-white mb-8 drop-shadow">光明重新照耀這座城市</p>
          
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
    const isVictory = gameState.currentLevel > 3 || gameState.battleWins === 3;
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
            <div className="text-white font-bold">第 {gameState.battleRound} 戰</div>
          </div>
          
          <div className="text-4xl font-bold text-white bg-black/50 px-4 py-2 rounded">
            {gameState.timeLeft}
          </div>
          
          <div className="text-white font-bold text-lg">
            勝: {gameState.battleWins} | 敗: {gameState.battleLosses}
          </div>
        </div>

        {/* Health bars */}
        <div className="flex justify-between items-center mb-2">
          <div className="w-1/3">
            <div className="text-white font-bold mb-1">玩家</div>
            <Progress value={(player1.health / player1.maxHealth) * 100} className="h-6" />
            <Progress value={(player1.energy / player1.maxEnergy) * 100} className="h-2 mt-1" />
          </div>
          
          <div className="w-1/3 text-right">
            <div className="text-white font-bold mb-1">AI</div>
            <Progress value={(player2.health / player2.maxHealth) * 100} className="h-6" />
            <Progress value={(player2.energy / player2.maxEnergy) * 100} className="h-2 mt-1" />
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
            bottom: '20px',
            transform: `scaleX(${player1.facing === 'left' ? -1 : 1})`
          }}
        >
          <div className={`w-16 h-20 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-lg
            ${player1.state === 'hit' ? 'bg-red-600 animate-bounce' : 
              player1.state === 'attacking' ? 'bg-orange-600' :
              player1.state === 'defending' ? 'bg-blue-600' :
              player1.state === 'combo' ? 'bg-purple-600 animate-pulse' :
              player1.state === 'special' ? 'bg-yellow-400 animate-ping' :
              player1.state === 'victory' ? 'bg-green-600' :
              player1.state === 'death' ? 'bg-gray-600' :
              'bg-emerald-600'}`}
          >
            🥋
          </div>
          {player1.state === 'combo' && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-400 font-bold animate-bounce">
              x{player1.comboCount}
            </div>
          )}
        </div>

        {/* Player 2 (AI) */}
        <div 
          className={`absolute transition-all duration-300 ${player2.state === 'special' ? 'animate-pulse' : ''}`}
          style={{ 
            left: player2.position.x, 
            bottom: '20px',
            transform: `scaleX(${player2.facing === 'left' ? -1 : 1})`
          }}
        >
          <div className={`w-16 h-20 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-lg
            ${player2.state === 'hit' ? 'bg-red-600 animate-bounce' : 
              player2.state === 'attacking' ? 'bg-orange-600' :
              player2.state === 'defending' ? 'bg-blue-600' :
              player2.state === 'combo' ? 'bg-purple-600 animate-pulse' :
              player2.state === 'special' ? 'bg-yellow-400 animate-ping' :
              player2.state === 'victory' ? 'bg-green-600' :
              player2.state === 'death' ? 'bg-gray-600' :
              'bg-red-600'}`}
          >
            🤖
          </div>
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
            {effect.type === 'combo' && (
              <div className="text-3xl animate-ping text-purple-400">⚡</div>
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
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="bg-black/50 text-white">
              <ArrowLeft className="h-4 w-4" /> A
            </Button>
            <Button variant="outline" size="sm" className="bg-black/50 text-white">
              <ArrowRight className="h-4 w-4" /> D
            </Button>
            <Button variant="outline" size="sm" className="bg-black/50 text-white">
              <ArrowDown className="h-4 w-4" /> S
            </Button>
            <Button variant="outline" size="sm" className="bg-black/50 text-white">
              <Shield className="h-4 w-4" /> W
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="bg-black/50 text-white">
              攻擊 J
            </Button>
            <Button variant="outline" size="sm" className="bg-black/50 text-white">
              連擊 K
            </Button>
            <Button variant="outline" size="sm" className="bg-black/50 text-white">
              必殺 L
            </Button>
          </div>
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
    </div>
  );
};

export default FightingGame;
