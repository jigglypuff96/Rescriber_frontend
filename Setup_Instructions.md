
# Prerequisites:

1. **Install Python 3:**  
   Download Python 3 from [https://www.python.org/downloads/](https://www.python.org/downloads/). Make sure you can run Python scripts using the command line:  
   ```
   python3 [FILENAME] 
   ```
   or  
   ```
   python [FILENAME]
   ```  
   Also, ensure you have `pip` or `pip3` available for installing dependencies:  
   [https://pypi.org/project/pip/](https://pypi.org/project/pip/).

2. **Install Ollama:**  
   Download Ollama from [https://ollama.com/download/Ollama-darwin.zip](https://ollama.com/download/Ollama-darwin.zip).

3. **Install Google Chrome:**  
   Ensure Chrome is installed on your Mac and closed before proceeding.

---

# Steps:

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

4. **Launch Chrome with SSL Error Ignored:**  
   Open a new **Terminal**, and type the following commands:  
   ```
   killall Google\ Chrome
   open -a "Google Chrome" --args --ignore-certificate-errors
   ```

5. **Install the Chrome Extension:**  
   Go to [chrome://extensions](chrome://extensions), and follow the instructions in the README at [https://github.com/jigglypuff96/inline_pii_replacer/blob/ondevice/README.md](https://github.com/jigglypuff96/inline_pii_replacer/blob/ondevice/README.md) to install the extension.

6. **Start Chatting:**  
   Navigate to [https://chat.openai.com/](https://chat.openai.com/) and start chatting!
