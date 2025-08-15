#!/bin/bash

# nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 인자 확인
if [ "$1" = "download" ]; then
    echo "🚀 회사코드 다운로드를 시작합니다..."
    npm run download-corp-code
else
    echo "🚀 Open DART API 테스트를 시작합니다..."
    npm start
fi 