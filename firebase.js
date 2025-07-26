import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, setLogLevel, onSnapshot, collection, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { c3iState } from './data.js';

export let db, auth;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let authReadyResolver;
export const authReadyPromise = new Promise(resolve => { authReadyResolver = resolve; });

export async function initializeFirebase() {
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyBXeJG9xc2xQCoCzKX6WATwSW2CulOre3E",
            authDomain: "helios-interface.firebaseapp.com",
            projectId: "helios-interface",
            storageBucket: "helios-interface.appspot.com",
            messagingSenderId: "1073548914126",
            appId: "1:1073548914126:web:ec04b501ba577b08584f9f",
            measurementId: "G-65W3XRX32Y"
        };

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        setLogLevel('debug');

        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("Firebase user signed in:", user.uid);
                c3iState.firebaseUser = user;
                if (authReadyResolver) {
                    authReadyResolver(user);
                    authReadyResolver = null;
                }
                setupFirestoreListeners();
            } else {
                console.log("No user signed in.");
                c3iState.firebaseUser = null;
            }
        });

        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Authentication failed, trying anonymous sign-in:", error);
            await signInAnonymously(auth);
        }

    } catch (error) {
        console.error("Firebase Initialization Failed:", error);
        document.getElementById('stage-offline-text').innerHTML = '<h1>INITIALIZATION FAILED</h1><p>Please check console for details.</p>';
    }
}

export function setupFirestoreListeners() {
    if (!c3iState.firebaseUser) {
        console.log("Waiting for user authentication to set up listeners.");
        return;
    }
    c3iState.listeners.forEach(unsubscribe => unsubscribe());
    c3iState.listeners = [];

    console.log("User authenticated, setting up Firestore listeners.");

    const collectionsToWatch = {
        waypoints: 'waypointsUpdated',
        chatMessages: 'chatUpdated',
        auditLog: 'logUpdated',
        plans: 'plansUpdated',
        tasks: 'tasksUpdated'
    };

    for (const [key, eventName] of Object.entries(collectionsToWatch)) {
        const q = query(collection(db, `artifacts/${appId}/public/data/${key}`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log(`Received ${key} snapshot with ${snapshot.docs.length} documents.`);
            let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (['auditLog', 'chatMessages', 'plans', 'tasks'].includes(key)) {
                data.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
            }
            
            c3iState[key] = data;
            
            window.dispatchEvent(new Event(eventName));
        }, err => console.error(`${key} listener error: `, err));
        c3iState.listeners.push(unsubscribe);
    }
}
