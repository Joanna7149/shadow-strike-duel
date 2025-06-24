
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, ArrowLeft, ArrowRight, Shield, ArrowDown } from 'lucide-react';

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
  round: number;
  player1Wins: number;
  player2Wins: number;
  gamePhase: 'menu' | 'character-select' | 'stage-select' | 'fighting' | 'game-over';
  isPaused: boolean;
}

const CHARACTERS = [
  { id: 'warrior', name: '戰士', color: '#FF6B6B' },
  { id: 'ninja', name: '忍者', color: '#4ECDC4' },
  { id: 'mage', name: '法師', color: '#45B7D1' },
  { id: 'berserker', name: '狂戰士', color: '#96CEB4' },
  { id: 'assassin', name: '刺客', color: '#FFEAA7' },
  { id: 'paladin', name: '聖騎士', color: '#DDA0DD' }
];

const STAGES = [
  { id: 'dojo', name: '道場', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'forest', name: '森林', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'temple', name: '神廟', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'mountain', name: '山脈', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
];

const FightingGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 60,
    round: 1,
    player1Wins: 0,
    player2Wins: 0,
    gamePhase: 'menu',
    isPaused: false
  });

  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
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

  // Game timer
  useEffect(() => {
    if (gameState.gamePhase === 'fighting' && !gameState.isPaused && gameState.timeLeft > 0) {
      const timer = setInterval(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.gamePhase, gameState.isPaused, gameState.timeLeft]);

  // Round end check
  useEffect(() => {
    if (gameState.timeLeft === 0 || player1.health <= 0 || player2.health <= 0) {
      handleRoundEnd();
    }
  }, [gameState.timeLeft, player1.health, player2.health]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.gamePhase !== 'fighting' || gameState.isPaused) return;
      
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
    if (gameState.gamePhase === 'fighting' && !gameState.isPaused) {
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

  const handleRoundEnd = () => {
    let winner = '';
    if (player1.health > player2.health) {
      setGameState(prev => ({ ...prev, player1Wins: prev.player1Wins + 1 }));
      winner = 'player1';
    } else {
      setGameState(prev => ({ ...prev, player2Wins: prev.player2Wins + 1 }));
      winner = 'player2';
    }

    if (gameState.player1Wins === 2 || gameState.player2Wins === 2) {
      setGameState(prev => ({ ...prev, gamePhase: 'game-over' }));
      setPlayer1(prev => ({ ...prev, state: winner === 'player1' ? 'victory' : 'death' }));
      setPlayer2(prev => ({ ...prev, state: winner === 'player2' ? 'victory' : 'death' }));
      addEffect('ko', 400, 200);
    } else {
      // Next round
      setTimeout(() => {
        setGameState(prev => ({ 
          ...prev, 
          round: prev.round + 1, 
          timeLeft: 60 
        }));
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
      }, 2000);
    }
  };

  const startGame = () => {
    setGameState(prev => ({ ...prev, gamePhase: 'character-select' }));
  };

  const selectCharacter = (characterId: string) => {
    setSelectedCharacter(characterId);
    setGameState(prev => ({ ...prev, gamePhase: 'stage-select' }));
  };

  const selectStage = (stageId: string) => {
    setSelectedStage(stageId);
    setGameState(prev => ({ ...prev, gamePhase: 'fighting', timeLeft: 60 }));
  };

  const resetGame = () => {
    setGameState({
      timeLeft: 60,
      round: 1,
      player1Wins: 0,
      player2Wins: 0,
      gamePhase: 'menu',
      isPaused: false
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
    setSelectedCharacter('');
    setSelectedStage('');
  };

  if (gameState.gamePhase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Card className="p-8 text-center bg-black/50 backdrop-blur border-purple-500">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">
            SHADOW STRIKE DUEL
          </h1>
          <p className="text-xl text-white mb-8">究極格鬥遊戲</p>
          <Button 
            onClick={startGame}
            className="text-2xl px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
          >
            開始遊戲
          </Button>
        </Card>
      </div>
    );
  }

  if (gameState.gamePhase === 'character-select') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Card className="p-8 bg-black/50 backdrop-blur border-purple-500">
          <h2 className="text-4xl font-bold mb-6 text-center text-white">選擇角色</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CHARACTERS.map(char => (
              <Button
                key={char.id}
                onClick={() => selectCharacter(char.id)}
                className="h-24 text-lg font-bold"
                style={{ backgroundColor: char.color }}
              >
                {char.name}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (gameState.gamePhase === 'stage-select') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Card className="p-8 bg-black/50 backdrop-blur border-purple-500">
          <h2 className="text-4xl font-bold mb-6 text-center text-white">選擇戰鬥場景</h2>
          <div className="grid grid-cols-2 gap-4">
            {STAGES.map(stage => (
              <Button
                key={stage.id}
                onClick={() => selectStage(stage.id)}
                className="h-24 text-lg font-bold relative overflow-hidden"
                style={{ background: stage.bg }}
              >
                {stage.name}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (gameState.gamePhase === 'game-over') {
    const winner = gameState.player1Wins > gameState.player2Wins ? '玩家' : 'AI';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Card className="p-8 text-center bg-black/50 backdrop-blur border-purple-500">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {winner} 勝利！
          </h1>
          <p className="text-2xl text-white mb-8">
            最終戰績: {gameState.player1Wins} - {gameState.player2Wins}
          </p>
          <div className="space-x-4">
            <Button 
              onClick={resetGame}
              className="text-xl px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600"
            >
              重新開始
            </Button>
            <Button 
              onClick={() => setGameState(prev => ({ ...prev, gamePhase: 'menu' }))}
              className="text-xl px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700"
            >
              回到主選單
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const selectedStageData = STAGES.find(s => s.id === selectedStage);

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ background: selectedStageData?.bg || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      {/* Game UI */}
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
            <div className="text-white font-bold">第 {gameState.round} 回合</div>
          </div>
          
          <div className="text-4xl font-bold text-white bg-black/50 px-4 py-2 rounded">
            {gameState.timeLeft}
          </div>
          
          <div className="text-white font-bold">
            {gameState.player1Wins} - {gameState.player2Wins}
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
