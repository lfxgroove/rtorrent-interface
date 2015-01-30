import xmlrpc.client
import socket
import io
import re

class UnixStreamTransport(xmlrpc.client.Transport, object):
    """ 
    Implements the Transport interface that's needed to be able to use the
    xmlrpc.client.ServerProxy class. Uses a socket and implements the SCGI
    protocol which is needed for rtorrent communication. See 
    http://python.ca/scgi/protocol.txt for SCGI specifications.
    """
    def __init__(self, *args, **kwargs):
        self.socketpath = kwargs.pop('socketpath')
        self.verbose = False
        super(UnixStreamTransport, self).__init__(*args, **kwargs)

    def send_request(self, conn, data):
        """
        Send a request to the given connection. This will also parse the
        answer so much that the parser the a Transport usually has access
        to can do its work. We pretty much remove the HTTP headers that
        the server answers with.
        """
        conn.send(data)
        recvvalue = conn.recv(4096)
        totalread = len(recvvalue)
        if totalread == 0:
            #Todo: Throw error..
            print('Remote server closed connection!')
            return None
        matches = None
        regex = re.compile('^content-length:(\s*)?([0-9]+)', re.IGNORECASE | re.MULTILINE)
        value = recvvalue.decode('ascii')
        matches = regex.search(value)
        toread = int(matches.group(2))
        while totalread < toread:
            recvvalue += conn.recv(4096)
            totalread = len(recvvalue)
        asbytes = io.BytesIO(recvvalue)
        #Read away what the parser won't understand, ie: http headers
        asbytes.read(recvvalue.decode('ascii').index('\r\n\r\n') + 4)
        return super(UnixStreamTransport, self).parse_response(asbytes)

    #Order matters, the content length must be _first_ according to the spec:
    #http://python.ca/scgi/protocol.txt
    def make_scgi_request(self, data, handler):
        """
        Creates a SCGI request which contains the given data and the handler
        as the REQUEST_URI parameter. The REQUEST_METHOD is always POST.
        """
        headers = [
            ('CONTENT_LENGTH', str(len(data))),
            ('SCGI', '1'),
            ('REQUEST_METHOD', 'POST'),
            ('REQUEST_URI', str(handler))
        ]
        headerstr = self.encode_netstring(headers)
        return headerstr.encode('ascii') + data

    def encode_netstring(self, headers):
        """
        Encodes the given headers as netcode as specified in the SCGI spec.
        headers is an array of (key, value) tuples. Returns the encoded
        netstring
        """
        #accomodates the last ,
        totallen = 1
        for header in headers:
            #This is each header key and value and their null-terminators
            totallen += len(header[0]) + len(headers[1]) + 2
        result = [str(totallen), ':']
        for header in headers:
            result.append('{0}\0{1}\0'.format(header[0], header[1]))
        result.append(',')
        return ''.join(result)
    
    def close(self):
        """
        Closes the open connection we have
        """
        self.sock.close()

    def request(self, host, handler, request, verbose=False):
        """
        Make a request to the given handler. The host parameter is ignored as
        that is set when constructing this class. Request should be the bytes
        you would like to include in the request. Typically a xmlrpc call.
        """
        conn = self.make_connection()
        return self.send_request(conn, self.make_scgi_request(request, handler))

    def make_connection(self):
        """
        Create a connection to the server we're interested in. 
        """
        self._sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self._sock.connect_ex(self.socketpath)
        return self._sock
