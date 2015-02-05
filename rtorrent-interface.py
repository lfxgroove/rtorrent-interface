#!./bin/python3
from functools import wraps
from rpc import RTorrentXMLRPCClient
import os
from flask import Flask, g, json, request
app = Flask(__name__)

RTORRENT_XMLRPC_CONFIG_PATH = './cfg/rtorrent-interface.cfg'
app.config.from_object(__name__)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/js/<path>')
def static_proxy_js(path):
    return app.send_static_file(os.path.join('js', path))

@app.route('/css/<path>')
def static_proxy_css(path):
    return app.send_static_file(os.path.join('css', path))

@app.route('/fonts/<path>')
def static_fonts_css(path):
    return app.send_static_file(os.path.join('fonts', path))

def give_xmlrpc_access(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        g.rtorrent = RTorrentXMLRPCClient(app.config['RTORRENT_XMLRPC_CONFIG_PATH'])
        return f(*args, **kwargs)
    return decorated_function

@app.route('/get_torrents/', methods=['GET'])
@give_xmlrpc_access
def get_torrents():
    """
    Returns a list of all current torrents that available as json.
    Data returned:
    * Torrent hash
    * Torrent name
    * Completion in percent
    """
    torrents = []
    for hash in g.rtorrent.download_list():
        name = g.rtorrent.d.get_name(hash)
        completed_bytes = int(g.rtorrent.d.get_completed_bytes(hash))
        total_bytes = int(g.rtorrent.d.get_size_bytes(hash))
        progress = round(100 * (completed_bytes / total_bytes))
        torrents.append({
            'name': name,
            'progress': progress
        })
    return json.jsonify({'data': torrents})

@app.route('/add_magnet/', methods=['POST'])
@give_xmlrpc_access
def add_magnet():
    """
    Adds a magnet link to the downloads list and starts it.
    Required parameters:
    * magnet link
    """
    g.rtorrent.load_start(request.values['link'])
    return json.jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)
