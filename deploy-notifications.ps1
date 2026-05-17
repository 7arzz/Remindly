#!/usr/bin/env pwsh
# deploy-notifications.ps1
# One-click deploy script for Remindly background push notification system
# Run from the project root: .\deploy-notifications.ps1

$PROJECT_REF = "wdydmrdcxuhtcqqckcmq"
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 Remindly — Deploying Background Push Notification System" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor DarkGray
Write-Host ""

# ── Step 1: Check Supabase CLI ────────────────────────────────────────────────
Write-Host "📋 Step 1: Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $version = supabase --version 2>&1
    Write-Host "   ✅ Supabase CLI: $version" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Supabase CLI not found. Install: npm install -g supabase" -ForegroundColor Red
    exit 1
}

# ── Step 2: Link project ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "📋 Step 2: Linking project..." -ForegroundColor Yellow
supabase link --project-ref $PROJECT_REF
Write-Host "   ✅ Project linked." -ForegroundColor Green

# ── Step 3: Deploy Edge Function ──────────────────────────────────────────────
Write-Host ""
Write-Host "📋 Step 3: Deploying Edge Function..." -ForegroundColor Yellow
supabase functions deploy send-reminders --no-verify-jwt
Write-Host "   ✅ Edge Function deployed." -ForegroundColor Green

# ── Step 4: Remind about secrets ──────────────────────────────────────────────
Write-Host ""
Write-Host "📋 Step 4: Environment Secrets Check" -ForegroundColor Yellow
Write-Host "   ⚠️  Make sure these are set in Supabase Dashboard → Settings → Edge Functions → Secrets:" -ForegroundColor DarkYellow
Write-Host "      • FIREBASE_SERVICE_ACCOUNT  (full JSON from Firebase Console)" -ForegroundColor White
Write-Host "      • FIREBASE_PROJECT_ID       (remindly-579de)" -ForegroundColor White
Write-Host ""
Write-Host "   Or run:" -ForegroundColor DarkGray
Write-Host '   supabase secrets set FIREBASE_PROJECT_ID=remindly-579de' -ForegroundColor DarkGray
Write-Host '   supabase secrets set FIREBASE_SERVICE_ACCOUNT="{...full json...}"' -ForegroundColor DarkGray

# ── Step 5: Remind about DB migration ────────────────────────────────────────
Write-Host ""
Write-Host "📋 Step 5: Database Migration" -ForegroundColor Yellow
Write-Host "   Run these SQL files in Supabase Dashboard → SQL Editor:" -ForegroundColor White
Write-Host "      1. supabase\migrations\20260517000001_add_notification_fields.sql" -ForegroundColor White
Write-Host "      2. supabase\migrations\20260517000002_setup_cron_job.sql" -ForegroundColor White
Write-Host "         (Remember to replace YOUR_PROJECT_REF in the cron file!)" -ForegroundColor DarkYellow

Write-Host ""
Write-Host "=" * 60 -ForegroundColor DarkGray
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "   See background_push_guide.md for testing & debugging instructions." -ForegroundColor DarkGray
Write-Host ""
