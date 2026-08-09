import * as THREE from 'three';
import { portfolio, PortfolioTab, tabs } from './ARPortfolio';

export type HologramSceneHandle = {
  group: THREE.Group;
  update: (delta: number) => void;
  setVisible: (visible: boolean) => void;
  handlePointer: (event: PointerEvent, camera: THREE.Camera, domElement: HTMLElement) => boolean;
  handleSwipe: (direction: 1 | -1) => void;
};

type ButtonTarget = {
  mesh: THREE.Object3D;
  label: string;
  url?: string;
  tab?: PortfolioTab;
};

const cyan = new THREE.Color('#00f0ff');
const violet = new THREE.Color('#8a7dff');
const dark = new THREE.Color('#06111f');

export function createHologramScene(): HologramSceneHandle {
  const hologramGroup = new THREE.Group();
  hologramGroup.name = 'hologramGroup';
  hologramGroup.position.set(0, 0.45, 0);
  hologramGroup.scale.setScalar(0.72);

  const buttons: ButtonTarget[] = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const fadeTargets: THREE.Material[] = [];
  const particles: THREE.Points[] = [];
  let activeTabIndex = 0;
  let visibleTarget = false;
  let opacity = 0;
  let contentPanel: THREE.Mesh;

  const registerMaterial = <T extends THREE.Material>(material: T) => {
    material.transparent = true;
    fadeTargets.push(material);
    return material;
  };

  const addPanel = (
    width: number,
    height: number,
    position: THREE.Vector3,
    title: string,
    lines: readonly string[],
    accent = cyan,
  ) => {
    const canvas = makePanelCanvas(width, height, title, lines, accent);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    const material = registerMaterial(
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.copy(position);
    hologramGroup.add(mesh);
    return mesh;
  };

  const mainPanel = addPanel(
    1.38,
    1.02,
    new THREE.Vector3(0, 0.1, 0),
    'ARFOLIO',
    ['ISMAIL', 'WEB DEVELOPER', 'UI/UX DESIGNER', portfolio.intro],
  );
  mainPanel.name = 'mainHologram';
  contentPanel = mainPanel;

  const leftChip = addPanel(0.58, 0.82, new THREE.Vector3(-0.98, 0.08, -0.06), 'SKILLS', portfolio.sideSkills, violet);
  leftChip.name = 'skillsChip';
  leftChip.rotation.y = 0.2;

  const rightChip = addPanel(
    0.68,
    0.82,
    new THREE.Vector3(1.04, 0.08, -0.06),
    'FEATURED PROJECTS',
    portfolio.projects.map(([name]) => name),
    violet,
  );
  rightChip.name = 'projectsChip';
  rightChip.rotation.y = -0.2;

  const contactChip = addPanel(
    1.24,
    0.26,
    new THREE.Vector3(0, -0.62, 0.04),
    'CONTACT',
    portfolio.links.map(([label]) => label).join('   ').split('   '),
    cyan,
  );
  contactChip.name = 'contactChip';

  addTabs(buttons, hologramGroup, registerMaterial, () => activeTabIndex, (index) => {
    activeTabIndex = index;
    refreshContent(contentPanel, tabs[activeTabIndex]);
  });
  addContactButtons(buttons, hologramGroup, registerMaterial);
  addLightBeams(hologramGroup, registerMaterial);
  addHudCorners(hologramGroup, registerMaterial);
  particles.push(addParticles(hologramGroup, registerMaterial));
  refreshContent(contentPanel, tabs[activeTabIndex]);

  fadeTargets.forEach((material) => {
    material.opacity = 0;
  });
  hologramGroup.visible = false;

  return {
    group: hologramGroup,
    update(delta: number) {
      opacity = THREE.MathUtils.damp(opacity, visibleTarget ? 1 : 0, 7, delta);
      hologramGroup.visible = opacity > 0.02;
      fadeTargets.forEach((material) => {
        material.opacity = opacity;
      });
      const elapsed = performance.now() * 0.001;
      hologramGroup.children.forEach((child, index) => {
        if (child.name.includes('Chip')) child.position.y += Math.sin(elapsed * 1.4 + index) * 0.0008;
      });
      particles.forEach((cloud) => {
        cloud.rotation.y += delta * 0.28;
      });
    },
    setVisible(visible: boolean) {
      visibleTarget = visible;
    },
    handlePointer(event: PointerEvent, camera: THREE.Camera, domElement: HTMLElement) {
      const rect = domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(buttons.map((button) => button.mesh), true);
      const hit = hits[0]?.object;
      const target = buttons.find((button) => hit && (button.mesh === hit || button.mesh.children.includes(hit)));
      if (!target) return false;
      if (target.tab) {
        activeTabIndex = tabs.indexOf(target.tab);
        refreshContent(contentPanel, target.tab);
      }
      if (target.url) window.open(target.url, '_blank', 'noopener,noreferrer');
      console.log('[AR] Hologram interaction:', target.label);
      return true;
    },
    handleSwipe(direction: 1 | -1) {
      activeTabIndex = (activeTabIndex + direction + tabs.length) % tabs.length;
      refreshContent(contentPanel, tabs[activeTabIndex]);
    },
  };
}

function refreshContent(panel: THREE.Mesh, tab: PortfolioTab) {
  const material = panel.material as THREE.MeshBasicMaterial;
  const oldTexture = material.map;
  const canvas =
    tab === 'about'
      ? makePanelCanvas(1.38, 1.02, 'ARFOLIO', ['ISMAIL', 'WEB DEVELOPER', 'UI/UX DESIGNER', portfolio.intro], cyan)
      : tab === 'skills'
        ? makePanelCanvas(1.38, 1.02, 'SKILLS', portfolio.skills, cyan)
        : tab === 'projects'
          ? makePanelCanvas(
              1.38,
              1.02,
              'PROJECTS',
              portfolio.projects.flatMap(([name, desc]) => [name, desc]),
              cyan,
            )
          : makePanelCanvas(1.38, 1.02, 'CONTACT', portfolio.links.map(([label]) => label), cyan);
  material.map = new THREE.CanvasTexture(canvas);
  material.map.encoding = THREE.sRGBEncoding;
  material.needsUpdate = true;
  oldTexture?.dispose();
}

function makePanelCanvas(width: number, height: number, title: string, lines: readonly string[], accent: THREE.Color) {
  const scale = 640;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const accentCss = `#${accent.getHexString()}`;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, 'rgba(0, 240, 255, 0.2)');
  gradient.addColorStop(0.55, 'rgba(2, 10, 24, 0.48)');
  gradient.addColorStop(1, 'rgba(138, 125, 255, 0.18)');
  roundRect(ctx, 8, 8, w - 16, h - 16, 28);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = accentCss;
  ctx.lineWidth = 4;
  ctx.shadowColor = accentCss;
  ctx.shadowBlur = 24;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  for (let y = 42; y < h - 32; y += 18) {
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(w - 28, y);
    ctx.stroke();
  }
  ctx.fillStyle = accentCss;
  ctx.font = `700 ${Math.max(22, w * 0.052)}px Arial`;
  ctx.fillText(title.toUpperCase(), 34, 60);
  ctx.fillStyle = 'rgba(235, 254, 255, 0.94)';
  lines.forEach((line, index) => {
    const isHeading = index === 0 || (title === 'PROJECTS' && index % 2 === 0);
    ctx.font = `${isHeading ? '700' : '500'} ${Math.max(18, w * (isHeading ? 0.048 : 0.034))}px Arial`;
    ctx.fillStyle = isHeading ? 'rgba(255,255,255,0.96)' : 'rgba(180, 244, 255, 0.86)';
    wrapText(ctx, line.toUpperCase(), 38, 126 + index * (title === 'PROJECTS' ? 46 : 52), w - 78, 31);
  });
  ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
  ctx.fillRect(34, h - 40, w - 68, 2);
  return canvas;
}

