/*
  This file manages the main application user interface after the boot sequence.
  - Initializes the different pages (Map, Armoury, Codex, etc.).
  - Handles page navigation.
  - Renders dynamic content based on application state.
  - Manages UI components like modals and forms.
*/

import { c3iState, bootState } from './data.js';
import * as Firebase from './firebase.js';
import * as Utils from './utils.js';

// --- Helper Functions ---
function getClearanceName(level) {
    if (level >= 7) return 'System Administrator';
    if (level >= 6) return 'Command';
    if (level >= 4) return 'Strategic';
    if (level >= 3) return 'Operator';
    return 'Recruit';
}

// --- Page Initializers ---

export function initializeC3IApp() {
    document.getElementById('user-callsign').textContent = c3iState.currentUser.codename;
    document.getElementById('user-clearance').textContent = `Lvl ${c3iState.currentUser.clearance} - ${getClearanceName(c3iState.currentUser.clearance)}`;
    document.getElementById('user-id-display').textContent = c3iState.firebaseUser?.uid || 'ANONYMOUS';
    document.getElementById('logout-button').addEventListener('click', () => location.reload());

    const navItems = document.querySelectorAll('#main-interface .nav-item');
    const pageContainer = document.getElementById('desktop-content-container');
    const mainInterface = document.getElementById('main-interface');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    sidebarToggle.addEventListener('click', () => {
        mainInterface.classList.toggle('collapsed');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    });

    const pageInitializers = {
        map: Utils.initTacticalMap,
        armoury: initArmouryPage,
        codex: initCodexPage,
        intel: initIntelPage,
        comms: initCommsPage,
        settings: initSettingsPage,
    };

    function loadPage(pageName) {
        if(bootState.soundInitialized) bootState.uiSynth.triggerAttackRelease("E4", "8n");
        
        pageContainer.innerHTML = '';
        bootState.threeInstances.forEach(inst => {
            inst.renderer?.dispose();
            inst.scene?.clear();
        });
        bootState.threeInstances = [];

        const template = document.getElementById(`template-${pageName}`);
        if (template) {
            pageContainer.appendChild(template.content.cloneNode(true));
        }

        if (pageInitializers[pageName]) {
            pageInitializers[pageName]();
        }

        navItems.forEach(item => item.classList.toggle('active', item.dataset.page === pageName));
    }

    navItems.forEach(item => item.addEventListener('click', () => loadPage(item.dataset.page)));

    loadPage('map');
}

