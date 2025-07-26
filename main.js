/*
  This is the main entry point of the application.
  It orchestrates the entire startup process, including:
  1. Loading initial data.
  2. Initializing Firebase services.
  3. Setting up the boot sequence and UI.
  4. Handling user login and authentication.
*/

// Import necessary modules and functions
import { initializeFirebase, authReadyPromise, setupListeners } from './firebase.js';
import { loadData, c3iState, bootState } from './data.js';
import { runBootSequence, initSound, initOffline } from './boot.js';
import { initializeC3IApp } from './ui.js';
import { logAction } from './utils.js';

// Wait for the DOM to be fully loaded before starting the application
document.addEventListener('DOMContentLoaded', () => {
    // Populate bootState with DOM elements now that they exist
    bootState.stages = document.querySelectorAll('.boot-stage');
    bootState.cursor = document.getElementById('custom-cursor');
    bootState.loginForm = document.getElementById('login-form');
    bootState.loginError = document.getElementById('login-error');

    // --- Custom Cursor Logic ---
    // This makes the custom cursor follow the mouse
    window.addEventListener('mousemove', e => {
        bootState.mousePos = { x: e.clientX, y: e.clientY };
        if (bootState.cursor) {
            bootState.cursor.style.left = e.clientX + 'px';
            bootState.cursor.style.top = e.clientY + 'px';
        }
    });

    // --- Application Start ---
    // This handler initiates the boot sequence when the user interacts with the page
    function startHandler() {
        initSound();
        runBootSequence();
        // Remove the event listeners after they've been triggered once
        window.removeEventListener('keydown', startHandler);
        window.removeEventListener('click', startHandler);
    }

    window.addEventListener('keydown', startHandler);
    window.addEventListener('click', startHandler);

    // --- Window Resize Handler ---
    // This ensures that the Three.js scenes resize correctly when the window size changes
    window.addEventListener('resize', () => {
        for (const instance of bootState.threeInstances) {
            const { renderer, camera, container, composer } = instance;
            // Check if the container element is still in the DOM
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

    // --- Login Form Submission ---
    bootState.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codename = e.target.username.value.toLowerCase();
        const password = e.target.password.value;
        const user = c3iState.users[codename];

        // Check if the user exists and the password is correct
        if (user && user.password === password) {
            c3iState.currentUser = { codename: codename, ...user };
            
            // Wait for Firebase authentication to be ready
            await authReadyPromise;
            
            // Log the successful login and show the main application desktop
            await logAction('User Login');
            showDesktop();
        } else {
            // Show an error message if login fails
            if(bootState.soundInitialized) bootState.failSynth.triggerAttackRelease("G2", "1n");
            bootState.loginError.style.display = 'block';
            setTimeout(() => { bootState.loginError.style.display = 'none'; }, 1500);
        }
    });

    // --- Show Desktop Function ---
    // This function hides the boot sequence and displays the main application interface
    function showDesktop() {
        if(bootState.soundInitialized) bootState.successSynth.triggerAttackRelease("C4", "2n");
        document.getElementById('boot-container').style.display = 'none';
        document.getElementById('desktop').style.display = 'block';
        // Initialize the main C3I application UI and set up Firestore listeners
        initializeC3IApp();
        setupListeners();
    }

    // --- Initialization Sequence ---
    // 1. Load static data from data.js
    loadData();
    // 2. Initialize Firebase connection
    initializeFirebase();
    // 3. Initialize the offline visuals for the first stage of the boot sequence
    initOffline();
});

