const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// La misma configuración del script original
const CONFIG = {
  inputDir: './images',           // No se usará en este script, pero la dejamos por consistencia
  outputDir: './images-optimized', // Carpeta de salida
  sizes: [400, 800, 1200],        // Tamaños a generar
  quality: {
    webp: 80,
    jpeg: 85
  },
  formats: ['webp', 'jpeg']       // Formatos a generar
};

// Función optimizeImage del script original
async function optimizeImage(imageInfo) {
  const { fullPath, relativePath, fileName, subDir } = imageInfo;
  const nameWithoutExt = path.parse(fileName).name;
  const optimizedImages = [];

  console.log(`\nProcesando: ${relativePath}`);

  // Crear subdirectorio en output si es necesario
  const outputSubDir = path.join(CONFIG.outputDir, subDir);
  await fs.mkdir(outputSubDir, { recursive: true });

  for (const size of CONFIG.sizes) {
    for (const format of CONFIG.formats) {
      const outputFilename = `${nameWithoutExt}-${size}w.${format}`;
      const outputPath = path.join(outputSubDir, outputFilename);

      try {
        const image = sharp(fullPath);
        const metadata = await image.metadata();

        // Solo redimensionar si la imagen es más grande que el tamaño objetivo
        if (metadata.width > size) {
          image.resize(size, null, {
            withoutEnlargement: true,
            fit: 'inside'
          });
        }

        // Aplicar formato y calidad
        if (format === 'webp') {
          await image.webp({ quality: CONFIG.quality.webp }).toFile(outputPath);
        } else if (format === 'jpeg') {
          await image.jpeg({ quality: CONFIG.quality.jpeg, progressive: true }).toFile(outputPath);
        }

        const stats = await fs.stat(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  ✓ ${outputFilename} (${sizeKB} KB)`);
        
        optimizedImages.push({
          filename: outputFilename,
          size: size,
          format: format,
          subDir: subDir
        });
      } catch (error) {
        console.error(`  ✗ Error con ${outputFilename}:`, error.message);
      }
    }
  }

  return { original: relativePath, optimized: optimizedImages, subDir: subDir };
}

// Función principal para una sola imagen
async function main() {
  // Obtener la ruta de la imagen desde los argumentos de la línea de comandos
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Por favor, proporciona la ruta de la imagen como argumento.');
    process.exit(1);
  }

  // Verificar si la imagen existe
  try {
    await fs.access(imagePath);
  } catch (error) {
    console.error(`La imagen no existe en la ruta: ${imagePath}`);
    process.exit(1);
  }

  console.log('🖼️  Iniciando optimización de imagen...\n');

  try {
    // Crear el directorio de salida si no existe
    await fs.mkdir(CONFIG.outputDir, { recursive: true });

    // Preparar la información de la imagen
    const fullPath = path.resolve(imagePath);
    const fileName = path.basename(fullPath);
    const relativePath = path.relative(process.cwd(), fullPath);
    const subDir = ''; // Si quieres mantener subdirectorios, deberías calcularlo respecto a un basePath

    const imageInfo = {
      fullPath: fullPath,
      relativePath: relativePath,
      fileName: fileName,
      subDir: subDir
    };

    const result = await optimizeImage(imageInfo);

    console.log('\n✅ ¡Optimización completada!');
    console.log(`\nResumen:`);
    console.log(`- Imagen original: ${result.original}`);
    console.log(`- Variantes generadas: ${result.optimized.length}`);
    console.log(`- Directorio de salida: ${CONFIG.outputDir}`);

  } catch (error) {
    console.error('\n❌ Error durante la optimización:', error);
  }
}

// Ejecutar
main();