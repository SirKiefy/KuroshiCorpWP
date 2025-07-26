import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, setLogLevel, onSnapshot, collection, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { c3iState } from './data.js';
import { uiUpdaters } from './ui.js';

export let db, auth;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let authReadyResolver;
export const authReadyPromise = new Promise(resolve => { authReadyResolver = resolve; });

export async function initializeFirebase() {
    try {
        let firebaseConfig;
        if (typeof __firebase_config !== 'undefined' && __firebase_config.trim() !== '') {
            firebaseConfig = JSON.parse(__firebase_config);
        } else {
            console.warn("Using fallback Firebase config.");
            firebaseConfig = {
                apiKey: "AIzaSyBXeJG9xc2xQCoCzKX6WATwSW2CulOre3E",
                authDomain: "helios-interface.firebaseapp.com",
                projectId: "helios-interface",
                storageBucket: "helios-interface.appspot.com",
                messagingSenderId: "1073548914126",
                appId: "1:1073548914126:web:ec04b501ba577b08584f9f",
                measurementId: "G-65W3XRX32Y"
            };
        }

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        setLogLevel('debug');

        onAuthStateChanged(auth, (user) => {
            if (user) {
                c3iState.firebaseUser = user;
                if (authReadyResolver) {
                    authReadyResolver(user);
                    authReadyResolver = null;
                }
                setupFirestoreListeners();
            } else {
                c3iState.firebaseUser = null;
            }
        });

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }

    } catch (error) {
        console.error("Firebase Initialization Failed:", error);
        document.getElementById('stage-offline-text').innerHTML = '<h1>INITIALIZATION FAILED</h1><p>Please check console for details.</p>';
    }
}

export function setupFirestoreListeners() {
    if (!c3iState.firebaseUser) return;
    c3iState.listeners.forEach(unsubscribe => unsubscribe());
    c3iState.listeners = [];

    const collectionsToWatch = {
        waypoints: 'waypoints',
        chatMessages: 'chatMessages',
        auditLog: 'auditLog',
        plans: 'plans',
        tasks: 'tasks'
    };

    for (const [key, updaterKey] of Object.entries(collectionsToWatch)) {
        const q = query(collection(db, `artifacts/${appId}/public/data/${key}`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (['auditLog', 'chatMessages', 'plans', 'tasks'].includes(key)) {
                data.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            }
            c3iState[key] = data;
            
            // Directly call the registered UI updater function
            if (uiUpdaters[updaterKey]) {
                uiUpdaters[updaterKey]();
            }

        }, err => console.error(`${key} listener error: `, err));
        c3iState.listeners.push(unsubscribe);
    }
}

// --- CENTRALIZED DATABASE WRITE FUNCTIONS ---

async function saveData(collectionName, data) {
    try {
        await addDoc(collection(db, `artifacts/${appId}/public/data/${collectionName}`), data);
        return true;
    } catch (error) {
        console.error(`Error saving to ${collectionName}:`, error);
        return false;
    }
}

async function updateData(collectionName, docId, data) {
    try {
        const docRef = doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error(`Error updating ${collectionName}:`, error);
        return false;
    }
}

async function deleteData(collectionName, docId) {
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/${collectionName}`, docId));
        return true;
    } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
        return false;
    }
}

// Export specific functions for each data type
export const saveWaypoint = (data) => saveData('waypoints', { ...data, timestamp: serverTimestamp() });
export const updateWaypoint = (id, data) => updateData('waypoints', id, data);
export const deleteWaypoint = (id) => deleteData('waypoints', id);

export const savePlan = (data) => saveData('plans', { ...data, timestamp: serverTimestamp() });
export const updatePlan = (id, data) => updateData('plans', id, { ...data, timestamp: serverTimestamp() });
export const deletePlan = (id) => deleteData('plans', id);

export const saveTask = (data) => saveData('tasks', { ...data, timestamp: serverTimestamp() });
export const updateTask = (id, data) => updateData('tasks', id, data);
export const deleteTask = (id) => deleteData('tasks', id);

export const saveChatMessage = (data) => saveData('chatMessages', { ...data, timestamp: serverTimestamp() });
export const saveAuditLog = (data) => saveData('auditLog', { ...data, timestamp: serverTimestamp() });
