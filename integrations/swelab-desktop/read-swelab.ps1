$ErrorActionPreference = "Stop"

$databasePath = "C:\Swelab Alfa Plus Standard Interfaz\Resultados.mdb"
if (-not (Test-Path -LiteralPath $databasePath)) {
    throw "No se encontró Resultados.mdb en $databasePath"
}

$connection = New-Object System.Data.OleDb.OleDbConnection(
    "Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$databasePath;Mode=Read"
)

try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandText = @"
SELECT TOP 500
    r.[Id], r.[Folio], r.[Analito] AS [clave],
    r.[Resultado], r.[Unidad], r.[Fecha]
FROM [Resultados] AS r
WHERE r.[Estado] = 2
ORDER BY r.[Id] DESC
"@

    $adapter = New-Object System.Data.OleDb.OleDbDataAdapter $command
    $table = New-Object System.Data.DataTable
    [void]$adapter.Fill($table)
    if ($table.Rows.Count -gt 0) {
        $filas = foreach ($row in $table.Rows) {
            [PSCustomObject]@{
                Id        = [int64]$row["Id"]
                Folio     = [string]$row["Folio"]
                clave     = [string]$row["clave"]
                Resultado = [string]$row["Resultado"]
                Unidad    = [string]$row["Unidad"]
                Fecha     = if ($row["Fecha"] -is [System.DBNull]) { $null } else { ([datetime]$row["Fecha"]).ToString("o") }
            }
        }
        $filas | ConvertTo-Json -Compress
    }
}
finally {
    if ($connection.State -ne [System.Data.ConnectionState]::Closed) {
        $connection.Close()
    }
    $connection.Dispose()
}
