import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import ARStatus from './ARStatus';
import { createHologramScene, HologramSceneHandle } from './HologramScene';

type MindARThreeCtor = new (options: {
  container: HTMLElement;
  imageTargetSrc: string;
  maxTrack?: number;
  filterMinCF?: number;
  filterBeta?: number;
  uiScanning?: 'yes' | 'no';
  uiLoading?: 'yes' | 'no';
  uiError?: 'yes' | 'no';
}) => {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  addAnchor: (targetIndex: number) => {
    group: THREE.Group;
    onTargetFound?: () => void;
    onTargetLost?: () => void;
  };
  start: () => Promise<void>;
  stop: () => void;
};

type MindARModule = {
  MindARThree: MindARThreeCtor;
};

const TARGET_INDEX = 0;

export default function ARExperience() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mindarRef = useRef<InstanceType<MindARThreeCtor> | null>(null);
  const hologramRef = useRef<HologramSceneHandle | null>(null);
  const [status, setStatus] = useState('SEARCHING FOR CARD...');
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function init() {
      const container = containerRef.current;
      if (!container) return;

      const targetSource = `${import.meta.env.BASE_URL}targets.mind`;
      console.log('[AR] Initializing MindAR');
      console.log('[AR] Target source:', targetSource);

      try {
        await assertTargetAvailable(targetSource);
        await requestCameraPermission();
        if (cancelled) return;

        const module = (await import('mind-ar/dist/mindar-image-three.prod.js')) as MindARModule;
        const mindarThree = new module.MindARThree({
          container,
          imageTargetSrc: targetSource,
          maxTrack: 1,
          filterMinCF: 0.0001,
          filterBeta: 0.001,
          uiScanning: 'no',
          uiLoading: 'no',
          uiError: 'no',
        });
        mindarRef.current = mindarThree;

        const { renderer, scene, camera } = mindarThree;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.setClearAlpha(0);
        scene.background = null;

        const ambient = new THREE.AmbientLight(0x88f8ff, 1.8);
        scene.add(ambient);

        const anchor = mindarThree.addAnchor(TARGET_INDEX);
        const hologram = createHologramScene();
        hologramRef.current = hologram;
        anchor.group.add(hologram.group);

        anchor.onTargetFound = () => {
          console.log('[AR] TARGET FOUND');
          hologram.setVisible(true);
          setStatus('HOLOGRAM PROJECTION ONLINE');
          setError(undefined);
        };
        anchor.onTargetLost = () => {
          console.log('[AR] TARGET LOST');
          hologram.setVisible(false);
          setStatus('TARGET LOST - POINT CAMERA AT CARD');
        };

        const clock = new THREE.Clock();
        renderer.setAnimationLoop(() => {
          hologram.update(clock.getDelta());
          renderer.render(scene, camera);
        });

        let touchStartX = 0;
        const onPointerUp = (event: PointerEvent) => {
          hologram.handlePointer(event, camera, renderer.domElement);
        };
        const onTouchStart = (event: TouchEvent) => {
          touchStartX = event.changedTouches[0]?.clientX ?? 0;
        };
        const onTouchEnd = (event: TouchEvent) => {
          const endX = event.changedTouches[0]?.clientX ?? touchStartX;
          const deltaX = endX - touchStartX;
          if (Math.abs(deltaX) > 44) hologram.handleSwipe(deltaX < 0 ? 1 : -1);
        };
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
        renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });

        await mindarThree.start();
        console.log('[AR] Camera started');
        console.log('[AR] MindAR started');
        setStatus('SEARCHING FOR CARD...');

        cleanup = () => {
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          renderer.domElement.removeEventListener('touchstart', onTouchStart);
          renderer.domElement.removeEventListener('touchend', onTouchEnd);
          renderer.setAnimationLoop(null);
          mindarThree.stop();
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'MindAR initialization failed';
        console.error('[AR] Initialization failure:', cause);
        setError(message);
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanup?.();
      mindarRef.current = null;
      hologramRef.current = null;
    };
  }, []);

  return (
    <section className="ar-stage">
      <div ref={containerRef} className="mindar-container" />
      <ARStatus status={status} error={error} />
    </section>
  );
}

async function requestCameraPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('CAMERA UNAVAILABLE');
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    throw new Error('CAMERA ACCESS REQUIRED');
  }
}

async function assertTargetAvailable(targetSource: string) {
  const response = await fetch(targetSource, { method: 'GET', cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    throw new Error('TARGET FILE MISSING: public/targets.mind');
  }
  if (contentType.includes('text/html')) {
    throw new Error('TARGET FILE ROUTED TO HTML INSTEAD OF .mind ASSET');
  }
}
