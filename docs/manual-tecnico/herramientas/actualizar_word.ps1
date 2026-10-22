param([string]$PdfPath)
# Actualiza índice y paginación con Microsoft Word instalado en Windows.
# Exportación PDF opcional para revisión; no modifica archivos de aplicación.
$ErrorActionPreference = 'Stop'
$taskManualRoot = Split-Path $PSScriptRoot -Parent
$taskDocumentPath = Join-Path $taskManualRoot 'Manual_Tecnico_Sistema_Reconstruccion_Motores.docx'
$taskWord = New-Object -ComObject Word.Application
$taskWord.Visible = $false
$taskWord.DisplayAlerts = 0
$taskDocument = $null
try {
    $taskDocument = $taskWord.Documents.Open($taskDocumentPath)
    $taskDocument.TablesOfContents.Item(1).Update()
    $taskDocument.Repaginate()
    $taskDocument.Save()
    if ($PdfPath) {
        $taskFullPdfPath = [System.IO.Path]::GetFullPath($PdfPath)
        $taskDocument.ExportAsFixedFormat($taskFullPdfPath, 17)
    }
    Write-Output ('Páginas: ' + $taskDocument.ComputeStatistics(2))
} finally {
    if ($taskDocument) { $taskDocument.Close(0) }
    $taskWord.Quit()
}

# Word puede restablecer el autor del equipo al guardar. Limpiar solo metadatos,
# sin cambiar el contenido, los campos ni la paginación ya revisada.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive = [System.IO.Compression.ZipFile]::Open($taskDocumentPath, 'Update')
try {
    $taskEntry = $taskArchive.GetEntry('docProps/core.xml')
    $taskReader = [System.IO.StreamReader]::new($taskEntry.Open())
    try { [xml]$taskCore = $taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
    foreach ($taskNode in $taskCore.SelectNodes("//*[local-name()='creator' or local-name()='lastModifiedBy']")) {
        $taskNode.InnerText = ''
    }
    $taskEntry.Delete()
    $taskEntry = $taskArchive.CreateEntry('docProps/core.xml')
    $taskWriter = [System.IO.StreamWriter]::new($taskEntry.Open(), [System.Text.UTF8Encoding]::new($false))
    try { $taskWriter.Write($taskCore.OuterXml) } finally { $taskWriter.Dispose() }
} finally { $taskArchive.Dispose() }
