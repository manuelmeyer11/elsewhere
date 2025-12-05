import React, { useState, useRef, useEffect, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { 
  Splat, 
  PointerLockControls, 
  KeyboardControls, 
  useKeyboardControls,
  Environment,
  PerspectiveCamera,
  Loader,
  Lightformer,
  ScrollControls,
  Scroll,
  useScroll,
  TransformControls,
  MeshTransmissionMaterial,
  PositionalAudio
} from '@react-three/drei'
import { EffectComposer, Noise, Vignette, ChromaticAberration, Bloom, BrightnessContrast, HueSaturation, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// ==========================================
// 1. STYLES & KONFIGURATION
// ==========================================

const UI_STYLES = `
  @font-face { font-family: 'SF Pro Display'; src: url('/font/SF-Pro-Display-Regular.otf'); font-weight: 400; }
  @font-face { font-family: 'SF Pro Text'; src: url('/font/SF-Pro-Text-Regular.otf'); font-weight: 400; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f0f0f0; overscroll-behavior: none; font-family: 'SF Pro Display', sans-serif; }
  
  .scroll-container { width: 100%; margin: 0; padding: 0; }
  .scroll-section { height: 50vh; width: 100%; position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; }
  .logo-container { height: 90vh; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
  
  .text-block { max-width: 650px; text-align: center; padding: 0 20px; display: flex; flex-direction: column; align-items: center; }
  .text-block h2 { font-family: 'SF Pro Display', sans-serif; font-size: 0.85em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3em; color: #888; margin-bottom: 20px; }
  .text-block p { font-family: 'SF Pro Display', sans-serif; font-size: 2.2em; font-weight: 500; line-height: 1.2em; color: #000; margin: 0; }
  
  .scroll-arrow { margin-top: 40px; width: 24px; height: 24px; opacity: 0.6; animation: bounce 2s infinite ease-in-out; }
  @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(10px); opacity: 1; } }
  
  /* CONTROLS POPUP */
  .controls-popup {
    position: absolute; bottom: 40px; right: 40px; z-index: 10000;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(20px) saturate(120%);
    border: 1px solid rgba(255,255,255,0.4);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    border-radius: 20px; padding: 20px 25px;
    display: flex; gap: 30px; align-items: center;
    opacity: 0; transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .controls-popup.visible { opacity: 1; transform: translateY(0); }
  .ctrl-group { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .wasd-grid { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .asd-row { display: flex; gap: 4px; }
  .k-btn { width: 32px; height: 32px; border: 1.5px solid #1a1a1a; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-family: 'SF Pro Display', sans-serif; font-weight: 600; font-size: 11px; color: #1a1a1a; background: rgba(255,255,255,0.4); }
  .key-esc { width: auto; padding: 0 10px; height: 24px; font-size: 10px; margin-bottom: 5px; }
  .mouse-icon { width: 32px; height: 50px; border: 1.5px solid #1a1a1a; border-radius: 16px; position: relative; background: rgba(255,255,255,0.4); }
  .mouse-icon::after { content: ''; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 2px; height: 6px; background: #1a1a1a; border-radius: 2px; }
  .ctrl-label { font-family: 'SF Pro Text', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #555; text-align: center; margin-top: 5px; }

  /* TIMED MESSAGE */
  .msg-container {
    position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%) translateY(20px);
    min-width: 300px; max-width: 80vw;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(20px) saturate(120%);
    -webkit-backdrop-filter: blur(20px) saturate(120%);
    border: 1px solid rgba(255,255,255,0.4);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    border-radius: 16px; padding: 20px 30px;
    opacity: 0; transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none; overflow: hidden; text-align: center;
  }
  .msg-visible { opacity: 1; transform: translateX(-50%) translateY(0); }
  .msg-text { font-size: 14px; font-weight: 500; color: #111; letter-spacing: 0.02em; position: relative; z-index: 2; }
  .msg-progress { position: absolute; bottom: 0; left: 0; height: 3px; background: #000; width: 100%; transform-origin: left; z-index: 1; }

  /* EDIT UI */
  .custom-slider { -webkit-appearance: none; width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; outline: none; transition: background 0.2s; }
  .custom-slider:hover { background: rgba(255,255,255,0.3); }
  .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
  .color-picker-row { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
  .color-swatch { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); transition: transform 0.1s; }
  .color-swatch:hover { transform: scale(1.1); border-color: white; }
  .color-swatch.active { border: 2px solid white; }
  .hotspot-list-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 5px; cursor: pointer; border: 1px solid transparent; }
  .hotspot-list-item:hover { background: rgba(255,255,255,0.1); }
  .hotspot-list-item.selected { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.1); }
  .control-btn { background: rgba(0,0,0,0.7); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; transition: all 0.2s; margin-left: 10px; }
  .control-btn:hover { background: white; color: black; }
  .control-btn.active { background: white; color: black; box-shadow: 0 0 10px rgba(255,255,255,0.5); }
`

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'run', keys: ['Shift'] },
  { name: 'place', keys: ['Space'] }, 
  { name: 'toggleFlashlight', keys: ['f', 'F'] }, 
]

