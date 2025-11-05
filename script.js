const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

class Point3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

function project(point) {
    const fov = 200;
    const scale = fov / (fov + point.z);
    return {
        x: point.x * scale + width / 2,
        y: point.y * scale + height / 2,
    };
}

let world = {
    points: [],
    edges: [],
    zOffset: 0,
};

let player = {
    x: 0,
    speed: 5,
};

let input = {
    left: false,
    right: false,
};

let score = 0;
let gameOver = false;

function resetGame() {
    player.x = 0;
    world.zOffset = 0;
    score = 0;
    gameOver = false;
    render();
}

window.addEventListener('keydown', (e) => {
    if (gameOver) {
        resetGame();
        return;
    }
    if (e.key === 'a' || e.key === 'ArrowLeft') {
        input.left = true;
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
        input.right = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') {
        input.left = false;
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
        input.right = false;
    }
});

const gridSize = 10;
const gridSpacing = 100;
const roadWidth = 200;

for (let i = 0; i < 50; i++) {
    const z = i * gridSpacing;

    // Floor lines
    for (let j = -gridSize / 2; j <= gridSize / 2; j++) {
        const x = j * gridSpacing;
        world.points.push(new Point3D(x, 100, z));
        world.points.push(new Point3D(x, 100, z + gridSpacing));
        world.edges.push([world.points.length - 2, world.points.length - 1]);
    }

    for (let j = 0; j < gridSize; j++) {
        const x = (j - gridSize / 2) * gridSpacing;
        world.points.push(new Point3D(x, 100, z));
        world.points.push(new Point3D(x + gridSpacing, 100, z));
        world.edges.push([world.points.length - 2, world.points.length - 1]);
    }

    // "Buildings"
    if (i % 5 === 0) {
        world.points.push(new Point3D(-roadWidth, 100, z));
        world.points.push(new Point3D(-roadWidth, -200, z));
        world.edges.push([world.points.length - 2, world.points.length - 1]);

        world.points.push(new Point3D(roadWidth, 100, z));
        world.points.push(new Point3D(roadWidth, -200, z));
        world.edges.push([world.points.length - 2, world.points.length - 1]);
    }
}

function render() {
    if (input.left) {
        player.x -= player.speed;
    }
    if (input.right) {
        player.x += player.speed;
    }

    if (player.x < -roadWidth || player.x > roadWidth) {
        gameOver = true;
    }

    score = Math.floor(world.zOffset / 10);

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#0ff';
    ctx.beginPath();

    for (const edge of world.edges) {
        const p1 = { ...world.points[edge[0]] };
        const p2 = { ...world.points[edge[1]] };

        p1.x -= player.x;
        p2.x -= player.x;
        p1.z -= world.zOffset;
        p2.z -= world.zOffset;


        if (p1.z < -200 || p2.z < -200) {
            continue;
        }

        const projectedP1 = project(p1);
        const projectedP2 = project(p2);

        ctx.moveTo(projectedP1.x, projectedP1.y);
        ctx.lineTo(projectedP2.x, projectedP2.y);
    }

    ctx.stroke();

    ctx.fillStyle = '#0ff';
    ctx.font = '24px "VT323", monospace';
    ctx.fillText(`Score: ${score}`, 20, 40);

    if (gameOver) {
        ctx.font = '48px "VT323", monospace';
        ctx.fillText('GAME OVER', width / 2 - 120, height / 2);
        ctx.font = '24px "VT323", monospace';
        ctx.fillText('Press any key to restart', width / 2 - 160, height / 2 + 40);
        return;
    }

    world.zOffset += 2;

    requestAnimationFrame(render);
}

render();
