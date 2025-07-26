import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { c3iState } from './data.js';
import { bootState } from './boot.js';
import { saveWaypoint, updateWaypoint, deleteWaypoint, saveAuditLog } from './firebase.js';

// --- Logging Utility ---
export async function logAction(action, details = '') {
    if (!c3iState.currentUser || !c3iState.firebaseUser) {
        console.warn("Cannot log action, user not fully authenticated.");
        return;
    }
    const logData = {
        timestamp: new Date(), // Using client timestamp for simplicity, serverTimestamp is better
        operator: c3iState.currentUser.codename,
        action,
        details,
        userId: c3iState.firebaseUser.uid
    };
    await saveAuditLog(logData);
}

// --- Coordinate Conversion Utilities ---
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

// --- Tactical Map Logic ---
export function initTacticalMap() {
    let globe, globeControls, waypointsGroup;
    const tacticalMapContainer = document.getElementById('tactical-map-container');
    const tacticalMap = document.getElementById('tactical-map');
    const statusTextEl = document.getElementById('status-text');
    
    if (!tacticalMap) return;
    
    setTimeout(() => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const textureLoader = new THREE.TextureLoader();
        textureLoader.setCrossOrigin('anonymous');

        const mapTexture = textureLoader.load('https://i.imgur.com/CeviL2x.png');
        const heightMapTexture = textureLoader.load('https://i.imgur.com/vlYiAdX.png');
        
        const globeScene = new THREE.Scene();
        const globeCamera = new THREE.PerspectiveCamera(75, tacticalMap.clientWidth / tacticalMap.clientHeight, 0.1, 1000);
        const globeRenderer = new THREE.WebGLRenderer({ canvas: tacticalMap, antialias: true, alpha: true });
        globeRenderer.setSize(tacticalMap.clientWidth, tacticalMap.clientHeight);
        bootState.threeInstances.push({ renderer: globeRenderer, camera: globeCamera, container: tacticalMapContainer });
        
        const geometry = new THREE.SphereGeometry(5, 128, 128);
        globeControls = new OrbitControls(globeCamera, globeRenderer.domElement);
        Object.assign(globeControls, { enableDamping: true, dampingFactor: 0.03, screenSpacePanning: false, minDistance: 6, maxDistance: 20, autoRotate: true, autoRotateSpeed: 0.2 });

        const material = new THREE.MeshPhongMaterial({ map: mapTexture, shininess: 20, specular: 0x333333, bumpMap: heightMapTexture, bumpScale: 0.15, displacementMap: heightMapTexture, displacementScale: 0 });
        
        material.onBeforeCompile = (shader) => {
            shader.uniforms.u_outline_enabled = { value: false };
            shader.uniforms.u_outline_color = { value: new THREE.Color(getComputedStyle(document.body).getPropertyValue('--color-info')) };
            shader.uniforms.u_outline_threshold = { value: 0.05 };
            shader.vertexShader = `varying vec2 vUv;\n` + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvUv = uv;`);
            shader.fragmentShader = `uniform bool u_outline_enabled; uniform vec3 u_outline_color; uniform float u_outline_threshold; varying vec2 vUv;\n` + shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\nif (u_outline_enabled) { float height = texture2D(displacementMap, vUv).r; if (height > 0.01) { vec2 d = fwidth(vUv); float sobel_x = texture2D(displacementMap, vUv + vec2(d.x, 0.0)).r - texture2D(displacementMap, vUv - vec2(d.x, 0.0)).r; float sobel_y = texture2D(displacementMap, vUv + vec2(0.0, d.y)).r - texture2D(displacementMap, vUv - vec2(0.0, d.y)).r; float edge = sqrt(sobel_x * sobel_x + sobel_y * sobel_y); gl_FragColor.rgb = mix(gl_FragColor.rgb, u_outline_color, step(u_outline_threshold, edge)); } }`);
            globe.userData.shader = shader;
        };

        globe = new THREE.Mesh(geometry, material);
        globeScene.add(globe);

        waypointsGroup = new THREE.Group();
        globe.add(waypointsGroup);

        globeScene.add(new THREE.AmbientLight(0xffffff, 2.0));
        const pointLight = new THREE.PointLight(0xffffff, 2.5);
        pointLight.position.set(15, 15, 15);
        globeScene.add(pointLight);
        globeCamera.position.z = 10;

        function animate() {
            if (document.getElementById('tactical-map')) {
                globeControls.update();
                requestAnimationFrame(animate); 
                globeRenderer.render(globeScene, globeCamera);
            }
        }
        animate();

        // UI Controls
        document.getElementById('rotate-toggle').addEventListener('change', (e) => { 
            if (globeControls) globeControls.autoRotate = e.target.checked; 
        });
        document.getElementById('heightmap-toggle').addEventListener('change', (e) => { 
            const isEnabled = e.target.checked;
            if (globe && globe.material) {
                globe.material.displacementScale = isEnabled ? 0.4 : 0;
                if (globe.userData.shader) {
                    globe.userData.shader.uniforms.u_outline_enabled.value = isEnabled;
                }
                globe.material.needsUpdate = true;
            }
        });

        // Waypoint Logic
        function renderAllWaypoints() {
            if (waypointsGroup) {
                waypointsGroup.clear();
                c3iState.waypoints.forEach(wp => {
                    const wpGeo = new THREE.ConeGeometry(0.1, 0.8, 8);
                    const wpMat = new THREE.MeshBasicMaterial({ color: wp.color });
                    const waypointMesh = new THREE.Mesh(wpGeo, wpMat);
                    waypointMesh.position.copy(new THREE.Vector3(wp.position.x, wp.position.y, wp.position.z));
                    waypointMesh.lookAt(new THREE.Vector3(0,0,0));
                    waypointMesh.rotateX(Math.PI / 2);
                    waypointMesh.userData.id = wp.id;
                    waypointsGroup.add(waypointMesh);
                });
            }
        }

        async function plotNewWaypoint(position, coords) {
            const newWaypoint = { 
                name: `WP-${Date.now().toString().slice(-4)}`, 
                position: { x: position.x, y: position.y, z: position.z },
                coords, 
                color: '#f5a623',
                createdBy: c3iState.currentUser.uid,
                timestamp: new Date()
            };
            const success = await saveWaypoint(newWaypoint);
            if(success) logAction('Waypoint Plotted', `[${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}]`);
        }
        
        function showWaypointInfo(waypointId) {
            const waypoint = c3iState.waypoints.find(w => w.id === waypointId);
            if (!waypoint) return;
            
            const infoContent = document.getElementById('waypoint-info-content');
            infoContent.innerHTML = `...`; // Populate with waypoint info and edit/delete buttons

            document.getElementById('delete-waypoint-btn').addEventListener('click', async () => {
                await deleteWaypoint(waypointId);
                logAction('Waypoint Deleted', `ID: ${waypointId}`);
            });
        }

        // Event Listeners
        let isDragging = false;
        // ... rest of event listener logic for dragging, clicking, plotting ...

        window.addEventListener('waypointsUpdated', renderAllWaypoints);
        renderAllWaypoints();
    }, 10);
}
