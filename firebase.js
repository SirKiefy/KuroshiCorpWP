/*
  This file handles all Firebase interactions.
  - Initializes the Firebase app and services (Auth, Firestore).
  - Manages user authentication state.
  - Provides functions for reading from and writing to the Firestore database.
  - Sets up real-time listeners for data changes.
*/

// Import Firebase modules from the official CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import application state and the functions that will re-render UI components
import { c3iState } from './data.js';
import { renderAllWaypoints, renderLog, renderMessages, renderPlans, renderTasks } from './ui.js';

// --- Firebase Configuration and Initialization ---
// This configuration is provided by the user.
const firebaseConfig = {
  apiKey: "AIzaSyBXeJG9xc2xQCoCzKX6WATwSW2CulOre3E",
  authDomain: "helios-interface.firebaseapp.com",
  projectId: "helios-interface",
  storageBucket: "helios-interface.appspot.com", // Corrected storage bucket format
  messagingSenderId: "1073548914126",
  appId: "1:1073548914126:web:ec04b501ba577b08584f9f",
  measurementId: "G-65W3XRX32Y"
};

// Declare variables to hold the initialized Firebase services
let app;
export let db;
export let auth;

/**
 * Initializes the Firebase app and services. This function should be called once when the app starts.
 */
export function initializeFirebase() {
    try {
        if (!app) { // Prevent re-initialization
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            console.log("Firebase initialized successfully.");
        }
    } catch (error) {
        console.error("Firebase initialization failed. Please check your firebaseConfig in firebase.js.", error);
        alert("Firebase initialization failed. Check the console for details.");
    }
}

// --- Authentication ---
/**
 * A promise that resolves when the Firebase authentication state has been determined.
 */
export const authReadyPromise = new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (user) {
            c3iState.firebaseUser = user;
            console.log("User is signed in:", user.uid);
        } else {
            console.log("User is signed out. Attempting anonymous sign-in...");
            signInAnonymously(auth).catch(error => {
                console.error("Anonymous sign-in failed:", error);
            });
        }
        resolve(user);
        unsubscribe(); // We only need this to run once on startup
    });
});

// --- Firestore Listeners ---
/**
 * Sets up real-time listeners for all dynamic data collections.
 * When data changes, it updates the state and calls the correct UI render function directly.
 */
export function setupListeners() {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot set up listeners.");
        return;
    }

    const collectionsToListen = {
        waypoints: renderAllWaypoints,
        auditLog: renderLog,
        chat: renderMessages,
        plans: renderPlans,
        tasks: renderTasks,
    };

    for (const [collectionName, renderFunction] of Object.entries(collectionsToListen)) {
        const q = query(collection(db, collectionName), orderBy("timestamp", "desc"));

        onSnapshot(q, (snapshot) => {
            c3iState[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Directly call the render function associated with this collection
            if (renderFunction) {
                renderFunction();
            }
        }, (error) => {
            console.error(`Error listening to ${collectionName}:`, error);
        });
    }
}

// --- Centralized Database Write Functions ---

export async function logAction(action, details = '') {
    if (!c3iState.currentUser || !c3iState.firebaseUser) return;
    const logData = {
        timestamp: serverTimestamp(),
        operator: c3iState.currentUser.codename,
        action,
        details,
        userId: c3iState.firebaseUser.uid
    };
    await addDoc(collection(db, 'auditLog'), logData);
}

export async function saveWaypoint(waypointData) {
    await addDoc(collection(db, 'waypoints'), { ...waypointData, timestamp: serverTimestamp() });
}

export async function updateWaypoint(waypointId, waypointData) {
    await updateDoc(doc(db, 'waypoints', waypointId), waypointData);
}

export async function deleteWaypoint(waypointId) {
    await deleteDoc(doc(db, 'waypoints', waypointId));
}

export async function savePlan(planData) {
    await addDoc(collection(db, 'plans'), { ...planData, author: c3iState.currentUser.codename, timestamp: serverTimestamp() });
}

export async function updatePlan(planId, planData) {
    await updateDoc(doc(db, 'plans', planId), planData);
}

export async function deletePlan(planId) {
    await deleteDoc(doc(db, 'plans', planId));
}

export async function saveTask(taskData) {
    await addDoc(collection(db, 'tasks'), { ...taskData, author: c3iState.currentUser.codename, completed: false, timestamp: serverTimestamp() });
}

export async function updateTask(taskId, taskData) {
    await updateDoc(doc(db, 'tasks', taskId), taskData);
}

export async function deleteTask(taskId) {
    await deleteDoc(doc(db, 'tasks', taskId));
}

export async function saveChatMessage(messageData) {
    await addDoc(collection(db, 'chat'), { ...messageData, timestamp: serverTimestamp() });
}
