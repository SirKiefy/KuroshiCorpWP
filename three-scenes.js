/*
  This file contains all the `three.js` logic for the animated visuals during the boot sequence.
  Each function initializes a separate scene for a specific stage of the boot process.
*/

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { bootState } from './data.js';

/**
 * Initializes the visual for the "offline" stage (Stage 0).
 * Shows a rotating Earth and a satellite.
 */
export function initOfflineVisuals() {
    const canvas = document.getElementById('offline-canvas');
    if (!canvas) return;
    const container = canvas.parentElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    bootState.threeInstances.push({ renderer, scene, camera, container });

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(5, 5, 5);
    scene.add(sun);

    // Earth mesh
    const textureLoader = new THREE.TextureLoader();
    const earthTextureUrl = 'https://i.postimg.cc/RVT0S56x/earthmap1k.jpg';
    const earth = new THREE.Mesh(
        new THREE.SphereGeometry(2, 64, 64),
        new THREE.MeshStandardMaterial({
            map: textureLoader.load(earthTextureUrl, undefined, undefined, () => {
                // Fallback if texture fails to load
                earth.material.map = null;
                earth.material.color.set(0x4A90E2);
                earth.material.needsUpdate = true;
            }),
            metalness: 0.2,
            roughness: 0.7
        })
    );
    scene.add(earth);

    // Satellite mesh
    const sat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), new THREE.MeshStandardMaterial({color: 0xcccccc}));
    scene.add(sat);

    const clock = new THREE.Clock();
    function animate() {
        // Stop animation if we've moved to a different stage
        if (bootState.currentStage !== 0) return;
        
        const t = clock.getElapsedTime();
        earth.rotation.y = t * 0.1;
        sat.position.x = Math.cos(t * 0.5) * 3;
        sat.position.z = Math.sin(t * 0.5) * 3;
        sat.lookAt(earth.position);
        
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}

/**
 * Initializes the visual for the "core ignition" stage (Stage 1).
 * Shows a spinning gyroscope with a glowing core.
 */
export function initCoreIgnition() {
    if(bootState.soundInitialized) bootState.deploySynth.triggerAttack("C2");

    const canvas = document.getElementById('core-ignition-canvas');
    if (!canvas) return;
    const container = canvas.parentElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 8;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);

    // Post-processing for bloom effect
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0, 0, 0);
    composer.addPass(bloomPass);
    bootState.threeInstances.push({ renderer, scene, camera, container, composer });

    // Lighting and objects
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pointLight = new THREE.PointLight(0xff5555, 0, 100);
    scene.add(pointLight);

    const gyro = new THREE.Group();
    scene.add(gyro);
    const ringMat = new THREE.MeshStandardMaterial({color: 0xaaaaaa, metalness: 0.9, roughness: 0.2});
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3, 0.1, 16, 100), ringMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.1, 16, 100), ringMat);
    ring2.rotation.x = Math.PI / 2;
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(2, 0.1, 16, 100), ringMat);
    ring3.rotation.y = Math.PI / 2;
    gyro.add(ring1, ring2, ring3);

    const coreMat = new THREE.MeshStandardMaterial({color: 0xff3c3c, emissive: 0xff3c3c, emissiveIntensity: 0});
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), coreMat);
    gyro.add(core);

    const clock = new THREE.Clock();
    function animate() {
        if (bootState.currentStage !== 1) {
            if(bootState.soundInitialized) bootState.deploySynth.triggerRelease();
            return;
        }
        const t = clock.getElapsedTime();
        gyro.rotation.x += 0.01;
        gyro.rotation.y += 0.015;

        // Animate the ignition effect over time
        const ignitionProgress = Math.min(t / 5, 1);
        bloomPass.strength = ignitionProgress * 1.5;
        pointLight.intensity = ignitionProgress * 5;
        coreMat.emissiveIntensity = ignitionProgress * 2;

        requestAnimationFrame(animate);
        composer.render();
    }
    animate();
}

