import { createClient } from 'npm:@supabase/supabase-js@2.103.0';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });

const readBodyWithLimit = async (response: Response, limit: number): Promise<Uint8Array> => {
  if (!response.body) throw new Error('La imagen no contiene datos.');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limit) {
      await reader.cancel();
      throw new Error('La imagen supera el límite de 10 MB.');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const getPublishableKey = (): string => {
  const legacyKey = Deno.env.get('SUPABASE_ANON_KEY');
  const singleKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (legacyKey || singleKey) return legacyKey || singleKey || '';

  const keysJson = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (!keysJson) return '';
  try {
    const keys = JSON.parse(keysJson) as Record<string, string>;
    return keys.default || Object.values(keys)[0] || '';
  } catch {
    return '';
  }
};

const validateCloudinaryUrl = (value: string, cloudName: string): URL => {
  const url = new URL(value);
  const path = url.pathname.split('/').filter(Boolean);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'res.cloudinary.com' ||
    path[0] !== cloudName ||
    path[1] !== 'image' ||
    path[2] !== 'upload'
  ) {
    throw new Error('La imagen no pertenece al Cloudinary configurado.');
  }
  return url;
};

const extractionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'comercio', 'fecha', 'hora', 'cuit', 'numero_comprobante', 'forma_pago',
    'subtotal', 'descuento', 'iva', 'total', 'observaciones', 'texto_completo',
    'productos', 'confianza_general', 'advertencias', 'campos_dudosos', 'formato_detectado',
  ],
  properties: {
    comercio: { type: ['string', 'null'] },
    fecha: { type: ['string', 'null'], description: 'Fecha YYYY-MM-DD' },
    hora: { type: ['string', 'null'] },
    cuit: { type: ['string', 'null'] },
    numero_comprobante: { type: ['string', 'null'] },
    forma_pago: { type: ['string', 'null'] },
    subtotal: { type: ['number', 'null'], minimum: 0 },
    descuento: { type: ['number', 'null'], minimum: 0 },
    iva: { type: ['number', 'null'], minimum: 0 },
    total: { type: ['number', 'null'], minimum: 0 },
    observaciones: { type: ['string', 'null'] },
    texto_completo: { type: ['string', 'null'] },
    productos: {
      type: 'array',
      maxItems: 250,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['descripcion', 'cantidad', 'unidad', 'precio_unitario', 'descuento', 'subtotal'],
        properties: {
          descripcion: { type: 'string' },
          cantidad: { type: ['number', 'null'] },
          unidad: { type: ['string', 'null'] },
          precio_unitario: { type: ['number', 'null'], minimum: 0 },
          descuento: { type: ['number', 'null'], minimum: 0 },
          subtotal: { type: ['number', 'null'], minimum: 0 },
        },
      },
    },
    confianza_general: { type: ['number', 'null'], minimum: 0, maximum: 1 },
    advertencias: { type: 'array', maxItems: 50, items: { type: 'string' } },
    campos_dudosos: { type: 'array', maxItems: 50, items: { type: 'string' } },
    formato_detectado: { type: 'string', enum: ['ticket_termico', 'desconocido'] },
  },
};

