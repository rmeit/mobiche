# 🌌 Mobius Chess

Welcome to **Mobius Chess**! This is a 3D chess game played on a Mobius strip—a mind-bending, single-sided surface where the board twists and connects to itself. Because of the board's unique geometry, the pieces move around the surface in ways not possible on a normal flat board.

This guide will show you how to set up and play the game, assuming **absolutely zero programming knowledge**. 

---

## 🚀 How to Set Up and Run the Game

Follow these simple step-by-step instructions to start the game on your computer:

### Step 1: Open your Terminal (Mac) or Command Prompt (Windows)
You will need to use a text-based window to start the game.
*   **On Mac**: Press `Command (⌘) + Space` on your keyboard, type **Terminal**, and press `Enter`.
*   **On Windows**: Press the `Windows Logo Key`, type **Command Prompt** (or **cmd**), and press `Enter`.

### Step 2: Go to the Game Folder in the Terminal
You need to point the terminal window to this `mobiche` folder:
1.  Type `cd ` (make sure there is a space after `cd`).
2.  Find this game folder (`mobiche`) on your computer.
3.  Drag and drop the folder directly from your file explorer (Finder on Mac, File Explorer on Windows) into the terminal window. This will automatically paste the folder's location.
4.  Press `Enter`.
    *   *Example of what it will look like:* `cd /Users/yourusername/Desktop/mobiche`

### Step 3: Install "uv" (The runner tool)
We use a small, safe utility helper called `uv` to download Python (the system that runs the background game server) and start the app automatically. 

Copy the correct command below, paste it into your terminal, and press `Enter`:

*   **For Mac / Linux**:
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```
*   **For Windows**:
    ```powershell
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    ```

> 💡 **Note**: If the installation asks you to restart your terminal or shell, close your current terminal window, open a new one, and repeat **Step 2** to go back into the game folder.

### Step 4: Start the Game Server
Now, run the following simple command:
```bash
uv run main.py
```
This command will automatically set up Python and start the game server. You will see text pop up, ending with something like:
`Serving HTTP on :: port 8000 (http://[::]:8000/) ...`

> ⚠️ **Important**: Leave this terminal window open! If you close it, the game server will shut down and the website will stop working.

### Step 5: Play the Game in Your Browser
1.  Open your favorite web browser (such as Google Chrome, Safari, Microsoft Edge, or Firefox).
2.  Type this address into the URL bar at the top:
    ```
    http://localhost:8000
    ```
3.  Press `Enter`, and start playing!

---

## 🎮 How to Control and Play the Game

*   **Look Around the Board**: Click and drag your mouse anywhere on the screen to rotate and view the board from different angles in 3D.
*   **Zoom In/Out**: Use your mouse scroll wheel (or trackpad pinch-to-zoom) to zoom.
*   **Move a Piece**: 
    1. Click on any of your pieces (White always moves first). 
    2. Valid movement squares will highlight in **green**.
    3. Occupied squares that you can capture will highlight in **red**.
    4. Click on any highlighted square to move there.
*   **The Twist (Wrap-Around)**: The board has 16 rows. Because it is a Mobius strip, the top of the board connects to the bottom of the board with a horizontal flip (reversing the left/right columns). Keep this in mind when planning long-range diagonal moves!
*   **Pawn Promotion**: When a pawn crosses over to the opponent's starting side, a menu will pop up on the screen allowing you to choose whether to promote it to a Queen, Rook, Knight, or Bishop.

---

## 🛠️ Troubleshooting & Tips

*   **The webpage is blank / doesn't load**: Ensure your terminal window from **Step 4** is still open and running.
*   **How to stop the server**: When you are done playing, go to the terminal window and press `Control + C` on your keyboard. This will safely shut down the server.
*   **Port 8000 is busy error**: If another application on your computer is already using port 8000, you can run the server on a different port (like 8080) by running:
    ```bash
    uv run python -m http.server 8080
    ```
    Then, open `http://localhost:8080` in your web browser instead.
