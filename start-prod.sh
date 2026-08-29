#!/bin/bash

# 生产环境启动脚本
echo "Starting WordQuest production environment..."

# 加载生产环境变量
export NODE_ENV=production
source ./.env.production

# 启动后端服务
echo "Starting backend on port $PORT..."
cd backend && npm run build && npm start