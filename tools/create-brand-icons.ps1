$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'
$size = 1024

function New-Canvas([int]$width, [int]$height, [System.Drawing.Color]$background) {
  $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear($background)
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Canvas($canvas, [string]$path) {
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

function Draw-Pin($graphics, [single]$x, [single]$y, [single]$pinSize, [System.Drawing.Color]$pinColor, [bool]$drawTrike) {
  $brush = [System.Drawing.SolidBrush]::new($pinColor)
  $circle = $pinSize * 0.78
  $circleX = $x + ($pinSize - $circle) / 2
  $graphics.FillEllipse($brush, $circleX, $y, $circle, $circle)
  $tail = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($x + $pinSize * 0.15, $y + $pinSize * 0.46),
    [System.Drawing.PointF]::new($x + $pinSize * 0.85, $y + $pinSize * 0.46),
    [System.Drawing.PointF]::new($x + $pinSize * 0.5, $y + $pinSize)
  )
  $graphics.FillPolygon($brush, $tail)

  if ($drawTrike) {
    $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $font = [System.Drawing.Font]::new('Segoe UI Emoji', $pinSize * 0.46, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $glyph = '🛺'
    $measure = $graphics.MeasureString($glyph, $font)
    $circle = $pinSize * 0.78
    $glyphX = $x + ($pinSize - $measure.Width) / 2
    $glyphY = $y + ($circle - $measure.Height) / 2
    $graphics.DrawString($glyph, $font, $white, $glyphX, $glyphY)
    $font.Dispose()
    $white.Dispose()
  }
  $brush.Dispose()
}

$full = New-Canvas $size $size ([System.Drawing.Color]::FromArgb(244, 250, 246))
Draw-Pin $full.Graphics 132 106 760 ([System.Drawing.Color]::FromArgb(30, 158, 90)) $true
Save-Canvas $full (Join-Path $assetDirectory 'icon.png')

$background = New-Canvas $size $size ([System.Drawing.Color]::FromArgb(228, 246, 236))
Save-Canvas $background (Join-Path $assetDirectory 'android-icon-background.png')

$foreground = New-Canvas $size $size ([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
Draw-Pin $foreground.Graphics 192 190 640 ([System.Drawing.Color]::FromArgb(30, 158, 90)) $true
Save-Canvas $foreground (Join-Path $assetDirectory 'android-icon-foreground.png')

$monochrome = New-Canvas $size $size ([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
Draw-Pin $monochrome.Graphics 192 190 640 ([System.Drawing.Color]::White) $false
Save-Canvas $monochrome (Join-Path $assetDirectory 'android-icon-monochrome.png')

$splash = New-Canvas 512 512 ([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
Draw-Pin $splash.Graphics 66 54 380 ([System.Drawing.Color]::FromArgb(30, 158, 90)) $true
Save-Canvas $splash (Join-Path $assetDirectory 'splash-icon.png')

$favicon = New-Canvas 64 64 ([System.Drawing.Color]::FromArgb(244, 250, 246))
Draw-Pin $favicon.Graphics 8 7 48 ([System.Drawing.Color]::FromArgb(30, 158, 90)) $false
Save-Canvas $favicon (Join-Path $assetDirectory 'favicon.png')

Get-ChildItem -LiteralPath $assetDirectory -Include 'icon.png','android-icon-*.png','splash-icon.png','favicon.png' -File |
  Select-Object Name, Length
