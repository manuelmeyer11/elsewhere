import React, { useState, useEffect, useRef } from 'react'
import { SceneViewer } from './SceneViewer'

// --- KONFIGURATION ---
const SCENES = [
  { 
    id: 'scene-london', name: 'London', fileUrl: '/scene.splat',
    previewImg: '/london-preview.png', 
    audioUrl: '/london.mp3',
    description: 'A spatial memory from London.',
    splatPosition: [0, 0, 0], camPosition: [0, 1.7, 5],
    texts: [
      { title: "An impression from a bus ride.", body: "The moment has been frozen but still remains in a state of movement. Buildings blur while walking by, a visual noise is all around." },
      { title: "Guess where we were heading at?", body: "You can look close by but also into the streets far away." }
    ]
  },
  { 
    id: 'scene-forest', name: 'Forest', fileUrl: '/forest.splat', 
    previewImg: '/forest-preview.png', 
    audioUrl: '/forest.mp3',
    description: 'Hiking in Tyrol.',
    splatPosition: [0, 0, 0], camPosition: [0, 1.6, 2],
    texts: [
      { title: "A lot of white and green.", body: "There is not much diversity and color to look at. But have a look around the corner. Organic structures and airy depth can be all it needs." },
      { title: "My feet still hurt when thinking of that day.", body: "Lucky you, we're not at this point of technology, which makes you feel wet and cold feet." }
    ]
  },
  { 
    id: 'scene-munich', name: 'Munich', fileUrl: '/munich.splat', 
    previewImg: '/munich-preview.png', 
    audioUrl: '/munich.mp3',
    description: 'My room in Munich.',
    splatPosition: [0, -4.0, 0], camPosition: [0, 1.5, 3], splatScale: [5, 5, 5],
    texts: [
      { title: "Chaos.", body: "I still don't have a lot of personal stuff over here, but nonetheless, it is filled by some good and some weird books. Colors and textures I don't like. But the light is great." },
      { title: "Door to the hallway.", body: "Take a look through the door into the hallway and tell me what you've found." }
    ]
  }
]

// --- STICKER DATEN (SVGs) ---
const INITIAL_STICKERS = [
  { id: 'react', src: '/react.svg', x: window.innerWidth - 160, y: 320, rotate: -8 },
  { id: 'vscode', src: '/vscode.svg', x: window.innerWidth - 190, y: 480, rotate: 12 },
  { id: 'gemini', src: '/gemini.svg', x: window.innerWidth - 180, y: 150, rotate: 5 },
]