/**
 * Initializes the small visual in the BIOS sidebar (Stage 2).
 * Shows a wireframe core with orbiting rings that appear over time.
 */
export function initBiosSidebarVisual() {
    const container = document.getElementById('bios-sidebar-visual');
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 3;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    bootState.threeInstances.push({ renderer, scene, camera, container });

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshBasicMaterial({ color: 0xff3c3c, wireframe: true }));
    coreGroup.add(core);
    
    let rings = [];
    // Listen for custom event from the BIOS animation to add rings
    window.addEventListener('bios_progress', (e) => {
        const progress = e.detail.progress;
        const targetRings = Math.floor(progress * 5);
        if (targetRings > rings.length) {
            const ring = new THREE.Mesh( new THREE.TorusGeometry(0.8 + rings.length * 0.2, 0.02, 16, 100), new THREE.MeshBasicMaterial({ color: 0x45f3ff, transparent: true, opacity: 0 }) );
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            coreGroup.add(ring);
            rings.push(ring);
        }
    });

    function animate() {
        if (bootState.currentStage !== 2) return;
        coreGroup.rotation.y += 0.005;
        rings.forEach((ring, i) => {
            ring.rotation.z += 0.01 * (i % 2 === 0 ? 1 : -1);
            if (ring.material.opacity < 0.5) ring.material.opacity += 0.01;
        });
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}

/**
 * Initializes the visual for the "threat analysis" stage (Stage 3).
 * Shows a wireframe object being scanned with points and lines.
 */
export function initThreatAnalysis() {
    if(bootState.soundInitialized) bootState.matrixSynth.triggerAttackRelease("A2", "2n");

    const canvas = document.getElementById('threat-analysis-canvas');
    if (!canvas) return;
    const container = canvas.parentElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 15;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

    // Post-processing for bloom
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.6, 0.2));
    bootState.threeInstances.push({ renderer, scene, camera, container, composer });

    // Lighting and objects
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const threat = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 1), new THREE.MeshStandardMaterial({color: 0xff3c3c, metalness: 0.7, roughness: 0.4, wireframe: true}));
    scene.add(threat);
    
    const analysisGroup = new THREE.Group();
    scene.add(analysisGroup);
    
    const pointMat = new THREE.PointsMaterial({color: 0xf5a623, size: 0.3});
    const lineMat = new THREE.LineBasicMaterial({color: 0x45f3ff});
    
    const clock = new THREE.Clock();
    let lastSoundTime = 0;
    const soundCooldown = 0.05;

    function animate() {
        if (bootState.currentStage !== 3) return;
        
        const t = clock.getElapsedTime();
        threat.rotation.x = t * 0.2;
        threat.rotation.y = t * 0.3;
        analysisGroup.rotation.copy(threat.rotation);
        
        // Randomly add analysis points and lines to the surface of the object
        const now = Tone.now();
        if (now - lastSoundTime > soundCooldown && Math.random() > 0.97 && analysisGroup.children.length < 50) {
            const pointGeo = new THREE.BufferGeometry();
            const vertices = threat.geometry.attributes.position.array;
            const randomIndex = Math.floor(Math.random() * vertices.length / 3) * 3;
            const p = new THREE.Vector3(vertices[randomIndex], vertices[randomIndex+1], vertices[randomIndex+2]);
            pointGeo.setAttribute('position', new THREE.Float32BufferAttribute([p.x, p.y, p.z], 3));
            const analysisPoint = new THREE.Points(pointGeo, pointMat);
            analysisGroup.add(analysisPoint);

            const lineGeo = new THREE.BufferGeometry().setFromPoints([p, p.clone().multiplyScalar(1.5)]);
            const analysisLine = new THREE.Line(lineGeo, lineMat);
            analysisGroup.add(analysisLine);

            if(bootState.soundInitialized) {
                bootState.matrixSynth.triggerAttackRelease("G4", "16n");
                lastSoundTime = now;
            }
        }
        
        requestAnimationFrame(animate);
        composer.render();
    }
    animate();
}

