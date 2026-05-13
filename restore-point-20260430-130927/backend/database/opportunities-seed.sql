/*
  Seeds pipeline stages + lead sources + loss reasons
  Database: oportunidades
*/

USE [oportunidades];
GO

SET NOCOUNT ON;
GO

MERGE dbo.OpportunityStages AS target
USING (VALUES
  (N'Prospección', 1, N'#0ea5e9', 0, 0, 1),
  (N'Contacto', 2, N'#6366f1', 0, 0, 1),
  (N'Reunión', 3, N'#8b5cf6', 0, 0, 1),
  (N'Propuesta', 4, N'#f59e0b', 0, 0, 1),
  (N'Seguimiento', 5, N'#f97316', 0, 0, 1),
  (N'Cierre Ganado', 6, N'#22c55e', 1, 0, 1),
  (N'Cierre Perdido', 7, N'#ef4444', 0, 1, 1)
) AS source (StageName, StageOrder, ColorHex, IsClosedWon, IsClosedLost, IsActive)
ON target.StageName = source.StageName
WHEN MATCHED THEN
  UPDATE SET
    target.StageOrder = source.StageOrder,
    target.ColorHex = source.ColorHex,
    target.IsClosedWon = source.IsClosedWon,
    target.IsClosedLost = source.IsClosedLost,
    target.IsActive = source.IsActive
WHEN NOT MATCHED THEN
  INSERT (StageName, StageOrder, ColorHex, IsClosedWon, IsClosedLost, IsActive)
  VALUES (source.StageName, source.StageOrder, source.ColorHex, source.IsClosedWon, source.IsClosedLost, source.IsActive);
GO

MERGE dbo.LeadSources AS target
USING (VALUES
  (N'Web', 1),
  (N'Referencia', 1),
  (N'Outbound', 1),
  (N'Evento', 1),
  (N'Otro', 1)
) AS source (LeadSourceName, IsActive)
ON target.LeadSourceName = source.LeadSourceName
WHEN MATCHED THEN UPDATE SET target.IsActive = source.IsActive
WHEN NOT MATCHED THEN INSERT (LeadSourceName, IsActive) VALUES (source.LeadSourceName, source.IsActive);
GO

MERGE dbo.OpportunityLossReasons AS target
USING (VALUES
  (N'Precio', 1),
  (N'Competidor', 1),
  (N'Sin presupuesto', 1),
  (N'No califica', 1),
  (N'Otro', 1)
) AS source (LossReasonName, IsActive)
ON target.LossReasonName = source.LossReasonName
WHEN MATCHED THEN UPDATE SET target.IsActive = source.IsActive
WHEN NOT MATCHED THEN INSERT (LossReasonName, IsActive) VALUES (source.LossReasonName, source.IsActive);
GO

