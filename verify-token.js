const crypto = require('crypto');

const accessKey = 'W7gnhGbvkWSPW90Vfz8KDpd4QzZzFhMUIl-gxwGv';
const secretKey = 'EeazCLBveIPp2cAiuXKqV3yYZNAr4XuHjC7ABu60';
const bucket = 'yihaowang234';
const deadline = 1776585252;

const putPolicy = {
  scope: bucket,
  deadline: deadline,
};

const policyString = JSON.stringify(putPolicy);
console.log('Policy string:', policyString);

const encodedPolicy = Buffer.from(policyString)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
console.log('Encoded policy:', encodedPolicy);

const signature = crypto
  .createHmac('sha1', secretKey)
  .update(encodedPolicy)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
console.log('Signature:', signature);

const token = `${accessKey}:${signature}:${encodedPolicy}`;
console.log('Full token:', token);

// Decode the policy from the log to verify
const logPolicy = 'eyJzY29wZSI6InlpaGFvd2FuZzIzNCIsImRlYWRsaW5lIjoxNzc2NTg1MjUyfQ';
console.log('\nDecoded from log:');
console.log('Decoded policy:', Buffer.from(logPolicy.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
