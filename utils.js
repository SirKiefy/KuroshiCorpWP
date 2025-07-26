/*
  This file contains utility functions used across the application.
  - Logging actions to Firestore.
  - Coordinate conversion functions for the tactical map.
  - The main logic for initializing and controlling the tactical map.
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { c3iState, bootState } from './data.js';
import { db } from './firebase.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// A fallback app ID in case the global one isn't defined.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Logging Utility ---
/**
 * Logs an action to the 'auditLog' collection in Firestore.
 * @param {string} action - A short description of the action (e.g., 'User Login').
 * @param {string} [details=''] - Optional extra details about the action.
 */
export async function logAction(action, details = '') {
    // Ensure user is fully authenticated before logging
    if (!c3iState.currentUser || !c3iState.firebaseUser) {
        console.warn("Cannot log action, user not fully authenticated.");
        return;
    }
    const logData = {
        timestamp: serverTimestamp(),
        operator: c3iState.currentUser.codename,
        action,
        details,
        userId: c3iState.firebaseUser.uid
    };
    try {
        const firestoreDb = db || getFirestore();
        await addDoc(collection(firestoreDb, `artifacts/${appId}/public/data/auditLog`), logData);
    } catch (error) {
        console.error("Error writing to audit log:", error);
    }
}


// --- Coordinate Conversion Utilities ---
/**
 * Converts a 3D point on a sphere to latitude and longitude.
 * @param {THREE.Vector3} point - The 3D point.
 * @param {number} radius - The radius of the sphere.
 * @returns {{lat: number, lon: number}} The latitude and longitude.
 */
export function pointToLatLon(point, radius) {
    const lat = 90 - (Math.acos(point.y / radius)) * 180 / Math.PI;
    const lon = ((270 + (Math.atan2(point.x, point.z)) * 180 / Math.PI) % 360) - 180;
    return { lat, lon };
}

/**
 * Converts latitude and longitude to a 3D point on a sphere.
 * @param {number} lat - The latitude.
 * @param {number} lon - The longitude.
 * @param {number} radius - The radius of the sphere.
 * @returns {THREE.Vector3} The 3D point.
 */
export function latLonToPoint(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}


// --- Tactical Map Logic ---
/**
 * Initializes the entire tactical map system, including the 3D globe, controls, and waypoints.
 */
