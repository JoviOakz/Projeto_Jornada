import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './App.css';

// --- TIPAGEM E TABELAS OFICIAIS DE CARGA ---

type CraneModel = 'MD300L' | 'TM130';
type ViewMode = '3D' | '2D_SIDE' | '2D_TOP';

interface ChartMD300L {
  radii: number[];
  lengths: number[];
  matrix: Record<number, Record<number, number | null>>;
}

interface ChartTM130 {
  angles: number[];
  capacities: Record<number, number>;
}

// Tabela Oficial Madal Palfinger MD 300L (em kgf)
const CHART_MD300L: ChartMD300L = {
  radii: [3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 24.0, 26.0, 28.0],
  lengths: [10.5, 14.1, 17.7, 21.3, 24.9, 28.5, 32.1],
  matrix: {
    10.5: { 3.0: 30000, 3.5: 25000, 4.0: 22900, 4.5: 21000, 5.0: 19200, 6.0: 15500, 7.0: 10500, 8.0: 8000, 9.0: 5500 },
    14.1: { 3.0: 20000, 3.5: 20000, 4.0: 20000, 4.5: 20000, 5.0: 18000, 6.0: 14500, 7.0: 11500, 8.0: 8000, 9.0: 5800, 10.0: 4500, 12.0: 2700 },
    17.7: { 3.0: 16000, 3.5: 16000, 4.0: 16000, 4.5: 16000, 5.0: 15000, 6.0: 13000, 7.0: 10800, 8.0: 7500, 9.0: 5500, 10.0: 4200, 12.0: 2200, 14.0: 1200, 16.0: 500 },
    21.3: { 3.0: 12000, 3.5: 12000, 4.0: 12000, 4.5: 12000, 5.0: 12000, 6.0: 12000, 7.0: 10500, 8.0: 7500, 9.0: 5500, 10.0: 4600, 12.0: 2800, 14.0: 1600, 16.0: 800, 18.0: 300 },
    24.9: { 3.5: 11500, 4.0: 11500, 4.5: 11500, 5.0: 11500, 6.0: 11500, 7.0: 10000, 8.0: 8500, 9.0: 6500, 10.0: 5000, 12.0: 3200, 14.0: 2100, 16.0: 1300, 18.0: 600, 20.0: 250 },
    28.5: { 3.5: 9000, 4.0: 9000, 4.5: 9000, 5.0: 9000, 6.0: 9000, 7.0: 9000, 8.0: 8000, 9.0: 6500, 10.0: 5000, 12.0: 3200, 14.0: 2100, 16.0: 1400, 18.0: 750, 20.0: 400, 22.0: 100 },
    32.1: { 3.5: 7000, 4.0: 7000, 4.5: 7000, 5.0: 7000, 6.0: 7000, 7.0: 7000, 8.0: 6800, 9.0: 6000, 10.0: 5000, 12.0: 3500, 14.0: 2300, 16.0: 1500, 18.0: 1000, 20.0: 500, 22.0: 300 }
  }
};