function initArmouryPage() {
    // Armoury page logic remains the same as it uses static data
    const fileListEl = document.getElementById('armoury-file-list');
    const detailEl = document.getElementById('armoury-detail');
    const breadcrumbsEl = document.getElementById('armoury-breadcrumbs');
    const comparisonGridEl = document.getElementById('armoury-comparison-grid');
    const addAssetBtn = document.getElementById('add-asset-btn');

    let currentPath = [];
    let comparisonChart = null;

    if (c3iState.currentUser.clearance >= 4) {
        addAssetBtn.classList.remove('hidden');
        addAssetBtn.addEventListener('click', () => alert('Add Asset functionality is a future implementation.'));
    }

    function renderBrowser() {
        let currentLevel = c3iState.armoury;
        currentPath.forEach(part => { currentLevel = currentLevel[part]; });

        fileListEl.innerHTML = '';
        breadcrumbsEl.innerHTML = `<span class="cursor-pointer hover:text-primary" data-path="">ROOT</span>` + currentPath.map((p, i) => ` / <span class="cursor-pointer hover:text-primary" data-path="${currentPath.slice(0, i + 1).join('/')}">${p}</span>`).join('');

        Object.keys(currentLevel).filter(key => typeof currentLevel[key] === 'object' && !currentLevel[key].type).forEach(dirName => {
            const dirEl = document.createElement('div');
            dirEl.className = 'data-nav-item';
            dirEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> <span>${dirName}</span>`;
            dirEl.addEventListener('click', () => { currentPath.push(dirName); renderBrowser(); });
            fileListEl.appendChild(dirEl);
        });

        Object.keys(currentLevel).filter(key => currentLevel[key].type).forEach(fileName => {
            const fileEl = document.createElement('div');
            fileEl.className = 'data-nav-item';
            fileEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg> <span>${fileName}</span>`;
            fileEl.addEventListener('click', () => showAssetDetail(currentLevel[fileName], fileName));
            fileListEl.appendChild(fileEl);
        });

        breadcrumbsEl.querySelectorAll('span').forEach(span => {
            span.addEventListener('click', (e) => {
                const path = e.target.dataset.path;
                currentPath = path ? path.split('/') : [];
                renderBrowser();
            });
        });
    }

    function showAssetDetail(asset, name) {
        detailEl.innerHTML = `<h3 class="text-lg text-primary mb-2">${name}</h3><p class="text-sm text-gray-400 mb-4">${asset.type}</p>`;
        
        if (asset.type === 'Report') {
            let tableHTML = '<table class="data-table text-xs"><thead><tr>';
            const headers = Object.keys(asset.data[0]);
            headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += '</tr></thead><tbody>';
            asset.data.forEach(row => {
                tableHTML += '<tr>';
                headers.forEach(h => tableHTML += `<td>${row[h]}</td>`);
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';
            detailEl.innerHTML += tableHTML;
        } else {
            let listHTML = '<ul class="space-y-1 text-sm">';
            for (const [key, value] of Object.entries(asset.data)) {
                listHTML += `<li><strong>${key}:</strong> <span class="text-info">${value}</span></li>`;
            }
            listHTML += '</ul>';
            detailEl.innerHTML += listHTML;
        }

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex gap-2 mt-4';
        const compareBtn = document.createElement('button');
        compareBtn.className = 'c3i-button text-sm';
        compareBtn.textContent = 'Add to Comparison';
        compareBtn.onclick = () => addToComparison({name, ...asset});
        buttonGroup.appendChild(compareBtn);
        
        if (c3iState.currentUser.clearance >= 4) {
            const editBtn = document.createElement('button');
            editBtn.className = 'c3i-button text-sm';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => alert('Edit functionality for Armoury is a future implementation.');
            buttonGroup.appendChild(editBtn);
        }
        detailEl.appendChild(buttonGroup);
    }

    function addToComparison(asset) {
        if (c3iState.comparisonAssets.length < 3 && !c3iState.comparisonAssets.find(a => a.name === asset.name)) {
            c3iState.comparisonAssets.push(asset);
            renderComparison();
            if(bootState.soundInitialized) bootState.uiSynth.triggerAttackRelease("C5", "16n");
        } else {
             if(bootState.soundInitialized) bootState.failSynth.triggerAttackRelease("A2", "16n");
        }
    }

    function renderComparison() {
        if (comparisonChart) {
            comparisonChart.destroy();
        }

        if (c3iState.comparisonAssets.length === 0) {
            comparisonGridEl.innerHTML = `<p class="text-gray-500 col-span-full">Add up to 3 assets to compare from the browser.</p>`;
            return;
        }
        comparisonGridEl.innerHTML = `<canvas id="comparison-chart"></canvas>`;
        
        const numericKeys = new Set();
        c3iState.comparisonAssets.forEach(asset => {
            Object.keys(asset.data).forEach(key => {
                if (!isNaN(parseFloat(asset.data[key]))) {
                    numericKeys.add(key);
                }
            });
        });
        const labels = Array.from(numericKeys);

        const datasets = c3iState.comparisonAssets.map((asset, index) => {
            const colors = [ 'rgba(255, 60, 60, 0.4)', 'rgba(69, 243, 255, 0.4)', 'rgba(245, 166, 35, 0.4)' ];
            const borderColors = [ 'rgba(255, 60, 60, 1)', 'rgba(69, 243, 255, 1)', 'rgba(245, 166, 35, 1)' ];
            const data = labels.map(key => parseFloat(asset.data[key]) || 0);
            return {
                label: asset.name,
                data: data,
                backgroundColor: colors[index],
                borderColor: borderColors[index],
                borderWidth: 1
            };
        });

        const ctx = document.getElementById('comparison-chart').getContext('2d');
        comparisonChart = new Chart(ctx, {
            type: 'radar',
            data: { labels: labels, datasets: datasets },
            options: {
                scales: { r: { angleLines: { color: 'rgba(255,255,255,0.2)' }, grid: { color: 'rgba(255,255,255,0.2)' }, pointLabels: { color: 'white', font: { family: "'PPSupplyMono', monospace" } }, ticks: { color: 'black', backdropColor: 'rgba(255,255,255,0.8)', font: { family: "'PPSupplyMono', monospace" } } } },
                plugins: { legend: { display: true, position: 'top', labels: { color: 'white', font: { family: "'PPSupplyMono', monospace" } } } },
                maintainAspectRatio: true,
            }
        });
    }
    
    document.getElementById('clear-comparison-btn').addEventListener('click', () => {
        c3iState.comparisonAssets = [];
        renderComparison();
    });
    
    const sidebarTabs = document.querySelectorAll('#template-armoury .sidebar-tab');
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            sidebarTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('armoury-browser').classList.toggle('active', tab.dataset.tab === 'browser');
            document.getElementById('armoury-comparison').classList.toggle('active', tab.dataset.tab === 'comparison');
        });
    });

    renderBrowser();
    renderComparison();
}

