import { initCoreIgnition, initOfflineVisuals, initThreatAnalysis, initBiosSidebarVisual } from './three-scenes.js';
import { bootState } from './data.js';

export async function runBootSequence() {
    await switchStage(1); 
    initCoreIgnition(); 
    await new Promise(res => setTimeout(res, 7000));
    
    await switchStage(2); 
    await runBios();
    
    await switchStage(3); 
    initThreatAnalysis(); 
    await new Promise(res => setTimeout(res, 8000));
    
    await switchStage(4);
}

function switchStage(stageIndex) {
    return new Promise(resolve => {
        if(bootState.soundInitialized) bootState.uiSynth.triggerAttackRelease("C#2", "8n");
        bootState.stages[bootState.currentStage].classList.remove('active');
        setTimeout(() => {
            bootState.currentStage = stageIndex;
            bootState.stages[bootState.currentStage].classList.add('active');
            resolve();
        }, 500);
    });
}

export function initSound() {
    if (bootState.soundInitialized) return;
    Tone.start();
    const reverb = new Tone.Reverb(3).toDestination();
    bootState.deploySynth = new Tone.MonoSynth({ oscillator: { type: "fatsawtooth" }, envelope: { attack: 1, decay: 2, sustain: 0.5, release: 2 } }).connect(reverb);
    bootState.deploySynth.volume.value = -20;
    bootState.matrixSynth = new Tone.AMSynth({ harmonicity: 1.5, oscillator: { type: "fatsine" }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.5 } }).connect(reverb);
    bootState.matrixSynth.volume.value = -22;
    bootState.flowSynth = new Tone.PluckSynth({ attackNoise: 0.5, dampening: 6000, resonance: 0.95 }).connect(reverb);
    bootState.flowSynth.volume.value = -15;
    bootState.uiSynth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 } }).toDestination();
    bootState.uiSynth.volume.value = -18;
    bootState.failSynth = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.2 } }).toDestination();
    bootState.failSynth.volume.value = -12;
    bootState.successSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.2 } }).toDestination();
    bootState.successSynth.volume.value = -10;
    bootState.soundInitialized = true;
}

export function initOffline() {
    initOfflineVisuals();
}

