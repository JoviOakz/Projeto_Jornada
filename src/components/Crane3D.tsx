import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LiftAnalysis, LiftInputs } from '../types';

interface Crane3DProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
}

// TODO: a cena é recriada a cada mudança de parâmetro; refatorar para criar uma vez
// e só atualizar as poses dos objetos.
export const Crane3D: React.FC<Crane3DProps> = ({ inputs, analysis }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const { boomLength } = inputs;
  const {
    radius,
    radAngle,
    radRot,
    minPossibleRadius,
    maxPossibleRadius,
    safeRadiusGround,
    warningRadiusGround,
    showOrangeZone,
    isCargoOverSapata,
    cableClipsIntoHaste,
    statusColorHex
  } = analysis;

  useEffect(() => {
    const container = mountRef.current;
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

    // --- ANÉIS TRANSLÚCIDOS DE RAIO NO SOLO (VERDE, LARANJA E VERMELHO) ---
    const groundZoneGroup = new THREE.Group();
    groundZoneGroup.position.set(0, 0.02, -1); // Alinhado com o centro do pino de giro
    scene.add(groundZoneGroup);

    const zoneMaterial = (color: number) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false
      });

    const greenMat = zoneMaterial(0x10b981);  // Operação segura
    const orangeMat = zoneMaterial(0xf97316); // Zona crítica
    const redMat = zoneMaterial(0xef4444);    // Sobrecarga / reprovado

    // Zona Verde (Segura)
    const greenGeo = new THREE.RingGeometry(minPossibleRadius, safeRadiusGround, 64);
    const greenRingMesh = new THREE.Mesh(greenGeo, greenMat);
    greenRingMesh.rotation.x = Math.PI / 2;
    greenRingMesh.name = 'greenRing';
    groundZoneGroup.add(greenRingMesh);

    // Zona Laranja (entre safeRadius e warningRadius)
    if (showOrangeZone) {
      const orangeGeo = new THREE.RingGeometry(
        Math.max(minPossibleRadius, safeRadiusGround),
        warningRadiusGround,
        64
      );
      const orangeRingMesh = new THREE.Mesh(orangeGeo, orangeMat);
      orangeRingMesh.rotation.x = Math.PI / 2;
      orangeRingMesh.name = 'orangeRing';
      groundZoneGroup.add(orangeRingMesh);
    }

    // Zona Vermelha (Sobrecarga)
    const redGeo = new THREE.RingGeometry(
      Math.max(minPossibleRadius, warningRadiusGround),
      maxPossibleRadius,
      64
    );
    const redRingMesh = new THREE.Mesh(redGeo, redMat);
    redRingMesh.rotation.x = Math.PI / 2;
    redRingMesh.name = 'redRing';
    groundZoneGroup.add(redRingMesh);

    // Linha do raio atual no chão
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

    // Indicador de perigo: carga sobre a sapata
    if (isCargoOverSapata) {
      const sapataWarningMesh = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.15, 0.8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      sapataWarningMesh.position.set(0, 0.5, -2);
      sapataWarningMesh.name = 'sapataWarning';
      craneGroup.add(sapataWarningMesh);
    }

    // Indicador de perigo: cabo atravessando a haste
    if (cableClipsIntoHaste) {
      const cableWarningMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, boomLength * 0.3),
        new THREE.MeshBasicMaterial({ color: 0xff6600 })
      );
      cableWarningMesh.position.set(0, 0.5, boomLength * 0.15);
      cableWarningMesh.name = 'cableWarning';
      craneGroup.add(cableWarningMesh);
    }

    // Chassi
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    chassis.position.y = 1;
    chassis.castShadow = true;
    craneGroup.add(chassis);

    // Cabine
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 1.8, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    cab.position.set(0, 2.3, 2.8);
    cab.castShadow = true;
    craneGroup.add(cab);

    // Sapatas estabilizadoras
    const outMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const outFront = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.6), outMat);
    outFront.position.set(0, 0.4, 2);
    outFront.castShadow = true;
    const outRear = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.6), outMat);
    outRear.position.set(0, 0.4, -2);
    outRear.castShadow = true;
    craneGroup.add(outFront, outRear);

    // Mesa de giro (rotação 360°)
    const slewingGroup = new THREE.Group();
    slewingGroup.position.set(0, 1.8, -1);
    craneGroup.add(slewingGroup);

    const baseTurret = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    baseTurret.castShadow = true;
    slewingGroup.add(baseTurret);

    // Pivô de elevação da lança
    const boomPivotGroup = new THREE.Group();
    boomPivotGroup.position.set(0, 0.5, 0);
    slewingGroup.add(boomPivotGroup);

    // Lança telescópica
    const boomMat = new THREE.MeshStandardMaterial({ color: statusColorHex, roughness: 0.3 });
    const baseBoomGeo = new THREE.BoxGeometry(0.8, 0.8, boomLength);
    baseBoomGeo.translate(0, 0, boomLength / 2);
    const boomMesh = new THREE.Mesh(baseBoomGeo, boomMat);
    boomMesh.castShadow = true;
    boomPivotGroup.add(boomMesh);

    // Cabo de aço
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const cableGeo = new THREE.BufferGeometry();
    const cableLine = new THREE.Line(cableGeo, cableMat);
    scene.add(cableLine);

    // Bloco de carga
    const payloadMat = new THREE.MeshStandardMaterial({ color: statusColorHex });
    const payloadMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), payloadMat);
    payloadMesh.castShadow = true;
    scene.add(payloadMesh);

    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Giro de azimute (eixo Y) e elevação da lança (eixo X)
      slewingGroup.rotation.y = radRot;
      boomPivotGroup.rotation.x = -radAngle;

      // Sincronizar cores com o status
      boomMat.color.setHex(statusColorHex);
      payloadMat.color.setHex(statusColorHex);
      currentRadiusLineMat.color.setHex(statusColorHex);

      // Ponta da lança em coordenadas globais
      const tipWorld = new THREE.Vector3(0, 0, boomLength);
      boomMesh.localToWorld(tipWorld);

      // Carga suspensa
      const payloadPos = new THREE.Vector3(tipWorld.x, Math.max(1, tipWorld.y - 4), tipWorld.z);
      payloadMesh.position.copy(payloadPos);

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
    boomLength,
    radius,
    radAngle,
    radRot,
    minPossibleRadius,
    maxPossibleRadius,
    safeRadiusGround,
    warningRadiusGround,
    showOrangeZone,
    isCargoOverSapata,
    cableClipsIntoHaste,
    statusColorHex
  ]);

  return <div className="canvas-wrapper-3d" ref={mountRef} />;
};
