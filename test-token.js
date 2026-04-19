const crypto = require('crypto');

const accessKey = 'W7gnhGbvkWSPW90Vfz8KDpd4QzZzFhMUIl-gxwGv';
const secretKey = 'EeazCLBveIPp2cAiuXKqV3yYZNAr4XuHjC7ABu60';
const bucket = 'yihaowang234';
const deadline = Math.floor(Date.now() / 1000) + 3600;

const putPolicy = {
  scope: bucket,
  deadline: deadline,
};

const policyString = JSON.stringify(putPolicy);
console.log('Policy:', policyString);

// 方法1: Node.js crypto (当前使用的方法)
const encodedPolicy1 = Buffer.from(policyString)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

const signature1 = crypto
  .createHmac('sha1', secretKey)
  .update(encodedPolicy1)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

const token1 = `${accessKey}:${signature1}:${encodedPolicy1}`;
console.log('\n=== Node.js crypto method ===');
console.log('Encoded policy:', encodedPolicy1);
console.log('Signature:', signature1);
console.log('Token:', token1);

// 方法2: btoa + crypto.subtle (早期使用的方法，模拟浏览器)
const encodedPolicy2 = btoa(policyString)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

// 模拟 crypto.subtle.sign
const keyBuffer = Buffer.from(secretKey);
const dataBuffer = Buffer.from(encodedPolicy2);
const signatureBuffer = crypto.createHmac('sha1', keyBuffer).update(dataBuffer).digest();
const signature2 = Buffer.from(signatureBuffer).toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

const token2 = `${accessKey}:${signature2}:${encodedPolicy2}`;
console.log('\n=== btoa + crypto.subtle method (simulated) ===');
console.log('Encoded policy:', encodedPolicy2);
console.log('Signature:', signature2);
console.log('Token:', token2);

console.log('\n=== Comparison ===');
console.log('Encoded policies match:', encodedPolicy1 === encodedPolicy2);
console.log('Signatures match:', signature1 === signature2);
console.log('Tokens match:', token1 === token2);

// 测试七牛云 SDK
console.log('\n=== Testing with qiniu-js SDK ===');
try {
  const qiniuJs = require('qiniu-js');
  console.log('qiniu-js version:', qiniuJs.version || 'available');
} catch (e) {
  console.log('qiniu-js not installed as npm package');
}
