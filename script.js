const canvas = document.querySelector('#imageCanvas');
const ctx = canvas.getContext('2d');
const imageInput = document.querySelector('#imageInput');
const canvasStage = document.querySelector('#canvasStage');
const placeholder = document.querySelector('#canvasPlaceholder');
const controls = document.querySelector('#measureControls');
const startScaleButton = document.querySelector('#startScale');
const startAreaButton = document.querySelector('#startArea');
const resetButton = document.querySelector('#resetButton');
const calculateButton = document.querySelector('#calculateButton');
const panelKicker = document.querySelector('#panelKicker');
const panelTitle = document.querySelector('#panelTitle');
const panelDescription = document.querySelector('#panelDescription');
const canvasStatus = document.querySelector('#canvasStatus');
const canvasInstruction = document.querySelector('#canvasInstruction');
const zoomReadout = document.querySelector('#zoomReadout');
const resultSection = document.querySelector('#resultSection');

const state = { image: null, scalePoints: [], polygon: [], mode: 'upload', scale: 1 };
const STEPS = { upload: ['COMECE AQUI', 'Escolha uma imagem', 'Uma vista superior ou frontal, sem muita distorção, produz uma estimativa mais confiável.'], scale: ['ETAPA 02', 'Marque uma referência', 'Clique nas duas extremidades de uma medida conhecida visível na fotografia.'], area: ['ETAPA 03', 'Contorne sua área', 'Clique ao redor do limite. Para fechar o desenho, clique no primeiro ponto.'] };

function setMode(mode) {
  state.mode = mode;
  const [kicker, title, description] = STEPS[mode];
  panelKicker.textContent = kicker; panelTitle.textContent = title; panelDescription.textContent = description;
  document.querySelectorAll('.step').forEach((step) => step.classList.toggle('active', step.dataset.step === mode));
  canvas.style.cursor = mode === 'upload' ? 'default' : 'crosshair';
  if (mode === 'scale') canvasInstruction.textContent = state.scalePoints.length ? 'Clique na outra extremidade da referência.' : 'Clique na primeira extremidade da medida conhecida.';
  if (mode === 'area') canvasInstruction.textContent = 'Clique no primeiro ponto do contorno para começar.';
  draw();
}

function fitCanvas() {
  const maxWidth = Math.min(900, canvasStage.clientWidth - 4);
  const maxHeight = Math.min(620, window.innerHeight * 0.63);
  state.scale = Math.min(maxWidth / state.image.naturalWidth, maxHeight / state.image.naturalHeight, 1);
  canvas.width = Math.round(state.image.naturalWidth * state.scale);
  canvas.height = Math.round(state.image.naturalHeight * state.scale);
  zoomReadout.textContent = `${Math.round(state.scale * 100)}%`;
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
}