// --- CSS STYLES ---
const STYLES = `
  * { box-sizing: border-box; }
  
  body, html { 
    margin: 0; padding: 0; 
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #e0e0e0; 
    overflow: hidden; 
    width: 100%; height: 100%;
    cursor: none; 
  }
  
  /* --- CUSTOM CURSOR --- */
  .custom-cursor {
    position: fixed; top: 0; left: 0;
    width: 20px; height: 20px;
    border: 1.5px solid rgba(0,0,0,0.8);
    border-radius: 50%;
    pointer-events: none; z-index: 9999;
    transform: translate3d(-50%, -50%, 0);
    transition: width 0.3s cubic-bezier(0.19, 1, 0.22, 1), 
                height 0.3s cubic-bezier(0.19, 1, 0.22, 1), 
                background-color 0.3s, border-color 0.3s;
    mix-blend-mode: difference;
  }
  .custom-cursor.hover {
    width: 60px; height: 60px;
    background-color: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(2px);
    mix-blend-mode: normal;
  }
  
  .custom-cursor.grab {
    width: 40px; height: 40px;
    border-color: #000;
    background-color: rgba(0,0,0,0.1);
    mix-blend-mode: normal;
  }

  /* --- TOAST --- */
  .toast-container {
    position: absolute; top: 30px; right: 30px; z-index: 10000;
    width: 300px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(20px) saturate(120%);
    -webkit-backdrop-filter: blur(20px) saturate(120%);
    border: 1px solid rgba(255,255,255,0.4);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    border-radius: 16px; padding: 16px 20px;
    opacity: 0; transform: translateY(-20px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none; overflow: hidden; 
  }
  .toast-visible { opacity: 1; transform: translateY(0); }
  .toast-text { font-size: 13px; font-weight: 500; color: #111; letter-spacing: 0.02em; }
  .toast-progress { position: absolute; bottom: 0; left: 0; height: 3px; background: #000; width: 100%; transform-origin: left; }

  /* --- MENU & VIEWER --- */
  .menu-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transition: transform 1.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.8s ease; z-index: 20; background-color: #e0e0e0; }
  .menu-container.exit { transform: scale(1.5); opacity: 0; pointer-events: none; }
  .viewer-wrapper { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; opacity: 0; transition: opacity 1.5s ease-in-out; pointer-events: none; }
  .viewer-wrapper.visible { opacity: 1; pointer-events: auto; }

  /* --- ABOUT BUTTON --- */
  .about-btn-text { position: absolute; top: 40px; right: 40px; z-index: 30; cursor: pointer; font-size: 12px; color: #000; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0; transform: translateY(-20px); transition: opacity 1.2s ease, transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), color 0.3s; }
  .about-btn-text.visible { opacity: 1; transform: translateY(0); }
  .about-btn-text:hover { transform: translateY(0) scale(1.1); color: #333; }

  /* --- ABOUT PAGE --- */
  .about-page { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(224, 224, 224, 0.95); z-index: 40; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; clip-path: circle(0% at 95% 5%); backdrop-filter: blur(0px); transition: clip-path 0.8s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.8s ease; }
  .about-page.visible { pointer-events: auto; clip-path: circle(150% at 95% 5%); backdrop-filter: blur(20px); }
  .about-content { text-align: left; max-width: 800px; color: #111; padding: 40px; opacity: 0; transform: translateY(20px); transition: opacity 0.4s ease, transform 0.4s ease; transition-delay: 0.1s; }
  .about-page.visible .about-content { opacity: 1; transform: translateY(0); transition-delay: 0.3s; }
  .char-span { display: inline-block; transition: font-weight 0.2s ease-out, transform 0.2s ease-out; will-change: font-weight, transform; }

  /* --- REALISTIC PEELING STICKER EFFECT --- */
  .sticker-container {
    position: absolute;
    cursor: grab;
    user-select: none;
    touch-action: none;
    perspective: 800px; z-index: 50;
  }
  .sticker-container:active { cursor: grabbing; z-index: 100; }
  
  .sticker-content {
    position: relative;
    width: 110px; height: auto;
    background: white; padding: 12px; border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.08);
    transform-style: preserve-3d;
    transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1), box-shadow 0.2s ease; will-change: transform;
  }
  .sticker-img { width: 100%; height: auto; display: block; pointer-events: none; }
  
  /* Glanz/Knick */
  .sticker-content::after {
    content: ''; position: absolute; inset: 0; border-radius: 12px;
    background: linear-gradient(125deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 60%);
    background-size: 200% 200%; opacity: 0; transition: opacity 0.2s; pointer-events: none; mix-blend-mode: soft-light;
  }
  
  .sticker-container:active .sticker-content { transform: scale(1.15) translateZ(20px); box-shadow: 0 20px 40px rgba(0,0,0,0.2), 0 10px 15px rgba(0,0,0,0.1); }
  .sticker-container:active .sticker-content::after { opacity: 1; }

  /* CLOSE BUTTON */
  .close-about { position: absolute; top: 50px; right: 50px; width: 60px; height: 60px; display: flex; justify-content: center; align-items: center; background: transparent; border: none; cursor: pointer; transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); opacity: 0.6; }
  .close-about:hover { opacity: 1; transform: scale(1.2) rotate(90deg); }
  .close-icon { font-size: 30px; font-weight: 300; color: #000; line-height: 1; }
  
  /* EXIT, LOGO, FOOTER, CARDS */
  .exit-btn { position: absolute; top: 30px; left: 30px; z-index: 10000; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(10px); color: black; border: 1px solid rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 30px; cursor: pointer; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); opacity: 0; transform: translateY(-20px); }
  .exit-btn.visible { opacity: 1; transform: translateY(0); }
  .exit-btn:hover { background: white; transform: translateY(0) scale(1.15); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
  .logo-wrapper { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1); width: 60vw; max-width: 600px; z-index: 1; opacity: 0; pointer-events: none; transition: opacity 1.5s ease-in-out, transform 1.0s cubic-bezier(0.4, 0, 0.2, 1); }
  .logo-img { width: 100%; height: auto; display: block; mix-blend-mode: multiply; }
  .logo-fade-in { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  .logo-scaled { opacity: 1; transform: translate(-50%, -50%) scale(0.75); }
  .footer-text { position: absolute; bottom: 40px; font-size: 12px; color: #000; font-weight: 500; letter-spacing: 0.05em; opacity: 0; transition: opacity 1.5s ease; pointer-events: none; line-height: 1.6; }
  .footer-left { left: 40px; text-align: left; }
  .footer-right { right: 40px; text-align: right; }
  .footer-visible { opacity: 1; }
  .cards-container { position: relative; z-index: 10; display: flex; gap: 40px; justify-content: center; align-items: center; height: 100%; width: 100%; perspective: 1500px; }
  .cards-container.locked { pointer-events: none; }
  .card-wrapper { position: relative; width: 280px; height: 380px; opacity: 0; transform: translateY(80px) scale(0.95); transition: opacity 0.8s ease-out, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); will-change: transform, opacity; }
  .card-wrapper.visible { opacity: 1; transform: translateY(0) scale(1); }
  .glass-card { width: 100%; height: 100%; border-radius: 24px; padding: 30px; cursor: pointer; overflow: hidden; position: relative; background-color: rgba(240, 240, 240, 0.1); border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255,255,255,0.2); transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.3s, box-shadow 0.3s; --x: 0px; --y: 0px; --rX: 0deg; --rY: 0deg; transform: translate3d(var(--x), var(--y), 0) rotateX(var(--rX)) rotateY(var(--rY)); }
  .portal-image { position: absolute; top: -15%; left: -15%; width: 130%; height: 130%; object-fit: cover; z-index: -1; opacity: 0.6; filter: grayscale(80%) blur(2px); transform: translate3d(0, 0, 0) scale(1); transition: transform 0.1s linear, opacity 0.5s ease, filter 0.5s ease; will-change: transform; }
  .card-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.8) 100%); opacity: 0.9; z-index: 0; transition: opacity 0.5s ease; }
  .cards-container:hover .card-wrapper { opacity: 0.5; filter: blur(2px) grayscale(0.2); transform: scale(0.95); transition: opacity 0.4s, filter 0.4s, transform 0.4s; }
  .cards-container .card-wrapper:hover { opacity: 1 !important; filter: blur(0px) !important; z-index: 50; transform: scale(1.05) !important; }
  .cards-container .card-wrapper:hover .glass-card { border-color: rgba(255, 255, 255, 0.9); box-shadow: 0 20px 40px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.5); transition: transform 0.08s linear; }
  .cards-container .card-wrapper:hover .portal-image { opacity: 1; filter: grayscale(0%) blur(0px); transform: scale(1.15) translate3d(calc(var(--x) * -1.8), calc(var(--y) * -1.8), 0); }
  .cards-container .card-wrapper:hover .card-overlay { opacity: 0.1; }
  .cards-container .card-wrapper:hover .title-text { color: white !important; text-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: color 0.3s; }
  .cards-container .card-wrapper:hover .desc-text { color: rgba(255,255,255,0.9) !important; text-shadow: 0 1px 5px rgba(0,0,0,0.3); transition: color 0.3s; }
  .title-text { position: relative; z-index: 2; font-size: 1.6rem; font-weight: 600; margin-bottom: 12px; color: #111; letter-spacing: -0.02em; pointer-events: none; transition: color 0.5s; }
  .desc-text { position: relative; z-index: 2; font-size: 1.1rem; color: #333; line-height: 1.4; font-weight: 500; pointer-events: none; transition: color 0.5s; }
  .noise-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.04; pointer-events: none; z-index: 5; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
`

