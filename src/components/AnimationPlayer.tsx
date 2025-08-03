import React, { useState, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

// 動畫來源類型定義
export type AnimationSource = {
  type: 'png' | 'spritesheet';
  path: string;
  frameCount?: number;  // png 模式才會用到，現在是可選的
  frameRate: number;
  state?: string; // spritesheet 模式用於指定動畫狀態
};

// PNG 逐格動畫組件
const PngAnimationPlayer: React.FC<{
  source: AnimationSource;
  facing: 'left' | 'right';
  width: number;
  height: number;
  isPlayer1?: boolean;
  state: string;
  setPlayer: (player: Object) => void;
  onFrameChange?: (frame: number) => void;
  onComplete?: () => void; // <--- 新增這一行
}> = ({ source, facing, width, height, state, isPlayer1 = false, onFrameChange, setPlayer, onComplete }) => {
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 預定義的幀數配置（根據實際檔案數量）
  const frameCounts: Record<string, number> = {
    idle: 13,           // 實際有 1-13.png
    walk_forward: 8,    // 實際有 1-8.png
    walk_backward: 8,   // 實際有 1-8.png
    punch: 15,          // 實際有 1-15.png
    kick: 5,            // 實際有 1-5.png
    jump: 10,           // 實際有 1-10.png
    crouch: 1,          // 實際有 1.png
    crouch_punch: 6,    // 實際有 1-6.png
    crouch_kick: 5,     // 實際有 1-5.png
    defend: 1,          // 實際有 1.png
    hit: 7,             // 實際有 1-7.png
    special_attack: 17, // 實際有 1-17.png
    win_round: 12,      // 實際有 1-12.png
    dead: 10,           // 實際有 1-10.png
    jump_punch: 15,     // 實際有 1-15.png
    jump_kick: 7,       // 實際有 1-7.png
    // 為其他狀態提供預設動畫
    attacking: 15,      // 使用 punch 的幀數
    defending: 1,       // 使用 defend 的幀數
    crouching: 1,       // 使用 crouch 的幀數
    special: 17,        // 使用 special_attack 的幀數
    victory: 12,        // 使用 win_round 的幀數
    death: 10,          // 使用 dead 的幀數
    walk: 8             // 使用 walk_forward 的幀數
  };

  // 從路徑中提取動作名稱
  const segments = source.path.split('/');
  const actionName = segments[segments.length - 1]; // 取最後一段作為動作名稱
  const maxFrames = frameCounts[actionName] || source.frameCount || 1;

  // if (isPlayer1) {
  //   console.log(`png state: ${state}`)
  // }
  

  // 重置動畫幀計數器當狀態改變時
  useEffect(() => {
    setCurrentFrame(1);
    setIsLoaded(false);
  }, [source.path, source.state, state]);

  useEffect(() => {
        // 檢查是否為單次播放動畫
    const singlePlayAnimations = new Set([
          'punch', 'kick', 'crouch_punch', 'crouch_kick', 
          'jump_punch', 'jump_kick', 'hit', 'special_attack', 'death', 'dead'
      ]);
      
    const isSinglePlay = singlePlayAnimations.has(actionName);

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1;
        if (next > maxFrames) {
  if (isSinglePlay) {
    onComplete?.();
    clearInterval(interval); // Stop the interval
    return maxFrames; // Remain on the last frame
  }
  return 1; // Loop for non-single-play animations
}
        return next;
      });
    }, 1000 / source.frameRate);
    // 設置動畫循環
    // const interval = setInterval(() => {
    //   setCurrentFrame(prev => {
    //     const next = prev + 1;
    //     // When the animation finishes, just loop back to the first frame.
    //     // The parent component is responsible for changing the state from 'punch' to 'idle'.
    //     if (next > maxFrames) {
    //       return 1;
    //     }
    //     return next;
    //   });
    // }, 1000 / source.frameRate);

    frameIntervalRef.current = interval;

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
}, [maxFrames, source.frameRate]); // Removed dependencies that could cause re-renders
// }, [maxFrames, source.frameRate]); // Removed dependencies that could cause re-renders

  // 使用正確的路徑載入圖片
  const frameNumber = currentFrame.toString();
  // 使用 import.meta.url 來正確處理 Vite 的靜態資源
  // const imagePath = new URL(`../statics/characters/MainHero/animations/${source.path}/${frameNumber}.png`, import.meta.url).href;
    // 根據 source.path 動態載入不同角色的圖片，舊的寫法
  // const imagePath = new URL(`src/statics/characters/${source.path}/${frameNumber}.png`, import.meta.url).href;
  // --- 新的寫法 ---
