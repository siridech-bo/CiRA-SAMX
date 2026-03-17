#!/usr/bin/env python3
"""Dev server with COOP/COEP headers for SAM Browser Test."""

import http.server
import sys

PORT = 3333


class COOPCOEPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


if __name__ == '__main__':
    print()
    print('  SAM Browser Test Server (Python)')
    print('  ==================================')
    print(f'  URL: http://localhost:{PORT}')
    print()
    print('  COOP/COEP headers: ACTIVE')
    print('  First model download is ~375MB (cached in IndexedDB after)')
    print()

    server = http.server.HTTPServer(('', PORT), COOPCOEPHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.server_close()
