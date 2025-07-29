// 音效與 BGM 管理工具

const SFX_PATH = '/Fighting_Game_SFX_Folders';

// 音效對應表
const SFX = {
  player: {
    punch: `${SFX_PATH}/Player/atk_player_punch_01.wav.mp3`,
    kick: `${SFX_PATH}/Player/atk_player_kick_01.wav.mp3`,
    jumpkick: `${SFX_PATH}/Player/atk_player_jumpkick.wav.mp3`,
    special_charge: `${SFX_PATH}/Player/atk_player_special_charge.wav.wav`,
    special_hit: `${SFX_PATH}/Player/atk_player_special_hit.wav.mp3`,
    hit_light: `${SFX_PATH}/Player/hit_player_light.wav.mp3`,
    hit_heavy: `${SFX_PATH}/Player/hit_player_heavy.wav.mp3`,
    // 跳躍音效（使用攻擊音效作為跳躍音效）
    jump: `${SFX_PATH}/Player/atk_player_kick_01.wav.mp3`,
    // 倒地音效（使用重擊音效）
    knockdown: `${SFX_PATH}/Player/hit_player_heavy.wav.mp3`,
  },
  boss1: {
    punch: `${SFX_PATH}/Boss1_Blake/atk_boss1_firepunch_01.wav.mp3`,
    combo: `${SFX_PATH}/Boss1_Blake/atk_boss1_combo_blast.wav.mp3`,
    dash: `${SFX_PATH}/Boss1_Blake/atk_boss1_dashstrike.wav.mp3`,
    groundblast: `${SFX_PATH}/Boss1_Blake/atk_boss1_groundblast.wav.mp3`,
    hit: `${SFX_PATH}/Boss1_Blake/hit_boss1_heavy.wav.mp3`,
    roar: `${SFX_PATH}/Boss1_Blake/hit_boss1_roar_01.wav.mp3`,
    // 跳躍音效
    jump: `${SFX_PATH}/Boss1_Blake/atk_boss1_dashstrike.wav.mp3`,
    // 倒地音效
    knockdown: `${SFX_PATH}/Boss1_Blake/hit_boss1_roar_01.wav.mp3`,
  },
  boss2: {
    whipstrike: `${SFX_PATH}/Boss2_Viss/atk_boss2_whipstrike_01.mp3`,
    whip_wrap: `${SFX_PATH}/Boss2_Viss/atk_boss2_whip_wrap.mp3`,
    venom_shot: `${SFX_PATH}/Boss2_Viss/atk_boss2_venom_shot.mp3`,
    fieldtrap: `${SFX_PATH}/Boss2_Viss/atk_boss2_fieldtrap.mp3`,
    hit: `${SFX_PATH}/Boss2_Viss/hit_boss2_moan_01.wav.mp3`,
    scale_break: `${SFX_PATH}/Boss2_Viss/hit_boss2_scale_break.wav`,
    jump: `${SFX_PATH}/Boss2_Viss/atk_boss2_whipstrike_01.mp3`,
    knockdown: `${SFX_PATH}/Boss2_Viss/hit_boss2_scale_break.wav`,
  },
  boss3: {
    beam_blast: `${SFX_PATH}/Boss3_V/atk_boss3_beam_blast.wav.mp3`,
    energyfield: `${SFX_PATH}/Boss3_V/atk_boss3_energyfield.wav.wav`,
    summon_avatar: `${SFX_PATH}/Boss3_V/atk_boss3_summon_avatar.wav.aiff`,
    teleport: `${SFX_PATH}/Boss3_V/atk_boss3_teleport.wav.wav`,
    hit: `${SFX_PATH}/Boss3_V/hit_boss3_energy_crack.wav.wav`,
    jump: `${SFX_PATH}/Boss3_V/atk_boss3_teleport.wav.wav`,
    knockdown: `${SFX_PATH}/Boss3_V/hit_boss3_energy_crack.wav.wav`,
  },
  system: {
    victory_round: `${SFX_PATH}/System/fx_victory_round.mp3`,
    victory_final: `${SFX_PATH}/System/fx_victory_final.mp3`,
    defeat_round: `${SFX_PATH}/System/fx_defeat_round.mp3`,
  },
};

const BGM = [
  `${SFX_PATH}/BGM/bgm_stage1_warehouse_fire.mp3`,
  `${SFX_PATH}/BGM/bgm_stage2_subway_ruins.mp3`,
  `${SFX_PATH}/BGM/bgm_stage3_void_tower.mp3`,
];

let currentBGM: HTMLAudioElement | null = null;

