#!/edit/to/path/to/your/virtualenv/python3

import traceback
import sys

if __name__ == '__main__':
    with open('testfile', 'w') as file:
        file.write('hello world')
        try:
            file.write(sys.argv[1])
            file.write('\n')
            file.write(sys.argv[2])
            file.write('\n')
        except:
            file.write(traceback.format_exc())

