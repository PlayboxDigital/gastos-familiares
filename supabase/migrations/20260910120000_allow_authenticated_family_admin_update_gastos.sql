CREATE POLICY "Administradores actualizan gastos de su familia"
ON public.gastos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.familia_miembros fm
    WHERE fm.user_id = auth.uid()
      AND fm.familia_id = gastos.familia_id
      AND fm.activo = true
      AND fm.rol = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.familia_miembros fm
    WHERE fm.user_id = auth.uid()
      AND fm.familia_id = gastos.familia_id
      AND fm.activo = true
      AND fm.rol = 'admin'
  )
);
