/**
 * Cloudinary Service
 * Integración directa via Fetch API usando Unsigned Upload Prestets.
 */

export interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  original_filename: string;
}

export const cloudinaryService = {
  async uploadFile(file: File): Promise<CloudinaryUploadResponse> {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

    // DIAGNÓSTICO DE VARIABLES
    console.log('--- CLOUDINARY DIAGNOSTIC START ---');
    console.log('CLOUDINARY_ENV_CLOUD_NAME:', cloudName || '(VACÍO)');
    console.log('CLOUDINARY_ENV_UPLOAD_PRESET:', uploadPreset ? `${uploadPreset.substring(0, 3)}...${uploadPreset.substring(uploadPreset.length - 2)}` : '(VACÍO)');
    console.log('CLOUDINARY_HAS_FILE:', !!file);
    
    const isPlaceholder = (val: string | undefined) => 
      !val || val === 'YOUR_CLOUD_NAME' || val === 'YOUR_PRESET' || val === 'undefined';

    const finalUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    console.log('CLOUDINARY_FINAL_UPLOAD_URL:', finalUrl);
    console.log('CLOUDINARY_RESOURCE_TYPE:', 'image');
    console.log('--- CLOUDINARY DIAGNOSTIC END ---');

    if (isPlaceholder(cloudName) || isPlaceholder(uploadPreset)) {
      throw new Error('Configuración de Cloudinary inválida o faltante. Por favor, configure VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en las variables de entorno.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(
        finalUrl,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        let errorDetail = '';
        try {
          const data = await response.json();
          errorDetail = data.error?.message || `Error HTTP ${response.status}`;
        } catch (e) {
          errorDetail = `Error HTTP ${response.status}: No se pudo procesar la respuesta del servidor`;
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();

      // Validar campos esenciales en la respuesta
      if (!data.public_id || !data.secure_url) {
        throw new Error('La respuesta de Cloudinary es inválida o incompleta (falta public_id o secure_url)');
      }

      return data as CloudinaryUploadResponse;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Cloudinary Network Error (Failed to fetch): Verifique su conexión a internet, si tiene un bloqueador de anuncios o si el Cloud Name es correcto.');
        throw new Error('Error de red al conectar con Cloudinary. Verifique su conexión o la configuración del servicio (Cloud Name).');
      }
      console.error('Cloudinary Service Error:', error);
      throw error instanceof Error ? error : new Error('Ocurrió un error inesperado al subir el archivo');
    }
  },

  /**
   * Genera una URL transformada optimizada para consumo liviano.
   * Aplica format auto, quality auto y ancho máximo de 1600px.
   */
  getOptimizedUrl(url: string): string {
    if (!url) return '';
    // Reemplaza /upload/ por /upload/f_auto,q_auto,w_1600/
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_1600/');
  }
};
