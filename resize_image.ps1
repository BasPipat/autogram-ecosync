Add-Type -AssemblyName System.Drawing
$source = "E:\eco-sync\driver_menu_raw_v3.png"
$dest = "E:\eco-sync\driver_rich_menu_mockup_fixed.jpg"

try {
    $img = [System.Drawing.Image]::FromFile($source)
    $bmp = New-Object System.Drawing.Bitmap(2500, 1686)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, 2500, 1686)
    
    # Save as JPEG with Quality compression
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80)
    
    $bmp.Save($dest, $codec, $params)
    
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "✅ Resize & Compression Successful: $dest"
} catch {
    Write-Error "❌ Resize Failed: $_"
}
