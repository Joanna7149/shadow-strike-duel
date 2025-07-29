# 音效系統整合說明

## 概述

本系統已成功整合了完整的音效播放功能，支援各角色動作的音效對應，並確保音效與背景音樂獨立播放，不會互相干擾。

## 功能特色

### 1. 音效分類
- **玩家音效**：攻擊、跳躍、受傷、倒地等
- **Boss音效**：根據不同關卡的Boss有不同音效
- **系統音效**：勝利、失敗等遊戲狀態音效
- **背景音樂**：各關卡的BGM，循環播放

### 2. 音效對應表

#### 玩家動作音效
| 動作 | 音效檔案 | 觸發時機 |
|------|----------|----------|
| 拳擊攻擊 | `atk_player_punch_01.wav.mp3` | 按下 J 鍵 |
| 踢擊攻擊 | `atk_player_kick_01.wav.mp3` | 按下 K 鍵 |
| 跳躍 | `atk_player_kick_01.wav.mp3` | 按下 W 鍵 |
| 特殊攻擊 | `atk_player_special_charge.wav.wav` | 按下 L 鍵 |
| 受傷 | `hit_player_light.wav.mp3` | 被敵人攻擊 |
| 倒地 | `hit_player_heavy.wav.mp3` | 血量歸零 |

#### Boss動作音效（根據關卡）
| 關卡 | Boss | 攻擊音效 | 受傷音效 | 特殊攻擊音效 |
|------|------|----------|----------|--------------|
| 第1關 | Boss1_Blake | `atk_boss1_firepunch_01.wav.mp3` | `hit_boss1_heavy.wav.mp3` | `atk_boss1_groundblast.wav.mp3` |
| 第2關 | Boss2_Viss | `atk_boss2_whipstrike_01.mp3` | `hit_boss2_moan_01.wav.mp3` | `atk_boss2_fieldtrap.mp3` |
| 第3關 | Boss3_V | `atk_boss3_beam_blast.wav.mp3` | `hit_boss3_energy_crack.wav.wav` | `atk_boss3_beam_blast.wav.mp3` |

#### 系統音效
| 音效 | 檔案 | 觸發時機 |
|------|------|----------|
| 回合勝利 | `fx_victory_round.mp3` | 擊敗敵人 |
| 最終勝利 | `fx_victory_final.mp3` | 完成所有關卡 |
| 回合失敗 | `fx_defeat_round.mp3` | 被敵人擊敗 |

## 技術實作

### 1. 音效管理器 (soundManager.ts)

```typescript
// 播放玩家動作音效
soundManager.playPlayerAction('punch' | 'kick' | 'jump' | 'special' | 'hit' | 'knockdown');

// 播放Boss動作音效
soundManager.playBossAction('punch' | 'kick' | 'jump' | 'special' | 'hit' | 'knockdown', bossLevel);

// 播放系統音效
soundManager.playSystemSound('victory_round' | 'victory_final' | 'defeat_round');

// 播放背景音樂
soundManager.playBGM(level);
soundManager.stopBGM();
```

### 2. 遊戲邏輯整合

所有動作函數都已整合音效播放：

```typescript
const attackPlayer = () => {
  // 播放攻擊音效
  soundManager.playPlayerAction('punch');
  
  // 遊戲邏輯...
  
  if (命中) {
    // 播放敵人受傷音效
    soundManager.playBossAction('hit', gameState.currentLevel);
  }
};
```

### 3. 音效播放特點

- **獨立播放**：音效與BGM使用不同的Audio實例
- **即時觸發**：動作執行時立即播放對應音效
- **重複支援**：短時間內可重複播放相同音效
- **錯誤處理**：音效播放失敗時會在控制台顯示警告
- **音量控制**：音效音量100%，BGM音量50%

## 測試方法

### 1. 使用測試組件
```typescript
import SoundTest from './components/SoundTest';

// 在開發環境中使用
<SoundTest />
```

### 2. 控制台測試
```javascript
// 在瀏覽器控制台中執行
soundManager.testAllSounds();
```

### 3. 遊戲中測試
- 按下 J 鍵：播放拳擊音效
- 按下 K 鍵：播放踢擊音效
- 按下 W 鍵：播放跳躍音效
- 按下 L 鍵：播放特殊攻擊音效
- 被敵人攻擊：播放受傷音效
- 擊敗敵人：播放勝利音效

## 檔案結構

```
public/Fighting_Game_SFX_Folders/
├── Player/                    # 玩家音效
│   ├── atk_player_punch_01.wav.mp3
│   ├── atk_player_kick_01.wav.mp3
│   ├── atk_player_jumpkick.wav.mp3
│   ├── atk_player_special_charge.wav.wav
│   ├── atk_player_special_hit.wav.mp3
│   ├── hit_player_light.wav.mp3
│   └── hit_player_heavy.wav.mp3
├── Boss1_Blake/              # 第一關Boss音效
├── Boss2_Viss/               # 第二關Boss音效
├── Boss3_V/                  # 第三關Boss音效
├── System/                    # 系統音效
│   ├── fx_victory_round.mp3
│   ├── fx_victory_final.mp3
│   └── fx_defeat_round.mp3
└── BGM/                       # 背景音樂
    ├── bgm_stage1_warehouse_fire.mp3
    ├── bgm_stage2_subway_ruins.mp3
    └── bgm_stage3_void_tower.mp3
```

## 注意事項

1. **瀏覽器相容性**：某些瀏覽器可能需要用戶互動才能播放音效
2. **檔案格式**：支援 .mp3, .wav, .aiff 等格式
3. **檔案路徑**：音效檔案必須放在 public 目錄下
4. **錯誤處理**：音效播放失敗不會影響遊戲進行
5. **性能優化**：音效檔案已進行適當的壓縮處理

## 未來擴展

- 支援音效音量調整
- 添加音效開關功能
- 支援更多音效格式
- 實作音效預載入機制
- 添加環境音效（如腳步聲、環境音等） 