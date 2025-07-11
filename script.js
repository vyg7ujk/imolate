// ====== Dados armazenados no localStorage ======
let seeds = JSON.parse(localStorage.getItem('imolateSeeds')) || [];

// ====== Funções de persistência ======
function salvarSeeds() {
  localStorage.setItem('imolateSeeds', JSON.stringify(seeds));
}

// ====== Adicionar seed manualmente ======
function adicionarSeed() {
  const code = newCode.value.trim().toUpperCase();
  const type = newType.value;
  const desc = newDesc.value.trim();
  const action = newAction.value.trim();
  let score = newScore.value.trim();

  if (!code || !desc || !action || !score) {
    alert('Preencha todos os campos!');
    return;
  }

  if (score.toLowerCase() === 'nanif') score = 'NaNIF';
  else {
    score = Number(score);
    if (isNaN(score) || score < 0) {
      alert('Pontuação inválida.');
      return;
    }
  }

  if (seeds.some(s => s.code === code)) {
    alert('Seed já cadastrada.');
    return;
  }

  seeds.push({ code, type, desc, action, score });
  salvarSeeds();
  buscarSeeds();

  newCode.value = '';
  newDesc.value = '';
  newAction.value = '';
  newScore.value = '';
}

// ====== Buscar seeds com filtros ======
function buscarSeeds() {
  const termo = seedInput.value.toLowerCase();
  const tipo = seedType.value;
  const scoreFiltro = seedScore.value.trim();
  const isNaNIF = scoreFiltro.toLowerCase() === 'nanif';
  const scoreMin = Number(scoreFiltro);

  const resultado = seeds.filter(s => {
    const matchTermo = s.code.toLowerCase().includes(termo) || s.desc.toLowerCase().includes(termo);
    const matchTipo = tipo === 'todos' || s.type === tipo;
    let matchScore = true;
    if (scoreFiltro) {
      if (isNaNIF) matchScore = s.score === 'NaNIF';
      else matchScore = s.score !== 'NaNIF' && s.score >= scoreMin;
    }
    return matchTermo && matchTipo && matchScore;
  });

  resultado.sort((a, b) => {
    if (a.score === 'NaNIF') return -1;
    if (b.score === 'NaNIF') return 1;
    return b.score - a.score;
  });

  seedList.innerHTML = resultado.length
    ? resultado.map(s => `
        <div class="seed">
          <strong>${s.code}</strong> (${s.type})<br>
          ${s.desc}<br>
          <em>${s.action}</em><br>
          Pontuação: <span class="${s.score==='NaNIF'?'nanif':''}">${s.score}</span>
        </div>`).join('')
    : '<p>Nenhuma seed encontrada.</p>';
}

buscarSeeds();

// ====== IA SIMULADA COM HISTÓRICO ======
let population = [];
let aiInterval = null;
let generation = 0;

// Gera seed inicial com histórico
function gerarSeed() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return { code, history: [`Seed inicial: ${code}`] };
}

// Avalia seed (NaNIF se contém 'X' e '7', senão random)
function avaliarSeed(obj) {
  return obj.code.includes('X') && obj.code.includes('7') ? 'NaNIF' : Math.floor(Math.random() * 20) + 1;
}

// Cruzamento com propagação de histórico
function cruzar(a, b) {
  const newCode = a.code.slice(0, 3) + b.code.slice(3);
  const history = [
    ...a.history,
    ...b.history,
    `Cruzamento: ${a.code.slice(0,3)} + ${b.code.slice(3)} → ${newCode}`
  ];
  return { code: newCode, history };
}

// Mutação com registro de alteração
function mutar(obj) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = obj.code.split('');
  const pos = Math.floor(Math.random() * 6);
  const oldChar = arr[pos];
  let newChar;
  do { newChar = chars[Math.floor(Math.random()*chars.length)]; } while (newChar === oldChar);
  arr[pos] = newChar;
  const newCode = arr.join('');
  const history = [...obj.history, `Mutação: pos ${pos+1}, ${oldChar}→${newChar} → ${newCode}`];
  return { code: newCode, history };
}

// População inicial
function gerarPopulacaoInicial() {
  population = [];
  for (let i = 0; i < 20; i++) {
    const seedObj = gerarSeed();
    population.push({ ...seedObj, score: avaliarSeed(seedObj) });
  }
  generation = 0;
  atualizarGrafico();
  mostrarTopSeeds();
}

// Gera nova geração
function novaGeracao() {
  // ordena NaNIF no topo
  population.sort((a, b) => {
    if (a.score==='NaNIF') return -1;
    if (b.score==='NaNIF') return 1;
    return b.score - a.score;
  });

  const elite = population.slice(0, 10);
  const filhos = [];
  while (filhos.length < 10) {
    const p1 = elite[Math.floor(Math.random()*elite.length)];
    const p2 = elite[Math.floor(Math.random()*elite.length)];
    let child = cruzar(p1, p2);
    if (Math.random() < 0.3) child = mutar(child);
    filhos.push({ ...child, score: avaliarSeed(child) });
  }
  population = [...elite, ...filhos];
  generation++;

  atualizarGrafico();
  mostrarTopSeeds();

  // Salva NaNIF com histórico completo
  population.forEach(seed => {
    if (seed.score==='NaNIF' && !seeds.some(s=>s.code===seed.code)) {
      seeds.push({
        code: seed.code,
        type: 'especial',
        desc: 'Auto IA',
        action: seed.history.join(' → '),
        score: 'NaNIF'
      });
      salvarSeeds();
    }
  });
}

// Exibe top 5
function mostrarTopSeeds() {
  autoSeedsFound.innerHTML = population.slice(0,5).map(s =>
    `<div style="color:${s.score==='NaNIF'?'#ff5252':'#eee'}">
       ${s.code} - ${s.score}
     </div>`).join('');
}

// Configura Chart.js
const ctx = document.getElementById('scoreChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [
    { label:'Média', data:[], borderColor:'#ff9800', fill:false },
    { label:'Máximo', data:[], borderColor:'#4caf50', fill:false }
  ]},
  options: { animation:false, scales:{ y:{ beginAtZero:true } } }
});

function atualizarGrafico() {
  const nums = population.filter(p=>p.score!=='NaNIF').map(p=>p.score);
  const avg = nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
  const max = nums.length ? Math.max(...nums) : 0;
  chart.data.labels.push(`Gen ${generation}`);
  chart.data.datasets[0].data.push(avg);
  chart.data.datasets[1].data.push(max);
  chart.update();
}

// Controle da IA
function startAI() {
  if (aiInterval) return;
  aiStatus.textContent = 'Status: rodando';
  gerarPopulacaoInicial();
  aiInterval = setInterval(novaGeracao, 800);
}
function stopAI() {
  if (!aiInterval) return;
  clearInterval(aiInterval);
  aiInterval = null;
  aiStatus.textContent = 'Status: parado';
  buscarSeeds();
}

// Exporta NaNIF para txt com histórico
function exportarNaNIF() {
  const nan = seeds.filter(s=>s.score==='NaNIF');
  if (!nan.length) return alert('Nenhuma seed NaNIF.');
  let txt = 'Seeds que quebram o jogo (NaNIF)\n\n';
  nan.forEach(s=>{
    txt += `Código: ${s.code}\nBaralho: ${s.type}\nDescrição: ${s.desc}\nInstruções:\n  ${s.action.split(' → ').join('\n  ')}\n`;
    txt += '------------------------------\n';
  });
  const blob = new Blob([txt],{type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'seeds_NaNIF.txt';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
