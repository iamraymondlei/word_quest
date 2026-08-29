#!/bin/bash

# 开发环境启动脚本
echo "Starting MeLearn development environment..."

# 加载开发环境变量
export NODE_ENV=development
source ./.env.development

# 启动后端服务
echo "Starting backend on port $PORT..."
cd backend && npm run dev