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

const fov = 200;

function project(point) {
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

let roadPath = [];

let player = {
    x: 0,
    baseSpeed: 5,
    speed: 5,
};

let input = {
    left: false,
    right: false,
};

let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOver = false;
let gameSpeed = 5; // Increased initial speed
let startTime = 0;
let elapsedTime = 0;

const gridSize = 10;
const gridSpacing = 100;
const roadWidth = 180; // Decreased road width
let currentSegment = 0;
let xOffset = 0;
let turnDirection = 0;
let turnSegmentLength = 0;

function generateWorldSegment() {
    const segmentsToGenerate = 10;
    for (let i = 0; i < segmentsToGenerate; i++) {
        if (turnSegmentLength === 0) {
            const random = Math.random();
            if (random < 0.6) { // Increased turn frequency
                turnDirection = (Math.random() < 0.5) ? -1 : 1;
                turnSegmentLength = Math.floor(Math.random() * 5) + 8; // Shorter turn segments
            } else {
                turnDirection = 0;
                turnSegmentLength = Math.floor(Math.random() * 8) + 5; // Shorter straight segments
            }
        }

        if (Math.abs(xOffset + turnDirection * 25) > 600) { // Increased turn sharpness
            turnDirection = -turnDirection;
        }

        xOffset += turnDirection * 25; // Increased turn sharpness
        roadPath.push(xOffset);
        turnSegmentLength--;

        const z = (currentSegment + i) * gridSpacing;
        const currentPointsCount = world.points.length;

        // Floor lines
        for (let j = -gridSize / 2; j <= gridSize / 2; j++) {
            const x = j * gridSpacing + xOffset;
            world.points.push(new Point3D(x, 100, z));
            world.points.push(new Point3D(x, 100, z + gridSpacing));
            world.edges.push([currentPointsCount + (j + gridSize / 2) * 2, currentPointsCount + (j + gridSize / 2) * 2 + 1]);
        }

        for (let j = 0; j < gridSize; j++) {
            const x = (j - gridSize / 2) * gridSpacing + xOffset;
            world.points.push(new Point3D(x, 100, z));
            world.points.push(new Point3D(x + gridSpacing, 100, z));
            world.edges.push([world.points.length - 2, world.points.length - 1]);
        }

        // "Buildings"
        if ((currentSegment + i) > 10 && (currentSegment + i) % 5 === 0) {
            world.points.push(new Point3D(-roadWidth + xOffset, 100, z));
            world.points.push(new Point3D(-roadWidth + xOffset, -300, z));
            world.edges.push([world.points.length - 2, world.points.length - 1]);

            world.points.push(new Point3D(roadWidth + xOffset, 100, z));
            world.points.push(new Point3D(roadWidth + xOffset, -300, z));
            world.edges.push([world.points.length - 2, world.points.length - 1]);
        }
    }
    currentSegment += segmentsToGenerate;
}


function resetGame() {
    player.x = 0;
    world = { points: [], edges: [], zOffset: 0 };
    roadPath = [];
    currentSegment = 0;
    xOffset = 0;
    turnDirection = 0;
    turnSegmentLength = 0;

    score = 0;
    gameSpeed = 5; // Reset to increased initial speed
    startTime = performance.now();
    gameOver = false;

    generateWorldSegment();
    if (!animationFrameId) {
      render();
    }
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

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
}

let animationFrameId = null;

function render() {
    elapsedTime = performance.now() - startTime;
    player.speed = player.baseSpeed + gameSpeed / 2;

    if (input.left) {
        player.x -= player.speed;
    }
    if (input.right) {
        player.x += player.speed;
    }

    const currentIndex = Math.floor(world.zOffset / gridSpacing);
    if (currentIndex >= currentSegment - 15) {
        generateWorldSegment();
    }

    if (currentIndex < roadPath.length) {
        const currentXOffset = roadPath[currentIndex];
        if (player.x < currentXOffset - roadWidth || player.x > currentXOffset + roadWidth) {
            gameOver = true;
        }
    }


    score = Math.floor(world.zOffset / 10);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#0ff';
    ctx.beginPath();

    for (const edge of world.edges) {
        const p1 = { ...world.points[edge[0]] };
        const p2 = { ...world.points[edge[1]] };

        if (!p1 || !p2) continue;

        p1.x -= player.x;
        p2.x -= player.x;
        p1.z -= world.zOffset;
        p2.z -= world.zOffset;

        if (p1.z < -fov || p2.z > 10000) {
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

    // HUD
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
    ctx.fillText(`High Score: ${highScore}`, 20, 70);

    ctx.textAlign = 'right';
    ctx.fillText(`Time: ${formatTime(elapsedTime)}`, width - 20, 40);
    ctx.fillText(`Speed: ${(gameSpeed * 10).toFixed(0)}`, width - 20, 70);

    if (gameOver) {
        ctx.textAlign = 'center';
        ctx.font = '48px "VT323", monospace';
        ctx.fillText('GAME OVER', width / 5, height / 5);
        ctx.font = '24px "VT323", monospace';
        ctx.fillText('Press any key to restart', width / 2, height / 2 + 40);
        animationFrameId = null;
        return;
    }

    gameSpeed += 0.005; // Increased speed acceleration
    world.zOffset += gameSpeed;

    animationFrameId = requestAnimationFrame(render);
}

startTime = performance.now();
generateWorldSegment();
render();
