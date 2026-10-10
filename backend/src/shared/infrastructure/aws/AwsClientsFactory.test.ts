import { describe, expect, it } from 'vitest';
import { buildAwsClientConfig, type AwsClientOptions } from './AwsClientsFactory.js';

const base: AwsClientOptions = {
  region: 'us-east-1',
  endpoint: null,
  accessKeyId: '',
  secretAccessKey: '',
  s3ForcePathStyle: true,
};

describe('buildAwsClientConfig', () => {
  it('omits credentials when keys are empty', () => {
    const config = buildAwsClientConfig(base, 's3');

    expect(config).not.toHaveProperty('credentials');
  });

  it('includes static credentials when both keys are set', () => {
    const config = buildAwsClientConfig({ ...base, accessKeyId: 'test', secretAccessKey: 'secret' }, 'sqs');

    expect(config.credentials).toEqual({ accessKeyId: 'test', secretAccessKey: 'secret' });
  });

  it('sets endpoint and path style only for local endpoints', () => {
    const local = { ...base, endpoint: 'http://localhost:4566' };

    expect(buildAwsClientConfig(local, 's3')).toMatchObject({
      endpoint: 'http://localhost:4566',
      forcePathStyle: true,
    });
    expect(buildAwsClientConfig(local, 'sqs')).not.toHaveProperty('forcePathStyle');
    expect(buildAwsClientConfig(base, 's3')).not.toHaveProperty('endpoint');
    expect(buildAwsClientConfig(base, 's3')).not.toHaveProperty('forcePathStyle');
  });
});
