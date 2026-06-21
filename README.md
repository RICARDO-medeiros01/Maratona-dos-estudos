# Maratona-dos-estudos
Rastreador de estudos para concurseiros — marque seus dias, acompanhe ciclos e mantenha a constância.

# Constância

> Rastreador de estudos para concurseiros — acompanhe seu progresso semana a semana, dia a dia.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## Sobre o projeto

**Constância** é uma aplicação web para estudantes de concursos públicos que precisam manter consistência nos estudos ao longo de ciclos longos. Inspirado no heatmap de contribuições do GitHub, o app transforma semanas de estudo em um painel visual simples e motivador.

A ideia central é simples: defina seu ciclo, marque os dias que estudou, e veja sua consistência crescer.

---

## Funcionalidades

- **Ciclo configurável** — defina quantas semanas dura seu ciclo (1 a 104) e dê um nome a ele (ex: "Rumo ao TRF")
- **Heatmap semanal** — visualização ao estilo GitHub mostrando os dias de estudo de cada semana
- **Marcação por dia** — marque cada dia da semana (Seg–Dom) individualmente dentro de cada semana
- **Observações por semana** — registre o que estudou, dificuldades e conquistas
- **Cards de resumo** — total de semanas, dias concluídos, percentual de progresso e sequência de semanas completas
- **Pomodoro integrado** — timer com sessões de foco, pausa curta e pausa longa, com suporte a tarefas
- **Reset por ciclo** — ao aplicar um novo ciclo, todos os dados são zerados e o heatmap recomeça do zero
- **Persistência local** — todos os dados ficam salvos no `localStorage` do navegador, sem necessidade de conta ou servidor

---

## Tecnologias

- HTML5
- CSS3
- JavaScript (vanilla)

Sem frameworks, sem dependências externas, sem backend.

---

## Como usar

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/constancia.git
   ```

2. Abra o arquivo `index.html` diretamente no navegador — não é necessário servidor.

3. Configure seu ciclo:
   - Digite o nome do ciclo (ex: "Rumo ao TJSP")
   - Defina o número de semanas
   - Clique em **Aplicar**

4. Marque os dias à medida que estudar — clique no dia dentro de cada semana ou diretamente no heatmap.

5. Use o botão de notas em cada semana para registrar o conteúdo estudado.

---

## Estrutura do projeto

```
constancia/
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## Armazenamento local

Os dados são salvos em duas chaves no `localStorage`:

```json
// constancia_cycle
{
  "name": "Rumo ao TRF",
  "total": 53,
  "startDate": "2026-06-21"
}

// constancia_weeks
{
  "0": { "days": { "0": true, "1": true }, "obs": "Direito Constitucional — Poderes" },
  "1": { "days": {}, "obs": "" }
}
```

---

## Motivação

Estudar para concurso público é uma maratona. A maior dificuldade não é a inteligência — é a **constância**. Este app nasceu da necessidade de visualizar o esforço acumulado dia a dia, semana a semana, sem distrações.

---

## Licença

MIT — use, modifique e distribua à vontade.
