# 動畫系統架構說明

## 🎯 系統目標

建立一個支援兩種動畫來源格式的統一動畫系統：
1. **PNG 逐格圖片**：多張獨立圖片輪播（使用原本的 statics 目錄）
2. **Spritesheet**：單一圖片 + JSON 切圖

## 🏗️ 架構設計

### 核心組件

#### 1. AnimationPlayer 組件
```typescript
const AnimationPlayer: React.FC<{
  source: AnimationSource;
  facing: 'left' | 'right';
  width: number;
  height: number;
  isPlayer1?: boolean;
  state?: string;
}> = ({ ... }) => { ... }
```

#### 2. 動畫來源類型定義
```typescript
type AnimationSource = {
  type: 'png' | 'spritesheet';
  path: string;
  frameCount?: number;  // 可選，系統會自動檢測
  frameRate: number;
  state?: string; // spritesheet 模式用於指定動畫狀態
};
```

### 子組件

#### PngAnimationPlayer
- 使用動態 import 載入 src./statics 目錄下的 PNG 圖片
- 自動檢測動畫幀數
- 支援自動循環播放
- 支援翻轉方向

#### SpritesheetAnimationPlayer
- 使用 Pixi.js 載入和播放 Spritesheet
- 支援 JSON 格式的 frame 資料
- 自動切圖和動畫播放

## 📁 檔案結構

```
src/
├── components/
│   ├── AnimationPlayer.tsx     # 主要動畫播放器
│   └── FightingGame.tsx        # 遊戲主組件
└── statics/characters/MainHero/animations/
    ├── idle/                   # 待機動畫 (13幀)
    ├── walk_forward/           # 前進動畫 (8幀)
    ├── walk_backward/          # 後退動畫 (8幀)
    ├── punch/                  # 攻擊動畫 (15幀)
    ├── kick/                   # 踢擊動畫 (12幀)
    ├── jump/                   # 跳躍動畫 (10幀)
    ├── crouch/                 # 蹲下動畫 (1幀)
    ├── crouch_punch/           # 蹲下攻擊 (6幀)
    ├── crouch_kick/            # 蹲下踢擊 (5幀)
    ├── defend/                 # 防禦動畫 (1幀)
    ├── hit/                    # 受傷動畫 (7幀)
    ├── special_attack/         # 特殊攻擊 (17幀)
    ├── win_round/              # 勝利動畫 (12幀)
    ├── dead/                   # 死亡動畫 (10幀)
    ├── jump_punch/             # 跳躍攻擊 (15幀)
    ├── jump_kick/              # 跳躍踢擊 (7幀)
    ├── texture.png             # Spritesheet 圖片
    └── texture.json            # Spritesheet 資料
```

## 🔧 使用方法

### 1. 基本使用

```typescript
// PNG 模式（自動檢測幀數）
const pngSource: AnimationSource = {
  type: 'png',
  path: 'idle',
  frameRate: 10
};

// Spritesheet 模式
const spritesheetSource: AnimationSource = {
  type: 'spritesheet',
  path: '/src./statics/characters/MainHero/animations/',
  frameRate: 10,
  state: 'idle'
};

// 在組件中使用
<AnimationPlayer
  source={pngSource}
  facing="right"
  width={200}
  height={500}
  isPlayer1={true}
  state="idle"
/>
```

### 2. 動態動畫切換

```typescript
// 在 FightingGame 中使用動態配置
const animationSource = getAnimationSource(player.state);
<AnimationPlayer
  source={animationSource}
  facing={player.facing}
  state={player.state}
  width={CHARACTER_WIDTH}
  height={CHARACTER_HEIGHT}
  isPlayer1={true}
/>
```

## ⚙️ 配置系統

### 動畫配置物件
```typescript
const ANIMATION_CONFIGS = {
  png: {
    idle: { type: 'png', path: 'idle', frameRate: 10 },
    walk: { type: 'png', path: 'walk_forward', frameRate: 12 },
    walk_forward: { type: 'png', path: 'walk_forward', frameRate: 12 },
    walk_backward: { type: 'png', path: 'walk_backward', frameRate: 12 },
    punch: { type: 'png', path: 'punch', frameRate: 15 },
    kick: { type: 'png', path: 'kick', frameRate: 15 },
    jump: { type: 'png', path: 'jump', frameRate: 12 },
    crouch: { type: 'png', path: 'crouch', frameRate: 10 },
    crouch_punch: { type: 'png', path: 'crouch_punch', frameRate: 15 },
    crouch_kick: { type: 'png', path: 'crouch_kick', frameRate: 15 },
    defend: { type: 'png', path: 'defend', frameRate: 10 },
    hit: { type: 'png', path: 'hit', frameRate: 12 },
    special_attack: { type: 'png', path: 'special_attack', frameRate: 15 },
    win_round: { type: 'png', path: 'win_round', frameRate: 10 },
    dead: { type: 'png', path: 'dead', frameRate: 10 },
    jump_punch: { type: 'png', path: 'jump_punch', frameRate: 15 },
    jump_kick: { type: 'png', path: 'jump_kick', frameRate: 15 },
    // 別名映射
    attacking: { type: 'png', path: 'punch', frameRate: 15 },
    defending: { type: 'png', path: 'defend', frameRate: 10 },
    crouching: { type: 'png', path: 'crouch', frameRate: 10 },
    special: { type: 'png', path: 'special_attack', frameRate: 15 },
    victory: { type: 'png', path: 'win_round', frameRate: 10 },
    death: { type: 'png', path: 'dead', frameRate: 10 }
  },
  spritesheet: {
    type: 'spritesheet',
    path: '/src./statics/characters/MainHero/animations/',
    frameRate: 10
  }
};
```

