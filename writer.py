import base64, sys, os
file_path = sys.argv[1]
b64_content = sys.argv[2]
os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
with open(file_path, 'wb') as f:
    f.write(base64.b64decode(b64_content))
print('Saved:', file_path)