const imagePath = `/statics/characters/${source.path}/${frameNumber}.png`;

  useEffect(() => {
    if (onFrameChange) onFrameChange(currentFrame);
  }, [currentFrame]);

  return (
    <div 
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scaleX(${isPlayer1 ? (facing === 'right' ? -1 : 1) : (facing === 'left' ? 1 : -1)})`,
        transformOrigin: 'center',
        position: 'relative',
        // border: "3px solid yellow"
      }}
    >
      <img
        src={imagePath}
        alt={`Frame ${frameNumber}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%',
          // border: "3px solid green"
        }}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          console.error(`Failed to load image: ${imagePath}`, e);
        }}
      />
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666'
        }}>
          載入中...
        </div>
      )}
    </div>
  );
};

// Spritesheet 動畫組件
const SpritesheetAnimationPlayer: React.FC<{
  source: AnimationSource;
  facing: 'left' | 'right';
  width: number;
  height: number;
  isPlayer1?: boolean;
}> = ({ source, facing, width, height, isPlayer1 = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spriteRef = useRef<PIXI.AnimatedSprite | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    let spritesheet: PIXI.Spritesheet | null = null;

    const setup = async () => {
      try {
        // 1. 載入圖片
        const baseTexture = await PIXI.Assets.load(`${source.path}texture.png`);
        // 2. 載入 JSON
        const response = await fetch(`${source.path}texture.json`);
        const data = await response.json();
        // 3. 建立 Spritesheet
        spritesheet = new PIXI.Spritesheet(baseTexture, data);
        await spritesheet.parse();
        if (destroyed) return;
        // 4. 取得動畫幀
        const animationName = source.state || 'idle';
        const frames = spritesheet.animations[animationName];
        if (!frames || frames.length === 0) throw new Error('找不到動畫幀');
        // 5. 建立 Application
        const app = new PIXI.Application();
        await app.init({
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
        });
        appRef.current = app;
        // 6. 建立 AnimatedSprite
        const animatedSprite = new PIXI.AnimatedSprite(frames);
        animatedSprite.anchor.set(0.5, 1); // 腳底對齊
        animatedSprite.x = width / 2;
        animatedSprite.y = height;
        animatedSprite.animationSpeed = source.frameRate / 60;
        animatedSprite.loop = true;
        animatedSprite.play();
        // 7. 翻轉
        animatedSprite.scale.x = (isPlayer1
          ? (facing === 'right' ? -1 : 1)
          : (facing === 'left' ? -1 : 1));
        spriteRef.current = animatedSprite;
        app.stage.addChild(animatedSprite);
        // 8. 加到 DOM
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(app.canvas);
        }
        setIsLoaded(true);
      } catch (e: any) {
        setError(e.message || '載入 Spritesheet 失敗');
      }
    };
    setup();
    return () => {
      destroyed = true;
      if (spriteRef.current) spriteRef.current.destroy();
      if (appRef.current) appRef.current.destroy(true);
    };
  }, [source.path, source.state, source.frameRate, facing, width, height, isPlayer1]);

  // 更新翻轉方向
  useEffect(() => {
    if (spriteRef.current) {
      spriteRef.current.scale.x = (isPlayer1
        ? (facing === 'right' ? -1 : 1)
        : (facing === 'left' ? -1 : 1));
    }
  }, [facing, isPlayer1]);

  if (error) {
    return <div style={{ color: 'red' }}>Spritesheet 載入失敗: {error}</div>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        background: 'transparent',
        position: 'relative',
      }}
    >
      {!isLoaded && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
        }}>
          載入中...
        </div>
      )}
    </div>
  );
};

// 主要的動畫播放器組件
const AnimationPlayer: React.FC<{
  source: AnimationSource;
  facing: 'left' | 'right';
  width: number;
  height: number;
  isPlayer1?: boolean;
  state?: string; // 添加 state 屬性來控制動畫狀態
  onFrameChange?: (frame: number) => void;
  setPlayer: (player: Object) => void;
  onComplete?: () => void; // <--- 在這裡也新增 onComplete
}> = ({ source, facing, width, height, isPlayer1 = false, state = 'idle', onFrameChange, setPlayer, onComplete }) => {
  if (source.type === 'png') {
    return (
      <PngAnimationPlayer
        source={source}
        facing={facing}
        width={width}
        height={height}
        isPlayer1={isPlayer1}
        state={state}
        onFrameChange={onFrameChange}
        setPlayer={setPlayer}
        onComplete={onComplete} // <--- 將 onComplete 傳遞下去
      />
    );
  } else if (source.type === 'spritesheet') {
    return (
      <SpritesheetAnimationPlayer
        source={source}
        facing={facing}
        width={width}
        height={height}
        isPlayer1={isPlayer1}
      />
    );
  }
  return <div>不支援的動畫類型</div>;
};

export default AnimationPlayer; 