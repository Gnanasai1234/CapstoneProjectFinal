# powershell
$root = "D:\Capstone"
Set-Location $root

Write-Host "Scanning workspace: $root" -ForegroundColor Cyan

# patterns to find likely incomplete code
$patterns = @(
  "TODO",
  "FIXME",
  "pass",                    # python
  "raise NotImplementedError",
  "NotImplementedError",
  "throw new Error(\"NotImplemented\")",
  "throw new Error('NotImplemented')",
  "/* TODO",
  "// TODO",
  "console\.warn\('TODO'",
  "TODO:"
)

# search for patterns (skip node_modules, .venv, venv, env, build folders)
$excludeDirs = @("node_modules",".venv","venv","env","dist","build",".git")
Write-Host "Searching for incomplete-code markers..." -ForegroundColor Yellow
Get-ChildItem -Path $root -Recurse -File -Force |
  Where-Object { $excludeDirs -notcontains $_.Name } |
  ForEach-Object {
    try {
      $file = $_.FullName
      $matches = Select-String -Path $file -Pattern $patterns -SimpleMatch -ErrorAction SilentlyContinue
      if ($matches) {
        foreach ($m in $matches) {
          [PSCustomObject]@{
            File = $m.Path
            Line = $m.LineNumber
            Text = $m.Line.Trim()
          }
        }
      }
    } catch { }
  } | Sort-Object File, Line | Format-Table -AutoSize

# detect project types
$hasPackageJson = Test-Path (Join-Path $root "package.json")
$hasRequirements = Test-Path (Join-Path $root "requirements.txt") -or Test-Path (Join-Path $root "pyproject.toml")
$hasSln = Get-ChildItem -Path $root -Filter *.sln -Recurse -ErrorAction SilentlyContinue
$hasCsproj = Get-ChildItem -Path $root -Filter *.csproj -Recurse -ErrorAction SilentlyContinue
$hasPom = Test-Path (Join-Path $root "pom.xml")

Write-Host "`nDetected project types:" -ForegroundColor Cyan
if ($hasPackageJson) { Write-Host "- Node.js (package.json present)" }
if ($hasRequirements) { Write-Host "- Python (requirements.txt or pyproject.toml present)" }
if ($hasSln -or $hasCsproj) { Write-Host "- .NET (sln/csproj present)" }
if ($hasPom) { Write-Host "- Maven (pom.xml present)" }
if (-not ($hasPackageJson -or $hasRequirements -or $hasSln -or $hasCsproj -or $hasPom)) {
  Write-Host "- No common project file detected. You may have a different setup." -ForegroundColor Yellow
}

# helper runner for each type
function Run-Node {
  Write-Host "`nRunning Node steps..." -ForegroundColor Green
  if (Test-Path "package.json") {
    if (Test-Path "package-lock.json" -or Test-Path "yarn.lock") {
      Write-Host "Installing dependencies..."
      npm install
    } else {
      npm install
    }
    if ((Get-Content package.json) -match '"test"') {
      Write-Host "Running npm test..."
      npm test
    } elseif ((Get-Content package.json) -match '"start"') {
      Write-Host "Running npm start..."
      npm start
    } else {
      Write-Host "No test/start script in package.json. Consider running build or start manually." -ForegroundColor Yellow
    }
  }
}

function Run-Python {
  Write-Host "`nRunning Python steps..." -ForegroundColor Green
  $venv = Join-Path $root ".venv"
  if (-not (Test-Path $venv)) {
    Write-Host "Creating virtual environment in .venv..."
    python -m venv .venv
  }
  # activate and install requirements
  $activate = Join-Path $venv "Scripts\Activate.ps1"
  Write-Host "Activating venv and installing requirements..."
  & $activate
  if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
  } elseif (Test-Path "pyproject.toml") {
    pip install .
  }
  # run tests if pytest present
  if (Get-Command pytest -ErrorAction SilentlyContinue) {
    Write-Host "Running pytest..."
    pytest -q
  } else {
    Write-Host "pytest not found. Install pytest or run your test command manually." -ForegroundColor Yellow
  }
}

function Run-DotNet {
  Write-Host "`nRunning .NET steps..." -ForegroundColor Green
  Write-Host "Restoring, building, and testing .NET solution..."
  dotnet restore
  dotnet build
  dotnet test
}

function Run-Maven {
  Write-Host "`nRunning Maven steps..." -ForegroundColor Green
  mvn -B -DskipTests=false test
}

# run according to detection
if ($hasPackageJson) { Run-Node }
if ($hasRequirements) { Run-Python }
if ($hasSln -or $hasCsproj) { Run-DotNet }
if ($hasPom) { Run-Maven }

Write-Host "`nScan and run complete. Review the " -ForegroundColor Cyan
Write-Host "If you want, I can: (1) produce a detailed report file, (2) generate fixes for specific TODO/NotImplemented occurrences, or (3) open and edit files to implement missing pieces." -ForegroundColor Magenta