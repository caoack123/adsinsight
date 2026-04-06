'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';

const CLIENT_TOKEN = 'demo-token-123';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const LOADER_SCRIPT = `function main() {
  var s = UrlFetchApp.fetch('${APP_URL}/api/script/${CLIENT_TOKEN}');
  eval(s.getContentText());
}`;

const STEPS = [
  {
    num: '1',
    title: '打开 Google Ads 脚本页面',
    desc: '登录 Google Ads 后台 → 工具与设置（右上角扳手图标）→ 批量操作 → 脚本',
  },
  {
    num: '2',
    title: '新建脚本',
    desc: '点击蓝色 "+" 按钮新建脚本，给脚本起一个名称，例如 "AdInsight AI 数据同步"',
  },
  {
    num: '3',
    title: '粘贴代码',
    desc: '清空编辑器中的默认内容，粘贴上方的 5 行代码',
  },
  {
    num: '4',
    title: '首次运行并授权',
    desc: '点击 "运行" 按钮。首次运行时 Google 会弹出授权窗口，点击 "授权" 即可。运行完成后在日志中可看到 "AdInsight AI script completed"',
  },
  {
    num: '5',
    title: '设置定时自动运行',
    desc: '点击脚本旁边的时钟图标，设置定时触发器。建议选择 "每天" 运行，保持数据每日更新',
  },
];

export default function SetupPage() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(LOADER_SCRIPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-base font-semibold">安装脚本</h1>
        <p className="text-xs text-muted-foreground mt-1">将以下脚本粘贴到 Google Ads，即可自动同步数据到 AdInsight AI</p>
      </div>

      {/* Script card */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">你的专属同步脚本</CardTitle>
            <Badge variant="outline" className="text-xs font-mono">{CLIENT_TOKEN}</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="relative">
            <pre className="bg-zinc-900 border border-border rounded p-4 text-xs text-green-300 font-mono leading-relaxed overflow-x-auto whitespace-pre">
              {LOADER_SCRIPT}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-zinc-800 border border-border text-muted-foreground hover:text-foreground hover:bg-zinc-700 transition-colors"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? '已复制' : '复制代码'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            此脚本会在运行时从服务器拉取最新版本的数据导出逻辑，无需手动更新。
          </p>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">安装步骤</CardTitle>
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
      <Card className="border-amber-500/30 bg-amber-950/10">
        <CardContent className="px-4 py-3">
          <p className="text-xs text-amber-300 leading-relaxed">
            <span className="font-semibold">注意：</span>如果你以后需要使用视频素材分析功能，在授权时请同时开启 "YouTube Advanced API"，否则后续需要重新授权。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
