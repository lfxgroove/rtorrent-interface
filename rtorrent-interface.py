#!./bin/python3
from functools import wraps
from rpc import RTorrentXMLRPCClient
import os
from flask import Flask, g, json, request
from flask_jwt import JWT, jwt_required
app = Flask(__name__)

RTORRENT_XMLRPC_CONFIG_PATH = './cfg/rtorrent-interface.cfg'
#Set this to something long and random, use for json web token
SECRET_KEY = 'supersecretkey'
#Tokens expire in an hour
JWT_EXPIRATION_DELTA = 3600
#Configure username and password with which you login
USERNAME = 'arne'
PASSWORD = 'arne'
app.config.from_object(__name__)

jwt = JWT(app)

class User:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

@jwt.authentication_handler
def authenticate(username, password):
    if username == app.config['USERNAME'] and \
       password == app.config['PASSWORD']:
        return User(id=1, name='arne')

@jwt.user_handler
def load_user(payload):
    if payload['user_id'] == 1:
        return User(id=1, name=app.config['USERNAME'])
    
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
        if not g.rtorrent.is_connected():
            return json.jsonify({'data': 'Backend not connected to rtorrent'}), 503
        return f(*args, **kwargs)
    return decorated_function

@app.route('/is_available/', methods=['GET'])
@give_xmlrpc_access
@jwt_required()
def is_available():
    """
    Either returns an empty json object if the service is available, or a
    message denoting why it's not available
    """
    return json.jsonify({})

@app.route('/get_torrents/', methods=['GET'])
@give_xmlrpc_access
@jwt_required()
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
    if 'link' not in request.values:
        return json.jsonify({
            'success': False,
            'message': 'You need to send along a link to add'
        }), 400
    link = request.values['link']
    #Simple validation.
    if not link.startswith('magnet:?') or 'xt=' not in link:
        return json.jsonify({
            'success': False,
            'message': 'You can\'t add a non-magnet URI'
        }), 400
    g.rtorrent.load_start(link)
    return json.jsonify({'success': True}), 201

if __name__ == '__main__':
    app.run(debug=True)