function addTabs(
  buttons: ButtonTarget[],
  group: THREE.Group,
  registerMaterial: <T extends THREE.Material>(material: T) => T,
  getActiveIndex: () => number,
  setActiveIndex: (index: number) => void,
) {
  tabs.forEach((tab, index) => {
    const canvas = makeButtonCanvas(tab.toUpperCase());
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    const material = registerMaterial(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.1), material);
    mesh.position.set(-0.48 + index * 0.32, -0.42, 0.03);
    mesh.name = `tab-${tab}`;
    mesh.userData.onPulse = () => getActiveIndex() === index;
    group.add(mesh);
    buttons.push({ mesh, label: tab, tab });
    mesh.userData.select = () => setActiveIndex(index);
  });
}

function addContactButtons(
  buttons: ButtonTarget[],
  group: THREE.Group,
  registerMaterial: <T extends THREE.Material>(material: T) => T,
) {
  portfolio.links.forEach(([label, url], index) => {
    const texture = new THREE.CanvasTexture(makeButtonCanvas(label.toUpperCase()));
    texture.encoding = THREE.sRGBEncoding;
    const material = registerMaterial(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.09), material);
    mesh.position.set(-0.48 + index * 0.32, -0.77, 0.08);
    mesh.name = `contact-${label}`;
    group.add(mesh);
    buttons.push({ mesh, label, url });
  });
}

function addLightBeams(group: THREE.Group, registerMaterial: <T extends THREE.Material>(material: T) => T) {
  const material = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  for (let i = 0; i < 5; i += 1) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1.08), material.clone());
    registerMaterial(beam.material as THREE.Material);
    beam.name = 'lightBeams';
    beam.position.set((i - 2) * 0.18, -0.26, -0.08);
    beam.rotation.z = (i - 2) * 0.04;
    group.add(beam);
  }
  const ringMaterial = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.35, 64), ringMaterial);
  ring.name = 'lightEmitter';
  ring.position.set(0, -0.48, -0.1);
  group.add(ring);
}

function addHudCorners(group: THREE.Group, registerMaterial: <T extends THREE.Material>(material: T) => T) {
  const material = registerMaterial(new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.8 }));
  const points = [
    new THREE.Vector3(-0.74, 0.65, 0.04),
    new THREE.Vector3(-0.58, 0.65, 0.04),
    new THREE.Vector3(-0.74, 0.65, 0.04),
    new THREE.Vector3(-0.74, 0.49, 0.04),
    new THREE.Vector3(0.74, 0.65, 0.04),
    new THREE.Vector3(0.58, 0.65, 0.04),
    new THREE.Vector3(0.74, 0.65, 0.04),
    new THREE.Vector3(0.74, 0.49, 0.04),
  ];
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material);
  lines.name = 'HUDElements';
  group.add(lines);
}

function addParticles(group: THREE.Group, registerMaterial: <T extends THREE.Material>(material: T) => T) {
  const count = 72;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 1.8;
    positions[i * 3 + 1] = Math.random() * 1.15 - 0.48;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.34;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = registerMaterial(
    new THREE.PointsMaterial({
      color: cyan,
      size: 0.018,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const cloud = new THREE.Points(geometry, material);
  cloud.name = 'particles';
  group.add(cloud);
  return cloud;
}

function makeButtonCanvas(label: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 104;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  roundRect(ctx, 8, 8, 304, 88, 16);
  ctx.fillStyle = 'rgba(0, 25, 42, 0.58)';
  ctx.fill();
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eaffff';
  ctx.font = '700 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 160, 52);
  return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  words.forEach((word) => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
