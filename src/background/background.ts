// background.js - Service Worker Entry Point
import { BackgroundManager } from './BackgroundManager';

const manager = new BackgroundManager();
manager.init();
