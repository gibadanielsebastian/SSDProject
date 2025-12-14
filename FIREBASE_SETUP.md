# Firebase Setup Guide

Follow these steps to get your **API Key**, **App ID**, and enable the necessary services.

## 1. Get Your Configuration Keys
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click on your project (**fitup-c2e8c**).
3.  Click the **Gear Icon** ⚙️ (Project Settings) in the top-left sidebar.
4.  Scroll down to the **"Your apps"** section.
5.  If you haven't created a Web App yet, click the **</> (Web)** icon.
    *   Nickname: `fitup-web`
    *   **Uncheck** "Also set up Firebase Hosting" (we can do this later).
    *   Click **Register app**.
6.  You will see a code block with `const firebaseConfig = { ... }`.
7.  Copy the values for `apiKey`, `storageBucket`, and `appId`.
8.  **Paste them into `src/lib/firebase/firebase.js`**.

## 2. Enable Authentication (Social Login)
1.  Go to **Build** > **Authentication** in the left sidebar.
2.  Click **Get Started**.
3.  Click the **Sign-in method** tab.
4.  Select **Google**.
    *   Click **Enable**.
    *   Select a **Project support email**.
    *   Click **Save**.
5.  (Optional) Select **Email/Password**.
    *   Click **Enable**.
    *   Click **Save**.

## 3. Enable Cloud Firestore (Database)
1.  Go to **Build** > **Firestore Database**.
2.  Click **Create Database**.
3.  Choose a location (e.g., `eur3` for Europe or `nam5` for US).
4.  **Important:** Start in **Test Mode** (allows read/write for now).
    *   *We will secure this later.*
5.  Click **Create**.

## 4. Enable Storage (Images/Videos)
1.  Go to **Build** > **Storage**.
2.  Click **Get Started**.
3.  Start in **Test Mode**.
4.  Click **Done**.

Once you have done these steps and updated `src/lib/firebase/firebase.js`, let me know!
