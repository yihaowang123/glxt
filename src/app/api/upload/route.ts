import { NextResponse } from 'next/server';

async function generateUploadToken(accessKey: string, secretKey: string, bucket: string): Promise<string> {
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const putPolicy = {
    scope: bucket,
    deadline: deadline,
  };

  const policyString = JSON.stringify(putPolicy);
  const encodedPolicy = btoa(policyString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(secretKey);
  const dataBuffer = encoder.encode(encodedPolicy);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${accessKey}:${signature}:${encodedPolicy}`;
}

export async function POST() {
  try {
    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET_NAME;
    const domain = process.env.QINIU_DOMAIN;

    console.log('[Upload] Qiniu config check:', {
      accessKey: accessKey ? '[SET]' : '[MISSING]',
      secretKey: secretKey ? '[SET]' : '[MISSING]',
      bucket: bucket ? '[SET]' : '[MISSING]',
      domain: domain ? '[SET]' : '[MISSING]',
    });

    if (!accessKey || !secretKey || !bucket || !domain) {
      console.error('[Upload] Missing Qiniu configuration');
      return NextResponse.json({ error: 'Qiniu config missing' }, { status: 500 });
    }

    const uploadToken = await generateUploadToken(accessKey, secretKey, bucket);

    console.log('[Upload] Generated uptoken successfully');

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