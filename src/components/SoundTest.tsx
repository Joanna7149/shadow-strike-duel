import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { soundManager } from '../lib/soundManager';

const SoundTest: React.FC = () => {
  const testPlayerSounds = () => {
    console.log('測試玩家音效...');
    soundManager.playPlayerAction('punch');
    setTimeout(() => soundManager.playPlayerAction('kick'), 500);
    setTimeout(() => soundManager.playPlayerAction('jump'), 1000);
    setTimeout(() => soundManager.playPlayerAction('special'), 1500);
    setTimeout(() => soundManager.playPlayerAction('hit'), 2000);
    setTimeout(() => soundManager.playPlayerAction('knockdown'), 2500);
  };

  const testBossSounds = () => {
    console.log('測試Boss音效...');
    soundManager.playBossAction('punch', 1);
    setTimeout(() => soundManager.playBossAction('hit', 1), 500);
    setTimeout(() => soundManager.playBossAction('special', 1), 1000);
    setTimeout(() => soundManager.playBossAction('punch', 2), 1500);
    setTimeout(() => soundManager.playBossAction('hit', 2), 2000);
    setTimeout(() => soundManager.playBossAction('special', 2), 2500);
    setTimeout(() => soundManager.playBossAction('punch', 3), 3000);
    setTimeout(() => soundManager.playBossAction('hit', 3), 3500);
    setTimeout(() => soundManager.playBossAction('special', 3), 4000);
  };

  const testSystemSounds = () => {
    console.log('測試系統音效...');
    soundManager.playSystemSound('victory_round');
    setTimeout(() => soundManager.playSystemSound('defeat_round'), 1000);
  };

  const testBGM = () => {
    console.log('測試背景音樂...');
    soundManager.playBGM(1);
    setTimeout(() => soundManager.stopBGM(), 5000);
  };

  const testAllSounds = () => {
    soundManager.testAllSounds();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>音效系統測試</CardTitle>
          <CardDescription>
            測試遊戲中所有音效是否正常工作
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={testPlayerSounds} className="w-full">
              測試玩家音效
            </Button>
            <Button onClick={testBossSounds} className="w-full">
              測試Boss音效
            </Button>
            <Button onClick={testSystemSounds} className="w-full">
              測試系統音效
            </Button>
            <Button onClick={testBGM} className="w-full">
              測試背景音樂
            </Button>
          </div>
          
          <div className="pt-4">
            <Button onClick={testAllSounds} className="w-full" variant="outline">
              測試所有音效（完整測試）
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">音效對應說明：</h3>
            <ul className="text-sm space-y-1">
              <li><strong>玩家攻擊：</strong> punch, kick, special</li>
              <li><strong>玩家動作：</strong> jump, hit, knockdown</li>
              <li><strong>Boss攻擊：</strong> punch, kick, special (根據關卡不同)</li>
              <li><strong>Boss動作：</strong> hit, knockdown</li>
              <li><strong>系統音效：</strong> victory_round, defeat_round</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SoundTest; 