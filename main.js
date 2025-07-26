import { initializeFirebase } from './firebase.js';
import { loadData, c3iState } from './data.js';
import { bootState, runBootSequence, initSound, initOffline } from './boot.js';
import { initializeC3IApp } from './ui.js';
import { getFirestore, doc, addDoc, serverTimestamp, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
        if (container && document.contains(container)) {
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
        
        // Wait for Firebase to be ready before logging
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

async function logAction(action, details = '') {
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
        const db = getFirestore();
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        await addDoc(collection(db, `artifacts/${appId}/public/data/auditLog`), logData);
    } catch (error) {
        console.error("Error writing to audit log:", error);
    }
}


// Initialize Data, then Firebase, then the visual boot sequence
loadData();
initializeFirebase();
initOffline();

const authReadyPromise = new Promise(resolve => {
    const checkAuth = () => {
        if (c3iState.firebaseUser) {
            resolve();
        } else {
            setTimeout(checkAuth, 100);
        }
    };
    checkAuth();
});
