// 音效與 BGM 管理工具

const SFX_PATH = '/Fighting_Game_SFX_Folders';

// 音效對應表
const SFX = {
  player: {
    punch: `${SFX_PATH}/Player/atk_player_punch_01.wav`,
    kick: `${SFX_PATH}/Player/atk_player_kick_01.wav`,
    jumpkick: `${SFX_PATH}/Player/atk_player_jumpkick.wav`,
    jumppunch: `${SFX_PATH}/Player/atk_player_jumppunch.wav`,
    special_charge: `${SFX_PATH}/Player/atk_player_special_charge.wav`,
    special_hit: `${SFX_PATH}/Player/atk_player_special_hit.wav`,
    hit_light: `${SFX_PATH}/Player/hit_player_light.wav`,
    hit_heavy: `${SFX_PATH}/Player/hit_player_heavy.wav`,
  },
  boss1: {
    punch: `${SFX_PATH}/Boss1_Blake/atk_boss1_firepunch_01.wav`,
    combo: `${SFX_PATH}/Boss1_Blake/atk_boss1_combo_blast.wav`,
    dash: `${SFX_PATH}/Boss1_Blake/atk_boss1_dashstrike.wav`,
    groundblast: `${SFX_PATH}/Boss1_Blake/atk_boss1_groundblast.wav`,
    hit: `${SFX_PATH}/Boss1_Blake/hit_boss1_heavy.wav`,
    roar: `${SFX_PATH}/Boss1_Blake/hit_boss1_roar_01.wav`,
  },
  system: {
    victory_round: `${SFX_PATH}/System/fx_victory_round.mp3`,
    victory_final: `${SFX_PATH}/System/fx_victory_final.mp3`,
    defeat_round: `${SFX_PATH}/System/fx_defeat_round.mp3`,
    defeat_final: `${SFX_PATH}/System/fx_defeat_final.mp3`,
  },
  // ...可擴充更多角色/敵人
};

const BGM = [
  `${SFX_PATH}/BGM/bgm_stage1_warehouse_fire.mp3`,
  `${SFX_PATH}/BGM/bgm_stage2_subway_ruins.mp3`,
  `${SFX_PATH}/BGM/bgm_stage3_void_tower.mp3`,
];

let currentBGM: HTMLAudioElement | null = null;

export const soundManager = {
  playSFX(path: string) {
    const audio = new Audio(path);
    audio.volume = 1.0;
    audio.play();
  },
  playSFXByKey(key: keyof typeof SFX['player'] | keyof typeof SFX['boss1'] | keyof typeof SFX['system'], group: 'player' | 'boss1' | 'system' = 'player') {
    const path = SFX[group][key as any];
    if (path) this.playSFX(path);
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
    currentBGM.play();
  },
  stopBGM() {
    if (currentBGM) {
      currentBGM.pause();
      currentBGM.currentTime = 0;
      currentBGM = null;
    }
  }
}; 