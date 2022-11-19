Habitat.registerEverything();
const pointer = getPointer();

defineGetter(pointer, "x", () => pointer.position[0]);
defineGetter(pointer, "y", () => pointer.position[1]);

const stage = new Stage();

popChart = null;

tickCount = 0;

const Square = struct({ x: 0, y: 0, width: 2, height: 2, color: GREY, isAlive: false, needsRedraw: true });

const Grid = struct({ width: 100, height: 100, cellSize: 2, cells: [], nextCells: [] });

mainGrid = new Grid();

getNeighbors = (xi, yi) => {
    let neighbors = [];
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            if (i === 0 && j === 0) {
                continue;
            }
            let neighborX = xi + i;
            let neighborY = yi + j;

            if (neighborX < 0 || neighborY < 0 || neighborX >= mainGrid.width || neighborY >= mainGrid.height) {
                continue;
            }
            cell = getCell(neighborX, neighborY);
            neighbors.push(cell);
        }
    }
    return neighbors;
}

getNeighborhoodColor = (cells) => {
    cells = cells.filter((cell) => cell.isAlive);
    let counter = {};
    for (const cell of cells) {
        if (counter[cell.color] === undefined) {
            counter[cell.color] = 0;
        }
        counter[cell.color] += 1;
    }
    let max = 0;
    let maxColor = null;
    for (const color in counter) {
        if (counter[color] > max) {
            max = counter[color];
            maxColor = color;
        }
    }
    return maxColor;
}

isHovering = (square) => {
    return pointer.x > square.x && pointer.x < square.x + square.width && pointer.y > square.y && pointer.y < square.y + square.height;
}

getCell = (x, y) => {
    return mainGrid.cells[x + y * mainGrid.width];
}

stage.start = () => {
    // init grid
    for (let i = 0; i < mainGrid.width; i++) {
        for (let j = 0; j < mainGrid.height; j++) {
            const sq = new Square({ x: i * mainGrid.cellSize, y: j * mainGrid.cellSize, color: maybe(0.5) ? GREY : new Splash(random(999)), needsRedraw: true });
            sq.isAlive = sq.color !== GREY;
            mainGrid.cells.push(sq);
        }
    }
    ctx = stage.context;

    // draw chart under grid

    popChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [tickCount],
            datasets: [{
                label: 'Population',
                data: [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                ],
                color: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: false,
                }
            }
        }
    }
    );
}


stage.tick = (context) => {
    // draw all the squares
    for (const square of mainGrid.cells) {
        if (square.needsRedraw) {
            context.fillStyle = square.color;
            context.fillRect(square.x, square.y, square.width, square.height);
            square.needsRedraw = false;
        }
    }
    // draw grid lines
    // run game of life rules
    for (let i = 0; i < mainGrid.width; i++) {
        for (let j = 0; j < mainGrid.height; j++) {
            let neighbors = getNeighbors(i, j);
            let aliveNeighbors = 0;
            aliveNeighbors = neighbors.filter((cell) => cell.isAlive).length;
            c = getCell(i, j);
            if (c.isAlive && (aliveNeighbors < 2 || aliveNeighbors > 3)) {
                mainGrid.nextCells.push(new Square({ x: c.x, y: c.y, color: GREY, isAlive: false, needsRedraw: true }));
            } else if (aliveNeighbors === 3) {
                mainGrid.nextCells.push(new Square({ x: c.x, y: c.y, color: getNeighborhoodColor(neighbors), isAlive: true, needsRedraw: true }));
            } else {
                mainGrid.nextCells.push(c);
            }

        }
    }

    // update chart
    const aliveCells = mainGrid.cells.filter((cell) => cell.isAlive);
    popChart.data.labels.push(tickCount);
    popChart.data.datasets[0].data.push(aliveCells.length);
    popChart.update();

    const touches = getTouches();
    for (const touch of touches) {
        if (!touch) {
            continue;
        }
        const [x, y] = touch.position;
        cell = getCell(Math.floor(x / mainGrid.cellSize), Math.floor(y / mainGrid.cellSize));
        if (cell) {
            cell.isAlive = true;
        }
    }
    mainGrid.cells = mainGrid.nextCells;
    mainGrid.nextCells = [];

    tickCount += 1;
}

on(mouseDown("Middle"), () => {
    // start recording
    const chunks = []; // here we will store our recorded media chunks (Blobs)
    const stream = stage.context.canvas.captureStream(); // grab our canvas MediaStream
    const rec = new MediaRecorder(stream); // init the recorder
    // every time the recorder has new data, we will store it in our array
    rec.ondataavailable = e => chunks.push(e.data);
    // only when the recorder stops, we construct a complete Blob from all the chunks
    rec.onstop = e => exportVid(new Blob(chunks, { type: 'video/webm' }));

    rec.start();
    setTimeout(() => rec.stop(), 10000); // stop recording in 10s
});

function exportVid(blob) {
    const vid = document.createElement('video');
    vid.src = URL.createObjectURL(blob);
    vid.controls = true;
    document.body.appendChild(vid);
    const a = document.createElement('a');
    a.download = 'myvid.webm';
    a.href = vid.src;
    a.textContent = 'download the video';
    document.body.appendChild(a);
    a.click();
}