import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Chess } from 'chess.js';
import './style.css';

const PIECE_NAMES = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };
const VALUES = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 };
const FILES = 'abcdefgh';

function evaluate(chess) {
  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = board[r][f];
    if (!p) continue;
    const sign = p.color === 'w' ? 1 : -1;
    const center = 3.5 - (Math.abs(3.5 - f) + Math.abs(3.5 - r)) / 2;
    score += sign * (VALUES[p.type] + (p.type === 'p' ? (p.color === 'w' ? 6 - r : r - 1) * 7 : center * 5));
  }
  return score;
}

function chooseComputerMove(chess, depth = 2) {
  const rootColor = chess.turn();
  const search = (game, left, alpha, beta) => {
    if (left === 0 || game.isGameOver()) return evaluate(game);
    const moves = game.moves({ verbose: true }).sort((a, b) => (b.captured ? VALUES[b.captured] : 0) - (a.captured ? VALUES[a.captured] : 0));
    if (game.turn() === 'w') {
      let best = -Infinity;
      for (const m of moves) {
        game.move(m);
        best = Math.max(best, search(game, left - 1, alpha, beta));
        game.undo(); alpha = Math.max(alpha, best); if (beta <= alpha) break;
      }
      return best;
    }
    let best = Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.min(best, search(game, left - 1, alpha, beta));
      game.undo(); beta = Math.min(beta, best); if (beta <= alpha) break;
    }
    return best;
  };
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  let bestMove = moves[0], bestScore = rootColor === 'w' ? -Infinity : Infinity;
  for (const move of moves) {
    chess.move(move);
    const score = search(chess, depth - 1, -Infinity, Infinity);
    chess.undo();
    if ((rootColor === 'w' && score > bestScore) || (rootColor === 'b' && score < bestScore)) {
      bestScore = score; bestMove = move;
    }
  }
  return bestMove;
}

