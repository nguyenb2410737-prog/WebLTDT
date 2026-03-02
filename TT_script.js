let canvas = document.getElementById("graphCanvas");
let ctx = canvas.getContext("2d");

let positions = [];
let visitedOrder = [];
let animationTimers = [];

// =======================
// DRAW GRAPH
// =======================
function drawGraph(n, edges, graphType) {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    positions = [];

    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    let radius = 180;

    for (let i = 0; i < n; i++) {
        let angle = (2 * Math.PI * i) / n;
        let x = centerX + radius * Math.cos(angle);
        let y = centerY + radius * Math.sin(angle);
        positions.push({ x, y });
    }

    // Vẽ cạnh
    edges.forEach(([u, v]) => {
        drawEdge(u, v, graphType === "directed");
    });

    // Vẽ đỉnh (hiển thị 1 → n)
    for (let i = 0; i < n; i++) {
        drawVertex(i, "#0ea5e9", i + 1);
    }
}

function drawEdge(u, v, directed) {
    let p1 = positions[u];
    let p2 = positions[v];
    if (!p1 || !p2) return;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = "#0369a1";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (directed) {
        let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        let arrowSize = 10;

        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(
            p2.x - arrowSize * Math.cos(angle - Math.PI / 6),
            p2.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            p2.x - arrowSize * Math.cos(angle + Math.PI / 6),
            p2.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = "#0369a1";
        ctx.fill();
    }
}

function drawVertex(i, color, label) {
    let pos = positions[i];
    if (!pos) return;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 22, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, pos.x, pos.y);
}

// =======================
// RUN BFS / DFS
// =======================
function runAlgorithm() {

    // Clear animation cũ
    animationTimers.forEach(timer => clearTimeout(timer));
    animationTimers = [];

    let n = parseInt(document.getElementById("vertices").value);
    let graphType = document.getElementById("graphType").value;
    let algo = document.getElementById("algorithm").value;
    let startInput = parseInt(document.getElementById("startVertex").value);
    let edgeText = document.getElementById("edgeList").value.trim();

    // ===== Validate =====
    if (isNaN(n) || n <= 0) {
        alert("Vui lòng nhập số đỉnh hợp lệ!");
        return;
    }

    if (isNaN(startInput) || startInput < 1 || startInput > n) {
        alert("Đỉnh bắt đầu phải từ 1 đến " + n);
        return;
    }

    let start = startInput - 1; // chuyển về 0-based

    // ===== Parse edges an toàn =====
    let edgesRaw = [];

    if (edgeText !== "") {
        edgesRaw = edgeText
            .split("\n")
            .map(line => line.trim())
            .filter(line => line !== "")
            .map(line => line.split(/\s+/).map(Number));
    }

    let adj = Array.from({ length: n }, () => []);
    let edges = [];

    for (let [uInput, vInput] of edgesRaw) {

        if (
            isNaN(uInput) || isNaN(vInput) ||
            uInput < 1 || vInput < 1 ||
            uInput > n || vInput > n
        ) {
            alert("Cạnh phải có đỉnh từ 1 đến " + n);
            return;
        }

        let u = uInput - 1; // chuyển về 0-based
        let v = vInput - 1;

        adj[u].push(v);
        if (graphType === "undirected") {
            adj[v].push(u);
        }

        edges.push([u, v]);
    }

    drawGraph(n, edges, graphType);

    visitedOrder = [];

    if (algo === "bfs") {
        bfs(adj, start);
    } else {
        dfs(adj, start);
    }

    // Hiển thị kết quả dạng 1 → n
    document.getElementById("resultBox").value =
        visitedOrder.map(v => v + 1).join(" → ");

    animateVisit();
}

// =======================
// BFS
// =======================
function bfs(adj, start) {
    let visited = Array(adj.length).fill(false);
    let queue = [start];
    visited[start] = true;

    while (queue.length > 0) {
        let u = queue.shift();
        visitedOrder.push(u);

        for (let v of adj[u]) {
            if (!visited[v]) {
                visited[v] = true;
                queue.push(v);
            }
        }
    }
}

// =======================
// DFS
// =======================
function dfs(adj, start) {
    let visited = Array(adj.length).fill(false);

    function dfsVisit(u) {
        visited[u] = true;
        visitedOrder.push(u);

        for (let v of adj[u]) {
            if (!visited[v]) {
                dfsVisit(v);
            }
        }
    }

    dfsVisit(start);
}

// =======================
// ANIMATION
// =======================
function animateVisit() {
    visitedOrder.forEach((v, index) => {
        let timer = setTimeout(() => {
            drawVertex(v, "#22c55e", v + 1);
        }, index * 600);

        animationTimers.push(timer);
    });
}