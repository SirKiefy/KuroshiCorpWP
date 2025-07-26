import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { c3iState } from './data.js';
import { bootState } from './boot.js';
import { db } from './firebase.js';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Coordinate Conversion Utilities
export function pointToLatLon(point, radius) {
    const lat = 90 - (Math.acos(point.y / radius)) * 180 / Math.PI;
    const lon = ((270 + (Math.atan2(point.x, point.z)) * 180 / Math.PI) % 360) - 180;
    return { lat, lon };
}

export function latLonToPoint(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

export function latLonToPlaneCoords(lat, lon) {
    const x = lon / 360 * 20;
    const z = -lat / 180 * 10;
    return {x, z};
}

export function planeCoordsToLatLon(x, z) {
    const lon = x / 20 * 360;
    const lat = -z / 10 * 180;
    return {lat, lon};
}


// Tactical Map Logic
export function initTacticalMap() {
    let globe, waypointsGroup, waypointsGroupPlane, planeMesh;
    const tacticalMapContainer = document.getElementById('tactical-map-container');
    const mapPlaneContainer = document.getElementById('map-plane-container');
    const mapPlaneCanvas = document.getElementById('map-plane');
    const tacticalMap = document.getElementById('tactical-map');
    const statusTextEl = document.getElementById('status-text');
    
    if (!tacticalMap) return;
    
    const defaultStatusText = 'Awaiting command. Hover over map for coordinates.';
    statusTextEl.textContent = defaultStatusText;

    setTimeout(() => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const textureLoader = new THREE.TextureLoader();
        textureLoader.setCrossOrigin('anonymous');

        const mapTexture = textureLoader.load('https://i.imgur.com/CeviL2x.png');
        const territoryTexture = textureLoader.load('https://i.postimg.cc/6Q7f2MhN/territory-map-overlay.png');
        const resourcesTexture = textureLoader.load('https://i.postimg.cc/d1wz2YQG/resource-map-overlay.png');

        // Globe Scene
        const globeScene = new THREE.Scene();
        const globeCamera = new THREE.PerspectiveCamera(75, tacticalMap.clientWidth / tacticalMap.clientHeight, 0.1, 1000);
        const globeRenderer = new THREE.WebGLRenderer({ canvas: tacticalMap, antialias: true, alpha: true });
        globeRenderer.setSize(tacticalMap.clientWidth, tacticalMap.clientHeight);
        bootState.threeInstances.push({ renderer: globeRenderer, camera: globeCamera, container: tacticalMapContainer });
        
        const geometry = new THREE.SphereGeometry(5, 128, 128);
        const globeControls = new OrbitControls(globeCamera, globeRenderer.domElement);
        Object.assign(globeControls, { enableDamping: true, dampingFactor: 0.03, screenSpacePanning: false, minDistance: 6, maxDistance: 20, autoRotate: true, autoRotateSpeed: 0.2 });

        textureLoader.load('https://i.imgur.com/vlYiAdX.png', (heightMapTexture) => {
            heightMapTexture.wrapS = THREE.RepeatWrapping;
            heightMapTexture.wrapT = THREE.RepeatWrapping;
            const material = new THREE.MeshPhongMaterial({ map: mapTexture, shininess: 20, specular: 0x333333, bumpMap: heightMapTexture, bumpScale: 0.15, displacementMap: heightMapTexture, displacementScale: 0 });
            
            material.onBeforeCompile = (shader) => {
                shader.uniforms.u_outline_enabled = { value: false };
                shader.uniforms.u_outline_color = { value: new THREE.Color(getComputedStyle(document.body).getPropertyValue('--color-info')) };
                shader.uniforms.u_outline_threshold = { value: 0.05 };
                shader.uniforms.heightMap = { value: heightMapTexture };
                shader.vertexShader = `varying vec2 vUv;\n` + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvUv = uv;`);
                shader.fragmentShader = `uniform bool u_outline_enabled; uniform vec3 u_outline_color; uniform float u_outline_threshold; uniform sampler2D heightMap; varying vec2 vUv; float get_height(vec2 uv) { return texture2D(heightMap, uv).r; }\n` + shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\nif (u_outline_enabled) { float height = get_height(vUv); if (height > 0.01) { vec2 d = fwidth(vUv); float sobel_x = get_height(vUv + vec2(d.x, 0.0)) - get_height(vUv - vec2(d.x, 0.0)); float sobel_y = get_height(vUv + vec2(0.0, d.y)) - get_height(vUv - vec2(0.0, d.y)); float edge = sqrt(sobel_x * sobel_x + sobel_y * sobel_y); gl_FragColor.rgb = mix(gl_FragColor.rgb, u_outline_color, step(u_outline_threshold, edge)); } }`);
                globe.userData.shader = shader;
            };

            globe = new THREE.Mesh(geometry, material);
            globeScene.add(globe);

            waypointsGroup = new THREE.Group();
            globe.add(waypointsGroup);
            const coordinateGrid = new THREE.Mesh(new THREE.SphereGeometry(5.05, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 }));
            coordinateGrid.visible = false;
            globe.add(coordinateGrid);
            const territoryOverlay = new THREE.Mesh(new THREE.SphereGeometry(5.01, 128, 128), new THREE.MeshBasicMaterial({ map: territoryTexture, transparent: true, opacity: 0.7 }));
            territoryOverlay.visible = false;
            globe.add(territoryOverlay);
            const resourcesOverlay = new THREE.Mesh(new THREE.SphereGeometry(5.02, 128, 128), new THREE.MeshBasicMaterial({ map: resourcesTexture, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
            resourcesOverlay.visible = false;
            globe.add(resourcesOverlay);

            document.getElementById('heightmap-toggle').dispatchEvent(new Event('change'));
            document.getElementById('territory-toggle').addEventListener('change', (e) => { territoryOverlay.visible = e.target.checked; });
            document.getElementById('resources-toggle').addEventListener('change', (e) => { resourcesOverlay.visible = e.target.checked; });
            document.getElementById('coord-toggle').addEventListener('change', (e) => { coordinateGrid.visible = e.target.checked; });
        });

        // Plane Scene
        const planeScene = new THREE.Scene();
        const planeCamera = new THREE.PerspectiveCamera(75, mapPlaneCanvas.clientWidth / mapPlaneCanvas.clientHeight, 0.1, 1000);
        const planeRenderer = new THREE.WebGLRenderer({ canvas: mapPlaneCanvas, antialias: true, alpha: true });
        planeRenderer.setSize(mapPlaneCanvas.clientWidth, mapPlaneCanvas.clientHeight);
        bootState.threeInstances.push({ renderer: planeRenderer, camera: planeCamera, container: mapPlaneContainer });
        const planeControls = new OrbitControls(planeCamera, planeRenderer.domElement);
        Object.assign(planeControls, { enableDamping: true, dampingFactor: 0.05, minDistance: 2, maxDistance: 40, enableRotate: false, mouseButtons: { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }});
        planeScene.add(new THREE.GridHelper(20, 20, 0xaaaaaa, 0x555555));
        const raycastPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ visible: false }));
        raycastPlane.rotation.x = -Math.PI / 2;
        planeScene.add(raycastPlane);

        // Common Scene Elements
        globeScene.add(new THREE.AmbientLight(0xffffff, 2.0));
        planeScene.add(new THREE.AmbientLight(0xffffff, 2.0));
        const pointLight = new THREE.PointLight(0xffffff, 2.5);
        pointLight.position.set(15, 15, 15);
        globeScene.add(pointLight);
        planeScene.add(pointLight.clone());
        globeCamera.position.z = 10;
        planeCamera.position.set(0, 15, 0);
        planeCamera.lookAt(0,0,0);

        function animate() {
            if (document.getElementById('tactical-map')) {
                globeControls.update();
                planeControls.update();
                requestAnimationFrame(animate); 
                globeRenderer.render(globeScene, globeCamera);
                planeRenderer.render(planeScene, planeCamera);
            }
        }
        animate();
        
        // Waypoint Logic
        // ... (Waypoint logic remains the same as previous versions) ...

    }, 10);
}
