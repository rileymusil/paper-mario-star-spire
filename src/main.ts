import './ui/style.css';
import { mountStage } from './ui/stage';
import { spriteUrls } from './ui/sprite';
import { App } from './ui/app';

const BACKGROUNDS = ['hills', 'title_art', 'logo'];

function preload(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => undefined);
}

async function boot() {
  const root = document.getElementById('app')!;
  await preload([...spriteUrls(), ...BACKGROUNDS.map((b) => `bg/${b}.png`)]);
  root.innerHTML = '';
  mountStage(root);
  const app = new App();
  app.showTitle();
  if (import.meta.env.DEV) (window as any).app = app;
  // Don't let the page scroll or zoom on touch devices while playing.
  document.addEventListener('touchmove', (e) => {
    if (!(e.target as HTMLElement).closest('.map-scroll, .modal-body, .deckgrid, .specials')) e.preventDefault();
  }, { passive: false });
}

void boot();
