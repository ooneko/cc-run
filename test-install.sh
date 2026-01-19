#!/bin/bash
# 本地安装测试脚本

set -e

echo "🔨 构建项目..."
bun run build

echo ""
echo "📦 打包..."
npm pack

echo ""
echo "🌍 全局安装..."
PKG=$(ls runcc-*.tgz)
npm install -g ./$PKG

echo ""
echo "✅ 测试中文输出..."
runcc list

echo ""
echo "🧹 清理..."
npm uninstall -g runcc
rm $PKG

echo ""
echo "✨ 测试完成！"
