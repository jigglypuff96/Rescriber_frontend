# Rescriber Installation and Uninstallation Guide

---

## Installation Instructions

---

### Prerequisites:

1. **Install Python 3:**  
   Download Python 3 from [https://www.python.org/downloads/](https://www.python.org/downloads/). Make sure you can run Python scripts using the command line:

   ```
   python3 [FILENAME]
   ```

   or

   ```
   python [FILENAME]
   ```

   Ensure you also have `pip` or `pip3` available for installing dependencies:  
   [https://pypi.org/project/pip/](https://pypi.org/project/pip/).

2. **Install Ollama:**  
   Download Ollama from [https://ollama.com/download/Ollama-darwin.zip](https://ollama.com/download/Ollama-darwin.zip).

3. **Install Google Chrome:**  
   Ensure Chrome is installed on your Mac and closed before proceeding.

---

### Steps:

1. **Download and Set Up Frontend:**  
   Download the ZIP file from [https://github.com/jigglypuff96/inline_pii_replacer/tree/ondevice](https://github.com/jigglypuff96/inline_pii_replacer/tree/ondevice) and unzip it inside your Mac `Downloads` folder.

2. **Download and Set Up Backend:**  
   Download the ZIP file from [https://github.com/jigglypuff96/pii_backend](https://github.com/jigglypuff96/pii_backend) and unzip it inside your Mac `Downloads` folder.

3. **Start the Backend Server:**  
   Open **Terminal**, and type the following commands:

   ```
   cd ~/Downloads/pii_backend-main
   pip install -r requirements.txt  # or pip3 install -r requirements.txt
   python prod.py  # or python3 prod.py
   ```

   **Note:** Wait until you see the following message in the terminal:  
   `"Initialization complete. Now you can start using the tool!"`

4. **Launch Chrome with SSL Error Ignored:**  
   Open a new **Terminal**, and type the following commands:

   ```
   killall Google\ Chrome
   open -a "Google Chrome" --args --ignore-certificate-errors
   ```

5. **Install the Chrome Extension:**

   - Open Chrome and go to [chrome://extensions](chrome://extensions).
   - Enable **Developer Mode** in the top-right corner.
   - Click **Load unpacked** and select the unzipped frontend folder.
   - Check the Chrome extension list to ensure you see **Rescriber** listed.

6. **Start Chatting:**
   - Navigate to [https://chat.openai.com/](https://chat.openai.com/).
   - Verify that a green circle appears in the bottom-right corner of the ChatGPT page.
   - If the green circle does not appear, refresh the page. If it still doesn't appear, please contact the research team.
   - To start the study, copy and paste the content from this document:  
     [https://docs.google.com/document/d/1_rLaj6Ap0zFebnS-yZTCbe9Sz1-O4-aBKdyJdbjVvu0/edit?usp=sharing](https://docs.google.com/document/d/1_rLaj6Ap0zFebnS-yZTCbe9Sz1-O4-aBKdyJdbjVvu0/edit?usp=sharing).

---

## Uninstallation Instructions

---

### 1. **Stop the Backend Server**

1. Open the **Terminal** where you ran the `python prod.py` command.
2. Stop the backend process by pressing `CTRL+C` in that terminal.
3. To ensure no processes are still using the backend port `5331`:
   - Open **Terminal** and type the following command:
     ```
     lsof -i :5331
     ```
   - If any process is shown, type this command to stop it:
     ```
     kill -9 [PID]
     ```
     Replace `[PID]` with the actual process ID displayed in the previous command.

---

### 2. **Remove Backend and Frontend Files**

1. Locate the **backend** and **frontend** folders on your computer (e.g., `~/Downloads/pii_backend-main` and `~/Downloads/inline_pii_replacer-main`).
2. Delete the folders by doing either of the following:
   - **Option 1 (Using Terminal):** Open **Terminal** and type these commands to delete the folders:
     ```
     rm -rf ~/Downloads/pii_backend-main
     rm -rf ~/Downloads/inline_pii_replacer-main
     ```
   - **Option 2 (Using Finder):** Drag the folders into the Trash.

---

### 3. **Remove Chrome Extension**

1. Open Google Chrome and go to the extension management page:  
   [chrome://extensions](chrome://extensions)
2. Find the **Rescriber** extension in the list.
3. Click **Remove** and confirm.

---

### 4. **Revert Chrome SSL Settings**

If you launched Chrome with `--ignore-certificate-errors`, close Chrome and restart it normally:

1. Open **Terminal** and type:
   ```
   killall Google\ Chrome
   ```
2. Then restart Chrome normally:
   ```
   open -a "Google Chrome"
   ```

---

### 5. **Optional: Uninstall Python, Ollama, or Google Chrome**

If you installed Python, Ollama, or Google Chrome specifically for this tool, you can optionally uninstall them.

- **Uninstall Python:**

  - If you're unsure about Python's installation method, it may be best to leave it installed, as Python is commonly used.
  - To uninstall Python from your Mac:
    ```
    brew uninstall python
    ```
    _(if you installed Python via Homebrew)_  
    Or manually delete the Python installation from `/Library/Frameworks/Python.framework/` if you installed it from the official Python website.

- **Uninstall Ollama:**

  1. Open **Finder**.
  2. Navigate to `/Applications`.
  3. Drag the **Ollama.app** file to the Trash.

- **Uninstall Google Chrome:**
  1. Open **Finder**.
  2. Navigate to `/Applications`.
  3. Drag the **Google Chrome.app** file to the Trash.

---

### 6. **Verify Cleanup**

1. Ensure the backend and frontend folders have been deleted.
2. Verify the **Rescriber** extension is no longer in the Chrome extension list.
3. Restart Chrome and check that there are no green circles or tool-related features when accessing ChatGPT.
