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

<table>
    <thead>
        <th>Call name</th>
        <th>Parameters</th>
        <th>What it does</th>
    </thead>
    <tbody>
        <tr>
            <td>download_list</td>
            <td>none</td>
            <td>Returns an array/list of all hashes that are in the main view.</td>
        </tr>
        <tr>
            <td>load_start</td>
            <td>torrent_path/magnet_link</td>
            <td>Loads the given path/magnet link and starts it. Always seems to return 0</td>
        </tr>
        <tr>
            <td>load_start_verbose</td>
            <td>See load_start</td>
            <td>See load_start</td>
        </tr>
        <tr>
            <td>d.pause</td>
            <td>hash</td>
            <td>Pauses the given download</td>
        </tr>
        <tr>
            <td>d.resume</td>
            <td>hash</td>
            <td>Resumes a download, it's a good idea to call is_open before calling this.</td>
        </tr>
        <tr>
            <td>load</td>
            <td>torrent_path/magnet_link</td>
            <td>Does the same as load_start but doesn't start downloading the torrent. TODO: return values?</td>
        </tr>
        <tr>
            <td>load_verbose</td>
            <td>See load</td>
            <td>See load</td>
        </tr>
        <tr>
            <td>start</td>
            <td>hash</td>
            <td>Start the given download</td>
        </tr>
        <tr>
            <td>d.get_name</td>
            <td>hash</td>
            <td>Retrieve the name of the torrent with the given hash. Does not have anything to do with the
            name of the individual files in this torrent.</td>
        </tr>
        <tr>
            <td>d.get_completed_bytes</td>
            <td>hash</td>
            <td>Get the amount of bytes that are completed for the given torrent hash</td>
        </tr>
        <tr>
            <td>d.get_size_bytes</td>
            <td>hash</td>
            <td>Get the total size in bytes of the given torrent hash</td>
        </tr>    
    </tbody>
</table>
