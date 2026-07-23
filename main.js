import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

// Configuration
const R = 10;
const W = 16;
const T = 0.5; // thickness

// State
let scene, camera, renderer, controls;
const squares = []; // Array to hold the 64 square meshes
let pieces = []; // Array to hold piece objects

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedSquare = null;
let selectedPiece = null;
let currentTurn = 'white';
let validMoves = [];
let promotingPiece = null;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Dark grey theme

    document.getElementById('btn-queen').addEventListener('click', () => promotePawn('Q'));
    document.getElementById('btn-knight').addEventListener('click', () => promotePawn('N'));
    
    document.getElementById('help-btn').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'block';
    });
    document.getElementById('close-help-btn').addEventListener('click', () => {
        document.getElementById('help-modal').style.display = 'none';
    });

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, -30, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 4.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Brighter ambient
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(20, 20, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa0a0ff, 1.0);
    dirLight2.position.set(-20, -20, -20);
    scene.add(dirLight2);

    createBoard();
    createEdges();
    setupGame();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onClick);
    
    animate();
}

function getMobiusPoint(theta, w, thicknessOffset) {
    const alpha = theta / 2;
    const cx = R * Math.cos(theta);
    const cy = R * Math.sin(theta);
    const cz = 0;
    
    // S_w: ruling vector
    const vx = Math.cos(alpha) * Math.cos(theta);
    const vy = Math.cos(alpha) * Math.sin(theta);
    const vz = Math.sin(alpha);
    
    // Derivative of center circle
    const cx_prime = -R * Math.sin(theta);
    const cy_prime = R * Math.cos(theta);
    const cz_prime = 0;
    
    // Derivative of ruling vector
    const vx_prime = -0.5 * Math.sin(alpha) * Math.cos(theta) - Math.cos(alpha) * Math.sin(theta);
    const vy_prime = -0.5 * Math.sin(alpha) * Math.sin(theta) + Math.cos(alpha) * Math.cos(theta);
    const vz_prime = 0.5 * Math.cos(alpha);
    
    // S_theta: tangent in theta direction
    const stx = cx_prime + w * vx_prime;
    const sty = cy_prime + w * vy_prime;
    const stz = cz_prime + w * vz_prime;
    
    // Normal = S_theta x S_w
    let nx = sty * vz - stz * vy;
    let ny = stz * vx - stx * vz;
    let nz = stx * vy - sty * vx;
    
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
    nx /= len; ny /= len; nz /= len;
    
    const px = cx + w * vx + nx * thicknessOffset;
    const py = cy + w * vy + ny * thicknessOffset;
    const pz = cz + w * vz + nz * thicknessOffset;
    
    return { pos: new THREE.Vector3(px, py, pz), normal: new THREE.Vector3(nx, ny, nz) };
}

