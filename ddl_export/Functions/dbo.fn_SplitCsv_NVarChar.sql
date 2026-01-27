/* =========================
   Helper: split CSV -> tabla
   ========================= */
CREATE   FUNCTION dbo.fn_SplitCsv_NVarChar
(
  @csv NVARCHAR(MAX)
)
RETURNS TABLE
AS
RETURN
(
  SELECT DISTINCT LTRIM(RTRIM(value)) AS item
  FROM STRING_SPLIT(ISNULL(@csv, N''), N',')
  WHERE LTRIM(RTRIM(value)) <> N''
);
GO