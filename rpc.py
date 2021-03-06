#!./bin/python

import xmlrpc.client
import configparser
import os
from unixstreamtransport import UnixStreamTransport

class RTorrentXMLRPCClient(xmlrpc.client.ServerProxy):
    def __init__(self, config_path):
        self._config_path = config_path
        config = configparser.ConfigParser()
        config.read(self._config_path)
        scgi_path = config['DEFAULT']['rtorrent_scgi_path']
        transport = UnixStreamTransport(socketpath=scgi_path)
        super(RTorrentXMLRPCClient, self).__init__('http://localhost/',
                                                   transport=transport)
        #print(os.getcwd() + '/posthook.py')
        self.system.method.set_key('event.download.finished',
                                   'post_hook_rtorrent_interface',
                                   'execute=' + os.getcwd() + '/posthook.py,' +
                                   '$d.get_base_path=,$d.get_name=')

    def is_connected(self):
        try:
            self.download_list()
            return True
        except OSError:
            return False

def main():
    # config = configparser.ConfigParser()
    # config.read('./cfg/rtorrent-interface.cfg')
    # scgi_path = config['DEFAULT']['rtorrent_scgi_path']
    # unix_transport = UnixStreamTransport(socketpath=scgi_path)
    # rtorrent = xmlrpc.client.ServerProxy('http://localhost/', transport=unix_transport)
    rtorrent = RTorrentXMLRPCClient('./cfg/rtorrent-interface.cfg')
    #for method in rtorrent.system.listMethods():
        #print('Method: ', method)
    doStuff(rtorrent)
        
def doStuff(rtorrent):
    print(rtorrent.load_start_verbose('magnet:?xt=urn:btih:6bc061eab1d364fcc135ae02f643c4a7ee475b80&dn=archlinux-2015.02.01-dual.iso&tr=udp://tracker.archlinux.org:6969&tr=http://tracker.archlinux.org:6969/announce'))
    print(rtorrent.download_list())
    downloads = rtorrent.download_list()
    for dl in downloads:
        print(rtorrent.d.get_directory(dl))
        print(rtorrent.d.get_name(dl))
        files = []
        # multicall = xmlrpc.client.MultiCall(rtorrent.f)
        # multicall.get_path_components(dl)
        # multicall.get_size_bytes(dl)
        # multicall.get_size_chunks(dl)
        # multicall.get_completed_chunks(dl)
        # multicall.get_priority(dl)
        # print(rtorrent.f.get_path_components(dl, 0))
        #resp = multicall()
        # resp = rtorrent.f.multicall(
        #     id,
        #     "",
        #     "f.get_path_components=",
        #     "f.get_size_bytes=",
        #     "f.get_size_chunks=",
        #     "f.get_completed_chunks=",
        #     "f.get_priority=",
        # )
        # for file in resp:
        #     #print(file)
        #     path_split = file[0]
        #     rel_path = "/".join(path_split)
        #     size_bytes = file[1]
        #     size_chunks = file[2]
        #     completed_chunks = file[3]
        #     chunk_size = self.conn.d.get_chunk_size(id)
        #     priority = file[4]
        #     base_path = self.getPath(id)
        #     absolute_path = os.path.join(base_path, rel_path)
        #     files += [File(absolute_path, base_path, path_split, completed_chunks, priority, size_bytes, size_chunks, chunk_size)]
        #print(files)
        #rtorrent.d.stop(dl)
        #rtorrent.d.close(dl)
        #rtorrent.d.erase(dl)

    
if __name__ == '__main__':
    main()
