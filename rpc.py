#!./bin/python

import xmlrpc.client
import configparser
from unixstreamtransport import UnixStreamTransport

def main():
    config = configparser.ConfigParser()
    config.read('./cfg/rtorrent-interface.cfg')
    scgi_path = config['DEFAULT']['rtorrent_scgi_path']
    unix_transport = UnixStreamTransport(socketpath=scgi_path)
    rtorrentclient = xmlrpc.client.ServerProxy('http://localhost/', transport=unix_transport)
    for method in rtorrentclient.system.listMethods():
        print('Method: ', method)

if __name__ == '__main__':
    main()
