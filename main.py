import http.server
import socketserver
import webbrowser
import argparse
import os
import threading

def serve_app(port):
    handler = http.server.SimpleHTTPRequestHandler
    
    # Change to the directory of this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Serving at http://localhost:{port}")
        
        # Open browser in a separate thread so it doesn't block the server
        def open_browser():
            webbrowser.open(f"http://localhost:{port}")
        
        threading.Timer(0.5, open_browser).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve Mobius Chess")
    parser.add_argument("--port", type=int, default=8080, help="Port to serve on (default: 8080)")
    args = parser.parse_args()
    
    serve_app(args.port)
