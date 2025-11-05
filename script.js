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

let roadPath = [];

let player = {
    x: 0,
    speed: 5,
};

let input = {
    left: false,
    right: false,
};

let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameOver = false;
let gameSpeed = 2;
let startTime = 0;
let elapsedTime = 0;


const gridSize = 10;
const gridSpacing = 100;
const roadWidth = 200;
const worldLength = 200;

function generateWorld() {
    world.points = [];
    world.edges = [];
    roadPath = [];

    let xOffset = 0;
    let turnDirection = 0;
    let turnSegmentLength = 0;

    for (let i = 0; i < worldLength; i++) {
        if (turnSegmentLength === 0) {
            const random = Math.random();
            if (random < 0.3) {
                turnDirection = (Math.random() < 0.5) ? -1 : 1;
                turnSegmentLength = Math.floor(Math.random() * 15) + 10;
            } else {
                turnDirection = 0;
                turnSegmentLength = Math.floor(Math.random() * 20) + 10;
            }
        }

        if (Math.abs(xOffset + turnDirection * 15) > 500) {
            turnDirection = -turnDirection;
        }

        xOffset += turnDirection * 15;
        roadPath.push(xOffset);
        turnSegmentLength--;

        const z = i * gridSpacing;

        // Floor lines
        for (let j = -gridSize / 2; j <= gridSize / 2; j++) {
            const x = j * gridSpacing + xOffset;
            world.points.push(new Point3D(x, 100, z));
            world.points.push(new Point3D(x, 100, z + gridSpacing));
            world.edges.push([world.points.length - 2, world.points.length - 1]);
        }

        for (let j = 0; j < gridSize; j++) {
            const x = (j - gridSize / 2) * gridSpacing + xOffset;
            world.points.push(new Point3D(x, 100, z));
            world.points.push(new Point3D(x + gridSpacing, 100, z));
            world.edges.push([world.points.length - 2, world.points.length - 1]);
        }

        // "Buildings"
        if (i > 10 && i % 5 === 0) {
            world.points.push(new Point3D(-roadWidth + xOffset, 100, z));
            world.points.push(new Point3D(-roadWidth + xOffset, -200, z));
            world.edges.push([world.points.length - 2, world.points.length - 1]);

            world.points.push(new Point3D(roadWidth + xOffset, 100, z));
            world.points.push(new Point3D(roadWidth + xOffset, -200, z));
            world.edges.push([world.points.length - 2, world.points.length - 1]);
        }
    }
}


function resetGame() {
    player.x = 0;
    world.zOffset = 0;
    score = 0;
    gameSpeed = 2;
    startTime = performance.now();
    gameOver = false;
    generateWorld();
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

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
}

function render() {
    elapsedTime = performance.now() - startTime;

    if (input.left) {
        player.x -= player.speed;
    }
    if (input.right) {
        player.x += player.speed;
    }

    const currentIndex = Math.floor(world.zOffset / gridSpacing);
    if (currentIndex < roadPath.length) {
        const currentXOffset = roadPath[currentIndex];
        if (player.x < currentXOffset - roadWidth || player.x > currentXOffset + roadWidth) {
            gameOver = true;
        }
    } else {
        gameOver = true; // End of the road
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
        ctx.fillText('GAME OVER', width / 2, height / 2);
        ctx.font = '24px "VT323", monospace';
        ctx.fillText('Press any key to restart', width / 2, height / 2 + 40);
        return;
    }

    gameSpeed += 0.001;
    world.zOffset += gameSpeed;

    requestAnimationFrame(render);
}

startTime = performance.now();
generateWorld();
render();
