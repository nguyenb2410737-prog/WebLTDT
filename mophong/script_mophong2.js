// ============================================================
//  script_mophong.js
//  Gắn vào HTML gốc (Mo_phong.html + style.css không đổi)
//
//  Tính năng:
//    - Nhập tay: số đỉnh, danh sách cạnh, đỉnh bắt đầu
//    - Nút Ngẫu nhiên (thêm vào panel trái qua JS)
//    - Speed slider (thêm vào panel trái qua JS)
//    - SVG render với glow/shadow, mũi tên có hướng
//    - BFS / DFS animation từng bước
//    - Vẽ khuyên (self-loop) cho cạnh u == v
// ============================================================

// ============================================================
//  HẰNG SỐ
// ============================================================
const NODE_R = 24;

// Màu mặc định (khớp theme indigo của HTML gốc)
const PALETTE = {
  node:        "#eef2ff",
  nodeStroke:  "#6366f1",
  nodeText:    "#3730a3",
  active:      "#f59e0b",
  activeText:  "#ffffff",
  visited:     "#6366f1",
  visitedText: "#ffffff",
  edge:        "rgba(99,102,241,0.35)",
  edgeVisited: "#6366f1",
};

// ============================================================
//  TRẠNG THÁI
// ============================================================
let nodes     = [];   // [{ id, x, y }]
let edges     = [];   // [{ u, v }]
let adjList   = {};
let directed  = false;
let nodeState = {};   // id -> 'default' | 'active' | 'visited'
let edgeState = {};   // eKey -> true
let animTimer = null;

// ============================================================
//  DOM GỐC (từ HTML gốc)
// ============================================================
const algoSelect   = document.getElementById('algo-select');
const graphTypeSel = document.getElementById('graph-type');
const nodeCountEl  = document.getElementById('node-count');
const edgeListEl   = document.getElementById('edge-list');
const startNodeEl  = document.getElementById('start-node');
const runBtn       = document.getElementById('run-btn');
const scanPanel    = document.querySelector('.scan');
const graphEl      = document.getElementById('graph');
const resultEl     = document.getElementById('result');

// ============================================================
//  INJECT: SVG vào .graph (thay thế cách dùng div node cũ)
// ============================================================
(function injectSVG() {
  const oldSvg = document.getElementById('edges');
  if (oldSvg) oldSvg.remove();
  document.querySelectorAll('.node-circle').forEach(el => el.remove());

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'canvas');
  svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
  graphEl.appendChild(svg);
})();

const svgEl = document.getElementById('canvas');

// ============================================================
//  INJECT: Speed slider vào .scan (trước nút RUN)
// ============================================================
(function injectSpeedSlider() {
  const sliderHTML = `
    <hr/>
    <label style="font-size:.82rem;color:#475569;">Tốc độ hoạt ảnh</label>
    <div style="display:flex;align-items:center;gap:6px;font-size:.78rem;color:#4338ca;">
      <span>Nhanh</span>
      <input type="range" id="speedRange" min="150" max="1200" value="600" step="50"
        style="flex:1;accent-color:#6366f1;">
      <span>Chậm</span>
    </div>
    <div id="speedLabel"
      style="text-align:center;font-size:.75rem;color:#6366f1;margin-top:2px;">
      600ms / bước
    </div>`;

  const wrap = document.createElement('div');
  wrap.innerHTML = sliderHTML;
  runBtn.parentNode.insertBefore(wrap, runBtn);

  document.getElementById('speedRange').oninput = function () {
    document.getElementById('speedLabel').textContent = this.value + 'ms / bước';
  };
})();

// ============================================================
//  INJECT: Nút Ngẫu nhiên + Reset vào .scan (sau nút RUN)
// ============================================================
(function injectExtraButtons() {
  const btnRandom = document.createElement('button');
  btnRandom.textContent = '🎲 Ngẫu nhiên';
  btnRandom.className   = 'myButton';
  btnRandom.style.cssText =
    'background:linear-gradient(135deg,#7c3aed,#6366f1);margin-top:6px;width:100%;';
  btnRandom.onclick = randomGraph;

  const btnReset = document.createElement('button');
  btnReset.textContent = '↺ Reset';
  btnReset.className   = 'myButton';
  btnReset.style.cssText =
    'background:linear-gradient(135deg,#94a3b8,#cbd5e1);box-shadow:none;' +
    'border-color:rgba(0,0,0,.1);color:#1e293b;margin-top:4px;width:100%;';
  btnReset.onclick = resetGraph;

  runBtn.style.width = '100%';
  runBtn.after(btnReset);
  runBtn.after(btnRandom);
})();