const HOTSPOT_COLORS = ['#ffffff', '#ff0055', '#00ffaa', '#00aaff', '#ffaa00', '#aa00ff']
const ATMOSPHERE_COLORS = ['#000000', '#1a1a2e', '#2b2b2b', '#e0e0e0', '#5c4033']
const SPLAT_TINTS = ['#ffffff', '#ffaaaa', '#aaffaa', '#aaaaff', '#ffffaa']
const MESSAGE_DURATIONS = [2, 4, 6, 8, 10, 15] 
const SCENE_START_POS = [0, 1.7, 2]
const SCENE_SKY_POS = [0, 20, 25]
// WICHTIG: Hotspots auf 0.2
const HOTSPOT_HEIGHT = 0.2 
const FONT_FAMILY = '"SF Pro Display", "SF Pro", -apple-system, BlinkMacSystemFont, sans-serif'

// ==========================================
// 2. HELPER FUNKTIONEN
// ==========================================

const getClampedFloorPosition = (camera, floorPoint, maxDist = 5) => {
    const camPosFlat = new THREE.Vector3(camera.position.x, 0, camera.position.z)
    const hitPosFlat = new THREE.Vector3(floorPoint.x, 0, floorPoint.z)
    const distance = camPosFlat.distanceTo(hitPosFlat)
    let x, z
    if (distance <= maxDist) { x = floorPoint.x; z = floorPoint.z } 
    else { 
        const direction = new THREE.Vector3().subVectors(hitPosFlat, camPosFlat).normalize()
        const clampedPos = camPosFlat.add(direction.multiplyScalar(maxDist))
        x = clampedPos.x; z = clampedPos.z 
    }
    return [x, HOTSPOT_HEIGHT, z]
}

// ==========================================
// 3. UI KOMPONENTEN
// ==========================================

function LandingContent({ sceneName, texts }) { 
  const scroll = useScroll()
  const titleRef = useRef(); const sec1Ref = useRef(); const sec2Ref = useRef()
  
  const text1 = texts?.[0] || { title: "The Perception", body: "Fragments of time, suspended in light." }
  const text2 = texts?.[1] || { title: "The Atmosphere", body: "The air is thick with silence." }

  useFrame(() => {
    const rTitle = 1 - scroll.range(0, 0.15)
    if (titleRef.current) { titleRef.current.style.opacity = rTitle; titleRef.current.style.transform = `translateY(${scroll.offset * 50}px)`; titleRef.current.style.pointerEvents = rTitle > 0.1 ? 'auto' : 'none' }
    const animateSection = (ref, start, length) => {
        if (!ref.current) return
        const curve = scroll.curve(start, length)
        ref.current.style.opacity = curve
        const linearProgress = scroll.range(start, length)
        const yMove = (1 - linearProgress) * 40 - 20 
        ref.current.style.transform = `translateY(${yMove}px) scale(${0.95 + curve * 0.05})`
        ref.current.style.filter = `blur(${(1 - curve) * 8}px)`
    }
    animateSection(sec1Ref, 0.10, 0.20)
    animateSection(sec2Ref, 0.35, 0.20)
    // Controls Info entfernt
  })
  return (
    <div className="scroll-container">
      <div ref={titleRef} className="logo-container"> 
        <h1 style={{ margin: '0', fontSize: '14vw', fontWeight: '700', letterSpacing: '-0.05em', color: '#000', lineHeight: '0.9', textAlign: 'center' }}>{sceneName || 'Memory'}</h1>
        <div style={{ width: '1px', height: '40px', background: '#000', marginTop: '30px', opacity: 0.2 }}></div>
        <svg className="scroll-arrow" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
      </div>
      <div ref={sec1Ref} className="scroll-section"><div className="text-block"><h2>{text1.title}</h2><p>{text1.body}</p></div></div>
      <div ref={sec2Ref} className="scroll-section"><div className="text-block"><h2>{text2.title}</h2><p>{text2.body}</p></div></div>
      <div style={{ height: '50vh' }}></div>
    </div>
  )
}

