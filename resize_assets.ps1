Add-Type -AssemblyName System.Drawing

function Resize-Image($source, $dest) {
    try {
        $img = [System.Drawing.Image]::FromFile($source)
        $bmp = New-Object System.Drawing.Bitmap(2500, 1686)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, 2500, 1686)
        
        # Save as JPEG (LINE prefers JPEG for rich menu images to save space)
        $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 85)
        
        $bmp.Save($dest, $codec, $params)
        
        $g.Dispose()
        $bmp.Dispose()
        $img.Dispose()
        Write-Host "✅ Resized: $dest"
    } catch {
        Write-Error "Failed to resize $source"
    }
}

Resize-Image "E:\eco-sync\public\assets\line\rich-menu-unverified.png" "E:\eco-sync\public\assets\line\rich-menu-unverified.jpg"
Resize-Image "E:\eco-sync\public\assets\line\rich-menu-driver.jpg" "E:\eco-sync\public\assets\line\rich-menu-driver.jpg"