function createSquareGeometry(r, c) {
    const thetaStart = r * Math.PI / 4;
    const thetaEnd = (r + 1) * Math.PI / 4;
    
    const wStart = -W/2 + c * (W/4);
    const wEnd = -W/2 + (c + 1) * (W/4);
    
    const thetaSegments = 8;
    const wSegments = 4;
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const normals = [];
    const uvs = [];
    
    for (let i = 0; i <= thetaSegments; i++) {
        const u = i / thetaSegments;
        const theta = thetaStart + u * (thetaEnd - thetaStart);
        for (let j = 0; j <= wSegments; j++) {
            const v = j / wSegments;
            const w = wStart + v * (wEnd - wStart);
            const pt = getMobiusPoint(theta, w, T/2);
            vertices.push(pt.pos.x, pt.pos.y, pt.pos.z);
            normals.push(pt.normal.x, pt.normal.y, pt.normal.z);
            uvs.push(u, v);
        }
    }
    
    for (let i = 0; i < thetaSegments; i++) {
        for (let j = 0; j < wSegments; j++) {
            const a = i * (wSegments + 1) + j;
            const b = i * (wSegments + 1) + j + 1;
            const c_idx = (i + 1) * (wSegments + 1) + j;
            const d = (i + 1) * (wSegments + 1) + j + 1;
            
            indices.push(a, c_idx, b);
            indices.push(b, c_idx, d);
        }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    return geometry;
}

function createSquareCanvasTexture(r, c, isWhite) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Fill background with square base color
    ctx.fillStyle = isWhite ? '#eeeeee' : '#444444';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle inner border for square boundary definition
    ctx.strokeStyle = isWhite ? '#cccccc' : '#333333';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 250);

    // Write coordinate text on the corner of the square
    const text = `(${r},${c})`;
    ctx.font = 'bold 36px monospace, sans-serif';
    
    const x = 14;
    const y = 14;
    
    // High contrast backdrop for maximum clarity
    ctx.fillStyle = isWhite ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.35)';
    const textMetrics = ctx.measureText(text);
    ctx.fillRect(x - 4, y - 4, textMetrics.width + 12, 44);

    ctx.fillStyle = isWhite ? '#111111' : '#ffffff';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createBoard() {
    for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 4; c++) {
            const geo = createSquareGeometry(r, c);
            const isWhite = (r + c) % 2 === 0;
            const texture = createSquareCanvasTexture(r, c, isWhite);
            
            const mat = new THREE.MeshStandardMaterial({ 
                map: texture,
                roughness: isWhite ? 0.3 : 0.4, 
                metalness: 0.1 
            });
            
            const mesh = new THREE.Mesh(geo, mat);
            mesh.userData = { r, c };
            scene.add(mesh);
            squares.push(mesh);
        }
    }
}

function createEdges() {
    // A single continuous edge for the Mobius strip
    // It traces the boundary w = -W/2 from theta 0 to 4*PI
    const edgeGeo = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 4 * Math.PI;
        // The edge is at w = -W/2. 
        // We need points at +T/2 and -T/2.
        // Wait, for theta in [0, 4*PI], the top surface is ALWAYS +T/2.
        // The "bottom" of the board at this theta is physically on the other side of the Mobius strip.
        // But geometrically, if we just connect +T/2 to -T/2 at w = -W/2, we form the edge!
        const ptTop = getMobiusPoint(theta, -W/2, T/2);
        const ptBot = getMobiusPoint(theta, -W/2, -T/2);
        vertices.push(ptTop.pos.x, ptTop.pos.y, ptTop.pos.z);
        vertices.push(ptBot.pos.x, ptBot.pos.y, ptBot.pos.z);
    }
    
    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        
        indices.push(a, b, c);
        indices.push(b, d, c);
    }
    
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    edgeGeo.setIndex(indices);
    edgeGeo.computeVertexNormals();
    
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6 });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    scene.add(edgeMesh);
}

function setupGame() {
    // Initial board setup as specified by user
    /*
    White side (r=0..7)
    Row 2: 4 pawns
    Row 3: Rook, King, Bishop, Knight
    Row 4: Knight, Queen, Bishop, Rook
    Row 5: 4 pawns
    Black side (r=8..15)
    Same arrangement
    */
    const initialSetup = [
        { r: 6, pieces: ['P', 'P', 'P', 'P'], color: 'white', dir: -1 },
        { r: 7, pieces: ['R', 'K', 'B', 'N'], color: 'white', dir: -1 },
        { r: 8, pieces: ['N', 'Q', 'B', 'R'], color: 'white', dir: 1 },
        { r: 9, pieces: ['P', 'P', 'P', 'P'], color: 'white', dir: 1 },
        { r: 14, pieces: ['P', 'P', 'P', 'P'], color: 'black', dir: -1 },
        { r: 15, pieces: ['R', 'K', 'B', 'N'], color: 'black', dir: -1 },
        { r: 0, pieces: ['N', 'Q', 'B', 'R'], color: 'black', dir: 1 },
        { r: 1, pieces: ['P', 'P', 'P', 'P'], color: 'black', dir: 1 }
    ];

    initialSetup.forEach(rowSetup => {
        rowSetup.pieces.forEach((type, c) => {
            createPiece(type, rowSetup.color, rowSetup.r, c, rowSetup.dir);
        });
    });
}