export function initTacticalMap() {
    let globe, waypointsGroup;
    const tacticalMapContainer = document.getElementById('tactical-map-container');
    const tacticalMapCanvas = document.getElementById('tactical-map');
    const statusTextEl = document.getElementById('status-text');

    if (!tacticalMapCanvas) return;

    const defaultStatusText = 'Awaiting command. Hover over map for coordinates.';
    statusTextEl.textContent = defaultStatusText;

    // Use a short timeout to ensure the container has been rendered and has a size.
    setTimeout(() => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const textureLoader = new THREE.TextureLoader();
        textureLoader.setCrossOrigin('anonymous');

        const mapTexture = textureLoader.load('https://i.imgur.com/CeviL2x.png');
        const territoryTexture = textureLoader.load('https://i.postimg.cc/6Q7f2MhN/territory-map-overlay.png');
        const resourcesTexture = textureLoader.load('https://i.postimg.cc/d1wz2YQG/resource-map-overlay.png');

        // Globe Scene Setup
        const globeScene = new THREE.Scene();
        const globeCamera = new THREE.PerspectiveCamera(75, tacticalMapContainer.clientWidth / tacticalMapContainer.clientHeight, 0.1, 1000);
        const globeRenderer = new THREE.WebGLRenderer({ canvas: tacticalMapCanvas, antialias: true, alpha: true });
        globeRenderer.setSize(tacticalMapContainer.clientWidth, tacticalMapContainer.clientHeight);
        bootState.threeInstances.push({ renderer: globeRenderer, camera: globeCamera, container: tacticalMapContainer });

        const geometry = new THREE.SphereGeometry(5, 128, 128);
        const globeControls = new OrbitControls(globeCamera, globeRenderer.domElement);
        Object.assign(globeControls, { enableDamping: true, dampingFactor: 0.03, screenSpacePanning: false, minDistance: 6, maxDistance: 20, autoRotate: true, autoRotateSpeed: 0.2 });

        textureLoader.load('https://i.imgur.com/vlYiAdX.png', (heightMapTexture) => {
            heightMapTexture.wrapS = THREE.RepeatWrapping;
            heightMapTexture.wrapT = THREE.RepeatWrapping;
            const material = new THREE.MeshPhongMaterial({ map: mapTexture, shininess: 20, specular: 0x333333, bumpMap: heightMapTexture, bumpScale: 0.15, displacementMap: heightMapTexture, displacementScale: 0 });
            
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

            // Attach event listeners for map controls
            document.getElementById('rotate-toggle').addEventListener('change', (e) => { globeControls.autoRotate = e.target.checked; });
            document.getElementById('heightmap-toggle').addEventListener('change', (e) => { 
                if (globe && globe.material) {
                    globe.material.displacementScale = e.target.checked ? 0.4 : 0;
                    globe.material.needsUpdate = true;
                }
            });
            document.getElementById('territory-toggle').addEventListener('change', (e) => { territoryOverlay.visible = e.target.checked; });
            document.getElementById('resources-toggle').addEventListener('change', (e) => { resourcesOverlay.visible = e.target.checked; });
            document.getElementById('coord-toggle').addEventListener('change', (e) => { coordinateGrid.visible = e.target.checked; });
            
            // Initial state sync for controls
            document.getElementById('heightmap-toggle').dispatchEvent(new Event('change'));
            
            // Initial render of waypoints
            renderAllWaypoints();
        });

        // Common Scene Elements
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

        // Waypoint Logic
        function renderAllWaypoints() {
            if (waypointsGroup) renderWaypointsOnGlobe();
        }

        function renderWaypointsOnGlobe() {
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

        async function plotNewWaypoint(position, coords) {
            const newWaypoint = { 
                name: `WP-${Date.now().toString().slice(-4)}`, 
                position: { x: position.x, y: position.y, z: position.z },
                coords, 
                color: '#f5a623',
                createdBy: c3iState.firebaseUser.uid,
                timestamp: serverTimestamp()
            };
            try {
                const firestoreDb = db || getFirestore();
                const waypointsCollection = collection(firestoreDb, `artifacts/${appId}/public/data/waypoints`);
                const docRef = await addDoc(waypointsCollection, newWaypoint);
                logAction('Waypoint Plotted', `[${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}] ID: ${docRef.id}`);
            } catch (e) {
                console.error("Error adding waypoint: ", e);
            }
        }

        function showWaypointInfo(waypointId) {
            const waypoint = c3iState.waypoints.find(w => w.id === waypointId);
            if (!waypoint) return;

            statusTextEl.textContent = `Selected waypoint: ${waypoint.name}`;
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

            const firestoreDb = db || getFirestore();
            const waypointDocRef = doc(firestoreDb, `artifacts/${appId}/public/data/waypoints`, waypointId);

            document.getElementById('waypoint-name-input').addEventListener('change', async (e) => { 
                await updateDoc(waypointDocRef, { name: e.target.value });
                logAction('Waypoint Updated', `Name changed for ID: ${waypointId}`);
            });
            document.getElementById('waypoint-color-input').addEventListener('input', async (e) => { 
                await updateDoc(waypointDocRef, { color: e.target.value });
                logAction('Waypoint Updated', `Color changed for ID: ${waypointId}`);
            });
            document.getElementById('delete-waypoint-btn').addEventListener('click', async () => {
                await deleteDoc(waypointDocRef);
                logAction('Waypoint Deleted', `ID: ${waypointId}`);
                infoContent.innerHTML = `<p class="text-sm text-gray-500">Click a waypoint on the map.</p>`;
            });
        }

        // Event Listeners for map interaction
        let mouseDownPos = new THREE.Vector2();
        let isDragging = false;

        function setupDragCheck(element) {
            element.addEventListener('mousedown', (event) => {
                mouseDownPos.set(event.clientX, event.clientY);
                isDragging = false;
            });
            element.addEventListener('mousemove', (event) => {
                if (event.buttons === 0) return;
                const currentPos = new THREE.Vector2(event.clientX, event.clientY);
                if (mouseDownPos.distanceTo(currentPos) > 5) {
                    isDragging = true;
                }
            });
        }

        setupDragCheck(globeRenderer.domElement);

        globeRenderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if (!globe) return;
            const rect = globeRenderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, globeCamera);
            const intersects = raycaster.intersectObject(globe);
            if (intersects.length > 0) {
                const intersectPoint = intersects[0].point;
                const coords = pointToLatLon(intersectPoint, 5);
                plotNewWaypoint(intersectPoint, coords);
            }
        });

        globeRenderer.domElement.addEventListener('click', (event) => {
            if(isDragging || !waypointsGroup) return;
            const rect = globeRenderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, globeCamera);
            const intersects = raycaster.intersectObjects(waypointsGroup.children);
            if (intersects.length > 0) {
                const waypointId = intersects[0].object.userData.id;
                if (waypointId) showWaypointInfo(waypointId);
            }
        });

        document.getElementById('plot-waypoint-btn').addEventListener('click', () => {
            const lat = parseFloat(document.getElementById('lat-input').value);
            const lon = parseFloat(document.getElementById('lon-input').value);
            if (isNaN(lat) || isNaN(lon) || !globe) return;
            const position = latLonToPoint(lat, lon, 5);
            plotNewWaypoint(position, {lat, lon});
        });

        window.addEventListener('waypointsUpdated', renderAllWaypoints);
    }, 10);
}

