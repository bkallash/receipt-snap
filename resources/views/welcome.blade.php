<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'ReceiptSnap') }} - New Front-End</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 antialiased">
    <div class="max-w-xl w-full text-center space-y-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30 mb-2">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        </div>

        <div class="space-y-3">
            <h1 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Clean Baseline Ready</h1>
            <p class="text-slate-400 text-base leading-relaxed">
                All legacy views and resources have been cleared. You now have a fresh canvas to build your new front-end interface.
            </p>
        </div>

        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-sm font-mono text-slate-300 space-y-2">
            <div class="text-xs text-slate-500 font-sans uppercase tracking-wider font-semibold">Active Entry Points</div>
            <div class="flex items-center space-x-2 text-indigo-400">
                <span>•</span>
                <span>resources/views/welcome.blade.php</span>
            </div>
            <div class="flex items-center space-x-2 text-emerald-400">
                <span>•</span>
                <span>resources/css/app.css</span>
            </div>
            <div class="flex items-center space-x-2 text-amber-400">
                <span>•</span>
                <span>resources/js/app.js</span>
            </div>
        </div>
    </div>
</body>
</html>