function createPiece(type, color, r, c, dir) {
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
        color: color === 'white' ? 0xffffff : 0x1e293b,
        metalness: 0.3,
        roughness: 0.2,
    });

    const addMesh = (geo, yOffset, rx = 0, ry = 0, rz = 0) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = yOffset;
        if (rx) mesh.rotation.x = rx;
        if (ry) mesh.rotation.y = ry;
        if (rz) mesh.rotation.z = rz;
        group.add(mesh);
        return mesh;
    };

    const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
    
    switch (type) {
        case 'P': // Pawn: Small cone with sphere top
            addMesh(baseGeo, 0.1);
            addMesh(new THREE.ConeGeometry(0.25, 0.8, 16), 0.6);
            addMesh(new THREE.SphereGeometry(0.15, 16, 16), 1.0);
            break;
        case 'R': // Rook: Solid block tower
            addMesh(baseGeo, 0.1);
            addMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16), 0.6);
            addMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8), 1.15); // Octagonal battlement
            break;
        case 'N': // Knight: Leaning horse shape
            addMesh(baseGeo, 0.1);
            const neck = addMesh(new THREE.CylinderGeometry(0.2, 0.3, 1.0, 16), 0.6, Math.PI / 8);
            const snout = addMesh(new THREE.CylinderGeometry(0.15, 0.2, 0.6, 16), 1.0, Math.PI / 2);
            snout.position.z = -0.2; // Protrude forward (-Z is forward)
            break;
        case 'B': // Bishop: Tall elegant diamond
            addMesh(baseGeo, 0.1);
            addMesh(new THREE.ConeGeometry(0.25, 1.2, 16), 0.8);
            addMesh(new THREE.SphereGeometry(0.1, 16, 16), 1.45);
            break;
        case 'Q': // Queen: Tall flared cylinder with small crown
            addMesh(baseGeo, 0.1);
            addMesh(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 16), 0.9);
            addMesh(new THREE.CylinderGeometry(0.4, 0.2, 0.3, 12), 1.75);
            addMesh(new THREE.SphereGeometry(0.1, 16, 16), 1.95);
            break;
        case 'K': // King: Tall tower with cross
            addMesh(baseGeo, 0.1);
            addMesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 16), 1.0);
            addMesh(new THREE.CylinderGeometry(0.35, 0.25, 0.2, 16), 1.9);
            addMesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), 2.2); // Cross vertical
            addMesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), 2.25); // Cross horizontal
            break;
    }

    // Scale the piece by 2x
    group.scale.set(2.0, 2.0, 2.0);

    // Position and orient on board
    positionPiece(group, r, c, dir);
    
    scene.add(group);
    pieces.push({ mesh: group, type, color, r, c, dir });
}

function positionPiece(mesh, r, c, dir) {
    // Center of the square
    const theta = (r + 0.5) * Math.PI / 4;
    const w = -W/2 + (c + 0.5) * (W/4);
    
    const pt = getMobiusPoint(theta, w, T/2);
    
    mesh.position.copy(pt.pos);
    
    // Orient piece to normal, and align -Z to "forward"
    const thetaFwd = theta + (dir || 1) * 0.01;
    const ptFwd = getMobiusPoint(thetaFwd, w, T/2);
    
    const forward = new THREE.Vector3().subVectors(ptFwd.pos, pt.pos).normalize();
    const up = pt.normal;
    
    // We want local -Z to be 'forward'. So local +Z is 'back'
    const back = forward.clone().negate();
    const right = new THREE.Vector3().crossVectors(up, back).normalize();
    
    const mat = new THREE.Matrix4().makeBasis(right, up, back);
    mesh.quaternion.setFromRotationMatrix(mat);
}