// --- SCRAMBLE TEXT (DECODER EFFECT) ---
const ScrambleText = ({ text }) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef(null);

  const onMouseEnter = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplay(prev => text.split("").map((letter, index) => {
          if(index < iteration) return text[index];
          return letters[Math.floor(Math.random() * 26)];
        }).join("")
      );
      if(iteration >= text.length) clearInterval(intervalRef.current);
      iteration += 1 / 3;
    }, 30);
  };

  return (
    <span onMouseEnter={onMouseEnter} style={{cursor: 'default', display: 'inline-block', fontWeight: 500, color: '#000'}}>
      {display}
    </span>
  );
};

// --- STICKER COMPONENT (Peel Effect) ---
const Sticker = ({ id, src, x, y, rotate, onUpdatePos }) => {
  const ref = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const offset = useRef({ x: 0, y: 0 })

  const handleDown = (e) => {
    setIsDragging(true)
    const rect = ref.current.getBoundingClientRect()
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return
      onUpdatePos(id, e.clientX - offset.current.x, e.clientY - offset.current.y)
    }
    const handleUp = () => setIsDragging(false)
    if(isDragging) {
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, id, onUpdatePos])

  return (
    <div 
      ref={ref}
      className="sticker-container"
      style={{ left: x, top: y }}
      onMouseDown={handleDown}
    >
      <div className="sticker-content" style={{ transform: `rotate(${rotate}deg) ${isDragging ? 'scale(1.15) rotateX(15deg) rotateY(-15deg)' : 'scale(1) rotateX(0) rotateY(0)'}` }}>
         <img src={src} alt="Sticker" className="sticker-img" draggable="false" />
      </div>
    </div>
  )
}

