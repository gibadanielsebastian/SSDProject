
"use client";
import { db } from "./firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    deleteDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    getDoc,
    setDoc,
    updateDoc,
    writeBatch,
    getCountFromServer,
    orderBy,
    limit
} from "firebase/firestore";

const COLLECTION_NAME = "workouts";

// Add a new workout
export const addWorkout = async (currentUser, workoutData) => {
    const { uid: userId, displayName } = currentUser;
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...workoutData,
            userId,
            createdBy: displayName || "Unknown User",
            createdAt: serverTimestamp(),
        });
        return { id: docRef.id, ...workoutData };
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

// Subscribe to workouts (Real-time)
export const subscribeToUserWorkouts = (userId, callback) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId)
    );

    return onSnapshot(q, (snapshot) => {
        const workouts = [];
        snapshot.forEach((doc) => {
            workouts.push({ id: doc.id, ...doc.data() });
        });
        // Client-side sort
        workouts.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
        callback(workouts);
    });
};

// Delete a workout
export const deleteWorkout = async (workoutId) => {
    try {
        const batch = writeBatch(db);

        // 1. Delete all exercises in subcollection
        const exercisesRef = collection(db, COLLECTION_NAME, workoutId, "exercises");
        const snapshot = await getDocs(exercisesRef);

        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // 2. Delete the workout document itself
        const workoutRef = doc(db, COLLECTION_NAME, workoutId);
        batch.delete(workoutRef);

        await batch.commit();
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
    }
};

export const updateWorkout = async (workoutId, data) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, workoutId);
        await updateDoc(docRef, data);
    } catch (e) {
        console.error("Error updating workout: ", e);
        throw e;
    }
}

export const subscribeToWorkout = (workoutId, callback) => {
    return onSnapshot(doc(db, COLLECTION_NAME, workoutId), (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        } else {
            callback(null);
        }
    });
};

export const subscribeToPublicWorkouts = (callback) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("isPublic", "==", true)
    );

    return onSnapshot(q, (snapshot) => {
        const workouts = [];
        snapshot.forEach((doc) => {
            workouts.push({ id: doc.id, ...doc.data() });
        });
        workouts.sort((a, b) => {
            // Sort by Featured first
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;

            // Then by Date
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
        callback(workouts);
    });
};

export const toggleFeatured = async (workoutId, isFeatured) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, workoutId), {
            isFeatured: isFeatured
        });
    } catch (e) {
        console.error("Error toggling featured status: ", e);
        throw e;
    }
};

export const cloneWorkout = async (originalWorkout, currentUser) => {
    try {
        const { uid: currentUserId, displayName } = currentUser;

        // Validation: Verify workout exists and is public (unless owner is cloning own)
        const freshDoc = await getDoc(doc(db, COLLECTION_NAME, originalWorkout.id));
        if (!freshDoc.exists()) {
            throw new Error("Workout does not exist");
        }
        const freshData = freshDoc.data();
        if (!freshData.isPublic && freshData.userId !== currentUserId) {
            throw new Error("Cannot clone private workout");
        }

        // Check if already cloned
        const existingCloneQuery = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", currentUserId),
            where("clonedFrom", "==", originalWorkout.id)
        );
        const existingDocs = await getDocs(existingCloneQuery);
        if (!existingDocs.empty) {
            throw new Error("You have already cloned this workout.");
        }

        const batch = writeBatch(db);

        // 1. Create new workout ref
        const newWorkoutRef = doc(collection(db, COLLECTION_NAME));

        // Remove ID from original data to avoid collision
        const { id, ...workoutDataWithoutId } = originalWorkout;

        batch.set(newWorkoutRef, {
            ...workoutDataWithoutId,
            userId: currentUserId,
            createdBy: displayName || "Unknown User",
            isPublic: false, // Clones are private by default
            clonedFrom: originalWorkout.id,
            createdAt: serverTimestamp()
        });

        // 2. Fetch original exercises
        const exercisesSnapshot = await getDocs(collection(db, COLLECTION_NAME, originalWorkout.id, "exercises"));

        // 3. Add exercises to new workout
        exercisesSnapshot.forEach((exDoc) => {
            const newExerciseRef = doc(collection(db, COLLECTION_NAME, newWorkoutRef.id, "exercises"));
            batch.set(newExerciseRef, {
                ...exDoc.data(),
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        return newWorkoutRef.id;
    } catch (e) {
        console.error("Error cloning workout: ", e);
        throw e;
    }
};

// --- Exercises Sub-collection ---

export const getWorkout = async (workoutId) => {
    const docRef = doc(db, COLLECTION_NAME, workoutId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

export const subscribeToExercises = (workoutId, callback) => {
    const q = query(
        collection(db, COLLECTION_NAME, workoutId, "exercises")
    );

    return onSnapshot(q, (snapshot) => {
        const exercises = [];
        snapshot.forEach((doc) => {
            exercises.push({ id: doc.id, ...doc.data() });
        });
        // Sort by added time
        exercises.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        callback(exercises);
    });
};

export const addExercise = async (workoutId, exerciseData) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME, workoutId, "exercises"), {
            ...exerciseData,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error adding exercise: ", e);
        throw e;
    }
};

export const deleteExercise = async (workoutId, exerciseId) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, workoutId, "exercises", exerciseId));
    } catch (e) {
        console.error("Error deleting exercise: ", e);
        throw e;
    }
};