const prompt = `Analizá la imagen de este comprobante de compra argentino y devolvé exclusivamente
el JSON solicitado por el esquema. No inventes datos ausentes: usá null cuando un valor no sea
visible. Interpretá importes argentinos distinguiendo puntos de miles y comas decimales. Extraé
comercio, fecha, hora, CUIT, número de comprobante, forma de pago, subtotal, descuento, IVA, total,
observaciones relevantes, texto completo y productos. No confundas descuentos, promociones,
impuestos, medios de pago, cuotas ni totales con productos. Conservá las descripciones de productos
lo más fieles posible. La cantidad debe ser mayor que cero cuando sea legible. Los importes deben
ser números no negativos. Indicá ticket_termico solo si el formato es reconocible como tal; de lo
contrario usá desconocido. Agregá advertencias y campos dudosos cuando la imagen esté borrosa,
recortada, incompleta, sea ambigua o los totales no concilien. La confianza general debe estar entre
0 y 1.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Se requiere una sesión autenticada.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = getPublishableKey();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    if (!supabaseUrl || !publishableKey || !geminiApiKey || !cloudName) {
      return jsonResponse({ error: 'La función de análisis no está configurada.' }, 500);
    }

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: 'La sesión no es válida o expiró.' }, 401);
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 16 * 1024) {
      return jsonResponse({ error: 'La solicitud es demasiado grande.' }, 413);
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) {
      return jsonResponse({ error: 'La solicitud es demasiado grande.' }, 413);
    }
    const body = JSON.parse(rawBody) as { ticketId?: unknown; imageUrl?: unknown };
    if (
      typeof body.ticketId !== 'string' ||
      !UUID_PATTERN.test(body.ticketId) ||
      typeof body.imageUrl !== 'string' ||
      body.imageUrl.length > 2048
    ) {
      return jsonResponse({ error: 'Los datos enviados para analizar no son válidos.' }, 400);
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets_compras')
      .select('id,imagen_cloudinary_secure_url')
      .eq('id', body.ticketId)
      .maybeSingle();
    if (ticketError || !ticket) {
      return jsonResponse({ error: 'No se encontró un ticket accesible para analizar.' }, 404);
    }
    if (
      typeof ticket.imagen_cloudinary_secure_url !== 'string' ||
      ticket.imagen_cloudinary_secure_url !== body.imageUrl
    ) {
      return jsonResponse({ error: 'La imagen no corresponde al ticket indicado.' }, 422);
    }

    const imageUrl = validateCloudinaryUrl(body.imageUrl, cloudName);
    const imageResponse = await fetch(imageUrl, { redirect: 'manual' });
    if (!imageResponse.ok || imageResponse.status >= 300) {
      return jsonResponse({ error: 'No se pudo obtener la imagen del comprobante.' }, 422);
    }

    const mimeType = imageResponse.headers.get('content-type')?.split(';')[0].trim() || '';
    const declaredSize = Number(imageResponse.headers.get('content-length') || 0);
    if (!ALLOWED_IMAGE_TYPES.has(mimeType) || declaredSize > MAX_IMAGE_BYTES) {
      return jsonResponse({ error: 'La imagen debe ser JPG, PNG o WEBP y pesar hasta 10 MB.' }, 422);
    }

    let imageBytes: Uint8Array;
    try {
      imageBytes = await readBodyWithLimit(imageResponse, MAX_IMAGE_BYTES);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'El tamaño de la imagen no es válido.';
      return jsonResponse({ error: message }, 413);
    }
    if (imageBytes.byteLength === 0) {
      return jsonResponse({ error: 'El tamaño de la imagen no es válido.' }, 422);
    }

    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < imageBytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...imageBytes.subarray(offset, offset + chunkSize));
    }
    const base64Image = btoa(binary);
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash';
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Image } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: extractionJsonSchema,
          },
        }),
      }
    );

    if (geminiResponse.status === 429) {
      return jsonResponse(
        { error: 'Gemini alcanzó el límite de solicitudes o cuota disponible. Intentá más tarde.' },
        429
      );
    }
    if (geminiResponse.status === 401 || geminiResponse.status === 403) {
      return jsonResponse(
        { error: 'Gemini rechazó la configuración de acceso. Revisá la clave y el proyecto configurado.' },
        502
      );
    }
    if (geminiResponse.status === 400) {
      return jsonResponse(
        { error: 'Gemini rechazó el formato de la solicitud o el esquema configurado.' },
        502
      );
    }
    if (!geminiResponse.ok) {
      return jsonResponse({ error: 'Gemini no pudo analizar el comprobante. Intentá nuevamente.' }, 502);
    }

    const geminiPayload = await geminiResponse.json() as {
      promptFeedback?: { blockReason?: string };
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    if (geminiPayload.promptFeedback?.blockReason) {
      return jsonResponse(
        { error: 'Gemini bloqueó el análisis de esta imagen. Probá con otra captura.' },
        422
      );
    }

    const candidate = geminiPayload.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      const blockedReasons = new Set(['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY']);
      return jsonResponse(
        {
          error: blockedReasons.has(candidate.finishReason)
            ? 'Gemini bloqueó el análisis de esta imagen. Probá con otra captura.'
            : 'Gemini devolvió una respuesta incompleta. Intentá nuevamente.',
        },
        422
      );
    }

    const responseText = candidate?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();
    if (!responseText) {
      return jsonResponse({ error: 'Gemini no devolvió una extracción utilizable.' }, 502);
    }

    let extraction: unknown;
    try {
      extraction = JSON.parse(responseText);
    } catch {
      return jsonResponse({ error: 'Gemini devolvió una respuesta inválida.' }, 502);
    }

    return jsonResponse({ extraction });
  } catch (cause) {
    const message =
      cause instanceof SyntaxError
        ? 'La solicitud no contiene JSON válido.'
        : cause instanceof Error && cause.message.includes('Cloudinary')
          ? cause.message
          : 'No se pudo analizar el comprobante.';
    return jsonResponse({ error: message }, cause instanceof SyntaxError ? 400 : 500);
  }
});