async function runBios() {
    initBiosSidebarVisual();
    const biosLinesEl = document.getElementById('bios-lines');
    const jargon = ["Initializing WARSAT Core...", "Loading K-SAT Trajectory Data... <span class='keyword-data'>[ENCRYPTED]</span>", "Calibrating Phased Array... <span class='keyword-info'>[AZ: 178.4, EL: 45.2]</span>", "Verifying <span class='keyword-sys'>Quantum Entanglement Comms</span>... <span class='keyword-ok'>[LOCKED]</span>", "Stealth Plasma Venting... <span class='keyword-ok'>[NOMINAL]</span>", "Initializing <span class='keyword-sys'>FTLN Beacon</span>... <span class='keyword-ok'>[OK]</span>", "Reticulating Splines... <span class='highlight'>ID: 88-5B-1A</span>", "Checking <span class='keyword-warn'>Kinetic Rod Deployment System</span>... <span class='keyword-warn'>[STANDBY]</span>", "Cryo-Coolant Flow... <span class='keyword-info'>[2.4 L/s]</span>", "Bootstrapping <span class='keyword-sys'>AI Threat Matrix</span>...", "Decompressing Targeting Archives... <span class='keyword-data'>[7.2 ZB]</span>", "Spoofing NORAD Identifiers... <span class='keyword-ok'>[OK]</span>", "<span class='keyword-sys'>Cyclic Redundancy Check</span>: <span class='highlight'>0x5f3759df</span>... <span class='keyword-ok'>[PASS]</span>", "Engaging Gravimetric Distortion Field... <span class='keyword-warn'>[LOW POWER]</span>", "Syncing Chronometers... <span class='keyword-info'>[UTC-0]</span>", "Sub-light Engine Test... <span class='keyword-ok'>[PASS]</span>", "Loading Heuristic Profiles... <span class='keyword-data'>[9.1M PROFILES]</span>", "Final Pre-flight Check... All systems nominal."];
    const errorJargon = ["Memory Address <span class='highlight'>0xFF813A0</span>... <span class='keyword-error'>[FAULT]</span>", "Subspace Comm Array... <span class='keyword-error'>[NO CARRIER]</span>", "Plasma Injector <span class='highlight'>#3</span>... <span class='keyword-error'>[MISALIGNED]</span>", "QEC Channel <span class='highlight'>7</span>... <span class='keyword-error'>[DECOHERENCE]</span>"];
    const bars = { qec: document.getElementById('bar-qec'), heat: document.getElementById('bar-heat'), wpn: document.getElementById('bar-wpn'), telemetry: document.getElementById('bar-telemetry'), shield: document.getElementById('bar-shield'), sensor: document.getElementById('bar-sensor') };
    const cbars = { power: document.getElementById('cbar-power'), nav: document.getElementById('cbar-nav'), life: document.getElementById('cbar-life'), cpu: document.getElementById('cbar-cpu'), mem: document.getElementById('cbar-mem'), net: document.getElementById('cbar-net') };
    const cbarCircumference = 2 * Math.PI * 45;
    Object.values(cbars).forEach(c => { c.style.strokeDasharray = cbarCircumference; c.style.strokeDashoffset = cbarCircumference; });
    for (let i = 0; i < jargon.length; i++) {
        if (bootState.currentStage !== 2) return;
        if (Math.random() < 0.1 && i > 3 && i < jargon.length - 2) {
            const p = document.createElement('p'); p.classList.add('bios-line'); p.innerHTML = `${errorJargon[Math.floor(Math.random() * errorJargon.length)]} Retrying...`; biosLinesEl.appendChild(p); biosLinesEl.scrollTop = biosLinesEl.scrollHeight;
            if(bootState.soundInitialized) bootState.failSynth.triggerAttackRelease("G1", "2n");
            await new Promise(res => setTimeout(res, 1500));
            const p2 = document.createElement('p'); p2.classList.add('bios-line'); p2.innerHTML = `Retry successful... <span class='keyword-ok'>[OK]</span>`; biosLinesEl.appendChild(p2); biosLinesEl.scrollTop = biosLinesEl.scrollHeight;
        }
        const p = document.createElement('p'); p.classList.add('bios-line'); p.innerHTML = jargon[i]; biosLinesEl.appendChild(p); biosLinesEl.scrollTop = biosLinesEl.scrollHeight;
        const progress = (i + 1) / jargon.length;
        window.dispatchEvent(new CustomEvent('bios_progress', { detail: { progress } }));
        bars.qec.style.width = `${Math.min(100, progress * 120)}%`;
        if (i > 2) bars.heat.style.width = `${Math.min(100, ((i - 2) / (jargon.length - 3)) * 110)}%`;
        if (i > 4) bars.shield.style.width = `${Math.min(100, ((i - 4) / (jargon.length - 5)) * 95)}%`;
        if (i > 5) bars.wpn.style.width = `${Math.min(100, ((i - 5) / (jargon.length - 6)) * 130)}%`;
        if (i > 6) bars.sensor.style.width = `${Math.min(100, ((i - 6) / (jargon.length - 7)) * 115)}%`;
        if (i > 8) bars.telemetry.style.width = `${Math.min(100, ((i - 8) / (jargon.length - 8)) * 105)}%`;
        
        cbars.power.style.strokeDashoffset = cbarCircumference * (1 - Math.min(1, progress * 1.1));
        if (i > 1) cbars.cpu.style.strokeDashoffset = cbarCircumference * (1 - Math.min(1, ((i - 1) / (jargon.length - 2)) * 1.0));
        if (i > 3) cbars.mem.style.strokeDashoffset = cbarCircumference * (1 - Math.min(1, ((i - 3) / (jargon.length - 4)) * 1.1));
        if (i > 4) cbars.nav.style.strokeDashoffset = cbarCircumference * (1 - Math.min(1, ((i - 4) / (jargon.length - 5)) * 1.2));
        if (i > 5) cbars.net.style.strokeDashoffset = cbarCircumference * (1 - Math.min(1, ((i - 5) / (jargon.length - 6)) * 0.9));
        if (i > 7) cbars.life.style.strokeDashoffset = cbarCircumference * (1 - Math.min(1, ((i - 7) / (jargon.length - 8)) * 1.0));
        
        if(bootState.soundInitialized) bootState.uiSynth.triggerAttackRelease("C1", "32n", Tone.now() + i * 0.01);
        await new Promise(res => setTimeout(res, 250 + Math.random() * 150));
    }
    await new Promise(res => setTimeout(res, 1000));
}
