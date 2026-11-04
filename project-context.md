Resumo do Projeto (Contexto)

- Parceiro Industrial: Guindastes Ribas Ltda

- Contexto Acadêmico: UniSENAI PR — Curso de Engenharia de Software (Jornada de Aprendizagem / Desafio Industrial)

- O Problema: O planejamento preliminar de içamentos depende de tabelas manuais impressas ou PDFs estáticos. Isso é lento e gera riscos críticos de erro humano, instabilidade ou tombamento

- A Solução: Um protótipo web interativo que automatiza o cruzamento de parâmetros (comprimento da lança, raio de operação, ângulo e peso da carga) com as tabelas oficiais de fábrica, emitindo alertas visuais em tempo real

- Modelos de Guindastes Suportados:
    -Madal Palfinger MD 300L (30t): A capacidade varia em função do Raio de Operação ($R$) e do Comprimento da Lança ($10,5\text{m}$ a $32,1\text{m}$)
    - Luna TM 130 (26t): A capacidade varia em função do Ângulo da Lança ($0^\circ$ a $70^\circ$)

- Regras de Negócio Importantes:Margem Normativa de Segurança (RN01): Alerta amarelo quando a utilização ultrapassa 85% da capacidade crítica de tombamento

- Peso dos Acessórios: O sistema considera o peso próprio do gancho principal (ex: 235 kg no MD 300L) somado ao peso da carga


Contexto do Projeto: Estamos desenvolvendo uma aplicação web em React, Vite e TypeScript para a empresa Guindastes Ribas Ltda., como parte de um desafio industrial do curso de Engenharia de Software da UniSENAI PR.

---

O Domínio do Problema & Objetivo
O software é uma ferramenta gráfica interativa para análise e planejamento preliminar de operações de içamento de cargas com guindastes. O objetivo é eliminar o uso de tabelas de carga manuais em papel/PDF, evitando erros humanos, sobrecargas e riscos de tombamento no canteiro de obras.

Modelos e Tabelas Oficiais de Carga Integradas
1. Madal Palfinger MD 300L (Capacidade nominal 30t):
   - Os limites variam cruzando o Comprimento da Lança (de 10.5m até 32.1m) com o Raio de Operação (distância horizontal em metros do centro de giro até o gancho).
   - Exemplo da matriz: Para lança de 17.7m a um raio de 7.0m, a capacidade estrutural/estável suportada é de 10.800 kgf.
2. Luna TM 130 (Capacidade nominal 26t):
   - Os limites variam diretamente em função do Ângulo de Elevação da Lança (de 0° a 70°).
   - Exemplo: A 70° de elevação, suporta até 20.400 kgf.

Regras de Engenharia & Requisitos Técnicos
- Fator de Segurança / Limite Normativo (RN01): O sistema valida se a carga total suspensa (Peso da Carga + Peso do Gancho, ex: 235kg no MD 300L) respeita a tabela. Avisos de alerta acendem se a utilização atingir ou superar 85% da capacidade limite.
- Interpolação Matemática: O motor calcula de forma linear os valores intermediários quando o raio exato ou ângulo digitado está entre duas linhas da tabela oficial.
- Arquitetura Visual Atual:
  - Visão 3D (Three.js): Canteiro de obras com chassi do caminhão, mesa de giro de 360°, lança telescópica articulada, cabo de aço, bloco de carga e anéis translúcidos no solo (Verde para zona segura e Vermelho para zona de sobrecarga).
  - Visão 2D Lateral: Perfil do guindaste mostrando o raio e a elevação da haste.
  - Visão 2D Superior (Planta): Planta baixa com o giro de azimute e as sapatas estabilizadoras estendidas.

Por favor, mantenha esse contexto de engenharia mecânica e de software em mente sempre que formos alterar ou criar novas funcionalidades no projeto.