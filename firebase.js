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
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Firebase initialization failed. Please check your firebaseConfig in firebase.js.", error);
        alert("Firebase initialization failed. Check the console for details.");
    }
}


// --- Authentication ---
/**
 * A promise that resolves when the Firebase authentication state has been determined.
 * This is crucial for ensuring we know if a user is logged in or not before proceeding.
 */
export const authReadyPromise = new Promise(resolve => {
    if (!auth) {
        console.error("Auth is not initialized. Cannot set onAuthStateChanged listener.");
        resolve(null);
        return;
    }
    // This listener triggers whenever the user's sign-in state changes.
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in. Store the user object in our central state.
            c3iState.firebaseUser = user;
            console.log("User is signed in:", user.uid);
        } else {
            // User is signed out. For this app, we'll sign them in anonymously
            // so they can still interact with public data without a formal account.
            console.log("User is signed out. Attempting anonymous sign-in...");
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
 * update the local application state and trigger UI updates.
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

