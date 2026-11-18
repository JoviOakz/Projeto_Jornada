import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LiftAnalysis, LiftInputs } from '../types';
import { degToRad } from '../lib/geometry';
import { padHits } from '../lib/sapatas';
import { CARGO_HALF_SIZE_M, PAD_HALF_SIZE_M, VEHICLE_LAYOUT } from '../data/craneSpecs';
import { computeBoomSegments } from '../lib/boom';

interface Crane3DProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
}

// TODO: a cena é recriada a cada mudança de parâmetro; refatorar para criar uma vez
// e só atualizar as poses dos objetos.
export const Crane3D: React.FC<Crane3DProps> = ({ inputs, analysis }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const { model, boomLength, cableLength } = inputs;
  const { radius, radAngle, radRot, zones, statusColorHex } = analysis;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const layout = VEHICLE_LAYOUT[model];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(36, 30, 44);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 7, 3);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 40, 20);
    scene.add(dirLight);
    scene.add(new THREE.GridHelper(90, 90, 0x3b82f6, 0x1e293b));

    // --- ZONAS NO SOLO (um conjunto por setor; a área junto à base fica sem cor) ---
    // Azimute ψ (0° = +Z, cresce para +X) => ângulo do RingGeometry φ = 90° - ψ.
    const zoneGroup = new THREE.Group();
    zoneGroup.position.y = 0.02;
    scene.add(zoneGroup);

    const addRing = (r0: number, r1: number, startDeg: number, endDeg: number, color: number, opacity: number) => {
      if (r1 - r0 < 0.02) return;
      const len = degToRad(endDeg - startDeg);
      const segs = Math.max(8, Math.round((64 * len) / (Math.PI * 2)));
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(r0, r1, segs, 1, Math.PI / 2 - degToRad(endDeg), len),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
      );
      mesh.rotation.x = Math.PI / 2;
      zoneGroup.add(mesh);
    };

    zones.forEach((z) => {
      addRing(z.minR, z.safeR, z.startDeg, z.endDeg, 0x10b981, 0.28);
      if (z.showOrange) addRing(z.safeR, z.warnR, z.startDeg, z.endDeg, 0xf97316, 0.28);
      addRing(Math.max(z.minR, z.warnR), z.maxR, z.startDeg, z.endDeg, 0xef4444, 0.28);
    });

    // Anel do raio atual (no setor ativo)
    const activeZone = analysis.activeZone;
    const lineLen = degToRad(activeZone.endDeg - activeZone.startDeg);
    const currentRadiusMat = new THREE.MeshBasicMaterial({ color: statusColorHex, side: THREE.DoubleSide });
    const currentRadiusMesh = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.08, radius + 0.08, 96, 1, Math.PI / 2 - degToRad(activeZone.endDeg), lineLen),
      currentRadiusMat
    );
    currentRadiusMesh.rotation.x = Math.PI / 2;
    zoneGroup.add(currentRadiusMesh);

    // --- VEÍCULO (origem = eixo de giro) ---
    const craneGroup = new THREE.Group();
    scene.add(craneGroup);

    const chassisLen = layout.cabStartZ - layout.rearZ;
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(layout.bodyHalfWidth * 2, 1.0, chassisLen),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    chassis.position.set(0, 1.1, (layout.cabStartZ + layout.rearZ) / 2);
    craneGroup.add(chassis);

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(layout.bodyHalfWidth * 2 - 0.1, 1.9, layout.frontZ - layout.cabStartZ),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    cab.position.set(0, 1.9, (layout.frontZ + layout.cabStartZ) / 2);
    craneGroup.add(cab);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    layout.axlesZ.forEach((az) => {
      [-1, 1].forEach((side) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 20), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * (layout.bodyHalfWidth - 0.1), 0.55, az);
        craneGroup.add(wheel);
      });
    });

    // Patolas e sapatas (bases de apoio no chão)
    const hits = padHits(model, radius, radRot);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    layout.pads.forEach((pad, i) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(pad.x) - layout.bodyHalfWidth, 0.25, 0.4), beamMat);
      beam.position.set(pad.x / 2 + (Math.sign(pad.x) * layout.bodyHalfWidth) / 2, 0.9, pad.z);
      craneGroup.add(beam);

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), beamMat);
      post.position.set(pad.x, 0.45, pad.z);
      craneGroup.add(post);

      const padMesh = new THREE.Mesh(
        new THREE.BoxGeometry(PAD_HALF_SIZE_M * 2, 0.12, PAD_HALF_SIZE_M * 2),
        new THREE.MeshStandardMaterial({ color: hits[i] ? 0xef4444 : 0x94a3b8 })
      );
      padMesh.position.set(pad.x, 0.06, pad.z);
      craneGroup.add(padMesh);

      // Área proibida para a carga (passar ou descer sobre a sapata)
      const side = (PAD_HALF_SIZE_M + CARGO_HALF_SIZE_M) * 2;
      const keepOut = new THREE.Mesh(
        new THREE.PlaneGeometry(side, side),
        new THREE.MeshBasicMaterial({
          color: 0xef4444, transparent: true, opacity: hits[i] ? 0.55 : 0.22,
          side: THREE.DoubleSide, depthWrite: false
        })
      );
      keepOut.rotation.x = -Math.PI / 2;
      keepOut.position.set(pad.x, 0.04, pad.z);
      craneGroup.add(keepOut);
    });

    // Mesa de giro (rotação 360°)
    const slewingGroup = new THREE.Group();
    slewingGroup.position.set(0, 1.8, 0);
    craneGroup.add(slewingGroup);
    slewingGroup.add(new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.6, 24),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    ));

    const boomPivotGroup = new THREE.Group();
    boomPivotGroup.position.set(0, 0.7, 0);
    slewingGroup.add(boomPivotGroup);

    const boomMat = new THREE.MeshStandardMaterial({ color: statusColorHex, roughness: 0.3 });
    // Lança telescópica: seção-base + seções que deslizam para fora, cada uma mais fina.
    const SECTION_WIDTHS = [0.95, 0.8, 0.66, 0.52];
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    computeBoomSegments(model, boomLength).forEach((seg) => {
      const w = SECTION_WIDTHS[Math.min(seg.index, SECTION_WIDTHS.length - 1)];
      const geo = new THREE.BoxGeometry(w, w, seg.length);
      geo.translate(0, 0, seg.start + seg.length / 2);
      boomPivotGroup.add(new THREE.Mesh(geo, boomMat));
      if (seg.index > 0) {
        // Colar na junção entre as seções (mostra a divisão)
        const cw = SECTION_WIDTHS[seg.index - 1] + 0.1;
        const cg = new THREE.BoxGeometry(cw, cw, 0.22);
        cg.translate(0, 0, seg.start);
        boomPivotGroup.add(new THREE.Mesh(cg, collarMat));
      }
    });

    const cableGeo = new THREE.BufferGeometry();
    const cableLine = new THREE.Line(cableGeo, new THREE.MeshBasicMaterial({ color: 0x94a3b8 }) as unknown as THREE.LineBasicMaterial);
    scene.add(cableLine);

    const payloadMat = new THREE.MeshStandardMaterial({ color: statusColorHex });
    const payloadMesh = new THREE.Mesh(
      new THREE.BoxGeometry(CARGO_HALF_SIZE_M * 2, CARGO_HALF_SIZE_M * 2, CARGO_HALF_SIZE_M * 2),
      payloadMat
    );
    scene.add(payloadMesh);

    slewingGroup.rotation.y = radRot;
    boomPivotGroup.rotation.x = -radAngle;

    const onResize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      scene.updateMatrixWorld(true);
      const tipWorld = new THREE.Vector3(0, 0, boomLength);
      boomPivotGroup.localToWorld(tipWorld);
      // Carga pendurada no cabo; se o cabo passa do solo, ela fica apoiada no chão.
      payloadMesh.position.set(tipWorld.x, Math.max(CARGO_HALF_SIZE_M, tipWorld.y - cableLength), tipWorld.z);
      cableGeo.setFromPoints([tipWorld, payloadMesh.position]);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [model, boomLength, cableLength, radius, radAngle, radRot, zones, statusColorHex, analysis.activeZone]);

  return <div className="canvas-wrapper-3d" ref={mountRef} />;
};
