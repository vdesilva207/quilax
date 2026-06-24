const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configuración de AWS CloudFront CDN para 2M usuarios
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const cloudfront = new AWS.CloudFront({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

// Configuración del bucket S3
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'quilax-assets';
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;

// Función para subir archivo a S3
const uploadToS3 = async (filePath, key, contentType = 'application/octet-stream') => {
  try {
    const fileStream = fs.createReadStream(filePath);
    const fileStats = fs.statSync(filePath);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      ContentLength: fileStats.size,
      CacheControl: 'public, max-age=31536000, immutable', // 1 año de cache
    };

    const result = await s3.upload(params).promise();
    console.log(`✅ File uploaded to S3: ${key}`);
    return result.Location;
  } catch (error) {
    console.error(`❌ Error uploading to S3: ${error.message}`);
    throw error;
  }
};

// Función para obtener URL de CDN
const getCDNUrl = (key) => {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
};

// Función para generar URL firmada (para contenido privado)
const getSignedUrl = (key, expiresIn = 3600) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
  };

  return s3.getSignedUrl('getObject', params);
};

// Función para eliminar archivo de S3
const deleteFromS3 = async (key) => {
  try {
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: key,
    }).promise();
    
    console.log(`✅ File deleted from S3: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting from S3: ${error.message}`);
    throw error;
  }
};

// Función para invalidar cache de CloudFront
const invalidateCloudFront = async (paths) => {
  try {
    const params = {
      DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    };

    const result = await cloudfront.createInvalidation(params).promise();
    console.log(`✅ CloudFront invalidation created: ${result.Invalidation.Id}`);
    return result.Invalidation;
  } catch (error) {
    console.error(`❌ Error invalidating CloudFront: ${error.message}`);
    throw error;
  }
};

// Función para configurar CORS en S3
const configureS3CORS = async () => {
  const params = {
    Bucket: BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    await s3.putBucketCors(params).promise();
    console.log('✅ S3 CORS configured');
  } catch (error) {
    console.error(`❌ Error configuring S3 CORS: ${error.message}`);
  }
};

// Inicializar configuración de S3
const initializeS3 = async () => {
  try {
    await configureS3CORS();
    console.log('✅ S3 initialized successfully');
  } catch (error) {
    console.error(`❌ Error initializing S3: ${error.message}`);
  }
};

module.exports = {
  s3,
  cloudfront,
  uploadToS3,
  getCDNUrl,
  getSignedUrl,
  deleteFromS3,
  invalidateCloudFront,
  initializeS3,
};
