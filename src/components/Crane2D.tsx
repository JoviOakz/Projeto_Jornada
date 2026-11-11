import React, { useEffect, useRef } from 'react';
import type { LiftAnalysis, LiftInputs, View2D } from '../types';

interface Crane2DProps {
  view: View2D;
  inputs: LiftInputs;
  analysis: LiftAnalysis;
}

export const Crane2D: React.FC<Crane2DProps> = ({ view, inputs, analysis }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { boomLength, payloadKg, angle, rotation } = inputs;
  const {
    radius,
    radAngle,
    radRot,
    maxPossibleRadius,
    safeRadiusGround,
    warningRadiusGround,
    showOrangeZone,
    isCargoOverSapata,
    cableClipsIntoHaste,
    statusColorCSS
  } = analysis;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Grid de fundo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // TODO: escala fixa — com lanças longas a haste/zonas saem do canvas (usar escala automática).
    if (view === '2D_SIDE') {
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

      // Linha do raio
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY + 30); ctx.lineTo(boomTipX, pivotY + 30); ctx.stroke();
      ctx.setLineDash([]);

      // Haste
      ctx.strokeStyle = statusColorCSS;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(boomTipX, boomTipY); ctx.stroke();

      // Cabo e carga
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

      // Avisos de perigo
      if (isCargoOverSapata) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ CARGA SOBRE SAPATA', width / 2, 25);
      }
      if (cableClipsIntoHaste) {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ PENETRAÇÃO NA HASTE', width / 2, isCargoOverSapata ? 45 : 25);
      }
    } else {
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

      // Zonas no chão
      const safePx = safeRadiusGround * scale;
      const maxPx = maxPossibleRadius * scale;
      const warningPx = warningRadiusGround * scale;

      // Vermelha (externa)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath(); ctx.arc(centerX, centerY, maxPx, 0, Math.PI * 2); ctx.fill();

      // Laranja (intermediária)
      if (showOrangeZone) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.30)';
        ctx.beginPath(); ctx.arc(centerX, centerY, warningPx, 0, Math.PI * 2); ctx.fill();
      }

      // Verde (interna)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.beginPath(); ctx.arc(centerX, centerY, safePx, 0, Math.PI * 2); ctx.fill();

      // Anel do raio atual
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

      // Avisos de perigo
      if (isCargoOverSapata) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ CARGA SOBRE SAPATA', centerX, 25);
      }
      if (cableClipsIntoHaste) {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ PENETRAÇÃO NA HASTE', centerX, isCargoOverSapata ? 45 : 25);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`Giro: ${rotation}°`, centerX, centerY - 70);
      ctx.fillText(`Alcance (Raio): ${radius}m`, boomEndX, boomEndY + 22);
    }
  }, [
    view,
    angle,
    rotation,
    boomLength,
    payloadKg,
    radius,
    radAngle,
    radRot,
    maxPossibleRadius,
    safeRadiusGround,
    warningRadiusGround,
    showOrangeZone,
    isCargoOverSapata,
    cableClipsIntoHaste,
    statusColorCSS
  ]);

  return (
    <div className="canvas-wrapper-2d">
      <canvas ref={canvasRef} width={720} height={460} className="crane-canvas-2d" />
    </div>
  );
};