function drawPoint(point, color, label) {
  ctx.beginPath(); ctx.arc(point.x, point.y, 5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  if (label) { ctx.fillStyle = '#fffdf7'; ctx.font = '600 12px DM Sans'; ctx.fillText(label, point.x + 10, point.y - 9); }
}

function draw() {
  if (!state.image) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
  if (state.polygon.length) {
    ctx.beginPath(); ctx.moveTo(state.polygon[0].x, state.polygon[0].y);
    state.polygon.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    if (state.polygon.length > 2) { ctx.closePath(); ctx.fillStyle = 'rgba(213, 241, 108, 0.22)'; ctx.fill(); }
    ctx.strokeStyle = '#d5f16c'; ctx.lineWidth = 2; ctx.stroke();
    state.polygon.forEach((point, index) => drawPoint(point, '#d5f16c', index === 0 ? 'início' : ''));
  }
  if (state.scalePoints.length) {
    if (state.scalePoints.length === 2) { ctx.beginPath(); ctx.moveTo(state.scalePoints[0].x, state.scalePoints[0].y); ctx.lineTo(state.scalePoints[1].x, state.scalePoints[1].y); ctx.strokeStyle = '#ff8f66'; ctx.lineWidth = 3; ctx.stroke(); }
    state.scalePoints.forEach((point, index) => drawPoint(point, '#ff8f66', index === 0 ? 'A' : 'B'));
  }
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function closeToFirst(point) { return state.polygon.length > 2 && distance(point, state.polygon[0]) < 16; }

function isInside(point, polygon) { let inside = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const a = polygon[i], b = polygon[j]; const hit = ((a.y > point.y) !== (b.y > point.y)) && (point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x); if (hit) inside = !inside; } return inside; }

function completeScale() {
  const measuredPixels = distance(...state.scalePoints);
  const knownValue = Number(document.querySelector('#knownDistance').value);
  if (!knownValue || !measuredPixels) return;
  const unit = document.querySelector('#distanceUnit').value;
  state.pixelsPerMeter = measuredPixels / (unit === 'cm' ? knownValue / 100 : knownValue);
  startAreaButton.disabled = false;
  startScaleButton.textContent = 'Refazer referência';
  canvasStatus.textContent = `Escala definida · ${state.pixelsPerMeter.toFixed(1)} px/m`;
  canvasInstruction.textContent = 'Referência marcada. Agora contorne a área que deseja medir.';
}

function estimateArea() {
  if (state.polygon.length < 3 || !state.pixelsPerMeter) return;
  const minX = Math.min(...state.polygon.map((p) => p.x)), maxX = Math.max(...state.polygon.map((p) => p.x));
  const minY = Math.min(...state.polygon.map((p) => p.y)), maxY = Math.max(...state.polygon.map((p) => p.y));
  const samples = 12000; let inside = 0;
  for (let i = 0; i < samples; i += 1) if (isInside({ x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) }, state.polygon)) inside += 1;
  const areaPx = (inside / samples) * (maxX - minX) * (maxY - minY);
  const areaMeters = areaPx / (state.pixelsPerMeter ** 2);
  document.querySelector('#areaResult').innerHTML = `${areaMeters.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>m²</small>`;
  document.querySelector('#insidePoints').textContent = inside.toLocaleString('pt-BR'); document.querySelector('#sampleCount').textContent = samples.toLocaleString('pt-BR');
  resultSection.hidden = false; canvasStatus.textContent = 'Estimativa concluída'; canvasInstruction.textContent = 'Área fechada e calculada. Você pode refazer a estimativa a qualquer momento.';
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

imageInput.addEventListener('change', (event) => {
  const file = event.target.files[0]; if (!file) return;
  const image = new Image(); image.onload = () => { state.image = image; state.scalePoints = []; state.polygon = []; fitCanvas(); placeholder.hidden = true; canvasStage.classList.remove('empty'); controls.hidden = false; canvasStatus.textContent = `Imagem carregada · ${image.naturalWidth} × ${image.naturalHeight}px`; setMode('scale'); }; image.src = URL.createObjectURL(file);
});
canvas.addEventListener('click', (event) => {
  if (!state.image || state.mode === 'upload') return;
  const point = pointFromEvent(event);
  if (state.mode === 'scale') { if (state.scalePoints.length === 2) state.scalePoints = []; state.scalePoints.push(point); if (state.scalePoints.length === 2) completeScale(); draw(); return; }
  if (state.mode === 'area') { if (closeToFirst(point)) { estimateArea(); return; } state.polygon.push(point); canvasInstruction.textContent = state.polygon.length > 2 ? 'Continue o contorno ou clique no ponto “início” para finalizar.' : 'Adicione pelo menos mais dois pontos ao contorno.'; draw(); }
});
startScaleButton.addEventListener('click', () => { state.scalePoints = []; setMode('scale'); });
startAreaButton.addEventListener('click', () => { state.polygon = []; resultSection.hidden = true; setMode('area'); });
resetButton.addEventListener('click', () => { state.scalePoints = []; state.polygon = []; state.pixelsPerMeter = null; startAreaButton.disabled = true; startScaleButton.textContent = 'Marcar referência'; resultSection.hidden = true; setMode('scale'); });
calculateButton.addEventListener('click', estimateArea);
window.addEventListener('resize', () => { if (state.image) { fitCanvas(); draw(); } });