// ============================================================
//  INJECT: Legend vào .conclusion
// ============================================================
(function injectLegend() {
  const conclusion = document.querySelector('.conclusion');
  if (!conclusion) return;

  const legend = document.createElement('div');
  legend.style.marginTop = '8px';
  legend.innerHTML = `
    <div style="display:flex;align-items:center;gap:7px;color:#475569;font-size:.78rem;margin-top:3px;">
      <div id="leg-default" style="width:12px;height:12px;border-radius:50%;
        background:${PALETTE.node};border:1.5px solid ${PALETTE.nodeStroke};flex-shrink:0;"></div>
      Chưa duyệt
    </div>
    <div style="display:flex;align-items:center;gap:7px;color:#475569;font-size:.78rem;margin-top:3px;">
      <div id="leg-active" style="width:12px;height:12px;border-radius:50%;
        background:${PALETTE.active};flex-shrink:0;box-shadow:0 0 5px ${PALETTE.active};"></div>
      Đang xét
    </div>
    <div style="display:flex;align-items:center;gap:7px;color:#475569;font-size:.78rem;margin-top:3px;">
      <div id="leg-visited" style="width:12px;height:12px;border-radius:50%;
        background:${PALETTE.visited};flex-shrink:0;box-shadow:0 0 5px ${PALETTE.visited};"></div>
      Đã duyệt
    </div>
    <div style="display:flex;align-items:center;gap:7px;color:#475569;font-size:.78rem;margin-top:3px;">
      <div style="width:22px;height:4px;border-radius:3px;
        background:${PALETTE.edgeVisited};flex-shrink:0;"></div>
      Cạnh đã đi
    </div>
    <div style="display:flex;align-items:center;gap:7px;color:#475569;font-size:.78rem;margin-top:3px;">
      <div style="width:16px;height:10px;border-radius:50%;
        border:2px solid ${PALETTE.nodeStroke};flex-shrink:0;background:transparent;"></div>
      Khuyên (self-loop)
    </div>`;
  conclusion.appendChild(legend);
})();

// ============================================================
//  PARSE INPUT (nhập tay)
// ============================================================
function parseInput() {
  const n     = parseInt(nodeCountEl.value);
  const start = parseInt(startNodeEl.value);
  directed    = graphTypeSel.value === 'directed';

  if (isNaN(n) || n < 1)                       { alert('Nhập số đỉnh hợp lệ!'); return null; }
  if (isNaN(start) || start < 1 || start > n)  { alert('Đỉnh bắt đầu không hợp lệ!'); return null; }

  const parsedEdges = [];
  for (const line of edgeListEl.value.trim().split('\n')) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    const u = parseInt(parts[0]), v = parseInt(parts[1]);
    if (isNaN(u) || isNaN(v))              { alert(`Dòng không hợp lệ: "${line}"`); return null; }
    if (u < 1 || u > n || v < 1 || v > n) { alert(`Đỉnh vượt phạm vi: "${line}"`); return null; }
    parsedEdges.push({ u, v });
  }
  return { n, start, edges: parsedEdges };
}

// ============================================================
//  LAYOUT – xếp đỉnh vòng tròn theo kích thước SVG thực tế
// ============================================================
function layoutNodes(n) {
  const rect = svgEl.getBoundingClientRect();
  const W = rect.width  || graphEl.clientWidth  || 700;
  const H = rect.height || graphEl.clientHeight || 500;
  const cx = W / 2, cy = H / 2;
  const r  = Math.min(cx, cy) * 0.70;
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    x:  cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y:  cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }));
}

// ============================================================
//  BUILD ADJACENCY LIST
// ============================================================
function buildAdj() {
  adjList = {};
  nodes.forEach(n => (adjList[n.id] = []));
  edges.forEach(({ u, v }) => {
    adjList[u].push(v);
    if (!directed && u !== v) adjList[v].push(u);
  });
}

