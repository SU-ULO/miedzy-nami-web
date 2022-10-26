# usage python verify.py room_key1 room_key2 ...
import sys
import json
import requests
import base64
import hmac

secret = b'ADMIN_SECRET here'

keys = base64.b64encode(json.dumps(sys.argv[1:]).encode('utf-8'))
h = base64.b64encode(hmac.digest(secret, keys, 'sha1')).decode('ascii')
keys = keys.decode('ascii')

response = requests.post('http://server/roomverification', keys+'.'+h, headers={'Content-type': 'text/plain'})

if response.status_code == 204:
	print('success')
else:
	print('something went wrong, error:', response.status_code)
