import subprocess
import sys
import time
import psutil


# Path to TarkovRPC
node_app_path = r"rpc\TarkovRPC-Controller.exe"
working_directory = r"rpc"

# EFT Process check
def is_process_running(process_name):
    for proc in psutil.process_iter():
        if process_name.lower() in proc.name().lower():
            return True
    return False


print("Looking for EscapeFromTarkov.exe...")

# im so lazy to write a ws check in python, so its better if i just leave the timer here
delay_seconds = 45

while True:
    if is_process_running("EscapeFromTarkov.exe"):
        print("EscapeFromTarkov.exe found, waiting WS...")
        time.sleep(delay_seconds)  # THE DELAY
        print("Running RPC...")

        try:
            # running the thing...?
            process = subprocess.Popen([node_app_path], cwd=working_directory)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

        while is_process_running("EscapeFromTarkov.exe"):
            time.sleep(1)

        # when EFT is closed, we kill RPC
        print("EscapeFromTarkov.exe closed, killing RPC...")

        try:
            subprocess.run(["taskkill", "/f", "/im", "TarkovRPC-Controller.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        except Exception as e:
            print(f"Something went wrong: {e}")
            sys.exit(1)
            
        print("Waiting for the process to start RPC again...")