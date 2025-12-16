// Nota: dotenv deve ser carregado antes de importar este módulo
// nos arquivos principais (api.js, exemplo.js)

const {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command
} = require('@aws-sdk/client-s3');

// Validar variáveis de ambiente necessárias
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.warn('⚠️  Variáveis de ambiente AWS não configuradas:', missingVars.join(', '));
    console.warn('   Configure essas variáveis no arquivo .env');
}

// Configuração do cliente S3 (só cria se tiver credenciais)
let s3Client = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
        s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
    } catch (error) {
        console.error('Erro ao criar cliente S3:', error.message);
    }
}

// Configurações do bucket
const awsConfig = {
    bucketName: process.env.AWS_S3_BUCKET_NAME || null,
    remoteDataPath: process.env.AWS_S3_REMOTE_DATA_PATH || 'whatsapp-sessions/',
    s3Client: s3Client,
    putObjectCommand: PutObjectCommand,
    headObjectCommand: HeadObjectCommand,
    getObjectCommand: GetObjectCommand,
    deleteObjectCommand: DeleteObjectCommand,
    listObjectsV2Command: ListObjectsV2Command
};

module.exports = awsConfig;

