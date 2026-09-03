import Phaser from 'phaser';
import { OrchardView } from '../ui/OrchardView';
import { TopicType } from '../schema/curriculum.schema';
import { audioService } from '../services/audio.service';

export interface OrchardSceneData {
  topic?: TopicType;
  returnTo?: string;
}

export class OrchardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OrchardScene' });
  }

  create(data: OrchardSceneData = {}): void {
    this.cameras.main.setBackgroundColor('#f0fdf4');

    new OrchardView(this, {
      topic: data.topic || 'phonics',
      onSelectLevel: (topic: string, levelNumber: number) => {
        audioService.playClick();
        this.scene.start('GameScene', {
          topic: topic as TopicType,
          levelNumber
        });
      },
      onHome: () => {
        audioService.playClick();
        this.scene.start('MenuScene');
      }
    });
  }
}
