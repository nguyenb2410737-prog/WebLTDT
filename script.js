const graphDiv = document.getElementById("graph");
const svg = document.getElementById("edges");

let nodes = {};
let adj = {};
let edgesSet = new Set();

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ================= CLEAR ================= */
function clearGraph() {
  nodes = {};
  adj = {};
  edgesSet.clear();
  graphDiv.querySelectorAll(".node").forEach(n => n.remove());
  svg.querySelectorAll("line,path").forEach(e => e.remove());
  document.getElementById("result").innerText = "";
}

/* ================= CREATE NODES ================= */
function createNodes(n) {
  const centerX = graphDiv.clientWidth / 2;
  const centerY = graphDiv.clientHeight / 2;
  const radius = 180;

  for (let i = 1; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;

    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const div = document.createElement("div");
    div.className = "node";
    div.innerText = i;
    div.style.left = x + "px";
    div.style.top = y + "px";

    graphDiv.appendChild(div);

    nodes[i] = { x, y, el: div };
    adj[i] = [];
  }
}

/* ================= EDGE DRAW ================= */
function drawEdge(u, v, directed) {
  const { x: x1, y: y1 } = nodes[u];
  const { x: x2, y: y2 } = nodes[v];

  const key = u + "-" + v;
  const reverseKey = v + "-" + u;

  let edge;

  // 🔥 nếu có 2 chiều → vẽ cong
  if (edgesSet.has(reverseKey)) {
    edge = document.createElementNS("http://www.w3.org/2000/svg", "path");

    const dx = (x1 + x2) / 2 + 40;
    const dy = (y1 + y2) / 2 - 40;

    edge.setAttribute("d", `M ${x1} ${y1} Q ${dx} ${dy} ${x2} ${y2}`);
  } else {
    edge = document.createElementNS("http://www.w3.org/2000/svg", "line");

    const p = adjustLine(x1, y1, x2, y2);

    edge.setAttribute("x1", x1);
    edge.setAttribute("y1", y1);
    edge.setAttribute("x2", p.x2);
    edge.setAttribute("y2", p.y2);
  }

  edge.setAttribute("class", "edge");

  if (directed) {
    edge.setAttribute("marker-end", "url(#arrowhead)");
  }

  svg.appendChild(edge);
  edgesSet.add(key);
}

/* ================= FIX LINE ================= */
function adjustLine(x1, y1, x2, y2, r = 21) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const ratio = (dist - r) / dist;

  return {
    x2: x1 + dx * ratio,
    y2: y1 + dy * ratio
  };
}

/* ================= BUILD GRAPH ================= */
function buildGraph() {
  clearGraph();

  const n = parseInt(document.getElementById("n").value);
  const input = document.getElementById("edgesInput").value.trim();
  const directed = document.getElementById("type").value === "directed";

  createNodes(n);

  const lines = input.split("\n");

  lines.forEach(line => {
    const [u, v] = line.split(" ").map(Number);

    if (!u || !v) return;

    adj[u].push(v);
    drawEdge(u, v, directed);

    if (!directed) {
      adj[v].push(u);
    }
  });
}

/* ================= BFS ================= */
async function BFS(start) {
  let visited = {};
  let queue = [start];

  while (queue.length) {
    let u = queue.shift();

    if (visited[u]) continue;

    visited[u] = true;

    nodes[u].el.classList.add("visiting");
    document.getElementById("result").innerText += u + " ";

    await sleep(600);

    nodes[u].el.classList.remove("visiting");
    nodes[u].el.classList.add("visited");

    for (let v of adj[u]) {
      if (!visited[v]) queue.push(v);
    }
  }
}

/* ================= DFS ================= */
async function DFS(u, visited) {
  visited[u] = true;

  nodes[u].el.classList.add("visiting");
  document.getElementById("result").innerText += u + " ";

  await sleep(600);

  nodes[u].el.classList.remove("visiting");
  nodes[u].el.classList.add("visited");

  for (let v of adj[u]) {
    if (!visited[v]) {
      await DFS(v, visited);
    }
  }
}

/* ================= RUN ================= */
document.getElementById("run-btn").onclick = async () => {
  buildGraph();

  const start = parseInt(document.getElementById("start").value);
  const algo = document.getElementById("algo").value;

  if (algo === "bfs") {
    await BFS(start);
  } else {
    await DFS(start, {});
  }
};