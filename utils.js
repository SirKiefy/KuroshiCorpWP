/*
  This file contains utility functions, primarily for the tactical map.
  - Coordinate conversion functions.
  - The main logic for initializing and controlling the Three.js globe.
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { c3iState, bootState } from './data.js';
import * as Firebase from './firebase.js';

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

// A closure to hold the globe instance and related variables
const globeManager = (() => {
    let globe, waypointsGroup, globeControls;

    function renderWaypoints() {
        if (!waypointsGroup) return;
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

    return {
        init: (canvas, container) => {
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const textureLoader = new THREE.TextureLoader();
            textureLoader.setCrossOrigin('anonymous');

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            bootState.threeInstances.push({ renderer, scene, camera, container });

            globeControls = new OrbitControls(camera, renderer.domElement);
            Object.assign(globeControls, { enableDamping: true, dampingFactor: 0.03, screenSpacePanning: false, minDistance: 6, maxDistance: 20, autoRotate: true, autoRotateSpeed: 0.2 });

            const heightMapTexture = textureLoader.load('https://i.imgur.com/vlYiAdX.png');
            const mapTexture = textureLoader.load('https://i.imgur.com/CeviL2x.png');
            const territoryTexture = textureLoader.load('https://i.postimg.cc/6Q7f2MhN/territory-map-overlay.png');
            const resourcesTexture = textureLoader.load('https://i.postimg.cc/d1wz2YQG/resource-map-overlay.png');

            const material = new THREE.MeshPhongMaterial({
                map: mapTexture,
                shininess: 20,
                specular: 0x333333,
                bumpMap: heightMapTexture,
                bumpScale: 0.15,
                displacementMap: heightMapTexture,
                displacementScale: 0.4 // Start with heightmap enabled
            });
            
            globe = new THREE.Mesh(new THREE.SphereGeometry(5, 128, 128), material);
            scene.add(globe);

            waypointsGroup = new THREE.Group();
            globe.add(waypointsGroup);

            const overlays = {
                coord: new THREE.Mesh(new THREE.SphereGeometry(5.05, 32, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 })),
                territory: new THREE.Mesh(new THREE.SphereGeometry(5.01, 128, 128), new THREE.MeshBasicMaterial({ map: territoryTexture, transparent: true, opacity: 0.7 })),
                resources: new THREE.Mesh(new THREE.SphereGeometry(5.02, 128, 128), new THREE.MeshBasicMaterial({ map: resourcesTexture, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }))
            };
            Object.values(overlays).forEach(o => { o.visible = false; globe.add(o); });
            
            // Set initial toggle states
            document.getElementById('heightmap-toggle').checked = true;
            overlays.coord.visible = document.getElementById('coord-toggle').checked;
            overlays.territory.visible = document.getElementById('territory-toggle').checked;
            overlays.resources.visible = document.getElementById('resources-toggle').checked;

            // Attach event listeners for map controls
            document.getElementById('rotate-toggle').addEventListener('change', (e) => { globeControls.autoRotate = e.target.checked; });
            document.getElementById('heightmap-toggle').addEventListener('change', (e) => { 
                material.displacementScale = e.target.checked ? 0.4 : 0; 
                material.needsUpdate = true; // FIX: Tell Three.js to apply the material change
            });
            document.getElementById('territory-toggle').addEventListener('change', (e) => { overlays.territory.visible = e.target.checked; });
            document.getElementById('resources-toggle').addEventListener('change', (e) => { overlays.resources.visible = e.target.checked; });
            document.getElementById('coord-toggle').addEventListener('change', (e) => { overlays.coord.visible = e.target.checked; });

            scene.add(new THREE.AmbientLight(0xffffff, 2.0));
            const pointLight = new THREE.PointLight(0xffffff, 2.5);
            pointLight.position.set(15, 15, 15);
            scene.add(pointLight);
            camera.position.z = 10;

            function animate() {
                if (!document.body.contains(canvas)) return; // Stop animation if canvas is removed
                globeControls.update();
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            }
            animate();

            // Interaction Logic
            let mouseDownPos = new THREE.Vector2();
            let isDragging = false;
            renderer.domElement.addEventListener('mousedown', (e) => { mouseDownPos.set(e.clientX, e.clientY); isDragging = false; });
            renderer.domElement.addEventListener('mousemove', (e) => { if (e.buttons > 0 && mouseDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) isDragging = true; });

            // FIX: Added robust error handling and logging to the waypoint placement logic
            renderer.domElement.addEventListener('contextmenu', async (event) => {
                event.preventDefault();
                
                if (!globe) {
                    console.error("Globe object not found for raycasting.");
                    return;
                }
                if (!c3iState.firebaseUser) {
                    console.error("Firebase user not authenticated. Cannot save waypoint.");
                    alert("Authentication error. Cannot save waypoint.");
                    return;
                }

                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObject(globe);

                if (intersects.length > 0) {
                    const intersectPoint = intersects[0].point;
                    const coords = pointToLatLon(intersectPoint, 5);
                    
                    const waypointData = {
                        name: `WP-${Date.now().toString().slice(-4)}`, 
                        position: { x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z },
                        coords, 
                        color: '#f5a623',
                        createdBy: c3iState.firebaseUser.uid
                    };

                    try {
                        await Firebase.saveWaypoint(waypointData);
                    } catch (error) {
                        console.error("Failed to save waypoint to Firebase:", error);
                        const statusTextEl = document.getElementById('status-text');
                        if(statusTextEl) statusTextEl.textContent = "Error: Could not save waypoint.";
                    }
                }
            });

            renderer.domElement.addEventListener('click', (event) => {
                if (isDragging) return;
                const rect = renderer.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(waypointsGroup.children);
                if (intersects.length > 0 && intersects[0].object.userData.id) {
                    showWaypointInfo(intersects[0].object.userData.id);
                }
            });
            
            // Listen for the custom event to re-render waypoints
            window.addEventListener('waypointsUpdated', renderWaypoints);
            renderWaypoints(); // Initial render
        },
    };
})();

export function initTacticalMap() {
    const tacticalMapCanvas = document.getElementById('tactical-map');
    const tacticalMapContainer = document.getElementById('tactical-map-container');
    if (!tacticalMapCanvas || !tacticalMapContainer) return;

    document.getElementById('status-text').textContent = 'Awaiting command. Hover over map for coordinates.';
    
    setTimeout(() => {
        globeManager.init(tacticalMapCanvas, tacticalMapContainer);
        document.getElementById('plot-waypoint-btn').addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('lat-input').value);
            const lon = parseFloat(document.getElementById('lon-input').value);
            if (isNaN(lat) || isNaN(lon)) return;
            const position = latLonToPoint(lat, lon, 5);
            Firebase.saveWaypoint({
                name: `WP-${Date.now().toString().slice(-4)}`,
                position: { x: position.x, y: position.y, z: position.z },
                coords: { lat, lon },
                color: '#f5a623',
                createdBy: c3iState.firebaseUser.uid
            });
        });
    }, 10);
}

function showWaypointInfo(waypointId) {
    const waypoint = c3iState.waypoints.find(w => w.id === waypointId);
    if (!waypoint) return;

    document.getElementById('status-text').textContent = `Selected waypoint: ${waypoint.name}`;
    document.querySelector('.sidebar-tab[data-tab="waypoints"]').click();

    const infoContent = document.getElementById('waypoint-info-content');
    infoContent.innerHTML = `
       <input id="waypoint-name-input" class="c3i-input w-full" value="${waypoint.name}">
       <div class="text-xs mt-2">
           <p>LAT: <span class="text-primary">${waypoint.coords.lat.toFixed(4)}</span></p>
           <p>LON: <span class="text-primary">${waypoint.coords.lon.toFixed(4)}</span></p>
       </div>
       <div class="mt-2"><label class="text-xs">Colour</label><input type="color" id="waypoint-color-input" class="w-full h-8" value="${waypoint.color}"></div>
       <button id="delete-waypoint-btn" class="c3i-button w-full mt-2 text-sm">Delete Waypoint</button>
    `;

    document.getElementById('waypoint-name-input').addEventListener('change', (e) => Firebase.updateWaypoint(waypointId, { name: e.target.value }));
    document.getElementById('waypoint-color-input').addEventListener('input', (e) => Firebase.updateWaypoint(waypointId, { color: e.target.value }));
    document.getElementById('delete-waypoint-btn').addEventListener('click', () => {
        Firebase.deleteWaypoint(waypointId);
        infoContent.innerHTML = `<p class="text-sm text-gray-500">Right-click map to plot or select a waypoint.</p>`;
    });
}
