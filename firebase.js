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

// Import application state and UI updaters
import { c3iState } from './data.js';
import { uiUpdaters } from './ui.js';

// --- Firebase Configuration and Initialization ---
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!! CRITICAL INSTRUCTION !!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// REPLACE THE PLACEHOLDER VALUES BELOW WITH YOUR ACTUAL FIREBASE PROJECT CONFIGURATION.
// You can find this in your Firebase project settings.
// The application WILL NOT WORK without the correct configuration.
//
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app;
export let db;
export let auth;

/**
 * Initializes the Firebase app and services.
 */
export function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (error) {
        console.error("Firebase initialization failed. Please check your firebaseConfig.", error);
        alert("Firebase initialization failed. Please check your configuration in firebase.js and ensure you have an active internet connection.");
    }
}


// --- Authentication ---
// A promise that resolves when Firebase auth state is determined
export const authReadyPromise = new Promise(resolve => {
    // This listener triggers whenever the user's sign-in state changes.
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in. Store the user object.
            c3iState.firebaseUser = user;
        } else {
            // User is signed out. For this app, we'll sign them in anonymously
            // so they can still interact with public data.
            signInAnonymously(auth).catch(error => {
                console.error("Anonymous sign-in failed:", error);
            });
        }
        // Resolve the promise so the login process can continue.
        resolve(user);
    });
});

// --- Firestore Listeners ---
/**
 * Sets up real-time listeners for various data collections in Firestore.
 * When data changes in the database, these listeners will automatically
 * update the local application state and the UI.
 */
export function setupListeners() {
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot set up listeners.");
        return;
    }

    const collectionsToListen = {
        waypoints: 'waypointsUpdated',
        auditLog: 'logUpdated',
        chat: 'chatUpdated',
        plans: 'plansUpdated',
        tasks: 'tasksUpdated'
    };

    for (const [collectionName, eventName] of Object.entries(collectionsToListen)) {
        // Create a query to get the collection and order it by timestamp
        const collRef = collection(db, collectionName);
        const q = query(collRef, orderBy("timestamp", "desc"));

        // onSnapshot creates a real-time listener
        onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Update the central application state
            c3iState[collectionName] = data;
            
            // Dispatch a custom event to notify the UI that data has changed
            window.dispatchEvent(new CustomEvent(eventName));
            
        }, (error) => {
            console.error(`Error listening to ${collectionName}:`, error);
            // This can happen due to Firestore rules or network issues.
        });
    }
}

// --- Firestore Data Manipulation Functions ---

// Save a new plan to the 'plans' collection
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

// Save a new task to the 'tasks' collection
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

// Save a new chat message to the 'chat' collection
export async function saveChatMessage(messageData) {
    await addDoc(collection(db, 'chat'), { ...messageData, timestamp: serverTimestamp() });
}

