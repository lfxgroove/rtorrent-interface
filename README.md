# rtorrent-interface

Compatible with python 3.

To get started copy `cfg/rtorrent-interface.cfg.dist` to
`cfg/rtorrent-interface.cfg` and configure it to your liking.
Then run ./rpc.py and see all rtorrent methods that are
available.

# Todo
* Be notified in some way when a torrent is finished

## Via website
* Support for adding a torrent
* Support for showing progress of torrents
* Support for showing list of torrents

## Via website API
* Add a torrent


# XMLRPC API calls

Rtorrent works with hashes by default, which identify each
download/torrent.

| Call name                      | What it does                                                                                                |
|--------------------------------|-------------------------------------------------------------------------------------------------------------|
| download_list                  | Gives a list of all downloads in the main view. The returned list is a list of hashes.                      |
| load_start, load_start_verbose | Loads the given path/magnet link and starts it. Always seems to return 0                                    |
| d.pause                        | Pauses a download, needs the hash to pause as a parameter                                                   |
| d.resume                       | Resumes a download, needs the hash to resume as a parameter. Good idea to check is_open before calling this |
| load, load_verbose             | Loads the given path/magnet link. You need to call start for it to start downloading                        |
| start                          | Start the given download, needs the hash as a parameter                                                     |
