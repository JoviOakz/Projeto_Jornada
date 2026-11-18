import React, { useEffect, useRef } from 'react';
import type { LiftAnalysis, LiftInputs, View2D } from '../types';
import { degToRad } from '../lib/geometry';
import { padHits } from '../lib/sapatas';
import { CARGO_HALF_SIZE_M, MD300L_BOOM_MAX_M, PAD_HALF_SIZE_M, SECTORS, VEHICLE_LAYOUT } from '../data/craneSpecs';
import { computeBoomSegments } from '../lib/boom';

interface Crane2DProps {
  view: View2D;
  inputs: LiftInputs;
  analysis: LiftAnalysis;
}

const W = 720;
const H = 460;

export const Crane2D: React.FC<Crane2DProps> = ({ view, inputs, analysis }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { model, boomLength, payloadKg, angle, rotation, cableLength } = inputs;
  // Escala fixa pelo maior comprimento do modelo: a extensão da lança fica visível.
  const refLength = model === 'MD300L' ? MD300L_BOOM_MAX_M : boomLength;
  const {
    radius, radAngle, radRot, maxPossibleRadius, zones, angleRange, slewRange,
    isCargoOverSapata, cableClipsIntoHaste, statusColorCSS
  } = analysis;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Alta densidade de pixels: desenha em coordenadas lógicas W x H.
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const warn = (text: string, color: string, row: number) => {
      ctx.fillStyle = color;
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(text, W / 2, 25 + row * 20);
    };

    if (view === '2D_SIDE') {
      const pivotX = 120;
      const pivotY = H - 90;
      const sinMax = Math.max(0.2, Math.sin(degToRad(model === 'MD300L' ? 83 : angleRange.max)));
      // Escala automática: a lança mais longa, no maior ângulo, cabe no canvas.
      const scale = Math.min((W - pivotX - 40) / refLength, (pivotY - 50) / (refLength * sinMax));

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(20, pivotY + 30); ctx.lineTo(W - 20, pivotY + 30); ctx.stroke();

      ctx.fillStyle = '#334155'; ctx.fillRect(pivotX - 70, pivotY + 5, 140, 20);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(pivotX - 95, pivotY - 15, 25, 40);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(pivotX - 60, pivotY + 25, 12, 8);
      ctx.fillRect(pivotX + 48, pivotY + 25, 12, 8);

      const boomPx = boomLength * scale;
      const tipX = pivotX + boomPx * Math.cos(radAngle);
      const tipY = pivotY - boomPx * Math.sin(radAngle);

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY + 30); ctx.lineTo(tipX, pivotY + 30); ctx.stroke();
      ctx.setLineDash([]);

      // Lança telescópica em seções (cada uma mais fina) com marcas nas junções
      const WIDTHS = [12, 10, 8, 6];
      ctx.lineCap = 'butt';
      computeBoomSegments(model, boomLength).forEach((seg) => {
        const x0 = pivotX + seg.start * scale * Math.cos(radAngle);
        const y0 = pivotY - seg.start * scale * Math.sin(radAngle);
        const x1 = pivotX + (seg.start + seg.length) * scale * Math.cos(radAngle);
        const y1 = pivotY - (seg.start + seg.length) * scale * Math.sin(radAngle);
        ctx.strokeStyle = statusColorCSS;
        ctx.lineWidth = WIDTHS[Math.min(seg.index, WIDTHS.length - 1)];
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        if (seg.index > 0) {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = WIDTHS[seg.index - 1] + 3;
          ctx.beginPath();
          ctx.moveTo(x0 - 1.5 * Math.cos(radAngle), y0 + 1.5 * Math.sin(radAngle));
          ctx.lineTo(x0 + 1.5 * Math.cos(radAngle), y0 - 1.5 * Math.sin(radAngle));
          ctx.stroke();
        }
      });

      // Cabo e carga (apoiada no solo quando o cabo passa do chão)
      const groundY = pivotY + 30;
      const boxPx = CARGO_HALF_SIZE_M * 2 * scale;
      const centerY = Math.min(groundY - boxPx / 2, tipY + cableLength * scale);
      const hookY = centerY - boxPx / 2;
      ctx.strokeStyle = statusColorCSS; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX, hookY); ctx.stroke();
      ctx.fillStyle = statusColorCSS; ctx.fillRect(tipX - boxPx / 2, hookY, boxPx, boxPx);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`${(payloadKg / 1000).toFixed(1)}t`, tipX, hookY + boxPx / 2 + 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Raio: ${radius}m`, (pivotX + tipX) / 2, pivotY + 25);
      ctx.fillText(`Ângulo: ${angle}°`, pivotX + 30, pivotY - 15);

      if (isCargoOverSapata) warn('⚠️ CARGA SOBRE SAPATA', '#ff0000', 0);
      if (cableClipsIntoHaste) warn('⚠️ PENETRAÇÃO NA HASTE', '#ff6600', isCargoOverSapata ? 1 : 0);
      return;
    }

    // ---------- PLANTA ----------
    const layout = VEHICLE_LAYOUT[model];
    const extent = Math.max(refLength, layout.frontZ, Math.abs(layout.rearZ), 3.5);
    const scale = (Math.min(W, H) / 2 - 20) / extent;
    const cx = W / 2;
    const cy = H / 2;
    const toX = (x: number) => cx + x * scale;
    const toY = (z: number) => cy - z * scale;
    const ang = (deg: number) => degToRad(deg) - Math.PI / 2; // azimute -> ângulo do canvas

    const fillRing = (r0: number, r1: number, a0Deg: number, a1Deg: number, color: string) => {
      if (r1 - r0 < 0.02) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r1 * scale, ang(a0Deg), ang(a1Deg));
      ctx.arc(cx, cy, r0 * scale, ang(a1Deg), ang(a0Deg), true);
      ctx.closePath();
      ctx.fill();
    };

    // Setor proibido (giro restrito)
    if (!slewRange.continuous) {
      fillRing(0, maxPossibleRadius, slewRange.max, slewRange.min + 360, 'rgba(100, 116, 139, 0.18)');
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText('Setor proibido', cx, cy - maxPossibleRadius * scale + 14);
    }

    // Zonas por setor (a área junto à base fica sem cor)
    zones.forEach((z) => {
      fillRing(z.minR, z.safeR, z.startDeg, z.endDeg, 'rgba(16, 185, 129, 0.35)');
      if (z.showOrange) fillRing(z.safeR, z.warnR, z.startDeg, z.endDeg, 'rgba(249, 115, 22, 0.30)');
      fillRing(Math.max(z.minR, z.warnR), z.maxR, z.startDeg, z.endDeg, 'rgba(239, 68, 68, 0.25)');
    });

    // Divisas dos setores do MD300L
    if (model === 'MD300L') {
      ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
      SECTORS.MD300L.forEach((s) => {
        const a = ang(s.startDeg);
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * maxPossibleRadius * scale, cy + Math.sin(a) * maxPossibleRadius * scale);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText('Frontal 110°', cx, cy - maxPossibleRadius * scale - 6 > 12 ? cy - maxPossibleRadius * scale - 6 : 12);
    }

    // Veículo
    ctx.fillStyle = '#334155';
    ctx.fillRect(toX(-layout.bodyHalfWidth), toY(layout.cabStartZ), layout.bodyHalfWidth * 2 * scale, (layout.cabStartZ - layout.rearZ) * scale);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(toX(-layout.bodyHalfWidth + 0.05), toY(layout.frontZ), (layout.bodyHalfWidth * 2 - 0.1) * scale, (layout.frontZ - layout.cabStartZ) * scale);

    // Sapatas e áreas proibidas para a carga
    const hits = padHits(model, radius, radRot);
    const keep = (PAD_HALF_SIZE_M + CARGO_HALF_SIZE_M) * scale;
    layout.pads.forEach((pad, i) => {
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(toX(Math.sign(pad.x) * layout.bodyHalfWidth), toY(pad.z)); ctx.lineTo(toX(pad.x), toY(pad.z)); ctx.stroke();
      ctx.fillStyle = hits[i] ? 'rgba(239,68,68,0.55)' : 'rgba(239,68,68,0.18)';
      ctx.fillRect(toX(pad.x) - keep, toY(pad.z) - keep, keep * 2, keep * 2);
      ctx.fillStyle = hits[i] ? '#ef4444' : '#94a3b8';
      ctx.fillRect(toX(pad.x) - PAD_HALF_SIZE_M * scale, toY(pad.z) - PAD_HALF_SIZE_M * scale, PAD_HALF_SIZE_M * 2 * scale, PAD_HALF_SIZE_M * 2 * scale);
    });

    // Raio atual e lança
    const r = radius * scale;
    const z0 = analysis.activeZone;
    ctx.strokeStyle = statusColorCSS; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, r, ang(z0.startDeg), ang(z0.endDeg)); ctx.stroke();
    ctx.setLineDash([]);

    const endX = cx + r * Math.sin(radRot);
    const endY = cy - r * Math.cos(radRot);
    ctx.strokeStyle = statusColorCSS; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.fillStyle = statusColorCSS;
    ctx.fillRect(endX - CARGO_HALF_SIZE_M * scale, endY - CARGO_HALF_SIZE_M * scale, CARGO_HALF_SIZE_M * 2 * scale, CARGO_HALF_SIZE_M * 2 * scale);

    if (isCargoOverSapata) warn('⚠️ CARGA SOBRE SAPATA', '#ff0000', 0);
    if (cableClipsIntoHaste) warn('⚠️ PENETRAÇÃO NA HASTE', '#ff6600', isCargoOverSapata ? 1 : 0);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`Giro: ${rotation}° | Raio: ${radius}m`, cx, H - 10);
  }, [view, model, boomLength, cableLength, payloadKg, angle, rotation, radius, radAngle, radRot, maxPossibleRadius,
      zones, angleRange, slewRange, isCargoOverSapata, cableClipsIntoHaste, statusColorCSS, analysis.activeZone]);

  return (
    <div className="canvas-wrapper-2d">
      <canvas ref={canvasRef} width={W} height={H} className="crane-canvas-2d" />
    </div>
  );
};
