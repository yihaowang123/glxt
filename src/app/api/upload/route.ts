import { NextResponse } from 'next/server';

async function generateUploadToken(accessKey: string, secretKey: string, bucket: string): Promise<string> {
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const putPolicy = {
    scope: bucket,
    deadline: deadline,
  };

  const policyString = JSON.stringify(putPolicy);

  const encodedPolicy = Buffer.from(policyString).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const signString = encodedPolicy;
  const signature = await hmacSha1(secretKey, signString);

  const uploadToken = `${accessKey}:${signature}:${encodedPolicy}`;

  console.log('[Upload] Token generated:', {
    accessKey: accessKey.substring(0, 4) + '...',
    bucket,
    deadline,
    encodedPolicyLength: encodedPolicy.length,
    signatureLength: signature.length,
  });

  return uploadToken;
}

async function hmacSha1(secretKey: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  return Buffer.from(signatureBuffer).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST() {
  try {
    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET_NAME;
    const domain = process.env.QINIU_DOMAIN;

    console.log('[Upload] Environment check:', {
      hasAccessKey: !!accessKey,
      hasSecretKey: !!secretKey,
      hasBucket: !!bucket,
      hasDomain: !!domain,
      accessKeyPrefix: accessKey?.substring(0, 4),
    });

    if (!accessKey || !secretKey || !bucket || !domain) {
      console.error('[Upload] Missing Qiniu configuration');
      return NextResponse.json({
        error: 'Qiniu config missing',
        details: {
          QINIU_ACCESS_KEY: accessKey ? 'set' : 'MISSING',
          QINIU_SECRET_KEY: secretKey ? 'set' : 'MISSING',
          QINIU_BUCKET_NAME: bucket ? 'set' : 'MISSING',
          QINIU_DOMAIN: domain ? 'set' : 'MISSING',
        }
      }, { status: 500 });
    }

    const uploadToken = await generateUploadToken(accessKey, secretKey, bucket);

    return NextResponse.json({
      uptoken: uploadToken,
      domain: domain,
    });
  } catch (error) {
    console.error('[Upload] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate uptoken'
    }, { status: 500 });
  }
}