// 音效類型定義
type PlayerSFXKey = keyof typeof SFX['player'];
type Boss1SFXKey = keyof typeof SFX['boss1'];
type Boss2SFXKey = keyof typeof SFX['boss2'];
type Boss3SFXKey = keyof typeof SFX['boss3'];
type SystemSFXKey = keyof typeof SFX['system'];

export const soundManager = {
  playSFX(path: string) {
    const audio = new Audio(path);
    audio.volume = 1.0;
    audio.play().catch(err => console.warn('音效播放失敗:', err));
  },
  
  playSFXByKey(
    key: PlayerSFXKey | Boss1SFXKey | Boss2SFXKey | Boss3SFXKey | SystemSFXKey, 
    group: 'player' | 'boss1' | 'boss2' | 'boss3' | 'system' = 'player'
  ) {
    const path = SFX[group][key as any];
    if (path) {
      this.playSFX(path);
    } else {
      console.warn(`找不到音效: ${group}.${key}`);
    }
  },

  // 角色動作音效播放函數
  playPlayerAction(action: 'punch' | 'kick' | 'jump' | 'special' | 'hit' | 'knockdown') {
    switch (action) {
      case 'punch':
        this.playSFXByKey('punch', 'player');
        break;
      case 'kick':
        this.playSFXByKey('kick', 'player');
        break;
      case 'jump':
        this.playSFXByKey('jump', 'player');
        break;
      case 'special':
        this.playSFXByKey('special_charge', 'player');
        break;
      case 'hit':
        this.playSFXByKey('hit_light', 'player');
        break;
      case 'knockdown':
        this.playSFXByKey('knockdown', 'player');
        break;
    }
  },

  playBossAction(action: 'punch' | 'kick' | 'jump' | 'special' | 'hit' | 'knockdown', bossLevel: number = 1) {
    const bossGroup = `boss${bossLevel}` as 'boss1' | 'boss2' | 'boss3';
    
    switch (action) {
      case 'punch':
        this.playSFXByKey('punch', bossGroup);
        break;
      case 'kick':
        this.playSFXByKey('dash', bossGroup); // 使用dash作為kick音效
        break;
      case 'jump':
        this.playSFXByKey('jump', bossGroup);
        break;
      case 'special':
        if (bossLevel === 1) this.playSFXByKey('groundblast', bossGroup);
        else if (bossLevel === 2) this.playSFXByKey('fieldtrap', bossGroup);
        else if (bossLevel === 3) this.playSFXByKey('beam_blast', bossGroup);
        break;
      case 'hit':
        this.playSFXByKey('hit', bossGroup);
        break;
      case 'knockdown':
        this.playSFXByKey('knockdown', bossGroup);
        break;
    }
  },

  playSystemSound(sound: 'victory_round' | 'victory_final' | 'defeat_round') {
    this.playSFXByKey(sound, 'system');
  },

  // 測試所有音效是否正常
  testAllSounds() {
    console.log('開始測試所有音效...');
    
    // 測試玩家音效
    setTimeout(() => this.playPlayerAction('punch'), 100);
    setTimeout(() => this.playPlayerAction('kick'), 500);
    setTimeout(() => this.playPlayerAction('jump'), 900);
    setTimeout(() => this.playPlayerAction('special'), 1300);
    setTimeout(() => this.playPlayerAction('hit'), 1700);
    setTimeout(() => this.playPlayerAction('knockdown'), 2100);
    
    // 測試Boss音效
    setTimeout(() => this.playBossAction('punch', 1), 2500);
    setTimeout(() => this.playBossAction('hit', 1), 2900);
    setTimeout(() => this.playBossAction('special', 1), 3300);
    setTimeout(() => this.playBossAction('punch', 2), 3700);
    setTimeout(() => this.playBossAction('hit', 2), 4100);
    setTimeout(() => this.playBossAction('special', 2), 4500);
    setTimeout(() => this.playBossAction('punch', 3), 4900);
    setTimeout(() => this.playBossAction('hit', 3), 5300);
    setTimeout(() => this.playBossAction('special', 3), 5700);
    
    // 測試系統音效
    setTimeout(() => this.playSystemSound('victory_round'), 6100);
    setTimeout(() => this.playSystemSound('defeat_round'), 6500);
    
    console.log('音效測試完成！');
  },

  playBGM(level: number) {
    if (currentBGM) {
      currentBGM.pause();
      currentBGM.currentTime = 0;
    }
    const bgmPath = BGM[level - 1] || BGM[0];
    currentBGM = new Audio(bgmPath);
    currentBGM.loop = true;
    currentBGM.volume = 0.5;
    currentBGM.play().catch(err => console.warn('BGM播放失敗:', err));
  },
  
  stopBGM() {
    if (currentBGM) {
      currentBGM.pause();
      currentBGM.currentTime = 0;
      currentBGM = null;
    }
  }
}; 