### 動態獲取動畫來源
```typescript
function getAnimationSource(state: string, useSpritesheet: boolean = false): AnimationSource {
  if (useSpritesheet) {
    return { ...ANIMATION_CONFIGS.spritesheet, state: state };
  } else {
    const pngConfig = ANIMATION_CONFIGS.png[state];
    return pngConfig || ANIMATION_CONFIGS.png.idle;
  }
}
```

## 🎮 支援的動畫狀態

### 主要動畫狀態
- **idle**: 待機動畫 (13幀)
- **walk_forward**: 前進動畫 (8幀)
- **walk_backward**: 後退動畫 (8幀)
- **punch**: 攻擊動畫 (15幀)
- **kick**: 踢擊動畫 (12幀)
- **jump**: 跳躍動畫 (10幀)
- **crouch**: 蹲下動畫 (1幀)
- **crouch_punch**: 蹲下攻擊 (6幀)
- **crouch_kick**: 蹲下踢擊 (5幀)
- **defend**: 防禦動畫 (1幀)
- **hit**: 受傷動畫 (7幀)
- **special_attack**: 特殊攻擊 (17幀)
- **win_round**: 勝利動畫 (12幀)
- **dead**: 死亡動畫 (10幀)
- **jump_punch**: 跳躍攻擊 (15幀)
- **jump_kick**: 跳躍踢擊 (7幀)

### 別名映射
- **walk** → walk_forward
- **attacking** → punch
- **defending** → defend
- **crouching** → crouch
- **special** → special_attack
- **victory** → win_round
- **death** → dead

## 🔄 切換動畫格式

### 從 PNG 切換到 Spritesheet
```typescript
// 修改 getAnimationSource 調用
const animationSource = getAnimationSource(player.state, true); // 第二個參數設為 true
```

### 從 Spritesheet 切換到 PNG
```typescript
// 修改 getAnimationSource 調用
const animationSource = getAnimationSource(player.state, false); // 第二個參數設為 false
```

## ✨ 特色功能

### 自動幀數檢測
- 系統會自動檢測每個動畫資料夾中的幀數
- 無需手動配置 frameCount
- 支援動態添加新的動畫幀

### 動態載入
- 使用 ES6 動態 import 載入圖片
- 支援 Vite 的靜態資源處理
- 自動錯誤處理和重試

### 靈活配置
- 支援 PNG 和 Spritesheet 兩種模式
- 可以隨時切換動畫格式
- 統一的 API 介面

## 🐛 故障排除

### 常見問題

1. **圖片載入失敗**
   - 檢查路徑是否正確
   - 確認圖片檔案存在於 src./statics 目錄
   - 檢查瀏覽器 console 錯誤

2. **動畫不播放**
   - 檢查 frameRate 設定
   - 確認動畫狀態對應關係
   - 查看自動檢測的幀數是否正確

3. **Pixi.js 錯誤**
   - 確認 Pixi.js 版本 (v8)
   - 檢查 texture.json 格式
   - 確認 frame key 命名規則

### 調試技巧

1. **啟用 Console Log**
   ```typescript
   // 系統會自動輸出檢測到的幀數
   console.log(`Detected ${detectedMaxFrames} frames for ${source.path}`);
   ```

2. **檢查檔案載入**
   ```typescript
   // 在瀏覽器 Network 標籤檢查圖片載入狀況
   ```

3. **驗證動畫狀態**
   ```typescript
   // 檢查動畫狀態對應
   console.log('Current animation state:', player.state);
   console.log('Animation source:', getAnimationSource(player.state));
   ```

## 🚀 未來擴展

1. **支援更多動畫格式**
   - WebP 動畫
   - GIF 動畫
   - 影片動畫

2. **優化功能**
   - 動畫預載入
   - 記憶體管理
   - 效能優化

3. **開發工具**
   - 動畫預覽器
   - 配置編輯器
   - 除錯工具

4. **更多動畫狀態**
   - 連擊動畫
   - 特殊效果動畫
   - 表情動畫 