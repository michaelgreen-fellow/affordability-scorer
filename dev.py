#!/usr/bin/env python3
"""
Auto-rebuilding dev server for Affordability for All site.
Run: python3 dev.py
Then open http://localhost:8000

Watches content.json, config.json, templates/, and pages/ for changes.
When any file changes, automatically rebuilds and the next browser refresh
shows the update. No restart needed.
"""

import subprocess
import threading
import time
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# --- Configuration ---
PORT = 8000
WATCH_PATHS = ['content.json', 'config.json', 'templates', 'pages', 'build.py']
BUILD_CMD = [sys.executable, 'build.py']
SERVE_DIR = 'public'

# --- File watcher ---
class FileWatcher:
    def __init__(self, paths):
        self.paths = paths
        self.snapshots = {}
        self.take_snapshot()

    def take_snapshot(self):
        """Record modification times of all watched files."""
        snap = {}
        for p in self.paths:
            path = PROJECT_ROOT / p
            if path.is_file():
                snap[str(path)] = path.stat().st_mtime
            elif path.is_dir():
                for f in path.rglob('*'):
                    if f.is_file():
                        snap[str(f)] = f.stat().st_mtime
        self.snapshots = snap

    def check_changes(self):
        """Return list of changed files since last snapshot."""
        changed = []
        current = {}
        for p in self.paths:
            path = PROJECT_ROOT / p
            if path.is_file():
                current[str(path)] = path.stat().st_mtime
            elif path.is_dir():
                for f in path.rglob('*'):
                    if f.is_file():
                        current[str(f)] = f.stat().st_mtime

        for filepath, mtime in current.items():
            if filepath not in self.snapshots or self.snapshots[filepath] != mtime:
                changed.append(filepath)

        # Check for deleted files
        for filepath in self.snapshots:
            if filepath not in current:
                changed.append(filepath + ' (deleted)')

        if changed:
            self.snapshots = current

        return changed


PROJECT_ROOT = Path(__file__).parent

def rebuild():
    """Run build.py and return success/failure."""
    print('\n  Rebuilding...', flush=True)
    result = subprocess.run(BUILD_CMD, capture_output=True, text=True, cwd=str(PROJECT_ROOT))
    if result.returncode == 0:
        print('  Build complete. Refresh your browser.\n', flush=True)
        return True
    else:
        print(f'  BUILD FAILED:\n{result.stderr}\n', flush=True)
        return False


def watch_loop(watcher):
    """Poll for file changes every 1 second."""
    while True:
        time.sleep(1)
        changes = watcher.check_changes()
        if changes:
            short_names = [os.path.basename(c) for c in changes[:3]]
            label = ', '.join(short_names)
            if len(changes) > 3:
                label += f' (+{len(changes) - 3} more)'
            print(f'  Changed: {label}', flush=True)
            rebuild()


def main():
    # Ensure we're in the project root (where build.py lives)
    project_root = Path(__file__).parent
    os.chdir(project_root)

    # Initial build
    print('=' * 50)
    print('  Affordability for All - Dev Server')
    print('=' * 50)
    print()
    rebuild()

    # Start file watcher in background thread
    watcher = FileWatcher(WATCH_PATHS)
    watch_thread = threading.Thread(target=watch_loop, args=(watcher,), daemon=True)
    watch_thread.start()

    # Start HTTP server from public/ directory
    serve_path = str(PROJECT_ROOT / SERVE_DIR)
    os.chdir(serve_path)

    class QuietHandler(SimpleHTTPRequestHandler):
        """Suppress the default request logging noise."""
        def log_message(self, format, *args):
            # Only log errors, not every GET request
            if '404' in str(args) or '500' in str(args):
                super().log_message(format, *args)

    server = HTTPServer(('', PORT), QuietHandler)

    print(f'  Serving at http://localhost:{PORT}')
    print(f'  Watching: {", ".join(WATCH_PATHS)}')
    print(f'  Edit any watched file and refresh your browser.')
    print(f'  Press Ctrl+C to stop.\n')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Server stopped.')
        server.server_close()


if __name__ == '__main__':
    main()