// ============================================================
//  ĐỒ THỊ NGẪU NHIÊN
// ============================================================
function randomGraph() {
  stopAnim();
  directed = graphTypeSel.value === 'directed';

  const rect  = svgEl.getBoundingClientRect();
  const W     = rect.width  || 700;
  const H     = rect.height || 500;
  const count = 5 + Math.floor(Math.random() * 5); // 5–9 đỉnh

  const cx = W / 2, cy = H / 2;
  const r  = Math.min(cx, cy) * 0.70;
  nodes = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    x:  cx + r * Math.cos((2 * Math.PI * i) / count - Math.PI / 2),
    y:  cy + r * Math.sin((2 * Math.PI * i) / count - Math.PI / 2),
  }));

  const used = new Set();
  edges = [];

  // Chuỗi liên thông cơ bản
  for (let i = 1; i < count; i++) {
    const u = i, v = i + 1;
    edges.push({ u, v });
    used.add(`${Math.min(u,v)}-${Math.max(u,v)}`);
  }

  // Cạnh bổ sung (thông thường)
  const extra = count + 2;
  for (let t = 0; t < extra * 6 && edges.length < extra; t++) {
    const u = 1 + Math.floor(Math.random() * count);
    const v = 1 + Math.floor(Math.random() * count);
    if (u === v) continue;
    const k = `${Math.min(u,v)}-${Math.max(u,v)}`;
    if (!used.has(k)) { used.add(k); edges.push({ u, v }); }
  }

  // Thêm 1–2 khuyên ngẫu nhiên (~40% xác suất)
  if (Math.random() < 0.4) {
    const loopCount = 1 + Math.floor(Math.random() * 2);
    const shuffled  = [...Array(count).keys()].map(i => i + 1).sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(loopCount, shuffled.length); i++) {
      const u = shuffled[i];
      const k = `loop-${u}`;
      if (!used.has(k)) { used.add(k); edges.push({ u, v: u }); }
    }
  }

  nodeCountEl.value = count;
  startNodeEl.value = 1;
  edgeListEl.value  = edges.map(e => `${e.u} ${e.v}`).join('\n');

  buildAdj();
  nodeState = {}; edgeState = {};
  clearResult();
  renderGraph();
}

// ============================================================
//  RESET
// ============================================================
function resetGraph() {
  stopAnim();
  nodeState = {}; edgeState = {};
  clearResult();
  renderGraph();
}

function clearResult() {
  if (resultEl) resultEl.textContent = '';
}

// ============================================================
//  HELPER: eKey
// ============================================================
function eKey(u, v) {
  if (u === v) return `loop_${u}`;
  return directed ? `${u}_${v}` : `${Math.min(u,v)}_${Math.max(u,v)}`;
}

// ============================================================
//  VẼ KHUYÊN (self-loop)
//  Dùng cubic Bézier: 2 điểm đầu/cuối nằm trên viền đỉnh,
//  2 control point đẩy xa ra ngoài → tạo vòng tròn đẹp.
//  Marker mũi tên gắn vào marker-end của <path> → hướng chính xác.
// ============================================================
function drawSelfLoop(node, visited) {
  const p      = PALETTE;
  const stroke = visited ? p.edgeVisited : p.edge;
  const sw     = visited ? 2.5 : 1.8;
  const markerId = visited ? 'arrow-visited' : 'arrow-default';

  // ── Hướng ra ngoài tính từ tâm đồ thị ──
  const rect = svgEl.getBoundingClientRect();
  const W  = rect.width  || graphEl.clientWidth  || 700;
  const H  = rect.height || graphEl.clientHeight || 500;
  const dx = node.x - W / 2;
  const dy = node.y - H / 2;
  const d  = Math.sqrt(dx * dx + dy * dy) || 1;
  // Vector đơn vị hướng ra ngoài
  const ox = dx / d,  oy = dy / d;
  // Vector vuông góc (sang phải của ox,oy)
  const px = -oy,     py =  ox;

  // ── Hai điểm bắt đầu / kết thúc trên viền đỉnh ──
  // Lệch ±25° so với hướng ra để vòng khép kín đẹp
  const SPREAD = 0.44; // radian (~25°)
  const cosS = Math.cos(SPREAD), sinS = Math.sin(SPREAD);

  // Điểm xuất phát P0: xoay hướng +SPREAD quanh tâm đỉnh
  const d0x = ox * cosS - oy * sinS;
  const d0y = ox * sinS + oy * cosS;
  const P0x = node.x + d0x * NODE_R;
  const P0y = node.y + d0y * NODE_R;

  // Điểm kết thúc P3: xoay hướng -SPREAD
  const d3x = ox * cosS + oy * sinS;
  const d3y = -ox * sinS + oy * cosS;
  const P3x = node.x + d3x * NODE_R;
  const P3y = node.y + d3y * NODE_R;

  // ── Hai control point đẩy xa ra ngoài ──
  const BULGE = NODE_R * 2.6;  // khoảng đẩy ra ngoài
  const SIDE  = NODE_R * 1.1;  // khoảng sang hai bên

  const C1x = node.x + ox * BULGE + px * SIDE;
  const C1y = node.y + oy * BULGE + py * SIDE;
  const C2x = node.x + ox * BULGE - px * SIDE;
  const C2y = node.y + oy * BULGE - py * SIDE;

  // ── Path Bézier bậc 3 ──
  const pathData = `M ${P0x} ${P0y} C ${C1x} ${C1y}, ${C2x} ${C2y}, ${P3x} ${P3y}`;

  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d',            pathData);
  el.setAttribute('fill',         'none');
  el.setAttribute('stroke',       stroke);
  el.setAttribute('stroke-width', sw);

  // Gắn mũi tên chỉ khi đồ thị có hướng
  if (directed) {
    el.setAttribute('marker-end', `url(#${markerId})`);
  }

  if (visited) {
    el.style.filter = `drop-shadow(0px 0px 4px ${p.edgeVisited})`;
  }

  svgEl.appendChild(el);
}