// --- User Profile ---

export const createUserProfile = async (userId, profileData) => {
    try {
        await setDoc(doc(db, "users", userId), {
            ...profileData,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error creating profile: ", e);
        throw e;
    }
};

export const getUserProfile = async (userId) => {
    try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (e) {
        console.error("Error fetching profile: ", e);
        throw e;
    }
};

// --- Progress Tracking ---

export const markWorkoutComplete = async (userId, workoutId, workoutName, exercises = []) => {
    try {
        await addDoc(collection(db, "users", userId, "completedWorkouts"), {
            workoutId,
            workoutName,
            exercises, // Save snapshot of exercises
            completedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error completing workout: ", e);
        throw e;
    }
};

export const getStats = async (userId) => {
    try {
        // Active Plans
        const workoutsQuery = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
        const workoutsSnap = await getCountFromServer(workoutsQuery);

        // Completed Workouts
        const completedQuery = collection(db, "users", userId, "completedWorkouts");
        const completedSnap = await getCountFromServer(completedQuery);

        return {
            activePlans: workoutsSnap.data().count,
            completedWorkouts: completedSnap.data().count
        };
    } catch (e) {
        console.error("Error getting stats: ", e);
        return { activePlans: 0, completedWorkouts: 0 };
    }
};

export const getAllUsers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching users: ", e);
        return [];
    }
};
// Update User Profile (Admin)
export const updateUser = async (userId, data) => {
    try {
        await updateDoc(doc(db, "users", userId), data);
    } catch (e) {
        console.error("Error updating user: ", e);
        throw e;
    }
};

// --- Feedback System ---

// --- Feedback System ---

export const sendFeedback = async (trainerId, traineeId, message, senderId) => {
    try {
        await addDoc(collection(db, "feedback"), {
            trainerId,
            traineeId,
            message,
            senderId, // New field to identify sender
            createdAt: serverTimestamp(),
            read: false
        });
    } catch (e) {
        console.error("Error sending feedback: ", e);
        throw e;
    }
};

export const subscribeToFeedback = (userId, role, callback) => {
    // If trainee, subscribe to all messages with their ID (both to/from them)
    // If trainer, we usually want messages for a specific trainee, but for now let's simplify:
    // This function will primarily be used by certain views.

    // Let's create a generic query based on the participation
    // For Trainee Dashboard: Get all messages involving this trainee
    let q;

    if (role === 'trainee') {
        q = query(
            collection(db, "feedback"),
            where("traineeId", "==", userId)
        );
    } else if (role === 'admin') {
        // Admin sees ALL feedback
        q = query(collection(db, "feedback"));
    } else {
        // For Trainer: We typically want messages for *all* their trainees or a specific one
        // For efficiency, we might want to fetch all messages where trainerId == userId
        q = query(
            collection(db, "feedback"),
            where("trainerId", "==", userId)
        );
    }

    return onSnapshot(q, (snapshot) => {
        const feedback = [];
        snapshot.forEach((doc) => {
            feedback.push({ id: doc.id, ...doc.data() });
        });
        // Sort by newest
        feedback.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(feedback);
    });
};

export const markMessagesAsRead = async (trainerId, traineeId) => {
    try {
        // Query unread messages from this trainee to this trainer
        const q = query(
            collection(db, "feedback"),
            where("trainerId", "==", trainerId),
            where("traineeId", "==", traineeId),
            where("senderId", "==", traineeId), // Only messages sent BY the trainee
            where("read", "==", false)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
    } catch (e) {
        console.error("Error marking messages as read: ", e);
        throw e;
    }
};

export const deleteFeedback = async (feedbackId) => {
    try {
        await deleteDoc(doc(db, "feedback", feedbackId));
    } catch (e) {
        console.error("Error deleting feedback: ", e);
        throw e;
    }
};

export const getCompletionHistory = async (userId) => {
    try {
        const q = query(
            collection(db, "users", userId, "completedWorkouts"),
            orderBy("completedAt", "desc"),
            limit(7)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching history: ", e);
        return [];
    }
};
