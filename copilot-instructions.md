O projeto é uma ferramenta gráfica interativa para análise e planejamento preliminar de operações de içamento de cargas com guindastes, validando a capacidade contra as tabelas oficiais dos fabricantes (Madal Palfinger MD 300L e Luna TM 130).

A ferramenta será de certa forma "simples" apenas frontend interativo

O que precisamos implementar/refatorar agora:

1. Estrutura de Visão Dual (3D WebGL + 2D Canvas):
   - Visão 3D (Three.js): Canteiro de obras 3D com OrbitControls, chassi, mesa de giro, lança telescópica articulada, cabo de aço e bloco de carga.
   - Anéis de Projeção no Solo em 3D: Desenhar no chão (eixo Y=0) duas zonas translúcidas dinâmicas ao redor do pivô de giro do guindaste:
     - Zona Verde (10b981, opacidade 0.28): Representa o raio seguro no solo (do raio mínimo até o raio máximo permitido para o peso da carga selecionada).
     - Zona Vermelha (ef4444, opacidade 0.28): Representa a zona de sobrecarga (do raio seguro até o alcance máximo da lança).
   - Visão 2D Lateral: Canvas 2D desenhando o perfil do guindaste, elevação da haste em graus e indicação visual do raio no solo.
   - Visão 2D Planta (Superior): Canvas 2D mostrando o giro de azimute (0° a 360°), sapatas estendidas nas 4 pontas e círculo de raio.

2. Regras de Negócio e Cálculos:
   - Interpolação Matemática Linear das matrizes de carga oficiais (MD 300L por Raio x Comprimento da Lança; TM 130 por Ângulo).
   - Cálculo do Raio (R = L * cos(Ângulo)) e Altura (H = L * sin(Ângulo) + altura_base).
   - Cálculo das Coordenadas Tridimensionais (X, Y, Z) com base no Giro de Azimute (rotation).
   - Destaque em tempo real da célula correspondente na tabela oficial exibida no rodapé.
   - Barra de utilização de carga com linha guia marcando a margem normativa de 85% de tombamento (RN01).

3. Requisitos de Código e Estilo:
   - Projeto 100% sem efeitos sonoros/áudio.
   - Elevação da lança no Three.js apontando para o CÉU (+Y).
   - Responsivo, limpo e com suporte a modal para geração do Relatório Técnico de Viabilidade impresso/PDF.

Por favor, analise esses requisitos e me ajude a implementar ou otimizar os arquivos `src/App.tsx` e `src/App.css` seguindo essa arquitetura.