// ============================================================
//  SVG RENDER
// ============================================================
function renderGraph() {
  if (!svgEl) return;
  svgEl.innerHTML = '';
  const p = PALETTE;

  // ── Defs: filters + arrowhead markers ──
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowActive" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(99,102,241,.2)"/>
    </filter>
    <marker id="arrow-default" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0,10 3.5,0 7" fill="${p.nodeStroke}"/>
    </marker>
    <marker id="arrow-visited" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <polygon points="0 0,10 3.5,0 7" fill="${p.edgeVisited}"/>
    </marker>`;
  svgEl.appendChild(defs);

  // ── Đếm cặp ngược chiều (vẽ cong nếu cả hai chiều tồn tại) ──
  const pairCount = {};
  edges.forEach(({ u, v }) => {
    if (u === v) return;
    const k = `${Math.min(u,v)}-${Math.max(u,v)}`;
    pairCount[k] = (pairCount[k] || 0) + 1;
  });
  const pairIdx = {};

  // ── Vẽ cạnh thường (u ≠ v) ──
  edges.forEach(({ u, v }) => {
    // --- Khuyên: xử lý riêng ---
    if (u === v) {
      const node = nodes.find(n => n.id === u);
      if (node) drawSelfLoop(node, !!edgeState[eKey(u, v)]);
      return;
    }

    const n1 = nodes.find(n => n.id === u);
    const n2 = nodes.find(n => n.id === v);
    if (!n1 || !n2) return;

    const key = `${Math.min(u,v)}-${Math.max(u,v)}`;
    pairIdx[key] = (pairIdx[key] || 0) + 1;
    const isCurved = directed && pairCount[key] > 1 && pairIdx[key] === 2;

    const vis    = edgeState[eKey(u, v)];
    const stroke = vis ? p.edgeVisited : p.edge;
    const sw     = vis ? 2.5 : 1.5;
    const marker = directed ? (vis ? 'url(#arrow-visited)' : 'url(#arrow-default)') : null;

    const dx = n2.x - n1.x, dy = n2.y - n1.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx/len, uy = dy/len;
    const sx = n1.x + ux * NODE_R;
    const sy = n1.y + uy * NODE_R;
    const ex = n2.x - ux * NODE_R;
    const ey = n2.y - uy * NODE_R;

    let el;
    if (isCurved) {
      const cpx = (n1.x + n2.x) / 2 + (-uy) * 42;
      const cpy = (n1.y + n2.y) / 2 + ( ux) * 42;
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`);
      el.setAttribute('fill', 'none');
    } else {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('x1', sx); el.setAttribute('y1', sy);
      el.setAttribute('x2', ex); el.setAttribute('y2', ey);
    }
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', sw);
    if (marker) el.setAttribute('marker-end', marker);

    if (vis) {
      el.style.filter = `drop-shadow(0px 0px 4px ${p.edgeVisited})`;
    }

    svgEl.appendChild(el);
  });

  // ── Vẽ đỉnh (luôn vẽ sau cạnh để nằm trên) ──
  nodes.forEach(n => {
    const state  = nodeState[n.id] || 'default';
    const g      = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const fill   = state === 'active'  ? p.active    : state === 'visited' ? p.visited    : p.node;
    const stroke = state === 'active'  ? p.active    : state === 'visited' ? p.visited    : p.nodeStroke;
    const tColor = state === 'active'  ? p.activeText : state === 'visited' ? p.visitedText : p.nodeText;
    const filt   = state === 'active'  ? 'url(#glowActive)'
                 : state === 'visited' ? 'url(#glow)'
                 :                       'url(#shadow)';
    const scale  = state === 'active'  ? 1.18
                 : state === 'visited' ? 1.04 : 1;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx',           n.x);
    circle.setAttribute('cy',           n.y);
    circle.setAttribute('r',            NODE_R * scale);
    circle.setAttribute('fill',         fill);
    circle.setAttribute('stroke',       stroke);
    circle.setAttribute('stroke-width', state === 'default' ? 2 : 2.5);
    circle.setAttribute('filter',       filt);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x',                 n.x);
    text.setAttribute('y',                 n.y);
    text.setAttribute('text-anchor',       'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill',              tColor);
    text.setAttribute('font-size',         '14');
    text.setAttribute('font-weight',       'bold');
    text.setAttribute('font-family',       'Times New Roman, serif');
    text.textContent = n.id;

    g.appendChild(circle);
    g.appendChild(text);
    svgEl.appendChild(g);
  });
}