const CustomCursor = () => {
  const cursorRef = useRef(null)
  const [isHovering, setIsHovering] = useState(false)
  useEffect(() => {
    const cursor = cursorRef.current
    const moveCursor = (e) => { if(cursor) cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)` }
    const handleMouseOver = (e) => setIsHovering(!!(e.target.closest('.glass-card') || e.target.closest('button') || e.target.closest('.about-btn-text') || e.target.closest('.close-about') || e.target.closest('.sticker-container')))
    window.addEventListener('mousemove', moveCursor); window.addEventListener('mouseover', handleMouseOver)
    return () => { window.removeEventListener('mousemove', moveCursor); window.removeEventListener('mouseover', handleMouseOver) }
  }, [])
  return <div ref={cursorRef} className={`custom-cursor ${isHovering ? 'hover' : ''} ${isHovering && document.querySelector('.sticker-container:active') ? 'grab' : ''}`} />
}

const Toast = ({ message, duration = 5000, onClose, visible }) => {
  useEffect(() => { if (!visible) return; const timer = setTimeout(onClose, duration); return () => clearTimeout(timer) }, [visible, duration, onClose])
  return (
    <div className={`toast-container ${visible ? 'toast-visible' : ''}`}>
      <div className="toast-text">{message}</div>
      {visible && <div className="toast-progress" style={{ animation: `progress ${duration}ms linear forwards` }} />}
      <style>{`@keyframes progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </div>
  )
}

const MagneticCard = ({ scene, index, onClick, isVisible }) => {
  const cardRef = useRef(null)
  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - (rect.left + rect.width / 2); const y = e.clientY - (rect.top + rect.height / 2)
    const innerCard = cardRef.current.querySelector('.glass-card')
    if (innerCard) { innerCard.style.setProperty('--x', `${x / 8}px`); innerCard.style.setProperty('--y', `${y / 8}px`); innerCard.style.setProperty('--rX', `${-y / 25}deg`); innerCard.style.setProperty('--rY', `${x / 25}deg`) }
  }
  const handleMouseLeave = () => {
    if (!cardRef.current) return
    const innerCard = cardRef.current.querySelector('.glass-card')
    if (innerCard) { innerCard.style.setProperty('--x', `0px`); innerCard.style.setProperty('--y', `0px`); innerCard.style.setProperty('--rX', `0deg`); innerCard.style.setProperty('--rY', `0deg`) }
  }
  return (
    <div ref={cardRef} className={`card-wrapper ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: `${index * 0.15}s` }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} onClick={() => onClick(scene)}>
      <div className="glass-card">
        {scene.previewImg && <img src={scene.previewImg} alt="" className="portal-image" />}
        <div className="card-overlay" />
        <div style={{ position: 'relative', height: '100%', zIndex: 2 }}>
          <div className="title-text">{scene.name}</div>
          <div className="desc-text">{scene.description}</div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [activeScene, setActiveScene] = useState(null)
  const [introPhase, setIntroPhase] = useState('init') 
  const [isMenuExiting, setIsMenuExiting] = useState(false)
  const [isViewerVisible, setIsViewerVisible] = useState(false)
  const [showToast, setShowToast] = useState(false) 
  const [showAbout, setShowAbout] = useState(false)
  const [stickers, setStickers] = useState(INITIAL_STICKERS)

  useEffect(() => {
    if (activeScene) return
    const t1 = setTimeout(() => setIntroPhase('fade-in'), 1000)
    const t2 = setTimeout(() => setIntroPhase('holding'), 2500)
    const t3 = setTimeout(() => setIntroPhase('scaling'), 3500)
    const t4 = setTimeout(() => { setIntroPhase('interactive'); setShowToast(true) }, 4500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); }
  }, [activeScene])

  const handleSceneSelect = (scene) => {
    setShowToast(false); setIsMenuExiting(true)
    setTimeout(() => { setActiveScene(scene); setTimeout(() => setIsViewerVisible(true), 100) }, 800)
  }
  const handleExitScene = () => {
    setIsViewerVisible(false)
    setTimeout(() => { setActiveScene(null); setIsMenuExiting(false); setIntroPhase('interactive') }, 1000)
  }

  const updateStickerPos = (id, x, y) => { setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s)) }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#e0e0e0', overflow: 'hidden' }}>
      <style>{STYLES}</style>
      <div className="noise-overlay" />
      <CustomCursor />

      {/* --- MENU LAYER --- */}
      {!activeScene && !showAbout && (
        <div className={`menu-container ${isMenuExiting ? 'exit' : ''}`}>
            <Toast message="Choose one of the memories to enter." visible={showToast} onClose={() => setShowToast(false)} />
            <div className={`logo-wrapper ${introPhase !== 'init' ? 'logo-fade-in' : ''} ${introPhase === 'scaling' || introPhase === 'interactive' ? 'logo-scaled' : ''}`}>
              <img src="/logo.svg" alt="Elsewhere" className="logo-img" /> 
            </div>
            <div className={`cards-container ${introPhase !== 'interactive' ? 'locked' : ''}`}>
              {SCENES.map((scene, index) => (
                <MagneticCard key={scene.id} scene={scene} index={index} onClick={handleSceneSelect} isVisible={introPhase === 'interactive'} />
              ))}
            </div>
            <div className={`about-btn-text ${introPhase === 'interactive' ? 'visible' : ''}`} onClick={() => setShowAbout(true)}>About</div>
            <div className={`footer-text footer-left ${introPhase === 'interactive' ? 'footer-visible' : ''}`}><div>Manuel Meyer</div><div>MP – AI Driven Design</div></div>
            <div className={`footer-text footer-right ${introPhase === 'interactive' ? 'footer-visible' : ''}`}><div>WiSe 2025/2026</div></div>
        </div>
      )}

      {/* --- ABOUT PAGE --- */}
      <div className={`about-page ${showAbout ? 'visible' : ''}`}>
         <button className="close-about" onClick={() => setShowAbout(false)}>
            <span className="close-icon">×</span>
         </button>
         
         <div className="about-content">
             <div style={{fontSize: '1.5rem', lineHeight: '1.6', color: '#222', fontWeight: '400', maxWidth: '600px'}}>
               <p style={{marginBottom: '2rem'}}>
                 <ScrambleText text="Thank you for visiting." /> <br/>
                 This project explores the intersection of spatial memories and digital reconstruction. 
                 Using <strong style={{fontWeight: 600}}>Gaussian Splatting</strong>, real-world moments are captured and rendered as interactive point clouds, which can be edited and interactively used for storytelling.
               </p>
               <p style={{opacity: 0.7, fontSize: '1rem'}}>
                 Tech Stack: React Three Fiber, Drei, Postprocessing & Spline.<br/>
                 Integrating confusing functions into my framework, ensuring that nothing explodes, and untangling any syntax errors that arise: Gemini*
               </p>
             </div>
         </div>
         
         {stickers.map(s => (<Sticker key={s.id} {...s} onUpdatePos={updateStickerPos} />))}
      </div>

      {activeScene && (
        <div className={`viewer-wrapper ${isViewerVisible ? 'visible' : ''}`}>
          <button className={`exit-btn ${isViewerVisible ? 'visible' : ''}`} onClick={handleExitScene}>← Exit Memory</button>
          <SceneViewer key={activeScene.id} id={activeScene.id} name={activeScene.name} texts={activeScene.texts} fileUrl={activeScene.fileUrl} audioUrl={activeScene.audioUrl} splatPosition={activeScene.splatPosition} camPosition={activeScene.camPosition} />
        </div>
      )}
    </div>
  )
}