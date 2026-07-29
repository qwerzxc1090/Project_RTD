import re

with open('index.html', 'rb') as f:
    raw = f.read()

try:
    content = raw.decode('utf-16')
except UnicodeDecodeError:
    try:
        content = raw.decode('utf-8')
    except UnicodeDecodeError:
        content = raw.decode('cp949')

content = re.sub(r'(<script src="js/data/skillData\.js.*?"></script>)', r'\1\n    <script src="js/data/monsterData.js"></script>', content)
content = re.sub(r'(<script src="js/data/waveData\.js.*?"></script>)', r'<script src="js/data/waveData.js"></script>', content)

with open('index.html', 'wb') as f:
    f.write(content.encode('utf-8'))
