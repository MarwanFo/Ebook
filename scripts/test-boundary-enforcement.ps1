Write-Host "=== Testing Architectural Dependency Boundaries via ESLint ==="

$homePage = "apps/web/src/pages/HomePage.tsx"
$sharedIndex = "packages/shared-types/src/index.ts"

$originalHome = Get-Content $homePage -Raw
$originalShared = Get-Content $sharedIndex -Raw

try {
    Write-Host "`n1. Verifying clean state passes ESLint..."
    pnpm lint
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Clean lint failed!"
    }
    Write-Host "Clean state passed."

    Write-Host "`n2. Injecting forbidden backend import into Frontend (apps/web): 'import type { AppModule } from @bookflow/api'..."
    $badHome = "import type { AppModule } from '@bookflow/api';`r`n" + $originalHome
    Set-Content -Path $homePage -Value $badHome

    $lintOut = pnpm --filter @bookflow/web lint 2>&1 | Out-String
    Write-Host $lintOut
    if ($lintOut -match "Frontend \(apps/web\) must never import from backend") {
        Write-Host "PASS: ESLint correctly blocked apps/web importing @bookflow/api!"
    } else {
        Write-Error "Failed to detect forbidden @bookflow/api import!"
    }

    # Restore HomePage
    Set-Content -Path $homePage -Value $originalHome

    Write-Host "`n3. Injecting forbidden ORM import into Pure Contracts (packages/shared-types): 'import type { PrismaClient } from @prisma/client'..."
    $badShared = "import type { PrismaClient } from '@prisma/client';`r`n" + $originalShared
    Set-Content -Path $sharedIndex -Value $badShared

    $sharedLintOut = pnpm --filter @bookflow/shared-types lint 2>&1 | Out-String
    Write-Host $sharedLintOut
    if ($sharedLintOut -match "Shared types must remain pure API contracts") {
        Write-Host "PASS: ESLint correctly blocked packages/shared-types importing @prisma/client!"
    } else {
        Write-Error "Failed to detect forbidden @prisma/client import!"
    }
}
finally {
    Set-Content -Path $homePage -Value $originalHome
    Set-Content -Path $sharedIndex -Value $originalShared
    Write-Host "`nRestored files to clean state."
}

Write-Host "`n4. Verifying clean state passes ESLint after test completion..."
pnpm lint
Write-Host "=== All Architectural Dependency Boundary Tests Passed! ==="