function setPieceEmissive(pieceMesh, hexColor) {
    pieceMesh.traverse(child => {
        if (child.isMesh) {
            child.material.emissive.setHex(hexColor);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onClick(event) {
    if (currentTurn === 'gameover' || promotingPiece) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check pieces
    const pieceMeshes = pieces.map(p => p.mesh);
    const pieceIntersects = raycaster.intersectObjects(pieceMeshes, true);
    
    if (pieceIntersects.length > 0) {
        const clickedMesh = pieceIntersects[0].object;
        let piece = null;
        let curr = clickedMesh;
        while(curr && !piece) {
            piece = pieces.find(p => p.mesh === curr);
            curr = curr.parent;
        }
        
        if (piece) {
            if (piece.color === currentTurn) {
                selectPiece(piece);
                return;
            } else if (selectedPiece) {
                tryMove(selectedPiece, piece.r, piece.c);
                return;
            }
        }
    }

    // Check squares
    const squareIntersects = raycaster.intersectObjects(squares);
    if (squareIntersects.length > 0) {
        const clickedSquare = squareIntersects[0].object;
        const { r, c } = clickedSquare.userData;
        
        const pieceOnSquare = getPieceAt(r, c);
        
        if (pieceOnSquare && pieceOnSquare.color === currentTurn) {
            selectPiece(pieceOnSquare);
        } else if (selectedPiece) {
            tryMove(selectedPiece, r, c);
        } else {
            deselectAll();
        }
    } else {
        deselectAll();
    }
}

function getPieceAt(r, c, state = pieces) {
    return state.find(p => p.r === r && p.c === c);
}

function getPseudoLegalMoves(piece, state = pieces) {
    const moves = [];
    
    function addMove(tr, tc, captureOnly = false, moveOnly = false) {
        if (tc < 0 || tc > 3) return false; // Off board
        tr = (tr % 16 + 16) % 16; // Wrap
        
        const targetPiece = getPieceAt(tr, tc, state);
        if (targetPiece) {
            if (!moveOnly && targetPiece.color !== piece.color) {
                moves.push({ r: tr, c: tc });
            }
            return false; // Blocked by piece
        } else {
            if (!captureOnly) {
                moves.push({ r: tr, c: tc });
            }
            return true; // Path is clear
        }
    }
    
    const { type, r, c, dir } = piece;
    
    if (type === 'P') {
        const tr = r + dir;
        addMove(tr, c, false, true); // Forward move
        addMove(tr, c - 1, true, false); // Capture left
        addMove(tr, c + 1, true, false); // Capture right
    }
    
    if (type === 'R' || type === 'Q') {
        for (let i = 1; i < 16; i++) { if (!addMove(r + i, c)) break; }
        for (let i = 1; i < 16; i++) { if (!addMove(r - i, c)) break; }
        for (let i = 1; i < 4; i++) { if (!addMove(r, c + i)) break; }
        for (let i = 1; i < 4; i++) { if (!addMove(r, c - i)) break; }
    }
    
    if (type === 'B' || type === 'Q') {
        for (let i = 1; i < 16; i++) { if (!addMove(r + i, c + i)) break; }
        for (let i = 1; i < 16; i++) { if (!addMove(r + i, c - i)) break; }
        for (let i = 1; i < 16; i++) { if (!addMove(r - i, c + i)) break; }
        for (let i = 1; i < 16; i++) { if (!addMove(r - i, c - i)) break; }
    }
    
    if (type === 'N') {
        const offsets = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
        offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    }
    
    if (type === 'K') {
        const offsets = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    }
    
    return moves;
}

function isCheck(color, state = pieces) {
    const king = state.find(p => p.color === color && p.type === 'K');
    if (!king) return false;
    
    for (const p of state) {
        if (p.color !== color) {
            const moves = getPseudoLegalMoves(p, state);
            if (moves.some(m => m.r === king.r && m.c === king.c)) {
                return true;
            }
        }
    }
    return false;
}

function getValidMoves(piece) {
    const pseudoMoves = getPseudoLegalMoves(piece, pieces);
    const validMoves = [];
    
    for (const move of pseudoMoves) {
        const simulatedState = pieces.map(p => ({ ...p }));
        const simPiece = simulatedState.find(p => p.r === piece.r && p.c === piece.c);
        
        const targetIdx = simulatedState.findIndex(p => p.r === move.r && p.c === move.c);
        if (targetIdx !== -1) {
            simulatedState.splice(targetIdx, 1);
        }
        
        simPiece.r = move.r;
        simPiece.c = move.c;
        
        if (!isCheck(piece.color, simulatedState)) {
            validMoves.push(move);
        }
    }
    return validMoves;
}

function selectPiece(piece) {
    deselectAll();
    selectedPiece = piece;
    setPieceEmissive(piece.mesh, 0x3b82f6); // Highlight selected
    
    validMoves = getValidMoves(piece);
    validMoves.forEach(move => {
        const square = squares.find(s => s.userData.r === move.r && s.userData.c === move.c);
        if (square) {
            // Check if capture
            const targetPiece = getPieceAt(move.r, move.c);
            if (targetPiece) {
                square.material.emissive.setHex(0xef4444); // Red glow for capture
            } else {
                square.material.emissive.setHex(0x10b981); // Green glow for move
            }
        }
    });
    
    document.getElementById('status').innerText = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)} selected ${piece.type} at R${piece.r} C${piece.c}`;
}

function deselectAll() {
    if (selectedPiece) {
        setPieceEmissive(selectedPiece.mesh, 0x000000);
        selectedPiece = null;
    }
    squares.forEach(s => s.material.emissive.setHex(0x000000));
    validMoves = [];
    document.getElementById('status').innerText = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)} to move`;
}

let capturedWhite = [];
let capturedBlack = [];

const pieceSymbols = {
    white: { 'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔' },
    black: { 'P': '♟', 'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚' }
};

function tryMove(piece, targetR, targetC) {
    const isValid = validMoves.some(m => m.r === targetR && m.c === targetC);
    if (!isValid) return;

    // IMPORTANT: Clear validMoves IMMEDIATELY so double-clicks can't re-trigger
    validMoves = [];

    const targetPieceIdx = pieces.findIndex(p => p.r === targetR && p.c === targetC);
    if (targetPieceIdx !== -1) {
        const targetPiece = pieces[targetPieceIdx];
        
        // Ensure we only capture opponent pieces (sanity check)
        if (targetPiece.color !== piece.color) {
            scene.remove(targetPiece.mesh);
            
            if (targetPiece.color === 'white') {
                capturedWhite.push(targetPiece.type);
                document.getElementById('captured-white').innerText = capturedWhite.map(t => pieceSymbols.white[t]).join(' ');
            } else {
                capturedBlack.push(targetPiece.type);
                document.getElementById('captured-black').innerText = capturedBlack.map(t => pieceSymbols.black[t]).join(' ');
            }
            
            pieces.splice(targetPieceIdx, 1);
        }
    }
    
    // Move piece
    piece.r = targetR;
    piece.c = targetC;
    positionPiece(piece.mesh, piece.r, piece.c, piece.dir);
    
    // Pawn promotion
    if (piece.type === 'P') {
        const opponentBackRanks = {
            white: [15, 0],
            black: [7, 8]
        };
        if (opponentBackRanks[piece.color].includes(piece.r)) {
            promotingPiece = piece;
            document.getElementById('promotion-modal').style.display = 'block';
            return;
        }
    }
    
    finishTurn();
}

function finishTurn() {
    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    deselectAll();
    
    let hasValidMoves = false;
    for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        if (p.color === currentTurn) {
            const moves = getValidMoves(p);
            if (moves && moves.length > 0) {
                hasValidMoves = true;
                break;
            }
        }
    }
    
    if (!hasValidMoves) {
        if (isCheck(currentTurn)) {
            document.getElementById('status').innerText = `Checkmate! ${currentTurn === 'white' ? 'Black' : 'White'} wins!`;
        } else {
            document.getElementById('status').innerText = `Stalemate! Draw.`;
        }
        currentTurn = 'gameover';
    } else if (isCheck(currentTurn)) {
        document.getElementById('status').innerText = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)} to move (CHECK)`;
    } else {
        document.getElementById('status').innerText = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)} to move`;
    }
}

function promotePawn(newType) {
    if (!promotingPiece) return;
    
    scene.remove(promotingPiece.mesh);
    const pieceIdx = pieces.findIndex(p => p === promotingPiece);
    pieces.splice(pieceIdx, 1);
    
    createPiece(newType, promotingPiece.color, promotingPiece.r, promotingPiece.c, promotingPiece.dir);
    
    promotingPiece = null;
    document.getElementById('promotion-modal').style.display = 'none';
    
    finishTurn();
}

init();