function TimedMessage({ text, duration, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 50) 
    const t1 = setTimeout(() => { setVisible(false); setTimeout(onClose, 600) }, duration * 1000)
    return () => { clearTimeout(t0); clearTimeout(t1) }
  }, [duration, onClose])
  return (
    <div className={`msg-container ${visible ? 'msg-visible' : ''}`}>
      <div className="msg-text">{text}</div>
      <div className="msg-progress" style={{ animation: `progress ${duration}s linear forwards` }} />
      <style>{`@keyframes progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </div>
  )
}

function ControlsPopup({ visible }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (visible) {
      const t1 = setTimeout(() => setShow(true), 500)
      const t2 = setTimeout(() => setShow(false), 8500) 
      return () => { clearTimeout(t1); clearTimeout(t2) }
    } else { setShow(false) }
  }, [visible])
  return (
    <div className={`controls-popup ${show ? 'visible' : ''}`}>
        <div className="ctrl-group"><div className="wasd-grid"><div className="k-btn">W</div><div className="asd-row"><div className="k-btn">A</div><div className="k-btn">S</div><div className="k-btn">D</div></div></div><span className="ctrl-label">Move</span></div>
        <div className="ctrl-group"><div className="mouse-icon"></div><span className="ctrl-label">Look</span></div>
        <div className="ctrl-group"><div className="k-btn key-esc">ESC</div><span className="ctrl-label">Select / Edit</span></div>
    </div>
  )
}

function HotspotPanel({ selectedHotspot, updateHotspot, deleteHotspot, hotspots, onSelect }) {
  return (
    <div style={{ position: 'absolute', top: 80, right: 20, width: '280px', maxHeight: '80vh', overflowY: 'auto', background: 'rgba(20, 20, 20, 0.8)', color: 'white', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 1000, fontFamily: FONT_FAMILY, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
      <h3 style={{margin: '0 0 15px 0', fontSize:'14px', fontWeight:'600'}}>HOTSPOT EDIT</h3>
      <div style={{background:'rgba(255,255,255,0.1)', borderRadius:'6px', padding:'10px', marginBottom:'15px', fontSize:'11px', color:'#ccc'}}><strong>Tip:</strong> Click on floor to place (max 7m) or press <strong>SPACE</strong> to drop here.</div>
      <div style={{marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px'}}>
        <label style={{fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display:'block', marginBottom:'5px'}}>Existing Hotspots</label>
        {hotspots.map(h => (<div key={h.id} onClick={() => onSelect(h.id)} className={`hotspot-list-item ${selectedHotspot?.id === h.id ? 'selected' : ''}`}><span style={{fontSize:'12px', fontWeight:'500'}}>{h.label || 'Unnamed'}</span><span style={{fontSize:'10px', color:'#888'}}>ID: {h.id.toString().slice(-4)}</span></div>))}
      </div>
      {selectedHotspot ? (
        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><span style={{fontSize:'12px', fontWeight:'bold', color:'#fff'}}>Editing: {selectedHotspot.label}</span><button onClick={() => deleteHotspot(selectedHotspot.id)} style={{background:'transparent', border:'none', color:'#ff4040', cursor:'pointer', fontSize:'11px', textTransform:'uppercase'}}>Delete</button></div>
            <div style={{ display: 'flex', gap: '8px' }}>{HOTSPOT_COLORS.map(c => (<div key={c} onClick={() => updateHotspot(selectedHotspot.id, { color: c })} style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: selectedHotspot.color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)' }} />))}</div>
            <div><label style={{fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px'}}>Label</label><input style={{width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px', borderRadius:'4px', fontSize:'12px'}} value={selectedHotspot.label} onChange={(e) => updateHotspot(selectedHotspot.id, { label: e.target.value })} /></div>
            <div><label style={{fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px'}}>Message</label><textarea style={{width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '6px', borderRadius:'4px', fontSize:'12px', minHeight:'50px'}} value={selectedHotspot.message} onChange={(e) => updateHotspot(selectedHotspot.id, { message: e.target.value })} /></div>
            <div style={{display: 'flex', gap: '10px'}}><div style={{flex:1}}><label style={{fontSize: '10px', color: '#888'}}>Msg Time</label><select style={{width: '100%', background: 'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'white', padding:'6px'}} value={selectedHotspot.duration || 4} onChange={(e) => updateHotspot(selectedHotspot.id, { duration: parseInt(e.target.value) })}>{MESSAGE_DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}</select></div><div style={{flex:1}}><label style={{fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display:'block', marginBottom:'5px'}}>Audio Limit</label><input type="number" min="0" placeholder="0 = Loop" style={{width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius:'6px', fontSize:'13px', outline:'none'}} value={selectedHotspot.soundLimit || 0} onChange={(e) => updateHotspot(selectedHotspot.id, { soundLimit: parseFloat(e.target.value) })} /></div></div>
            <label style={{ display:'block', width: '100%', background: selectedHotspot.soundUrl ? 'rgba(0,255,100,0.1)' : 'rgba(255,255,255,0.05)', border: selectedHotspot.soundUrl ? '1px solid rgba(0,255,100,0.3)' : '1px solid rgba(255,255,255,0.1)', color: selectedHotspot.soundUrl ? '#00ffaa' : 'white', padding: '8px', borderRadius:'6px', fontSize:'12px', textAlign:'center', cursor:'pointer' }}>{selectedHotspot.soundUrl ? '✓ Audio' : 'Upload MP3'}<input type="file" accept="audio/mpeg, audio/mp3" style={{display:'none'}} onChange={(e) => { const file = e.target.files[0]; if(file) { const url = URL.createObjectURL(file); updateHotspot(selectedHotspot.id, { soundUrl: url }) } }} /></label>
        </div>
      ) : ( <div style={{color: '#666', fontSize:'12px', textAlign:'center', padding:'20px'}}>Select a hotspot to edit</div> )}
    </div>
  )
}

function AtmospherePanel({ settings, setSettings }) {
  const handleChange = (key, value) => { setSettings(prev => ({ ...prev, [key]: value })) }
  const Slider = ({ label, value, min, max, step, param }) => (<div style={{ marginBottom: '12px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><label style={{fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px'}}>{label}</label><span style={{fontSize: '10px', color: '#fff'}}>{Math.round(value*100)/100}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => handleChange(param, parseFloat(e.target.value))} className="custom-slider" /></div>)
  return (
    <div style={{ position: 'absolute', top: 80, right: 20, width: '280px', background: 'rgba(20, 20, 20, 0.9)', color: 'white', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(12px)', border: '1px solid rgba(100,100,255,0.3)', zIndex: 1000, fontFamily: FONT_FAMILY, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxHeight: '85vh', overflowY: 'auto' }}>
      <h3 style={{margin: '0 0 15px 0', fontSize:'14px', fontWeight:'600', color: '#aaaaff'}}>ATMOSPHERE</h3>
      <div style={{marginBottom:'15px'}}>
          <label style={{fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display:'block', marginBottom:'5px'}}>Background Color</label>
          <div className="color-picker-row">{ATMOSPHERE_COLORS.map(c => (<div key={c} onClick={() => handleChange('bgColor', c)} className={`color-swatch ${settings.bgColor === c ? 'active' : ''}`} style={{backgroundColor: c}} />))}</div>
      </div>
      <Slider label="Fog Density" value={settings.fogDensity} min={0} max={0.1} step={0.005} param="fogDensity" />
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />
      <h4 style={{margin: '0 0 10px 0', fontSize:'11px', color:'#aaaaff', textTransform:'uppercase', letterSpacing:'1px'}}>SPLAT PROPERTIES</h4>
      <div style={{marginBottom:'15px'}}>
          <label style={{fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display:'block', marginBottom:'5px'}}>Splat Tint Color</label>
          <div className="color-picker-row">{SPLAT_TINTS.map(c => (<div key={c} onClick={() => handleChange('splatTint', c)} className={`color-swatch ${settings.splatTint === c ? 'active' : ''}`} style={{backgroundColor: c}} />))}</div>
      </div>
      <Slider label="Density Threshold (AlphaTest)" value={settings.splatAlpha} min={0} max={0.95} step={0.05} param="splatAlpha" />
      <Slider label="Global Opacity" value={settings.splatOpacity} min={0} max={1} step={0.05} param="splatOpacity" />
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '15px 0' }} />
      <h4 style={{margin: '0 0 10px 0', fontSize:'11px', color:'#aaaaff', textTransform:'uppercase', letterSpacing:'1px'}}>POST PROCESSING</h4>
      <Slider label="Contrast" value={settings.contrast} min={-0.5} max={0.5} step={0.05} param="contrast" />
      <Slider label="Saturation" value={settings.saturation} min={-0.5} max={0.5} step={0.05} param="saturation" />
      <Slider label="Chromatic Abb." value={settings.chromatic} min={0} max={10} step={0.1} param="chromatic" />
      <Slider label="Vignette Blur" value={settings.vignetteBlur} min={0} max={1} step={0.05} param="vignetteBlur" />
      <Slider label="Bloom Strength" value={settings.halationIntensity} min={0} max={3} step={0.1} param="halationIntensity" />
       <Slider label="Film Grain" value={settings.grain} min={0} max={0.5} step={0.01} param="grain" />
    </div>
  )
}

// ==========================================
// 4. SCENE COMPONENTS
// ==========================================

function GameLogic({ setFlashlightOn, isEditorMode, isAtmosphereMode, setHotspots, setSelectedId }) {
    const { camera } = useThree()
    const [, getKeys] = useKeyboardControls()
    useFrame(() => {
        const { toggleFlashlight, place } = getKeys()
        
        // CHECK: Is user typing?
        const activeTag = document.activeElement.tagName
        const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA'

        if (toggleFlashlight && !isTyping) {
            if (!window.flashToggled) { setFlashlightOn(prev => !prev); window.flashToggled = true; setTimeout(() => window.flashToggled = false, 300) }
        }
        if (place && isEditorMode && !isAtmosphereMode && !isTyping) {
            if (!window.lastPlaced || Date.now() - window.lastPlaced > 500) {
                window.lastPlaced = Date.now()
                const direction = new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion)
                const pos = camera.position.clone().add(direction)
                const newHotspot = { id: Date.now(), position: [pos.x, HOTSPOT_HEIGHT, pos.z], label: "Drop Point", message: "Placed via Spacebar", soundUrl: "", color: "#00ffaa", duration: 4, soundLimit: 0 }
                setHotspots(current => [...current, newHotspot]); setSelectedId(newHotspot.id)
            }
        }
    })
    return null
}

function Autofocus() {
  const { camera, scene } = useThree()
  const dofRef = useRef()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const targetDistance = useRef(5)

  useFrame(() => {
    if (!dofRef.current) return
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    const intersects = raycaster.intersectObjects(scene.children, true)
    let hit = null
    if (intersects.length > 0) hit = intersects.find(i => i.distance > 0.5) 
    if (hit) targetDistance.current = THREE.MathUtils.lerp(targetDistance.current, hit.distance, 0.1)
    else targetDistance.current = THREE.MathUtils.lerp(targetDistance.current, 5.0, 0.05)
    dofRef.current.circleOfConfusionMaterial.uniforms.focusDistance.value = targetDistance.current
  })
  return <DepthOfField ref={dofRef} focusDistance={0} focalLength={0.02} bokehScale={4} height={480} />
}

function Flashlight({ active }) {
    const lightRef = useRef()
    const targetRef = useRef(new THREE.Object3D())
    const { camera, scene } = useThree()
    useEffect(() => { scene.add(targetRef.current); return () => scene.remove(targetRef.current) }, [scene])
    useFrame(() => {
        if (!lightRef.current || !active) return
        lightRef.current.position.copy(camera.position); lightRef.current.position.y -= 0.2; lightRef.current.position.x += 0.2
        const front = new THREE.Vector3(0, 0, -5).applyQuaternion(camera.quaternion).add(camera.position)
        targetRef.current.position.copy(front); lightRef.current.target = targetRef.current
    })
    if (!active) return null
    return <spotLight ref={lightRef} intensity={20} angle={0.5} penumbra={0.2} distance={15} decay={2} color="#fff" castShadow />
}

function StoryModeController({ active, hotspots, onStep }) {
    const { camera } = useThree()
    const state = useRef({ index: -1, phase: 'idle', startTime: 0, startPos: new THREE.Vector3(), startRot: new THREE.Quaternion() })
    const progress = useRef(0)

    useEffect(() => { if (active) state.current = { index: -1, phase: 'next', startTime: 0, startPos: camera.position.clone(), startRot: camera.quaternion.clone() } }, [active])

    useFrame((_, delta) => {
        if (!active || hotspots.length === 0) return
        const s = state.current
        if (s.phase === 'next') { s.index = (s.index + 1) % hotspots.length; s.phase = 'moving'; progress.current = 0; s.startPos.copy(camera.position); s.startRot.copy(camera.quaternion) }
        if (s.phase === 'moving') {
            const targetHotspot = hotspots[s.index]
            const targetPos = new THREE.Vector3(...targetHotspot.position)
            const dest = targetPos.clone().add(new THREE.Vector3(0, 0.7, 2.0))
            const lookTarget = targetPos.clone().add(new THREE.Vector3(0, 0.7, 0))
            progress.current += delta * 0.4
            const t = Math.min(progress.current, 1)
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
            camera.position.lerpVectors(s.startPos, dest, ease)
            const dummy = new THREE.Object3D(); dummy.position.copy(camera.position); dummy.lookAt(lookTarget); camera.quaternion.slerp(dummy.quaternion, 5 * delta)
            if (t >= 1 || camera.position.distanceTo(dest) < 0.1) { s.phase = 'waiting'; s.startTime = Date.now(); onStep(targetHotspot) }
        }
        if (s.phase === 'waiting') {
            camera.position.y += Math.sin(Date.now() * 0.001) * 0.0005 
            if (Date.now() - s.startTime > 8000) s.phase = 'next'
        }
    })
    return null
}

function FPSControls() {
  const { camera } = useThree()
  const [, get] = useKeyboardControls()
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  useFrame((state, delta) => {
    const { forward, backward, left, right, run } = get()
    const speed = run ? 10.0 : 4.0; const friction = 10.0 
    const direction = new THREE.Vector3()
    const frontVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); frontVector.y = 0; frontVector.normalize()
    const sideVector = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); sideVector.y = 0; sideVector.normalize()
    if (forward) direction.add(frontVector); if (backward) direction.sub(frontVector)
    if (right) direction.add(sideVector); if (left) direction.sub(sideVector)
    if (direction.lengthSq() > 0) direction.normalize()
    if (direction.lengthSq() > 0) { velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, direction.x * speed, 8 * delta); velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, direction.z * speed, 8 * delta) } 
    else { velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, 0, friction * delta); velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, 0, friction * delta) }
    camera.position.addScaledVector(velocity.current, delta)
    if (camera.position.y < 1.7) camera.position.y = 1.7
  })
  return <PointerLockControls makeDefault pointerSpeed={0.5} />
}

function ScrollCameraRig({ onFinish, startPos }) { 
  const scroll = useScroll(); const { camera, scene } = useThree(); const isLockingIn = useRef(false); const hasFinished = useRef(false)
  const start = useMemo(() => new THREE.Vector3(...SCENE_SKY_POS), []); const end = useMemo(() => new THREE.Vector3(...(startPos || SCENE_START_POS)), [startPos]); const endLookAt = useMemo(() => new THREE.Vector3(0, 1.7, 0), []) 
  useFrame((state, delta) => {
    if (hasFinished.current) return
    const r = scroll.offset; if (r > 0.98) isLockingIn.current = true 
    if (!isLockingIn.current) { camera.position.lerpVectors(start, end, r); const lookAtY = THREE.MathUtils.lerp(80, 1.7, r); camera.lookAt(0, lookAtY, 0); camera.fov = THREE.MathUtils.lerp(15, 60, r) } 
    else { camera.position.lerp(end, 5 * delta); const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, endLookAt, camera.up)); camera.quaternion.slerp(targetQuaternion, 5 * delta); camera.fov = THREE.MathUtils.lerp(camera.fov, 60, 5 * delta) }
    camera.updateProjectionMatrix()
    if (isLockingIn.current && camera.position.distanceTo(end) < 0.05) { hasFinished.current = true; camera.position.copy(end); camera.rotation.set(0, 0, 0); camera.fov = 60; camera.updateProjectionMatrix(); onFinish() }
  })
  return null
}

function ExitCameraRig({ onFinish }) {
  const { camera } = useThree(); const startPos = useRef(camera.position.clone()); const startQuat = useRef(camera.quaternion.clone()); const targetPos = useMemo(() => new THREE.Vector3(...SCENE_SKY_POS), []); const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); const startTime = useRef(Date.now()); const duration = 2000 
  useFrame(() => { const now = Date.now(); let t = (now - startTime.current) / duration; if (t > 1) t = 1; const ease = t * t * (3 - 2 * t); camera.position.lerpVectors(startPos.current, targetPos, ease); camera.quaternion.slerpQuaternions(startPos.current.quaternion || startQuat.current, targetQuat, ease); camera.fov = THREE.MathUtils.lerp(60, 15, ease); camera.updateProjectionMatrix(); if (t >= 1) onFinish() })
  return null
}

function Hotspot({ id, position, soundUrl, message, duration = 4, soundLimit = 0, color = "#ffffff", onTrigger, isEditorMode, isSelected, onSelect, onUpdate }) {
  const [triggered, setTriggered] = useState(false); const [hovered, setHover] = useState(false); const audio = useRef(new Audio(soundUrl)); const visualRef = useRef(); const innerRef = useRef(); const groupRef = useRef(); const soundPlayingRef = useRef(false); const { camera } = useThree(); const posVec = new THREE.Vector3(...position)
  useEffect(() => { if(soundUrl) { audio.current = new Audio(soundUrl); audio.current.volume = 0 } }, [soundUrl])
  useFrame((state, delta) => {
    if (!visualRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.position.y = position[1] + 0.15 + Math.sin(t * 1.5) * 0.05
    const targetScale = hovered || isSelected ? 1.3 : 1.0
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
    innerRef.current.scale.setScalar(1.0 + Math.sin(t * 3.0) * 0.1)
    if (audio.current) {
        const fadeSpeed = delta * 2.0; const shouldPlay = triggered && !isEditorMode && soundPlayingRef.current
        if (shouldPlay) { if (audio.current.paused) audio.current.play().catch(() => {}); if (audio.current.volume < 0.5) audio.current.volume = Math.min(0.5, audio.current.volume + fadeSpeed) } 
        else { if (audio.current.volume > 0) audio.current.volume = Math.max(0, audio.current.volume - fadeSpeed); else if (!audio.current.paused && audio.current.volume <= 0) { audio.current.pause(); audio.current.currentTime = 0 } }
    }
    if (!isEditorMode) {
      const dist = camera.position.distanceTo(posVec)
      if (dist < 2.5 && !triggered) { setTriggered(true); if(onTrigger) onTrigger(message, duration); } 
      else if (dist >= 3.0 && triggered) { setTriggered(false); }
    }
  })
  return (
    <group position={position}>
      {isEditorMode && isSelected && ( <TransformControls object={groupRef} mode="translate" onMouseUp={() => { if (groupRef.current) onUpdate(id, { position: [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z] }) }} /> )}
      <group ref={groupRef} onClick={(e) => { if (isEditorMode) { e.stopPropagation(); onSelect(id) } }} onPointerOver={() => { setHover(true); document.body.style.cursor = 'pointer' }} onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto' }}>
        <mesh ref={visualRef}><sphereGeometry args={[0.3, 64, 64]} /><MeshTransmissionMaterial backside samples={6} thickness={0.1} chromaticAberration={1.0} anisotropy={20} distortion={0.8} distortionScale={0.5} temporalDistortion={0.2} roughness={0.2} clearcoat={1} color={"#ffffff"} /></mesh>
        <mesh ref={innerRef} scale={0.5}><sphereGeometry args={[0.12, 32, 32]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
        <pointLight color={color} intensity={2} distance={3} decay={2} />
        <PositionalAudio url={soundUrl || "/whisper.mp3"} distance={1} loop autoplay />
      </group>
    </group>
  )
}

function SceneAudio({ url }) {
    useEffect(() => {
        if (!url) return
        const audio = new Audio(url)
        audio.loop = true; audio.volume = 0; audio.play().catch(() => {})
        const fadeIn = setInterval(() => { if (audio.volume < 0.5) audio.volume = Math.min(0.5, audio.volume + 0.05); else clearInterval(fadeIn) }, 200)
        return () => { clearInterval(fadeIn); const fadeOut = setInterval(() => { if (audio.volume > 0) audio.volume = Math.max(0, audio.volume - 0.05); else { clearInterval(fadeOut); audio.pause() } }, 100) }
    }, [url])
    return null
}

function SceneContent({ fileUrl, audioUrl, splatPosition, setOverlayMessage, isEditorMode, isAtmosphereMode, hotspots, setHotspots, selectedId, setSelectedId, atmSettings, flashlightOn, storyMode, onStoryStep }) {
  const [ghostPos, setGhostPos] = useState(null)
  const { camera } = useThree()
  const [, getKeys] = useKeyboardControls()
  
  const updateHotspot = (id, newData) => { setHotspots(hotspots.map(h => h.id === id ? { ...h, ...newData } : h)) }
  
  const handleFloorClick = (e) => {
    if (!isEditorMode || isAtmosphereMode) return 
    if (e.object.type !== 'Mesh') return
    const pos = getClampedFloorPosition(camera, e.point, 7) 
    const newHotspot = { id: Date.now(), position: pos, label: "New Point", message: "Your message here...", soundUrl: "", color: "#ffffff", duration: 4, soundLimit: 0 }
    setHotspots([...hotspots, newHotspot])
    setSelectedId(newHotspot.id)
  }

  const handleFloorMove = (e) => { 
      if (isEditorMode && !isAtmosphereMode) {
          const pos = getClampedFloorPosition(camera, e.point, 7)
          setGhostPos(pos)
      } else { setGhostPos(null) }
  }

  const bg = flashlightOn ? '#050505' : atmSettings.bgColor || '#e0e0e0'
  const ambientInt = flashlightOn ? 0.1 : 0.5 
  const dirInt = flashlightOn ? 0.2 : 1.5 
  const vignetteDarkness = flashlightOn ? 0.85 : (atmSettings.vignetteDarkness || 0.5)

  return (
    <>
      <color attach="background" args={[bg]} />
      <fogExp2 attach="fog" args={[bg, atmSettings.fogDensity]} /> 
      <Environment preset="city" background={false} environmentIntensity={flashlightOn ? 0.1 : 1.0} /> 
      
      <ambientLight intensity={ambientInt} />
      <directionalLight castShadow position={[10, 20, 5]} intensity={dirInt} color={'#ffffff'} shadow-mapSize={[2048, 2048]} />
      
      <Splat 
        src={fileUrl || "/scene.splat"} 
        position={splatPosition || [0, 1.5, 0]} 
        scale={[2, 2, 2]} 
        alphaTest={atmSettings.splatAlpha} 
        transparent={atmSettings.splatOpacity < 1.0} 
        opacity={atmSettings.splatOpacity} 
        color={atmSettings.splatTint}
      />

      <SceneAudio url={audioUrl} />
      <Flashlight active={flashlightOn} />
      <StoryModeController active={storyMode} hotspots={hotspots} onStep={onStoryStep} />
      {hotspots.map(h => (<Hotspot key={h.id} {...h} onTrigger={setOverlayMessage} isEditorMode={isEditorMode && !isAtmosphereMode} isSelected={selectedId === h.id} onSelect={setSelectedId} onUpdate={updateHotspot} />))}
      
      {isEditorMode && !isAtmosphereMode && ghostPos && (
          <group position={ghostPos}>
              <mesh><sphereGeometry args={[0.25, 32, 32]} /><meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} /></mesh>
              <mesh scale={0.5}><sphereGeometry args={[0.1, 16, 16]} /><meshBasicMaterial color="#00ff00" /></mesh>
          </group>
      )}
      
      {/* FOCUS COLLIDER */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}> 
        <planeGeometry args={[200, 200]} /> 
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} /> 
      </mesh>

      {/* RAYCAST FLOOR */}
      <group position={[0, -5, 0]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={handleFloorClick} onPointerMove={handleFloorMove} onPointerOut={() => setGhostPos(null)}>
            <planeGeometry args={[1000, 1000]} /> 
            <shadowMaterial transparent opacity={0.0} depthWrite={false} /> 
          </mesh>
      </group>

      <EffectComposer disableNormalPass>
        <Autofocus />
        <ChromaticAberration offset={[atmSettings.chromatic * 0.002, atmSettings.chromatic * 0.002]} />
        <Noise opacity={atmSettings.grain} blendFunction={BlendFunction.OVERLAY} />
        <Bloom luminanceThreshold={1} mipmapBlur intensity={atmSettings.halationIntensity + 0.5} radius={0.6} />
        <BrightnessContrast brightness={0} contrast={atmSettings.contrast} />
        <HueSaturation saturation={atmSettings.saturation} hue={0} />
        <Vignette eskil={false} offset={0.1} darkness={vignetteDarkness} /> 
      </EffectComposer>
    </>
  )
}

// ==========================================
// 5. MAIN EXPORT
// ==========================================

export function SceneViewer({ id, name, fileUrl, audioUrl, splatPosition, camPosition, texts }) {
  const [activeMessage, setActiveMessage] = useState(null)
  const [editorMode, setEditorMode] = useState("NONE") 
  const [selectedId, setSelectedId] = useState(null)
  const [appState, setAppState] = useState("scrolling") 
  
  const [hotspots, setHotspots] = useState(() => { const saved = localStorage.getItem(`${id}-hotspots`); return saved ? JSON.parse(saved) : [] })
  const [atmSettings, setAtmSettings] = useState(() => { const saved = localStorage.getItem(`${id}-atmosphere`); return saved ? JSON.parse(saved) : { contrast: 0.1, saturation: 0, chromatic: 0, grain: 0, halationIntensity: 0.5, preset: 'city', fogDensity: 0.02, splatAlpha: 0.1, splatOpacity: 1.0, splatTint: '#ffffff', vignetteBlur: 0.5 } })
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [storyMode, setStoryMode] = useState(false)

  useEffect(() => { if (id) localStorage.setItem(`${id}-hotspots`, JSON.stringify(hotspots)) }, [hotspots, id])
  useEffect(() => { if (id) localStorage.setItem(`${id}-atmosphere`, JSON.stringify(atmSettings)) }, [atmSettings, id])

  useEffect(() => {
      setHotspots(prev => prev.map(h => {
          if (Math.abs(h.position[1] - HOTSPOT_HEIGHT) > 0.001) {
              return { ...h, position: [h.position[0], HOTSPOT_HEIGHT, h.position[2]] }
          }
          return h
      }))
  }, [id])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (appState !== "started") return
      if (e.key === '1') { setEditorMode(prev => prev === "HOTSPOT" ? "NONE" : "HOTSPOT"); setSelectedId(null) }
      if (e.key === '2') { setEditorMode(prev => prev === "ATMOSPHERE" ? "NONE" : "ATMOSPHERE"); setSelectedId(null) }
    }
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown)
  }, [appState])

  const updateHotspot = (id, data) => { setHotspots(hotspots.map(h => h.id === id ? { ...h, ...data } : h)) }
  const deleteHotspot = (id) => { setHotspots(hotspots.filter(h => h.id !== id)); setSelectedId(null) }
  const PAGES = 4 

  return (
    <div style={{ width: '100%', height: '100%', background: '#f0f0f0', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
      <style>{UI_STYLES}</style>
      
      {/* POPUP UNTEN RECHTS */}
      <ControlsPopup visible={appState === "started"} />

      {editorMode === "HOTSPOT" && <div style={{position:'absolute', inset:0, border: '4px solid #ff4040', pointerEvents:'none', zIndex:500}} />}
      {editorMode === "ATMOSPHERE" && <div style={{position:'absolute', inset:0, border: '4px solid #4040ff', pointerEvents:'none', zIndex:500}} />}
      
      {appState === "started" && (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
             {editorMode === "NONE" && (
                 <div style={{marginBottom: '10px', display:'flex'}}>
                     <button className={`control-btn ${flashlightOn ? 'active' : ''}`} onClick={() => setFlashlightOn(!flashlightOn)}>Flashlight (F)</button>
                     <button className={`control-btn ${storyMode ? 'active' : ''}`} onClick={() => setStoryMode(!storyMode)}>Story Mode</button>
                 </div>
             )}
             {editorMode === "NONE" && (<><div style={{background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', color: 'white', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: FONT_FAMILY}}>Press '1' to enter Hotspot-Editor</div><div style={{background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', color: 'white', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: FONT_FAMILY}}>Press '2' to enter Atmosphere-Editor</div></>)}
             {editorMode !== "NONE" && (<div style={{background: 'black', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontFamily: FONT_FAMILY, fontWeight: 'bold'}}>EXIT EDITOR (Press '{editorMode === "HOTSPOT" ? '1' : '2'}')</div>)}
        </div>
      )}
      
      {editorMode === "HOTSPOT" && appState === "started" && <HotspotPanel hotspots={hotspots} selectedHotspot={hotspots.find(h => h.id === selectedId)} updateHotspot={updateHotspot} deleteHotspot={deleteHotspot} onSelect={setSelectedId} />}
      {editorMode === "ATMOSPHERE" && appState === "started" && <AtmospherePanel settings={atmSettings} setSettings={setAtmSettings} />}

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows gl={{ antialias: false, toneMapping: THREE.NoToneMapping }}> 
          <Suspense fallback={null}>
            {/* HELPER LOGIC INSIDE CANVAS */}
            <GameLogic 
                setFlashlightOn={setFlashlightOn} 
                isEditorMode={editorMode === "HOTSPOT"}
                isAtmosphereMode={editorMode === "ATMOSPHERE"}
                setHotspots={setHotspots}
                setSelectedId={setSelectedId}
            /> 
            
            <SceneContent 
                fileUrl={fileUrl} audioUrl={audioUrl} splatPosition={splatPosition} 
                setOverlayMessage={(msg, d) => setActiveMessage({ text: msg, duration: d })} 
                isEditorMode={editorMode === "HOTSPOT"} isAtmosphereMode={editorMode === "ATMOSPHERE"} 
                hotspots={hotspots} setHotspots={setHotspots} selectedId={selectedId} setSelectedId={setSelectedId} 
                atmSettings={atmSettings} flashlightOn={flashlightOn} storyMode={storyMode} 
                onStoryStep={(h) => setActiveMessage({ text: h.message, duration: h.duration })} 
            />

            {appState === "scrolling" && (
              <ScrollControls pages={PAGES} damping={0.2}>
                <Scroll><ScrollCameraRig startPos={camPosition} onFinish={() => setAppState("started")} /></Scroll>
                <Scroll html style={{ width: '100%' }}><LandingContent sceneName={name} texts={texts} /></Scroll>
              </ScrollControls>
            )}
            
            {/* FPS CONTROLS */}
            {appState === "started" && !storyMode && (
                <> {editorMode === "NONE" && <FPSControls />} <PerspectiveCamera makeDefault position={camPosition || SCENE_START_POS} rotation={[0, 0, 0]} fov={60} /> </>
            )}
            
            {/* STORY CAM */}
            {appState === "started" && storyMode && <PerspectiveCamera makeDefault position={camPosition || SCENE_START_POS} rotation={[0, 0, 0]} fov={60} />}

            {appState === "exiting" && <ExitCameraRig onFinish={() => setAppState("scrolling")} />}
          </Suspense>
        </Canvas>
        <Loader />
      </KeyboardControls>
      {activeMessage && appState === "started" && <TimedMessage text={activeMessage.text} duration={activeMessage.duration} onClose={() => setActiveMessage(null)} />}
    </div>
  )
}