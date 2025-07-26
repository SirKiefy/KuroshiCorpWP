/*
  This file handles all Firebase interactions.
  - Initializes the Firebase app and services (Auth, Firestore).
  - Manages user authentication state.
  - Provides functions for reading from and writing to the Firestore database.
  - Sets up real-time listeners for data changes.
*/

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import application state and UI updaters
import { c3iState } from './data.js';
import { uiUpdaters } from './ui.js';

// --- Firebase Configuration and Initialization ---
// IMPORTANT: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase app, Firestore, and Auth
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- Authentication ---
// A promise that resolves when Firebase auth state is determined
export const authReadyPromise = new Promise(resolve => {
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in.
            c3iState.firebaseUser = user;
        } else {
            // User is signed out. Sign in anonymously.
            signInAnonymously(auth).catch(error => {
                console.error("Anonymous sign-in failed:", error);
            });
        }
        resolve(user);
    });
});

// --- Firestore Listeners ---
// This function sets up real-time listeners for various data collections in Firestore.
export function setupListeners() {
    const collectionsToListen = {
        waypoints: 'waypointsUpdated',
        auditLog: 'logUpdated',
        chat: 'chatUpdated',
        plans: 'plansUpdated',
        tasks: 'tasksUpdated'
    };

    for (const [collectionName, eventName] of Object.entries(collectionsToListen)) {
        const collRef = collection(db, collectionName);
        onSnapshot(collRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Sort data if it has a timestamp
            if (data.length > 0 && data[0].timestamp) {
                data.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
            }

            // Update the local state
            c3iState[collectionName] = data;
            
            // Dispatch an event to notify the UI of the update
            window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
            
            // Also, directly call the UI updater if it exists
            if (uiUpdaters[collectionName]) {
                uiUpdaters[collectionName]();
            }
        }, (error) => {
            console.error(`Error listening to ${collectionName}:`, error);
        });
    }
}

// --- Firestore Data Manipulation Functions ---

// Save a new plan
export async function savePlan(planData) {
    await addDoc(collection(db, 'plans'), { ...planData, timestamp: serverTimestamp() });
}

// Update an existing plan
export async function updatePlan(planId, planData) {
    const planRef = doc(db, 'plans', planId);
    await updateDoc(planRef, planData);
}

// Delete a plan
export async function deletePlan(planId) {
    await deleteDoc(doc(db, 'plans', planId));
}

// Save a new task
export async function saveTask(taskData) {
    await addDoc(collection(db, 'tasks'), { ...taskData, timestamp: serverTimestamp() });
}

// Update an existing task
export async function updateTask(taskId, taskData) {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, taskData);
}

// Delete a task
export async function deleteTask(taskId) {
    await deleteDoc(doc(db, 'tasks', taskId));
}

// Save a new chat message
export async function saveChatMessage(messageData) {
    await addDoc(collection(db, 'chat'), { ...messageData, timestamp: serverTimestamp() });
}

