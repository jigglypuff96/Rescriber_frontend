# Installation Guide

## **Prerequisites**

1. **Install Python 3:**

   - Download Python 3 from [https://www.python.org/downloads/](https://www.python.org/downloads/).
   - Ensure you can run Python scripts using the command line:
     ```bash
     python3 --version
     ```
     or:
     ```bash
     python --version
     ```
   - Ensure `pip` or `pip3` is available for installing dependencies:  
     [https://pypi.org/project/pip/](https://pypi.org/project/pip/).

2. **Install Ollama:**

   - Download and install Ollama from [https://ollama.com/download/Ollama-darwin.zip](https://ollama.com/download/Ollama-darwin.zip).

3. **Install Google Chrome:**
   - Ensure Chrome is installed and and it will later be closed before using the tool.

---

## **Steps**

1. **Download and Set Up Frontend:**

   - Download the ZIP file from [https://github.com/jigglypuff96/inline_pii_replacer/tree/ondevice](https://github.com/jigglypuff96/inline_pii_replacer/tree/ondevice).
   - Unzip it inside your Mac's `Downloads` folder.

2. **Download and Set Up Backend:**

   - Download the ZIP file from [https://github.com/jigglypuff96/pii_backend](https://github.com/jigglypuff96/pii_backend).
   - Unzip it inside your Mac's `Downloads` folder.

3. **Start the Backend Server:**

   - Open **Terminal** and type the following commands line by line:
     ```bash
     cd ~/Downloads/pii_backend-main
     pip install -r requirements.txt  # or pip3 install -r requirements.txt
     python prod.py  # or python3 prod.py
     ```
   - Wait for the message `"Initialization complete. Now you can start using the tool!"` to appear in the terminal.

4. **Close and Launch Chrome with SSL Error Ignored:**

   - Open a new **Terminal** and type the following command line by line:
     ```bash
     killall Google\ Chrome
     open -a "Google Chrome" --args --ignore-certificate-errors
     ```

5. **Install the Chrome Extension:**

   - Go to [chrome://extensions](chrome://extensions).
   - Follow the instructions at [https://github.com/jigglypuff96/inline_pii_replacer/blob/ondevice/InstallChromeExtension.md](https://github.com/jigglypuff96/inline_pii_replacer/blob/ondevice/InstallChromeExtension.md) to install the extension.
   - Verify that the extension **"Rescriber"** appears in the list of installed extensions.

6. **Start Chatting:**
   - Navigate to [https://chat.openai.com/](https://chat.openai.com/).
   - Check the bottom-right corner of the page for a green circle.
     - If you don’t see it, refresh the page.
     - If it still doesn’t appear, contact the research team.
   - Use this link to copy and paste content into the chat:  
     [https://docs.google.com/document/d/1_rLaj6Ap0zFebnS-yZTCbe9Sz1-O4-aBKdyJdbjVvu0/edit?usp=sharing](https://docs.google.com/document/d/1_rLaj6Ap0zFebnS-yZTCbe9Sz1-O4-aBKdyJdbjVvu0/edit?usp=sharing).

---

# Uninstallation Guide

## **Stop the Backend Server**

1. Open the **same terminal** where you ran `python prod.py`.
2. Press `Control + C` to stop the server.

---

## **Remove Backend and Frontend Files**

1. **Locate the files:**

   - The backend files are in the `~/Downloads/pii_backend-main` folder.
   - The frontend files are in the `~/Downloads/inline_pii_replacer-ondevice` folder.

2. **Delete the folders:**
   - Drag both folders to the Trash.

---

## **Uninstall the Chrome Extension**

1. Go to [chrome://extensions](chrome://extensions).
2. Locate the extension named **"Rescriber"**.
3. Click **Remove** to uninstall it.

---

## **Optional Uninstall Steps**

If you installed Python, Ollama, or Google Chrome specifically for this task, you can uninstall them as follows:

1. **Uninstall Python:**

   - **If installed using `brew`:**
     ```bash
     brew uninstall python
     ```
   - **If installed manually:**
     - Open Finder and go to `/Library/Frameworks/Python.framework/Versions/`.
     - Delete the folder corresponding to the Python version you installed.
     - Remove the `python3` or `python` binary from `/usr/local/bin/`.

2. **Uninstall Ollama:**

   - Find the Ollama app in your Applications folder.
   - Drag it to the Trash.

3. **Uninstall Google Chrome:**
   - Find the Chrome app in your Applications folder.
   - Drag it to the Trash.