function initCodexPage() {
    // Codex page logic remains the same as it uses static data
    const navEl = document.getElementById('codex-nav');
    const contentEl = document.getElementById('codex-content-container');
    
    navEl.innerHTML = '';
    Object.keys(c3iState.codex).forEach((key, index) => {
        const navItem = document.createElement('div');
        navItem.className = 'data-nav-item';
        if (index === 0) navItem.classList.add('active');
        navItem.textContent = key;
        navItem.dataset.key = key;
        navEl.appendChild(navItem);
    });

    navEl.querySelectorAll('.data-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            navEl.querySelectorAll('.data-nav-item').forEach(i => i.classList.remove('active'));
            e.target.classList.add('active');
            contentEl.innerHTML = `<div class="prose prose-invert">${c3iState.codex[key]}</div>`;
        });
    });
    
    const firstKey = Object.keys(c3iState.codex)[0];
    if(firstKey) {
        contentEl.innerHTML = `${c3iState.codex[firstKey]}`;
    }
}

function initIntelPage() {
    // Add event listeners that will re-render the content when data changes
    window.addEventListener('plansUpdated', renderPlans);
    window.addEventListener('tasksUpdated', renderTasks);

    // Initial render of all components on this page
    renderFactionList();
    renderPlans();
    renderTasks();
    renderPersonnel();

    const sidebarTabs = document.querySelectorAll('#template-intel .sidebar-tab');
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            sidebarTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('#intel-content-container .intel-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`intel-${tab.dataset.tab}`).classList.add('active');
        });
    });

    document.getElementById('add-plan-btn')?.addEventListener('click', () => openPlanTaskModal('plan'));
    document.getElementById('add-task-btn')?.addEventListener('click', () => openPlanTaskModal('task'));
    document.getElementById('close-plan-task-modal-btn')?.addEventListener('click', () => document.getElementById('plan-task-modal').classList.add('hidden'));
    document.getElementById('plan-task-form').addEventListener('submit', handlePlanTaskFormSubmit);
}

function initCommsPage() {
    // Add event listener to re-render messages when new ones arrive
    window.addEventListener('chatUpdated', renderMessages);
    // Initial render of messages
    renderMessages();

    const chatForm = document.getElementById('chat-form');
    chatForm.addEventListener('submit', async e => {
        e.preventDefault();
        const chatInput = document.getElementById('chat-input');
        const text = chatInput.value.trim();
        if (text) {
            chatInput.value = '';
            await Firebase.saveChatMessage({
                user: c3iState.currentUser.codename,
                text: text,
                userId: c3iState.firebaseUser.uid
            });
        }
    });
}
        
function initSettingsPage() {
    // Add event listener to re-render the log when it updates
    window.addEventListener('logUpdated', renderLog);
    // Initial render of the log
    renderLog();
    
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.checked = bootState.soundInitialized && !Tone.getDestination().mute;
    soundToggle.addEventListener('change', (e) => {
        if (e.target.checked && !bootState.soundInitialized) {
            initSound();
        }
        Tone.getDestination().mute = !e.target.checked;
    });

    const themeSelector = document.getElementById('theme-selector');
    themeSelector.addEventListener('click', e => {
        if (e.target.dataset.theme) {
            document.body.className = document.body.classList.contains('color-shift-active') ? `color-shift-active ${e.target.dataset.theme}` : e.target.dataset.theme;
            updateActiveThemeButton();
        }
    });
    
    function updateActiveThemeButton() {
        const currentTheme = Array.from(document.body.classList).find(c => c.startsWith('theme-'));
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === currentTheme);
        });
    }
    updateActiveThemeButton();

    const colorShiftToggle = document.getElementById('color-shift-toggle');
    colorShiftToggle.checked = document.body.classList.contains('color-shift-active');
    colorShiftToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('color-shift-active', e.target.checked);
    });
}

// --- RENDER FUNCTIONS ---
// These functions update the DOM when called. They are triggered by the event listeners.

