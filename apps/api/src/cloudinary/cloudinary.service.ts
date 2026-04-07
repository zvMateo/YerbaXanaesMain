import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Valida y sube un buffer de imagen a Cloudinary.
   * Retorna la secure_url del resultado.
   */
  async uploadImage(
    buffer: Buffer,
    mimetype: string,
    folder = 'yerbaxanaes/products',
  ): Promise<string> {
    if (!ALLOWED_MIMETYPES.includes(mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Usá JPG, PNG o WebP.`,
      );
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(`La imagen supera el límite de 5 MB.`);
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(new BadRequestException(error.message));
          if (!result) return reject(new BadRequestException('Upload falló'));
          resolve(result.secure_url);
        },
      );

      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Elimina una imagen de Cloudinary usando su public_id.
   */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  /**
   * Extrae el public_id de una URL de Cloudinary.
   * "https://res.cloudinary.com/demo/image/upload/v123/yerbaxanaes/products/abc.webp"
   * → "yerbaxanaes/products/abc"
   */
  extractPublicId(url: string): string {
    try {
      // Busca la parte después de "/upload/v{version}/" o "/upload/"
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  }

  /**
   * Verifica si una URL pertenece a este Cloudinary cloud.
   */
  isCloudinaryUrl(url: string): boolean {
    return url.includes('res.cloudinary.com');
  }
}
