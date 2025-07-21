document.addEventListener('DOMContentLoaded', function () {
    // --- Application State ---
    const state = {
        clearanceLevel: 7,
        correctPassword: "I9j4vEW><2p£5vQGQDtVs",
        charts: {},
        waypoints: [],
        textures: {},
        isGlobeRotating: true,
        audioCtx: null,
        soundEnabled: false,
        logonAnimation: null,
        loadedTabs: new Set(),
        activeIntelSubTab: 'profile',
        three: {
            globe: null,
            renderer: null,
            camera: null,
            scene: null,
            waypointObjects: new THREE.Group()
        }
    };

    // --- Data ---
    const intelData = {
        'fssa': { name: 'FSSA (Federated Sovereign State of Armkava)', threat: 'Hostile', location: 'Unknown', hostility: 'Active', ground_strength: 'Equal', air_strength: 'Weaker', naval_strength: 'Equal', report: 'A hostile state actor.', hierarchy: { Leader: 'Day (valcry97)', Members: ['jake from statefarm (thisscreenisnuts)'] }, assets: ['Standard military hardware.'] },
        'bss': { name: 'BSS (Black Sea Syndicate)', threat: 'Neutral', location: 'Black Sea', hostility: 'Opportunistic', ground_strength: 'Weaker', air_strength: 'Obsolete', naval_strength: 'Superior', report: 'A neutral syndicate operating in the Black Sea region.', hierarchy: { Leader: 'Quasitedjr.TTV', Members: ['Bizmark7 (Admin)', 'dloglo1980', 'Snowwolf (snowwolf1512)'] }, assets: ['Naval assets, smuggling routes.'] },
        'nim': { name: 'NIM (Nordman Industries & Manufacturing)', threat: 'Neutral', location: 'Northern Territories', hostility: 'Aggressive', ground_strength: 'Superior', air_strength: 'Equal', naval_strength: 'Weaker', report: 'A neutral but aggressive industrial corporation. Hostility is advised in interactions.', hierarchy: { Leader: 'Fred (fredaibot, Admin/Overseer)', Members: ['KesseL (kessel5657)', 'Kokonoe (kokonoe2280)', 'NorthWind (north.wind772)'] }, assets: ['Advanced manufacturing facilities, prototype weaponry.'] },
        'tt': { name: 'T-T (Terra Titans)', threat: 'Avoid', location: 'Global', hostility: 'Dominant', ground_strength: 'Overwhelming', air_strength: 'Overwhelming', naval_strength: 'Overwhelming', report: 'A powerful faction that should be avoided. Holds significant influence.', hierarchy: { Leader: 'DarkXeRoX (darkxerox, Server Owner)', Members: ['K4rma (k4rmaletracteur)', 'Rudi/Noah (ruaidhri.noah, Admin)', 'Delfred353', 'PossibleHacker', 'Gifted Lion', 'Aragath', 'Tellyhead'] }, assets: ['High-tier military assets, server administrative control.'] },
        'bbc': { name: 'BBC (Bean Bois Corporation)', threat: 'Unknown', location: 'Unknown', hostility: 'Unknown', ground_strength: 'Unknown', air_strength: 'Unknown', naval_strength: 'Unknown', report: 'An organization with unknown motives and capabilities.', hierarchy: { Leader: 'syreX (bessechurger)' }, assets: ['Unknown.'] },
        'coum': { name: 'C0UM (Confederation Of Uniform Members)', threat: 'Unknown', location: 'Unknown', hostility: 'Unknown', ground_strength: 'Unknown', air_strength: 'Unknown', naval_strength: 'Unknown', report: 'A confederation with unknown motives.', hierarchy: { Leader: 'Agent Brick (thunderbord)' }, assets: ['Unknown.'] },
        'ocf': { name: 'OCF (Oceania Coalition Force)', threat: 'Neutral', location: 'Oceania', hostility: 'Passive', ground_strength: 'Equal', air_strength: 'Equal', naval_strength: 'Superior', report: 'A non-hostile coalition with claims of passive behavior.', hierarchy: { Leader: 'TheJetNinja' }, assets: ['Regional defensive forces.'] }
    };
    const armoryData = { 'analysis': { name: 'System Analysis', type: 'Data' }, 'naval': { name: 'Naval Assets', type: 'Category', subcategories: { 'ships': 'Ships', 'structures': 'Structures' } }, 'air': { name: 'Aircraft', type: 'Category', subcategories: { 'fighters': 'Fighters', 'bombers': 'Bombers' } }, 'ground': { name: 'Ground Vehicles', type: 'Category' } };
    const codexData = { 'general': { name: 'General Server Rules' }, 'warfare': { name: 'Rules of Engagement' }, 'factions': { name: 'Faction Regulations' }, 'structures': { name: 'Structure Regulations' }, 'ships': { name: 'Ship Classifications' }, 'aircraft': { name: 'Aircraft Classifications' }, 'vehicles': { name: 'Ground Vehicle Classifications' }, 'resources': { name: 'Resource Acquisition' } };

    // --- Utility Functions ---
    const sleep = ms => new Promise(res => setTimeout(res, ms));

    // --- Audio ---
    function playSound(type) {
        if (!state.soundEnabled || !state.audioCtx) return;
        const oscillator = state.audioCtx.createOscillator();
        const gainNode = state.audioCtx.createGain();
        gainNode.connect(state.audioCtx.destination);
        oscillator.connect(gainNode);

        switch (type) {
            case 'type':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, state.audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, state.audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.00001, state.audioCtx.currentTime + 0.1);
                break;
            case 'success':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, state.audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.2, state.audioCtx.currentTime);
                oscillator.frequency.setValueAtTime(1046.50, state.audioCtx.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.00001, state.audioCtx.currentTime + 0.2);
                break;
            case 'final':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(220, state.audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.3, state.audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 1.0);
                break;
        }
        oscillator.start(state.audioCtx.currentTime);
        oscillator.stop(state.audioCtx.currentTime + 1.0);
    }
    
    // --- Logon Sequence ---
    async function runLogonSequence() {
        const logonScreen = document.getElementById('logon-screen');
        logonScreen.classList.remove('hidden');
        const textContainer = document.getElementById('logon-text-container');
        
        initLogonAnimation();

        const typeLine = async (text, color = 'text-white', speed = 25) => {
            const p = document.createElement('p');
            p.className = `logon-line ${color}`;
            textContainer.appendChild(p);
            p.innerHTML = '_';
            await typeWriter(p, text, speed);
        };

        const typeWriter = (element, text, speed) => {
            return new Promise(resolve => {
                let i = 0;
                const glitchChars = '█▓▒░';
                element.classList.add('typing');
                const typeInterval = setInterval(() => {
                    if (i < text.length) {
                        let currentText = text.substring(0, i + 1);
                        if (Math.random() < 0.2) {
                            currentText = text.substring(0, i) + glitchChars.charAt(Math.floor(Math.random() * glitchChars.length));
                        }
                        element.innerHTML = currentText + '_';
                        if (i % 3 === 0) playSound('type');
                        i++;
                    } else {
                        clearInterval(typeInterval);
                        element.classList.remove('typing');
                        element.innerHTML = text;
                        resolve();
                    }
                }, speed);
            });
        };
        
        await typeLine("AUTHENTICATION SUCCESSFUL. DECRYPTING QUANTUM-LOCKED CREDENTIALS...", "text-accent");
        await sleep(200);
        await typeLine("INITIATING HELIOS CORE BOOT SEQUENCE...");
        await sleep(500);

        const checks = [
            "CALIBRATING POWER CORE STABILITY...",
            "VERIFYING NEURAL INTERFACE SYNC...",
            "ESTABLISHING TACHYON UPLINK...",
            "DECOMPRESSING TACTICAL OVERLAYS...",
            "LOADING COGNITIVE MODELS...",
            "CHECKING SYSTEM INTEGRITY..."
        ];

        for (const check of checks) {
            await typeLine(check, 'text-white', 15);
            await sleep(100);
            const lastLine = textContainer.lastChild;
            lastLine.innerHTML += ` <span class="text-success">OK</span>`;
            playSound('success');
            await sleep(250);
        }
        
        await sleep(500);
        await typeLine("ALL SYSTEMS NOMINAL. ENGAGING STRATEGIC INTERFACE.", "text-success");
        await sleep(300);
        await typeLine("ACCESS GRANTED. WELCOME, OPERATOR.", "text-primary glow text-2xl font-orbitron");
        playSound('final');
        
        await sleep(2000);

        logonScreen.classList.add('hidden');
        cancelAnimationFrame(state.logonAnimation);
        initializeMainUI();
    }

    function initLogonAnimation() {
        const canvas = document.getElementById('logon-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const sphereGeometry = new THREE.IcosahedronGeometry(1.5, 4);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0x333333,
            shininess: 50,
            specular: 0x111111,
            wireframe: true,
            opacity: 0.5,
            transparent: true
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);

        const particlesGeometry = new THREE.BufferGeometry;
        const particlesCnt = 10000;
        const posArray = new Float32Array(particlesCnt * 3);
        for(let i = 0; i < particlesCnt * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 20;
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({ size: 0.008, color: 0xffffff, transparent: true, opacity: 0.5 });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);
        
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));
        camera.position.z = 5;

        const animate = (time) => {
            time *= 0.0005; 
            sphere.rotation.x = time;
            sphere.rotation.y = time;
            particlesMesh.rotation.y = -time * 0.2;
            renderer.render(scene, camera);
            state.logonAnimation = requestAnimationFrame(animate);
        };
        
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate(0);
    }
    
    // --- UI Initializers ---
    function initializeMainUI() {
        const mainInterface = document.getElementById('main-interface');
        mainInterface.classList.remove('hidden');
        
        buildTabContent('dashboard');
        state.loadedTabs.add('dashboard');
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            location.reload();
        });

        document.getElementById('main-nav').addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (!navItem || !navItem.dataset.tab) return;
            
            const tabId = navItem.dataset.tab;
            
            document.querySelectorAll('#main-nav .nav-item').forEach(b => b.classList.remove('active'));
            navItem.classList.add('active');

            if (!state.loadedTabs.has(tabId)) {
                buildTabContent(tabId);
                state.loadedTabs.add(tabId);
            }

            document.querySelectorAll('#content-area > .tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-content`).classList.add('active');
        });

        const passwordForm = document.getElementById('password-form');
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!state.audioCtx) {
                state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const passwordInput = document.getElementById('password-input');
            if (passwordInput.value === state.correctPassword) {
                document.getElementById('password-screen').classList.add('hidden');
                runLogonSequence();
            } else {
                const passwordError = document.getElementById('password-error');
                passwordError.textContent = "ACCESS DENIED";
                passwordInput.value = "";
                setTimeout(() => passwordError.textContent = "\u00A0", 2000);
            }
        });
    }

    function buildTabContent(tabId) {
        const container = document.getElementById(`${tabId}-content`);
        const template = document.getElementById(`template-${tabId}`);
        if (!container || !template) return;

        const content = template.content.cloneNode(true);
        container.innerHTML = ''; // Clear previous content if any
        container.appendChild(content);

        switch (tabId) {
            case 'dashboard': initDashboard(); break;
            case 'armory': initArmory(); break;
            case 'intel': initIntel(); break;
            case 'codex': initCodex(); break;
            case 'settings': initSettings(); break;
        }
    }

    // --- Dashboard ---
    function initDashboard() {
        document.getElementById('clearance-level-display').textContent = `LEVEL ${state.clearanceLevel}`;
        setupGlobe();
        setupDashboardControls();
        setupTerminal();
    }

    function setupGlobe() {
        const container = document.getElementById('dashboard-globe');
        state.three.scene = new THREE.Scene();
        state.three.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        state.three.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        state.three.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(state.three.renderer.domElement);

        const textureLoader = new THREE.TextureLoader();
        state.textures.map = textureLoader.load('https://i.imgur.com/FwrFLYh.jpeg');
        state.textures.heightMap = textureLoader.load('https://i.imgur.com/w5H23UT.jpeg');

        const sphereGeometry = new THREE.SphereGeometry(2.5, 64, 64);
        const sphereMaterial = new THREE.MeshPhongMaterial({ map: state.textures.map, bumpMap: state.textures.heightMap, bumpScale: 0.05 });
        state.three.globe = new THREE.Mesh(sphereGeometry, sphereMaterial);
        state.three.scene.add(state.three.globe);
        state.three.globe.add(state.three.waypointObjects);
        
        state.three.scene.add(new THREE.AmbientLight(0xcccccc, 1.5));
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 3, 5);
        state.three.scene.add(light);
        
        state.three.camera.position.z = 5;

        const animate = () => {
            requestAnimationFrame(animate);
            if(state.isGlobeRotating) state.three.globe.rotation.y += 0.0005;
            state.three.renderer.render(state.three.scene, state.three.camera);
            if (document.getElementById('plans-toggle')?.checked) {
                drawWarPlans();
            }
        };
        
        window.addEventListener('resize', onWindowResize);
        onWindowResize();
        animate();
    }

    function setupDashboardControls() {
        const container = document.getElementById('dashboard-globe');
        const mapContainer = document.getElementById('dashboard-map');
        const sidebar = document.getElementById('dashboard-sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        
        let isDragging = false, previousMousePosition = { x: 0, y: 0 };
        container.addEventListener('mousedown', e => { 
            if (e.button === 0) { isDragging = true; state.isGlobeRotating = false; previousMousePosition = { x: e.clientX, y: e.clientY }; }
        });
        container.addEventListener('mouseup', () => { 
            isDragging = false; 
            if(document.getElementById('rotate-toggle').checked) { setTimeout(() => { state.isGlobeRotating = true; }, 2000); }
        });
        container.addEventListener('mousemove', e => {
            if (!isDragging) return;
            const deltaMove = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
            state.three.globe.rotation.y += deltaMove.x * 0.005;
            state.three.globe.rotation.x += deltaMove.y * 0.005;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        const raycaster = new THREE.Raycaster();
        container.addEventListener('click', (event) => {
            const rect = state.three.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(mouse, state.three.camera);
            const intersects = raycaster.intersectObjects(state.three.waypointObjects.children);
            if (intersects.length > 0) showWaypointInfo(intersects[0].object.waypointData);
        });

        container.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const rect = state.three.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(mouse, state.three.camera);
            const intersects = raycaster.intersectObject(state.three.globe);
            if (intersects.length > 0) {
                const localPoint = state.three.globe.worldToLocal(intersects[0].point.clone());
                state.waypoints.push({ id: `WP-${Date.now()}`, position: localPoint, timestamp: new Date().toUTCString() });
                renderWaypoints();
            }
        });

        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            sidebarToggle.innerHTML = sidebar.classList.contains('collapsed') ? '&gt;' : '&lt;';
            setTimeout(onWindowResize, 300);
        });

        document.getElementById('globe-view-toggle').addEventListener('change', (e) => {
            container.style.display = e.target.checked ? 'none' : 'block';
            mapContainer.style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('heightmap-toggle').addEventListener('change', (e) => {
            state.three.globe.material.map = e.target.checked ? state.textures.heightMap : state.textures.map;
            state.three.globe.material.needsUpdate = true;
        });
        document.getElementById('waypoints-toggle').addEventListener('change', (e) => { state.three.waypointObjects.visible = e.target.checked; });
        document.getElementById('plans-toggle').addEventListener('change', (e) => { document.getElementById('war-plan-overlay').style.display = e.target.checked ? 'block' : 'none'; });
        document.getElementById('rotate-toggle').addEventListener('change', (e) => { state.isGlobeRotating = e.target.checked; });
        document.getElementById('clear-waypoints-btn').addEventListener('click', () => {
            state.waypoints = [];
            renderWaypoints();
            document.getElementById('waypoint-info-widget').classList.add('hidden');
        });
    }
    
    function setupTerminal() {
        const terminalLog = document.getElementById('terminal-log');
        const terminalInput = document.getElementById('terminal-input');
        const commands = {
            help: "Available commands: help, scan, status, clear",
            scan: "Scanning sector... 3 anomalies detected.",
            status: "All systems nominal. Threat level: MODERATE.",
            clear: () => { terminalLog.innerHTML = ''; return ''; }
        };
        terminalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value.trim().toLowerCase();
                if (command) {
                    terminalLog.innerHTML += `<p>> ${command}</p>`;
                    const response = commands[command];
                    if (response) {
                        const result = typeof response === 'function' ? response() : response;
                        if(result) terminalLog.innerHTML += `<p>${result}</p>`;
                    } else {
                        terminalLog.innerHTML += `<p class="text-error">Error: Command not found: ${command}</p>`;
                    }
                    terminalLog.scrollTop = terminalLog.scrollHeight;
                }
                terminalInput.value = '';
            }
        });
    }

    function onWindowResize() {
        const mainArea = document.getElementById('dashboard-main');
        if (!mainArea || !state.three.camera) return;
        const newWidth = mainArea.clientWidth;
        const newHeight = mainArea.clientHeight;
        state.three.camera.aspect = newWidth / newHeight;
        state.three.camera.updateProjectionMatrix();
        state.three.renderer.setSize(newWidth, newHeight);
    }
    
    function renderWaypoints() {
        while(state.three.waypointObjects.children.length > 0){ state.three.waypointObjects.remove(state.three.waypointObjects.children[0]); }
        state.waypoints.forEach(wp => {
            const marker = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            marker.position.copy(wp.position);
            marker.lookAt(new THREE.Vector3(0, 0, 0));
            marker.rotateX(Math.PI / 2);
            marker.waypointData = wp; 
            state.three.waypointObjects.add(marker);
        });
        drawWarPlans();
    }

    function showWaypointInfo(waypointData) {
        const panel = document.getElementById('waypoint-info-widget');
        const content = document.getElementById('waypoint-info-content');
        const { id, timestamp, position } = waypointData;
        content.innerHTML = `<p><strong>ID:</strong> <span class="text-accent">${id}</span></p><p><strong>Timestamp:</strong> ${timestamp}</p><p><strong>Coordinates (Local):</strong></p><ul class="list-disc pl-5 text-sm"><li>X: ${position.x.toFixed(4)}</li><li>Y: ${position.y.toFixed(4)}</li><li>Z: ${position.z.toFixed(4)}</li></ul>`;
        panel.classList.remove('hidden');
    }

    function toScreenPosition(vec3, camera) {
        const vector = new THREE.Vector3();
        const mainArea = document.getElementById('dashboard-main');
        state.three.globe.localToWorld(vector.copy(vec3));
        const widthHalf = mainArea.clientWidth / 2;
        const heightHalf = mainArea.clientHeight / 2;
        vector.project(camera);
        return { x: (vector.x * widthHalf) + widthHalf, y: -(vector.y * heightHalf) + heightHalf };
    }

    function drawWarPlans() {
        const overlay = document.getElementById('war-plan-overlay');
        overlay.innerHTML = '';
        if (state.waypoints.length < 2) return;
        let pathData = "";
        for (let i = 0; i < state.waypoints.length; i++) {
            const point = toScreenPosition(state.waypoints[i].position, state.three.camera);
            pathData += `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y} `;
        }
        overlay.innerHTML = `<path d="${pathData}" stroke="var(--accent-color)" stroke-width="2" fill="none" stroke-dasharray="5, 5" />`;
    }
    
    // --- Database Tabs (Armory, Intel, Codex) ---
    function setupSearchableList(inputId, listId, data, displayFunction) {
        const searchInput = document.getElementById(inputId);
        const listContainer = document.getElementById(listId);
        const renderList = (filter = '') => {
            const lowerFilter = filter.toLowerCase();
            const filteredKeys = Object.keys(data).filter(key => JSON.stringify(data[key]).toLowerCase().includes(lowerFilter));
            listContainer.innerHTML = filteredKeys.map(key => `<div class="db-list-item" data-id="${key}">${data[key].name}</div>`).join('');
        };
        listContainer.addEventListener('click', e => {
            if (e.target.matches('.db-list-item')) {
                listContainer.querySelectorAll('.db-list-item').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                displayFunction(e.target.dataset.id);
            }
        });
        searchInput.addEventListener('keyup', () => renderList(searchInput.value));
        renderList();
    }

    function initArmory() {
        setupSearchableList('armory-search', 'asset-list', armoryData, displayAssetDetails);
    }
    function displayAssetDetails(assetId) {
        const detailView = document.getElementById('asset-detail-view');
        if (assetId === 'analysis') {
            detailView.innerHTML = `<h2 class="font-orbitron text-2xl text-primary mb-4">CIWS Performance Analysis</h2><div style="position: relative; height: 60vh;"><canvas id="ciwsChart"></canvas></div>`;
            renderCiwsChart();
        } else {
             detailView.innerHTML = `<div class="text-center text-gray-500 h-full flex items-center justify-center">Select a specific asset category to view details.</div>`;
        }
    }

    function initIntel() {
        setupSearchableList('intel-search', 'faction-list', intelData, (id) => displayFactionDetails(intelData[id]));
        
        document.getElementById('faction-detail-view').addEventListener('click', e => {
            if (e.target.matches('.db-tab')) {
                const container = e.target.closest('.db-content');
                const paneId = e.target.dataset.pane;
                state.activeIntelSubTab = paneId; 
                container.querySelectorAll('.db-tab').forEach(tab => tab.classList.remove('active'));
                e.target.classList.add('active');
                container.querySelectorAll('.db-tab-pane').forEach(pane => pane.classList.remove('active'));
                container.querySelector(`#${paneId}`).classList.add('active');
            }
        });
    }

    function getStrengthClass(strength) { return `strength-${(strength || 'unknown').toLowerCase()}`; }
    function displayFactionDetails(faction) {
        const detailView = document.getElementById('faction-detail-view');
        detailView.innerHTML = `
            <h2 class="font-orbitron text-2xl text-primary mb-2">${faction.name}</h2>
            <p class="mb-4">Threat Level: <span class="${getStrengthClass(faction.threat)}">${faction.threat}</span> // Hostility: <span class="text-accent">${faction.hostility}</span></p>
            <div class="db-tabs">
                <span class="db-tab" data-pane="profile">Profile</span>
                <span class="db-tab" data-pane="strength">Strength Assessment</span>
                <span class="db-tab" data-pane="hierarchy">Hierarchy</span>
            </div>
            <div id="profile" class="db-tab-pane"><p>${faction.report}</p></div>
            <div id="strength" class="db-tab-pane"><table class="spec-table"><tr><td>Naval Strength</td><td class="${getStrengthClass(faction.naval_strength)}">${faction.naval_strength}</td></tr><tr><td>Air Strength</td><td class="${getStrengthClass(faction.air_strength)}">${faction.air_strength}</td></tr><tr><td>Ground Strength</td><td class="${getStrengthClass(faction.ground_strength)}">${faction.ground_strength}</td></tr><tr><td>Known Location</td><td>${faction.location}</td></tr></table></div>
            <div id="hierarchy" class="db-tab-pane"><table class="spec-table">${Object.entries(faction.hierarchy).map(([key, value]) => `<tr><td>${key}</td><td>${Array.isArray(value) ? value.join('<br>') : value}</td></tr>`).join('')}</table></div>`;

        const activeTab = detailView.querySelector(`.db-tab[data-pane="${state.activeIntelSubTab}"]`);
        if (activeTab) activeTab.classList.add('active');
        const activePane = detailView.querySelector(`.db-tab-pane#${state.activeIntelSubTab}`);
        if (activePane) activePane.classList.add('active');
    }

    function initCodex() {
        setupSearchableList('codex-search', 'codex-list', codexData, displayCodexDetails);
    }
    function displayCodexDetails(docId) {
        const detailView = document.getElementById('codex-detail-view');
        let content = '';
        switch(docId) { /* Cases for codex content remain the same */
            case 'general': content = `<h3>Naval Server Rules</h3><p>All grids are to remain within the planet atmosphere. Naval Warships and Structures are large grids only. Aircraft and ground vehicles are small grids only. Each Grid requires the correct GridCore for that class. Structure GridCores must be above voxels and water.</p><h3>Block limits</h3><p>GridCores will automatically limit the amount of certain blocks. All ships can fit a max of 2 vents. O2 GENERATORS ARE ONLY ALLOWED ON BASES AND SMALL GRIDS TO PRODUCE FUEL AND ONLY 1 PER GRID IS ALLOWED. Ships will be able to fit 2 navigation computer blocks & 3 rudder blocks. ONLY BASES CAN HAVE A MAXIMUM OF 1 FUEL BLOCK REFINERY. SHIPS MAY HAVE 1 EMERGENCY FUEL Converter.</p><h3>Jet Pack Usage</h3><p>JETPACKS ARE ONLY TO BE USED AROUND FRIENDLY GRIDS FOR LOGISTICAL PURPOSES. DO NOT FLY AROUND ENEMY GRIDS. THEY WILL ONLY OPERATE WITHIN A 1KM RANGE OF A FRIENDLY GRIDCORE.</p>`; break;
            case 'warfare': content = `<h3>Declaring War</h3><p>FACTIONS WHO WISH TO DECLARE WAR ON ANOTHER FACTION MUST DECLARE THEIR INTENTIONS IN DIPLOMACY 48HRS PRIOR TO INITIATING A SIEGE. AN ADMIN MUST APPROVE THE WAR. WAR DECLARATIONS MUST BE FOR A REASON. ATTACKERS MUST DEFINE A TARGET FOR THE WAR. AFTER A WAR IS COMPLETED THE DECLARING FACTION IS ON A COOLDOWN OF 7 DAYS BEFORE THEY CAN DECLARE ANOTHER WAR.</p><h3>Siege</h3><p>Once war is declared and an admin approves it you may start sieging 48 hrs after the declaration message. Efforts should be made to make sure both sides are able to be on for the fight. Attackers must initiate the siege by moving within 15km of the Structure they wish to attack. Once the siege is initiated Defenders have 10 minutes to push the attackers out of the Territory Capture zone. Attackers have 2 hours to siege the base. To successfully siege and capture the territory the Attackers must destroy the Defenders Base Grid Core. If the Defenders survive for 2 hours their SZ will be restored. Wars last for 5 days. Defenders can attack the Attackers FOB to end the war early.</p>`; break;
            case 'factions': content = `<h3>Factions</h3><p>A faction is a group of players working together towards a common goal. Only have grids out in the world that are actively being used. In peace time factions do not need to have their fleets on display. Exploiting factions to increase fleet cap will result your whole faction and its members getting banned.</p><h3>Ship and Structure limits</h3><table class="spec-table"><tr><th>Structure Type</th><th>Amount</th><th>Ship Class</th><th>Amount</th></tr><tr><td>Main Base</td><td>1</td><td>Corvette</td><td>4</td></tr><tr><td>Fort</td><td>5</td><td>Frigate</td><td>3</td></tr><tr><td>Destroyer</td><td>3</td><td>Cruiser</td><td>2</td></tr><tr><td></td><td></td><td>Submarine</td><td>1</td></tr><tr><td></td><td></td><td>Logistics Ship</td><td>2</td></tr><tr><td></td><td></td><td>Battleship</td><td>1</td></tr><tr><td></td><td></td><td>Aircraft Carrier</td><td>1</td></tr><tr><td><strong>Total Structures</strong></td><td><strong>16</strong></td><td><strong>Max Fleet Size</strong></td><td><strong>18</strong></td></tr></table>`; break;
            case 'structures': content = `<h3>Structures</h3><p>We have 3 types of structures on the server: Main Base, Fort, and Outpost. Each structure much have the correct GridCore installed.</p><table class="spec-table"><tr><th>Type</th><th>Block Count</th><th>Defensive Points</th><th>Offensive Points</th></tr><tr><td>Main Base</td><td>7500</td><td>50</td><td>80</td></tr><tr><td>Fort</td><td>5000</td><td>35</td><td>50</td></tr><tr><td>Outpost</td><td>750</td><td>20</td><td>15</td></tr></table><h3>Resource Cores</h3><p>Every structure can install a resource core to generate passive resources. Only 1 is permitted per structure.</p><h3>Structure limitations</h3><p>Structures must be placed a minimum distance of 15 km apart.</p>`; break;
            case 'ships': content = `<h3>Ship Classes</h3><p>Ships are divided into multiple classes which are grouped in class groups. Each class has a mass limit, this is based on the dry weight of a ship. Max ship size is 2800 square blocks (length x width).</p><table class="spec-table"><tr><th>Class Name</th><th>Max Dry Mass</th><th>Offensive Points</th><th>Defensive Points</th></tr><tr><td>Corvette</td><td>1,000 T</td><td>20</td><td>10</td></tr><tr><td>Frigate</td><td>2,500 T</td><td>35</td><td>20</td></tr><tr><td>Submarine</td><td>3,500 T</td><td>12</td><td>4</td></tr><tr><td>Destroyer</td><td>5,500 T</td><td>45</td><td>30</td></tr><tr><td>Cruiser</td><td>10,000 T</td><td>60</td><td>35</td></tr><tr><td>Battleship</td><td>20,000 T</td><td>80</td><td>40</td></tr><tr><td>Carrier</td><td>14,000 T</td><td>16</td><td>30</td></tr><tr><td>Logistics Ship</td><td>2,250 T</td><td>N/A</td><td>12</td></tr></table>`; break;
            case 'aircraft': content = `<h3>Aircraft</h3><p>Aircraft are divided into several classes. Thrust must always point in the same direction. Only use propulsion from designated aircraft mods. Planes cannot exceed 3000 blocks.</p><table class="spec-table"><tr><th>Class Name</th><th>Min Weight (T)</th><th>Max Weight (T)</th><th>Max Thrust (T)</th></tr><tr><td>Fighter</td><td>10</td><td>20</td><td>30</td></tr><tr><td>Strike Fighter</td><td>20</td><td>32.5</td><td>60</td></tr><tr><td>Bomber</td><td>32.5</td><td>N/A</td><td>80</td></tr><tr><td>Strategic Bomber</td><td>45</td><td>N/A</td><td>100</td></tr><tr><td>Logistics / Radar</td><td>20</td><td>N/A</td><td>160</td></tr><tr><td>Helicopter</td><td>N/A</td><td>N/A</td><td>20</td></tr></table>`; break;
            case 'vehicles': content = `<h3>Ground Vehicles</h3><p>Vehicles are defined into 3 classes.</p><table class="spec-table"><tr><th>Class</th><th>Max Weight</th><th>Speed</th><th>Hardpoints</th></tr><tr><td>Main Battle Tank</td><td>80T</td><td>80KM/H</td><td>8</td></tr><tr><td>Anti Aircraft Vehicle</td><td>60T</td><td>80KM/H</td><td>8</td></tr><tr><td>Artillery</td><td>50T</td><td>50KM/H</td><td>8</td></tr></table>`; break;
            case 'resources': content = `<h3>Resource Acquisition</h3><h3>Common Ores (Iron, Silicon, Nickel)</h3><p>Mined with Resource Claim Pylons. They do not deplete the area.</p><h3>Uncommon Ores (Cobalt, Magnesium, Silver, Gold)</h3><p>Found in Resource Zones in water. These zones require Fuel Blocks and will deplete over time.</p><h3>Rare Ores (Platinum, Uranium)</h3><p>Found in random NPC bunkers or King of the Hill style events.</p>`; break;
            default: content = `<p>Documentation for ${codexData[docId].name} is not available.</p>`;
        }
        detailView.innerHTML = `<div class="codex-content">${content}</div>`;
    }
    
    // --- Settings and Theming ---
    function initSettings() {
        const themeSelector = document.getElementById('theme-selector');
        const savedTheme = localStorage.getItem('heliosTheme') || 'theme-helios';
        applyTheme(savedTheme);
        themeSelector.addEventListener('click', (e) => {
            if(e.target.classList.contains('theme-btn')) applyTheme(e.target.dataset.theme);
        });
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.checked = state.soundEnabled;
        soundToggle.addEventListener('change', (e) => {
            state.soundEnabled = e.target.checked;
            if (state.soundEnabled && !state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        });
    }
    function applyTheme(theme) {
        document.body.className = theme;
        localStorage.setItem('heliosTheme', theme);
        if(document.getElementById('theme-selector')) {
            document.querySelectorAll('#theme-selector .theme-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === theme);
            });
        }
        setTimeout(() => { if (state.charts.ciws) renderCiwsChart(); }, 0);
    }
    
    // --- Charting ---
    function renderCiwsChart() {
        const canvas = document.getElementById('ciwsChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const weaponData = {
            'P-270': [62.5, 37.5, 25.0, 0],
            'P-1000': [53.12, 34.38, 15.62, 0]
        };
        if (state.charts.ciws) state.charts.ciws.destroy();
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--rgb-primary-color').trim();
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--rgb-accent-color').trim();
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

        state.charts.ciws = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Phalanx', 'Goalkeeper', 'AK-630', 'AK-630-2'],
                datasets: [{
                    label: 'P-270 Penetration Success Rate (%)',
                    data: weaponData['P-270'],
                    backgroundColor: `rgba(${primaryColor}, 0.2)`,
                    borderColor: `rgba(${primaryColor}, 1)`,
                    pointBackgroundColor: `rgba(${primaryColor}, 1)`,
                }, {
                    label: 'P-1000 Penetration Success Rate (%)',
                    data: weaponData['P-1000'],
                    backgroundColor: `rgba(${accentColor}, 0.2)`,
                    borderColor: `rgba(${accentColor}, 1)`,
                    pointBackgroundColor: `rgba(${accentColor}, 1)`,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.2)' }, angleLines: { color: 'rgba(255,255,255,0.2)' }, pointLabels: { color: textColor, font: { size: 14 } }, ticks: { backdropColor: 'rgba(0,0,0,0.5)', color: textColor }}},
                plugins: { legend: { labels: { color: textColor } } }
            }
        });
    }

    // --- Start Application ---
    initializeMainUI();
});