function renderLog() {
    const container = document.getElementById('audit-log-container');
    if (!container) return;
    let logHtml = `<table class="data-table"><thead><tr class="border-b border-primary/20"><th class="p-2">Timestamp</th><th class="p-2">Operator</th><th class="p-2">Action</th><th class="p-2">Details</th></tr></thead><tbody>`;
    c3iState.auditLog.forEach(log => {
        logHtml += `<tr class="border-b border-gray-800"><td class="p-2">${log.timestamp?.toDate().toLocaleString() || '...'}</td><td class="p-2 text-primary">${log.operator}</td><td class="p-2">${log.action}</td><td class="p-2">${log.details}</td></tr>`;
    });
    logHtml += `</tbody></table>`;
    container.innerHTML = logHtml;
}

function renderMessages() {
    const chatMessagesEl = document.getElementById('chat-messages');
    if (!chatMessagesEl) return;
    chatMessagesEl.innerHTML = '';
    c3iState.chatMessages.forEach(msg => {
        const msgEl = document.createElement('p');
        const sender = msg.user === c3iState.currentUser.codename ? 'You' : msg.user;
        const colorClass = msg.user === c3iState.currentUser.codename ? 'text-info' : 'text-primary';
        msgEl.innerHTML = `<span class="${colorClass}">${sender}:</span> ${msg.text}`;
        chatMessagesEl.prepend(msgEl);
    });
}

function renderPlans() {
    const plansContainer = document.getElementById('plans-container');
    if(!plansContainer) return;
    plansContainer.innerHTML = c3iState.plans.map(plan => `
        <div class="ui-box">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-primary">${plan.name}</h4>
                    <p class="text-sm whitespace-pre-wrap">${plan.details}</p>
                    <p class="text-xs text-gray-500 mt-2">By ${plan.author} on ${plan.timestamp?.toDate().toLocaleDateString()}</p>
                </div>
                ${c3iState.currentUser.clearance >= 4 ? `<div class="flex gap-2">
                    <button class="c3i-button text-xs edit-plan-btn" data-id="${plan.id}">Edit</button>
                    <button class="c3i-button text-xs delete-plan-btn" data-id="${plan.id}">X</button>
                </div>` : ''}
            </div>
        </div>
    `).join('');
    plansContainer.querySelectorAll('.edit-plan-btn').forEach(btn => btn.addEventListener('click', (e) => openPlanTaskModal('plan', e.target.dataset.id)));
    plansContainer.querySelectorAll('.delete-plan-btn').forEach(btn => btn.addEventListener('click', (e) => Firebase.deletePlan(e.target.dataset.id)));
}

function renderTasks() {
    const tasksContainer = document.getElementById('tasks-container');
    if(!tasksContainer) return;
    tasksContainer.innerHTML = c3iState.tasks.map(task => `
        <div class="ui-box ${task.completed ? 'opacity-50' : ''}">
             <div class="flex justify-between items-start">
                <div class="flex items-center gap-4">
                    ${c3iState.currentUser.clearance >= 4 ? `<input type="checkbox" class="task-complete-check" data-id="${task.id}" ${task.completed ? 'checked' : ''}>` : ''}
                    <div>
                        <p class="${task.completed ? 'line-through' : ''}">${task.name}</p>
                        <p class="text-sm mt-1">Priority: <span class="font-bold text-warning">${task.priority}</span></p>
                        <p class="text-xs text-gray-500 mt-2">Assigned by ${task.author} on ${task.timestamp?.toDate().toLocaleDateString()}</p>
                    </div>
                </div>
                ${c3iState.currentUser.clearance >= 4 ? `<div class="flex gap-2">
                    <button class="c3i-button text-xs edit-task-btn" data-id="${task.id}">Edit</button>
                    <button class="c3i-button text-xs delete-task-btn" data-id="${task.id}">X</button>
                </div>` : ''}
            </div>
        </div>
    `).join('');
    tasksContainer.querySelectorAll('.edit-task-btn').forEach(btn => btn.addEventListener('click', (e) => openPlanTaskModal('task', e.target.dataset.id)));
    tasksContainer.querySelectorAll('.delete-task-btn').forEach(btn => btn.addEventListener('click', (e) => Firebase.deleteTask(e.target.dataset.id)));
    tasksContainer.querySelectorAll('.task-complete-check').forEach(box => box.addEventListener('change', (e) => Firebase.updateTask(e.target.dataset.id, { completed: e.target.checked })));
}

