import { initializeFirebase, authReadyPromise } from './firebase.js';
import { loadData, c3iState, bootState } from './data.js';
import { runBootSequence, initSound, initOffline } from './boot.js';
import { initializeC3IApp } from './ui.js';
import { logAction } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Populate bootState with DOM elements now that they exist
    bootState.stages = document.querySelectorAll('.boot-stage');
    bootState.cursor = document.getElementById('custom-cursor');
    bootState.loginForm = document.getElementById('login-form');
    bootState.loginError = document.getElementById('login-error');

    // --- Custom Cursor Logic ---
    window.addEventListener('mousemove', e => {
        bootState.mousePos = { x: e.clientX, y: e.clientY };
        if (bootState.cursor) {
            bootState.cursor.style.left = e.clientX + 'px';
            bootState.cursor.style.top = e.clientY + 'px';
        }
    });

    // --- Application Start ---
    function startHandler() {
        initSound();
        runBootSequence();
        window.removeEventListener('keydown', startHandler);
        window.removeEventListener('click', startHandler);
    }

    window.addEventListener('keydown', startHandler);
    window.addEventListener('click', startHandler);

    window.addEventListener('resize', () => {
        for (const instance of bootState.threeInstances) {
            const { renderer, camera, container, composer } = instance;
            if (container && document.body.contains(container)) {
                const width = container.clientWidth;
                const height = container.clientHeight;
                if (width > 0 && height > 0) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height);
                    if (composer) composer.setSize(width, height);
                }
            }
        }
    });

    bootState.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codename = e.target.username.value.toLowerCase();
        const password = e.target.password.value;
        const user = c3iState.users[codename];

        if (user && user.password === password) {
            c3iState.currentUser = { codename: codename, ...user };
            
            await authReadyPromise;
            
            await logAction('User Login');
            showDesktop();
        } else {
            if(bootState.soundInitialized) bootState.failSynth.triggerAttackRelease("G2", "1n");
            bootState.loginError.style.display = 'block';
            setTimeout(() => { bootState.loginError.style.display = 'none'; }, 1500);
        }
    });

    function showDesktop() {
        if(bootState.soundInitialized) bootState.successSynth.triggerAttackRelease("C4", "2n");
        document.getElementById('boot-container').style.display = 'none';
        document.getElementById('desktop').style.display = 'block';
        initializeC3IApp();
    }

    // Initialize Data, then Firebase, then the visual boot sequence
    loadData();
    initializeFirebase();
    initOffline();
});
