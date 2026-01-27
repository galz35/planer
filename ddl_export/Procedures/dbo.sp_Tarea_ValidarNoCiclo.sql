-- ==============================================================================
-- 2. PROCEDIMIENTOS DE VALIDACIÃ“N E INSERCIÃ“N
-- ==============================================================================

-- 2.1 ValidaciÃ³n Anti-Ciclos (Profunda)
-- Detecta si al asignar un nuevo padre se crearÃ­a un ciclo indirecto (A->B->A)
CREATE   PROCEDURE dbo.sp_Tarea_ValidarNoCiclo
(
    @idTarea INT,
    @idNuevoPadre INT
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Caso trivial
    IF @idTarea = @idNuevoPadre
        THROW 50010, 'Ciclo detectado: una tarea no puede ser su propio padre.', 1;

    DECLARE @found BIT = 0;

    -- CTE Recursivo para verificar si @idNuevoPadre es descendiente de @idTarea
    ;WITH SubArbol AS (
        SELECT t.idTarea
        FROM dbo.p_Tareas t
        WHERE t.idTarea = @idTarea

        UNION ALL

        SELECT h.idTarea
        FROM dbo.p_Tareas h
        INNER JOIN SubArbol s ON h.idTareaPadre = s.idTarea
        WHERE h.activo = 1
    )
    SELECT TOP 1 @found = 1 FROM SubArbol WHERE idTarea = @idNuevoPadre;

    IF @found = 1
        THROW 50011, 'Ciclo detectado: el nuevo padre es descendiente de la tarea actual.', 1;
END
GO