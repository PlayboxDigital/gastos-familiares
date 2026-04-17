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
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Configuración de Cloudinary incompleta (VITE_CLOUDINARY_CLOUD_NAME o VITE_CLOUDINARY_UPLOAD_PRESET)');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `Error HTTP ${response.status}: Error en la subida a Cloudinary`);
      }

      // Validar campos esenciales en la respuesta
      if (!data.public_id || !data.secure_url) {
        throw new Error('La respuesta de Cloudinary es inválida o incompleta (falta public_id o secure_url)');
      }

      return data as CloudinaryUploadResponse;
    } catch (error) {
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
