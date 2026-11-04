# 📚 Guia de Boas Práticas — Projeto Jornada

**Versão:** 1.0  
**Audiência:** Desenvolvedores contribuindo ao projeto  
**Escopo:** React + TypeScript + Three.js + Engenharia Mecânica

---

## 🎯 Princípios Fundamentais

### 1. **Segurança em Primeiro Lugar**
Este projeto valida operações críticas de içamento. **Nunca:**
- Ignore avisos de sobrecarga (vermelho/cinza)
- Suprima warnings de capacidade
- Altere tabelas de carga sem validação do fabricante

**Sempre:**
- Valide entrada numérica com min/max
- Use interpolação linear confiável
- Documente qualquer mudança nas regras RN01

---

### 2. **Precisão Matemática**
Os cálculos afetam vidas no canteiro de obras.

```typescript
// ✅ BOM: Múltiplas casas decimais, depois arredondar para exibição
const radius = Number((boomLength * Math.cos(radAngle)).toFixed(2));

// ❌ RUIM: Arredondar durante cálculos
const radius = Math.round(boomLength * Math.cos(radAngle), 1);
```

**Regra:** Calcular com precisão máxima, exibir com 2 casas decimais.

---

### 3. **Responsabilidade do Componente**
O `App` principal é grande (~840 linhas). Futuras refatorações devem:

```
App.tsx (lógica de estado global)
├── components/
│   ├── Canvas3D.tsx (Three.js, anéis, guindaste)
│   ├── Canvas2D.tsx (vistas lateral e superior)
│   ├── ControlPanel.tsx (sliders, seletores)
│   ├── Telemetry.tsx (exibição de dados)
│   └── ReportModal.tsx (relatório técnico)
├── utils/
│   ├── interpolation.ts (cálculos de capacidade)
│   ├── geometry.ts (lógica 3D)
│   └── constants.ts (tabelas, cores)
└── types/
    └── crane.ts (CraneModel, ViewMode, etc.)
```

---

## 🔧 Padrões de Código

### Tipagem TypeScript
```typescript
// ✅ BOM: Tipos explícitos
type CraneModel = 'MD300L' | 'TM130';
interface ChartMD300L {
  radii: number[];
  lengths: number[];
  matrix: Record<number, Record<number, number | null>>;
}

// ❌ RUIM: any ou ausência de tipos
const model: any = 'MD300L';
const chart = { radii: [3.0, 3.5], ... };
```

**Regra:** Sempre declarar tipos em interfaces/types, nunca usar `any`.

---

### React Hooks
```typescript
// ✅ BOM: useCallback com dependências explícitas
const interpolate = useCallback((len: number, r: number): number | null => {
  // lógica de interpolação
}, []);

// ✅ BOM: useMemo para cálculos custosos
const safeRadiusGround = useMemo(() => {
  // cálculo complexo
}, [model, boomLength, totalLoadKg, interpolateMD300L]);

// ❌ RUIM: setState sincronizado em effect
useEffect(() => {
  setState(newValue);  // cascata de renders!
}, [dependencies]);
```

**Regra:** Usar `useCallback` para funções, `useMemo` para valores, evitar setState em effects.

---

### Three.js
```typescript
// ✅ BOM: Nomear meshes, limpar resources
const mesh = new THREE.Mesh(geo, mat);
mesh.name = 'meaningful-name';
scene.add(mesh);

// Limpeza no return do useEffect
return () => {
  geo.dispose();
  mat.dispose();
  renderer.dispose();
};

// ❌ RUIM: Geometrias anônimas, sem cleanup
const mesh = new THREE.Mesh(new THREE.BoxGeometry(...), ...);
scene.add(mesh);
// Memory leak!
```

**Regra:** Sempre nomear meshes, sempre limpar geometrias/materiais/renderer no cleanup.

---

### Cores e Status
```typescript
// Status: Verde (seguro) → Âmbar (85%+) → Vermelho (100%+) → Cinza (fora)
const statusColorHex = useMemo(() => {
  if (isOutOfChart) return 0x64748b;   // Cinza
  if (isOverload) return 0xef4444;    // Vermelho
  if (isWarning) return 0xf59e0b;     // Âmbar
  return 0x10b981;                    // Verde
}, [isOutOfChart, isOverload, isWarning]);

// Usar para cores de meshes, barras, indicadores
boomMat.color.setHex(statusColorHex);
payloadMat.color.setHex(statusColorHex);
```

**Regra:** Cores sempre mapeadas a estados de segurança, nunca hardcoded.

---

## 📐 Domínio de Engenharia Mecânica

### Conceitos Chave

#### Eixos de Coordenadas 3D
```
                 ↑ Y (CÉU/ELEVAÇÃO)
                 |
    ← -X         |          X →
     (Esq)    Pino de        (Dir)
              Giro (0,0,0)
    
    -Z ↓      (Fundo)
    (Frente)  

    +Z →      (Trás)
    (Fundo)
```

**Regra:** Lança aponta para +Y (cima). Rotação ocorre em Y-axis. Raio no chão é X-Z.

---

#### Geometria da Lança (Boom)
```
Ângulo de Elevação (0° a 80°):
    80° |      /
        |     /  ← Lança elevada
    45° |    /    (Operação típica)
        |   /
    10° |  /     ← Lança baixa
        |/
        +-------- Solo (Y=0)
```

**Cálculos:**
- **Raio (R):** `R = L × cos(ângulo)` — distância horizontal
- **Altura (H):** `H = L × sin(ângulo) + altura_base` — altura do gancho

---

#### Tabelas de Capacidade

