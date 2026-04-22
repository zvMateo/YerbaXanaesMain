import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error(
        'Missing Cloudinary credentials in environment variables.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadImage(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
    folder = 'yerbaxanaes/products',
  ): Promise<string> {
    // 1. Resolver el MimeType real
    let mime = mimetype;
    if (mime === 'application/octet-stream' || !mime) {
      const isHeic = originalname?.toLowerCase().match(/\.(heic|heif)$/);
      if (isHeic) {
        mime = 'image/heic';
      } else {
        mime = 'image/jpeg'; // Fallback seguro
      }
    }

    // 2. Convertir el buffer a Base64 Data URI
    const b64 = buffer.toString('base64');
    const dataURI = `data:${mime};base64,${b64}`;

    // 3. Subir como string a Cloudinary
    // De esta forma Cloudinary recibe el MimeType exacto, clave para que los HEIC no fallen
    try {
      const result = await cloudinary.uploader.upload(dataURI, {
        folder,
        format: 'webp', // Siempre convertimos a WebP optimizado
        quality: 'auto',
        width: 800,
        crop: 'limit',
      });

      return result.secure_url;
    } catch (error) {
      this.logger.error('Error uploading to Cloudinary', error);
      throw new InternalServerErrorException('Error uploading image');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      this.logger.log(
        `Cloudinary deletion result for ${publicId}: ${result?.result}`,
      );
    } catch (error) {
      this.logger.error('Error deleting from Cloudinary', error);
      throw new InternalServerErrorException('Error deleting image');
    }
  }

  extractPublicId(url: string): string {
    try {
      // Example URL: "https://res.cloudinary.com/demo/image/upload/v123/yerbaxanaes/products/abc.webp"
      const urlParts = url.split('/');
      // Remove up to 'upload/'
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex === -1) return '';

      // Get the path after 'upload/' (skip version if present e.g. v123)
      let startIndex = uploadIndex + 1;
      if (urlParts[startIndex]?.match(/^v\d+$/)) {
        startIndex++;
      }

      const fileWithExtension = urlParts.slice(startIndex).join('/');
      // Remove extension
      const publicId = fileWithExtension.replace(/\.[^/.]+$/, '');
      return publicId;
    } catch (e) {
      this.logger.error('Error extracting publicId', e);
      return '';
    }
  }
}