function makePiece(type, color) {
  const group = new THREE.Group();
  const light = color === 'w';
  const mat = new THREE.MeshStandardMaterial({
    color: light ? 0xf2e8d5 : 0x202733,
    roughness: light ? 0.34 : 0.29,
    metalness: light ? 0.12 : 0.42
  });
  const trim = new THREE.MeshStandardMaterial({
    color: light ? 0xc5a875 : 0x77869a,
    metalness: 0.62, roughness: 0.28
  });
  const dark = new THREE.MeshStandardMaterial({ color: light ? 0xd8c9ae : 0x111820, roughness: 0.48 });
  const add = (geometry, material, y, x = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  };
  const cylinder = (rt, rb, h, y, material = mat, radial = 32) => add(new THREE.CylinderGeometry(rt, rb, h, radial), material, y);
  const sphere = (radius, y, x = 0, z = 0, material = mat) => add(new THREE.SphereGeometry(radius, 24, 16), material, y, x, z);
  cylinder(0.29, 0.34, 0.12, 0.08, trim);
  cylinder(0.24, 0.29, 0.12, 0.19);
  cylinder(0.20, 0.23, 0.12, 0.31, trim);
  if (type === 'p') {
    cylinder(0.105, 0.17, 0.27, 0.49);
    sphere(0.16, 0.72);
  } else if (type === 'r') {
    cylinder(0.19, 0.23, 0.30, 0.52);
    cylinder(0.24, 0.24, 0.11, 0.73, trim);
    const top = add(new THREE.BoxGeometry(0.48, 0.13, 0.48), mat, 0.84);
    for (const [x,z] of [[-.16,-.16],[.16,-.16],[-.16,.16],[.16,.16]]) add(new THREE.BoxGeometry(.13,.16,.13), trim, .97, x,z);
  } else if (type === 'n') {
    cylinder(0.15, 0.22, 0.34, 0.51);
    const neck = add(new THREE.CapsuleGeometry(0.14, 0.35, 5, 12), mat, 0.79, 0, -0.015);
    neck.rotation.z = -0.34;
    const head = add(new THREE.ConeGeometry(0.19, 0.43, 4), mat, 1.02, 0.04, -0.04);
    head.rotation.z = -0.58; head.rotation.x = -0.22;
    sphere(0.035, 1.12, 0.10, -0.15, trim);
  } else if (type === 'b') {
    cylinder(0.15, 0.22, 0.28, 0.51);
    add(new THREE.ConeGeometry(0.20, 0.52, 32), mat, 0.89);
    sphere(0.075, 1.17, 0, 0, trim);
    const slit = add(new THREE.BoxGeometry(0.035, 0.30, 0.025), dark, 0.91, 0, 0.17);
    slit.rotation.z = -0.3;
  } else if (type === 'q') {
    cylinder(0.17, 0.22, 0.28, 0.51);
    add(new THREE.ConeGeometry(0.21, 0.40, 32), mat, 0.83);
    cylinder(0.22, 0.15, 0.08, 1.06, trim);
    sphere(0.13, 1.20, 0, 0, trim);
    for (let i=0;i<8;i++) {
      const a = i*Math.PI/4;
      sphere(0.055, 1.13, Math.cos(a)*0.19, Math.sin(a)*0.19, trim);
    }
  } else if (type === 'k') {
    cylinder(0.18, 0.23, 0.31, 0.52);
    add(new THREE.ConeGeometry(0.21, 0.38, 32), mat, 0.86);
    cylinder(0.24, 0.24, 0.08, 1.08, trim);
    add(new THREE.BoxGeometry(0.09, 0.40, 0.09), trim, 1.34);
    add(new THREE.BoxGeometry(0.28, 0.09, 0.09), trim, 1.39);
  }
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

function ChessScene({ fen, selected, legalTargets, lastMove, onSquare, flipped }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const latest = useRef({ onSquare, selected, legalTargets, flipped });
  latest.current = { onSquare, selected, legalTargets, flipped };

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#151b23');
    scene.fog = new THREE.Fog('#151b23', 17, 32);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(4.3, 10.5, 12.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe5efff, 0x4a3527, 2.0));
    const key = new THREE.DirectionalLight(0xffe2b6, 3.2);
    key.position.set(-4, 10, 6); key.castShadow = true;
    key.shadow.mapSize.set(2048,2048); key.shadow.camera.left=-8; key.shadow.camera.right=8; key.shadow.camera.top=8; key.shadow.camera.bottom=-8;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8ab7ff, 1.1); fill.position.set(7,6,-5); scene.add(fill);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:'#10151c',roughness:0.9}));
    floor.rotation.x=-Math.PI/2; floor.position.y=-0.35; floor.receiveShadow=true; scene.add(floor);
    const boardBase = new THREE.Mesh(new THREE.BoxGeometry(8.35,0.34,8.35), new THREE.MeshStandardMaterial({color:'#30251e',roughness:.38,metalness:.15}));
    boardBase.position.set(3.5,-0.12,3.5); boardBase.castShadow=true; boardBase.receiveShadow=true; scene.add(boardBase);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.5,.10,8.5), new THREE.MeshStandardMaterial({color:'#b18a55',metalness:.55,roughness:.3}));
    frame.position.set(3.5,-.29,3.5); scene.add(frame);
    const squares = new THREE.Group(); scene.add(squares);
    const pieces = new THREE.Group(); scene.add(pieces);
    const marks = new THREE.Group(); scene.add(marks);
    const squareMeshes = [];
    for (let r=0;r<8;r++) for(let f=0;f<8;f++) {
      const sq = new THREE.Mesh(new THREE.BoxGeometry(.995,.035,.995), new THREE.MeshStandardMaterial({color:(r+f)%2===0?'#e7d4b6':'#76533b',roughness:.48}));
      sq.position.set(f,.07,r); sq.receiveShadow=true; sq.userData.square=FILES[f]+(8-r); squares.add(sq); squareMeshes.push(sq);
    }
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(3.5,0,3.5); controls.enableDamping=true; controls.dampingFactor=.07;
    controls.minDistance=8; controls.maxDistance=19; controls.maxPolarAngle=Math.PI/2.05;
    controls.enablePan=false;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointer = e => {
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
      pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects(squareMeshes,false)[0];
      if(hit?.object?.userData?.square) latest.current.onSquare(hit.object.userData.square);
    };
    renderer.domElement.addEventListener('pointerup',onPointer);
    const resize=()=>{const w=host.clientWidth,h=host.clientHeight; if(!w||!h)return; camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    let frameId;
    const animate=()=>{frameId=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};
    animate();
    apiRef.current={scene,pieces,marks,renderer,camera,controls};
    return ()=>{cancelAnimationFrame(frameId);observer.disconnect();renderer.domElement.removeEventListener('pointerup',onPointer);controls.dispose();renderer.dispose();host.removeChild(renderer.domElement);};
  }, []);

  useEffect(() => {
    const api=apiRef.current; if(!api)return;
    const {pieces,marks}=api;
    while(pieces.children.length){const obj=pieces.children[0];pieces.remove(obj);obj.traverse(n=>{if(n.geometry)n.geometry.dispose();});}
    while(marks.children.length){const obj=marks.children[0];marks.remove(obj);if(obj.geometry)obj.geometry.dispose();}
    const game=new Chess(fen);
    const board=game.board();
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      const p=board[r][f];if(!p)continue;
      const group=makePiece(p.type,p.color);
      const file=flipped?7-f:f, rank=flipped?7-r:r;
      group.position.set(file,.10,rank);
      pieces.add(group);
    }
    const addMark=(square,color,opacity,ring=false)=>{
      const f=FILES.indexOf(square[0]),r=8-Number(square[1]);
      const x=flipped?7-f:f,z=flipped?7-r:r;
      const mesh=new THREE.Mesh(ring?new THREE.RingGeometry(.22,.29,40):new THREE.PlaneGeometry(.96,.96),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));
      mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.105,z);marks.add(mesh);
    };
    if(lastMove){addMark(lastMove.from,'#e8bd54',.22);addMark(lastMove.to,'#e8bd54',.30);}
    if(selected)addMark(selected,'#f4d35e',.45);
    for(const target of legalTargets)addMark(target,'#5fd39a',.9,true);
  }, [fen,selected,legalTargets,lastMove,flipped]);

  return <div className="scene-wrap" ref={mountRef}><div className="scene-hint"><span className="hint-dot"></span> Drag to rotate · Scroll to zoom</div></div>;
}

