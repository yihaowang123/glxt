import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateUploadToken(accessKey: string, secretKey: string, bucket: string): string {
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const putPolicy = {
    scope: bucket,
    deadline: deadline,
  };

  const policyString = JSON.stringify(putPolicy);

  const encodedPolicy = Buffer.from(policyString)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const signature = crypto
    .createHmac('sha1', secretKey)
    .update(encodedPolicy)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const uploadToken = `${accessKey}:${signature}:${encodedPolicy}`;

  return uploadToken;
}

export async function POST() {
  try {
    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET_NAME;
    const domain = process.env.QINIU_DOMAIN;

    console.log('[Upload] AK:', accessKey);
    console.log('[Upload] SK:', secretKey ? `${secretKey.substring(0, 4)}...` : 'MISSING');
    console.log('[Upload] Bucket:', bucket);
    console.log('[Upload] Domain:', domain);

    if (!accessKey || !secretKey || !bucket || !domain) {
      console.error('[Upload] Missing configuration!');
      return NextResponse.json({ error: 'Missing Qiniu configuration' }, { status: 500 });
    }

    const uploadToken = generateUploadToken(accessKey, secretKey, bucket);
    console.log('[Upload] Generated token:', uploadToken);

    return NextResponse.json({ uptoken: uploadToken, domain: domain });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}