**MD 300L (Madal Palfinger):**
- Matriz: Raio (X) × Comprimento da Lança (Y)
- Valores em kgf (quilograma-força)
- Interpolação linear entre valores tabulados
- Fora da tabela = `null` (cinza, operação reprovada)

**Luna TM 130 (Munck):**
- Array: Ângulo de Elevação (0° a 70°)
- Valores em kg (diretos)
- Interpolação linear por ângulo
- Nunca sai da tabela (sempre há valor)

**Regra:** Sempre interpolar linearmente, nunca extrapolizar além da tabela.

---

### Margem Normativa (RN01)
```
Utilização da Capacidade:
0%  ────────────────────────── 100% Max
              ↑ 85% Limite Normativo (amarelo)
              
0-84%   : Verde (seguro)
85-99%  : Âmbar (alerta, operação marginal)
100%+   : Vermelho (SOBRECARGA, operação reprovada)
N/A     : Cinza (fora da tabela)
```

**Regra:** Nunca deixar passar operações em vermelho sem advertência clara.

---

## 📊 Análise de Dados

### Fluxo de Telemetria
```
Entrada do Usuário
    ↓
Model, Boom Length, Payload, Angle, Rotation
    ↓
Cálculos Geométricos
    ↓
R, H, X, Y, Z (coordenadas)
    ↓
Lookup nas Tabelas Oficiais
    ↓
Max Capacity (ou null)
    ↓
Comparar vs Total Load (payload + hook weight)
    ↓
Status: Verde / Âmbar / Vermelho / Cinza
    ↓
Renderizar Visões 3D/2D
    ↓
Anéis no Solo, Cores, Relatório
```

---

## 🧪 Testes Esperados (Quando Implementados)

```typescript
describe('Interpolation', () => {
  it('should interpolate MD300L capacity linearly', () => {
    // Given boom length 17.7m and radius 7.0m
    // When interpolating between 10.8t and 10.5t
    // Then result should be within ±2% of expected
    expect(interpolate(17.7, 7.0)).toBeCloseTo(10800, -1);
  });

  it('should return null for out-of-bounds radius', () => {
    expect(interpolate(17.7, 50)).toBeNull();
  });
});

describe('Safety Rules RN01', () => {
  it('should warn when usage >= 85%', () => {
    // 85% trigger
    const usage = 85;
    expect(isWarning(usage)).toBe(true);
    expect(statusColor(usage)).toBe(0xf59e0b);  // âmbar
  });

  it('should reject when usage > 100%', () => {
    const usage = 101;
    expect(isOverload(usage)).toBe(true);
    expect(statusColor(usage)).toBe(0xef4444);  // vermelho
  });
});
```

---

## 🎨 Paleta de Cores

```css
/* Status de Segurança */
--color-safe:      #10b981  /* Verde — operação segura */
--color-warning:   #f59e0b  /* Âmbar — alerta 85% */
--color-overload:  #ef4444  /* Vermelho — sobrecarga */
--color-invalid:   #64748b  /* Cinza — fora da tabela */

/* UI Background */
--color-bg-dark:   #080c14
--color-bg-card:   #111827
--color-bg-input:  #030712
--color-border:    #1f2937

/* Text */
--color-text-primary:   #f3f4f6
--color-text-secondary: #9ca3af
--color-text-muted:     #6b7280

/* Accent */
--color-primary:   #2563eb  /* Azul Vite */
--color-accent:    #38bdf8  /* Azul claro */
```

---

## 📝 Comentários e Documentação

### Padrão de Comentário
```typescript
// ✅ BOM: Descrição + contexto + link se houver
// Interpolação linear de capacidade conforme tabela MD300L oficial
// Retorna null se raio estiver fora dos limites tabulados
// Ref: Madal Palfinger MD 300L - Manual Técnico p. 45
const interpolateMD300L = useCallback((len: number, r: number): number | null => {
  // ...
}, []);

// ❌ RUIM: Óbvio demais
// Set model
setModel('MD300L');

// ❌ RUIM: Muito vago
// TODO: Fix this
// HACK: Make it work
```

**Regra:** Comentar o "por quê", não o "o quê". Código fala por si.

---

## 🚀 Checklist Antes de PR

- [ ] `npm run lint` retorna 0 erros
- [ ] `npm run build` passa sem warnings
- [ ] `npm run dev` executa sem erros no console
- [ ] Testei as 3 visões (3D, 2D lateral, 2D planta)
- [ ] Testei os 2 modelos (MD300L, Luna TM 130)
- [ ] Testei situações de sobrecarga (vermelho)
- [ ] Testei situações de alerta (âmbar)
- [ ] Testei modal de relatório
- [ ] Adicionei comentários técnicos em PT-EN se necessário
- [ ] Atualizei documentação relacionada
- [ ] Não há dead code ou variáveis não usadas
- [ ] Sem console.log ou debug statements
- [ ] Tipos TypeScript apropriados, sem `any`

---

## 🤝 Contribuindo

1. **Fork** o repositório
2. **Branch:** `git checkout -b feature/sua-feature`
3. **Commit:** `git commit -m "type: description"`
   - Tipos: `feat`, `fix`, `refactor`, `docs`, `test`
4. **Push:** `git push origin feature/sua-feature`
5. **PR:** Descreva a mudança e passe no checklist acima
6. **Revisão:** Aguarde aprovação e feedback

---

## 📞 Contato

**Parceiro Industrial:** Guindastes Ribas Ltda.  
**Instituição:** UniSENAI PR — Engenharia de Software  
**Suporte:** Referir-se ao `copilot-instructions.md` e `project-context.md`

---

**Obrigado por contribuir ao Projeto Jornada! 🚀**