function App() {
  const [game,setGame]=useState(()=>new Chess());
  const [mode,setMode]=useState('computer');
  const [humanColor,setHumanColor]=useState('w');
  const [selected,setSelected]=useState(null);
  const [history,setHistory]=useState([]);
  const [thinking,setThinking]=useState(false);
  const [flipped,setFlipped]=useState(false);
  const [promotion,setPromotion]=useState(null);
  const [sound,setSound]=useState(true);
  const [notice,setNotice]=useState('');
  const gameRef=useRef(game);
  gameRef.current=game;
  const moves=game.history({verbose:true});
  const legalTargets=useMemo(()=>selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[],[game,selected]);
  const lastMove=moves[moves.length-1]||null;
  const isComputerTurn=mode==='computer'&&game.turn()!==humanColor&&!game.isGameOver();

  const status=game.isCheckmate()?'Checkmate':game.isDraw()?(game.isStalemate()?'Stalemate':'Draw'):game.isCheck()?'Check':(game.turn()==='w'?'White':'Black')+' to move';
  const detail=game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins':game.isStalemate()?'No legal moves remain':game.isDraw()?'The game is drawn':game.isCheck()?'The king is under attack':mode==='computer'&&isComputerTurn?'Computer is thinking…':mode==='computer'?'You are '+(humanColor==='w'?'White':'Black'):'Local two-player game';

  const playMove=useCallback((from,to,promo='q')=>{
    const g=gameRef.current;
    try {
      const move=g.move({from,to,promotion:promo});
      if(!move)return;
      const snapshot=g.fen();
      setGame(new Chess(snapshot));
      setHistory(h=>[...h,{fen:snapshot,san:move.san,from,to,color:move.color}]);
      setSelected(null);setPromotion(null);setNotice('');
      if(sound){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=move.captured?240:420;gain.gain.setValueAtTime(.055,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);osc.start();osc.stop(ctx.currentTime+.09);osc.onended=()=>ctx.close();}catch{}}
    } catch { setNotice('That move is not legal.'); }
  },[sound]);

  const handleSquare=useCallback(square=>{
    if(thinking||promotion||gameRef.current.isGameOver())return;
    if(mode==='computer'&&gameRef.current.turn()!==humanColor)return;
    const g=gameRef.current, piece=g.get(square);
    if(selected){
      const candidate=g.moves({square:selected,verbose:true}).find(m=>m.to===square);
      if(candidate){
        if(candidate.flags.includes('p'))setPromotion({from:selected,to:square,color:candidate.color});
        else playMove(selected,square);
        return;
      }
    }
    if(piece&&piece.color===g.turn()){setSelected(square);setNotice('');}
    else setSelected(null);
  },[selected,thinking,promotion,mode,humanColor,playMove]);

  useEffect(()=>{
    if(!isComputerTurn)return;
    setThinking(true);
    const timer=setTimeout(()=>{
      const g=new Chess(gameRef.current.fen());
      const move=chooseComputerMove(g,2);
      if(move)playMove(move.from,move.to,move.promotion||'q');
      setThinking(false);
    },450);
    return()=>clearTimeout(timer);
  },[isComputerTurn,game,playMove]);

  const newGame=(nextMode=mode,nextColor=humanColor)=>{
    setMode(nextMode);setHumanColor(nextColor);setGame(new Chess());setHistory([]);setSelected(null);setPromotion(null);setThinking(false);setNotice('New game started');
    setFlipped(nextMode==='computer'&&nextColor==='b');
  };
  const undo=()=>{
    if(!history.length)return;
    const g=new Chess(gameRef.current.fen());
    g.undo();
    if(mode==='computer'&&g.turn()!==humanColor&&g.history().length)g.undo();
    setGame(new Chess(g.fen()));
    setHistory(h=>h.slice(0,mode==='computer'&&g.history().length<h.length-1? -2:-1));
    setSelected(null);setPromotion(null);setNotice('Last move undone');
  };
  const jumpToMove=index=>{
    const g=new Chess();for(let i=0;i<=index;i++)g.move(history[i].san);
    setGame(new Chess(g.fen()));setHistory(h=>h.slice(0,index+1));setSelected(null);
  };

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">♞</span><span>CHESS<span className="brand-light">/3D</span></span></a>
      <div className="top-actions"><span className="live-pill"><i></i> READY TO PLAY</span><button className="icon-button" onClick={()=>setSound(s=>!s)} title="Toggle sound">{sound?'♫':'♪'}</button></div>
    </header>
    <section className="hero">
      <div><p className="eyebrow">THE CLASSIC, REIMAGINED</p><h1>Make your <em>move.</em></h1><p className="subhead">A new perspective on the timeless game.</p></div>
      <div className="mode-switch"><button className={mode==='computer'?'active':''} onClick={()=>newGame('computer',humanColor)}>VS COMPUTER</button><button className={mode==='local'?'active':''} onClick={()=>newGame('local',humanColor)}>2 PLAYERS</button></div>
    </section>
    <section className="game-layout">
      <div className="board-column">
        <div className="player-strip">
          <div className="avatar dark-avatar">♚</div><div className="player-meta"><strong>{mode==='computer'?(humanColor==='w'?'Computer':'You'):'Black'}</strong><span>{mode==='computer'?(humanColor==='w'?'BLACK PIECES':'BLACK PIECES'):'PLAYER 2'}</span></div><span className={'turn-indicator '+(game.turn()==='b'?'turn-on':'')}></span>
          <button className="flip-button" onClick={()=>setFlipped(v=>!v)} title="Rotate board">↻</button>
        </div>
        <ChessScene fen={game.fen()} selected={selected} legalTargets={legalTargets} lastMove={lastMove} onSquare={handleSquare} flipped={flipped}/>
        <div className="player-strip bottom-player">
          <div className="avatar light-avatar">♔</div><div className="player-meta"><strong>{mode==='computer'?(humanColor==='w'?'You':'Computer'):'White'}</strong><span>{mode==='computer'?(humanColor==='w'?'WHITE PIECES':'WHITE PIECES'):'PLAYER 1'}</span></div><span className={'turn-indicator '+(game.turn()==='w'?'turn-on':'')}></span>
          <button className="flip-button" onClick={()=>setFlipped(v=>!v)} title="Rotate board">↻</button>
        </div>
      </div>
      <aside className="side-panel">
        <div className="panel-card game-status">
          <div className="panel-heading"><span>GAME STATUS</span><span className="status-dot"></span></div>
          <div className="status-title">{status}</div><p className="status-detail">{detail}</p>
          {game.isGameOver()&&<button className="primary-button full" onClick={()=>newGame()}>PLAY AGAIN <span>↗</span></button>}
          {notice&&!game.isGameOver()&&<p className="notice">{notice}</p>}
        </div>
        <div className="panel-card">
          <div className="panel-heading"><span>GAME SETTINGS</span></div>
          <label className="field-label">PLAY AS</label>
          <div className="color-choice"><button className={humanColor==='w'?'chosen':''} onClick={()=>newGame('computer','w')}><span>♔</span> WHITE</button><button className={humanColor==='b'?'chosen':''} onClick={()=>newGame('computer','b')}><span>♚</span> BLACK</button></div>
          <div className="button-row"><button className="secondary-button" onClick={undo} disabled={!history.length}>↶ UNDO</button><button className="secondary-button" onClick={()=>newGame()}>＋ NEW GAME</button></div>
        </div>
        <div className="panel-card move-card">
          <div className="panel-heading"><span>MOVE HISTORY</span><span className="move-count">{moves.length} MOVES</span></div>
          <div className="move-list">
            {!history.length?<div className="empty-moves"><span>♟</span><p>Your game will appear here.</p><small>Make the first move to begin.</small></div>:history.map((m,i)=><button className={'move-entry '+(i===history.length-1?'latest':'')} key={i} onClick={()=>jumpToMove(i)}><span>{Math.floor(i/2)+1}{i%2?'...':'.'}</span><strong>{m.san}</strong></button>)}
          </div>
        </div>
        <div className="panel-foot"><span>♙</span> GOOD LUCK. THINK AHEAD.</div>
      </aside>
    </section>
    <footer><span>CHESS/3D</span><span>BUILT FOR THE LOVE OF THE GAME</span><span>v1.0.0</span></footer>
    {promotion&&<div className="modal-backdrop"><div className="promotion-modal"><p>PAWN PROMOTION</p><h2>Choose your piece</h2><div>{['q','r','b','n'].map(t=><button key={t} onClick={()=>playMove(promotion.from,promotion.to,t)}>{({q:'♛',r:'♜',b:'♝',n:'♞'})[t]}</button>)}</div><button className="cancel-promo" onClick={()=>setPromotion(null)}>CANCEL</button></div></div>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
