Add-Type -AssemblyName System.Drawing
$source = "E:\eco-sync\driver_rich_menu_mockup.png"
$dest = "E:\eco-sync\driver_rich_menu_mockup_fixed.png"

try {
    $img = [System.Drawing.Image]::FromFile($source)
    $bmp = New-Object System.Drawing.Bitmap(2500, 1686)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, 2500, 1686)
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "✅ Resize Successful: $dest"
} catch {
    Write-Error "❌ Resize Failed: $_"
}
