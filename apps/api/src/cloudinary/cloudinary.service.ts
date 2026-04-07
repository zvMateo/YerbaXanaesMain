import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    buffer: Buffer,
    folder = 'yerbaxanaes/products',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error('Error uploading to Cloudinary', error);
            // Logeamos TODO el objeto de error para saber si es Auth o Formato
            console.error('Cloudinary Error Raw:', error);
            return reject(
              new Error(error.message || 'Unknown Cloudinary error'),
            );
          }
          if (!result) {
            return reject(new Error('No result from Cloudinary'));
          }
          resolve(result.secure_url);
        },
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          this.logger.error('Error deleting from Cloudinary', error);
          return reject(
            new Error(
              error instanceof Error
                ? error.message
                : 'Unknown Cloudinary error',
            ),
          );
        }
        this.logger.log(
          `Cloudinary deletion result for ${publicId}: ${result?.result}`,
        );
        resolve();
      });
    });
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