// ============================================================
//  TRAVERSAL ENGINE
// ============================================================
function stopAnim() {
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }
}

// BFS
function bfsOrder(start) {
  const ev = [], vis = new Set(), q = [start];
  vis.add(start);
  while (q.length) {
    const cur = q.shift();
    ev.push({ type: 'node_active',  id: cur });

    // Xử lý khuyên của đỉnh hiện tại (nếu có)
    edges
      .filter(e => e.u === e.v && e.u === cur)
      .forEach(() => ev.push({ type: 'edge', u: cur, v: cur }));

    ev.push({ type: 'node_visited', id: cur });
    for (const nb of (adjList[cur] || [])) {
      if (nb === cur) continue; // khuyên đã xử lý riêng
      if (!vis.has(nb)) {
        vis.add(nb);
        ev.push({ type: 'edge', u: cur, v: nb });
        q.push(nb);
      }
    }

    // Đồ thị rời rạc: nạp thêm đỉnh chưa thăm
    if (q.length === 0) {
      for (const node in adjList) {
        const nb = Number(node);
        if (!vis.has(nb)) {
          vis.add(nb);
          q.push(nb);
          break;
        }
      }
    }
  }
  return ev;
}

// DFS
function dfsOrder(start) {
  const ev = [], vis = new Set();
  function dfs(cur) {
    vis.add(cur);
    ev.push({ type: 'node_active',  id: cur });

    // Xử lý khuyên của đỉnh hiện tại (nếu có)
    edges
      .filter(e => e.u === e.v && e.u === cur)
      .forEach(() => ev.push({ type: 'edge', u: cur, v: cur }));

    ev.push({ type: 'node_visited', id: cur });
    for (const nb of (adjList[cur] || [])) {
      if (nb === cur) continue; // khuyên đã xử lý riêng
      if (!vis.has(nb)) {
        ev.push({ type: 'edge', u: cur, v: nb });
        dfs(nb);
      }
    }
  }
  dfs(start);
  return ev;
}

function runTraversal(startId) {
  const type  = algoSelect.value;
  const order = type === 'bfs' ? bfsOrder(startId) : dfsOrder(startId);
  const speed = parseInt(document.getElementById('speedRange').value) || 600;
  const visitOrder = [];
  let step = 0;

  function tick() {
    if (step >= order.length) { animTimer = null; return; }
    const item = order[step++];

    if (item.type === 'node_active')  nodeState[item.id] = 'active';
    if (item.type === 'node_visited') {
      nodeState[item.id] = 'visited';
      visitOrder.push(item.id);
      if (resultEl) resultEl.textContent = visitOrder.join(' → ');
    }
    if (item.type === 'edge') edgeState[eKey(item.u, item.v)] = true;

    renderGraph();
    animTimer = setTimeout(tick, speed);
  }
  tick();
}

// ============================================================
//  NÚT RUN
// ============================================================
runBtn.addEventListener('click', () => {
  const parsed = parseInput();
  if (!parsed) return;

  stopAnim();
  nodeState = {}; edgeState = {};
  clearResult();

  directed = graphTypeSel.value === 'directed';
  nodes    = layoutNodes(parsed.n);
  edges    = parsed.edges;
  buildAdj();
  renderGraph();

  setTimeout(() => runTraversal(parsed.start), 80);
});

// ============================================================
//  RESIZE
// ============================================================
window.addEventListener('resize', () => {
  if (nodes.length) {
    const n  = nodes.length;
    nodes    = layoutNodes(n);
    renderGraph();
  }
});
