'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, AlertTriangle, ExternalLink } from 'lucide-react';

const APP_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://adsinsight.vercel.app';

const STEPS = [
  {
    num: '1',
    title: '前往账户管理，获取你的 Token',
    desc: '点击左侧「账户管理」→ 复制你账户卡片里的 Script Token，粘贴到下方输入框。',
  },
  {
    num: '2',
    title: '打开 Google Ads 脚本页面',
    desc: '登录 Google Ads 后台 → 工具与设置（右上角扳手图标）→ 批量操作 → 脚本',
  },
  {
    num: '3',
    title: '新建脚本并粘贴代码',
    desc: '点击 "+" 新建脚本，命名为 "AdInsight AI 数据同步"，清空默认内容，粘贴上方生成的代码。',
  },
  {
    num: '4',
    title: '首次运行并授权',
    desc: '点击 "运行"，首次运行 Google 会弹出授权窗口，点击 "授权"。运行完成后日志显示 HTTP 200 即为成功。',
  },
  {
    num: '5',
    title: '设置定时自动运行',
    desc: '点击脚本旁边的时钟图标，设置每天自动运行，保持数据每日更新。',
  },
];

function SetupContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [token, setToken] = useState(tokenFromUrl);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const isDemo = !token || token === 'demo-token-123';
  const displayToken = isDemo ? 'YOUR_TOKEN_HERE' : token;
  const scriptUrl = `${APP_URL}/api/script/${displayToken}`;

  const loaderScript = `function main() {\n  var s = UrlFetchApp.fetch('${scriptUrl}');\n  eval(s.getContentText());\n}`;

  function handleCopy() {
    if (isDemo) return;
    navigator.clipboard.writeText(loaderScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-base font-semibold">安装脚本</h1>
        <p className="text-xs text-muted-foreground mt-1">
          将脚本粘贴到 Google Ads，自动同步 Feed、变更历史数据到 AdInsight AI
        </p>
      </div>

      {/* Token input */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">第一步：输入你的 Script Token</label>
            <Link
              href="/accounts"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              去账户管理获取 <ExternalLink size={11} />
            </Link>
          </div>
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value.trim())}
            placeholder="粘贴你的 Script Token（账户管理页面复制）"
            className="w-full bg-muted/40 border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {isDemo && (
            <div className="flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              请先填写真实 Token，否则脚本无法向数据库写入数据
            </div>
          )}
          {!isDemo && (
            <div className="text-xs text-green-400">✓ Token 已填写，可以复制脚本了</div>
          )}
        </CardContent>
      </Card>

      {/* Script card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">第二步：复制脚本，粘贴到 Google Ads</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="relative">
            <pre className={`bg-zinc-900 border rounded p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre select-all ${isDemo ? 'border-amber-500/30 text-amber-300/50' : 'border-border text-green-300'}`}>
              {loaderScript}
            </pre>
            <button
              onClick={handleCopy}
              disabled={isDemo}
              className="absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-zinc-800 border border-border text-muted-foreground hover:text-foreground hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? '已复制' : '复制代码'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            脚本只有 3 行。它会在运行时从服务器拉取最新导出逻辑，今后升级无需改脚本。
          </p>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">完整安装步骤</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ol className="space-y-4">
            {STEPS.map(step => (
              <li key={step.num} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.num}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Note */}
      <Card className="border-amber-400 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/10">
        <CardContent className="px-4 py-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">注意：</span>
            视频素材分析需要 YouTube 视频权限，首次授权时请同时开启 "YouTube Advanced API"。
            如需管理多个账户，在账户管理页面分别创建账户，每个账户有独立 Token 和独立数据。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">加载中...</div>}>
      <SetupContent />
    </Suspense>
  );
}