// Tabela Oficial Luna TM 130
const CHART_TM130: ChartTM130 = {
  angles: [0, 10, 20, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  capacities: {
    0: 3000, 10: 3100, 20: 3200, 30: 3300, 35: 3500, 40: 3800,
    45: 4000, 50: 5100, 55: 6100, 60: 7700, 65: 11200, 70: 20400
  }
};

export const App: React.FC = () => {
  const [model, setModel] = useState<CraneModel>('MD300L');
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [boomLength, setBoomLength] = useState<number>(() => 17.7);
  const [payloadKg, setPayloadKg] = useState<number>(8000);
  const [angle, setAngle] = useState<number>(45);
  const [rotation, setRotation] = useState<number>(45);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  const mount3DRef = useRef<HTMLDivElement | null>(null);
  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);

  // --- MOTOR DE INTERPOLAÇÃO MATEMÁTICA ---
  const interpolateMD300L = useCallback((len: number, r: number): number | null => {
    const row = CHART_MD300L.matrix[len];
    if (!row) return null;

    const availableRadii = CHART_MD300L.radii.filter(rad => row[rad] !== undefined);
    if (availableRadii.length === 0) return null;

    if (r <= availableRadii[0]) return row[availableRadii[0]] ?? null;
    if (r >= availableRadii[availableRadii.length - 1]) return null;

    for (let i = 0; i < availableRadii.length - 1; i++) {
      const r1 = availableRadii[i];
      const r2 = availableRadii[i + 1];
      if (r >= r1 && r <= r2) {
        const c1 = row[r1]!;
        const c2 = row[r2]!;
        const t = (r - r1) / (r2 - r1);
        return c1 + t * (c2 - c1);
      }
    }
    return null;
  }, []);

  const interpolateTM130 = useCallback((ang: number): number => {
    const angles = CHART_TM130.angles;
    if (ang <= angles[0]) return CHART_TM130.capacities[angles[0]];
    if (ang >= angles[angles.length - 1]) return CHART_TM130.capacities[angles[angles.length - 1]];

    for (let i = 0; i < angles.length - 1; i++) {
      const a1 = angles[i];
      const a2 = angles[i + 1];
      if (ang >= a1 && ang <= a2) {
        const c1 = CHART_TM130.capacities[a1];
        const c2 = CHART_TM130.capacities[a2];
        const t = (ang - a1) / (a2 - a1);
        return c1 + t * (c2 - c1);
      }
    }
    return 3000;
  }, []);

  // Telemetria em Tempo Real
  const hookWeight = model === 'MD300L' ? 235 : 150;
  const radAngle = (angle * Math.PI) / 180;
  const radRot = (rotation * Math.PI) / 180;

  const radius = Math.max(1, Number((boomLength * Math.cos(radAngle)).toFixed(2)));
  const hookHeight = Number((boomLength * Math.sin(radAngle) + 2.5).toFixed(2));

  // Coordenadas Tridimensionais (X, Y, Z)
  const coordX = Number((radius * Math.sin(radRot)).toFixed(2));
  const coordY = hookHeight;
  const coordZ = Number((radius * Math.cos(radRot)).toFixed(2));

  const maxCapacityKg = useMemo(() => {
    if (model === 'MD300L') {
      return interpolateMD300L(boomLength, radius);
    } else {
      return interpolateTM130(angle);
    }
  }, [model, boomLength, radius, angle, interpolateMD300L, interpolateTM130]);

  const totalLoadKg = payloadKg + hookWeight;
  const isOutOfChart = maxCapacityKg === null;
  const usagePct = maxCapacityKg ? Math.round((totalLoadKg / maxCapacityKg) * 100) : 100;

  const isOverload = isOutOfChart || usagePct > 100;
  const isWarning = !isOverload && usagePct >= 85;

  // CÁLCULO DO RAIO MÁXIMO SEGURO NO CHÃO PARA A CARGA ATUAL
  const safeRadiusGround = useMemo(() => {
    const minR = Math.max(1, boomLength * Math.cos((70 * Math.PI) / 180));
    const maxR = boomLength * Math.cos((10 * Math.PI) / 180);

    if (model === 'MD300L') {
      // Busca o raio limite onde a capacidade interpolada é igual ao peso total
      let foundLimit = maxR;

      for (let r = minR; r <= maxR; r += 0.2) {
        const cap = interpolateMD300L(boomLength, r);
        if (cap === null || cap < totalLoadKg) {
          foundLimit = r;
          break;
        }
      }
      return Math.max(minR, Math.min(maxR, foundLimit));
    } else {
      // Para TM 130 baseado em ângulo
      const angles = CHART_TM130.angles;
      let minSafeAngle = 70;
      for (const a of angles) {
        if (CHART_TM130.capacities[a] >= totalLoadKg) {
          minSafeAngle = a;
        }
      }
      const rLimit = boomLength * Math.cos((minSafeAngle * Math.PI) / 180);
      return Math.max(minR, Math.min(maxR, rLimit));
    }
  }, [model, boomLength, totalLoadKg, interpolateMD300L]);

  const maxPossibleRadius = boomLength * Math.cos((10 * Math.PI) / 180);
  const minPossibleRadius = Math.max(0.5, boomLength * Math.cos((70 * Math.PI) / 180));

  const statusColorHex = useMemo(() => {
    if (isOutOfChart) return 0x64748b;
    if (isOverload) return 0xef4444;
    if (isWarning) return 0xf59e0b;
    return 0x10b981;
  }, [isOutOfChart, isOverload, isWarning]);

  const statusColorCSS = useMemo(() => {
    if (isOutOfChart) return '#64748b';
    if (isOverload) return '#ef4444';
    if (isWarning) return '#f59e0b';
    return '#10b981';
  }, [isOutOfChart, isOverload, isWarning]);

  // --- AMBIENTE 3D THREE.JS COM ANÉIS DE ZONA NO CHÃO ---
  useEffect(() => {
    if (viewMode !== '3D') return;

    const container = mount3DRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(22, 18, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 3, 0);

    // Luzes
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 40, 20);
    scene.add(dirLight);

    // Grid de Chão
    const gridHelper = new THREE.GridHelper(60, 60, 0x3b82f6, 0x1e293b);
    scene.add(gridHelper);

    // --- ANÉIS TRANSLÚCIDOS DE RAIO NO SOLO (VERDE E VERMELHO) ---
    const groundZoneGroup = new THREE.Group();
    groundZoneGroup.position.set(0, 0.02, -1); // Alinhado com o centro do pino de giro
    scene.add(groundZoneGroup);

    // Material Verde Translúcido
    const greenMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Material Vermelho Translúcido
    const redMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Mesh da Zona Verde (Segura) - Anel entre minRadius e safeRadius
    const greenGeo = new THREE.RingGeometry(minPossibleRadius, safeRadiusGround, 64);
    const greenRingMesh = new THREE.Mesh(greenGeo, greenMat);
    greenRingMesh.rotation.x = Math.PI / 2;
    greenRingMesh.name = 'greenRing';
    groundZoneGroup.add(greenRingMesh);

    // Mesh da Zona Vermelha (Sobrecarga) - Anel entre safeRadius e maxRadius
    const redGeo = new THREE.RingGeometry(Math.max(minPossibleRadius, safeRadiusGround), maxPossibleRadius, 64);
    const redRingMesh = new THREE.Mesh(redGeo, redMat);
    redRingMesh.rotation.x = Math.PI / 2;
    redRingMesh.name = 'redRing';
    groundZoneGroup.add(redRingMesh);

    // Linha de contorno do raio atual no chão (indicador visual fino)
    const currentRadiusLineGeo = new THREE.RingGeometry(radius - 0.08, radius + 0.08, 64);
    const currentRadiusLineMat = new THREE.MeshBasicMaterial({
      color: statusColorHex,
      side: THREE.DoubleSide
    });
    const currentRadiusMesh = new THREE.Mesh(currentRadiusLineGeo, currentRadiusLineMat);
    currentRadiusMesh.rotation.x = Math.PI / 2;
    currentRadiusMesh.name = 'currentRadiusLine';
    groundZoneGroup.add(currentRadiusMesh);

    // --- ESTRUTURA 3D DO GUINDASTE ---
    const craneGroup = new THREE.Group();
    scene.add(craneGroup);

    // Chassi (base do caminhão)
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    chassis.position.y = 1;
    chassis.castShadow = true;
    craneGroup.add(chassis);

    // Cabine (comando)
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 1.8, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    cab.position.set(0, 2.3, 2.8);
    cab.castShadow = true;
    craneGroup.add(cab);

    // Sapatas Estabilizadoras (4 pontas)
    const outMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const outFront = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.6), outMat);
    outFront.position.set(0, 0.4, 2);
    outFront.castShadow = true;
    const outRear = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.6), outMat);
    outRear.position.set(0, 0.4, -2);
    outRear.castShadow = true;
    craneGroup.add(outFront, outRear);

    // Mesa de Giro (slewing unit) - responsável pela rotação 360°
    const slewingGroup = new THREE.Group();
    slewingGroup.position.set(0, 1.8, -1);
    craneGroup.add(slewingGroup);

    const baseTurret = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    baseTurret.castShadow = true;
    slewingGroup.add(baseTurret);

    // Pivô de Elevação da Lança (articulated boom joint)
    const boomPivotGroup = new THREE.Group();
    boomPivotGroup.position.set(0, 0.5, 0);
    slewingGroup.add(boomPivotGroup);

    // Geometria da Lança (telescopic boom) - apontando para o CÉU (+Y em local coords)
    const boomMat = new THREE.MeshStandardMaterial({ color: statusColorHex, roughness: 0.3 });
    const baseBoomGeo = new THREE.BoxGeometry(0.8, 0.8, boomLength);
    baseBoomGeo.translate(0, 0, boomLength / 2);
    const boomMesh = new THREE.Mesh(baseBoomGeo, boomMat);
    boomMesh.castShadow = true;
    boomPivotGroup.add(boomMesh);

    // Cabo de Aço (steel rope/cable)
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const cableGeo = new THREE.BufferGeometry();
    const cableLine = new THREE.Line(cableGeo, cableMat);
    scene.add(cableLine);

    // Bloco de Carga (payload/hook block)
    const payloadMat = new THREE.MeshStandardMaterial({ color: statusColorHex });
    const payloadMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), payloadMat);
    payloadMesh.castShadow = true;
    scene.add(payloadMesh);

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Giro de Azimute (Y-axis rotation da mesa de giro)
      slewingGroup.rotation.y = radRot;
      
      // Elevação da Lança (X-axis rotation do pivô)
      boomPivotGroup.rotation.x = -radAngle;

      // Sincronizar cores com o status (verde/âmbar/vermelho/cinza)
      boomMat.color.setHex(statusColorHex);
      payloadMat.color.setHex(statusColorHex);
      currentRadiusLineMat.color.setHex(statusColorHex);

      // Posição global da ponta da lança (tip of boom)
      const tipWorld = new THREE.Vector3(0, 0, boomLength);
      boomMesh.localToWorld(tipWorld);

      // Posição da carga suspensa (payload hanging below)
      const payloadPos = new THREE.Vector3(tipWorld.x, Math.max(1, tipWorld.y - 4), tipWorld.z);
      payloadMesh.position.copy(payloadPos);

      // Atualizar geometria do cabo
      cableGeo.setFromPoints([tipWorld, payloadPos]);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      greenGeo.dispose();
      redGeo.dispose();
      currentRadiusLineGeo.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    viewMode,
    angle,
    rotation,
    boomLength,
    radius,
    minPossibleRadius,
    maxPossibleRadius,
    safeRadiusGround,
    radAngle,
    radRot,
    statusColorHex
  ]);

  // --- RENDERIZAÇÃO 2D CANVASES (LATERAL & PLANTA) ---
  useEffect(() => {
    if (viewMode === '3D') return;

    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Grid de Fundo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    if (viewMode === '2D_SIDE') {
      const scale = 14;
      const pivotX = 140;
      const pivotY = height - 90;

      // Linha do solo
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(20, pivotY + 30); ctx.lineTo(width - 20, pivotY + 30); ctx.stroke();

      // Chassi
      ctx.fillStyle = '#334155';
      ctx.fillRect(pivotX - 70, pivotY + 5, 140, 20);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(pivotX - 95, pivotY - 15, 25, 40);

      // Sapatas
      ctx.fillStyle = '#64748b';
      ctx.fillRect(pivotX - 60, pivotY + 25, 12, 8);
      ctx.fillRect(pivotX + 48, pivotY + 25, 12, 8);

      // Lança
      const boomPx = boomLength * scale;
      const boomTipX = pivotX + boomPx * Math.cos(radAngle);
      const boomTipY = pivotY - boomPx * Math.sin(radAngle);

      // Linha do Raio
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY + 30); ctx.lineTo(boomTipX, pivotY + 30); ctx.stroke();
      ctx.setLineDash([]);

      // Haste
      ctx.strokeStyle = statusColorCSS;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(boomTipX, boomTipY); ctx.stroke();

      // Cabo e Carga
      const hookPxY = Math.min(pivotY + 10, boomTipY + 70);
      ctx.strokeStyle = statusColorCSS;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(boomTipX, boomTipY); ctx.lineTo(boomTipX, hookPxY); ctx.stroke();

      ctx.fillStyle = statusColorCSS;
      ctx.fillRect(boomTipX - 15, hookPxY, 30, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${(payloadKg / 1000).toFixed(1)}t`, boomTipX, hookPxY + 18);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Raio: ${radius}m`, (pivotX + boomTipX) / 2, pivotY + 25);
      ctx.fillText(`Ângulo: ${angle}°`, pivotX + 30, pivotY - 15);
    } else if (viewMode === '2D_TOP') {
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = 11;

      // Chassi
      ctx.fillStyle = '#334155';
      ctx.fillRect(centerX - 25, centerY - 60, 50, 120);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(centerX - 22, centerY - 60, 44, 25);

      // Sapatas
      ctx.fillStyle = '#64748b';
      ctx.fillRect(centerX - 65, centerY - 45, 130, 10);
      ctx.fillRect(centerX - 65, centerY + 35, 130, 10);

      // Zonas no Chão (Verde e Vermelho em 2D)
      const safePx = safeRadiusGround * scale;
      const maxPx = maxPossibleRadius * scale;

      // Zona Vermelha Externa
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath(); ctx.arc(centerX, centerY, maxPx, 0, Math.PI * 2); ctx.fill();

      // Zona Verde Interna
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.beginPath(); ctx.arc(centerX, centerY, safePx, 0, Math.PI * 2); ctx.fill();

      // Anel do Raio Atual
      const radiusPx = radius * scale;
      ctx.strokeStyle = statusColorCSS;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // Haste
      const boomEndX = centerX + radiusPx * Math.sin(radRot);
      const boomEndY = centerY - radiusPx * Math.cos(radRot);

      ctx.strokeStyle = statusColorCSS;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(boomEndX, boomEndY); ctx.stroke();

      ctx.fillStyle = statusColorCSS;
      ctx.beginPath(); ctx.arc(boomEndX, boomEndY, 10, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`Giro: ${rotation}°`, centerX, centerY - 70);
      ctx.fillText(`Alcance (Raio): ${radius}m`, boomEndX, boomEndY + 22);
    }
  }, [
    viewMode,
    angle,
    rotation,
    boomLength,
    radius,
    safeRadiusGround,
    maxPossibleRadius,
    payloadKg,
    statusColorCSS,
    radAngle,
    radRot
  ]);

  return (
    <div className="app-container">
      {/* Cabeçalho */}
      <header className="header">
        <div className="header-brand">
          <span className="logo-icon">🏗️</span>
          <div>
            <h1>Análise e Planejamento de Içamentos</h1>
            <p>Guindastes Ribas Ltda. — Protótipo de Engenharia Operacional</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setIsReportOpen(true)}>
            📄 Gerar Relatório Técnico
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="main-content">
        {/* Painel Gráfico (Canvas 3D ou 2D Dual) */}
        <section className="canvas-card">
          <div className="card-header">
            {/* Abas para alternar a visão */}
            <div className="view-tabs">
              <button
                className={viewMode === '3D' ? 'active' : ''}
                onClick={() => setViewMode('3D')}
              >
                🌐 Visão 3D WebGL (Com Zonas no Chão)
              </button>
              <button
                className={viewMode === '2D_SIDE' ? 'active' : ''}
                onClick={() => setViewMode('2D_SIDE')}
              >
                📐 2D Vista Lateral
              </button>
              <button
                className={viewMode === '2D_TOP' ? 'active' : ''}
                onClick={() => setViewMode('2D_TOP')}
              >
                🔍 2D Vista Superior (Planta)
              </button>
            </div>
            <span className="instruction-badge">
              {viewMode === '3D'
                ? '🟢 Verde = Operação Permitida | 🔴 Vermelho = Sobrecarga'
                : viewMode === '2D_SIDE'
                ? '📐 Elevação da Lança'
                : '🔍 Planta de Raio no Solo'}
            </span>
          </div>

          {/* Container Ativo */}
          {viewMode === '3D' ? (
            <div className="canvas-wrapper-3d" ref={mount3DRef} />
          ) : (
            <div className="canvas-wrapper-2d">
              <canvas ref={canvas2DRef} width={720} height={460} className="crane-canvas-2d" />
            </div>
          )}
        </section>

        {/* Sidebar de Parâmetros e Telemetria */}
        <section className="controls-sidebar">
          {/* Seletor do Modelo */}
          <div className="control-group">
            <label className="group-title">Modelo do Guindaste</label>
            <div className="button-toggle">
              <button
                className={model === 'MD300L' ? 'active' : ''}
                onClick={() => setModel('MD300L')}
              >
                Madal Palfinger MD 300L (30t)
              </button>
              <button
                className={model === 'TM130' ? 'active' : ''}
                onClick={() => setModel('TM130')}
              >
                Luna TM 130 (26t)
              </button>
            </div>
          </div>

          {/* Comprimento da Lança */}
          {model === 'MD300L' && (
            <div className="control-group">
              <label className="group-title">Comprimento da Lança (m)</label>
              <select
                value={boomLength}
                onChange={(e) => setBoomLength(Number(e.target.value))}
                className="select-input"
              >
                {CHART_MD300L.lengths.map((len) => (
                  <option key={len} value={len}>
                    {len} metros
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Slider de Ângulo de Elevação */}
          <div className="control-group">
            <div className="label-with-value">
              <label className="group-title">Ângulo de Elevação (°) :</label>
              <span className="value-badge">{angle}°</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="slider-input"
            />
          </div>

          {/* Slider de Giro de Azimute */}
          <div className="control-group">
            <div className="label-with-value">
              <label className="group-title">Giro de Azimute (°) :</label>
              <span className="value-badge">{rotation}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="slider-input"
            />
          </div>

          {/* Peso da Carga */}
          <div className="control-group">
            <label className="group-title">Peso Içado na Carga (kg)</label>
            <input
              type="number"
              step="500"
              min="500"
              max="35000"
              value={payloadKg}
              onChange={(e) => setPayloadKg(Number(e.target.value))}
              className="number-input"
            />
          </div>

          {/* Telemetria e Envelope de Segurança */}
          <div className="telemetry-card">
            <h3>Telemetria & Envelope Operacional</h3>
            <div className="telemetry-grid">
              <div className="telemetry-item">
                <span className="telemetry-label">Raio (R)</span>
                <span className="telemetry-value">{radius} m</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Altura (H)</span>
                <span className="telemetry-value">{hookHeight} m</span>
              </div>
              <div className="telemetry-item full-width">
                <span className="telemetry-label">Raio Máximo Seguro no Solo</span>
                <span className="telemetry-value text-green">{safeRadiusGround.toFixed(1)} m</span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Capacidade Máxima</span>
                <span className="telemetry-value">
                  {maxCapacityKg ? `${maxCapacityKg.toLocaleString()} kg` : 'N/A'}
                </span>
              </div>
              <div className="telemetry-item">
                <span className="telemetry-label">Carga Total Suspensa</span>
                <span className="telemetry-value">{totalLoadKg.toLocaleString()} kg</span>
              </div>
            </div>

            {/* Barra de Progresso com Limite Normativo de 85% */}
            <div className="progress-box">
              <div className="progress-labels">
                <span>Taxa de Utilização:</span>
                <span className={isOverload ? 'text-red' : isWarning ? 'text-amber' : 'text-green'}>
                  {isOutOfChart ? 'Fora de Tabela' : `${usagePct}%`}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${isOverload ? 'bg-red' : isWarning ? 'bg-amber' : 'bg-green'}`}
                  style={{ width: `${Math.min(100, usagePct)}%` }}
                />
                <div className="normative-line" style={{ left: '85%' }} title="Limite Normativo 85% (RN01)" />
              </div>
              <div className="progress-footer">
                <span>0%</span>
                <span className="marker-85">85% Norma</span>
                <span>100% Máx</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Matriz Dinâmica da Tabela Oficial do Fabricante */}
      <footer className="table-section">
        <div className="card-header">
          <h2>Tabela Oficial de Cargas ({model === 'MD300L' ? 'MD 300L' : 'Luna TM 130'})</h2>
          <span className="legend-badge">Célula ativa iluminada dinamicamente conforme a geometria</span>
        </div>

        <div className="table-wrapper">
          {model === 'MD300L' ? (
            <table className="load-chart-table">
              <thead>
                <tr>
                  <th>Raio (m) \ Lança (m)</th>
                  {CHART_MD300L.lengths.map((len) => (
                    <th key={len} className={len === boomLength ? 'col-highlight' : ''}>
                      {len} m
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHART_MD300L.radii.map((rad) => (
                  <tr key={rad}>
                    <td className="row-header">{rad.toFixed(1)} m</td>
                    {CHART_MD300L.lengths.map((len) => {
                      const val = CHART_MD300L.matrix[len]?.[rad];
                      const isActive = len === boomLength && Math.abs(rad - radius) < 0.6;
                      return (
                        <td
                          key={len}
                          className={`cell-value ${isActive ? (isOverload ? 'active-overload' : isWarning ? 'active-warning' : 'active-safe') : ''}`}
                        >
                          {val ? `${(val / 1000).toFixed(1)}t` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="load-chart-table">
              <thead>
                <tr>
                  <th>Ângulo da Lança (°)</th>
                  {CHART_TM130.angles.map((ang) => (
                    <th key={ang} className={Math.abs(ang - angle) <= 2.5 ? 'col-highlight' : ''}>
                      {ang}°
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="row-header">Capacidade (kg)</td>
                  {CHART_TM130.angles.map((ang) => {
                    const val = CHART_TM130.capacities[ang];
                    const isActive = Math.abs(ang - angle) <= 2.5;
                    return (
                      <td
                        key={ang}
                        className={`cell-value ${isActive ? (isOverload ? 'active-overload' : isWarning ? 'active-warning' : 'active-safe') : ''}`}
                      >
                        {val ? `${val.toLocaleString()} kg` : '-'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </footer>

      {/* Modal de Relatório Técnico */}
      {isReportOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Relatório Técnico de Viabilidade de Içamento</h2>
              <button className="close-btn" onClick={() => setIsReportOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Empresa Parceira:</strong> Guindastes Ribas Ltda.</p>
              <p><strong>Equipamento Selecionado:</strong> {model === 'MD300L' ? 'Madal Palfinger MD 300L' : 'Luna TM 130'}</p>
              <hr />
              <div className="report-grid">
                <div><strong>Comprimento da Lança:</strong> {boomLength} m</div>
                <div><strong>Ângulo de Elevação:</strong> {angle}°</div>
                <div><strong>Giro de Azimute:</strong> {rotation}°</div>
                <div><strong>Raio de Operação:</strong> {radius} m</div>
                <div><strong>Raio Máximo Seguro no Solo:</strong> {safeRadiusGround.toFixed(1)} m</div>
                <div><strong>Altura do Gancho:</strong> {hookHeight} m</div>
                <div><strong>Coordenadas 3D:</strong> X={coordX}m, Y={coordY}m, Z={coordZ}m</div>
                <div><strong>Carga Suspensa Total:</strong> {totalLoadKg.toLocaleString()} kg</div>
                <div><strong>Capacidade Máxima Permitida:</strong> {maxCapacityKg ? `${maxCapacityKg.toLocaleString()} kg` : 'N/A'}</div>
                <div><strong>Taxa de Utilização:</strong> {usagePct}%</div>
              </div>
              <hr />
              <div className={`status-box ${isOverload ? 'status-red' : 'status-green'}`}>
                STATUS FINAL DE OPERAÇÃO: {isOverload ? 'REPROVADO / SOBRECARGA' : 'APROVADO COM SEGURANÇA'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => window.print()}>🖨️ Imprimir PDF</button>
              <button className="btn-primary" onClick={() => setIsReportOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;