// --- Static Content Renderers ---
function renderFactionList() {
    const listContainer = document.getElementById('faction-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    for(const key in c3iState.intel) {
        const faction = c3iState.intel[key];
        const card = document.createElement('div');
        card.className = 'data-nav-item';
        card.dataset.factionKey = key;
        card.innerHTML = `<span>${faction.name}</span>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('#faction-list-container .data-nav-item').forEach(i => i.classList.remove('active'));
            card.classList.add('active');
            showFactionDetailView(key);
        });
        listContainer.appendChild(card);
    }
}

function showFactionDetailView(factionKey) {
    const detailView = document.getElementById('faction-detail-view');
    const faction = c3iState.intel[factionKey];
    if (!faction) {
        detailView.innerHTML = `<p class="text-gray-500">Select a faction to view details.</p>`;
        return;
    }
    let strengthHTML = `<div class="grid grid-cols-3 gap-2 text-center text-sm p-2 ui-box"><div>Ground<br><span class="font-bold text-info">${faction.strength.ground}</span></div><div>Air<br><span class="font-bold text-info">${faction.strength.air}</span></div><div>Naval<br><span class="font-bold text-info">${faction.strength.naval}</span></div></div>`;
    let hierarchyHTML = `<h5 class="font-bold mt-4 text-secondary">Hierarchy:</h5><ul class="text-sm list-disc list-inside"><li><span class="font-bold">Leader:</span> ${faction.hierarchy.leader}</li>`;
    if(faction.hierarchy.members) {
        faction.hierarchy.members.forEach(m => hierarchyHTML += `<li>${m}</li>`);
    }
    hierarchyHTML += '</ul>';
    detailView.innerHTML = `<h3 class="text-2xl text-primary">${faction.name}</h3><div class="flex justify-between text-md my-2"><span>Threat: <span class="text-warning font-bold">${faction.threat}</span></span> <span>Hostility: <span class="text-secondary font-bold">${faction.hostility}</span></span></div><p class="text-md italic text-gray-400 my-4 p-2 ui-box">"${faction.report}"</p><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div>${strengthHTML}</div><div>${hierarchyHTML}</div></div>`;
}

function renderPersonnel() {
    const personnelContainer = document.getElementById('personnel-container');
    if (!personnelContainer) return;
    let tableHTML = `<table class="data-table"><thead><tr><th>Codename</th><th>Username</th><th>Clearance Level</th></tr></thead><tbody>`;
    for (const codename in c3iState.users) {
        const user = c3iState.users[codename];
        tableHTML += `<tr><td>${codename}</td><td>${user.username}</td><td>${user.clearance} - ${getClearanceName(user.clearance)}</td></tr>`;
    }
    tableHTML += `</tbody></table>`;
    personnelContainer.innerHTML = tableHTML;
}


// --- Modal & Form Logic ---
function openPlanTaskModal(type, id = null) {
    const modal = document.getElementById('plan-task-modal');
    const form = document.getElementById('plan-task-form');
    form.reset();
    form.dataset.type = type;
    document.getElementById('edit-id').value = id || '';

    const modalTitle = document.getElementById('plan-task-modal-title');
    const labelName = document.getElementById('label-name');
    const detailsField = document.getElementById('details-field');
    const priorityField = document.getElementById('priority-field');
    const itemNameInput = document.getElementById('item-name');
    const itemDetailsInput = document.getElementById('item-details');
    const itemPriorityInput = document.getElementById('item-priority');

    if (type === 'plan') {
        modalTitle.textContent = id ? 'Edit Strategic Plan' : 'New Strategic Plan';
        labelName.textContent = 'Plan Name';
        detailsField.style.display = 'block';
        priorityField.style.display = 'none';
        if (id) {
            const plan = c3iState.plans.find(p => p.id === id);
            if(plan) {
                itemNameInput.value = plan.name;
                itemDetailsInput.value = plan.details;
            }
        }
    } else { // task
        modalTitle.textContent = id ? 'Edit Operational Task' : 'New Operational Task';
        labelName.textContent = 'Task Description';
        detailsField.style.display = 'none';
        priorityField.style.display = 'block';
        if (id) {
            const task = c3iState.tasks.find(t => t.id === id);
            if(task) {
                itemNameInput.value = task.name;
                itemPriorityInput.value = task.priority;
            }
        }
    }
    modal.classList.remove('hidden');
}

async function handlePlanTaskFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.dataset.type;
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('item-name').value;

    if (type === 'plan') {
        const details = document.getElementById('item-details').value;
        if (id) {
            await Firebase.updatePlan(id, { name, details });
        } else {
            await Firebase.savePlan({ name, details });
        }
    } else { // task
        const priority = document.getElementById('item-priority').value;
        if (id) {
            await Firebase.updateTask(id, { name, priority });
        } else {
            await Firebase.saveTask({ name, priority });
        }
    }
    document.getElementById('plan-task-modal').classList.add('hidden');
}
