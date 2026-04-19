import { NextResponse } from 'next/server';
import qiniu from 'qiniu';

function generateUploadToken(accessKey: string, secretKey: string, bucket: string): string {
  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const putPolicy = new qiniu.rs.PutPolicy({ scope: bucket });
  return putPolicy.uploadToken(mac);
}

export async function POST() {
  try {
    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET_NAME;
    const domain = process.env.QINIU_DOMAIN;

    if (!accessKey || !secretKey || !bucket || !domain) {
      console.error('[Upload] Missing configuration!');
      return NextResponse.json({ error: 'Missing Qiniu configuration' }, { status: 500 });
    }

    const uploadToken = generateUploadToken(accessKey, secretKey, bucket);

    return NextResponse.json({ uptoken: uploadToken, domain: domain });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}